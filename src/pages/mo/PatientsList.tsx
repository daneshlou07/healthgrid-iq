import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { Users, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PatientsList() {
  const { patients, cases } = useData();
  const [search, setSearch] = useState('');

  const filtered = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.mrn.toLowerCase().includes(search.toLowerCase()) ||
      p.nric.includes(search)
  );

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="page-title">Medical Officer Patient Registry</h1>
          <span className="badge-purple font-mono text-xs font-bold">MO INTAKE</span>
        </div>
        <p className="page-subtitle">Search, view, and manage patient clinical records for Medical Officer referrals.</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
        <input type="text" placeholder="Search by name or IC number..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" />
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-200">
              <th className="table-header">Patient Name</th>
              <th className="table-header">IC Number</th>
              <th className="table-header">Cases</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-200">
            {filtered.map((patient) => {
              const caseCount = cases.filter((c) => c.patientId === patient.id).length;
              return (
                <tr key={patient.id} className="hover:bg-surface-100 transition-colors">
                  <td className="table-cell">
                    <Link to={`/patient/${patient.id}`} className="font-medium text-surface-800 hover:text-navy-700 hover:underline">{patient.name}</Link>
                  </td>
                  <td className="table-cell text-surface-500 font-mono text-xs">{patient.nric}</td>
                  <td className="table-cell">
                    <span className="text-emerald-600 font-semibold">{caseCount}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-surface-400">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No patients found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
