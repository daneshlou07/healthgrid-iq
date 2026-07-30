import React from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/ui/StatusBadge';
import SeverityBadge from '../../components/ui/SeverityBadge';
import { Eye, FileText, AlertTriangle, CheckCircle, Clock, Plus, Users, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getCaseIndication } from '../../utils/caseDisplay';

export default function MedicalOfficerDashboard() {
  const { currentUser } = useAuth();
  const { cases, reports, patientRequests } = useData();

  const toReviewCases = cases.filter((c) => c.status === 'SCANNED');
  const escalatedCases = cases.filter((c) => c.isEscalated);
  const finalizedCases = cases.filter((c) => c.status === 'FINALIZED');
  const pendingRequests = patientRequests.filter((r) => r.status === 'Pending');

  return (
    <div className="space-y-6">
      {/* Hero Welcome Banner */}
      <div className="card border border-purple-200 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-purple-500/30 text-purple-200 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full border border-purple-400/30">
                CLINICAL WORKSTATION
              </span>
              <span className="text-slate-300 text-xs font-medium">&middot; HealthGrid IQ MO Division</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Welcome back, Dr. {currentUser?.name}</h1>
            <p className="text-slate-300 text-xs mt-1 max-w-xl">
              Medical Officer Command Center — Manage clinical case referrals, review scanned PACS images, finalize routine reports, or escalate complex diagnostic cases to Specialist Radiologists.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/cases/new" className="px-4 py-2.5 bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 border border-purple-400/40">
              <Plus className="w-4 h-4" /> Register New Case
            </Link>
            <Link to="/review-queue" className="px-4 py-2.5 bg-white text-slate-900 font-bold text-xs rounded-xl hover:bg-slate-100 transition-all shadow-md flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-purple-700" /> Cases to Review ({toReviewCases.length})
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card border border-purple-100 bg-purple-50/40 space-y-1">
          <div className="flex items-center justify-between text-purple-900">
            <span className="text-xs font-bold uppercase tracking-wider">Cases to Review</span>
            <Eye className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-purple-950 font-mono">{toReviewCases.length}</p>
          <p className="text-[11px] text-purple-700 font-medium">Scans pending MO review &amp; sign-off</p>
        </div>

        <div className="card border border-amber-100 bg-amber-50/40 space-y-1">
          <div className="flex items-center justify-between text-amber-900">
            <span className="text-xs font-bold uppercase tracking-wider">Escalated to Specialist</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-950 font-mono">{escalatedCases.length}</p>
          <p className="text-[11px] text-amber-700 font-medium">Complex cases escalated to Radiologist</p>
        </div>

        <div className="card border border-emerald-100 bg-emerald-50/40 space-y-1">
          <div className="flex items-center justify-between text-emerald-900">
            <span className="text-xs font-bold uppercase tracking-wider">Signed Off / Finalized</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-950 font-mono">{finalizedCases.length}</p>
          <p className="text-[11px] text-emerald-700 font-medium">Completed diagnostic reports</p>
        </div>

        <div className="card border border-blue-100 bg-blue-50/40 space-y-1">
          <div className="flex items-center justify-between text-blue-900">
            <span className="text-xs font-bold uppercase tracking-wider">Pending Record Requests</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-950 font-mono">{pendingRequests.length}</p>
          <p className="text-[11px] text-blue-700 font-medium">Patient transfer &amp; record requests</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Cases Pending Review */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card space-y-4">
            <div className="flex items-center justify-between border-b border-surface-200 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-purple-600" /> Medical Officer Review Queue
                </h2>
                <p className="text-xs text-slate-500">Scanned images ready for MO diagnostic reporting or specialist escalation</p>
              </div>
              <Link to="/review-queue" className="text-xs font-bold text-purple-700 hover:underline">
                View All ({toReviewCases.length}) &rarr;
              </Link>
            </div>

            <div className="space-y-3">
              {toReviewCases.slice(0, 5).map((c) => (
                <div key={c.id} className="p-3 bg-surface-50 rounded-xl border border-surface-200 hover:border-purple-300 transition-all flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Link to={`/case/${c.id}`} className="text-xs font-bold font-mono text-navy-700 hover:underline">{c.caseNumber}</Link>
                      <span className="font-bold text-xs text-slate-900">{c.patientName}</span>
                      <SeverityBadge severity={c.severity} />
                      {c.isEscalated && (
                        <span className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded-full">
                          ESCALATED BY MO
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">{c.scanType} &middot; Indication: <span className="text-slate-700">{getCaseIndication(c)}</span></p>
                  </div>
                  <Link to="/review-queue" className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-lg shadow-sm shrink-0">
                    Write Report
                  </Link>
                </div>
              ))}
              {toReviewCases.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-xs">No cases currently pending review.</div>
              )}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Quick MO Actions */}
        <div className="space-y-4">
          <div className="card space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quick Clinical Actions</h3>
            <div className="space-y-2">
              <Link to="/cases/new" className="w-full p-3 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-xl text-xs font-bold transition-all flex items-center justify-between">
                <span className="flex items-center gap-2"><Plus className="w-4 h-4 text-purple-600" /> Register New Case</span>
                &rarr;
              </Link>
              <Link to="/patients/register" className="w-full p-3 bg-slate-50 hover:bg-slate-100 text-slate-900 border border-slate-200 rounded-xl text-xs font-bold transition-all flex items-center justify-between">
                <span className="flex items-center gap-2"><Users className="w-4 h-4 text-slate-600" /> Register New Patient</span>
                &rarr;
              </Link>
              <Link to="/cases" className="w-full p-3 bg-slate-50 hover:bg-slate-100 text-slate-900 border border-slate-200 rounded-xl text-xs font-bold transition-all flex items-center justify-between">
                <span className="flex items-center gap-2"><FileText className="w-4 h-4 text-slate-600" /> All Cases Queue</span>
                &rarr;
              </Link>
              <Link to="/track-status" className="w-full p-3 bg-slate-50 hover:bg-slate-100 text-slate-900 border border-slate-200 rounded-xl text-xs font-bold transition-all flex items-center justify-between">
                <span className="flex items-center gap-2"><Search className="w-4 h-4 text-slate-600" /> Track Case Status</span>
                &rarr;
              </Link>
            </div>
          </div>

          <div className="card space-y-3 bg-slate-900 text-white">
            <h3 className="text-xs font-bold text-purple-300 uppercase tracking-wider">Medical Officer Guideline</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Medical Officers can directly review and finalize normal or routine diagnostic cases. For complex, high-risk, or subtle pathologies, click <strong>"Escalate"</strong> to pin the case for Specialist Radiologist review.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
