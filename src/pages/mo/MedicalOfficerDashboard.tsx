import React from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/ui/StatusBadge';
import SeverityBadge from '../../components/ui/SeverityBadge';
import { Link } from 'react-router-dom';
import { getCaseIndication } from '../../utils/caseDisplay';
import {
  FileText,
  Clock,
  CheckCircle,
  Eye,
  Plus,
  AlertTriangle,
  Users,
  Search,
  CheckSquare,
  Activity,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

export default function MedicalOfficerDashboard() {
  const { currentUser } = useAuth();
  const { cases, patientRequests } = useData();

  // Metrics tailored to Medical Officer
  const pendingReview = cases.filter((c) => c.status === 'SCANNED');
  const escalatedCases = cases.filter((c) => c.isEscalated);
  const finalizedByMO = cases.filter((c) => c.status === 'FINALIZED');
  const pendingRequestsCount = patientRequests.filter((r) => r.status === 'Pending').length;

  const recentCases = [...cases]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Medical Officer Clinical Dashboard</h1>
          <p className="page-subtitle">
            Welcome back, {currentUser?.name || 'Medical Officer'} &middot; Manage case intake, first-line diagnostic reviews, and specialist escalations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/cases/new" className="btn-primary text-xs px-3.5 py-2 flex items-center gap-1.5 shadow-md">
            <Plus className="w-4 h-4" /> Register New Case
          </Link>
          <Link to="/review-queue" className="btn-success text-xs px-3.5 py-2 flex items-center gap-1.5 shadow-md">
            <Eye className="w-4 h-4" /> Review Queue ({pendingReview.length})
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="metric-card border-l-4 border-l-purple-600 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cases Pending Review</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Eye className="w-4 h-4" /></div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{pendingReview.length}</p>
          <p className="text-[11px] text-purple-700 mt-1 font-semibold">Requires MO / Specialist sign-off</p>
        </div>

        <div className="metric-card border-l-4 border-l-amber-500 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Specialist Escalations</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><AlertTriangle className="w-4 h-4" /></div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{escalatedCases.length}</p>
          <p className="text-[11px] text-amber-700 mt-1 font-semibold">Escalated to Radiologist</p>
        </div>

        <div className="metric-card border-l-4 border-l-emerald-600 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Finalized Reports</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><CheckCircle className="w-4 h-4" /></div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{finalizedByMO.length}</p>
          <p className="text-[11px] text-emerald-700 mt-1 font-semibold">Signed &amp; archived</p>
        </div>

        <div className="metric-card border-l-4 border-l-blue-600 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Patient Record Requests</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><CheckSquare className="w-4 h-4" /></div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{pendingRequestsCount}</p>
          <p className="text-[11px] text-blue-700 mt-1 font-semibold">Pending intake review</p>
        </div>
      </div>

      {/* Quick Action Bar */}
      <div className="card bg-gradient-to-r from-purple-900 to-navy-900 text-white p-5 rounded-2xl shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold flex items-center gap-2 text-purple-200">
              <Activity className="w-4 h-4 text-purple-400" /> Medical Officer Workflow Quick Actions
            </h3>
            <p className="text-xs text-purple-300">
              Fast access for patient registration, referral intake, report sign-offs, and status tracking.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <Link to="/cases/new" className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 transition-all flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-purple-300" /> New Referral
            </Link>
            <Link to="/review-queue" className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 transition-all flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-emerald-300" /> Review Queue
            </Link>
            <Link to="/patients/register" className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 transition-all flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-300" /> Register Patient
            </Link>
            <Link to="/track-status" className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 transition-all flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-amber-300" /> Track Status
            </Link>
          </div>
        </div>
      </div>

      {/* Main Grid: Pending Reviews & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cases Requiring MO Review (2 cols) */}
        <div className="lg:col-span-2 card space-y-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Cases Pending Medical Officer Review</h2>
              <p className="text-xs text-slate-500">Scanned cases ready for first-line diagnostic review or specialist escalation</p>
            </div>
            <Link to="/review-queue" className="text-xs text-purple-700 font-bold hover:underline flex items-center gap-1">
              View All Queue <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {pendingReview.slice(0, 5).map((c) => (
              <div key={c.id} className="p-3 bg-slate-50 hover:bg-purple-50/40 rounded-xl border border-slate-200 transition-all flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Link to={`/case/${c.id}`} className="text-xs font-bold text-navy-700 font-mono hover:underline">{c.caseNumber}</Link>
                    <SeverityBadge severity={c.severity} />
                    {c.isEscalated && <span className="badge-danger text-[10px]">ESCALATED</span>}
                  </div>
                  <p className="text-xs font-semibold text-slate-800 mt-0.5">{c.patientName}</p>
                  <p className="text-[11px] text-slate-500">{c.scanType} &middot; {getCaseIndication(c)}</p>
                </div>
                <Link to={`/reporting`} state={{ caseId: c.id }} className="btn-secondary text-xs px-3 py-1.5 font-bold">
                  Write Report
                </Link>
              </div>
            ))}
            {pendingReview.length === 0 && (
              <div className="text-center py-10 text-slate-400 text-xs">No scanned cases pending review.</div>
            )}
          </div>
        </div>

        {/* Recent Referral Intake (1 col) */}
        <div className="card space-y-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h2 className="text-sm font-bold text-slate-900">Recent Intake</h2>
            <Link to="/cases" className="text-xs text-purple-700 font-bold hover:underline">
              All Cases
            </Link>
          </div>

          <div className="space-y-3">
            {recentCases.map((c) => (
              <div key={c.id} className="text-xs p-2.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <div className="flex justify-between items-center">
                  <Link to={`/case/${c.id}`} className="font-mono text-navy-700 font-bold hover:underline">{c.caseNumber}</Link>
                  <StatusBadge status={c.status} />
                </div>
                <p className="font-semibold text-slate-800">{c.patientName}</p>
                <p className="text-[11px] text-slate-500">{c.scanType} &middot; {new Date(c.createdAt).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
