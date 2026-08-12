import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  CheckCircle,
  ShieldCheck,
  Award,
  UserRound,
  Radio,
  FileCheck2,
} from 'lucide-react';

export default function RadiographerCredentials() {
  const { currentUser } = useAuth();

  const name = currentUser?.name || 'Ahmad Razak';
  const roleTitle = 'Diagnostic Radiographer';
  const department = 'Mobile PACS Fleet & Image Acquisition';
  const licenseNo = 'AELB-RPO-49201';

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Page Header */}
      <div>
        <h1 className="page-title">Radiographer Credentials</h1>
        <p className="page-subtitle">
          Verified operator licensing, radiation protection clearance, and equipment authorization for {name}.
        </p>
      </div>

      {/* Identity & Verification */}
      <div className="card border border-slate-200">
        <div className="flex items-center gap-4">

          <div className="w-16 h-16 bg-navy-800 text-white rounded-2xl flex items-center justify-center shadow-md font-bold text-xl">
            {name.charAt(0)}
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">
                {name}
              </h2>

              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                <CheckCircle className="w-3.5 h-3.5" />
                VERIFIED RADIOGRAPHER
              </span>
            </div>

            <p className="text-sm text-slate-600 mt-1">
              {roleTitle} · {department}
            </p>

            <p className="text-[11px] text-slate-500 font-mono mt-1">
              Radiation Protection License No: {licenseNo}
            </p>
          </div>

        </div>
      </div>

      {/* Professional Credentials */}
      <div className="card border border-slate-200">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Professional Credentials
          </h3>
        </div>

        <div className="divide-y divide-slate-100">

          {/* Radiation Protection Licensing */}
          <div className="flex items-center justify-between py-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center">
                <Radio className="w-4 h-4 text-slate-600" />
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Atomic Energy Licensing (AELB / MOH)
                </p>
                <p className="text-xs text-slate-500">
                  Radiation Protection Officer & Operator License Active
                </p>
              </div>
            </div>

            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
              <CheckCircle className="w-4 h-4" />
              Verified
            </span>
          </div>

          {/* Equipment Authorization */}
          <div className="flex items-center justify-between py-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center">
                <UserRound className="w-4 h-4 text-slate-600" />
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Mobile PACS Fleet & Van Clearance
                </p>
                <p className="text-xs text-slate-500">
                  Mobile X-Ray, Mammography & Ultrasonography Fleet Authorization
                </p>
              </div>
            </div>

            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
              <CheckCircle className="w-4 h-4" />
              Verified
            </span>
          </div>

          {/* DICOM Quality Control Clearance */}
          <div className="flex items-center justify-between py-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center">
                <FileCheck2 className="w-4 h-4 text-slate-600" />
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-800">
                  DICOM Quality Control (QC) Clearance
                </p>
                <p className="text-xs text-slate-500">
                  Image Acquisition, Artifact Control & PACS Transfer Authorization
                </p>
              </div>
            </div>

            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
              <CheckCircle className="w-4 h-4" />
              Verified
            </span>
          </div>

        </div>
      </div>

      {/* Digital Signature */}
      <div className="card border border-slate-200">
        <div className="flex items-center justify-between gap-6">

          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-white border border-navy-100 flex items-center justify-center">
              <Award className="w-4 h-4 text-navy-600" />
            </div>

            <div>
              <p className="text-sm font-bold text-navy-900">
                Digital Operator Badge
              </p>

              <p className="text-xs text-slate-600 mt-0.5">
                Active and available for DICOM image acquisition verification.
              </p>
            </div>
          </div>

          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full whitespace-nowrap">
            <CheckCircle className="w-3.5 h-3.5" />
            Active
          </span>

        </div>
      </div>

    </div>
  );
}
