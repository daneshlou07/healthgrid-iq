import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import StatsCard from '../../components/ui/StatsCard';
import { Eye, PenTool, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function RadiologistDashboard() {
  const { currentUser } = useAuth();
  const { cases, reports } = useData();

  const scannedCases = cases.filter((c) => c.status === 'SCANNED');
  const myReports = reports.filter((r) => r.radiologistId === currentUser?.id);
  const signedReports = myReports.filter((r) => r.status === 'Verified / Signed Off');

  // SLA: reports signed within 48h of scan = compliant
  const slaCompliant = signedReports.filter((r) => {
    const matchingCase = cases.find((c) => c.id === r.caseId);
    if (!matchingCase?.scannedAt || !r.signedAt) return true;
    const diff = new Date(r.signedAt).getTime() - new Date(matchingCase.scannedAt).getTime();
    return diff <= 48 * 60 * 60 * 1000;
  });
  const slaPercent = signedReports.length > 0 ? Math.round((slaCompliant.length / signedReports.length) * 100) : 100;

  // Overdue: scanned cases older than 48h without a report
  const now = new Date();
  const overdue = scannedCases.filter((c) => {
    if (!c.scannedAt) return false;
    const diff = now.getTime() - new Date(c.scannedAt).getTime();
    return diff > 48 * 60 * 60 * 1000;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Radiologist Dashboard</h1>
        <p className="page-subtitle">Report inbox and SLA overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Pending Reports" value={scannedCases.length} icon={<Eye className="w-5 h-5" />} color="navy" />
        <StatsCard title="Completed Reports" value={signedReports.length} icon={<CheckCircle className="w-5 h-5" />} color="emerald" />
        <StatsCard title="SLA Compliance" value={`${slaPercent}%`} icon={<TrendingUp className="w-5 h-5" />} color="purple" />
        <StatsCard title="Overdue" value={overdue.length} icon={<AlertTriangle className="w-5 h-5" />} color="amber" />
      </div>

      {/* Report Inbox Preview */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">Report Inbox</h2>
          <Link to="/review-queue" className="text-sm text-navy-600 hover:text-navy-700 font-medium">View all &rarr;</Link>
        </div>
        {scannedCases.length === 0 ? (
          <div className="text-center py-10">
            <Eye className="w-8 h-8 text-surface-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-surface-600">Inbox is clear</p>
            <p className="text-xs text-surface-400">No pending reports. Great work!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {scannedCases.slice(0, 5).map((c) => (
              <div key={c.id} className="flex items-center justify-between p-3 bg-surface-100 rounded-lg border border-surface-200">
                <div>
                  <p className="text-sm font-medium text-navy-700">{c.caseNumber} — {c.patientName}</p>
                  <p className="text-xs text-surface-500">{c.scanType} &middot; {c.clinicName}</p>
                </div>
                <Link to="/reporting" className="btn-primary text-xs py-1.5 px-3">Review</Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
