import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import type { Report } from '../../types';
import StatusBadge from '../../components/ui/StatusBadge';
import SeverityBadge from '../../components/ui/SeverityBadge';
import Modal from '../../components/ui/Modal';
import { Eye, Printer } from 'lucide-react';
import { Link } from 'react-router-dom';
import { loadImages } from '../../services/imageStorage';
import { getCaseIndication } from '../../utils/caseDisplay';

/** Inline image loader for the report modal */
function ReportImages({ imageKeys }: { imageKeys?: string[] }) {
  const [urls, setUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!imageKeys || imageKeys.length === 0) { setUrls([]); return; }
    setLoading(true);
    loadImages(imageKeys).then((loaded) => { setUrls(loaded); setLoading(false); });
  }, [imageKeys?.join(',')]);

  if (!imageKeys || imageKeys.length === 0) return null;
  if (loading) return <p className="text-xs text-surface-400 py-2">Loading images…</p>;
  if (urls.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-surface-500 uppercase mb-2">Scan Images</p>
      <div className="grid grid-cols-2 gap-2">
        {urls.map((url, i) => (
          <a key={i} href={url} target="_blank" rel="noopener noreferrer">
            <img src={url} alt={`Scan ${i + 1}`} className="w-full rounded-lg border border-surface-300 object-contain bg-black max-h-48 cursor-pointer hover:opacity-90 transition-opacity" />
          </a>
        ))}
      </div>
    </div>
  );
}

function handlePrint(report: Report) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  const html = `<!DOCTYPE html><html><head><title>Report ${report.caseNumber}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;padding:40px 50px;color:#1A202C;line-height:1.6}.header{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #1B2B5B;padding-bottom:16px;margin-bottom:24px}.logo{font-size:18px;font-weight:700;color:#1B2B5B}.logo span{color:#10B981}.badge{background:#ECFDF5;color:#059669;padding:4px 10px;border-radius:4px;font-size:11px;font-weight:600}.case-title{font-size:16px;font-weight:700;color:#1B2B5B;margin-bottom:20px}.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px}.info-item label{font-size:10px;color:#6B7A8D;text-transform:uppercase;letter-spacing:0.5px}.info-item p{font-size:13px;color:#1A202C;font-weight:500;margin-top:2px}.section{margin-bottom:20px}.section-title{font-size:10px;font-weight:700;color:#6B7A8D;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px;border-bottom:1px solid #E4E9F1;padding-bottom:4px}.section-content{font-size:13px;color:#2D3748;padding:12px 16px;background:#F7F9FC;border-radius:6px;border:1px solid #E4E9F1}.signature{margin-top:40px;padding-top:20px;border-top:1px solid #E4E9F1}.signature p{font-size:12px;color:#4A5568}.signature .name{font-size:14px;font-weight:600;color:#1B2B5B;margin-top:30px}.footer{margin-top:40px;padding-top:12px;border-top:2px solid #1B2B5B;text-align:center;font-size:10px;color:#9BA5B7}@media print{body{padding:20px 30px}}</style>
</head><body>
<div class="header"><div class="logo">HealthGrid <span>IQ</span></div><div class="badge">DIAGNOSTIC REPORT</div></div>
<div class="case-title">Case: ${report.caseNumber}</div>
<div class="info-grid"><div class="info-item"><label>Patient</label><p>${report.patientName}</p></div><div class="info-item"><label>Radiologist</label><p>${report.radiologistName}</p></div><div class="info-item"><label>Status</label><p>${report.status}</p></div><div class="info-item"><label>Signed</label><p>${report.signedAt ? new Date(report.signedAt).toLocaleString() : '—'}</p></div></div>
<div class="section"><div class="section-title">Findings</div><div class="section-content">${report.findings}</div></div>
<div class="section"><div class="section-title">Impression</div><div class="section-content">${report.impression}</div></div>
${report.suggestions ? `<div class="section"><div class="section-title">Suggestions</div><div class="section-content">${report.suggestions}</div></div>` : ''}
<div class="signature"><p>Electronically signed by:</p><p class="name">${report.radiologistName}</p><p>Diagnostic Radiologist</p></div>
<div class="footer"><p>HealthGrid IQ — Clinical Imaging & Diagnostic Platform</p><p>Theta Edge Berhad &bull; Confidential Medical Document</p></div>
</body></html>`;
  printWindow.document.write(html);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 300);
}

export default function DepartmentReports() {
  const { reports, cases } = useData();
  const [selected, setSelected] = useState<Report | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Diagnostic Reports</h1>
        <p className="page-subtitle">{reports.length} completed reports ready for review</p>
      </div>

      <div className="space-y-3">
        {reports.map((r) => {
          const caseItem = cases.find((c) => c.id === r.caseId);
          return (
            <div key={r.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Link to={`/case/${r.caseId}`} className="text-sm font-semibold text-navy-700 font-mono hover:underline">{r.caseNumber}</Link>
                    <SeverityBadge severity={caseItem?.severity} />
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="text-sm text-surface-700">{r.patientName}</p>
                  <p className="text-xs text-surface-500">{caseItem ? (getCaseIndication(caseItem) || caseItem.scanType) : ''} &middot; {caseItem?.clinicName || ''}</p>
                  {r.signedAt && <p className="text-xs text-surface-400 mt-1">Submitted {new Date(r.signedAt).toLocaleDateString()}</p>}
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => handlePrint(r)} className="btn-ghost text-xs py-1.5 px-2" title="Print"><Printer className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setSelected(r)} className="btn-secondary text-xs flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> View</button>
                </div>
              </div>
            </div>
          );
        })}
        {reports.length === 0 && <div className="text-center py-12 text-surface-400 text-sm">No reports available.</div>}
      </div>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={`Report — ${selected?.caseNumber || ''}`} size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-surface-500">Patient</span><p className="text-surface-800 font-medium">{selected.patientName}</p></div>
              <div><span className="text-surface-500">Radiologist</span><p className="text-surface-800 font-medium">{selected.radiologistName}</p></div>
            </div>
            <ReportImages imageKeys={selected.imageKeys} />
            <div>
              <p className="text-xs font-semibold text-surface-500 uppercase mb-1">Findings</p>
              <div className="bg-surface-100 rounded-lg p-4 text-sm text-surface-700 leading-relaxed whitespace-pre-line">{selected.findings}</div>
            </div>
            <div>
              <p className="text-xs font-semibold text-surface-500 uppercase mb-1">Impression</p>
              <div className="bg-surface-100 rounded-lg p-4 text-sm text-surface-700 leading-relaxed whitespace-pre-line">{selected.impression}</div>
            </div>
            {selected.suggestions && (
              <div>
                <p className="text-xs font-semibold text-surface-500 uppercase mb-1">Suggestions</p>
                <div className="bg-surface-100 rounded-lg p-4 text-sm text-surface-700 leading-relaxed whitespace-pre-line">{selected.suggestions}</div>
              </div>
            )}
            <div className="flex justify-end pt-2 border-t border-surface-200">
              <button onClick={() => handlePrint(selected)} className="btn-primary text-sm flex items-center gap-2"><Printer className="w-4 h-4" /> Print Report</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
