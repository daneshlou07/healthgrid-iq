import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { Users, Plus, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { normalizeNric, formatNric } from '../../utils/malaysianNric';

function displayNric(nric: string): string {
  if (!nric) return '—';
  const digits = normalizeNric(nric);
  return digits.length === 12 ? formatNric(digits) : nric;
}

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
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-navy-800">Patient Registry</h1>
          <p className="text-sm text-surface-500">View and manage clinical patient records.</p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-400" />
            <input
              type="text"
              placeholder="Filter by name or IC..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9 py-2.5 text-xs w-full"
            />
          </div>
          <Link to="/patients/register" className="btn-primary text-xs flex items-center gap-1.5 whitespace-nowrap shrink-0">
            <Plus className="w-3.5 h-3.5" /> Register Patient
          </Link>
        </div>
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
                  <td className="table-cell text-surface-500 font-mono text-xs">{displayNric(patient.nric)}</td>
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


