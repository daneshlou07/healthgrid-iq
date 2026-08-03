import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import StatusBadge from '../../components/ui/StatusBadge';
import SeverityBadge from '../../components/ui/SeverityBadge';
import { ArrowLeft, Clock, User, Building2, FileText, Send, Copy, CheckCircle, ClipboardList, Calendar, AlertTriangle, Upload } from 'lucide-react';
import { loadImages } from '../../services/imageStorage';
import { getCaseIndication, getCaseRegistrar } from '../../utils/caseDisplay';
import RadiologyWorksheet from './RadiologyWorksheet';
import DownloadMohFormButton from '../../components/ui/PrintRadiologyForm';
import PacsImageViewer from '../../components/ui/PacsImageViewer';
import PatientSmsModal from '../../components/ui/PatientSmsModal';
import { exportDossierPdf } from '../../utils/exportDossierPdf';

/** Loads images from IndexedDB by key and renders them */
function CaseImages({ imageKeys }: { imageKeys?: string[] }) {
  const [urls, setUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!imageKeys || imageKeys.length === 0) { setUrls([]); return; }
    setLoading(true);
    loadImages(imageKeys).then((loaded) => { setUrls(loaded); setLoading(false); });
  }, [imageKeys?.join(',')]);

  if (!imageKeys || imageKeys.length === 0) return null;
  if (loading) return <p className="text-xs text-surface-400 py-2">Loading images…</p>;
  if (urls.length === 0) return <p className="text-xs text-surface-400 py-2">Images unavailable.</p>;
  return (
    <div className="grid grid-cols-2 gap-2 mt-2">
      {urls.map((url, i) => (
        <a key={i} href={url} target="_blank" rel="noopener noreferrer">
          <img src={url} alt={`Scan ${i + 1}`} className="w-full rounded-lg border border-surface-300 object-contain bg-black max-h-48 cursor-pointer hover:opacity-90 transition-opacity" />
        </a>
      ))}
    </div>
  );
}

