import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import StatsCard from '../../components/ui/StatsCard';
import StatusBadge from '../../components/ui/StatusBadge';
import SeverityBadge from '../../components/ui/SeverityBadge';
import { FolderOpen, Clock, CheckCircle, FileText, Calendar, AlertTriangle, Building2, MapPin, Navigation, Share2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { openWazeNavigation, openGoogleMapsNavigation, shareNavigationToWhatsApp } from '../../utils/navigationUtils';

export default function DepartmentDashboard() {
  const { currentUser } = useAuth();
  const { cases, clinics } = useData();

  const pending = cases.filter((c) => c.status === 'CREATED');
  const scheduled = cases.filter((c) => c.status === 'SCHEDULED');
  const scanned = cases.filter((c) => c.status === 'SCANNED');
  const finalized = cases.filter((c) => c.status === 'FINALIZED');
  const recentCases = [...cases].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8);

  const assignedClinic = clinics.find((c) => c.id === currentUser?.deploymentLocationId);

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
          <h1 className="text-2xl font-bold text-navy-800">Medical Officer Dashboard</h1>
        </div>
        <p className="page-subtitle">Patient triage, imaging requisition & diagnostic review</p>
      </div>

      {/* Assigned Deployment Location Card */}
      {assignedClinic && (
        <div className="card p-4 border-l-4 border-l-[#0F4C42] bg-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-[#0F4C42] uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Assigned Healthcare Facility
                </span>
                {currentUser?.shift && (
                  <span className="text-[11px] font-medium text-surface-600 flex items-center gap-1 bg-surface-100 px-2 py-0.5 rounded">
                    <Clock className="w-3 h-3 text-surface-500" />
                    {currentUser.shift} Shift
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-navy-700 shrink-0" />
                <h2 className="text-base font-bold text-navy-900 truncate">
                  {assignedClinic.name}
                </h2>
              </div>

              <p className="text-xs text-surface-600 flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-surface-400 shrink-0 mt-0.5" />
                <span>{assignedClinic.address}</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 md:pt-0">
              <button
                type="button"
                onClick={() => openWazeNavigation(assignedClinic.latitude, assignedClinic.longitude, assignedClinic.address)}
                className="btn-primary text-xs flex items-center gap-1.5 bg-[#0F4C42] hover:bg-[#0c3c34] shadow-sm"
                title="Launch turn-by-turn navigation in Waze"
              >
                <Navigation className="w-3.5 h-3.5" />
                Navigate with Waze
              </button>

              <button
                type="button"
                onClick={() => openGoogleMapsNavigation(assignedClinic.latitude, assignedClinic.longitude, assignedClinic.address)}
                className="btn-secondary text-xs flex items-center gap-1.5"
                title="Open location in Google Maps"
              >
                <MapPin className="w-3.5 h-3.5" />
                Google Maps
              </button>

              <button
                type="button"
                onClick={() => shareNavigationToWhatsApp(assignedClinic.name, assignedClinic.latitude, assignedClinic.longitude, assignedClinic.address)}
                className="btn-secondary text-xs flex items-center gap-1.5 text-teal-800 border-teal-300 hover:bg-teal-50"
                title="Share dispatch location and GPS links to Driver or Team via WhatsApp"
              >
                <Share2 className="w-3.5 h-3.5" />
                Share Location
              </button>
            </div>
          </div>
        </div>
      )}

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
        <Link to="/onboarding" className="card-hover group">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-navy-700 group-hover:text-navy-800">Clinical Credentials</h3>
            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">VERIFIED</span>
          </div>
          <p className="text-xs text-surface-500 mt-1">MMC registration &amp; clinical requisition authorization</p>
        </Link>
      </div>
    </div>
  );
}
