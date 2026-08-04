import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ux/Toast';
import StatusBadge from '../../components/ui/StatusBadge';
import { CheckCircle, Image, FileText, Brain, Sparkles, AlertTriangle, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getCaseRegistrar } from '../../utils/caseDisplay';
import { loadImages } from '../../services/imageStorage';
import PacsImageViewer from '../../components/ui/PacsImageViewer';
import { generateAiReportDraft } from '../../services/aiReportingCopilot';
import { generateReportToken } from '../../utils/reportToken';

/** Loads and displays images from IndexedDB keys stored on the case */
function CaseImageViewer({ imageKeys }: { imageKeys?: string[] }) {
  const [urls, setUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!imageKeys || imageKeys.length === 0) { setUrls([]); return; }
    setLoading(true);
    loadImages(imageKeys).then((loaded) => { setUrls(loaded); setLoading(false); });
  }, [imageKeys?.join(',')]);

  if (!imageKeys || imageKeys.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-surface-400">
        <div className="text-center"><Image className="w-8 h-8 mx-auto mb-2 opacity-40" /><p className="text-xs">No images uploaded for this case</p></div>
      </div>
    );
  }
  if (loading) return <p className="text-xs text-surface-400 py-4 text-center">Loading images…</p>;
  if (urls.length === 0) return <p className="text-xs text-surface-400 py-4 text-center">Images unavailable.</p>;
  return (
    <div className="grid grid-cols-2 gap-2">
      {urls.map((url, i) => (
        <a key={i} href={url} target="_blank" rel="noopener noreferrer">
          <img src={url} alt={`Scan ${i + 1}`} className="w-full rounded-lg border border-surface-300 object-contain bg-black max-h-48 cursor-pointer hover:opacity-90 transition-opacity" />
        </a>
      ))}
    </div>
  );
}

