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

  // Radiographer's assigned cases (Local Clinic, Public Hospital, or Private Hospital)
  const myCases = useMemo(() => {
    if (!currentUser) return [];
    return cases.filter(
      (c) =>
        c.radiographerId === currentUser.id ||
        c.registeredById === currentUser.id ||
        c.externalRadiographerId === currentUser.id ||
        (c.externalReferral && c.externalReferral.assignedRadiographerId === currentUser.id) ||
        ((currentUser.role === 'Public Hospital Radiographer' || currentUser.role === 'Private Hospital Radiographer') &&
          c.status === 'EXTERNAL_RADIOGRAPHER_ASSIGNED')
    );
  }, [cases, currentUser]);

  const scheduledCases = myCases.filter(
    (c) => c.status === 'SCHEDULED' || c.status === 'READY_FOR_SCAN' || c.status === 'EXTERNAL_RADIOGRAPHER_ASSIGNED'
  );
  const completedCases = myCases.filter(
    (c) => c.status === 'SCANNED' || c.status === 'IMAGES_AVAILABLE' || c.status === 'COMPLETED' || c.status === 'FINALIZED'
  );

  // Filtered queue items
  const filteredQueueCases = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const q = searchQuery.toLowerCase().trim();

    return myCases.filter((c) => {
      const matchSearch =
        !q ||
        c.caseNumber.toLowerCase().includes(q) ||
        c.patientName.toLowerCase().includes(q) ||
        (c.scanType || '').toLowerCase().includes(q) ||
        (c.clinicName || '').toLowerCase().includes(q);

      if (!matchSearch) return false;

      const caseDate = (c.officeTarikhAppointment || c.scheduledAt || c.createdAt || '').split('T')[0];

      if (queueFilter === 'today') {
        return caseDate === todayStr || c.status === 'SCHEDULED' || c.status === 'READY_FOR_SCAN';
      }
      if (queueFilter === 'upcoming') {
        return caseDate > todayStr;
      }
      if (queueFilter === 'unscheduled') {
        return !c.scheduledAt && !c.officeTarikhAppointment;
      }
      if (queueFilter === 'scanned') {
        return ['SCANNED', 'IMAGES_AVAILABLE', 'COMPLETED', 'FINALIZED'].includes(c.status);
      }
      return true;
    });
  }, [myCases, searchQuery, queueFilter]);

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

  // Auto-populate radiation dose benchmarks
  useEffect(() => {
    if (!selectedCase) return;
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
  }, [selectedCase, flattenedViews]);

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

  const startScanningCase = (caseItem: (typeof cases)[0]) => {
    setSelectedCaseId(caseItem.id);
    setActiveTab('upload');
    setSearchParams({ caseId: caseItem.id, tab: 'upload' });
  };

  return (
    <div className="space-y-6">
      {/* ── UNIFIED HEADER & TOP METRICS ───────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 text-[10px] font-bold bg-[#0F4C42] text-white rounded">
              RADIOGRAPHY WORKSPACE &amp; SCANNING HUB
            </span>
            <span className="text-xs text-slate-500 font-medium">Duty Session: {currentUser?.name}</span>
          </div>
          <h1 className="page-title">Scan Management &amp; Acquisition Hub</h1>
          <p className="page-subtitle">
            Manage daily appointments, assigned scan queues, and clinical image acquisitions in one unified workspace.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setActiveTab('queue');
              setSearchParams({});
            }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all ${
              activeTab === 'queue' ? 'bg-white text-[#0F4C42] shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Worklist &amp; Schedule ({scheduledCases.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all ${
              activeTab === 'upload' ? 'bg-[#0F4C42] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Scan Acquisition &amp; Upload</span>
          </button>
        </div>
      </div>

      {/* ── TOP STATS BAR ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-3 bg-white border border-slate-200">
          <span className="text-[11px] text-slate-500 font-medium block">Total Assigned Cases</span>
          <span className="text-xl font-bold text-slate-900 mt-0.5 block">{myCases.length}</span>
        </div>
        <div className="card p-3 bg-white border border-slate-200">
          <span className="text-[11px] text-amber-700 font-medium block">Pending Scans</span>
          <span className="text-xl font-bold text-amber-900 mt-0.5 block">{scheduledCases.length}</span>
        </div>
        <div className="card p-3 bg-white border border-slate-200">
          <span className="text-[11px] text-emerald-700 font-medium block">Imaging Completed</span>
          <span className="text-xl font-bold text-emerald-900 mt-0.5 block">{completedCases.length}</span>
        </div>
        <div className="card p-3 bg-white border border-slate-200">
          <span className="text-[11px] text-blue-700 font-medium block">Assigned Location</span>
          <span className="text-xs font-bold text-slate-800 mt-1 truncate block">
            {clinics.find((c) => c.id === currentUser?.deploymentLocationId)?.name || 'Klinik Kesihatan Mobile'}
          </span>
        </div>
      </div>

      {/* ── TAB 1: WORKLIST & SCHEDULE (APPOINTMENTS & QUEUE) ──────────── */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search case #, patient, scan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="text-xs pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0F4C42] w-56"
                />
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => setQueueFilter('today')}
                  className={`px-3 py-1 rounded-lg font-medium transition-all ${
                    queueFilter === 'today' ? 'bg-[#0F4C42] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Today ({scheduledCases.length})
                </button>
                <button
                  type="button"
                  onClick={() => setQueueFilter('upcoming')}
                  className={`px-3 py-1 rounded-lg font-medium transition-all ${
                    queueFilter === 'upcoming' ? 'bg-[#0F4C42] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Upcoming
                </button>
                <button
                  type="button"
                  onClick={() => setQueueFilter('scanned')}
                  className={`px-3 py-1 rounded-lg font-medium transition-all ${
                    queueFilter === 'scanned' ? 'bg-[#0F4C42] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Completed ({completedCases.length})
                </button>
                <button
                  type="button"
                  onClick={() => setQueueFilter('all')}
                  className={`px-3 py-1 rounded-lg font-medium transition-all ${
                    queueFilter === 'all' ? 'bg-[#0F4C42] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  All ({myCases.length})
                </button>
              </div>
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded flex items-center gap-1 ${
                  viewMode === 'list' ? 'bg-white text-[#0F4C42] shadow-xs' : 'text-slate-500'
                }`}
                title="List View"
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span>Worklist</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('timetable')}
                className={`p-1.5 rounded flex items-center gap-1 ${
                  viewMode === 'timetable' ? 'bg-white text-[#0F4C42] shadow-xs' : 'text-slate-500'
                }`}
                title="Hourly Timetable Grid"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Timetable Grid</span>
              </button>
            </div>
          </div>

          {/* List View */}
          {viewMode === 'list' ? (
            <div className="space-y-3">
              {filteredQueueCases.map((c) => {
                const clinic = clinics.find((cl) => cl.id === c.clinicId || cl.name === c.clinicName);
                const isCompleted = ['SCANNED', 'IMAGES_AVAILABLE', 'COMPLETED', 'FINALIZED'].includes(c.status);

                return (
                  <div
                    key={c.id}
                    className={`card p-4 border transition-all ${
                      isCompleted ? 'bg-slate-50/70 border-slate-200' : 'bg-white border-slate-300 shadow-xs'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Link to={`/case/${c.id}`} className="font-mono font-bold text-xs text-[#0F4C42] hover:underline">
                            {c.caseNumber}
                          </Link>
                          <SeverityBadge severity={c.severity} />
                          <StatusBadge status={c.status} />
                        </div>

                        <p className="text-xs font-bold text-slate-900 mt-1">
                          Patient: {c.patientName} <span className="text-[10px] text-slate-500 font-mono">({c.patientId})</span>
                        </p>

                        <p className="text-[11px] text-slate-600">
                          Exam: <strong className="text-slate-800">{c.modality || 'X-Ray'} — {c.scanType}</strong>
                          {c.bodyRegion ? ` · ${c.bodyRegion}` : ''}
                        </p>

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-0.5">
                          <span>Clinic: {c.clinicName || 'Mobile Center'}</span>
                          <span>Registered by: {getCaseRegistrar(c)}</span>
                          {(c.officeTarikhAppointment || c.scheduledAt) && (
                            <span className="text-[#0F4C42] font-semibold flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Scheduled: {c.officeTarikhAppointment || new Date(c.scheduledAt!).toLocaleDateString()} {c.officeMasaAppointment || ''}
                            </span>
                          )}
                        </div>

                        {/* Task Origin & Dispatcher Provenance */}
                        {c.externalReferral ? (
                          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-purple-50 border border-purple-200 rounded text-[10px] text-purple-900 font-semibold w-fit mt-1">
                            <Building2 className="w-3 h-3 text-purple-700" />
                            <span>
                              Referred via BEMS / External Facility &middot; Assigned by {c.externalReferral.bemzOfficerName || c.externalReferral.assignedHospitalAdminName || 'BEMS'} &middot; Origin MO: {c.initialMoName || 'Initial MO'}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] text-slate-700 font-medium w-fit mt-1">
                            <span>Origin: {c.clinicName || 'Local Center'} &middot; Primary MO: {c.initialMoName || c.registeredByName || 'Initial MO'}</span>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">
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
                            className="btn-secondary text-xs flex items-center gap-1 text-[#0F4C42] hover:bg-emerald-50"
                            title="Navigate to clinic with Waze"
                          >
                            <Navigation className="w-3.5 h-3.5" />
                            <span>Waze</span>
                          </button>
                        )}

                        <Link to={`/case/${c.id}`} className="btn-secondary text-xs">
                          View Details
                        </Link>

                        {!isCompleted ? (
                          <button
                            type="button"
                            onClick={() => startScanningCase(c)}
                            className="btn-primary text-xs flex items-center gap-1 px-3 py-1.5"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Scan &amp; Upload</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startScanningCase(c)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Re-upload</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredQueueCases.length === 0 && (
                <div className="card p-12 text-center text-slate-400 space-y-2">
                  <Calendar className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs font-semibold text-slate-600">No cases found in this view filter.</p>
                </div>
              )}
            </div>
          ) : (
            /* Timetable Grid View */
            <div className="card p-4 space-y-3 bg-white">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Today's Hourly Scanning Slots
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {HOURLY_SLOTS.map((slot) => {
                  const slotCases = filteredQueueCases.filter(
                    (c) => c.officeMasaAppointment?.toLowerCase().includes(slot.toLowerCase().slice(0, 5))
                  );

                  return (
                    <div key={slot} className="border border-slate-200 rounded-lg p-3 space-y-2 bg-slate-50/50">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                        <span className="font-mono text-xs font-bold text-slate-800 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#0F4C42]" />
                          {slot}
                        </span>
                        <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-bold">
                          {slotCases.length}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {slotCases.map((c) => (
                          <div key={c.id} className="bg-white border border-slate-200 rounded p-2 text-xs space-y-1">
                            <div className="font-bold text-slate-900 truncate">{c.patientName}</div>
                            <div className="text-[10px] text-slate-500 truncate">{c.scanType}</div>
                            <button
                              type="button"
                              onClick={() => startScanningCase(c)}
                              className="w-full text-center py-1 bg-[#0F4C42] hover:bg-[#0c3c34] text-white text-[10px] font-bold rounded"
                            >
                              Scan Now
                            </button>
                          </div>
                        ))}
                        {slotCases.length === 0 && (
                          <p className="text-[10px] text-slate-400 py-3 text-center italic">Slot open</p>
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
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* UPLOAD DROPZONE PANEL (Left Column) */}
              <div className="lg:col-span-7 card bg-white p-5 border border-slate-200 rounded-xl shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Upload className="w-4 h-4 text-[#0F4C42]" />
                    <span>1. Upload Medical Scans / DICOM</span>
                  </h2>
                  <span className="text-[11px] text-slate-500">Attach high-resolution captures</span>
                </div>

                {/* Dropzone */}
                <div className="border-2 border-dashed border-slate-300 hover:border-[#0F4C42] rounded-xl p-6 text-center bg-slate-50/60 transition-colors">
                  <input
                    type="file"
                    id="unifiedScanUpload"
                    multiple
                    accept="image/*,.dcm"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="unifiedScanUpload" className="cursor-pointer space-y-2 flex flex-col items-center">
                    <Upload className="w-8 h-8 text-slate-400" />
                    <span className="text-xs font-semibold text-[#0F4C42]">
                      Click to browse or drag and drop scans here
                    </span>
                    <span className="text-[11px] text-slate-400">Supported formats: DICOM, JPEG, PNG</span>
                  </label>
                </div>

                {/* Previews */}
                {previews.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">
                        Acquired Image Gallery ({previews.length})
                      </span>
                      <button
                        type="button"
                        onClick={handleAiDraft}
                        disabled={analyzingImage}
                        className="btn-secondary text-xs flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                        <span>{analyzingImage ? 'Analyzing...' : 'Run Vision AI Check'}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      {previews.map((src, i) => (
                        <div
                          key={i}
                          onClick={() => setActivePreviewIndex(i)}
                          className={`relative group rounded-lg overflow-hidden border cursor-pointer ${
                            activePreviewIndex === i ? 'ring-2 ring-[#0F4C42] border-[#0F4C42]' : 'border-slate-200'
                          }`}
                        >
                          <img src={src} alt={`Scan ${i + 1}`} className="w-full h-20 object-contain bg-black" />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFile(i);
                            }}
                            className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ACQUIRED VIEWS & TECHNICAL FACTORS (Right Column) */}
              <div className="lg:col-span-5 space-y-4">
                {/* Views Checklist */}
                {flattenedViews.length > 0 && (
                  <div className="card bg-white p-5 border border-slate-200 rounded-xl shadow-sm space-y-3">
                    <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2">
                      <CheckSquare className="w-4 h-4 text-[#0F4C42]" />
                      <span>Requested Views Checklist</span>
                    </h2>
                    <div className="space-y-2">
                      {flattenedViews.map((v) => (
                        <label
                          key={v.id}
                          className="flex items-start gap-2.5 p-2 rounded-lg border border-slate-200 bg-slate-50/50 cursor-pointer text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={Boolean(completedViewIds[v.id])}
                            onChange={() => toggleViewCompleted(v.id)}
                            className="mt-0.5 rounded text-[#0F4C42] focus:ring-[#0F4C42]"
                          />
                          <div>
                            <span className="font-bold text-slate-900">
                              {v.bodyPart} — {v.viewName}
                            </span>
                            {v.side && <span className="text-slate-500 ml-1">[{v.side}]</span>}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Technical Factors */}
                <div className="card bg-white p-5 border border-slate-200 rounded-xl shadow-sm space-y-3">
                  <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2">
                    <SlidersHorizontal className="w-4 h-4 text-[#0F4C42]" />
                    <span>MOH Technical Factors</span>
                  </h2>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">kVp</label>
                      <input
                        type="text"
                        value={doseKvp}
                        onChange={(e) => setDoseKvp(e.target.value)}
                        placeholder="e.g. 75"
                        className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">mAs</label>
                      <input
                        type="text"
                        value={doseMas}
                        onChange={(e) => setDoseMas(e.target.value)}
                        placeholder="e.g. 12"
                        className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Radiation Dose (mSv)</label>
                      <input
                        type="text"
                        value={dosRadiasi}
                        onChange={(e) => setDosRadiasi(e.target.value)}
                        placeholder="e.g. 0.02"
                        className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Film Count</label>
                      <input
                        type="text"
                        value={bilanganFilem}
                        onChange={(e) => setBilanganFilem(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Preliminary Findings & Review Pathway */}
              <div className="lg:col-span-12 card bg-white p-5 border border-slate-200 rounded-xl shadow-sm space-y-4">
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2">
                  <FileText className="w-4 h-4 text-[#0F4C42]" />
                  <span>Preliminary Observations &amp; Review Forwarding</span>
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Preliminary Observations / Findings
                    </label>
                    <textarea
                      value={radiographerFindings}
                      onChange={(e) => setRadiographerFindings(e.target.value)}
                      placeholder="Note any anatomic findings, exposure quality, or patient positioning notes..."
                      rows={3}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5"
                    />
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Forward Review Pathway <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={routedToRole}
                        onChange={(e) => setRoutedToRole(e.target.value as 'Medical Officer' | 'Radiologist')}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2"
                      >
                        <option value="Medical Officer">Initial Medical Officer (Primary Case Review)</option>
                        <option value="Radiologist">Specialist Radiologist (Formal Diagnostic Reporting)</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
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
                        className="btn-primary text-xs flex items-center gap-1.5 px-5 py-2.5"
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
