import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import StatsCard from '../../components/ui/StatsCard';
import StatusBadge from '../../components/ui/StatusBadge';
import SeverityBadge from '../../components/ui/SeverityBadge';
import { FolderOpen, Clock, CheckCircle, FileText, Calendar, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DepartmentDashboard() {
  const { currentUser } = useAuth();
  const { cases } = useData();

  const pending = cases.filter((c) => c.status === 'CREATED');
  const scheduled = cases.filter((c) => c.status === 'SCHEDULED');
  const scanned = cases.filter((c) => c.status === 'SCANNED');
  const finalized = cases.filter((c) => c.status === 'FINALIZED');
  const recentCases = [...cases].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8);

  // Cases that are CREATED (no scheduling) or SCHEDULED but with no radiographer assigned
  const unassigned = cases.filter((c) => (c.status === 'CREATED') || (c.status === 'SCHEDULED' && !c.radiographerId));

  // Overdue: CREATED cases older than 24h without scheduling
  const now = new Date();
  const overdue = pending.filter((c) => {
    const diff = now.getTime() - new Date(c.createdAt).getTime();
    return diff > 24 * 60 * 60 * 1000;
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="page-title">Medical Officer Dashboard</h1>

        </div>
        <p className="page-subtitle">Medical Officer Command Center &middot; Monitor imaging referrals, track case progress, and review pending sign-offs.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard title="Pending Scheduling" value={pending.length} icon={<Clock className="w-5 h-5" />} color="amber" />
        <StatsCard title="Scheduled" value={scheduled.length} icon={<Calendar className="w-5 h-5" />} color="navy" />
        <StatsCard title="Imaging Done" value={scanned.length} icon={<FolderOpen className="w-5 h-5" />} color="purple" />
        <StatsCard title="Report Finalized" value={finalized.length} icon={<CheckCircle className="w-5 h-5" />} color="emerald" />
        <StatsCard title="Total Cases" value={cases.length} icon={<FileText className="w-5 h-5" />} color="navy" />
      </div>

      {/* Recent Cases */}
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
                <th className="table-header">Clinic</th>
                <th className="table-header">Modality</th>
                <th className="table-header">Severity</th>
                <th className="table-header">Status</th>
                <th className="table-header">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200">
              {recentCases.map((c) => (
                <tr key={c.id} className="hover:bg-surface-100 transition-colors">
                  <td className="table-cell"><Link to={`/case/${c.id}`} className="font-mono text-navy-600 font-medium text-xs hover:underline">{c.caseNumber}</Link></td>
                  <td className="table-cell font-medium text-surface-800">{c.patientName}</td>
                  <td className="table-cell text-xs text-surface-500">{c.clinicName || 'Pending'}</td>
                  <td className="table-cell text-surface-600 text-xs">{c.scanType}</td>
                  <td className="table-cell"><SeverityBadge severity={c.severity} /></td>
                  <td className="table-cell"><StatusBadge status={c.status} /></td>
                  <td className="table-cell text-surface-500 text-xs">{new Date(c.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {cases.length === 0 && <div className="text-center py-10 text-surface-400 text-sm">No cases yet.</div>}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/patients/register" className="card-hover group">
          <h3 className="text-sm font-semibold text-navy-700 group-hover:text-navy-800">Register Patient</h3>
          <p className="text-xs text-surface-500 mt-1">Add a patient to the radiology patient registry</p>
        </Link>
        <Link to="/cases/new" className="card-hover group">
          <h3 className="text-sm font-semibold text-navy-700 group-hover:text-navy-800">Register New Case</h3>
          <p className="text-xs text-surface-500 mt-1">Record the patient's indication or symptom and imaging study</p>
        </Link>
        <Link to="/track-status" className="card-hover group">
          <h3 className="text-sm font-semibold text-navy-700 group-hover:text-navy-800">Track Status</h3>
          <p className="text-xs text-surface-500 mt-1">Monitor case pipeline — flag delays and bottlenecks</p>
        </Link>
      </div>
    </div>
  );
}
