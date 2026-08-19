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
import PrintMohReferralLetterModal from '../../components/ui/PrintMohReferralLetter';
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

  // Pre-fill existing report draft or findings when a case is selected
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
  }, [selectedCase, reports]);

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
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 text-[10px] font-bold bg-[#0F4C42] text-white rounded">
              DIAGNOSTIC &amp; REPORTING HUB
            </span>
            <span className="text-xs text-slate-500 font-medium">Clinician: {currentUser?.name}</span>
          </div>
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
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
              activeTab === 'queue' ? 'bg-white text-[#0F4C42] shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Review Queue ({isRadiologist ? radiologistReviewCases.length : moReviewCases.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reporting')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
              activeTab === 'reporting' ? 'bg-[#0F4C42] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
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
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
              activeTab === 'reports' ? 'bg-white text-[#0F4C42] shadow-sm' : 'text-slate-600 hover:text-slate-900'
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
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  queueSubTab === 'awaiting'
                    ? 'bg-[#0F4C42] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Awaiting MO Review ({moReviewCases.length})
              </button>

              <button
                type="button"
                onClick={() => setQueueSubTab('teleradiology')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  queueSubTab === 'teleradiology'
                    ? 'bg-[#0F4C42] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Teleradiology Escalations ({teleradiologyCases.length})
              </button>

              <button
                type="button"
                onClick={() => setQueueSubTab('finalized')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  queueSubTab === 'finalized'
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
                  className={`card p-4 border transition-all ${
                    c.severity === 'Critical'
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

                      {isDoctor && (
                        <PrintMohReferralLetterModal caseItem={c} />
                      )}

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
        <form onSubmit={handleSaveReport} className="space-y-6">
          {/* Case Selector Card */}
          <div className="card bg-white p-5 border border-slate-200 rounded-xl shadow-sm space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5 uppercase tracking-wider">
                Select Case for Diagnostic Evaluation <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={selectedCaseId}
                onChange={(e) => setSelectedCaseId(e.target.value)}
                className="select-field text-xs"
              >
                <option value="">-- Choose an imaging case from queue --</option>
                {cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.caseNumber} — {c.patientName} ({c.modality || 'X-Ray'} · {c.scanType}) [{c.status}]
                  </option>
                ))}
              </select>
            </div>

            {selectedCase && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block uppercase">Patient</span>
                  <span className="font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                    <User className="w-3.5 h-3.5 text-teal-700" />
                    {selectedCase.patientName}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">ID: {selectedCase.patientId}</span>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block uppercase">Modality &amp; Scan</span>
                  <span className="font-bold text-teal-900 mt-0.5 block">
                    {selectedCase.modality || 'X-Ray'} — {selectedCase.scanType}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Case #{selectedCase.caseNumber}</span>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block uppercase">Severity &amp; Origin</span>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <SeverityBadge severity={selectedCase.severity} />
                    <span className="text-[11px] text-slate-600 truncate">{selectedCase.clinicName}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block uppercase">Clinical Indication</span>
                  <p className="text-[11px] text-slate-700 font-medium truncate mt-0.5">
                    {getCaseIndication(selectedCase)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {selectedCase && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* PACS SCAN VIEWER (Left Column) */}
              <div className="lg:col-span-6 card bg-white p-5 border border-slate-200 rounded-xl shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-[#0F4C42]" />
                    <span>1. Interactive PACS Viewer</span>
                  </h2>
                  <span className="text-[11px] text-slate-500">
                    {selectedCase.images?.length || 0} scan capture(s)
                  </span>
                </div>

                {selectedCase.images && selectedCase.images.length > 0 ? (
                  <PacsImageViewer imageKeys={selectedCase.images} caseItem={selectedCase} />
                ) : (
                  <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                    <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-xs font-semibold text-slate-600">No images uploaded for this case yet.</p>
                  </div>
                )}
              </div>

              {/* CLINICAL REPORT EDITOR (Right Column) */}
              <div className="lg:col-span-6 card bg-white p-5 border border-slate-200 rounded-xl shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#0F4C42]" />
                    <span>2. Diagnostic Report Authoring</span>
                  </h2>

                  <button
                    type="button"
                    onClick={handleGenerateAiDraft}
                    disabled={isVisionAiAnalyzing}
                    className="btn-secondary text-xs flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    <span>{isVisionAiAnalyzing ? 'Analyzing Scan...' : 'Generate AI Copilot Draft'}</span>
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  {/* Findings */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Clinical Findings <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      required
                      value={findings}
                      onChange={(e) => setFindings(e.target.value)}
                      placeholder="Enter detailed radiological findings (e.g. lung fields, cardiac silhouette, osseous structures)..."
                      rows={5}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5"
                    />
                  </div>

                  {/* Impression */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Diagnostic Impression <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      required
                      value={impression}
                      onChange={(e) => setImpression(e.target.value)}
                      placeholder="Primary diagnostic conclusion / impression..."
                      rows={3}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5"
                    />
                  </div>

                  {/* Recommendations */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Recommendations &amp; Follow-up
                    </label>
                    <textarea
                      value={suggestions}
                      onChange={(e) => setSuggestions(e.target.value)}
                      placeholder="Suggested clinical management, antibiotic therapy, or follow-up imaging..."
                      rows={2}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5"
                    />
                  </div>

                  {/* Critical Finding Flag */}
                  <div className="p-3 bg-red-50/70 border border-red-200 rounded-lg space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-red-900">
                      <input
                        type="checkbox"
                        checked={isCriticalFinding}
                        onChange={(e) => setIsCriticalFinding(e.target.checked)}
                        className="rounded text-red-600 focus:ring-red-500"
                      />
                      <span>Flag as Critical / Urgent Finding (Immediate Notification)</span>
                    </label>

                    {isCriticalFinding && (
                      <input
                        type="text"
                        value={criticalFindingNote}
                        onChange={(e) => setCriticalFindingNote(e.target.value)}
                        placeholder="Specify urgent action needed (e.g. Immediate chest tube insertion required)..."
                        className="w-full bg-white border border-red-300 rounded px-2.5 py-1.5 text-xs text-red-950"
                      />
                    )}
                  </div>

                  {/* Actions Row */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
                    {isDoctor && (
                      <button
                        type="button"
                        onClick={() => setShowEscalateModal(true)}
                        className="btn-secondary text-xs flex items-center gap-1 text-purple-700 border-purple-300 hover:bg-purple-50"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Escalate to Radiologist</span>
                      </button>
                    )}

                    <div className="flex items-center gap-2 ml-auto">
                      <button
                        type="button"
                        onClick={() => setActiveTab('queue')}
                        className="btn-secondary text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="btn-primary text-xs flex items-center gap-1.5 px-5 py-2.5"
                      >
                        <FileCheck2 className="w-3.5 h-3.5" />
                        <span>{saving ? 'Signing...' : 'Sign & Finalize Report'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Escalate Modal */}
          {showEscalateModal && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl border border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="text-sm font-bold text-purple-900 flex items-center gap-2">
                    <Send className="w-4 h-4 text-purple-700" />
                    <span>Escalate Case to Specialist Radiologist</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowEscalateModal(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Route this scan to the central hospital radiology network for formal secondary diagnosis.
                </p>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Reason for Escalation</label>
                    <select
                      value={escalateReason}
                      onChange={(e) => setEscalateReason(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2"
                    >
                      <option value="Suspected Abnormality / Requires Specialist Opinion">
                        Suspected Abnormality / Requires Specialist Opinion
                      </option>
                      <option value="Pediatric Complex Case">Pediatric Complex Case</option>
                      <option value="Suspected Trauma / Fracture">Suspected Trauma / Fracture</option>
                      <option value="Unclear Image Artifacts">Unclear Image Artifacts</option>
                      <option value="Urgent Pre-Operative Assessment">Urgent Pre-Operative Assessment</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Clinical Questions / Notes</label>
                    <textarea
                      value={escalateNotes}
                      onChange={(e) => setEscalateNotes(e.target.value)}
                      placeholder="Note specific areas for specialist review..."
                      rows={3}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowEscalateModal(false)}
                    className="btn-secondary text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmEscalation}
                    disabled={saving}
                    className="btn-primary text-xs bg-purple-700 hover:bg-purple-800 px-4 py-2"
                  >
                    {saving ? 'Dispatching...' : 'Dispatch Escalation'}
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
