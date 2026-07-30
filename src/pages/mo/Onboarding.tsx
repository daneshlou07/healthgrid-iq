import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { CheckCircle, UserCheck, ShieldCheck, Stethoscope, Award, FileCheck2 } from 'lucide-react';

export default function MedicalOfficerOnboarding() {
  const { currentUser } = useAuth();

  const checklist = [
    { label: 'HealthGrid IQ account activated', done: true },
    { label: 'Medical Officer profile & MMC registration verified', done: true },
    { label: 'Clinical hospital ward assignment confirmed', done: true },
    { label: 'MOH PER.SS-RA301 requisition signing clearance', done: true },
    { label: 'First-line radiological triage & escalation authorization', done: true },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="page-title">Medical Officer Clinical Credentialing & Onboarding</h1>
        <p className="page-subtitle">MMC verification, clinical ward privileges, and digital stamp status for Dr. {currentUser?.name}.</p>
      </div>

      {/* Main Profile Header */}
      <div className="card flex flex-wrap items-center justify-between gap-4 border border-purple-200 bg-gradient-to-r from-purple-50/50 to-white">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-purple-700 text-white rounded-2xl flex items-center justify-center shadow-md font-bold text-xl">
            {currentUser?.name?.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">{currentUser?.name}</h2>
              <span className="badge-purple font-mono text-xs">MO UD48 / UD52</span>
            </div>
            <p className="text-xs text-slate-500 font-medium">Medical Officer &middot; HealthGrid Radiology & Intake Division</p>
            <p className="text-[11px] text-purple-700 font-mono mt-0.5">MMC Reg No: 84920 / MOH Malaysia</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge-success text-xs font-bold px-3 py-1.5 flex items-center gap-1 shadow-sm">
            <CheckCircle className="w-3.5 h-3.5" /> Clinical Privileges Active
          </span>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="card space-y-3 border border-slate-200">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <UserCheck className="w-4 h-4 text-purple-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Clinical Profile</h3>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-surface-100">
              <span className="text-slate-500">Full Practitioner Name:</span>
              <span className="text-slate-900 font-semibold">{currentUser?.name}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-surface-100">
              <span className="text-slate-500">Official Email:</span>
              <span className="text-slate-800 font-mono">{currentUser?.email}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-surface-100">
              <span className="text-slate-500">Primary Role:</span>
              <span className="text-purple-700 font-bold uppercase">Medical Officer (MO)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-surface-100">
              <span className="text-slate-500">Department Assignment:</span>
              <span className="text-slate-800 font-medium">Emergency &amp; Clinical Radiology Intake</span>
            </div>
          </div>
        </div>

        <div className="card space-y-3 border border-slate-200">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">MOH Credentials & Verification</h3>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-surface-100">
              <span className="text-slate-500">MMC Registration ID:</span>
              <span className="text-slate-900 font-mono font-bold">MMC-2026-MO-84920</span>
            </div>
            <div className="flex justify-between py-1 border-b border-surface-100">
              <span className="text-slate-500">Verification Status:</span>
              <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Verified (MOH Malaysia)
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-surface-100">
              <span className="text-slate-500">First-Line Finalization:</span>
              <span className="text-emerald-600 font-semibold">Authorized (Non-Complex Scans)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-surface-100">
              <span className="text-slate-500">Specialist Escalation:</span>
              <span className="text-amber-600 font-semibold">Authorized (Complex Scans)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Onboarding Checklist */}
      <div className="card space-y-4 border border-slate-200">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <FileCheck2 className="w-4 h-4 text-purple-600" />
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Credentialing &amp; Compliance Checklist</h3>
        </div>
        <div className="space-y-2">
          {checklist.map((item, index) => (
            <div key={index} className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium text-slate-800">{item.label}</span>
              <span className="ml-auto text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                COMPLETED
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Digital Stamp Preview */}
      <div className="card border border-purple-200 bg-purple-50/30 p-4 rounded-xl flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-purple-600" /> Digital Medical Officer Signature Stamp
          </p>
          <p className="text-[11px] text-slate-600">
            Automatically appended to finalized MOH PER.SS-RA301 forms &amp; diagnostic reports.
          </p>
        </div>
        <div className="px-4 py-2 bg-white border border-purple-300 rounded-lg shadow-sm text-center font-serif text-xs text-purple-950 font-bold border-dashed">
          <div>DR. {currentUser?.name?.toUpperCase()}</div>
          <div className="text-[9px] font-sans font-mono text-purple-700">Medical Officer (MMC 84920)</div>
        </div>
      </div>
    </div>
  );
}
