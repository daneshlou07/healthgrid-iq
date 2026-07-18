import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import StatusBadge from '../../components/ui/StatusBadge';
import SeverityBadge from '../../components/ui/SeverityBadge';
import TabFilter from '../../components/ui/TabFilter';
import { Search } from 'lucide-react';
import { Link } from 'react-router-dom';

const TABS = ['All', 'Pending', 'Scheduled', 'In Progress', 'Imaging Completed', 'Report Pending', 'Report Ready'];
const TAB_STATUS_MAP: Record<string, string | undefined> = {
  'All': undefined, 'Pending': 'CREATED', 'Scheduled': 'SCHEDULED',
  'In Progress': 'SCANNED', 'Imaging Completed': 'FINALIZED', 'Report Pending': 'REPORTED', 'Report Ready': 'FINALIZED',
};

export default function AllCases() {
  const { cases } = useData();
  const [activeTab, setActiveTab] = useState('All');
  const [search, setSearch] = useState('');

  const filtered = cases.filter((c) => {
    const statusMatch = activeTab === 'All' || c.status === TAB_STATUS_MAP[activeTab];
    const searchMatch = !search || c.caseNumber.toLowerCase().includes(search.toLowerCase()) ||
      c.patientName.toLowerCase().includes(search.toLowerCase()) ||
      (c.disease || '').toLowerCase().includes(search.toLowerCase());
    return statusMatch && searchMatch;
  });

  const counts: Record<string, number> = {};
  TABS.forEach((t) => { counts[t] = t === 'All' ? cases.length : cases.filter((c) => c.status === TAB_STATUS_MAP[t]).length; });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Cases</h1>
        <p className="page-subtitle">{cases.length} cases total</p>
      </div>

      <TabFilter tabs={TABS} active={activeTab} onChange={setActiveTab} counts={counts} />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
        <input type="text" placeholder="Search by case #, patient name, or disease..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" />
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-200">
                <th className="table-header">Case #</th>
                <th className="table-header">Patient</th>
                <th className="table-header">Disease</th>
                <th className="table-header">Imaging Modality</th>
                <th className="table-header">Severity</th>
                <th className="table-header">Status</th>
                <th className="table-header">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-surface-100 transition-colors">
                  <td className="table-cell font-mono text-navy-600 font-medium text-xs"><Link to={`/case/${c.id}`} className="hover:underline">{c.caseNumber}</Link></td>
                  <td className="table-cell"><Link to={`/patient/${c.patientId}`} className="font-medium text-surface-800 hover:text-navy-700 hover:underline">{c.patientName}</Link></td>
                  <td className="table-cell text-xs text-surface-600">{c.disease || '—'}</td>
                  <td className="table-cell text-surface-600">{c.scanType}</td>
                  <td className="table-cell"><SeverityBadge severity={c.severity} /></td>
                  <td className="table-cell"><StatusBadge status={c.status} /></td>
                  <td className="table-cell text-surface-500 text-xs">{new Date(c.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="text-center py-10 text-surface-400 text-sm">No cases found.</div>}
      </div>
    </div>
  );
}
