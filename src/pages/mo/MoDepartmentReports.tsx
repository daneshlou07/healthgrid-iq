import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import SeverityBadge from '../../components/ui/SeverityBadge';
import StatusBadge from '../../components/ui/StatusBadge';
import { MOHFormPrintView } from '../../components/ui/PrintRadiologyForm';
import { FileText, Download, Printer, Search, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { exportDossierPdf } from '../../utils/exportDossierPdf';
import { useToast } from '../../components/ux/Toast';

export default function MoDepartmentReports() {
  const { reports, cases, patients } = useData();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [selectedCaseForPrint, setSelectedCaseForPrint] = useState<any | null>(null);

  const completedCases = cases.filter((c) => c.status === 'FINALIZED' || c.status === 'REPORTED');
  const filtered = completedCases.filter((c) =>
    !search ||
    c.caseNumber.toLowerCase().includes(search.toLowerCase()) ||
    c.patientName.toLowerCase().includes(search.toLowerCase()) ||
    c.scanType.toLowerCase().includes(search.toLowerCase())
  );

  const handleExportPdf = (c: any) => {
    const r = reports.find((rep) => rep.caseId === c.id);
    const p = patients.find((pat) => pat.id === c.patientId);
    exportDossierPdf(c, p, r);
    toast.success(`Exporting Clinical Dossier PDF for ${c.caseNumber}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="page-title">Medical Officer Diagnostic Reports Hub</h1>
            <span className="badge-purple font-mono text-xs font-bold">MO REPORTS</span>
          </div>
          <p className="page-subtitle">Access finalized diagnostic reports, export official MOH PER.SS-RA301 forms, and download PDF dossiers.</p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
        <input
          type="text"
          placeholder="Search by case #, patient name, or scan..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-10"
        />
      </div>

      <div className="card p-0 overflow-hidden border border-slate-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-200 bg-slate-50">
                <th className="table-header">Case #</th>
                <th className="table-header">Patient</th>
                <th className="table-header">Modality / Scan</th>
                <th className="table-header">Severity</th>
                <th className="table-header">Status</th>
                <th className="table-header">Signed Off By</th>
                <th className="table-header text-right">MOH Form &amp; Export</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200">
              {filtered.map((c) => {
                const report = reports.find((r) => r.caseId === c.id);
                return (
                  <tr key={c.id} className="hover:bg-surface-100 transition-colors">
                    <td className="table-cell font-mono text-navy-700 font-bold text-xs">
                      <Link to={`/case/${c.id}`} className="hover:underline">{c.caseNumber}</Link>
                    </td>
                    <td className="table-cell font-semibold text-slate-900">{c.patientName}</td>
                    <td className="table-cell text-xs text-slate-700">{c.scanType}</td>
                    <td className="table-cell"><SeverityBadge severity={c.severity} /></td>
                    <td className="table-cell"><StatusBadge status={c.status} /></td>
                    <td className="table-cell text-xs font-semibold text-purple-900">
                      {report?.radiologistName || 'MO Dr. Ahmad Razali'}
                    </td>
                    <td className="table-cell text-right space-x-2">
                      <button
                        onClick={() => setSelectedCaseForPrint(c)}
                        className="px-2.5 py-1 bg-navy-50 hover:bg-navy-100 text-navy-800 rounded-lg text-xs font-bold border border-navy-200 inline-flex items-center gap-1"
                      >
                        <Printer className="w-3.5 h-3.5" /> MOH PER.SS-RA301
                      </button>
                      <button
                        onClick={() => handleExportPdf(c)}
                        className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-900 rounded-lg text-xs font-bold border border-purple-200 inline-flex items-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" /> PDF Dossier
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="text-center py-10 text-slate-400 text-xs">No completed reports found.</div>}
      </div>

      {selectedCaseForPrint && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto relative shadow-2xl">
            <button
              onClick={() => setSelectedCaseForPrint(null)}
              className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
            <MOHFormPrintView
              caseItem={selectedCaseForPrint}
              patient={patients.find((p) => p.id === selectedCaseForPrint.patientId)}
              report={reports.find((r) => r.caseId === selectedCaseForPrint.id)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
