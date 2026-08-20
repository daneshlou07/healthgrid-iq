import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ux/Toast';
import { useLanguage } from '../../context/LanguageContext';
import StatusBadge from '../../components/ui/StatusBadge';
import SeverityBadge from '../../components/ui/SeverityBadge';
import PacsImageViewer from '../../components/ui/PacsImageViewer';
import MachineUnavailableModal from '../../components/ui/MachineUnavailableModal';
import { saveImage } from '../../services/imageStorage';
import { getEffectiveDoseForExam } from '../../data/effectiveDoseTable';
import { analyzeImageWithVisionAi } from '../../services/visionAiAnalyzer';
import { generateAiReportDraft } from '../../services/aiReportingCopilot';
import { openWazeNavigation } from '../../utils/navigationUtils';
import { getCaseRegistrar } from '../../utils/caseDisplay';
import {
  Calendar,
  Clock,
  Search,
  AlertTriangle,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  CheckSquare,
  Zap,
  ShieldCheck,
  FileText,
  Sparkles,
  Loader,
  User,
  Activity,
  Wrench,
  Navigation,
  ArrowRight,
  SlidersHorizontal,
  X,
  Layers,
  LayoutGrid,
  ListFilter,
  Check,
  Building2,
  Plus,
  Eye,
} from 'lucide-react';

interface FlattenedViewItem {
  id: string;
  examIndex: number;
  bodyPart: string;
  side?: string;
  viewName: string;
  notes?: string;
}

const HOURLY_SLOTS = [
  '08:00 AM',
  '09:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '01:00 PM',
  '02:00 PM',
  '03:00 PM',
  '04:00 PM',
  '05:00 PM',
];

function getCaseAppointmentDate(c: { officeTarikhAppointment?: string; scheduledAt?: string; createdAt?: string }): string {
  const raw = c.officeTarikhAppointment || c.scheduledAt || c.createdAt || '';
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(raw)) {
    const [m, d, y] = raw.split('/');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const parsed = new Date(raw);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
  return raw.split('T')[0];
}