export default function CaseDetail() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { cases, patients, reports, clinics, users, addComment, getCommentsForCase, addRecentItem, addAuditLog, editCase } = useData();
  const [activeTab, setActiveTab] = useState<'overview' | 'worksheet'>('overview');
  const [newMessage, setNewMessage] = useState('');
  const [copied, setCopied] = useState(false);

  // No-Show & Reschedule modal state
  const [showNoShowModal, setShowNoShowModal] = useState(false);
  const [noShowType, setNoShowType] = useState<'NO_SHOW' | 'CANCELLED'>('NO_SHOW');
  const [noShowReason, setNoShowReason] = useState('Patient Did Not Attend (DNA)');
  const [noShowNotes, setNoShowNotes] = useState('');

  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');

  const [showSmsModal, setShowSmsModal] = useState(false);

  // Reassign Personnel modal state
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassignRadId, setReassignRadId] = useState('');
  const [reassignRadlogistId, setReassignRadlogistId] = useState('');

  const caseItem = cases.find((c) => c.id === caseId);
  if (!caseItem) return <div className="text-center py-20 text-surface-400">Case not found.</div>;

  const patient = patients.find((p) => p.id === caseItem.patientId);
  const report = reports.find((r) => r.caseId === caseId);
  const comments = getCommentsForCase(caseItem.id);

  // Track as recently viewed
  React.useEffect(() => {
    addRecentItem({ id: caseItem.id, type: 'case', title: caseItem.caseNumber, subtitle: caseItem.patientName, path: `/case/${caseItem.id}` });
  }, [caseItem.id]);

  const handleCopy = () => {
    navigator.clipboard.writeText(caseItem.caseNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;
    addComment({ caseId: caseItem.id, userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role, message: newMessage.trim() });
    setNewMessage('');
  };

  const handleConfirmNoShow = async () => {
    try {
      const { updateCase } = await import('../../services/dataService');
      await updateCase(caseItem.id, {
        status: noShowType,
        noShowReason: noShowReason,
        cancellationNotes: noShowNotes,
      });
      setShowNoShowModal(false);
    } catch (err) {
      console.error('Failed to update no-show status:', err);
    }
  };

  const handleConfirmReschedule = async () => {
    if (!rescheduleDate) return;
    try {
      const { updateCase } = await import('../../services/dataService');
      const newHistory = [
        ...(caseItem.rescheduleHistory || []),
        {
          previousDate: caseItem.officeTarikhAppointment || caseItem.scheduledAt,
          previousTime: caseItem.officeMasaAppointment,
          newDate: rescheduleDate,
          newTime: rescheduleTime,
          reason: rescheduleReason,
          updatedAt: new Date().toISOString(),
          updatedByName: currentUser?.name,
        },
      ];

      await updateCase(caseItem.id, {
        officeTarikhAppointment: rescheduleDate,
        officeMasaAppointment: rescheduleTime,
        status: 'SCHEDULED',
        rescheduleHistory: newHistory,
      });
      setShowRescheduleModal(false);
    } catch (err) {
      console.error('Failed to reschedule case:', err);
    }
  };

  const handleConfirmReassign = async () => {
    try {
      const selectedRad = users.find((u) => u.id === reassignRadId);
      const selectedRadlogist = users.find((u) => u.id === reassignRadlogistId);

      const updates: Partial<Case> = {};
      if (selectedRad) {
        updates.radiographerId = selectedRad.id;
        updates.radiographerName = selectedRad.name;
      }
      if (selectedRadlogist) {
        updates.radiologistId = selectedRadlogist.id;
        updates.radiologistName = selectedRadlogist.name;
      }

      await editCase(caseItem.id, updates);

      await addAuditLog({
        userId: currentUser?.id || 'system',
        userName: currentUser?.name || 'Administrator',
        userRole: currentUser?.role || 'Administrator',
        action: 'CASE_REASSIGNED',
        target: `cases/${caseItem.caseNumber}`,
        details: `Reassigned personnel for ${caseItem.caseNumber} to Radiographer: ${selectedRad?.name || caseItem.radiographerName || 'N/A'}, Radiologist: ${selectedRadlogist?.name || caseItem.radiologistName || 'N/A'}`,
        timestamp: new Date().toISOString(),
      });

      setShowReassignModal(false);
    } catch (err) {
      console.error('Failed to reassign case:', err);
    }
  };

  // Build timeline events
  const timeline: { label: string; date: string; status: string }[] = [
    { label: 'Case Created', date: caseItem.createdAt, status: 'CREATED' },
  ];
  if (caseItem.scheduledAt) timeline.push({ label: 'Scheduled', date: caseItem.scheduledAt, status: 'SCHEDULED' });
  if (caseItem.scannedAt) timeline.push({ label: 'Scan Completed', date: caseItem.scannedAt, status: 'SCANNED' });
  if (caseItem.reportedAt) timeline.push({ label: 'Report Drafted', date: caseItem.reportedAt, status: 'REPORTED' });
  if (caseItem.finalizedAt) timeline.push({ label: 'Finalized', date: caseItem.finalizedAt, status: 'FINALIZED' });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 border border-surface-200 rounded-xl shadow-sm">
        {/* Left: Case Title & Context Badges */}
        <div className="flex items-start gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-surface-100 rounded-lg transition-colors mt-0.5 shrink-0" title="Back">
            <ArrowLeft className="w-4 h-4 text-surface-500" />
          </button>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-navy-900 tracking-tight">{caseItem.caseNumber}</h1>
              <button onClick={handleCopy} className="p-1 hover:bg-surface-100 rounded transition-colors" title="Copy case number">
                {copied ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-surface-400" />}
              </button>
              <StatusBadge status={caseItem.status} />
              <SeverityBadge severity={caseItem.severity} />
            </div>
            <p className="text-xs text-surface-500 font-medium flex flex-wrap items-center gap-1.5">
              <span>{caseItem.patientName}</span>
              <span>&middot;</span>
              <span className="font-semibold text-slate-700">{caseItem.scanType}</span>
              {caseItem.clinicName && (
                <>
                  <span>&middot;</span>
                  <span className="text-purple-700 font-medium">{caseItem.clinicName}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Right: Uniform Single-Line Action Buttons (h-9 whitespace-nowrap) */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {caseItem.status === 'SCHEDULED' && (
            <Link
              to={`/upload?caseId=${caseItem.id}`}
              className="h-9 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all whitespace-nowrap"
              title="Upload medical scans for this case"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Scan</span>
            </Link>
          )}

          {caseItem.status !== 'FINALIZED' && caseItem.status !== 'CANCELLED' && caseItem.status !== 'NO_SHOW' && (
            <>
              <button
                onClick={() => {
                  setRescheduleDate(caseItem.officeTarikhAppointment || '');
                  setRescheduleTime(caseItem.officeMasaAppointment || '');
                  setShowRescheduleModal(true);
                }}
                className="h-9 px-3 btn-secondary text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors"
                title="Change or update scan appointment"
              >
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Reschedule</span>
              </button>
              <button
                onClick={() => setShowSmsModal(true)}
                className="h-9 px-3 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-purple-200 transition-colors whitespace-nowrap"
                title="Send automated SMS / WhatsApp appointment alert to patient"
              >
                <span>📱</span>
                <span>Send SMS</span>
              </button>
              <button
                onClick={() => setShowNoShowModal(true)}
                className="h-9 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-300 transition-colors whitespace-nowrap"
                title="Flag patient no-show or cancel referral"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-slate-500" />
                <span>Cancel / No-Show</span>
              </button>
            </>
          )}

          <button
            onClick={() => exportDossierPdf(caseItem, patient, report)}
            className="h-9 px-3.5 bg-navy-900 hover:bg-navy-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all border border-navy-700 whitespace-nowrap"
            title="Download full multi-page Clinical Dossier PDF Package"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Export Dossier</span>
          </button>

          <DownloadMohFormButton caseItem={caseItem} patient={patient} report={report} />
        </div>
      </div>

      {/* Clinical Audit Milestone Progress Bar */}
      <div className="bg-white border border-surface-300 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[11px] font-bold text-surface-500 uppercase tracking-wider">
            Clinical Referral Timeline &amp; Milestone Tracker
          </h3>
          <span className="text-[10px] text-surface-400 font-mono">
            ID: {caseItem.id.slice(0, 8)}
          </span>
        </div>

        {(() => {
          const STAGES = [
            { key: 'CREATED', label: '1. Case Created', date: caseItem.createdAt, actor: getCaseRegistrar(caseItem) },
            { key: 'SCHEDULED', label: '2. Scheduled', date: caseItem.scheduledAt || caseItem.officeTarikhAppointment, actor: caseItem.clinicName || 'Radiology Desk' },
            { key: 'SCANNED', label: '3. Scan Uploaded', date: caseItem.scannedAt, actor: caseItem.radiographerName || 'Radiographer' },
            { key: 'REPORTED', label: '4. Report Drafted', date: caseItem.reportedAt, actor: 'Medical Officer' },
            { key: 'FINALIZED', label: '5. Signed Off', date: caseItem.finalizedAt, actor: report?.radiologistName || 'Radiologist' },
          ];

          const STAGE_ORDER = ['CREATED', 'SCHEDULED', 'SCANNED', 'REPORTED', 'FINALIZED'];
          let currentStageIdx = STAGE_ORDER.indexOf(caseItem.status);
          if (currentStageIdx === -1) {
            currentStageIdx = caseItem.status === 'NO_SHOW' || caseItem.status === 'CANCELLED' ? 0 : 0;
          }

          return (
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-1">
              {STAGES.map((s, idx) => {
                const isPassed = idx <= currentStageIdx;
                const isCurrent = idx === currentStageIdx;

                return (
                  <div
                    key={s.key}
                    className={`p-2.5 rounded-lg border text-xs transition-all ${
                      isCurrent
                        ? 'bg-navy-50/80 border-navy-300 shadow-sm ring-1 ring-navy-200'
                        : isPassed
                        ? 'bg-emerald-50/40 border-emerald-200 text-emerald-900'
                        : 'bg-surface-50 border-surface-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold mb-1">
                      {isPassed ? (
                        <CheckCircle className={`w-3.5 h-3.5 ${isCurrent ? 'text-navy-600' : 'text-emerald-600'}`} />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-surface-300 flex items-center justify-center text-[9px] text-surface-400">
                          {idx + 1}
                        </div>
                      )}
                      <span className={isCurrent ? 'text-navy-900' : isPassed ? 'text-emerald-900' : 'text-surface-500'}>
                        {s.label}
                      </span>
                    </div>

                    <div className="text-[10px] text-surface-500">
                      {s.date ? new Date(s.date).toLocaleDateString() : 'Pending'}
                    </div>

                    <div className="text-[10px] text-surface-400 font-medium truncate mt-0.5" title={s.actor}>
                      {s.date ? s.actor : '—'}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 p-1 bg-surface-100 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'overview'
              ? 'bg-white text-navy-800 shadow-sm'
              : 'text-surface-500 hover:text-surface-700'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Case Overview
        </button>
        <button
          onClick={() => setActiveTab('worksheet')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'worksheet'
              ? 'bg-white text-navy-800 shadow-sm'
              : 'text-surface-500 hover:text-surface-700'
          }`}
        >
          <ClipboardList className="w-3.5 h-3.5" />
          MOH Worksheet
          <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold ml-0.5">PER.SS-RA301</span>
        </button>
      </div>

      {/* Tab: MOH Worksheet */}
      {activeTab === 'worksheet' && (
        <RadiologyWorksheet caseItem={caseItem} />
      )}

      {/* Tab: Case Overview */}
      {activeTab === 'overview' && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Case Info */}
          <div className="card">
            <h2 className="section-title mb-4">Case Information</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-xs text-surface-500">Indication / Symptom</span><p className="text-surface-800 font-medium">{getCaseIndication(caseItem) || '—'}</p></div>
              <div><span className="text-xs text-surface-500">Imaging Modality</span><p className="text-surface-800 font-medium">{caseItem.modality || caseItem.scanType}</p></div>
              <div><span className="text-xs text-surface-500">Body Region(s)</span><p className="text-surface-800">{caseItem.bodyRegion || '—'}</p></div>
              <div><span className="text-xs text-surface-500">Healthcare Centre</span><p className="text-surface-800">{caseItem.clinicName || 'Pending AI Scheduler'}</p></div>
            </div>
            {caseItem.notes && (
              <div className="mt-4 pt-4 border-t border-surface-200">
                <span className="text-xs text-surface-500">Clinical Notes</span>
                <p className="text-sm text-surface-700 mt-1">{caseItem.notes}</p>
              </div>
            )}
          </div>

          {/* Requested Examinations (if present) */}
          {caseItem.requestedExaminations && caseItem.requestedExaminations.length > 0 && (
            <div className="card space-y-3">
              <h2 className="section-title flex items-center gap-2">
                Requested Examinations ({caseItem.requestedExaminations.length})
              </h2>
              <div className="space-y-2">
                {caseItem.requestedExaminations.map((ex, i) => (
                  <div key={ex.id || i} className="p-3 bg-surface-100 border border-surface-200 rounded-lg text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-navy-800">
                        #{i + 1} — {ex.bodyPart} {ex.side && ex.side !== 'N/A' ? `[${ex.side}]` : ''}
                      </span>
                      <span className="text-[10px] bg-navy-50 text-navy-700 px-2 py-0.5 rounded font-medium">
                        {ex.viewsOrProtocol.length} Option(s)
                      </span>
                    </div>
                    {ex.viewsOrProtocol.length > 0 && (
                      <p className="text-surface-600">
                        <strong className="text-surface-700">Views / Protocol:</strong> {ex.viewsOrProtocol.join(', ')}
                      </p>
                    )}
                    {ex.notes && (
                      <p className="text-surface-500 italic">Instruction: {ex.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Personnel */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title">Assigned Personnel</h2>
              {['Administrator', 'Medical Officer', 'Radiology Department'].includes(currentUser?.role || '') && (
                <button
                  type="button"
                  onClick={() => {
                    setReassignRadId(caseItem.radiographerId || '');
                    setReassignRadlogistId(caseItem.radiologistId || '');
                    setShowReassignModal(true);
                  }}
                  className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-lg text-xs font-bold border border-purple-200 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Reassign Staff</span>
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <PersonnelCard label="Registered by" name={getCaseRegistrar(caseItem)} icon={<User className="w-4 h-4" />} />
              <PersonnelCard
                label="Radiographer"
                name={caseItem.radiographerName || 'Not Assigned'}
                icon={<User className="w-4 h-4" />}
                canReassign={['Administrator', 'Medical Officer', 'Radiology Department'].includes(currentUser?.role || '')}
                onReassign={() => {
                  setReassignRadId(caseItem.radiographerId || '');
                  setReassignRadlogistId(caseItem.radiologistId || '');
                  setShowReassignModal(true);
                }}
              />
              <PersonnelCard
                label="Radiologist"
                name={caseItem.radiologistName || 'Not Assigned'}
                icon={<User className="w-4 h-4" />}
                canReassign={['Administrator', 'Medical Officer', 'Radiology Department'].includes(currentUser?.role || '')}
                onReassign={() => {
                  setReassignRadId(caseItem.radiographerId || '');
                  setReassignRadlogistId(caseItem.radiologistId || '');
                  setShowReassignModal(true);
                }}
              />
            </div>
          </div>

          {/* Report (if exists) */}
          {report && (
            <div className="card">
              <h2 className="section-title mb-4 flex items-center gap-2"><FileText className="w-4 h-4 text-navy-600" /> Diagnostic Report</h2>
              <div className="space-y-3">
                {/* Scan Images */}
                {(report.imageKeys && report.imageKeys.length > 0) || (caseItem.images && caseItem.images.length > 0) ? (
                  <div>
                    <p className="text-xs text-surface-500 uppercase font-semibold mb-1">Scan Images</p>
                    <CaseImages imageKeys={report.imageKeys && report.imageKeys.length > 0 ? report.imageKeys : caseItem.images} />
                  </div>
                ) : null}
                <div><p className="text-xs text-surface-500 uppercase font-semibold mb-1">Findings</p><div className="bg-surface-100 rounded-lg p-3 text-sm text-surface-700 whitespace-pre-line">{report.findings}</div></div>
                <div><p className="text-xs text-surface-500 uppercase font-semibold mb-1">Impression</p><div className="bg-surface-100 rounded-lg p-3 text-sm text-surface-700 whitespace-pre-line">{report.impression}</div></div>
                {report.suggestions && <div><p className="text-xs text-surface-500 uppercase font-semibold mb-1">Suggestions</p><div className="bg-surface-100 rounded-lg p-3 text-sm text-surface-700 whitespace-pre-line">{report.suggestions}</div></div>}
                <p className="text-[10px] text-surface-400">Signed by {report.radiologistName} on {report.signedAt ? new Date(report.signedAt).toLocaleString() : '—'}</p>
              </div>
            </div>
          )}

          {/* Scan images for cases (SCANNED status) */}
          {caseItem.images && caseItem.images.length > 0 && (
            <div className="card p-0 border-0 bg-transparent">
              <h2 className="section-title mb-2 flex items-center gap-2 text-slate-800">
                <FileText className="w-4 h-4 text-purple-600" /> Interactive PACS Viewer
              </h2>
              <PacsImageViewer imageKeys={caseItem.images} heightClass="h-96" />
            </div>
          )}

          {/* Communication Thread */}
          <div className="card">
            <h2 className="section-title mb-4">Case Communication</h2>
            <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
              {comments.length === 0 && <p className="text-sm text-surface-400 text-center py-4">No messages yet. Start the conversation.</p>}
              {comments.map((c) => (
                <div key={c.id} className={`flex gap-2.5 ${c.userId === currentUser?.id ? 'flex-row-reverse' : ''}`}>
                  <div className="w-7 h-7 bg-navy-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-bold text-navy-700">{c.userName.charAt(0)}</span>
                  </div>
                  <div className={`max-w-[70%] ${c.userId === currentUser?.id ? 'bg-navy-50 border-navy-200' : 'bg-surface-100 border-surface-200'} rounded-lg border p-2.5`}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-semibold text-surface-700">{c.userName}</span>
                      <span className="text-[9px] text-surface-400">{c.userRole}</span>
                    </div>
                    <p className="text-sm text-surface-800">{c.message}</p>
                    <p className="text-[9px] text-surface-400 mt-1">{new Date(c.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} className="input-field flex-1 text-sm" placeholder="Type a message..." />
              <button type="submit" disabled={!newMessage.trim()} className="btn-primary px-3 disabled:opacity-50"><Send className="w-4 h-4" /></button>
            </form>
          </div>
        </div>

        {/* Sidebar: Timeline + Patient */}
        <div className="space-y-6">
          {/* Timeline */}
          <div className="card">
            <h2 className="section-title mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-navy-600" /> Status Timeline</h2>
            <div className="space-y-4">
              {timeline.map((event, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow-sm" />
                    {i < timeline.length - 1 && <div className="w-0.5 flex-1 bg-surface-200 mt-1" />}
                  </div>
                  <div className="pb-4">
                    <p className="text-sm font-medium text-surface-800">{event.label}</p>
                    <p className="text-xs text-surface-500">{new Date(event.date).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Patient Info */}
          {patient && (
            <div className="card">
              <h2 className="section-title mb-4 flex items-center gap-2"><User className="w-4 h-4 text-navy-600" /> Patient</h2>
              <div className="space-y-2 text-sm">
                <div><span className="text-xs text-surface-500">Name</span><p className="text-surface-800 font-medium">{patient.name}</p></div>
                <div><span className="text-xs text-surface-500">MRN</span><p className="text-surface-800 font-mono text-xs">{patient.mrn}</p></div>
                <div><span className="text-xs text-surface-500">NRIC</span><p className="text-surface-800">{patient.nric}</p></div>
                <div><span className="text-xs text-surface-500">Gender / DOB</span><p className="text-surface-800">{patient.gender} — {patient.dob}</p></div>
                <div><span className="text-xs text-surface-500">Address</span><p className="text-surface-800 text-xs">{patient.address}</p></div>
                {patient.medicalHistory.length > 0 && (
                  <div><span className="text-xs text-surface-500">Medical History</span><p className="text-surface-800 text-xs">{patient.medicalHistory.join(', ')}</p></div>
                )}
              </div>
            </div>
          )}

          {/* SLA Indicator */}
          <SLAIndicator caseItem={caseItem} />

          {/* Reschedule History Audit Box */}
          {caseItem.rescheduleHistory && caseItem.rescheduleHistory.length > 0 && (
            <div className="card">
              <h2 className="section-title mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-600" />
                Reschedule History
              </h2>
              <div className="space-y-2">
                {caseItem.rescheduleHistory.map((item, idx) => (
                  <div key={idx} className="p-2.5 bg-purple-50/50 border border-purple-100 rounded-lg text-xs space-y-1">
                    <div className="flex items-center justify-between text-purple-900 font-semibold">
                      <span>Updated to: {item.newDate} {item.newTime ? `at ${item.newTime}` : ''}</span>
                      <span className="text-[10px] text-purple-600 font-normal">{new Date(item.updatedAt).toLocaleDateString()}</span>
                    </div>
                    {item.previousDate && (
                      <p className="text-[10px] text-surface-500">Previous: {item.previousDate} {item.previousTime || ''}</p>
                    )}
                    {item.reason && <p className="text-surface-600 font-medium">Reason: {item.reason}</p>}
                    {item.updatedByName && <p className="text-[9px] text-surface-400">By: {item.updatedByName}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No-Show / Cancellation Banner */}
          {(caseItem.status === 'NO_SHOW' || caseItem.status === 'CANCELLED') && (
            <div className="card border-l-4 border-l-slate-600 bg-slate-50">
              <h2 className="text-xs font-semibold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-slate-600" />
                Case Exception Record ({caseItem.status})
              </h2>
              <p className="text-sm font-semibold text-slate-900">Reason: {caseItem.noShowReason || caseItem.cancellationReason || 'Not specified'}</p>
              {caseItem.cancellationNotes && (
                <p className="text-xs text-slate-600 mt-1 italic">"{caseItem.cancellationNotes}"</p>
              )}
            </div>
          )}
        </div>
      </div>
      )}

      {/* ── MODAL: Mark No-Show or Cancel Case ── */}
      {showNoShowModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Flag Patient Exception
            </h3>
            <p className="text-xs text-slate-500">
              Record a patient no-show (DNA) or cancel this referral order.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status Type</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="radio"
                    name="noShowType"
                    checked={noShowType === 'NO_SHOW'}
                    onChange={() => setNoShowType('NO_SHOW')}
                  />
                  <strong>NO_SHOW</strong> (Did Not Attend)
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="radio"
                    name="noShowType"
                    checked={noShowType === 'CANCELLED'}
                    onChange={() => setNoShowType('CANCELLED')}
                  />
                  <strong>CANCELLED</strong> (Referral Cancelled)
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reason Category</label>
              <select
                value={noShowReason}
                onChange={(e) => setNoShowReason(e.target.value)}
                className="input-field text-xs"
              >
                <option value="Patient Did Not Attend (DNA)">Patient Did Not Attend (DNA)</option>
                <option value="Patient Refused Examination">Patient Refused Examination</option>
                <option value="Clinical Contraindication (Pregnancy/Renal)">Clinical Contraindication (Pregnancy/Renal)</option>
                <option value="Inadequate Fasting / Patient Prep">Inadequate Fasting / Patient Prep</option>
                <option value="Duplicate Referral Order">Duplicate Referral Order</option>
                <option value="Other / Operational Reason">Other / Operational Reason</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Operational Notes (Optional)</label>
              <textarea
                value={noShowNotes}
                onChange={(e) => setNoShowNotes(e.target.value)}
                rows={3}
                className="input-field text-xs"
                placeholder="Enter additional details regarding patient absence or cancellation reason..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowNoShowModal(false)}
                className="btn-secondary text-xs px-4 py-2"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmNoShow}
                className="btn-danger text-xs px-4 py-2"
              >
                Confirm Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Reschedule Appointment ── */}
      {showRescheduleModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-navy-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              Reschedule Scan Appointment
            </h3>
            <p className="text-xs text-slate-500">
              Set a new examination date &amp; time for {caseItem.patientName}.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Date *</label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="input-field text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Time Slot</label>
                <input
                  type="time"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="input-field text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reschedule Reason</label>
              <input
                type="text"
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                placeholder="e.g., Patient requested morning slot, Machine maintenance"
                className="input-field text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowRescheduleModal(false)}
                className="btn-secondary text-xs px-4 py-2"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReschedule}
                disabled={!rescheduleDate}
                className="btn-primary text-xs px-4 py-2 disabled:opacity-50"
              >
                Save Reschedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Reassign Personnel ── */}
      {showReassignModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-navy-900">Reassign Personnel</h3>
              <button onClick={() => setShowReassignModal(false)} className="text-surface-400 hover:text-surface-600 font-bold text-sm">✕</button>
            </div>

            <p className="text-xs text-surface-500">
              Select available healthcare staff to reassign responsibility for case <strong className="text-navy-900 font-mono">{caseItem.caseNumber}</strong>.
            </p>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-surface-800 mb-1">Assign Radiographer</label>
                <select
                  value={reassignRadId}
                  onChange={(e) => setReassignRadId(e.target.value)}
                  className="select-field text-xs"
                >
                  <option value="">-- Select Radiographer --</option>
                  {users
                    .filter((u) => u.role === 'Radiographer' || u.role === 'Administrator')
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-surface-800 mb-1">Assign Radiologist</label>
                <select
                  value={reassignRadlogistId}
                  onChange={(e) => setReassignRadlogistId(e.target.value)}
                  className="select-field text-xs"
                >
                  <option value="">-- Select Radiologist --</option>
                  {users
                    .filter((u) => u.role === 'Radiologist' || u.role === 'Administrator')
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setShowReassignModal(false)}
                className="btn-secondary text-xs px-3.5 py-1.5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReassign}
                className="btn-primary text-xs px-4 py-1.5"
              >
                Save Reassignment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PersonnelCard({
  label,
  name,
  icon,
  canReassign = false,
  onReassign,
}: {
  label: string;
  name: string;
  icon: React.ReactNode;
  canReassign?: boolean;
  onReassign?: () => void;
}) {
  return (
    <div className="p-3 bg-surface-100 rounded-lg border border-surface-200 flex items-center justify-between">
      <div>
        <div className="flex items-center gap-2 mb-1 text-surface-500">{icon}<span className="text-[10px] uppercase font-semibold">{label}</span></div>
        <p className="text-sm font-medium text-surface-800">{name}</p>
      </div>
      {canReassign && onReassign && (
        <button
          type="button"
          onClick={onReassign}
          className="text-[11px] text-purple-700 hover:text-purple-900 font-bold bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2 py-0.5 rounded transition-colors"
        >
          Reassign
        </button>
      )}
    </div>
  );
}

// Priority 3: SLA Timer Component
function SLAIndicator({ caseItem }: { caseItem: Case }) {
  const SLA_HOURS: Record<string, number> = { CREATED: 24, SCHEDULED: 72, SCANNED: 48 };
  const status = caseItem.status;
  if (status === 'FINALIZED' || status === 'REPORTED') return null;

  const slaHours = SLA_HOURS[status];
  if (!slaHours) return null;

  const referenceDate = status === 'CREATED' ? caseItem.createdAt : status === 'SCHEDULED' ? caseItem.scheduledAt : caseItem.scannedAt;
  if (!referenceDate) return null;

  const deadline = new Date(new Date(referenceDate).getTime() + slaHours * 60 * 60 * 1000);
  const now = new Date();
  const remaining = deadline.getTime() - now.getTime();
  const hoursLeft = Math.floor(remaining / (1000 * 60 * 60));
  const isOverdue = remaining < 0;
  const isWarning = hoursLeft <= 6 && !isOverdue;

  const slaLabels: Record<string, string> = {
    CREATED: 'Must be scheduled within 24h',
    SCHEDULED: 'Must be scanned within 72h',
    SCANNED: 'Report must be completed within 48h',
  };

  return (
    <div className={`card border-l-4 ${isOverdue ? 'border-l-red-500 bg-red-50' : isWarning ? 'border-l-amber-500 bg-amber-50' : 'border-l-emerald-500'}`}>
      <h2 className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <Clock className={`w-3.5 h-3.5 ${isOverdue ? 'text-red-500' : isWarning ? 'text-amber-500' : 'text-emerald-600'}`} />
        <span className={isOverdue ? 'text-red-700' : isWarning ? 'text-amber-700' : 'text-emerald-700'}>SLA Status</span>
      </h2>
      <p className={`text-lg font-bold ${isOverdue ? 'text-red-700' : isWarning ? 'text-amber-700' : 'text-navy-800'}`}>
        {isOverdue ? `Overdue by ${Math.abs(hoursLeft)}h` : `${hoursLeft}h remaining`}
      </p>
      <p className="text-[10px] text-surface-500 mt-1">{slaLabels[status]}</p>
      <p className="text-[10px] text-surface-400 mt-0.5">Deadline: {deadline.toLocaleString()}</p>
    </div>
  );
}

// Import needed type
import type { Case } from '../../types';
