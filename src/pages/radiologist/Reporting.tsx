import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ux/Toast';
import StatusBadge from '../../components/ui/StatusBadge';
import { CheckCircle, Image, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { loadImages } from '../../services/imageStorage';

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
  const [saving, setSaving] = useState(false);

  const scannedCases = cases.filter((c) => c.status === 'SCANNED');

  const handleSignOff = async () => {
    if (!currentUser || !selectedCase || !findings || !impression) return;
    setSaving(true);

    await addReport({
      caseId: selectedCase.id, caseNumber: selectedCase.caseNumber, patientName: selectedCase.patientName,
      radiologistId: currentUser.id, radiologistName: currentUser.name, findings, impression,
      suggestions: suggestions || undefined, status: 'Verified / Signed Off',
      createdAt: new Date().toISOString(), signedAt: new Date().toISOString(),
      imageKeys: selectedCase.images && selectedCase.images.length > 0 ? selectedCase.images : undefined,
    });

    await editCase(selectedCase.id, {
      status: 'FINALIZED', radiologistId: currentUser.id, radiologistName: currentUser.name, finalizedAt: new Date().toISOString(),
    });

    await addAuditLog({
      userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role,
      action: 'REPORT_SIGNED', target: `cases/${selectedCase.id}`,
      details: `Signed off report for ${selectedCase.caseNumber}`,
      timestamp: new Date().toISOString(),
    });

    toast.success(`Report signed for ${selectedCase.caseNumber}`);
    setSaving(false);
    setSelectedCase(null); setFindings(''); setImpression(''); setSuggestions('');
  };

  if (!selectedCase) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="page-title">Clinical Reporting</h1>
          <p className="page-subtitle">Select a case to write a diagnostic report</p>
        </div>
        <div className="space-y-2">
          {scannedCases.map((c) => (
            <button key={c.id} onClick={() => setSelectedCase(c)} className="w-full card-hover text-left">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-navy-700">{c.caseNumber} — {c.patientName}</p>
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
        <h1 className="page-title">Report: {selectedCase.caseNumber}</h1>
        <p className="page-subtitle">{selectedCase.patientName} — {selectedCase.scanType}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Info */}
        <div className="space-y-4">
          <div className="card">
            <h3 className="text-xs font-semibold text-surface-500 uppercase mb-3">Patient & Case</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-surface-500">Case</span><Link to={`/case/${selectedCase.id}`} className="text-navy-700 font-mono hover:underline">{selectedCase.caseNumber}</Link></div>
              <div className="flex justify-between"><span className="text-surface-500">Patient</span><span className="text-surface-800">{selectedCase.patientName}</span></div>
              <div className="flex justify-between"><span className="text-surface-500">Scan</span><span className="text-surface-800">{selectedCase.scanType}</span></div>
              <div className="flex justify-between"><span className="text-surface-500">Doctor</span><span className="text-surface-800">{selectedCase.doctorName}</span></div>
            </div>
            {selectedCase.notes && (
              <div className="mt-3 p-3 bg-surface-100 rounded-lg">
                <p className="text-xs text-surface-500 mb-1">Clinical Notes:</p>
                <p className="text-sm text-surface-700">{selectedCase.notes}</p>
              </div>
            )}
          </div>
          <div className="card">
            <h3 className="text-xs font-semibold text-surface-500 uppercase mb-3">Medical Images</h3>
            <CaseImageViewer imageKeys={selectedCase.images} />
          </div>
        </div>

        {/* Right: Editor */}
        <div className="card space-y-4">
          <h3 className="text-xs font-semibold text-surface-500 uppercase">Diagnostic Report</h3>
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
              {saving ? 'Signing...' : 'Sign Off & Finalize'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
