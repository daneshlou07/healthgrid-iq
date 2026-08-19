import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ux/Toast';
import { useLanguage } from '../../context/LanguageContext';
import type { Case, Report } from '../../types';
import StatusBadge from '../../components/ui/StatusBadge';
import SeverityBadge from '../../components/ui/SeverityBadge';
import PacsImageViewer from '../../components/ui/PacsImageViewer';
import Modal from '../../components/ui/Modal';
import { loadImages } from '../../services/imageStorage';
import { generateAiReportDraft } from '../../services/aiReportingCopilot';
import { analyzeImageWithVisionAi } from '../../services/visionAiAnalyzer';
import { generateReportToken } from '../../utils/reportToken';
import { getCaseRegistrar, getCaseIndication } from '../../utils/caseDisplay';
import {
  FileText,
  Eye,
  Printer,
  Sparkles,
  AlertTriangle,
  ShieldAlert,
  Send,
  Building2,
  Clock,
  CheckCircle2,
  Image as ImageIcon,
  Search,
  CheckCircle,
  FileCheck2,
  User,
  X,
} from 'lucide-react';

/** Inline image loader for report thumbnails in the Archive tab */
function ReportImages({ imageKeys }: { imageKeys?: string[] }) {
  const [urls, setUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!imageKeys || imageKeys.length === 0) {
      setUrls([]);
      return;
    }
    setLoading(true);
    loadImages(imageKeys).then((loaded) => {
      setUrls(loaded);
      setLoading(false);
    });
  }, [imageKeys?.join(',')]);

  if (!imageKeys || imageKeys.length === 0) return null;
  if (loading) return <p className="text-xs text-slate-400 py-2">Loading images…</p>;
  if (urls.length === 0) return null;

  return (
    <div>
      <p className="text-[11px] font-bold text-slate-500 uppercase mb-2">Scan Captures</p>
      <div className="grid grid-cols-2 gap-2">
        {urls.map((url, i) => (
          <a key={i} href={url} target="_blank" rel="noopener noreferrer">
            <img
              src={url}
              alt={`Scan ${i + 1}`}
              className="w-full rounded-lg border border-slate-200 object-contain bg-black max-h-44 cursor-pointer hover:opacity-90 transition-opacity"
            />
          </a>
        ))}
      </div>
    </div>
  );
}

