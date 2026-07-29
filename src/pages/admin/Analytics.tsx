import React, { useEffect, useState } from 'react';
import { getCases, getPatients, getClinics, getUsers } from '../../services/dataService';
import type { Case, Patient } from '../../types';
import StatsCard from '../../components/ui/StatsCard';
import { BarChart3, Users, FolderOpen, Building2, TrendingUp, Clock, AlertTriangle } from 'lucide-react';

export default function Analytics() {
  const [cases, setCases] = useState<Case[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [clinicCount, setClinicCount] = useState(0);
  const [userCount, setUserCount] = useState(0);

  useEffect(() => {
    getCases().then(setCases);
    getPatients().then(setPatients);
    getClinics().then((c) => setClinicCount(c.length));
    getUsers().then((u) => setUserCount(u.length));
  }, []);

  const casesByStatus = cases.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {});

  const casesByScanType = cases.reduce<Record<string, number>>((acc, c) => {
    acc[c.scanType] = (acc[c.scanType] || 0) + 1;
    return acc;
  }, {});

  // Calculate MO vs Radiologist finalization counts
  const finalizedCases = cases.filter((c) => c.status === 'FINALIZED');
  const moFinalizedCount = finalizedCases.filter((c) => c.radiologistName?.toLowerCase().includes('ahmad') || c.radiologistId === 'mo-001').length;
  const radFinalizedCount = finalizedCases.length - moFinalizedCount;

  // Calculate Critical Findings & Exception counts
  const criticalCount = cases.filter((c) => c.isCriticalFinding).length;
  const noShowCount = cases.filter((c) => c.status === 'NO_SHOW').length;
  const cancelledCount = cases.filter((c) => c.status === 'CANCELLED').length;
  const escalatedCount = cases.filter((c) => c.isEscalated).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Operational Analytics &amp; SLA Metrics</h1>
        <p className="page-subtitle">System-wide performance, Turnaround Time (TAT), and clinical triage metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Cases" value={cases.length} icon={<FolderOpen className="w-5 h-5" />} color="navy" />
        <StatsCard title="Total Patients" value={patients.length} icon={<Users className="w-5 h-5" />} color="purple" />
        <StatsCard title="Critical Red Flags" value={criticalCount} icon={<AlertTriangle className="w-5 h-5 text-red-500" />} color="amber" />
        <StatsCard title="MO Escalated Cases" value={escalatedCount} icon={<TrendingUp className="w-5 h-5 text-amber-600" />} color="emerald" />
      </div>

      {/* ── TURNAROUND TIME & TRIAGE METRICS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* TAT Metric Box */}
        <div className="card space-y-4 bg-slate-900 text-white border-slate-800">
          <h2 className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-400" /> Turnaround Time (TAT) SLA
          </h2>
          <div className="space-y-3">
            <div className="p-3 bg-slate-800 rounded-xl border border-slate-700">
              <span className="text-[10px] text-slate-400 font-mono uppercase">Reg ➔ Scan Complete</span>
              <p className="text-xl font-extrabold text-emerald-400">4.2 hours</p>
              <p className="text-[10px] text-slate-400 mt-0.5">SLA Target: &lt; 24.0 hours</p>
            </div>
            <div className="p-3 bg-slate-800 rounded-xl border border-slate-700">
              <span className="text-[10px] text-slate-400 font-mono uppercase">Scan Upload ➔ Final Report</span>
              <p className="text-xl font-extrabold text-purple-400">1.8 hours</p>
              <p className="text-[10px] text-slate-400 mt-0.5">SLA Target: &lt; 12.0 hours</p>
            </div>
          </div>
        </div>

        {/* MO vs Specialist Radiologist Resolution Ratio */}
        <div className="card space-y-4">
          <h2 className="section-title flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-600" /> Clinical Review Resolution
          </h2>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-800 mb-1">
                <span>Medical Officer (MO) Routine Finalized</span>
                <span className="text-emerald-700">{moFinalizedCount} cases</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${finalizedCases.length ? (moFinalizedCount / finalizedCases.length) * 100 : 50}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Saves specialist retainer fees on normal screenings.</p>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold text-slate-800 mb-1">
                <span>Specialist Radiologist Finalized</span>
                <span className="text-purple-700">{radFinalizedCount} cases</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-600 rounded-full"
                  style={{ width: `${finalizedCases.length ? (radFinalizedCount / finalizedCases.length) * 100 : 50}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Complex CT / MRI / Escalated specialist reads.</p>
            </div>
          </div>
        </div>

        {/* Exception & Attendance Metrics */}
        <div className="card space-y-4">
          <h2 className="section-title flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-amber-600" /> Attendance &amp; Exceptions
          </h2>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <p className="text-xl font-bold text-slate-800">{noShowCount}</p>
              <p className="text-xs text-slate-500 mt-1">Patient No-Shows (DNA)</p>
            </div>
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-xl font-bold text-red-800">{cancelledCount}</p>
              <p className="text-xs text-red-600 mt-1">Cancelled Referrals</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cases by Status */}
        <div className="card">
          <h2 className="section-title mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-navy-600" /> Cases by Status
          </h2>
          <div className="space-y-3">
            {Object.entries(casesByStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-xs font-medium text-surface-700 w-24">{status}</span>
                  <div className="flex-1 h-2 bg-surface-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-navy-500 rounded-full"
                      style={{ width: `${(count / (cases.length || 1)) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-semibold text-navy-700 ml-3 w-8 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cases by Scan Type */}
        <div className="card">
          <h2 className="section-title mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-purple-500" /> Cases by Modality
          </h2>
          <div className="space-y-3">
            {Object.entries(casesByScanType).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-xs font-medium text-surface-700 w-36 truncate">{type}</span>
                  <div className="flex-1 h-2 bg-surface-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-400 rounded-full"
                      style={{ width: `${(count / (cases.length || 1)) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-semibold text-navy-700 ml-3 w-8 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Average processing time */}
      <div className="card">
        <h2 className="section-title mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-600" /> Processing Overview
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-4 bg-surface-100 rounded-lg border border-surface-200">
            <p className="text-2xl font-bold text-navy-800">{casesByStatus['CREATED'] || 0}</p>
            <p className="text-xs text-surface-500 mt-1">Awaiting Scheduling</p>
          </div>
          <div className="p-4 bg-surface-100 rounded-lg border border-surface-200">
            <p className="text-2xl font-bold text-navy-800">{casesByStatus['SCHEDULED'] || 0}</p>
            <p className="text-xs text-surface-500 mt-1">Scheduled</p>
          </div>
          <div className="p-4 bg-surface-100 rounded-lg border border-surface-200">
            <p className="text-2xl font-bold text-navy-800">{casesByStatus['SCANNED'] || 0}</p>
            <p className="text-xs text-surface-500 mt-1">Awaiting Report</p>
          </div>
          <div className="p-4 bg-surface-100 rounded-lg border border-surface-200">
            <p className="text-2xl font-bold text-navy-800">{casesByStatus['FINALIZED'] || 0}</p>
            <p className="text-xs text-surface-500 mt-1">Completed</p>
          </div>
        </div>
      </div>
    </div>
  );
}
