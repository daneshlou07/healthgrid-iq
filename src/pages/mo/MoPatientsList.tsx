import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { Search, Plus, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function MoPatientsList() {
  const { patients } = useData();
  const [search, setSearch] = useState('');

  const filtered = patients.filter((p) =>
    !search ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.mrn.toLowerCase().includes(search.toLowerCase()) ||
    p.nric.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-surface-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="page-title">Medical Officer Patient Registry</h1>
            <span className="badge-purple text-xs font-mono font-bold">MO CLINICAL INTAKE</span>
          </div>
          <p className="page-subtitle">Search, view, and register patient medical records for radiology referrals.</p>
        </div>
        <Link to="/patients/register" className="btn-primary flex items-center gap-1.5 text-xs font-bold shadow-md">
          <Plus className="w-4 h-4" /> Register New Patient
        </Link>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
        <input
          type="text"
          placeholder="Search by patient name, MRN, or NRIC..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-10"
        />
      </div>

      <div className="card p-0 overflow-hidden border border-surface-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-200 bg-surface-50">
                <th className="table-header">MRN</th>
                <th className="table-header">Patient Name</th>
                <th className="table-header">NRIC / Passport</th>
                <th className="table-header">Gender</th>
                <th className="table-header">DOB / Age</th>
                <th className="table-header">Phone</th>
                <th className="table-header text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200">
              {filtered.map((p) => {
                const age = p.dob ? new Date().getFullYear() - new Date(p.dob).getFullYear() : '—';
                return (
                  <tr key={p.id} className="hover:bg-surface-100/60 transition-colors">
                    <td className="table-cell font-mono text-navy-700 font-bold text-xs">
                      <Link to={`/patient/${p.id}`} className="hover:underline">{p.mrn}</Link>
                    </td>
                    <td className="table-cell">
                      <Link to={`/patient/${p.id}`} className="font-semibold text-slate-900 hover:text-purple-700 hover:underline">
                        {p.name}
                      </Link>
                    </td>
                    <td className="table-cell text-xs font-mono text-slate-600">{p.nric || '—'}</td>
                    <td className="table-cell text-xs text-slate-600">{p.gender || '—'}</td>
                    <td className="table-cell text-xs text-slate-600">{p.dob || '—'} ({age} yrs)</td>
                    <td className="table-cell text-xs text-slate-600">{p.phone || '—'}</td>
                    <td className="table-cell text-right">
                      <Link to={`/patient/${p.id}`} className="text-xs font-bold text-purple-700 hover:underline">
                        View Dossier &rarr;
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-10 text-slate-400 text-xs">No patient records found.</div>
        )}
      </div>
    </div>
  );
}