export default function RadiographerWorkspace({ initialTab }: { initialTab?: 'queue' | 'upload' }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const caseIdFromUrl = searchParams.get('caseId');
  const tabFromUrl = searchParams.get('tab');

  const { currentUser } = useAuth();
  const { cases, clinics, editCase, addAuditLog } = useData();
  const toast = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Active Main Tab
  const [activeTab, setActiveTab] = useState<'queue' | 'upload'>(
    tabFromUrl === 'upload' || initialTab === 'upload' || Boolean(caseIdFromUrl) ? 'upload' : 'queue'
  );

  // ── WORKLIST & SCHEDULE STATE ─────────────────────────────────────────────
  const [queueFilter, setQueueFilter] = useState<'today' | 'upcoming' | 'unscheduled' | 'scanned' | 'all'>('today');
  const [viewMode, setViewMode] = useState<'list' | 'timetable'>('list');
  const [searchQuery, setSearchQuery] = useState('');

  // ── UPLOAD & ACQUISITION STATE ────────────────────────────────────────────
  const [selectedCaseId, setSelectedCaseId] = useState<string>(caseIdFromUrl || '');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [activePreviewIndex, setActivePreviewIndex] = useState<number>(0);
  const [uploading, setUploading] = useState(false);
  const [routedToRole, setRoutedToRole] = useState<'Medical Officer' | 'Radiologist'>('Medical Officer');
  const [showMachineModal, setShowMachineModal] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  // Technical Exposure Factors (MOH PER.SS-RA301)
  const [doseKvp, setDoseKvp] = useState('');
  const [doseMas, setDoseMas] = useState('');
  const [dosRadiasi, setDosRadiasi] = useState('');
  const [bilanganFilem, setBilanganFilem] = useState('1');
  const [bilanganCdDvd, setBilanganCdDvd] = useState('0');
  const [komen, setKomen] = useState('');
  const [radiographerFindings, setRadiographerFindings] = useState('');
  const [radiographerImpression, setRadiographerImpression] = useState('');
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [completedViewIds, setCompletedViewIds] = useState<Record<string, boolean>>({});

  // Radiographer's assigned cases (Strictly separated: Local Clinic, Public Hospital, or Private Hospital)
  const myCases = useMemo(() => {
    if (!currentUser) return [];

    // 1. Public Hospital Radiographer: sees cases explicitly routed to Public Hospital
    if (currentUser.role === 'Public Hospital Radiographer') {
      return cases.filter(
        (c) =>
          c.externalRadiographerId === currentUser.id ||
          c.radiographerId === currentUser.id ||
          (c.externalReferral && c.externalReferral.assignedRadiographerId === currentUser.id) ||
          ((c.externalFacilityType === 'Public Hospital' || c.externalReferral?.facilityType === 'PUBLIC_HOSPITAL') &&
            ['EXTERNAL_RADIOGRAPHER_ASSIGNED', 'SCANNED', 'IMAGES_AVAILABLE', 'COMPLETED', 'FINALIZED'].includes(c.status))
      );
    }

    // 2. Private Hospital Radiographer: sees cases routed to Private Hospital assigned to them
    if (currentUser.role === 'Private Hospital Radiographer') {
      return cases.filter(
        (c) =>
          c.externalRadiographerId === currentUser.id ||
          c.radiographerId === currentUser.id ||
          (c.externalReferral && c.externalReferral.assignedRadiographerId === currentUser.id) ||
          ((c.externalFacilityType === 'Private Hospital' || c.externalReferral?.facilityType === 'PRIVATE_HOSPITAL') &&
            c.externalRadiographerId === currentUser.id &&
            ['EXTERNAL_RADIOGRAPHER_ASSIGNED', 'SCANNED', 'IMAGES_AVAILABLE', 'COMPLETED', 'FINALIZED'].includes(c.status))
      );
    }

    // 3. Local Primary Clinic Radiographer: sees their local center cases
    return cases.filter(
      (c) =>
        (c.radiographerId === currentUser.id ||
          c.registeredById === currentUser.id ||
          (c.clinicId === currentUser.deploymentLocationId && !c.externalFacilityType)) &&
        c.externalFacilityType !== 'Private Hospital' &&
        c.externalFacilityType !== 'Public Hospital'
    );
  }, [cases, currentUser]);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Today's cases: Appointment date = today AND not completed
  const todayCasesList = useMemo(() => {
    return myCases.filter((c) => {
      const isCompleted = ['SCANNED', 'IMAGES_AVAILABLE', 'COMPLETED', 'FINALIZED'].includes(c.status);
      const apptDate = getCaseAppointmentDate(c);
      return apptDate === todayStr && !isCompleted;
    });
  }, [myCases, todayStr]);

  // Upcoming cases: Appointment date > today AND not completed
  const upcomingCasesList = useMemo(() => {
    return myCases.filter((c) => {
      const isCompleted = ['SCANNED', 'IMAGES_AVAILABLE', 'COMPLETED', 'FINALIZED'].includes(c.status);
      const apptDate = getCaseAppointmentDate(c);
      return Boolean(apptDate) && apptDate > todayStr && !isCompleted;
    });
  }, [myCases, todayStr]);

  // Completed cases: SCANNED / IMAGES_AVAILABLE / COMPLETED / FINALIZED
  const completedCasesList = useMemo(() => {
    return myCases.filter((c) =>
      ['SCANNED', 'IMAGES_AVAILABLE', 'COMPLETED', 'FINALIZED'].includes(c.status)
    );
  }, [myCases]);

  const scheduledCases = todayCasesList;
  const completedCases = completedCasesList;

  // Filtered and Sorted queue items
  const filteredQueueCases = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    const filtered = myCases.filter((c) => {
      const matchSearch =
        !q ||
        c.caseNumber.toLowerCase().includes(q) ||
        c.patientName.toLowerCase().includes(q) ||
        (c.scanType || '').toLowerCase().includes(q) ||
        (c.clinicName || '').toLowerCase().includes(q);

      if (!matchSearch) return false;

      const isCompleted = ['SCANNED', 'IMAGES_AVAILABLE', 'COMPLETED', 'FINALIZED'].includes(c.status);
      const apptDate = getCaseAppointmentDate(c);

      // 1. Today: Appointment date = today AND not completed
      if (queueFilter === 'today') {
        return apptDate === todayStr && !isCompleted;
      }
      // 2. Upcoming: Appointment date > today AND not completed
      if (queueFilter === 'upcoming') {
        return Boolean(apptDate) && apptDate > todayStr && !isCompleted;
      }
      // 3. Completed: SCANNED / IMAGES_AVAILABLE / COMPLETED / FINALIZED
      if (queueFilter === 'scanned') {
        return isCompleted;
      }
      // 4. All: Every case assigned to this radiographer
      return true;
    });

    const severityOrder: Record<string, number> = {
      Critical: 4,
      Severe: 3,
      Moderate: 2,
      Mild: 1,
    };

    return filtered.sort((a, b) => {
      // For 'All' tab: put pending before completed
      if (queueFilter === 'all') {
        const aDone = ['SCANNED', 'IMAGES_AVAILABLE', 'COMPLETED', 'FINALIZED'].includes(a.status);
        const bDone = ['SCANNED', 'IMAGES_AVAILABLE', 'COMPLETED', 'FINALIZED'].includes(b.status);
        if (aDone !== bDone) return aDone ? 1 : -1;
      }

      // For 'Upcoming': sort by earliest appointment date first
      if (queueFilter === 'upcoming') {
        const aDate = getCaseAppointmentDate(a);
        const bDate = getCaseAppointmentDate(b);
        if (aDate !== bDate) return aDate.localeCompare(bDate);
      }

      // Severity order (Critical > Severe > Moderate > Mild)
      const aSev = severityOrder[a.severity || 'Mild'] || 0;
      const bSev = severityOrder[b.severity || 'Mild'] || 0;
      if (aSev !== bSev) return bSev - aSev;

      // Appointment time (from scheduledAt ISO timestamp)
      const aTime = a.scheduledAt || '';
      const bTime = b.scheduledAt || '';
      if (aTime && bTime) return aTime.localeCompare(bTime);

      // Latest case first fallback
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }, [myCases, searchQuery, queueFilter, todayStr]);

  // Selected case object for uploading
  const selectedCase = useMemo(() => {
    return cases.find((c) => c.id === selectedCaseId);
  }, [cases, selectedCaseId]);

  // Handle direct case selection from URL or worklist
  useEffect(() => {
    if (caseIdFromUrl) {
      setSelectedCaseId(caseIdFromUrl);
      setActiveTab('upload');
    }
  }, [caseIdFromUrl]);

  // Flatten requested examinations into view items
  const flattenedViews = useMemo<FlattenedViewItem[]>(() => {
    if (!selectedCase || !selectedCase.requestedExaminations) return [];
    const items: FlattenedViewItem[] = [];
    selectedCase.requestedExaminations.forEach((ex, examIndex) => {
      ex.viewsOrProtocol.forEach((viewName) => {
        const id = `${ex.bodyPart}_${viewName}_${examIndex}`;
        items.push({ id, examIndex, bodyPart: ex.bodyPart, side: ex.side, viewName, notes: ex.notes });
      });
    });
    return items;
  }, [selectedCase]);

  // Auto-populate radiation dose benchmarks & reset checklist when case changes
  useEffect(() => {
    if (!selectedCase) {
      setCompletedViewIds({});
      return;
    }
    const initialChecked: Record<string, boolean> = {};
    flattenedViews.forEach((v) => {
      initialChecked[v.id] = false;
    });
    setCompletedViewIds(initialChecked);

    if (selectedCase.requestedExaminations && selectedCase.requestedExaminations[0]) {
      const benchmark = getEffectiveDoseForExam(
        selectedCase.modality || 'X-Ray',
        selectedCase.requestedExaminations[0].bodyPart
      );
      if (benchmark) setDosRadiasi(String(benchmark.dosMsv));
    }
  }, [selectedCase?.id]);

  const toggleViewCompleted = (id: string) => {
    setCompletedViewIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...selectedFiles]);
    selectedFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviews((prev) => {
          const updated = [...prev, event.target?.result as string];
          if (prev.length === 0) setActivePreviewIndex(0);
          return updated;
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      if (activePreviewIndex >= updated.length) {
        setActivePreviewIndex(Math.max(0, updated.length - 1));
      }
      return updated;
    });
  };

  const handleAiDraft = async () => {
    if (!selectedCase) return;
    setAnalyzingImage(true);
    try {
      if (previews.length > 0) {
        const targetImage = previews[activePreviewIndex] || previews[0];
        const result = await analyzeImageWithVisionAi(targetImage, selectedCase);
        setRadiographerFindings(result.findings);
        setRadiographerImpression(result.impression);
        toast.success(`Vision AI analyzed scan (${result.confidenceScore}% confidence).`);
      } else {
        const draft = generateAiReportDraft(selectedCase);
        setRadiographerFindings(draft.findings);
        setRadiographerImpression(draft.impression);
        toast.success(`Draft generated from case protocol (${draft.confidenceScore}% confidence).`);
      }
    } catch {
      toast.error('AI scan analysis failed. Please enter findings manually.');
    } finally {
      setAnalyzingImage(false);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedCase || previews.length === 0) {
      toast.error('Please attach at least one medical scan image.');
      return;
    }

    setUploading(true);
    try {
      const imageKeys: string[] = [];
      for (const dataUrl of previews) {
        const key = await saveImage(dataUrl);
        imageKeys.push(key);
      }

      const existingImages = selectedCase.images || [];
      const updatedImages = [...existingImages, ...imageKeys];

      const completedViewsList = flattenedViews
        .filter((v) => completedViewIds[v.id])
        .map((v) => `${v.bodyPart} - ${v.viewName}${v.side ? ` (${v.side})` : ''}`);

      const technicalFactors = {
        doseKvp: Number(doseKvp) || undefined,
        doseMas: Number(doseMas) || undefined,
        dosRadiasi: Number(dosRadiasi) || undefined,
        bilanganFilem: Number(bilanganFilem) || 1,
        bilanganCdDvd: Number(bilanganCdDvd) || 0,
        komen: komen.trim() || undefined,
        completedViews: completedViewsList,
      };

      await editCase(selectedCase.id, {
        status: 'IMAGES_AVAILABLE',
        images: updatedImages,
        scannedAt: new Date().toISOString(),
        radiographerFindings: radiographerFindings.trim() || undefined,
        radiographerImpression: radiographerImpression.trim() || undefined,
        routedToRole,
        ...technicalFactors,
      });

      await addAuditLog({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'SCANS_ACQUIRED_AND_UPLOADED',
        target: `cases/${selectedCase.id}`,
        details: `Radiographer ${currentUser.name} uploaded ${imageKeys.length} scan(s). Case forwarded to ${routedToRole}.`,
        timestamp: new Date().toISOString(),
      });

      toast.success(`Scans uploaded successfully! Case ${selectedCase.caseNumber} forwarded for clinical review.`);

      // Reset Form & switch back to worklist
      setFiles([]);
      setPreviews([]);
      setRadiographerFindings('');
      setRadiographerImpression('');
      setActiveTab('queue');
    } catch (err: any) {
      console.error('Scan upload error:', err);
      toast.error(err.message || 'Failed to complete scan upload.');
    } finally {
      setUploading(false);
    }
  };

  // Synchronize active tab with initialTab and URL search params
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    } else if (tabFromUrl === 'upload' || Boolean(caseIdFromUrl)) {
      setActiveTab('upload');
    } else {
      setActiveTab('queue');
    }
  }, [initialTab, tabFromUrl, caseIdFromUrl]);

  const startScanningCase = (caseItem: (typeof cases)[0]) => {
    setSelectedCaseId(caseItem.id);
    navigate(`/upload?caseId=${caseItem.id}`);
  };

  return (
    <div className="space-y-6">
      {/* ── HEADER ───────────────────────────────── */}
      <div className="space-y-3">
        {activeTab === 'queue' ? (
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="page-title">{t('My Cases', 'Senarai Kes Saya')}</h1>
              <p className="page-subtitle">
                {t(
                  'Cases assigned to you for imaging and scan acquisition.',
                  'Kes yang ditugaskan kepada anda untuk pengimejan dan pemerolehan imbasan.'
                )}
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span>
                <strong className="text-slate-900">{myCases.length}</strong> assigned
              </span>
              <span className="h-3.5 w-px bg-slate-200" />
              <span>
                <strong className="text-amber-700">{scheduledCases.length}</strong> pending
              </span>
              <span className="h-3.5 w-px bg-slate-200" />
              <span>
                <strong className="text-emerald-700">{completedCases.length}</strong> completed
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {/* ── TAB 1: CASES & SCHEDULE ───────────────────────────────────────── */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          {/* ── CASE CONTROLS ─────────────────────────────────────────────── */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:w-[340px]">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search cases, patients, examinations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#0F4C42] focus:bg-white focus:ring-2 focus:ring-[#0F4C42]/10"
                />
              </div>

              <div className="flex items-center gap-1 self-start rounded-lg border border-slate-200 bg-slate-50 p-0.5 sm:self-auto">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-semibold transition-all ${viewMode === 'list'
                    ? 'bg-white text-[#0F4C42] shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                  <ListFilter className="h-3.5 w-3.5" />
                  Cases
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('timetable')}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-semibold transition-all ${viewMode === 'timetable'
                    ? 'bg-white text-[#0F4C42] shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Schedule
                </button>
              </div>
            </div>

            {/* Filter navigation — deliberately flat instead of pill-heavy */}
            <div className="border-t border-slate-100 px-4">
              <div className="flex items-center gap-5 overflow-x-auto">
                {[
                  { key: 'today' as const, label: 'Today', count: todayCasesList.length },
                  { key: 'upcoming' as const, label: 'Upcoming', count: upcomingCasesList.length },
                  { key: 'scanned' as const, label: 'Completed', count: completedCasesList.length },
                  { key: 'all' as const, label: 'All', count: myCases.length },
                ].map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => setQueueFilter(filter.key)}
                    className={`relative flex h-10 shrink-0 items-center gap-1.5 border-b-2 text-xs font-semibold transition-colors ${queueFilter === filter.key
                      ? 'border-[#0F4C42] text-[#0F4C42]'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                  >
                    {filter.label}
                    {filter.count !== undefined && (
                      <span
                        className={`min-w-[20px] rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold ${queueFilter === filter.key
                          ? 'bg-emerald-50 text-[#0F4C42]'
                          : 'bg-slate-100 text-slate-500'
                          }`}
                      >
                        {filter.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── CASES VIEW ───────────────────────────────────────────────── */}
          {viewMode === 'list' ? (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              {/* Desktop column header */}
              <div className="hidden border-b border-slate-200 bg-slate-50/70 px-5 py-2.5 md:grid md:grid-cols-[minmax(250px,1.35fr)_minmax(250px,1.2fr)_minmax(210px,1fr)_185px] md:items-center md:gap-6">
                <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                  Case &amp; Patient
                </span>
                <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                  Examination
                </span>
                <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                  Location &amp; Appointment
                </span>
                <span className="text-right text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                  Status
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {filteredQueueCases.map((c) => {
                  const clinic = clinics.find((cl) => cl.id === c.clinicId || cl.name === c.clinicName);
                  const isCompleted = ['SCANNED', 'IMAGES_AVAILABLE', 'COMPLETED', 'FINALIZED'].includes(c.status);
                  const isReady = ['READY_FOR_SCAN', 'EXTERNAL_RADIOGRAPHER_ASSIGNED'].includes(c.status);

                  return (
                    <div
                      key={c.id}
                      className={`group relative px-5 py-4 transition-colors ${isReady ? 'bg-emerald-50/25 hover:bg-emerald-50/50' : 'hover:bg-slate-50/60'
                        }`}
                    >
                      {/* Subtle priority/status accent */}
                      <div
                        className={`absolute inset-y-0 left-0 w-0.5 ${c.severity === 'Critical'
                          ? 'bg-red-400'
                          : c.severity === 'Moderate'
                            ? 'bg-amber-300'
                            : isCompleted
                              ? 'bg-emerald-400'
                              : 'bg-transparent'
                          }`}
                      />

                      <div className="grid gap-4 md:grid-cols-[minmax(250px,1.35fr)_minmax(250px,1.2fr)_minmax(210px,1fr)_185px] md:items-center md:gap-6">
                        {/* Case / patient */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/case/${c.id}`}
                              className="font-mono text-[11px] font-bold text-[#0F4C42] hover:underline"
                            >
                              {c.caseNumber}
                            </Link>
                            <SeverityBadge severity={c.severity} />
                          </div>
                          <Link
                            to={`/case/${c.id}`}
                            className="mt-1 block truncate text-[13px] font-bold text-slate-900 hover:text-[#0F4C42]"
                          >
                            {c.patientName}
                          </Link>
                          <div className="mt-0.5 truncate font-mono text-[10px] text-slate-400">
                            {c.patientId}
                          </div>
                        </div>

                        {/* Examination */}
                        <div className="min-w-0">
                          <div className="truncate text-[12px] font-semibold text-slate-800">
                            {c.modality || 'X-Ray'} · {c.scanType}
                          </div>
                          {c.bodyRegion && (
                            <div className="mt-1 truncate text-[11px] text-slate-500">
                              {c.bodyRegion}
                            </div>
                          )}
                        </div>

                        {/* Location / appointment */}
                        <div className="min-w-0">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <span className="truncate text-[12px] font-medium text-slate-700">
                              {c.clinicName || 'Mobile Center'}
                            </span>
                            {clinic && (
                              <button
                                type="button"
                                onClick={() =>
                                  openWazeNavigation(
                                    clinic.latitude || 0,
                                    clinic.longitude || 0,
                                    clinic.address || c.clinicName
                                  )
                                }
                                className="shrink-0 rounded p-0.5 text-slate-300 transition-colors hover:bg-emerald-50 hover:text-[#0F4C42]"
                                title="Navigate to clinic with Waze"
                              >
                                <Navigation className="h-3 w-3" />
                              </button>
                            )}
                          </div>

                          <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-500">
                            <Clock className="h-3 w-3 shrink-0 text-slate-400" />
                            <span className="truncate">
                              {c.officeTarikhAppointment || (c.scheduledAt ? new Date(c.scheduledAt).toLocaleDateString() : 'No appointment')}
                              {c.officeMasaAppointment ? ` · ${c.officeMasaAppointment}` : ''}
                            </span>
                          </div>

                          <div className="mt-1 truncate text-[10px] text-slate-400">
                            MO: {c.initialMoName || c.registeredByName || 'Initial MO'}
                          </div>
                        </div>

                        {/* Status + one clear action */}
                        <div className="flex items-center justify-between gap-3 md:justify-end">
                          <StatusBadge status={c.status} />

                          <button
                            type="button"
                            onClick={() => startScanningCase(c)}
                            className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[11px] font-bold transition-colors ${isCompleted
                              ? 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                              : 'bg-[#0F4C42] text-white hover:bg-[#0c3c34]'
                              }`}
                          >
                            {isCompleted ? (
                              <>
                                <Upload className="h-3 w-3" />
                                Re-upload
                              </>
                            ) : (
                              <>
                                <Upload className="h-3 w-3" />
                                Scan &amp; Upload
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredQueueCases.length === 0 && (
                <div className="px-6 py-14 text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                    <Calendar className="h-5 w-5 text-slate-400" />
                  </div>
                  <p className="mt-3 text-xs font-semibold text-slate-700">No cases found</p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Try another filter or search term.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* ── SCHEDULE VIEW ───────────────────────────────────────────── */
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Today's Schedule</h3>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    Appointments and assigned imaging cases
                  </p>
                </div>
                <span className="text-xs font-semibold text-slate-500">
                  {filteredQueueCases.length} {filteredQueueCases.length === 1 ? 'case' : 'cases'}
                </span>
              </div>

              <div className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-5">
                {HOURLY_SLOTS.map((slot) => {
                  const slotCases = filteredQueueCases.filter((c) => {
                    if (!c.scheduledAt) return false;
                    const d = new Date(c.scheduledAt);
                    if (isNaN(d.getTime())) return false;
                    const h = d.getHours();
                    const ampm = h >= 12 ? 'PM' : 'AM';
                    const h12 = h % 12 === 0 ? 12 : h % 12;
                    const slotLabel = `${String(h12).padStart(2, '0')}:00 ${ampm}`;
                    return slotLabel === slot;
                  });

                  return (
                    <div key={slot} className="min-h-[150px] bg-white p-3">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                          <Clock className="h-3 w-3 text-[#0F4C42]" />
                          {slot}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {slotCases.length}
                        </span>
                      </div>

                      <div className="mt-2 space-y-2">
                        {slotCases.map((c) => (
                          <div key={c.id} className="rounded-lg border border-slate-200 bg-slate-50/60 p-2.5">
                            <Link to={`/case/${c.id}`} className="block truncate text-[11px] font-bold text-slate-900 hover:text-[#0F4C42]">
                              {c.patientName}
                            </Link>
                            <div className="mt-1 truncate text-[10px] text-slate-500">{c.scanType}</div>
                            <button
                              type="button"
                              onClick={() => startScanningCase(c)}
                              className="mt-2 w-full rounded-md bg-[#0F4C42] py-1.5 text-[10px] font-bold text-white hover:bg-[#0c3c34]"
                            >
                              {['SCANNED', 'IMAGES_AVAILABLE', 'COMPLETED', 'FINALIZED'].includes(c.status)
                                ? 'View Scan'
                                : 'Scan Now'}
                            </button>
                          </div>
                        ))}
                        {slotCases.length === 0 && (
                          <p className="py-7 text-center text-[10px] text-slate-300">No appointment</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: SCAN ACQUISITION & UPLOAD WORKSHEET ─────────────────── */}
      {activeTab === 'upload' && (
        <form onSubmit={handleUploadSubmit} className="space-y-6">
          {/* Case Selector Card */}
          <div className="card bg-white p-5 border border-slate-200 rounded-xl shadow-sm space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5 uppercase tracking-wider">
                Select Scheduled Case to Scan <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={selectedCaseId}
                onChange={(e) => setSelectedCaseId(e.target.value)}
                className="select-field text-xs"
              >
                <option value="">-- Choose a scheduled case from queue --</option>
                {myCases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.caseNumber} — {c.patientName} ({c.scanType}) [{c.status}]
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
                  <span className="text-[11px] font-semibold text-slate-500 block uppercase">Modality &amp; Procedure</span>
                  <span className="font-bold text-teal-900 mt-0.5 block">
                    {selectedCase.modality || 'X-Ray'} — {selectedCase.scanType}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Case #{selectedCase.caseNumber}</span>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block uppercase">Priority &amp; Status</span>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <SeverityBadge severity={selectedCase.severity} />
                    <StatusBadge status={selectedCase.status} />
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block uppercase">Clinical Indication</span>
                  <p className="text-[11px] text-slate-700 font-medium truncate mt-0.5">
                    {selectedCase.indication || 'Routine screening'}
                  </p>
                </div>
              </div>
            )}

            {/* Task Provenance & Origin Details */}
            {selectedCase && (
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-800 shrink-0" />
                  <div>
                    <span className="font-bold text-emerald-900">Task Source / Origin:</span>
                    <span className="text-emerald-800 ml-1">
                      {selectedCase.externalReferral
                        ? `External Referral via ${selectedCase.externalReferral.assignedFacilityName || 'External Facility'} (Dispatched by ${selectedCase.externalReferral.bemzOfficerName || selectedCase.externalReferral.assignedHospitalAdminName || 'BEMS / Hospital Admin'})`
                        : `Assigned by Primary Facility (${selectedCase.clinicName || 'Local Center'})`}
                    </span>
                  </div>
                </div>
                <div className="text-[11px] text-emerald-800 font-medium">
                  Primary Medical Officer: <span className="font-bold text-emerald-950">{selectedCase.initialMoName || selectedCase.registeredByName || 'Initial MO'}</span>
                </div>
              </div>
            )}

            {/* Machine Check / Unavailable Action Banner */}
            {selectedCase && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs">
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-amber-700 shrink-0" />
                  <div>
                    <span className="font-bold text-amber-900">Equipment Check / Machine Status:</span>
                    <span className="text-amber-800 ml-1">
                      {selectedCase.machineIssue
                        ? `Unavailable (${selectedCase.machineIssue.reason}) — Referral routed to BEMS`
                        : 'Internal equipment operating normally'}
                    </span>
                  </div>
                </div>

                {!selectedCase.machineIssue && (
                  <button
                    type="button"
                    onClick={() => setShowMachineModal(true)}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors flex items-center gap-1.5 shrink-0 text-xs"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Report Equipment Issue &amp; Request BEMS Referral</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {selectedCase && (
            <div className="space-y-4">
              {/* ── 1. UPLOAD MEDICAL SCANS / DICOM (FULL-WIDTH SECTION) ────────── */}
              <div className="card bg-white p-5 border border-slate-200 rounded-xl shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <div>
                    <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <Upload className="w-4 h-4 text-[#0F4C42]" />
                      <span>1. Upload Medical Scans / DICOM</span>
                    </h2>

                  </div>

                  <div className="flex items-center gap-2">
                    {previews.length > 0 && (
                      <button
                        type="button"
                        onClick={handleAiDraft}
                        disabled={analyzingImage}
                        className="btn-secondary text-xs flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                        <span>{analyzingImage ? 'Analyzing...' : 'Run Vision AI Check'}</span>
                      </button>
                    )}

                  </div>
                </div>

                <input
                  type="file"
                  id="unifiedScanUpload"
                  multiple
                  accept="image/*,.dcm"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {/* Requested Views Checklist (if views exist) */}
                {flattenedViews.length > 0 && (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                        Requested Views Checklist:
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {Object.values(completedViewIds).filter(Boolean).length} of {flattenedViews.length} views acquired
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {flattenedViews.map((v) => {
                        const isChecked = Boolean(completedViewIds[v.id]);
                        return (
                          <button
                            type="button"
                            key={v.id}
                            onClick={() => toggleViewCompleted(v.id)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all select-none ${
                              isChecked
                                ? 'bg-emerald-50 border-emerald-500 text-[#0F4C42] shadow-xs'
                                : 'bg-white border-slate-300 text-slate-700 hover:border-slate-400'
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                isChecked
                                  ? 'bg-[#0F4C42] border-[#0F4C42] text-white'
                                  : 'border-slate-400 bg-white'
                              }`}
                            >
                              {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span>
                              {v.bodyPart} — {v.viewName} {v.side && `[${v.side}]`}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Empty State Dropzone */}
                {previews.length === 0 ? (
                  <label
                    htmlFor="unifiedScanUpload"
                    className="border-2 border-dashed border-slate-300 hover:border-[#0F4C42] rounded-xl p-10 text-center bg-slate-50/60 transition-colors cursor-pointer space-y-3 flex flex-col items-center justify-center block"
                  >
                    <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#0F4C42]">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-[#0F4C42] block">
                        Click to browse or drag and drop scans here
                      </span>
                      <span className="text-[11px] text-slate-400 mt-0.5 block">
                        Supported formats: DICOM (.dcm), JPEG, PNG (High-resolution diagnostic captures)
                      </span>
                    </div>
                  </label>
                ) : (
                  /* Full-Featured Image Preview Viewer */
                  <div className="space-y-4 pt-1">
                    {/* Thumbnail Selector Strip */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2">
                      {previews.map((src, i) => (
                        <div
                          key={i}
                          onClick={() => setActivePreviewIndex(i)}
                          className={`relative group rounded-lg overflow-hidden border-2 cursor-pointer shrink-0 w-24 h-20 transition-all ${activePreviewIndex === i
                            ? 'ring-2 ring-[#0F4C42] border-[#0F4C42] scale-[1.02]'
                            : 'border-slate-200 hover:border-slate-400'
                            }`}
                        >
                          <img src={src} alt={`Scan ${i + 1}`} className="w-full h-full object-cover bg-black" />
                          <div className="absolute bottom-0 inset-x-0 bg-black/60 px-1 py-0.5 text-[9px] text-white font-mono text-center truncate">
                            Scan #{i + 1}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFile(i);
                            }}
                            className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove scan"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}

                      {/* Add More Thumbnail Button */}
                      <label
                        htmlFor="unifiedScanUpload"
                        className="w-24 h-20 border-2 border-dashed border-slate-300 hover:border-[#0F4C42] rounded-lg flex flex-col items-center justify-center text-slate-400 hover:text-[#0F4C42] cursor-pointer shrink-0 bg-slate-50 transition-colors"
                        title="Add more scan files"
                      >
                        <Plus className="w-5 h-5" />
                        <span className="text-[10px] font-semibold mt-1">Add More</span>
                      </label>
                    </div>

                    {/* Main Full-Size Image Viewer */}
                    {previews[activePreviewIndex] && (
                      <div className="relative rounded-xl overflow-hidden border border-slate-300 bg-slate-950 flex flex-col items-center justify-center min-h-[420px] max-h-[560px]">
                        <img
                          src={previews[activePreviewIndex]}
                          alt={`Full preview ${activePreviewIndex + 1}`}
                          className="max-h-[520px] w-auto max-w-full object-contain cursor-zoom-in"
                          onClick={() => setLightboxSrc(previews[activePreviewIndex])}
                        />

                        {/* Top Viewer Overlay Bar */}
                        <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none">
                          <span className="bg-black/75 backdrop-blur-xs text-white text-xs font-mono px-3 py-1.5 rounded-lg border border-white/10 pointer-events-auto">
                            Viewing Capture {activePreviewIndex + 1} of {previews.length}
                          </span>

                          <div className="flex items-center gap-2 pointer-events-auto">
                            <button
                              type="button"
                              onClick={() => setLightboxSrc(previews[activePreviewIndex])}
                              className="px-3 py-1.5 bg-black/75 hover:bg-black text-white text-xs font-semibold rounded-lg border border-white/10 flex items-center gap-1.5 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Full Screen</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => removeFile(activePreviewIndex)}
                              className="px-3 py-1.5 bg-red-600/90 hover:bg-red-600 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Remove</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── 2. PRELIMINARY OBSERVATIONS & FINDINGS (FULL-WIDTH) ─────────── */}
              <div className="card bg-white p-5 border border-slate-200 rounded-xl shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#0F4C42]" />
                    <span>2. Preliminary Observations &amp; Findings</span>
                  </h2>
                </div>

                <div className="space-y-1.5">
                  <textarea
                    value={radiographerFindings}
                    onChange={(e) => setRadiographerFindings(e.target.value)}
                    placeholder="Write your technical remarks, clinical impressions, and any observations about the scan..."
                    rows={7}
                    className="w-full bg-white border border-slate-300 rounded-lg p-3.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F4C42]/20 focus:border-[#0F4C42] resize-none min-h-[250px]"
                  />

                </div>
              </div>

              {/* ── 3 & 4. TECHNICAL FACTORS & FORWARD REVIEW (TWO INDIVIDUAL CARDS SIDE-BY-SIDE) ── */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                {/* CARD 1: MOH Technical Factors */}
                <div className="lg:col-span-6 card bg-white p-5 border border-slate-200 rounded-xl shadow-sm flex flex-col justify-between space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-[#0F4C42]" />
                      <span>3. MOH Technical Factors</span>
                    </h2>
                    <span className="text-[11px] text-slate-500">MOH PER.SS-RA301</span>
                  </div>

                  <div className="space-y-3 flex-1 flex flex-col justify-center">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                      Exposure &amp; Radiation Factors
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">kVp</label>
                        <input
                          type="text"
                          value={doseKvp}
                          onChange={(e) => setDoseKvp(e.target.value)}
                          placeholder="e.g. 75"
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">mAs</label>
                        <input
                          type="text"
                          value={doseMas}
                          onChange={(e) => setDoseMas(e.target.value)}
                          placeholder="e.g. 12"
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">Dose (mSv)</label>
                        <input
                          type="text"
                          value={dosRadiasi}
                          onChange={(e) => setDosRadiasi(e.target.value)}
                          placeholder="e.g. 0.02"
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">Film Count</label>
                        <input
                          type="text"
                          value={bilanganFilem}
                          onChange={(e) => setBilanganFilem(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* CARD 2: Forward Review & Dispatch */}
                <div className="lg:col-span-6 card bg-white p-5 border border-slate-200 rounded-xl shadow-sm flex flex-col justify-between space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#0F4C42]" />
                      <span>4. Forward Review &amp; Dispatch</span>
                    </h2>
                    <span className="text-[11px] text-slate-500">Routing &amp; Submission</span>
                  </div>

                  <div className="space-y-4 flex-1 flex flex-col justify-between">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Forward Review Pathway <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={routedToRole}
                        onChange={(e) => setRoutedToRole(e.target.value as 'Medical Officer' | 'Radiologist')}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium"
                      >
                        <option value="Medical Officer">Initial Medical Officer (Primary Case Review)</option>
                        <option value="Radiologist">Specialist Radiologist (Formal Diagnostic Reporting)</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setActiveTab('queue')}
                        className="btn-secondary text-xs"
                      >
                        Cancel / Back to Queue
                      </button>
                      <button
                        type="submit"
                        disabled={uploading || previews.length === 0}
                        className="btn-primary text-xs flex items-center gap-1.5 px-5 py-2.5 shadow-sm"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{uploading ? 'Uploading & Forwarding...' : 'Complete & Dispatch Scans'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </form>
      )}

      {/* Machine Unavailable Modal (rendered outside form to prevent event bubbling) */}
      {selectedCase && (
        <MachineUnavailableModal
          isOpen={showMachineModal}
          onClose={() => setShowMachineModal(false)}
          caseItem={selectedCase}
        />
      )}

      {/* ── LIGHTBOX MODAL ───────────────────────────────────────────────── */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxSrc(null)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
            onClick={() => setLightboxSrc(null)}
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={lightboxSrc}
            alt="Expanded scan"
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}