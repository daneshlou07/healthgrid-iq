import React from 'react';
import { useParams } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { validateReportToken } from '../../utils/reportToken';
import { Building2, Calendar, FileText, Phone, ShieldCheck, User } from 'lucide-react';

/** Masks IC number — shows only last 4 digits: ******-**-1234 */
function maskIc(ic?: string): string {
  if (!ic || ic.length < 4) return '••••••••••••';
  return '••••••-••-' + ic.slice(-4);
}

export default function PatientReportView() {
  const { caseId, token } = useParams<{ caseId: string; token: string }>();
  const { cases, reports, patients } = useData();

  const caseItem = cases.find((c) => c.id === caseId);
  const report = reports.find((r) => r.caseId === caseId);
  const patient = caseItem ? patients.find((p) => p.id === caseItem.patientId) : undefined;

  // Validate token
  const isValidToken = caseId && token && validateReportToken(caseId, token);

  if (!isValidToken) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-white border border-red-200 rounded-2xl p-8 text-center space-y-4 shadow-lg">
          <ShieldCheck className="w-12 h-12 text-red-400 mx-auto" />
          <h1 className="text-lg font-bold text-slate-900">Invalid or Expired Link</h1>
          <p className="text-sm text-slate-500">
            This report link is invalid or has expired. Please request a new link from your healthcare provider.
          </p>
          <p className="text-xs text-slate-400 font-mono">ERR_INVALID_TOKEN</p>
        </div>
      </div>
    );
  }

  if (!caseItem || !report) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-4 shadow-lg">
          <FileText className="w-12 h-12 text-slate-300 mx-auto" />
          <h1 className="text-lg font-bold text-slate-900">Report Not Found</h1>
          <p className="text-sm text-slate-500">
            The report you are looking for is not available. Please contact your healthcare centre.
          </p>
        </div>
      </div>
    );
  }

  const signedDate = report.signedAt
    ? new Date(report.signedAt).toLocaleDateString('en-MY', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '—';

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-bold text-slate-900">HealthGrid IQ</span>
          </div>
          <span className="text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-semibold">
            VERIFIED REPORT
          </span>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Patient Identity Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <User className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Patient</span>
          </div>
          <p className="text-lg font-bold text-slate-900">{caseItem.patientName}</p>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-slate-400 mb-0.5">IC Number</p>
              <p className="font-semibold text-slate-700 font-mono">{maskIc(patient?.nric)}</p>
            </div>
            <div>
              <p className="text-slate-400 mb-0.5">Case Ref</p>
              <p className="font-semibold text-slate-700 font-mono">{caseItem.caseNumber}</p>
            </div>
          </div>
        </div>

        {/* Scan Details */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Examination Details</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-slate-400 mb-0.5">Scan Type</p>
              <p className="font-semibold text-slate-800">{caseItem.scanType}</p>
            </div>
            <div>
              <p className="text-slate-400 mb-0.5">Modality</p>
              <p className="font-semibold text-slate-800">{caseItem.modality || caseItem.scanType}</p>
            </div>
            <div>
              <p className="text-slate-400 mb-0.5">Healthcare Centre</p>
              <p className="font-semibold text-slate-800">{caseItem.clinicName || '—'}</p>
            </div>
            <div>
              <p className="text-slate-400 mb-0.5">Report Date</p>
              <p className="font-semibold text-slate-800 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                {signedDate}
              </p>
            </div>
          </div>
        </div>

        {/* Clinical Impression */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Clinical Impression</span>
            <span className="ml-auto text-[10px] font-semibold bg-blue-600 text-white px-2 py-0.5 rounded-full">SIGNED</span>
          </div>
          <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line">
            {report.impression}
          </p>
          {report.isCriticalFinding && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 font-semibold">
              Critical Finding: {report.criticalFindingNote || 'Please contact your doctor immediately.'}
            </div>
          )}
          <p className="text-[11px] text-slate-400 pt-2 border-t border-blue-100 mt-2">
            Signed by Dr. {report.radiologistName} &middot; {report.signedByRole || 'Radiologist'}
          </p>
        </div>

        {/* Suggestions if present */}
        {report.suggestions && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Follow-up Recommendations</p>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{report.suggestions}</p>
          </div>
        )}

        {/* Contact Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Questions? Contact Your Clinic</span>
          </div>
          <p className="text-sm font-semibold text-slate-800">{caseItem.clinicName || 'HealthGrid IQ Radiology Centre'}</p>
          <a
            href="tel:+60312345678"
            className="mt-2 flex items-center gap-2 text-sm text-blue-600 font-semibold hover:underline"
          >
            <Phone className="w-4 h-4" />
            +603-1234 5678
          </a>
        </div>

        {/* Disclaimer */}
        <div className="text-center text-[10px] text-slate-400 leading-relaxed px-2 pb-6">
          This digital report is for personal reference only. It is not a substitute for a clinical consultation.
          Please discuss your results with your attending physician.
          <br />
          HealthGrid IQ &middot; Report ID: {report.id?.slice(0, 8) || 'N/A'}
        </div>
      </div>
    </div>
  );
}
