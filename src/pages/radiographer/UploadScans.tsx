import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ux/Toast';
import { useLanguage } from '../../context/LanguageContext';
import {
  Upload, Image as ImageIcon, X, CheckSquare, Zap, ShieldCheck,
  FileText, Sparkles, Loader, ZoomIn, Check, Circle,
} from 'lucide-react';
import { saveImage } from '../../services/imageStorage';
import { getEffectiveDoseForExam } from '../../data/effectiveDoseTable';
import { analyzeImageWithVisionAi } from '../../services/visionAiAnalyzer';
import { generateAiReportDraft } from '../../services/aiReportingCopilot';

interface FlattenedViewItem {
  id: string;
  examIndex: number;
  bodyPart: string;
  side?: string;
  viewName: string;
  notes?: string;
}

interface StepDef {
  id: string;
  label: string;
  sublabel?: string;
  optional?: boolean;
}

const STEPS: StepDef[] = [
  { id: 'case',     label: 'Select Case' },
  { id: 'exam',     label: 'Exam Views' },
  { id: 'images',   label: 'Upload Images' },
  { id: 'findings', label: 'Findings' },
  { id: 'exposure', label: 'Exposure Params', optional: true },
  { id: 'qa',       label: 'Quality Control' },
  { id: 'route',    label: 'Route Case' },
];

