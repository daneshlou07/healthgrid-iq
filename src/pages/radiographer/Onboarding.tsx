import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { CheckCircle, ShieldCheck, Award, FileCheck2, Radio, Truck } from 'lucide-react';

export default function RadiographerOnboarding() {
  const { currentUser } = useAuth();

  const checklist = [
    { label: 'HealthGrid IQ Radiographer Operator account verified', done: true },
    { label: 'Atomic Energy Licensing Board (AELB / MOH) License active', done: true },
    { label: 'Mobile PACS Imaging Van & Equipment Safety Authorization', done: true },
    { label: 'DICOM Image Acquisition & Quality Control (QC) clearance', done: true },
    { label: 'Radiation Safety & Dosimetry monitoring compliance active', done: true },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="page-title">Diagnostic Radiographer Licensing & Onboarding</h1>
        <p className="page-subtitle">Radiation protection license, PACS mobile fleet clearances, and operator badge for {currentUser?.name}.</p>
      </div>

      {/* Main Profile Header */}
      <div className="card flex flex-wrap items-center justify-between gap-4 border border-emerald-200 bg-gradient-to-r from-emerald-50/60 via-teal-50/30 to-white shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-emerald-700 text-white rounded-2xl flex items-center justify-center shadow-md font-bold text-xl">
            {currentUser?.name?.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">{currentUser?.name}</h2>
              <span className="badge-emerald font-mono text-xs">AELB Operator &middot; U29/U32</span>
            </div>
            <p className="text-xs text-slate-500 font-medium">Diagnostic Radiographer &middot; Mobile PACS Imaging &amp; Field Operations</p>
            <p className="text-[11px] text-emerald-800 font-mono mt-0.5">Radiation License: RAD-MAL-2026-94821</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge-success text-xs font-bold px-3 py-1.5 flex items-center gap-1 shadow-sm">
            <CheckCircle className="w-3.5 h-3.5" /> Radiation Operator License Active
          </span>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="card space-y-3 border border-slate-200">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Radio className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Radiographer Operator Profile</h3>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-surface-100">
              <span className="text-slate-500">Operator Name:</span>
              <span className="text-slate-900 font-semibold">{currentUser?.name}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-surface-100">
              <span className="text-slate-500">Official Email:</span>
              <span className="text-slate-800 font-mono">{currentUser?.email}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-surface-100">
              <span className="text-slate-500">Primary Role:</span>
              <span className="text-emerald-700 font-bold uppercase">Diagnostic Radiographer</span>
            </div>
            <div className="flex justify-between py-1 border-b border-surface-100">
              <span className="text-slate-500">Mobile Van Deployment:</span>
              <span className="text-slate-800 font-medium flex items-center gap-1">
                <Truck className="w-3 h-3 text-emerald-600" /> Mobile PACS Unit 01 (Selangor Region)
              </span>
            </div>
          </div>
        </div>

        <div className="card space-y-3 border border-slate-200">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Licensing &amp; Safety Compliance</h3>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-surface-100">
              <span className="text-slate-500">AELB License ID:</span>
              <span className="text-slate-900 font-mono font-bold">AELB-2026-U29-94821</span>
            </div>
            <div className="flex justify-between py-1 border-b border-surface-100">
              <span className="text-slate-500">Radiation License Status:</span>
              <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Active &amp; Verified (MOH Malaysia)
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-surface-100">
              <span className="text-slate-500">Modality Clearances:</span>
              <span className="text-slate-800 font-semibold">General X-Ray, CT, Ultrasound, Mammography</span>
            </div>
            <div className="flex justify-between py-1 border-b border-surface-100">
              <span className="text-slate-500">Dosimetry Monitor Badge:</span>
              <span className="text-emerald-600 font-semibold font-mono">TLD-BADGE-2026-OK</span>
            </div>
          </div>
        </div>
      </div>

      {/* Onboarding Checklist */}
      <div className="card space-y-4 border border-slate-200">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <FileCheck2 className="w-4 h-4 text-emerald-600" />
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Operator Licensing &amp; Safety Checklist</h3>
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

      {/* Digital Operator Badge Preview */}
      <div className="card border border-emerald-200 bg-emerald-50/30 p-4 rounded-xl flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-emerald-600" /> Digital Radiographer Operator Badge
          </p>
          <p className="text-[11px] text-slate-600">
            Embedded into DICOM image metadata tags and scan acquisition audit logs.
          </p>
        </div>
        <div className="px-4 py-2 bg-white border border-emerald-300 rounded-lg shadow-sm text-center font-serif text-xs text-emerald-950 font-bold border-dashed">
          <div>{currentUser?.name?.toUpperCase()}</div>
          <div className="text-[9px] font-sans font-mono text-emerald-700">Diagnostic Radiographer (AELB 94821)</div>
        </div>
      </div>
    </div>
  );
}
