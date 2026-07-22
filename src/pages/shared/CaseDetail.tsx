import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import StatusBadge from '../../components/ui/StatusBadge';
import SeverityBadge from '../../components/ui/SeverityBadge';
import { ArrowLeft, Clock, User, Building2, FileText, Send, Copy, CheckCircle } from 'lucide-react';
import { loadImages } from '../../services/imageStorage';

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
  const { cases, patients, reports, getCommentsForCase, addComment, addRecentItem } = useData();
  const [newMessage, setNewMessage] = useState('');
  const [copied, setCopied] = useState(false);

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-surface-100 rounded-lg transition-colors">
            <ArrowLeft className="w-4 h-4 text-surface-500" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="page-title font-mono">{caseItem.caseNumber}</h1>
              <button onClick={handleCopy} className="p-1 hover:bg-surface-100 rounded transition-colors" title="Copy case number">
                {copied ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-surface-400" />}
              </button>
            </div>
            <p className="page-subtitle">{caseItem.patientName} — {caseItem.scanType}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SeverityBadge severity={caseItem.severity} />
          <StatusBadge status={caseItem.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Case Info */}
          <div className="card">
            <h2 className="section-title mb-4">Case Information</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-xs text-surface-500">Disease / Condition</span><p className="text-surface-800 font-medium">{caseItem.disease || '—'}</p></div>
              <div><span className="text-xs text-surface-500">Imaging Modality</span><p className="text-surface-800">{caseItem.scanType}</p></div>
              <div><span className="text-xs text-surface-500">Body Region</span><p className="text-surface-800">{caseItem.bodyRegion || '—'}</p></div>
              <div><span className="text-xs text-surface-500">Healthcare Centre</span><p className="text-surface-800">{caseItem.clinicName || 'Pending AI Scheduler'}</p></div>
            </div>
            {caseItem.notes && (
              <div className="mt-4 pt-4 border-t border-surface-200">
                <span className="text-xs text-surface-500">Clinical Notes</span>
                <p className="text-sm text-surface-700 mt-1">{caseItem.notes}</p>
              </div>
            )}
          </div>

          {/* Personnel */}
          <div className="card">
            <h2 className="section-title mb-4">Assigned Personnel</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <PersonnelCard label="Referring Doctor" name={caseItem.doctorName} icon={<User className="w-4 h-4" />} />
              <PersonnelCard label="Radiographer" name={caseItem.radiographerName || 'Not Assigned'} icon={<User className="w-4 h-4" />} />
              <PersonnelCard label="Radiologist" name={caseItem.radiologistName || 'Not Assigned'} icon={<User className="w-4 h-4" />} />
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

          {/* Scan images for cases without a report yet (SCANNED status) */}
          {!report && caseItem.images && caseItem.images.length > 0 && (
            <div className="card">
              <h2 className="section-title mb-4 flex items-center gap-2"><FileText className="w-4 h-4 text-navy-600" /> Scan Images</h2>
              <CaseImages imageKeys={caseItem.images} />
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
        </div>
      </div>
    </div>
  );
}

function PersonnelCard({ label, name, icon }: { label: string; name: string; icon: React.ReactNode }) {
  return (
    <div className="p-3 bg-surface-100 rounded-lg border border-surface-200">
      <div className="flex items-center gap-2 mb-1 text-surface-500">{icon}<span className="text-[10px] uppercase font-semibold">{label}</span></div>
      <p className="text-sm font-medium text-surface-800">{name}</p>
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