/** Escapes HTML special characters to prevent XSS in print templates */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function handlePrintReport(report: Report) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const safe = {
    caseNumber: escapeHtml(report.caseNumber || ''),
    patientName: escapeHtml(report.patientName || ''),
    radiologistName: escapeHtml(report.radiologistName || ''),
    status: escapeHtml(report.status || ''),
    findings: escapeHtml(report.findings || ''),
    impression: escapeHtml(report.impression || ''),
    suggestions: escapeHtml(report.suggestions || ''),
    signedAt: escapeHtml(report.signedAt ? new Date(report.signedAt).toLocaleString() : ''),
  };

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Diagnostic Report - ${safe.caseNumber}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; color: #0F172A; font-size: 13px; line-height: 1.5; }
          .header { border-bottom: 2px solid #0F4C42; padding-bottom: 16px; margin-bottom: 24px; }
          .title { font-size: 18px; font-weight: bold; color: #0F4C42; margin-bottom: 4px; }
          .sub { color: #64748B; font-size: 11px; }
          .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; padding: 12px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; }
          .meta-item { font-size: 12px; }
          .meta-label { font-weight: bold; color: #475569; }
          .section { margin-bottom: 20px; }
          .section-title { font-size: 13px; font-weight: bold; color: #0F4C42; border-bottom: 1px solid #CBD5E1; padding-bottom: 4px; margin-bottom: 8px; text-transform: uppercase; }
          .section-content { white-space: pre-wrap; color: #1E293B; font-size: 13px; }
          .footer { margin-top: 40px; border-top: 1px solid #CBD5E1; padding-top: 16px; display: flex; justify-content: space-between; font-size: 11px; color: #64748B; }
          .stamp { border: 1px dashed #0F4C42; padding: 8px 16px; text-align: center; color: #0F4C42; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">HEALTHGRID IQ &mdash; CLINICAL DIAGNOSTIC REPORT</div>
          <div class="sub">Ministry of Health (KKM) Teleradiology Network</div>
        </div>
        <div class="meta">
          <div class="meta-item"><span class="meta-label">Case Number:</span> ${safe.caseNumber}</div>
          <div class="meta-item"><span class="meta-label">Patient Name:</span> ${safe.patientName}</div>
          <div class="meta-item"><span class="meta-label">Diagnostician / Radiologist:</span> ${safe.radiologistName}</div>
          <div class="meta-item"><span class="meta-label">Signed At:</span> ${safe.signedAt}</div>
        </div>
        <div class="section">
          <div class="section-title">Clinical Findings</div>
          <div class="section-content">${safe.findings || 'No findings recorded.'}</div>
        </div>
        <div class="section">
          <div class="section-title">Diagnostic Impression</div>
          <div class="section-content">${safe.impression || 'No impression recorded.'}</div>
        </div>
        ${safe.suggestions ? `
        <div class="section">
          <div class="section-title">Recommendations & Suggestions</div>
          <div class="section-content">${safe.suggestions}</div>
        </div>` : ''}
        <div class="footer">
          <div>Report generated via HealthGrid IQ Diagnostics Engine</div>
          <div class="stamp">OFFICIALLY SIGNED & VERIFIED</div>
        </div>
        <script>window.print();</script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

interface DiagnosticHubProps {
  initialTab?: 'queue' | 'reporting' | 'reports';
}

export default function DiagnosticHub({ initialTab = 'queue' }: DiagnosticHubProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const caseIdFromUrl = searchParams.get('caseId');
  const tabFromUrl = searchParams.get('tab');

  const { currentUser } = useAuth();
  const { cases, reports, addReport, editCase, addAuditLog } = useData();
  const toast = useToast();

  const isRadiologist = currentUser?.role === 'Radiologist';
  const isDoctor = currentUser?.role === 'Medical Officer';

  // ── ACTIVE TAB ────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'queue' | 'reporting' | 'reports'>(() => {
    if (tabFromUrl === 'reporting' || caseIdFromUrl || initialTab === 'reporting') return 'reporting';
    if (tabFromUrl === 'reports' || initialTab === 'reports') return 'reports';
    return 'queue';
  });

  // ── TAB 1: QUEUE STATE ───────────────────────────────────────────────────
  const [queueSubTab, setQueueSubTab] = useState<'awaiting' | 'teleradiology' | 'finalized'>('awaiting');

  // ── TAB 2: REPORTING DESK STATE ──────────────────────────────────────────
  const [selectedCaseId, setSelectedCaseId] = useState<string>(caseIdFromUrl || '');
  const [findings, setFindings] = useState('');
  const [impression, setImpression] = useState('');
  const [suggestions, setSuggestions] = useState('');
  const [isCriticalFinding, setIsCriticalFinding] = useState(false);
  const [criticalFindingNote, setCriticalFindingNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [isVisionAiAnalyzing, setIsVisionAiAnalyzing] = useState(false);
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [escalateReason, setEscalateReason] = useState('Suspected Abnormality / Requires Specialist Opinion');
  const [escalateNotes, setEscalateNotes] = useState('');

  // ── TAB 3: ARCHIVE STATE ─────────────────────────────────────────────────
  const [archiveSearch, setArchiveSearch] = useState('');
  const [viewingReport, setViewingReport] = useState<Report | null>(null);

  // Ready cases for review
  const readyCases = useMemo(() => {
    return cases.filter(
      (c) =>
        c.status === 'IMAGES_AVAILABLE' ||
        c.status === 'SCANNED' ||
        c.status === 'RADIOLOGIST_REVIEW' ||
        c.status === 'MO_REVIEW'
    );
  }, [cases]);

  // MO primary review queue
  const moReviewCases = useMemo(() => {
    return readyCases
      .filter((c) => (c.routedToRole === 'Medical Officer' || !c.routedToRole) && !c.isEscalated)
      .sort((a, b) => (b.severity === 'Critical' ? 1 : 0) - (a.severity === 'Critical' ? 1 : 0));
  }, [readyCases]);

  // Radiologist queue
  const radiologistReviewCases = useMemo(() => {
    return readyCases
      .filter((c) => c.routedToRole === 'Radiologist' || c.isEscalated || c.secondOpinionRequested)
      .sort((a, b) => (b.severity === 'Critical' ? 1 : 0) - (a.severity === 'Critical' ? 1 : 0));
  }, [readyCases]);

  // Escalated / Teleradiology cases
  const teleradiologyCases = useMemo(() => {
    return cases
      .filter((c) => c.isEscalated || c.routedToRole === 'Radiologist' || c.secondOpinionRequested)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [cases]);

  // Finalized / completed cases
  const finalizedCases = useMemo(() => {
    return cases
      .filter((c) => c.status === 'COMPLETED' || c.status === 'FINALIZED' || c.status === 'REPORT_SUBMITTED')
      .sort((a, b) => (b.finalizedAt || b.createdAt).localeCompare(a.finalizedAt || a.createdAt));
  }, [cases]);

  // Selected case object for authoring
  const selectedCase = useMemo(() => {
    return cases.find((c) => c.id === selectedCaseId);
  }, [cases, selectedCaseId]);

  // Sync caseId when changed from outside
  useEffect(() => {
    if (caseIdFromUrl) {
      setSelectedCaseId(caseIdFromUrl);
      setActiveTab('reporting');
    }
  }, [caseIdFromUrl]);

  // Pre-fill existing report draft or findings ONLY when a case is selected
  useEffect(() => {
    if (!selectedCase) {
      setFindings('');
      setImpression('');
      setSuggestions('');
      setIsCriticalFinding(false);
      setCriticalFindingNote('');
      return;
    }

    const existingReport = reports.find((r) => r.caseId === selectedCase.id);
    if (existingReport) {
      setFindings(existingReport.findings || '');
      setImpression(existingReport.impression || '');
      setSuggestions(existingReport.suggestions || '');
    } else {
      setFindings(selectedCase.radiographerFindings || '');
      setImpression(selectedCase.radiographerImpression || '');
      setSuggestions('');
    }
  }, [selectedCase?.id]);

  // AI draft generator
  const handleGenerateAiDraft = async () => {
    if (!selectedCase) return;
    setIsVisionAiAnalyzing(true);
    try {
      if (selectedCase.images && selectedCase.images.length > 0) {
        const loaded = await loadImages([selectedCase.images[0]]);
        if (loaded.length > 0) {
          const result = await analyzeImageWithVisionAi(loaded[0], selectedCase);
          setFindings(result.findings);
          setImpression(result.impression);
          toast.success(`AI Diagnostic draft generated (${result.confidenceScore}% confidence).`);
          return;
        }
      }

      const draft = generateAiReportDraft(selectedCase);
      setFindings(draft.findings);
      setImpression(draft.impression);
      if (draft.suggestions) setSuggestions(draft.suggestions);
      toast.success(`Protocol draft generated (${draft.confidenceScore}% confidence).`);
    } catch {
      toast.error('AI draft generation failed. Please enter findings manually.');
    } finally {
      setIsVisionAiAnalyzing(false);
    }
  };

  // Submit Final Report
  const handleSaveReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedCase) return;

    if (!findings.trim() || !impression.trim()) {
      toast.error('Please fill in both Clinical Findings and Diagnostic Impression.');
      return;
    }

    setSaving(true);
    try {
      const reportToken = generateReportToken(selectedCase.id);

      await addReport({
        caseId: selectedCase.id,
        caseNumber: selectedCase.caseNumber,
        patientName: selectedCase.patientName,
        radiologistId: currentUser.id,
        radiologistName: currentUser.name,
        signedByRole: currentUser.role,
        findings: findings.trim(),
        impression: impression.trim(),
        suggestions: suggestions.trim() || undefined,
        isCriticalFinding,
        criticalFindingNote: isCriticalFinding ? criticalFindingNote.trim() : undefined,
        createdAt: new Date().toISOString(),
        signedAt: new Date().toISOString(),
        status: 'final',
        reportToken,
      });

      await editCase(selectedCase.id, {
        status: 'COMPLETED',
        finalizedAt: new Date().toISOString(),
      });

      await addAuditLog({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'DIAGNOSTIC_REPORT_FINALIZED',
        target: `cases/${selectedCase.id}`,
        details: `${currentUser.role} ${currentUser.name} signed diagnostic report for Case #${selectedCase.caseNumber}.`,
        timestamp: new Date().toISOString(),
      });

      toast.success(`Diagnostic report for Case ${selectedCase.caseNumber} officially signed and finalized.`);

      // Switch to reports archive tab to view/print the completed report
      setActiveTab('reports');
    } catch (err: any) {
      console.error('Failed to save report:', err);
      toast.error(err.message || 'Failed to finalize diagnostic report.');
    } finally {
      setSaving(false);
    }
  };

  // Escalate to Hospital Specialist Radiologist (Teleradiology)
  const handleConfirmEscalation = async () => {
    if (!selectedCase || !currentUser) return;
    setSaving(true);
    try {
      await editCase(selectedCase.id, {
        status: 'RADIOLOGIST_REVIEW',
        routedToRole: 'Radiologist',
        isEscalated: true,
        secondOpinionRequested: true,
        notes: escalateNotes.trim() ? `${selectedCase.notes || ''}\n[Escalation Reason: ${escalateReason}] ${escalateNotes}` : selectedCase.notes,
      });

      await addAuditLog({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'CASE_ESCALATED_TO_RADIOLOGIST',
        target: `cases/${selectedCase.id}`,
        details: `Medical Officer ${currentUser.name} escalated Case #${selectedCase.caseNumber} to Hospital Specialist Radiologist for formal secondary opinion (${escalateReason}).`,
        timestamp: new Date().toISOString(),
      });

      toast.success(`Case ${selectedCase.caseNumber} escalated to Hospital Specialist Radiologist.`);
      setShowEscalateModal(false);
      setActiveTab('queue');
    } catch (err: any) {
      toast.error(err.message || 'Failed to escalate case.');
    } finally {
      setSaving(false);
    }
  };

  const startAuthoringCase = (c: Case) => {
    setSelectedCaseId(c.id);
    setActiveTab('reporting');
    setSearchParams({ caseId: c.id, tab: 'reporting' });
  };

  // Filter reports archive
  const filteredReports = useMemo(() => {
    const q = archiveSearch.toLowerCase().trim();
    if (!q) return reports;
    return reports.filter(
      (r) =>
        r.caseNumber?.toLowerCase().includes(q) ||
        r.patientName?.toLowerCase().includes(q) ||
        r.radiologistName?.toLowerCase().includes(q) ||
        r.findings?.toLowerCase().includes(q) ||
        r.impression?.toLowerCase().includes(q)
    );
  }, [reports, archiveSearch]);

  const activeQueueCases = isRadiologist
    ? radiologistReviewCases
    : queueSubTab === 'awaiting'
      ? moReviewCases
      : queueSubTab === 'teleradiology'
        ? teleradiologyCases
        : finalizedCases;

  return (
    <div className="space-y-6">
      {/* ── UNIFIED HEADER & TOP METRICS ───────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
        <div>
          <h1 className="page-title">Diagnostic Review &amp; Reporting Hub</h1>
          <p className="page-subtitle">
            Triage incoming medical scans, author diagnostic reports with AI Copilot, and manage finalized report archives.
          </p>
        </div>

        {/* 3-Tab Main Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setActiveTab('queue');
              setSearchParams({});
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${activeTab === 'queue' ? 'bg-white text-[#0F4C42] shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Review Queue ({isRadiologist ? radiologistReviewCases.length : moReviewCases.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reporting')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${activeTab === 'reporting' ? 'bg-[#0F4C42] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Clinical Reporting Desk</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('reports');
              setSearchParams({});
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${activeTab === 'reports' ? 'bg-white text-[#0F4C42] shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Finalized Reports Archive ({reports.length})</span>
          </button>
        </div>
      </div>

      {/* ── TOP STATS BAR ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-3 bg-white border border-slate-200">
          <span className="text-[11px] text-amber-700 font-medium block">Awaiting Primary Review</span>
          <span className="text-xl font-bold text-amber-900 mt-0.5 block">
            {isRadiologist ? radiologistReviewCases.length : moReviewCases.length}
          </span>
        </div>

        <div className="card p-3 bg-white border border-slate-200">
          <span className="text-[11px] text-purple-700 font-medium block">Teleradiology Escalations</span>
          <span className="text-xl font-bold text-purple-900 mt-0.5 block">{teleradiologyCases.length}</span>
        </div>

        <div className="card p-3 bg-white border border-slate-200">
          <span className="text-[11px] text-emerald-700 font-medium block">Signed Diagnostic Reports</span>
          <span className="text-xl font-bold text-emerald-900 mt-0.5 block">{reports.length}</span>
        </div>

        <div className="card p-3 bg-white border border-slate-200">
          <span className="text-[11px] text-slate-500 font-medium block">Total Scans in PACS</span>
          <span className="text-xl font-bold text-slate-800 mt-0.5 block">{cases.filter((c) => c.images?.length).length}</span>
        </div>
      </div>

      {/* ── TAB 1: DIAGNOSTIC REVIEW QUEUE (TRIAGE) ────────────────────── */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          {!isRadiologist && (
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
              <button
                type="button"
                onClick={() => setQueueSubTab('awaiting')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${queueSubTab === 'awaiting'
                  ? 'bg-[#0F4C42] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                Awaiting MO Review ({moReviewCases.length})
              </button>

              <button
                type="button"
                onClick={() => setQueueSubTab('teleradiology')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${queueSubTab === 'teleradiology'
                  ? 'bg-[#0F4C42] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                Teleradiology Escalations ({teleradiologyCases.length})
              </button>

              <button
                type="button"
                onClick={() => setQueueSubTab('finalized')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${queueSubTab === 'finalized'
                  ? 'bg-[#0F4C42] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                Finalized / Signed Today ({finalizedCases.length})
              </button>
            </div>
          )}

          <div className="space-y-3">
            {activeQueueCases.map((c) => {
              const isFinal = c.status === 'COMPLETED' || c.status === 'FINALIZED' || c.status === 'REPORT_SUBMITTED';

              return (
                <div
                  key={c.id}
                  className={`card p-4 border transition-all ${c.severity === 'Critical'
                    ? 'bg-red-50/50 border-red-300'
                    : isFinal
                      ? 'bg-slate-50/70 border-slate-200'
                      : 'bg-white border-slate-300 shadow-xs'
                    }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/case/${c.id}`}
                          className="font-mono font-bold text-xs text-[#0F4C42] hover:underline"
                        >
                          {c.caseNumber}
                        </Link>
                        <SeverityBadge severity={c.severity} />
                        <StatusBadge status={c.status} />
                        {c.isEscalated && (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-bold rounded border border-purple-200">
                            Teleradiology Escalation
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-bold text-slate-900 mt-1">
                        Patient: {c.patientName} <span className="text-[10px] text-slate-500 font-mono">({c.patientId})</span>
                      </p>

                      <p className="text-[11px] text-slate-600">
                        Exam: <strong className="text-slate-800">{c.modality || 'X-Ray'} — {c.scanType}</strong>
                        {c.bodyRegion ? ` · ${c.bodyRegion}` : ''} &middot; Clinic: {c.clinicName}
                      </p>

                      <p className="text-[11px] text-slate-500">
                        Indication: {getCaseIndication(c)} &middot; Registered by: {getCaseRegistrar(c)}
                      </p>

                      {c.radiographerFindings && (
                        <p className="text-[11px] text-teal-800 bg-teal-50 p-1.5 rounded border border-teal-200 mt-1">
                          <strong className="font-semibold">Radiographer Notes:</strong> {c.radiographerFindings}
                        </p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">
                      <Link to={`/case/${c.id}`} className="btn-secondary text-xs">
                        View Details
                      </Link>

                      {!isFinal ? (
                        <button
                          type="button"
                          onClick={() => startAuthoringCase(c)}
                          className="btn-primary text-xs flex items-center gap-1 px-3 py-1.5"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Review &amp; Author Report</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startAuthoringCase(c)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Report</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {activeQueueCases.length === 0 && (
              <div className="card p-12 text-center text-slate-400 space-y-2 bg-white">
                <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500" />
                <h3 className="text-sm font-bold text-slate-700">Queue is Clear</h3>
                <p className="text-xs text-slate-500">No pending medical scans awaiting review in this section.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: CLINICAL REPORT AUTHORING DESK ───────────────────────── */}
      {activeTab === 'reporting' && (
        <form onSubmit={handleSaveReport} className="space-y-5">
          {/* ================================================================
              CASE HEADER
          ================================================================= */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-200">
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#0F4C42]/10 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-[#0F4C42]" />
                    </div>

                    <div>
                      <h2 className="text-sm font-bold text-slate-900">
                        Clinical Report
                      </h2>

                      <p className="text-[11px] text-slate-500">
                        Review the imaging study and complete the diagnostic report
                      </p>
                    </div>
                  </div>
                </div>

                {/* Case selector */}
                <div className="w-full lg:w-[430px]">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Reporting Case
                  </label>

                  <select
                    required
                    value={selectedCaseId}
                    onChange={(e) => setSelectedCaseId(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-[#0F4C42] focus:ring-2 focus:ring-[#0F4C42]/10"
                  >
                    <option value="">
                      Select an imaging case...
                    </option>

                    {cases.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.caseNumber} — {c.patientName} ({c.modality || 'X-Ray'} · {c.scanType})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Case metadata */}
            {selectedCase && (
              <div className="px-5 py-4 bg-slate-50/70">
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-x-6 gap-y-4">
                  {/* Patient */}
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Patient
                    </span>

                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#0F4C42]" />

                      <span className="text-xs font-bold text-slate-900 truncate">
                        {selectedCase.patientName}
                      </span>
                    </div>

                    <span className="block text-[10px] font-mono text-slate-500 mt-0.5">
                      ID: {selectedCase.patientId}
                    </span>
                  </div>

                  {/* Case */}
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Case
                    </span>

                    <span className="block text-xs font-bold font-mono text-[#0F4C42]">
                      #{selectedCase.caseNumber}
                    </span>

                    <span className="block text-[10px] text-slate-500 mt-0.5 truncate">
                      {selectedCase.clinicName}
                    </span>
                  </div>

                  {/* Examination */}
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Examination
                    </span>

                    <span className="block text-xs font-bold text-slate-800">
                      {selectedCase.modality || 'X-Ray'}
                    </span>

                    <span className="block text-[10px] text-slate-500 mt-0.5">
                      {selectedCase.scanType}
                      {selectedCase.bodyRegion
                        ? ` · ${selectedCase.bodyRegion}`
                        : ''}
                    </span>
                  </div>

                  {/* Indication */}
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Clinical Indication
                    </span>

                    <p className="text-[11px] leading-relaxed text-slate-700 font-medium line-clamp-2">
                      {getCaseIndication(selectedCase)}
                    </p>
                  </div>

                  {/* Severity */}
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Priority
                    </span>

                    <SeverityBadge severity={selectedCase.severity} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ================================================================
              EMPTY STATE
          ================================================================= */}
          {!selectedCase && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm py-20 text-center">
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-6 h-6 text-slate-400" />
              </div>

              <h3 className="text-sm font-bold text-slate-800">
                Select a case to begin
              </h3>

              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Choose an imaging case above to open the PACS viewer and diagnostic
                report workspace.
              </p>
            </div>
          )}

          {/* ================================================================
              REPORTING WORKSPACE
          ================================================================= */}
          {selectedCase && (
            <div className="grid grid-cols-1 xl:grid-cols-[1.08fr_0.92fr] gap-5 items-start">
              {/* ============================================================
                  PACS VIEWER
              ============================================================= */}
              <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                {/* Viewer header */}
                <div className="px-5 py-3.5 border-b border-slate-200">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#0F4C42]/10 flex items-center justify-center">
                        <ImageIcon className="w-4 h-4 text-[#0F4C42]" />
                      </div>

                      <div>
                        <h2 className="text-xs font-bold text-slate-900">
                          PACS Image Viewer
                        </h2>

                        <p className="text-[10px] text-slate-500">
                          Review the imaging study
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {selectedCase.severity === 'Critical' && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-50 border border-red-200 text-[10px] font-bold text-red-700">
                          <AlertTriangle className="w-3 h-3" />
                          Critical
                        </span>
                      )}

                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full">
                        {selectedCase.images?.length || 0} scan
                        {(selectedCase.images?.length || 0) !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>

                {/* PACS */}
                <div className="p-4">
                  {selectedCase.images && selectedCase.images.length > 0 ? (
                    <PacsImageViewer
                      imageKeys={selectedCase.images}
                      caseItem={selectedCase}
                    />
                  ) : (
                    <div className="min-h-[440px] flex flex-col items-center justify-center bg-slate-950 rounded-xl border border-slate-800">
                      <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-3">
                        <ImageIcon className="w-6 h-6 text-slate-500" />
                      </div>

                      <p className="text-xs font-bold text-slate-300">
                        No imaging available
                      </p>

                      <p className="text-[11px] text-slate-500 mt-1">
                        No PACS images have been uploaded for this case.
                      </p>
                    </div>
                  )}
                </div>

                {/* Clinical context */}
                <div className="px-4 pb-4">
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0F4C42]" />

                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Clinical Indication
                      </span>
                    </div>

                    <p className="text-xs leading-relaxed text-slate-700">
                      {getCaseIndication(selectedCase)}
                    </p>
                  </div>
                </div>
              </section>

              {/* ============================================================
                  REPORT EDITOR
              ============================================================= */}
              <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                {/* Report header */}
                <div className="px-5 py-3.5 border-b border-slate-200">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#0F4C42]/10 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-[#0F4C42]" />
                      </div>

                      <div>
                        <h2 className="text-xs font-bold text-slate-900">
                          Diagnostic Report
                        </h2>

                        <p className="text-[10px] text-slate-500">
                          Author and finalize the clinical report
                        </p>
                      </div>
                    </div>

                    {/* AI */}
                    <button
                      type="button"
                      onClick={handleGenerateAiDraft}
                      disabled={isVisionAiAnalyzing}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-purple-200 bg-purple-50 text-purple-800 hover:bg-purple-100 disabled:opacity-60 disabled:cursor-not-allowed text-[11px] font-bold transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" />

                      {isVisionAiAnalyzing
                        ? 'Analyzing...'
                        : 'Generate AI Draft'}
                    </button>
                  </div>
                </div>

                {/* Editor */}
                <div className="p-5 space-y-5">
                  {/* Findings */}
                  <div>
                    <div className="flex items-end justify-between gap-3 mb-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-900">
                          Clinical Findings
                          <span className="text-red-500 ml-1">*</span>
                        </label>

                        <span className="text-[10px] text-slate-400">
                          Describe the objective radiological findings
                        </span>
                      </div>

                      <span className="text-[10px] text-slate-400 shrink-0">
                        Required
                      </span>
                    </div>

                    <textarea
                      required
                      value={findings}
                      onChange={(e) => setFindings(e.target.value)}
                      placeholder="Describe the radiological findings..."
                      rows={8}
                      className="w-full resize-y min-h-[180px] bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-xs leading-relaxed text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F4C42]/10 focus:border-[#0F4C42] transition"
                    />
                  </div>

                  {/* Impression */}
                  <div>
                    <div className="flex items-end justify-between gap-3 mb-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-900">
                          Diagnostic Impression
                          <span className="text-red-500 ml-1">*</span>
                        </label>

                        <span className="text-[10px] text-slate-400">
                          Summarise the primary diagnostic conclusion
                        </span>
                      </div>

                      <span className="text-[10px] text-slate-400 shrink-0">
                        Required
                      </span>
                    </div>

                    <textarea
                      required
                      value={impression}
                      onChange={(e) => setImpression(e.target.value)}
                      placeholder="Enter the primary diagnostic impression..."
                      rows={4}
                      className="w-full resize-y min-h-[105px] bg-slate-50 border border-slate-300 rounded-lg px-3 py-2.5 text-xs leading-relaxed font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F4C42]/10 focus:border-[#0F4C42] transition"
                    />
                  </div>

                  {/* Recommendations */}
                  <div>
                    <div className="flex items-end justify-between gap-3 mb-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-900">
                          Recommendations & Follow-up
                        </label>

                        <span className="text-[10px] text-slate-400">
                          Optional clinical recommendations
                        </span>
                      </div>

                      <span className="text-[10px] text-slate-400">
                        Optional
                      </span>
                    </div>

                    <textarea
                      value={suggestions}
                      onChange={(e) => setSuggestions(e.target.value)}
                      placeholder="Add follow-up imaging, referral, or other clinical recommendations..."
                      rows={3}
                      className="w-full resize-y min-h-[80px] bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-xs leading-relaxed text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F4C42]/10 focus:border-[#0F4C42] transition"
                    />
                  </div>

                  {/* Critical finding */}
                  <div
                    className={`rounded-lg border transition-colors ${isCriticalFinding
                      ? 'border-red-300 bg-red-50'
                      : 'border-slate-200 bg-slate-50'
                      }`}
                  >
                    <label className="flex items-start gap-3 p-3.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isCriticalFinding}
                        onChange={(e) =>
                          setIsCriticalFinding(e.target.checked)
                        }
                        className="mt-0.5 w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                      />

                      <div>
                        <span
                          className={`block text-xs font-bold ${isCriticalFinding
                            ? 'text-red-900'
                            : 'text-slate-800'
                            }`}
                        >
                          Critical / Urgent Finding
                        </span>

                        <span
                          className={`block text-[10px] mt-0.5 ${isCriticalFinding
                            ? 'text-red-700'
                            : 'text-slate-500'
                            }`}
                        >
                          Mark this report for immediate clinical notification.
                        </span>
                      </div>
                    </label>

                    {isCriticalFinding && (
                      <div className="px-3.5 pb-3.5">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-red-800 mb-1.5">
                          Urgent Action / Notification Note
                        </label>

                        <input
                          type="text"
                          value={criticalFindingNote}
                          onChange={(e) =>
                            setCriticalFindingNote(e.target.value)
                          }
                          placeholder="Specify the urgent action required..."
                          className="w-full h-9 px-3 bg-white border border-red-300 rounded-lg text-xs text-red-950 placeholder:text-red-300 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* ========================================================
                    REPORT ACTIONS
                ========================================================= */}
                <div className="px-5 py-4 bg-slate-50 border-t border-slate-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Escalation */}
                    <div>
                      {isDoctor && (
                        <button
                          type="button"
                          onClick={() => setShowEscalateModal(true)}
                          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-purple-200 bg-white text-purple-800 hover:bg-purple-50 text-xs font-bold transition-colors"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Escalate to Radiologist
                        </button>
                      )}
                    </div>

                    {/* Main actions */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab('queue')}
                        className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors"
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#0F4C42] hover:bg-[#0B3D35] disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-bold shadow-sm transition-colors"
                      >
                        <FileCheck2 className="w-3.5 h-3.5" />

                        {saving
                          ? 'Signing Report...'
                          : 'Sign & Finalize Report'}
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* ================================================================
              ESCALATION MODAL
          ================================================================= */}
          {showEscalateModal && (
            <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-[2px] flex items-center justify-center p-4">
              <div className="bg-white rounded-xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
                {/* Modal header */}
                <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                      <Send className="w-4 h-4 text-purple-700" />
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Escalate Case
                      </h3>

                      <p className="text-[10px] text-slate-500">
                        Request specialist radiologist review
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowEscalateModal(false)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Modal content */}
                <div className="p-5 space-y-4">
                  <div className="p-3 bg-purple-50 border border-purple-100 rounded-lg">
                    <p className="text-[11px] leading-relaxed text-purple-900">
                      This case will be routed to the central hospital radiology
                      network for formal secondary review.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Reason for Escalation
                    </label>

                    <select
                      value={escalateReason}
                      onChange={(e) => setEscalateReason(e.target.value)}
                      className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/10 focus:border-purple-500"
                    >
                      <option value="Suspected Abnormality / Requires Specialist Opinion">
                        Suspected Abnormality / Requires Specialist Opinion
                      </option>

                      <option value="Pediatric Complex Case">
                        Pediatric Complex Case
                      </option>

                      <option value="Suspected Trauma / Fracture">
                        Suspected Trauma / Fracture
                      </option>

                      <option value="Unclear Image Artifacts">
                        Unclear Image Artifacts
                      </option>

                      <option value="Urgent Pre-Operative Assessment">
                        Urgent Pre-Operative Assessment
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Clinical Questions / Notes
                    </label>

                    <textarea
                      value={escalateNotes}
                      onChange={(e) => setEscalateNotes(e.target.value)}
                      placeholder="Describe what you would like the specialist to review..."
                      rows={4}
                      className="w-full resize-none px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-xs leading-relaxed text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/10 focus:border-purple-500"
                    />
                  </div>
                </div>

                {/* Modal footer */}
                <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEscalateModal(false)}
                    className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 text-xs font-semibold"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmEscalation}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-700 hover:bg-purple-800 disabled:opacity-60 text-white text-xs font-bold"
                  >
                    <Send className="w-3.5 h-3.5" />

                    {saving
                      ? 'Dispatching...'
                      : 'Dispatch Escalation'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>
      )}

      {/* ── TAB 3: FINALIZED REPORTS & PRINT ARCHIVE ────────────────────── */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search signed reports by case #, patient, diagnostician..."
                value={archiveSearch}
                onChange={(e) => setArchiveSearch(e.target.value)}
                className="text-xs pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0F4C42] w-full"
              />
            </div>
            <span className="text-xs text-slate-500 font-semibold">
              {filteredReports.length} signed report(s) archived
            </span>
          </div>

          {/* Reports Grid */}
          <div className="space-y-3">
            {filteredReports.map((r) => {
              return (
                <div key={r.id} className="card p-4 border border-slate-200 bg-white hover:border-slate-300 shadow-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/case/${r.caseId}`}
                          className="font-mono font-bold text-xs text-[#0F4C42] hover:underline"
                        >
                          {r.caseNumber}
                        </Link>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded border border-emerald-200 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                          Signed &amp; Finalized
                        </span>
                        {r.isCriticalFinding && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-800 text-[10px] font-bold rounded border border-red-200 flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3 text-red-600" />
                            Critical Finding
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-slate-900 mt-1">Patient: {r.patientName}</p>
                      <p className="text-[11px] text-slate-500">
                        Diagnostician: {r.radiologistName} &middot; Signed: {r.signedAt ? new Date(r.signedAt).toLocaleString() : 'Recent'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handlePrintReport(r)}
                        className="btn-secondary text-xs flex items-center gap-1 text-[#0F4C42]"
                        title="Print official MOH Report"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print Report</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setViewingReport(r)}
                        className="btn-primary text-xs flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Details</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-50/70 p-3 rounded-lg border border-slate-200">
                    <div>
                      <span className="font-bold text-slate-700 block mb-0.5 uppercase tracking-wide text-[10px]">
                        Findings:
                      </span>
                      <p className="text-slate-800 line-clamp-2">{r.findings}</p>
                    </div>
                    <div>
                      <span className="font-bold text-slate-700 block mb-0.5 uppercase tracking-wide text-[10px]">
                        Impression:
                      </span>
                      <p className="text-slate-800 line-clamp-2">{r.impression}</p>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredReports.length === 0 && (
              <div className="card p-12 text-center text-slate-400 space-y-2 bg-white">
                <FileText className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs font-semibold text-slate-600">No finalized reports found.</p>
              </div>
            )}
          </div>

          {/* Modal View Details */}
          {viewingReport && (
            <Modal isOpen={Boolean(viewingReport)} onClose={() => setViewingReport(null)} title={`Report - Case ${viewingReport.caseNumber}`}>
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{viewingReport.patientName}</h3>
                    <p className="text-[11px] text-slate-500">Case #{viewingReport.caseNumber} &middot; Signed by {viewingReport.radiologistName}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePrintReport(viewingReport)}
                    className="btn-primary text-xs flex items-center gap-1"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print MOH Report</span>
                  </button>
                </div>

                <div className="space-y-2">
                  <span className="font-bold text-slate-800 block uppercase tracking-wider text-[11px]">Findings</span>
                  <div className="p-3 bg-slate-50 rounded border border-slate-200 whitespace-pre-wrap text-slate-800">
                    {viewingReport.findings}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="font-bold text-slate-800 block uppercase tracking-wider text-[11px]">Impression</span>
                  <div className="p-3 bg-slate-50 rounded border border-slate-200 whitespace-pre-wrap text-slate-800">
                    {viewingReport.impression}
                  </div>
                </div>

                {viewingReport.suggestions && (
                  <div className="space-y-2">
                    <span className="font-bold text-slate-800 block uppercase tracking-wider text-[11px]">Recommendations</span>
                    <div className="p-3 bg-slate-50 rounded border border-slate-200 whitespace-pre-wrap text-slate-800">
                      {viewingReport.suggestions}
                    </div>
                  </div>
                )}

                {/* Scan images attachment */}
                {cases.find((c) => c.id === viewingReport.caseId || c.caseNumber === viewingReport.caseNumber)?.images && (
                  <ReportImages
                    imageKeys={
                      cases.find((c) => c.id === viewingReport.caseId || c.caseNumber === viewingReport.caseNumber)?.images
                    }
                  />
                )}
              </div>
            </Modal>
          )}
        </div>
      )}
    </div>
  );
}
