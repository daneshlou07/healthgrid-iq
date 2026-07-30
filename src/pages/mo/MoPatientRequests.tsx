import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { CheckSquare, Search, Plus } from 'lucide-react';

export default function MoPatientRequests() {
  const { patientRequests } = useData();
  const [search, setSearch] = useState('');

  const filtered = patientRequests.filter((r) =>
    !search ||
    r.patientName.toLowerCase().includes(search.toLowerCase()) ||
    r.mrn.toLowerCase().includes(search.toLowerCase()) ||
    r.requestType.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="page-title">Medical Officer Patient Record Requests</h1>
            <span className="badge-purple font-mono text-xs font-bold">MO INTAKE</span>
          </div>
          <p className="page-subtitle">Track patient record transfers, CD/USB image burning requests, and clinical report requests.</p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
        <input
          type="text"
          placeholder="Search by patient name, MRN, or request type..."
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
                <th className="table-header">Patient Name</th>
                <th className="table-header">MRN</th>
                <th className="table-header">Request Type</th>
                <th className="table-header">Target Facility / Ward</th>
                <th className="table-header">Status</th>
                <th className="table-header">Requested Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-surface-100 transition-colors">
                  <td className="table-cell font-semibold text-slate-900">{r.patientName}</td>
                  <td className="table-cell font-mono text-xs text-navy-700 font-bold">{r.mrn}</td>
                  <td className="table-cell text-xs font-medium text-purple-900">{r.requestType}</td>
                  <td className="table-cell text-xs text-slate-600">{r.requestedByRole || 'Medical Officer'}</td>
                  <td className="table-cell">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      r.status === 'Approved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : r.status === 'Pending'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="table-cell text-xs text-slate-500">{new Date(r.dateSubmitted).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="text-center py-10 text-slate-400 text-xs">No patient requests found.</div>}
      </div>
    </div>
  );
}
