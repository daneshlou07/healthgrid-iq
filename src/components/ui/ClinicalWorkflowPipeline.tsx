import React from 'react';
import { Link } from 'react-router-dom';
import type { Case, CaseStatus } from '../../types';
import {
  User,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Building2,
  FileText,
  FileCheck2,
  Send,
  Zap,
  Activity,
  ChevronRight,
  Sparkles,
  GitBranch,
} from 'lucide-react';
import StatusBadge from './StatusBadge';

interface Props {
  caseItem: Case;
  interactive?: boolean;
}

interface StepDef {
  number: string;
  title: string;
  role: string;
  description: string;
  isCompleted: boolean;
  isActive: boolean;
  isException?: boolean;
  branch?: 'normal' | 'public' | 'private' | 'common';
}

export default function ClinicalWorkflowPipeline({ caseItem }: Props) {
  const status = caseItem.status;
  const isExceptionFlow = Boolean(
    caseItem.machineIssue ||
    caseItem.externalReferral ||
    [
      'MACHINE_UNAVAILABLE',
      'EXTERNAL_REFERRAL_PENDING',
      'BEMZ_REVIEW',
      'FACILITY_SELECTED',
      'EXTERNAL_RADIOGRAPHER_ASSIGNED',
      'PRIVATE_HOSPITAL_ADMIN_REVIEW',
      'EXTERNAL_SCANNING',
      'EXTERNAL_IMAGES_AVAILABLE',
    ].includes(status)
  );

  const isPrivatePath = caseItem.externalFacilityType === 'Private Hospital' || status === 'PRIVATE_HOSPITAL_ADMIN_REVIEW';

  // Compute status indices
  const getStepState = (stepNumber: string): { isCompleted: boolean; isActive: boolean } => {
    switch (stepNumber) {
      case '1': // MO Case Created
        return { isCompleted: true, isActive: status === 'CASE_CREATED' || status === 'CREATED' };
      case '2': // Scheduling
        return {
          isCompleted: !['CASE_CREATED', 'CREATED'].includes(status),
          isActive: status === 'SCHEDULING',
        };
      case '3': // Radiographer Assigned
        return {
          isCompleted: !['CASE_CREATED', 'CREATED', 'SCHEDULING'].includes(status),
          isActive: status === 'RADIOGRAPHER_ASSIGNED' || status === 'READY_FOR_SCAN' || status === 'SCHEDULED',
        };
      case '4': // Radiographer Inspection
        return {
          isCompleted: ![
            'CASE_CREATED',
            'CREATED',
            'SCHEDULING',
            'RADIOGRAPHER_ASSIGNED',
            'READY_FOR_SCAN',
            'SCHEDULED',
          ].includes(status),
          isActive: status === 'SCANNING',
        };
      // Normal Branch
      case '5': // Scan Completed & Images Available
        return {
          isCompleted: [
            'IMAGES_AVAILABLE',
            'SCANNED',
            'RADIOLOGIST_REVIEW',
            'MO_REVIEW',
            'REPORTED',
            'REPORT_SUBMITTED',
            'COMPLETED',
            'FINALIZED',
          ].includes(status),
          isActive: status === 'IMAGES_AVAILABLE' || status === 'SCANNED',
        };
      // Exception Branch - BEMS
      case '6A': // Machine Unavailable
        return {
          isCompleted: isExceptionFlow && status !== 'MACHINE_UNAVAILABLE',
          isActive: status === 'MACHINE_UNAVAILABLE',
        };
      case '7': // BEMS Request Created
        return {
          isCompleted: isExceptionFlow && !['MACHINE_UNAVAILABLE', 'EXTERNAL_REFERRAL_PENDING'].includes(status),
          isActive: status === 'EXTERNAL_REFERRAL_PENDING',
        };
      case '8': // BEMS Review & Facility Selected
        return {
          isCompleted: isExceptionFlow && ![
            'MACHINE_UNAVAILABLE',
            'EXTERNAL_REFERRAL_PENDING',
            'BEMZ_REVIEW',
          ].includes(status),
          isActive: status === 'BEMZ_REVIEW' || status === 'FACILITY_SELECTED',
        };
      case '9A': // Public Hospital Radiographer
        return {
          isCompleted: isExceptionFlow && !isPrivatePath && ![
            'MACHINE_UNAVAILABLE',
            'EXTERNAL_REFERRAL_PENDING',
            'BEMZ_REVIEW',
            'FACILITY_SELECTED',
            'EXTERNAL_RADIOGRAPHER_ASSIGNED',
          ].includes(status),
          isActive: isExceptionFlow && !isPrivatePath && status === 'EXTERNAL_RADIOGRAPHER_ASSIGNED',
        };
      case '9B': // Private Hospital Admin Review
        return {
          isCompleted: isExceptionFlow && isPrivatePath && ![
            'MACHINE_UNAVAILABLE',
            'EXTERNAL_REFERRAL_PENDING',
            'BEMZ_REVIEW',
            'FACILITY_SELECTED',
            'PRIVATE_HOSPITAL_ADMIN_REVIEW',
          ].includes(status),
          isActive: isExceptionFlow && isPrivatePath && status === 'PRIVATE_HOSPITAL_ADMIN_REVIEW',
        };
      case '10B': // Private Hospital Radiographer Assigned
        return {
          isCompleted: isExceptionFlow && isPrivatePath && ![
            'MACHINE_UNAVAILABLE',
            'EXTERNAL_REFERRAL_PENDING',
            'BEMZ_REVIEW',
            'FACILITY_SELECTED',
            'PRIVATE_HOSPITAL_ADMIN_REVIEW',
            'EXTERNAL_RADIOGRAPHER_ASSIGNED',
          ].includes(status),
          isActive: isExceptionFlow && isPrivatePath && status === 'EXTERNAL_RADIOGRAPHER_ASSIGNED',
        };
      case '12': // Images Available back to HealthGrid IQ
        return {
          isCompleted: [
            'IMAGES_AVAILABLE',
            'SCANNED',
            'EXTERNAL_IMAGES_AVAILABLE',
            'RADIOLOGIST_REVIEW',
            'MO_REVIEW',
            'REPORTED',
            'REPORT_SUBMITTED',
            'COMPLETED',
            'FINALIZED',
          ].includes(status),
          isActive: status === 'IMAGES_AVAILABLE' || status === 'EXTERNAL_IMAGES_AVAILABLE',
        };
      case '13A': // Radiologist Review
        return {
          isCompleted: ['MO_REVIEW', 'REPORT_SUBMITTED', 'COMPLETED', 'FINALIZED'].includes(status),
          isActive: status === 'RADIOLOGIST_REVIEW' || (status === 'REPORTED' && caseItem.routedToRole === 'Radiologist'),
        };
      case '14': // Initial MO Final Review & Approval
        return {
          isCompleted: ['REPORT_SUBMITTED', 'COMPLETED', 'FINALIZED'].includes(status),
          isActive: status === 'MO_REVIEW' || (status === 'REPORTED' && caseItem.routedToRole !== 'Radiologist'),
        };
      case '15': // Report Submitted & Finalized
        return {
          isCompleted: ['COMPLETED', 'FINALIZED'].includes(status),
          isActive: status === 'REPORT_SUBMITTED',
        };
      case '16': // Patient Delivery
        return {
          isCompleted: ['COMPLETED', 'FINALIZED'].includes(status),
          isActive: ['COMPLETED', 'FINALIZED'].includes(status),
        };
      default:
        return { isCompleted: false, isActive: false };
    }
  };

  const initialMoName = caseItem.initialMoName || caseItem.registeredByName || 'Dr. Medical Officer';

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-6">
      {/* ── HEADER & PRIMARY BUSINESS RULE BANNER ──────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 text-[11px] font-bold bg-[#0F4C42] text-white rounded">
              CLINICAL WORKFLOW ENGINE
            </span>
            <StatusBadge status={status} />
          </div>
          <h2 className="text-sm font-bold text-[#0F172A] tracking-tight">
            Case Lifecycle: <span className="font-mono text-[#0F4C42]">{caseItem.caseNumber}</span>
          </h2>
        </div>

        {/* Core Business Rule Indicator Card */}
        <div className="flex items-start gap-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg p-3 max-w-lg">
          <ShieldCheck className="w-5 h-5 text-[#0F4C42] shrink-0 mt-0.5" />
          <div className="text-xs space-y-0.5">
            <div className="font-bold text-[#0F172A] flex items-center gap-1.5">
              <span>Primary Case Owner:</span>
              <span className="text-[#0F4C42] bg-[#E6F4F1] px-1.5 py-0.2 rounded font-mono">
                {initialMoName}
              </span>
            </div>
            <p className="text-[#475569] leading-relaxed text-[11px]">
              The Initial Medical Officer remains the sole owner throughout the process. External hospitals provide imaging service only without creating duplicate clinical cases.
            </p>
          </div>
        </div>
      </div>

      {/* ── PATHWAY OVERVIEW (Normal vs BEMS Exception Flow) ─────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#334155] uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-[#0F4C42]" />
            Workflow Stepper (16 Stages)
          </span>
          <span className="text-[11px] font-semibold text-[#64748B]">
            Pathway: {isExceptionFlow ? (isPrivatePath ? 'BEMS Private Hospital Pathway' : 'BEMS Public Hospital Pathway') : 'Standard Internal Imaging'}
          </span>
        </div>

        {/* Stepper Flow Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Step 1: MO Case Creation */}
          <div className={`p-3 rounded-lg border text-xs space-y-1.5 transition-all ${
            getStepState('1').isActive
              ? 'bg-[#F0FDF4] border-[#86EFAC] ring-1 ring-[#86EFAC]'
              : getStepState('1').isCompleted
              ? 'bg-[#F8FAFC] border-[#CBD5E1]'
              : 'bg-white border-[#E2E8F0] opacity-60'
          }`}>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#0F4C42] text-white">
                STEP 1-2
              </span>
              {getStepState('1').isCompleted && (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              )}
            </div>
            <div className="font-bold text-[#0F172A]">MO Patient &amp; Case Reg</div>
            <p className="text-[11px] text-[#475569]">
              Owner: {initialMoName} ({caseItem.clinicName || 'Originating Facility'})
            </p>
          </div>

          {/* Step 2: AI Scheduler */}
          <div className={`p-3 rounded-lg border text-xs space-y-1.5 transition-all ${
            getStepState('2').isActive
              ? 'bg-[#F0FDF4] border-[#86EFAC] ring-1 ring-[#86EFAC]'
              : getStepState('2').isCompleted
              ? 'bg-[#F8FAFC] border-[#CBD5E1]'
              : 'bg-white border-[#E2E8F0] opacity-60'
          }`}>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-700 text-white">
                STEP 3-4
              </span>
              {getStepState('2').isCompleted && (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              )}
            </div>
            <div className="font-bold text-[#0F172A]">AI Scheduler &amp; Assignment</div>
            <p className="text-[11px] text-[#475569]">
              Assigned: {caseItem.radiographerName || 'Pending Scheduler'}
            </p>
          </div>

          {/* Step 3: Radiographer Equipment Check */}
          <div className={`p-3 rounded-lg border text-xs space-y-1.5 transition-all ${
            isExceptionFlow
              ? 'bg-[#FEF2F2] border-[#FCA5A5]'
              : getStepState('4').isActive
              ? 'bg-[#F0FDF4] border-[#86EFAC] ring-1 ring-[#86EFAC]'
              : getStepState('4').isCompleted
              ? 'bg-[#F8FAFC] border-[#CBD5E1]'
              : 'bg-white border-[#E2E8F0] opacity-60'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded text-white ${
                isExceptionFlow ? 'bg-red-600' : 'bg-slate-700'
              }`}>
                STEP 5-6
              </span>
              {isExceptionFlow ? (
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
              ) : getStepState('4').isCompleted ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              ) : null}
            </div>
            <div className="font-bold text-[#0F172A]">
              {isExceptionFlow ? 'Machine Unavailable' : 'Scan Execution'}
            </div>
            <p className="text-[11px] text-[#475569]">
              {isExceptionFlow
                ? `Reason: ${caseItem.machineIssue?.reason || 'Maintenance / Broken'}`
                : 'Internal equipment verified normal.'}
            </p>
          </div>

          {/* Step 4: External / Internal Imaging Upload */}
          <div className={`p-3 rounded-lg border text-xs space-y-1.5 transition-all ${
            getStepState('12').isActive
              ? 'bg-[#F0FDF4] border-[#86EFAC] ring-1 ring-[#86EFAC]'
              : getStepState('12').isCompleted
              ? 'bg-[#F8FAFC] border-[#CBD5E1]'
              : 'bg-white border-[#E2E8F0] opacity-60'
          }`}>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-700 text-white">
                STEP 12
              </span>
              {getStepState('12').isCompleted && (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              )}
            </div>
            <div className="font-bold text-[#0F172A]">Images Available</div>
            <p className="text-[11px] text-[#475569]">
              {caseItem.images?.length
                ? `${caseItem.images.length} scan(s) uploaded to HealthGrid IQ`
                : 'Awaiting image upload'}
            </p>
          </div>
        </div>

        {/* ── BEMS REFERRAL TRACKING SECTION (if exception flow triggered) ─── */}
        {isExceptionFlow && (
          <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#FDE68A] pb-2">
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-amber-700" />
                <span className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                  BEMS External Referral Pipeline
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                  Ref ID: {caseItem.externalReferralId || 'bems-auto'}
                </span>
                <Link
                  to="/bems"
                  className="text-[11px] font-bold text-amber-900 bg-amber-200 hover:bg-amber-300 px-2.5 py-0.5 rounded transition-colors flex items-center gap-1"
                >
                  <span>Open BEMS Portal</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {/* BEMS Review */}
              <div className="bg-white/80 border border-[#FDE68A] rounded p-2.5 space-y-1">
                <div className="font-bold text-slate-900 flex items-center justify-between">
                  <span>8. BEMS Review</span>
                  {getStepState('8').isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                </div>
                <p className="text-[11px] text-slate-600">
                  Unit: Biomedical Engineering Maintenance Services
                </p>
                <p className="text-[10px] text-slate-500 font-mono">
                  Fault: {caseItem.machineIssue?.reason || 'Hardware breakdown'}
                </p>
              </div>

              {/* Facility Route */}
              <div className="bg-white/80 border border-[#FDE68A] rounded p-2.5 space-y-1">
                <div className="font-bold text-slate-900 flex items-center justify-between">
                  <span>9. Assigned Facility</span>
                  {(getStepState('9A').isCompleted || getStepState('9B').isCompleted) && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  )}
                </div>
                <p className="text-[11px] text-slate-600 font-semibold">
                  {caseItem.externalFacilityName || 'Pending BEMS Facility Selection'}
                </p>
                <p className="text-[10px] text-slate-500">
                  Type: {caseItem.externalFacilityType || 'Public / Private'}
                </p>
              </div>

              {/* External Radiographer */}
              <div className="bg-white/80 border border-[#FDE68A] rounded p-2.5 space-y-1">
                <div className="font-bold text-slate-900 flex items-center justify-between">
                  <span>10/11. Scan Execution</span>
                  {getStepState('12').isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                </div>
                <p className="text-[11px] text-slate-600">
                  Radiographer: {caseItem.externalRadiographerName || 'Pending Assignment'}
                </p>
                <p className="text-[10px] text-slate-500">
                  Scans upload directly to original case.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── FINAL CLINICAL REVIEW & REPORT APPROVAL STAGE ────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Step 13A: Radiologist Review */}
          <div className={`p-3 rounded-lg border text-xs space-y-1.5 transition-all ${
            getStepState('13A').isActive
              ? 'bg-[#F0FDF4] border-[#86EFAC] ring-1 ring-[#86EFAC]'
              : getStepState('13A').isCompleted
              ? 'bg-[#F8FAFC] border-[#CBD5E1]'
              : 'bg-white border-[#E2E8F0] opacity-60'
          }`}>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-700 text-white">
                STEP 13A
              </span>
              {getStepState('13A').isCompleted && (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              )}
            </div>
            <div className="font-bold text-[#0F172A]">Radiologist Review</div>
            <p className="text-[11px] text-[#475569]">
              Diagnostic findings &amp; impression forwarded to Initial MO
            </p>
          </div>

          {/* Step 14: Initial MO Approval */}
          <div className={`p-3 rounded-lg border text-xs space-y-1.5 transition-all ${
            getStepState('14').isActive
              ? 'bg-[#F0FDF4] border-[#86EFAC] ring-1 ring-[#86EFAC]'
              : getStepState('14').isCompleted
              ? 'bg-[#F8FAFC] border-[#CBD5E1]'
              : 'bg-white border-[#E2E8F0] opacity-60'
          }`}>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#0F4C42] text-white">
                STEP 14
              </span>
              {getStepState('14').isCompleted && (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              )}
            </div>
            <div className="font-bold text-[#0F172A]">Initial MO Final Approval</div>
            <p className="text-[11px] text-[#475569]">
              Dr. {initialMoName} reviews findings &amp; approves final report
            </p>
          </div>

          {/* Step 15-16: Patient Delivery */}
          <div className={`p-3 rounded-lg border text-xs space-y-1.5 transition-all ${
            getStepState('16').isActive
              ? 'bg-[#F0FDF4] border-[#86EFAC] ring-1 ring-[#86EFAC]'
              : getStepState('16').isCompleted
              ? 'bg-[#F8FAFC] border-[#CBD5E1]'
              : 'bg-white border-[#E2E8F0] opacity-60'
          }`}>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-700 text-white">
                STEP 15-16
              </span>
              {getStepState('16').isCompleted && (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              )}
            </div>
            <div className="font-bold text-[#0F172A]">Report Delivered to Patient</div>
            <p className="text-[11px] text-[#475569]">
              Patient Portal QR · SMS / WhatsApp · Email · Print
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
