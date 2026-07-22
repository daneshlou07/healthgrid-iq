import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import StatusBadge from '../../components/ui/StatusBadge';
import SeverityBadge from '../../components/ui/SeverityBadge';
import { Link } from 'react-router-dom';
import { getCaseIndication } from '../../utils/caseDisplay';
import { Search } from 'lucide-react';

export default function SignedReports() {
  const { currentUser } = useAuth();
  const { reports, cases } = useData();
  const [search, setSearch] = useState('');

  const myReports = reports.filter((r) => r.radiologistId === currentUser?.id);
  const filtered = myReports.filter((r) => {
    const caseItem = cases.find((c) => c.id === r.caseId);
    const query = search.toLowerCase();
    return r.caseNumber.toLowerCase().includes(query) ||
      r.patientName.toLowerCase().includes(query) ||
      (caseItem ? getCaseIndication(caseItem).toLowerCase().includes(query) : false);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Imaging Completed</h1>
        <p className="page-subtitle">{myReports.length} reports submitted</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
        <input type="text" placeholder="Search by case #, patient, or symptom..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" />
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-200">
              <th className="table-header">Case #</th>
              <th className="table-header">Patient</th>
              <th className="table-header">Indication / Symptom</th>
              <th className="table-header">Imaging Modality</th>
              <th className="table-header">Severity</th>
              <th className="table-header">Submitted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-200">
            {filtered.map((r) => {
              const caseItem = cases.find((c) => c.id === r.caseId);
              return (
                <tr key={r.id} className="hover:bg-surface-100 transition-colors">
                  <td className="table-cell"><Link to={`/case/${r.caseId}`} className="font-mono text-navy-600 font-medium text-xs hover:underline">{r.caseNumber}</Link></td>
                  <td className="table-cell font-medium text-surface-800">{r.patientName}</td>
                  <td className="table-cell text-xs text-surface-600">{caseItem ? (getCaseIndication(caseItem) || '—') : '—'}</td>
                  <td className="table-cell text-surface-600">{caseItem?.scanType || '—'}</td>
                  <td className="table-cell"><SeverityBadge severity={caseItem?.severity} /></td>
                  <td className="table-cell text-surface-500 text-xs">{r.signedAt ? new Date(r.signedAt).toLocaleDateString() : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-10 text-surface-400 text-sm">No reports found.</div>}
      </div>
    </div>
  );
}
