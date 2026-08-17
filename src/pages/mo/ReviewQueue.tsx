import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import StatusBadge from '../../components/ui/StatusBadge';
import SeverityBadge from '../../components/ui/SeverityBadge';
import { Link } from 'react-router-dom';
import { AlertTriangle, Eye, Sparkles, Building2, Clock, CheckCircle2, FileText, Send } from 'lucide-react';
import PrintMohReferralLetterModal from '../../components/ui/PrintMohReferralLetter';

type FilterTab = 'mo-queue' | 'teleradiology' | 'finalized';

export default function ReviewQueue() {
  const { currentUser } = useAuth();
  const { cases, clinics, patients, reports } = useData();
  const [activeTab, setActiveTab] = useState<FilterTab>('mo-queue');

  // 1. Cases awaiting Medical Officer review
  const moReviewCases = cases
    .filter((c) => c.status === 'SCANNED' && (c.routedToRole === 'Medical Officer' || !c.routedToRole) && !c.isEscalated)
    .sort((a, b) => (b.severity === 'Critical' ? 1 : 0) - (a.severity === 'Critical' ? 1 : 0));

  // 2. Cases Escalated to Hospital Specialist Radiologist (Teleradiology)
  const teleradiologyCases = cases
    .filter((c) => c.isEscalated || c.routedToRole === 'Radiologist' || c.secondOpinionRequested)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  // 3. Finalized cases today
  const finalizedCases = cases
    .filter((c) => c.status === 'FINALIZED')
    .sort((a, b) => (b.finalizedAt || b.createdAt).localeCompare(a.finalizedAt || a.createdAt))
    .slice(0, 15);

  const displayList = 
    activeTab === 'mo-queue' 
      ? moReviewCases 
      : activeTab === 'teleradiology' 
      ? teleradiologyCases 
      : finalizedCases;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="page-title">Diagnostic Review &amp; Teleradiology Queue</h1>
        </div>
        <p className="page-subtitle">
          Manage routine on-site case reviews and track live teleradiology escalations to Hospital Specialist Radiologists.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-surface-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('mo-queue')}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'mo-queue'
              ? 'bg-[#0F4C42] text-white shadow-sm'
              : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Awaiting MO Review</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
            activeTab === 'mo-queue' ? 'bg-emerald-900 text-emerald-100' : 'bg-surface-300 text-surface-800'
          }`}>
            {moReviewCases.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('teleradiology')}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'teleradiology'
              ? 'bg-purple-900 text-white shadow-sm'
              : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200'
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          <span>Teleradiology Escalations</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
            activeTab === 'teleradiology' ? 'bg-purple-950 text-purple-200' : 'bg-purple-200 text-purple-900'
          }`}>
            {teleradiologyCases.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('finalized')}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'finalized'
              ? 'bg-navy-900 text-white shadow-sm'
              : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Finalized Cases</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
            activeTab === 'finalized' ? 'bg-navy-950 text-navy-200' : 'bg-surface-300 text-surface-800'
          }`}>
            {finalizedCases.length}
          </span>
        </button>
      </div>

      {/* Case List Display */}
      <div className="space-y-3">
        {displayList.map((c) => {
          const patient = patients.find((p) => p.id === c.patientId);
          const clinic = clinics.find((cl) => cl.id === c.clinicId || cl.name === c.clinicName);
          const report = reports.find((r) => r.caseId === c.id);

          return (
            <div
              key={c.id}
              className={`card ${
                c.isEscalated
                  ? 'border-l-4 border-l-purple-600 bg-purple-50/20'
                  : c.status === 'FINALIZED'
                  ? 'border-l-4 border-l-emerald-600 bg-white'
                  : 'border-l-4 border-l-[#0F4C42] bg-white'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      to={`/case/${c.id}`}
                      className="text-sm font-bold text-navy-900 hover:underline font-mono"
                    >
                      {c.caseNumber}
                    </Link>
                    <SeverityBadge severity={c.severity} />

                    {c.isEscalated && (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-900 text-[10px] font-bold rounded-full border border-purple-200 flex items-center gap-1">
                        <Send className="w-3 h-3 text-purple-700" />
                        ESCALATED TO SPECIALIST RADIOLOGIST
                      </span>
                    )}

                    {c.routedToRole === 'Medical Officer' && !c.isEscalated && (
                      <span className="px-2 py-0.5 bg-emerald-50 text-[#0F4C42] text-[10px] font-bold rounded-full border border-emerald-200">
                        ROUTED TO ON-BOARD MO
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-surface-900 text-sm">
                    {c.patientName} <span className="font-normal text-xs text-surface-500">({patient?.nric || 'NRIC N/A'})</span>
                  </h3>

                  <p className="text-xs text-surface-600">
                    Modality: <span className="font-medium text-surface-800">{c.scanType}</span> &bull; Facility: <span className="font-medium text-surface-800">{c.clinicName}</span>
                  </p>

                  {c.isEscalated && c.escalationReason && (
                    <div className="text-xs text-purple-900 bg-purple-100/70 px-2.5 py-1 rounded border border-purple-200 mt-1">
                      <strong>Escalation Reason:</strong> {c.escalationReason} (Escalated by {c.escalatedBy || 'Doctor'})
                    </div>
                  )}

                  {c.status === 'FINALIZED' && c.radiologistName && (
                    <p className="text-xs text-emerald-800 font-medium">
                      Report Finalized by: {c.radiologistName}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <StatusBadge status={c.status} />

                  {c.status === 'SCANNED' && (
                    <Link
                      to={`/reporting?caseId=${c.id}`}
                      className="btn-primary text-xs px-3 py-1.5 bg-[#0F4C42] hover:bg-[#0c3c34] font-semibold"
                    >
                      Open MO Reporting &rarr;
                    </Link>
                  )}

                  {c.status === 'FINALIZED' && (
                    <Link
                      to={`/case/${c.id}`}
                      className="btn-secondary text-xs px-3 py-1.5 font-medium"
                    >
                      View Report Dossier
                    </Link>
                  )}

                  {/* 1-Click Surat Rujukan Button */}
                  <PrintMohReferralLetterModal
                    caseItem={c}
                    patient={patient}
                    report={report}
                    clinic={clinic}
                    buttonClassName="btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1 text-red-800 border-red-200 hover:bg-red-50 font-semibold"
                  />
                </div>
              </div>
            </div>
          );
        })}

        {displayList.length === 0 && (
          <div className="card text-center py-12 text-surface-400">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-600 mb-2 opacity-60" />
            <p className="text-sm font-bold text-navy-900">Queue is Clear</p>
            <p className="text-xs mt-1 text-surface-500">
              {activeTab === 'mo-queue'
                ? 'No pending scans awaiting Medical Officer review. Great work!'
                : activeTab === 'teleradiology'
                ? 'No cases currently pending remote specialist review.'
                : 'No finalized cases recorded yet for this session.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