export default function UploadScans() {
  const [searchParams] = useSearchParams();
  const caseIdFromUrl = searchParams.get('caseId');
  const { currentUser } = useAuth();
  const { cases, editCase, addAuditLog } = useData();
  const { t } = useLanguage();
  const toast = useToast();

  const [selectedCaseId, setSelectedCaseId] = useState(caseIdFromUrl || '');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [routedToRole, setRoutedToRole] = useState<'Medical Officer' | 'Radiologist'>('Medical Officer');

  // Lightbox
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  // Technical Exposure Factors
  const [doseKvp, setDoseKvp] = useState('');
  const [doseMas, setDoseMas] = useState('');
  const [dosRadiasi, setDosRadiasi] = useState('');
  const [bilanganFilem, setBilanganFilem] = useState('1');
  const [bilanganCdDvd, setBilanganCdDvd] = useState('0');
  const [komen, setKomen] = useState('');

  // Radiographer Findings
  const [radiographerFindings, setRadiographerFindings] = useState('');
  const [radiographerImpression, setRadiographerImpression] = useState('');
  const [analyzingImage, setAnalyzingImage] = useState(false);

  // QA
  const [qaPatientIdVerified, setQaPatientIdVerified] = useState(true);
  const [qaMarkerVerified, setQaMarkerVerified] = useState(true);
  const [qaQualityVerified, setQaQualityVerified] = useState(true);

  // Completed Views
  const [completedViewIds, setCompletedViewIds] = useState<Record<string, boolean>>({});

  // Active section (for sidebar highlight)
  const [activeSection, setActiveSection] = useState('case');

  // Section refs for scroll-to and intersection
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (caseIdFromUrl) setSelectedCaseId(caseIdFromUrl);
  }, [caseIdFromUrl]);

  const availableCases = cases.filter(
    (c) => c.status === 'SCHEDULED' || c.id === caseIdFromUrl || c.status === 'CREATED'
  );

  const selectedCase = useMemo(() => availableCases.find((c) => c.id === selectedCaseId), [availableCases, selectedCaseId]);

  const flattenedViews = useMemo<FlattenedViewItem[]>(() => {
    if (!selectedCase?.requestedExaminations) return [];
    const items: FlattenedViewItem[] = [];
    selectedCase.requestedExaminations.forEach((ex, examIndex) => {
      ex.viewsOrProtocol.forEach((viewName) => {
        items.push({ id: `${ex.bodyPart}_${viewName}_${examIndex}`, examIndex, bodyPart: ex.bodyPart, side: ex.side, viewName, notes: ex.notes });
      });
    });
    return items;
  }, [selectedCase]);

  useEffect(() => {
    if (!selectedCase) return;
    const initialChecked: Record<string, boolean> = {};
    flattenedViews.forEach((v) => { initialChecked[v.id] = false; });
    setCompletedViewIds(initialChecked);
    if (selectedCase.requestedExaminations?.[0]) {
      const benchmark = getEffectiveDoseForExam(selectedCase.modality || 'X-Ray', selectedCase.requestedExaminations[0].bodyPart);
      if (benchmark) setDosRadiasi(String(benchmark.dosMsv));
    }
  }, [selectedCase, flattenedViews]);

  // Intersection observer to track active section
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    STEPS.forEach(({ id }) => {
      const el = sectionRefs.current[id];
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(id); },
        { threshold: 0.3 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, [selectedCase]);

  const totalViewsCount = flattenedViews.length;
  const completedViewsCount = flattenedViews.filter((v) => completedViewIds[v.id]).length;

  // Step completion state derived from form
  const stepDone: Record<string, boolean> = {
    case:     !!selectedCaseId,
    exam:     totalViewsCount > 0 && completedViewsCount === totalViewsCount,
    images:   previews.length > 0,
    findings: radiographerFindings.trim().length > 0,
    exposure: true, // optional — always consider done
    qa:       qaPatientIdVerified && qaMarkerVerified && qaQualityVerified,
    route:    true, // pre-selected
  };

  const scrollTo = (id: string) => {
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const toggleViewCompleted = (id: string) => {
    setCompletedViewIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...selectedFiles]);
    selectedFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => setPreviews((prev) => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAiDraft = async () => {
    if (!selectedCase) return;
    setAnalyzingImage(true);
    try {
      if (previews.length > 0) {
        const result = await analyzeImageWithVisionAi(previews[0], selectedCase);
        setRadiographerFindings(result.findings);
        setRadiographerImpression(result.impression);
        toast.success(t(`Image analysed — ${result.confidenceScore}% confidence (${result.processingTimeMs}ms)`, `Imej dianalisis — ${result.confidenceScore}% keyakinan`));
      } else {
        const draft = generateAiReportDraft(selectedCase);
        setRadiographerFindings(draft.findings);
        setRadiographerImpression(draft.impression);
        toast.success(t(`Draft from case data (${draft.confidenceScore}%). Upload an image for image analysis.`, `Draf dari data kes. Muat naik imej untuk analisis imej.`));
      }
    } catch {
      toast.error(t('AI analysis failed. Please try again.', 'Analisis AI gagal.'));
    } finally {
      setAnalyzingImage(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedCaseId || files.length === 0) return;
    setUploading(true);
    const imageKeys: string[] = [];
    for (const dataUrl of previews) {
      imageKeys.push(await saveImage(dataUrl));
    }
    await editCase(selectedCaseId, {
      status: 'SCANNED', scannedAt: new Date().toISOString(),
      radiographerId: currentUser.id, radiographerName: currentUser.name,
      images: imageKeys, routedToRole,
      doseKvp: doseKvp ? Number(doseKvp) : undefined,
      doseMas: doseMas ? Number(doseMas) : undefined,
      dosRadiasi: dosRadiasi ? Number(dosRadiasi) : undefined,
      bilanganFilem: bilanganFilem ? Number(bilanganFilem) : 1,
      bilanganCdDvd: bilanganCdDvd ? Number(bilanganCdDvd) : 0,
      komen: komen.trim() || undefined,
      radiographerFindings: radiographerFindings.trim() || undefined,
      radiographerImpression: radiographerImpression.trim() || undefined,
      officeJuruXRay: currentUser.name,
      officeWaktuTerima: new Date().toISOString(),
      officeWaktuSelesai: new Date().toISOString(),
      officeTarikhPemeriksaan: new Date().toISOString().split('T')[0],
    });
    await addAuditLog({
      userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role,
      action: 'SCAN_UPLOADED', target: `cases/${selectedCaseId}`,
      details: `Uploaded ${files.length} image(s) for case ${selectedCase?.caseNumber} & routed to ${routedToRole}`,
      timestamp: new Date().toISOString(),
    });
    toast.success(t(`Case ${selectedCase?.caseNumber} scanned & routed to ${routedToRole}`, `Kes ${selectedCase?.caseNumber} diimbas & dihantar ke ${routedToRole}`));
    setUploading(false); setFiles([]); setPreviews([]);
    setSelectedCaseId(''); setRadiographerFindings(''); setRadiographerImpression('');
  };

  // Section label helpers
  const sectionLabel = (id: string) => {
    if (id === 'exam') {
      return totalViewsCount > 0 ? `${completedViewsCount} / ${totalViewsCount} Views` : 'Exam Views';
    }
    return STEPS.find((s) => s.id === id)?.label ?? id;
  };

  // --- SIDEBAR ---
  const Sidebar = () => (
    <div className="space-y-1 pt-1">
      {STEPS.map((step, i) => {
        const done = stepDone[step.id];
        const active = activeSection === step.id;
        return (
          <button
            key={step.id}
            type="button"
            onClick={() => scrollTo(step.id)}
            className={`w-full text-left px-3 py-2.5 rounded-lg flex items-start gap-3 transition-all group ${
              active ? 'bg-teal-50 border border-teal-200' : 'hover:bg-slate-100 border border-transparent'
            }`}
          >
            {/* Status icon */}
            <div className="mt-0.5 flex-shrink-0">
              {done ? (
                <div className="w-5 h-5 rounded-full bg-[#0F4C42] flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                </div>
              ) : step.optional ? (
                <div className="w-5 h-5 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center">
                  <div className="w-1.5 h-0.5 bg-slate-400 rounded" />
                </div>
              ) : (
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  active ? 'border-[#0F4C42]' : 'border-slate-300'
                }`}>
                  {active && <div className="w-2 h-2 rounded-full bg-[#0F4C42]" />}
                </div>
              )}
            </div>
            {/* Label */}
            <div className="min-w-0">
              <p className={`text-xs font-semibold leading-tight ${
                done ? 'text-[#0F4C42]' : active ? 'text-slate-800' : 'text-slate-500'
              }`}>
                <span className="text-[10px] font-normal text-slate-400 mr-1">{i + 1}.</span>
                {sectionLabel(step.id)}
              </p>
              {step.optional && (
                <p className="text-[10px] text-slate-400 italic">Optional</p>
              )}
              {step.id === 'exam' && totalViewsCount > 0 && !done && (
                <p className="text-[10px] text-slate-500">{completedViewsCount}/{totalViewsCount} acquired</p>
              )}
            </div>
          </button>
        );
      })}

      {/* Submit in sidebar */}
      <div className="pt-4 border-t border-slate-200 mt-2">
        <button
          type="submit"
          disabled={uploading || !selectedCaseId || files.length === 0}
          className="w-full btn-primary text-xs py-2.5 font-bold flex items-center justify-center gap-2 disabled:opacity-40"
        >
          {uploading ? (
            <><Loader className="w-3.5 h-3.5 animate-spin" />{t('Uploading...', 'Memuat Naik...')}</>
          ) : (
            <><Upload className="w-3.5 h-3.5" />{t('Submit & Route', 'Hantar Kes')}</>
          )}
        </button>
        {(!selectedCaseId || files.length === 0) && (
          <p className="text-[10px] text-slate-400 text-center mt-1.5 leading-tight">
            {!selectedCaseId ? 'Select a case first' : 'Upload at least one image'}
          </p>
        )}
      </div>
    </div>
  );

  // Mobile top bar — compact dots
  const MobileProgressBar = () => {
    const doneCount = STEPS.filter((s) => stepDone[s.id]).length;
    const pct = Math.round((doneCount / STEPS.length) * 100);
    return (
      <div className="sm:hidden sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-3">
        <div className="flex gap-1.5 flex-1">
          {STEPS.map((step) => (
            <button
              key={step.id}
              type="button"
              onClick={() => scrollTo(step.id)}
              className={`flex-1 h-1.5 rounded-full transition-all ${
                stepDone[step.id] ? 'bg-[#0F4C42]' : activeSection === step.id ? 'bg-teal-300' : 'bg-slate-200'
              }`}
              title={step.label}
            />
          ))}
        </div>
        <span className="text-[11px] font-bold text-slate-500 flex-shrink-0">{pct}%</span>
      </div>
    );
  };

  // Helper: section header
  const SectionHeader = ({ num, icon, title, badge }: { num: number; icon: React.ReactNode; title: string; badge?: React.ReactNode }) => (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-full bg-[#0F4C42] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">
          {num}
        </div>
        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
          {icon}
          {title}
        </span>
      </div>
      {badge}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="page-title">{t('Upload Scans & Document Findings', 'Muat Naik Imbasan & Rekod Penemuan')}</h1>
        <p className="page-subtitle">{t('Work through each step on the left. Upload images, document findings, then route the case.', 'Ikuti setiap langkah di sebelah kiri. Muat naik imej, rekod penemuan, kemudian hantar kes.')}</p>
      </div>

      {/* Mobile sticky progress bar */}
      <MobileProgressBar />

      <form onSubmit={handleUpload}>
        <div className="flex gap-6 items-start">

          {/* ═══ SIDEBAR ═══════════════════════════════════════════════════ */}
          <aside className="hidden sm:block w-52 flex-shrink-0 sticky top-6 self-start">
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 pb-2 border-b border-slate-100 mb-1">
                Workflow Steps
              </p>
              <Sidebar />
            </div>
          </aside>

          {/* ═══ MAIN CONTENT ═══════════════════════════════════════════════ */}
          <div className="flex-1 min-w-0 space-y-5">

            {/* ── 1. CASE SELECTOR ────────────────────────────────────────── */}
            <div
              ref={(el) => { sectionRefs.current['case'] = el; }}
              className={`bg-white border rounded-xl p-5 shadow-sm transition-all ${activeSection === 'case' ? 'border-teal-300' : 'border-slate-200'}`}
            >
              <SectionHeader num={1} icon={null} title={t('Select Scheduled Case', 'Pilih Kes Dijadualkan')} />
              <select
                required
                value={selectedCaseId}
                onChange={(e) => setSelectedCaseId(e.target.value)}
                className="select-field text-xs"
              >
                <option value="">-- Choose a scheduled case --</option>
                {availableCases.map((c) => (
                  <option key={c.id} value={c.id}>{c.caseNumber} — {c.patientName} ({c.scanType})</option>
                ))}
              </select>
              {availableCases.length === 0 && <p className="text-xs text-slate-400 mt-1">No scheduled cases available in queue.</p>}
              {selectedCase && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="bg-slate-50 rounded-lg p-2 border border-slate-200">
                    <p className="text-[10px] text-slate-400 font-medium">Patient</p>
                    <p className="text-xs font-bold text-slate-800 truncate">{selectedCase.patientName}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2 border border-slate-200">
                    <p className="text-[10px] text-slate-400 font-medium">Modality</p>
                    <p className="text-xs font-bold text-slate-800">{selectedCase.modality || 'X-Ray'}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2 border border-slate-200">
                    <p className="text-[10px] text-slate-400 font-medium">Scan Type</p>
                    <p className="text-xs font-bold text-slate-800 truncate">{selectedCase.scanType}</p>
                  </div>
                </div>
              )}
            </div>

            {/* ── 2. EXAMINATION CHECKLIST ────────────────────────────────── */}
            {selectedCase && (
              <div
                ref={(el) => { sectionRefs.current['exam'] = el; }}
                className={`bg-white border rounded-xl p-5 shadow-sm transition-all ${activeSection === 'exam' ? 'border-teal-300' : 'border-slate-200'}`}
              >
                <SectionHeader
                  num={2}
                  icon={<CheckSquare className="w-3.5 h-3.5 text-[#0F4C42]" />}
                  title={t('Requested Examinations Checklist', 'Senarai Semak Ujian Dipesan')}
                  badge={
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${
                      completedViewsCount === totalViewsCount && totalViewsCount > 0
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      {completedViewsCount} / {totalViewsCount} {t('Views', 'Pandangan')}
                    </span>
                  }
                />
                <p className="text-[11px] text-slate-500 mb-4">{t('Tick each projection view as you acquire it during the scan.', 'Tandakan setiap pandangan semasa imbasan dijalankan.')}</p>

                {selectedCase.requestedExaminations && selectedCase.requestedExaminations.length > 0 ? (
                  <div className="space-y-3">
                    {selectedCase.requestedExaminations.map((ex, examIdx) => (
                      <div key={ex.id || examIdx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800">
                            #{examIdx + 1} — {ex.bodyPart} {ex.side && ex.side !== 'N/A' ? `[${ex.side}]` : ''}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">{ex.viewsOrProtocol.length} view(s)</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {ex.viewsOrProtocol.map((viewName) => {
                            const key = `${ex.bodyPart}_${viewName}_${examIdx}`;
                            const isChecked = !!completedViewIds[key];
                            return (
                              <label key={viewName} className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between gap-2.5 transition-all ${
                                isChecked ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                              }`}>
                                <div className="flex items-center gap-2.5">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleViewCompleted(key)}
                                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                                  />
                                  <span className={`text-xs font-semibold ${isChecked ? 'line-through opacity-70' : ''}`}>{viewName}</span>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isChecked ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-200 text-slate-600'}`}>
                                  {isChecked ? t('Acquired', 'Selesai') : t('Pending', 'Belum')}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                        {ex.notes && (
                          <p className="text-[11px] text-slate-500 italic bg-white p-2 rounded border border-slate-100">
                            <strong>Instruction:</strong> {ex.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700">{selectedCase.scanType}</div>
                )}
              </div>
            )}

            {/* ── 3. UPLOAD IMAGES ────────────────────────────────────────── */}
            <div
              ref={(el) => { sectionRefs.current['images'] = el; }}
              className={`bg-white border rounded-xl p-5 shadow-sm transition-all ${activeSection === 'images' ? 'border-teal-300' : 'border-slate-200'}`}
            >
              <SectionHeader
                num={3}
                icon={<ImageIcon className="w-3.5 h-3.5 text-slate-600" />}
                title={t('Medical Images / DICOM Files', 'Imbasan Perubatan / Fail DICOM')}
                badge={previews.length > 0 ? (
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg border bg-emerald-100 text-emerald-800 border-emerald-200">
                    {previews.length} {t('Image(s)', 'Imej')}
                  </span>
                ) : undefined}
              />

              {previews.length === 0 ? (
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-10 text-center hover:border-slate-400 transition-colors bg-slate-50">
                  <ImageIcon className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                  <p className="text-xs text-slate-500 mb-3 font-medium">Drop DICOM / image files here or click to browse</p>
                  <input type="file" multiple accept="image/*,.dcm" onChange={handleFileChange} className="hidden" id="scan-upload" />
                  <label htmlFor="scan-upload" className="btn-secondary text-xs cursor-pointer inline-block px-4 py-2 font-semibold">Choose Image Files</label>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {previews.map((src, i) => (
                      <div
                        key={i}
                        className="relative group rounded-xl overflow-hidden border border-slate-200 bg-black cursor-pointer shadow-sm"
                        style={{ aspectRatio: '4/3' }}
                        onClick={() => setLightboxSrc(src)}
                      >
                        <img src={src} alt={`Scan ${i + 1}`} className="w-full h-full object-contain" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                          <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                          className="absolute top-1.5 right-1.5 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <span className="absolute bottom-1.5 left-1.5 bg-black/70 text-white text-[9px] font-mono px-1.5 py-0.5 rounded">Image #{i + 1}</span>
                      </div>
                    ))}
                    {/* Add more */}
                    <div className="rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:border-slate-400 transition-colors" style={{ aspectRatio: '4/3' }}>
                      <input type="file" multiple accept="image/*,.dcm" onChange={handleFileChange} className="hidden" id="scan-upload-more" />
                      <label htmlFor="scan-upload-more" className="flex flex-col items-center gap-1 cursor-pointer w-full h-full justify-center">
                        <ImageIcon className="w-5 h-5 text-slate-400" />
                        <span className="text-[11px] text-slate-400 font-medium">Add more</span>
                      </label>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400">{t('Click any image to expand full-screen for review.', 'Klik imej untuk besarkan.')}</p>
                </div>
              )}
            </div>

            {/* ── 4. RADIOGRAPHER FINDINGS ────────────────────────────────── */}
            {selectedCase && (
              <div
                ref={(el) => { sectionRefs.current['findings'] = el; }}
                className={`bg-white border rounded-xl p-5 shadow-sm transition-all ${activeSection === 'findings' ? 'border-teal-300' : 'border-slate-200'}`}
              >
                <SectionHeader
                  num={4}
                  icon={<FileText className="w-3.5 h-3.5 text-blue-600" />}
                  title={t('Radiographer Findings', 'Penemuan Radiografer')}
                  badge={
                    <button
                      type="button"
                      onClick={handleAiDraft}
                      disabled={analyzingImage}
                      className="px-2.5 py-1 bg-purple-100 hover:bg-purple-200 text-purple-900 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border border-purple-300 disabled:opacity-60"
                      title={previews.length > 0 ? 'Analyse uploaded image with AI' : 'Generate draft from case data'}
                    >
                      {analyzingImage
                        ? <><Loader className="w-3.5 h-3.5 animate-spin" />{t('Analysing...', 'Menganalisis...')}</>
                        : <><Sparkles className="w-3.5 h-3.5" />{t('AI Copilot Draft', 'Draf Kopilot AI')}</>
                      }
                    </button>
                  }
                />

                <p className="text-[11px] text-slate-500 mb-4">
                  {previews.length > 0
                    ? t('Review the uploaded scans above, then document your preliminary observations. Use AI Copilot to analyse the image.', 'Semak imbasan di atas, kemudian rekodkan pemerhatian awal anda.')
                    : t('Upload an image first for image-based AI analysis, or write findings manually.', 'Muat naik imej dahulu untuk analisis AI berasaskan imej, atau tulis penemuan secara manual.')
                  }
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t('Image Findings / Observations', 'Penemuan Imej / Pemerhatian')}</label>
                    <textarea
                      rows={5}
                      value={radiographerFindings}
                      onChange={(e) => setRadiographerFindings(e.target.value)}
                      className="input-field resize-none text-xs"
                      placeholder={t('Describe what is visible in the scan (e.g. Lung fields clear, no consolidation. Cardiothoracic ratio normal...)', 'Huraikan apa yang kelihatan dalam imbasan...')}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t('Preliminary Impression / Technical Note', 'Tanggapan Awal / Nota Teknikal')}</label>
                    <textarea
                      rows={2}
                      value={radiographerImpression}
                      onChange={(e) => setRadiographerImpression(e.target.value)}
                      className="input-field resize-none text-xs"
                      placeholder={t('Short summary or technical note for the reviewing clinician...', 'Ringkasan pendek untuk doktor penyemak...')}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── 5. TECHNICAL EXPOSURE PARAMETERS ───────────────────────── */}
            {selectedCase && (
              <div
                ref={(el) => { sectionRefs.current['exposure'] = el; }}
                className={`bg-white border rounded-xl p-5 shadow-sm transition-all ${activeSection === 'exposure' ? 'border-teal-300' : 'border-slate-200'}`}
              >
                <SectionHeader
                  num={5}
                  icon={<Zap className="w-3.5 h-3.5 text-amber-500" />}
                  title={t('Technical Exposure Parameters', 'Parameter Pendedahan Teknikal')}
                  badge={<span className="text-[10px] text-slate-400 italic font-medium border border-slate-200 rounded px-2 py-0.5">Optional — MOH PER.SS-RA301</span>}
                />

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                      kVp (Voltage) <span className="text-[10px] text-slate-400 cursor-help" title="Peak Kilovoltage — Machine penetration power factor">(i)</span>
                    </label>
                    <input type="text" value={doseKvp} onChange={(e) => setDoseKvp(e.target.value)} className="input-field text-xs font-mono" placeholder="e.g. 70" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                      mAs (Current) <span className="text-[10px] text-slate-400 cursor-help" title="Milliampere-seconds — Machine tube current time exposure factor">(i)</span>
                    </label>
                    <input type="text" value={doseMas} onChange={(e) => setDoseMas(e.target.value)} className="input-field text-xs font-mono" placeholder="e.g. 15" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                      Radiation Dose (mSv) <span className="text-[10px] text-amber-600 font-bold cursor-help" title="Effective Radiation Dose in Millisieverts — MOH Safety Compliance">(i)</span>
                    </label>
                    <input type="number" step="0.01" value={dosRadiasi} onChange={(e) => setDosRadiasi(e.target.value)} className="input-field text-xs font-mono text-amber-800 font-bold" placeholder="e.g. 0.02" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                      Film / CD Count <span className="text-[10px] text-slate-400 cursor-help" title="Physical media outputs delivered to patient or ward">(i)</span>
                    </label>
                    <div className="flex gap-1">
                      <input type="number" value={bilanganFilem} onChange={(e) => setBilanganFilem(e.target.value)} className="input-field text-xs font-mono" placeholder="Films" />
                      <input type="number" value={bilanganCdDvd} onChange={(e) => setBilanganCdDvd(e.target.value)} className="input-field text-xs font-mono" placeholder="CDs" />
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Radiographer Comments / Remarks</label>
                  <input type="text" value={komen} onChange={(e) => setKomen(e.target.value)} className="input-field text-xs" placeholder="e.g. Patient upright PA, good inspiration, optimal exposure" />
                </div>
              </div>
            )}

            {/* ── 6. QUALITY CONTROL ──────────────────────────────────────── */}
            {selectedCase && (
              <div
                ref={(el) => { sectionRefs.current['qa'] = el; }}
                className={`bg-white border rounded-xl p-5 shadow-sm transition-all ${activeSection === 'qa' ? 'border-teal-300' : 'border-slate-200'}`}
              >
                <SectionHeader
                  num={6}
                  icon={<ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />}
                  title={t('Radiographer Quality Control (QA)', 'Kawalan Kualiti Imbasan (QA)')}
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { state: qaPatientIdVerified, set: setQaPatientIdVerified, label: 'Patient Identity Verified' },
                    { state: qaMarkerVerified, set: setQaMarkerVerified, label: 'Anatomical Marker (L/R) Correct' },
                    { state: qaQualityVerified, set: setQaQualityVerified, label: 'No Motion Artifacts' },
                  ].map(({ state, set, label }) => (
                    <label key={label} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${state ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200 hover:bg-white'}`}>
                      <input type="checkbox" checked={state} onChange={(e) => set(e.target.checked)} className="w-4 h-4 rounded text-emerald-600 flex-shrink-0" />
                      <span className={`text-xs font-semibold ${state ? 'text-emerald-900' : 'text-slate-700'}`}>{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* ── 7. ROUTING DECISION ─────────────────────────────────────── */}
            {selectedCase && (
              <div
                ref={(el) => { sectionRefs.current['route'] = el; }}
                className={`bg-white border rounded-xl p-5 shadow-sm transition-all ${activeSection === 'route' ? 'border-teal-300' : 'border-slate-200'}`}
              >
                <SectionHeader
                  num={7}
                  icon={null}
                  title={t('Route Completed Scan To', 'Hantar Imbasan Selesai Ke')}
                />
                <p className="text-[11px] text-slate-500 mb-4">{t('Based on your findings above, decide where this case should be reviewed next.', 'Berdasarkan penemuan anda, tentukan ke mana kes ini perlu disemak.')}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { value: 'Medical Officer' as const, label: t('Medical Officer (MO)', 'Pegawai Perubatan (MO)'), sub: t('Routine scan / primary doctor review', 'Semakan rutin doktor perawat') },
                    { value: 'Radiologist' as const, label: t('Specialist Radiologist', 'Pakar Radiologi'), sub: t('Complex scan / priority specialist review', 'Laporan pakar radiologi') },
                  ].map(({ value, label, sub }) => (
                    <label key={value} className={`p-4 rounded-xl border cursor-pointer flex items-start gap-3 transition-all ${
                      routedToRole === value ? 'bg-white border-[#0F4C42] ring-2 ring-[#0F4C42]/15 shadow-sm' : 'bg-slate-50 border-slate-200 hover:bg-white'
                    }`}>
                      <input type="radio" name="routedToRole" value={value} checked={routedToRole === value} onChange={() => setRoutedToRole(value)} className="mt-0.5 text-[#0F4C42]" />
                      <div>
                        <p className="text-xs font-bold text-slate-800">{label}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Mobile submit button */}
            <div className="sm:hidden pb-6">
              <button
                type="submit"
                disabled={uploading || !selectedCaseId || files.length === 0}
                className="w-full btn-primary text-xs py-3 font-bold flex items-center justify-center gap-2 disabled:opacity-40"
              >
                <Upload className="w-4 h-4" />
                {uploading ? t('Uploading...', 'Memuat Naik...') : t(`Upload & Route to ${routedToRole}`, `Hantar ke ${routedToRole}`)}
              </button>
            </div>

          </div>{/* end main */}
        </div>{/* end flex */}
      </form>

      {/* Lightbox */}
      {lightboxSrc && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setLightboxSrc(null)}>
          <button className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full" onClick={() => setLightboxSrc(null)}>
            <X className="w-5 h-5" />
          </button>
          <img src={lightboxSrc} alt="Expanded scan" className="max-w-full max-h-full object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