export default function Reporting() {
  const { currentUser } = useAuth();
  const { cases, addReport, editCase, addAuditLog } = useData();
  const toast = useToast();
  const [selectedCase, setSelectedCase] = useState<import('../../types').Case | null>(null);
  const [findings, setFindings] = useState('');
  const [impression, setImpression] = useState('');
  const [suggestions, setSuggestions] = useState('');
  const [isCriticalFinding, setIsCriticalFinding] = useState(false);
  const [criticalFindingNote, setCriticalFindingNote] = useState('');
  const [saving, setSaving] = useState(false);

  const scannedCases = cases.filter((c) => c.status === 'SCANNED');

  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [escalateReason, setEscalateReason] = useState('Suspected Abnormality / Requires Specialist Opinion');

  const handleSignOff = async () => {
    if (!currentUser || !selectedCase || !findings || !impression) return;
    setSaving(true);

    const signedRole = currentUser.role;

    await addReport({
      caseId: selectedCase.id, caseNumber: selectedCase.caseNumber, patientName: selectedCase.patientName,
      radiologistId: currentUser.id, radiologistName: currentUser.name, signedByRole: signedRole,
      findings, impression,
      isCriticalFinding: isCriticalFinding || undefined,
      criticalFindingNote: isCriticalFinding ? criticalFindingNote : undefined,
      suggestions: suggestions || undefined, status: 'Verified / Signed Off',
      createdAt: new Date().toISOString(), signedAt: new Date().toISOString(),
      imageKeys: selectedCase.images && selectedCase.images.length > 0 ? selectedCase.images : undefined,
      reportToken: generateReportToken(selectedCase.id),
    });

    await editCase(selectedCase.id, {
      status: 'FINALIZED', radiologistId: currentUser.id, radiologistName: currentUser.name, finalizedAt: new Date().toISOString(),
      isCriticalFinding: isCriticalFinding || undefined,
      criticalFindingNote: isCriticalFinding ? criticalFindingNote : undefined,
    });

    await addAuditLog({
      userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role,
      action: 'REPORT_SIGNED', target: `cases/${selectedCase.id}`,
      details: `Signed off report (${signedRole}) for ${selectedCase.caseNumber}`,
      timestamp: new Date().toISOString(),
    });

    toast.success(`Report finalized by ${currentUser.name} (${signedRole}) for ${selectedCase.caseNumber}`);
    setSaving(false);
    setSelectedCase(null); setFindings(''); setImpression(''); setSuggestions('');
  };

  const handleConfirmEscalate = async () => {
    if (!currentUser || !selectedCase) return;
    setSaving(true);

    await editCase(selectedCase.id, {
      isEscalated: true,
      escalationReason: escalateReason,
      escalatedBy: currentUser.name,
      escalatedAt: new Date().toISOString(),
    });

    await addAuditLog({
      userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role,
      action: 'CASE_ESCALATED', target: `cases/${selectedCase.id}`,
      details: `Escalated case ${selectedCase.caseNumber} to Specialist Radiologist: ${escalateReason}`,
      timestamp: new Date().toISOString(),
    });

    toast.info(`Case ${selectedCase.caseNumber} escalated to Specialist Radiologist`);
    setSaving(false);
    setShowEscalateModal(false);
    setSelectedCase(null);
  };

  if (!selectedCase) {
    return (
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="page-title">Medical Officer Clinical Reporting</h1>
            <span className="badge-purple font-mono text-xs font-bold">MO REPORTING</span>
          </div>
          <p className="page-subtitle">Select a case to write a diagnostic report or escalate complex cases to Specialist Radiologist.</p>
        </div>
        <div className="space-y-2">
          {scannedCases.map((c) => (
            <button key={c.id} onClick={() => setSelectedCase(c)} className="w-full card-hover text-left">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-navy-700">{c.caseNumber} — {c.patientName}</p>
                    {c.isEscalated && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-full">
                        ESCALATED TO RADIOLOGIST
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-surface-500">{c.scanType} &middot; {c.clinicName}</p>
                </div>
                <StatusBadge status={c.status} />
              </div>
            </button>
          ))}
          {scannedCases.length === 0 && <div className="text-center py-12 text-surface-400 text-sm">No cases available.</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="page-title">Medical Officer Report: {selectedCase.caseNumber}</h1>
          <span className="badge-purple font-mono text-xs font-bold">MO EDITOR</span>
        </div>
        <p className="page-subtitle">{selectedCase.patientName} — {selectedCase.scanType}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Info */}
        <div className="space-y-4">
          <div className="card">
            <h3 className="text-xs font-semibold text-surface-500 uppercase mb-3">Patient &amp; Case</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-surface-500">Case</span><Link to={`/case/${selectedCase.id}`} className="text-navy-700 font-mono hover:underline">{selectedCase.caseNumber}</Link></div>
              <div className="flex justify-between"><span className="text-surface-500">Patient</span><span className="text-surface-800">{selectedCase.patientName}</span></div>
              <div className="flex justify-between"><span className="text-surface-500">Scan</span><span className="text-surface-800">{selectedCase.scanType}</span></div>
              <div className="flex justify-between"><span className="text-surface-500">Registered by</span><span className="text-surface-800">{getCaseRegistrar(selectedCase)}</span></div>
            </div>
            {selectedCase.notes && (
              <div className="mt-3 p-3 bg-surface-100 rounded-lg">
                <p className="text-xs text-surface-500 mb-1">Clinical Notes:</p>
                <p className="text-sm text-surface-700">{selectedCase.notes}</p>
              </div>
            )}
            {selectedCase.isEscalated && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs space-y-1">
                <p className="font-bold text-red-900">Escalated by {selectedCase.escalatedBy || 'Medical Officer'}</p>
                <p className="text-red-700">Reason: {selectedCase.escalationReason}</p>
              </div>
            )}
          </div>

          <div className="card p-0 border-0 bg-transparent">
            <h3 className="text-xs font-semibold text-surface-500 uppercase mb-2">PACS Diagnostic Viewer</h3>
            <PacsImageViewer
              imageKeys={selectedCase.images}
              heightClass="h-[380px]"
              caseItem={selectedCase}
              onAiAnalyzed={(res) => {
                setFindings(res.findings);
                setImpression(res.impression);
                toast.success(`Vision AI analyzed image pixels (${res.confidenceScore}% confidence)`);
              }}
            />
          </div>
        </div>

        {/* Right: Editor */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-surface-500 uppercase">Medical Officer Report Editor</h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!selectedCase) return;
                  const draft = generateAiReportDraft(selectedCase);
                  setFindings(draft.findings);
                  setImpression(draft.impression);
                  if (draft.suggestions) setSuggestions(draft.suggestions);
                  toast.success(`AI Draft generated (${draft.confidenceScore}% confidence)`);
                }}
                className="px-2.5 py-1 bg-purple-100 hover:bg-purple-200 text-purple-900 rounded-lg text-xs font-bold transition-all flex items-center gap-1 border border-purple-300 shadow-sm"
                title="1-Click AI Preliminary Impression Generator"
              >
                <Sparkles className="w-3.5 h-3.5" />
                AI Copilot Draft
              </button>
              <button
                type="button"
                onClick={() => setShowEscalateModal(true)}
                className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Escalate
              </button>
            </div>
          </div>

          {/* Critical Red Flag Alert Toggle */}
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-red-900">
              <input
                type="checkbox"
                checked={isCriticalFinding}
                onChange={(e) => setIsCriticalFinding(e.target.checked)}
                className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
              />
              <ShieldAlert className="w-4 h-4 text-red-700" />
              Flag as Critical Finding (Emergency Red Flag Alert)
            </label>
            {isCriticalFinding && (
              <input
                type="text"
                value={criticalFindingNote}
                onChange={(e) => setCriticalFindingNote(e.target.value)}
                placeholder="Specify critical finding (e.g., Tension pneumothorax, Intracranial hemorrhage)..."
                className="input-field text-xs border-red-300 bg-white"
                required
              />
            )}
          </div>

          {/* Quick Macro Templates Bar */}
          <div className="flex items-center gap-1.5 flex-wrap bg-surface-50 p-2.5 rounded-lg border border-surface-200">
            <span className="text-[11px] font-bold text-navy-800 flex items-center gap-1">
              1-Click Normal Macros:
            </span>
            <button
              type="button"
              onClick={() => {
                setFindings('Lungs are clear without focal consolidation, effusion, or pneumothorax. Cardiothoracic ratio is within normal limits. Osseous structures and pleural spaces are intact.');
                setImpression('Normal Chest Radiograph.');
                toast.success('Inserted Normal Chest X-Ray template');
              }}
              className="text-[11px] bg-white hover:bg-navy-50 text-navy-800 border border-surface-300 px-2 py-0.5 rounded cursor-pointer transition-colors"
            >
              + Normal Chest X-Ray
            </button>
            <button
              type="button"
              onClick={() => {
                setFindings('Vertebral body alignment and heights are preserved. Intervertebral disc spaces are maintained. No acute fracture, subluxation, or destructive osseous lesion.');
                setImpression('Normal Spine Radiograph.');
                toast.success('Inserted Normal Spine X-Ray template');
              }}
              className="text-[11px] bg-white hover:bg-navy-50 text-navy-800 border border-surface-300 px-2 py-0.5 rounded cursor-pointer transition-colors"
            >
              + Normal Spine X-Ray
            </button>
            <button
              type="button"
              onClick={() => {
                setFindings('Brain parenchyma demonstrates normal attenuation and architecture. Ventricles and sulci are age-appropriate. No acute intracranial hemorrhage, mass effect, or midline shift.');
                setImpression('Unremarkable Brain CT.');
                toast.success('Inserted Normal Brain CT template');
              }}
              className="text-[11px] bg-white hover:bg-navy-50 text-navy-800 border border-surface-300 px-2 py-0.5 rounded cursor-pointer transition-colors"
            >
              + Normal Brain CT
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Findings *</label>
            <textarea rows={5} value={findings} onChange={(e) => setFindings(e.target.value)} className="input-field resize-none text-sm" placeholder="Detailed radiological findings..." />
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Impression *</label>
            <textarea rows={3} value={impression} onChange={(e) => setImpression(e.target.value)} className="input-field resize-none text-sm" placeholder="Clinical synthesis..." />
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Suggestions</label>
            <textarea rows={2} value={suggestions} onChange={(e) => setSuggestions(e.target.value)} className="input-field resize-none text-sm" placeholder="Follow-up recommendations..." />
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-surface-200">
            <button onClick={() => setSelectedCase(null)} className="btn-secondary text-sm">Back</button>
            <button onClick={handleSignOff} disabled={saving || !findings || !impression} className="btn-success disabled:opacity-50">
              {saving ? 'Signing...' : 'Finalize Report (MO Approved)'}
            </button>
          </div>
        </div>
      </div>

      {/* ── MODAL: Escalate to Radiologist ── */}
      {showEscalateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              Escalate to Specialist Radiologist
            </h3>
            <p className="text-xs text-slate-500">
              This will route the case to the Specialist Radiologist queue for complex analysis.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Escalation Rationale</label>
              <select
                value={escalateReason}
                onChange={(e) => setEscalateReason(e.target.value)}
                className="input-field text-xs mb-2"
              >
                <option value="Suspected Abnormality / Requires Specialist Opinion">Suspected Abnormality / Requires Specialist Opinion</option>
                <option value="Complex CT / MRI Modality Interpretation">Complex CT / MRI Modality Interpretation</option>
                <option value="Possible Tumor or Oncology Pathology">Possible Tumor or Oncology Pathology</option>
                <option value="Equivocal / Inconclusive Preliminary Finding">Equivocal / Inconclusive Preliminary Finding</option>
                <option value="High Risk Patient / Medico-Legal Request">High Risk Patient / Medico-Legal Request</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowEscalateModal(false)} className="btn-secondary text-xs px-4 py-2">Cancel</button>
              <button onClick={handleConfirmEscalate} className="btn-danger text-xs px-4 py-2">Confirm Escalation</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
