import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { CheckCircle, ShieldCheck, Award, FileCheck2, FileText, Sparkles } from 'lucide-react';

export default function RadiologistOnboarding() {
  const { currentUser } = useAuth();

  const checklist = [
    { label: 'HealthGrid IQ Specialist account verified', done: true },
    { label: 'National Specialist Register (NSR Radiology) license verified', done: true },
    { label: 'PACS Diagnostic Workstation & 3D Volume Rendering clearance', done: true },
    { label: 'AI Preliminary Impression Copilot verification privileges enabled', done: true },
    { label: 'Emergency Red Flag Critical Finding alert broadcast authorization', done: true },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="page-title">Specialist Radiologist Credentialing & Onboarding</h1>
        <p className="page-subtitle">National Specialist Register (NSR), PACS Diagnostic privileges, and digital signature status for Dr. {currentUser?.name}.</p>
      </div>

      {/* Main Profile Header */}
      <div className="card flex flex-wrap items-center justify-between gap-4 border border-navy-200 bg-gradient-to-r from-navy-50/60 via-purple-50/30 to-white shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-navy-800 text-white rounded-2xl flex items-center justify-center shadow-md font-bold text-xl">
            {currentUser?.name?.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">{currentUser?.name}</h2>
              <span className="badge-navy font-mono text-xs">NSR Specialist &middot; UD54</span>
            </div>
            <p className="text-xs text-slate-500 font-medium">Consultant Specialist Radiologist &middot; Clinical Diagnostic Imaging Division</p>
            <p className="text-[11px] text-navy-700 font-mono mt-0.5">NSR Reg No: 129481 / Malaysian Medical Council</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge-success text-xs font-bold px-3 py-1.5 flex items-center gap-1 shadow-sm">
            <CheckCircle className="w-3.5 h-3.5" /> Specialist Privileges Active
          </span>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="card space-y-3 border border-slate-200">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <FileText className="w-4 h-4 text-navy-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Specialist Practitioner Profile</h3>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-surface-100">
              <span className="text-slate-500">Consultant Radiologist:</span>
              <span className="text-slate-900 font-semibold">{currentUser?.name}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-surface-100">
              <span className="text-slate-500">Official Email:</span>
              <span className="text-slate-800 font-mono">{currentUser?.email}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-surface-100">
              <span className="text-slate-500">Primary Role:</span>
              <span className="text-navy-700 font-bold uppercase">Specialist Radiologist</span>
            </div>
            <div className="flex justify-between py-1 border-b border-surface-100">
              <span className="text-slate-500">Sub-Specialty Focus:</span>
              <span className="text-slate-800 font-medium">{currentUser?.specialty || 'Cross-Sectional & Emergency Neuro-Radiology'}</span>
            </div>
          </div>
        </div>

        <div className="card space-y-3 border border-slate-200">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Board Certification & Credentials</h3>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-surface-100">
              <span className="text-slate-500">NSR License Number:</span>
              <span className="text-slate-900 font-mono font-bold">NSR-2026-RAD-129481</span>
            </div>
            <div className="flex justify-between py-1 border-b border-surface-100">
              <span className="text-slate-500">Board Credential Status:</span>
              <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Verified (National Specialist Register)
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-surface-100">
              <span className="text-slate-500">Final Sign-Off Privilege:</span>
              <span className="text-emerald-600 font-semibold">Unrestricted (All Modalities &amp; Complex Cases)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-surface-100">
              <span className="text-slate-500">AI Copilot Access:</span>
              <span className="text-purple-700 font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Enabled (Gemini Vision AI Engine)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Onboarding Checklist */}
      <div className="card space-y-4 border border-slate-200">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <FileCheck2 className="w-4 h-4 text-navy-600" />
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Board Credentialing &amp; Compliance Checklist</h3>
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
      <div className="card border border-navy-200 bg-navy-50/30 p-4 rounded-xl flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-bold text-navy-900 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-navy-600" /> Digital Specialist Radiologist Signature Stamp
          </p>
          <p className="text-[11px] text-slate-600">
            Official consultant seal embedded into finalized diagnostic reports &amp; MOH Dossier PDFs.
          </p>
        </div>
        <div className="px-4 py-2 bg-white border border-navy-300 rounded-lg shadow-sm text-center font-serif text-xs text-navy-950 font-bold border-dashed">
          <div>DR. {currentUser?.name?.toUpperCase()}</div>
          <div className="text-[9px] font-sans font-mono text-navy-700">Consultant Radiologist (NSR 129481)</div>
        </div>
      </div>
    </div>
  );
}
