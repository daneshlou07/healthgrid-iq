import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import StatsCard from '../../components/ui/StatsCard';
import StatusBadge from '../../components/ui/StatusBadge';
import SeverityBadge from '../../components/ui/SeverityBadge';
import { Users, FolderOpen, FileText, Clock, CheckCircle, Calendar, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DoctorDashboard() {
  const { currentUser } = useAuth();
  const { cases, patients, reports } = useData();

  const myCases = cases.filter((c) => c.doctorId === currentUser?.id);
  const pending = myCases.filter((c) => c.status === 'CREATED');
  const scheduled = myCases.filter((c) => c.status === 'SCHEDULED');
  const inProgress = myCases.filter((c) => c.status === 'SCANNED');
  const completed = myCases.filter((c) => c.status === 'FINALIZED');
  const reportReady = myCases.filter((c) => c.status === 'FINALIZED');
  const reportPending = myCases.filter((c) => c.status === 'SCANNED' || c.status === 'REPORTED');
  const recentCases = [...myCases].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Doctor Dashboard</h1>
        <p className="page-subtitle">Overview of your cases and reports</p>
      </div>

      {/* Stats Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Cases" value={myCases.length} icon={<FolderOpen className="w-5 h-5" />} color="navy" />
        <StatsCard title="Pending Scheduling" value={pending.length} icon={<Clock className="w-5 h-5" />} color="amber" />
        <StatsCard title="Scheduled" value={scheduled.length} icon={<Calendar className="w-5 h-5" />} color="navy" />
        <StatsCard title="Report Ready" value={reportReady.length} icon={<FileText className="w-5 h-5" />} color="emerald" />
      </div>

      {/* Stats Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard title="In Progress" value={inProgress.length} icon={<AlertCircle className="w-5 h-5" />} color="purple" />
        <StatsCard title="Completed" value={completed.length} icon={<CheckCircle className="w-5 h-5" />} color="emerald" />
        <StatsCard title="Report Pending" value={reportPending.length} icon={<Clock className="w-5 h-5" />} color="amber" />
      </div>

      {/* Recent Cases Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">Recent Cases</h2>
          <Link to="/cases" className="text-sm text-navy-600 hover:text-navy-700 font-medium">View all &rarr;</Link>
        </div>
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
              {recentCases.map((c) => (
                <tr key={c.id} className="hover:bg-surface-100 transition-colors">
                  <td className="table-cell font-mono text-navy-600 font-medium text-xs">{c.caseNumber}</td>
                  <td className="table-cell font-medium text-surface-800">{c.patientName}</td>
                  <td className="table-cell text-xs text-surface-600">{c.disease || '—'}</td>
                  <td className="table-cell text-surface-600">{c.scanType}</td>
                  <td className="table-cell"><SeverityBadge severity={c.severity} /></td>
                  <td className="table-cell"><StatusBadge status={c.status} /></td>
                  <td className="table-cell text-surface-500 text-xs">{new Date(c.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {recentCases.length === 0 && (
                <tr><td colSpan={7} className="table-cell text-center text-surface-400 py-8">No cases yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
