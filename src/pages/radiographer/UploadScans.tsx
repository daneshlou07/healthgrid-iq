import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ux/Toast';
import { useLanguage } from '../../context/LanguageContext';
import {
  Upload, Image as ImageIcon, X, CheckSquare, Zap, ShieldCheck,
  FileText, Sparkles, Loader, ZoomIn, Check,
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

  const totalViewsCount = flattenedViews.length;
  const completedViewsCount = flattenedViews.filter((v) => completedViewIds[v.id]).length;

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
    toast.success(t(`Case ${selectedCase?.caseNumber} routed to ${routedToRole}`, `Kes ${selectedCase?.caseNumber} dihantar ke ${routedToRole}`));
    setUploading(false); setFiles([]); setPreviews([]);
    setSelectedCaseId(''); setRadiographerFindings(''); setRadiographerImpression('');
  };

  // ── Examination Checklist Sidebar ────────────────────────────────────────
  const ExamSidebar = () => {
    if (!selectedCase) {
      return (
        <div className="text-center py-8 px-3">
          <CheckSquare className="w-7 h-7 text-slate-300 mx-auto mb-2" />
          <p className="text-[11px] text-slate-400 leading-snug">Select a case to see the examination views checklist</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Progress */}
        <div className="px-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Views Acquired</span>
            <span className={`text-[11px] font-bold ${completedViewsCount === totalViewsCount && totalViewsCount > 0 ? 'text-emerald-700' : 'text-slate-600'}`}>
              {completedViewsCount}/{totalViewsCount}
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-1.5">
            <div
              className="bg-[#0F4C42] h-1.5 rounded-full transition-all duration-300"
              style={{ width: totalViewsCount > 0 ? `${(completedViewsCount / totalViewsCount) * 100}%` : '0%' }}
            />
          </div>
        </div>

        {/* Views by examination */}
        {selectedCase.requestedExaminations && selectedCase.requestedExaminations.length > 0 ? (
          selectedCase.requestedExaminations.map((ex, examIdx) => (
            <div key={ex.id || examIdx} className="space-y-1.5">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">
                {ex.bodyPart}{ex.side && ex.side !== 'N/A' ? ` [${ex.side}]` : ''}
              </p>
              {ex.viewsOrProtocol.map((viewName) => {
                const key = `${ex.bodyPart}_${viewName}_${examIdx}`;
                const isChecked = !!completedViewIds[key];
                return (
                  <label
                    key={key}
                    className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                      isChecked
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* Custom checkbox */}
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      isChecked ? 'bg-[#0F4C42] border-[#0F4C42]' : 'border-slate-300 bg-white'
                    }`}>
                      {isChecked && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                    </div>
                    <input type="checkbox" checked={isChecked} onChange={() => toggleViewCompleted(key)} className="hidden" />
                    <span className={`text-[11px] font-semibold leading-tight flex-1 ${isChecked ? 'text-emerald-800 line-through opacity-70' : 'text-slate-700'}`}>
                      {viewName}
                    </span>
                  </label>
                );
              })}
            </div>
          ))
        ) : (
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600">{selectedCase.scanType}</div>
        )}

        {/* Modality badge */}
        <div className="pt-2 border-t border-slate-100">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Modality</span>
          <p className="text-xs font-bold text-slate-700 mt-0.5">{selectedCase.modality || 'X-Ray'}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Page header */}
      <div className="mb-5">
        <h1 className="page-title">{t('Upload Scans & Document Findings', 'Muat Naik Imbasan & Rekod Penemuan')}</h1>
        <p className="page-subtitle">{t('Upload the scan, review the image, then document your preliminary findings.', 'Muat naik imbasan, semak imej, kemudian rekodkan penemuan awal anda.')}</p>
      </div>

      <form onSubmit={handleUpload}>
        <div className="flex gap-5 items-start">

          {/* ═══ LEFT SIDEBAR — EXAMINATION CHECKLIST ═══════════════════════ */}
          <aside className="hidden sm:block w-48 flex-shrink-0 sticky top-4 self-start">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-3 py-2.5 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5 text-[#0F4C42]" />
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Exam Views</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">{t('Tick as you acquire each view', 'Tandakan setiap pandangan yang diambil')}</p>
              </div>
              <div className="p-3 max-h-[calc(100vh-200px)] overflow-y-auto">
                <ExamSidebar />
              </div>
            </div>
          </aside>

          {/* ═══ MAIN CONTENT ════════════════════════════════════════════════ */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* ── CASE SELECTOR (compact) ──────────────────────────────────── */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                {t('Select Scheduled Case', 'Pilih Kes Dijadualkan')}
              </label>
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
              {availableCases.length === 0 && <p className="text-xs text-slate-400 mt-1.5">No scheduled cases available in queue.</p>}
              {selectedCase && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="text-[11px] bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg font-semibold">
                    {selectedCase.patientName}
                  </span>
                  <span className="text-[11px] bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg font-semibold">
                    {selectedCase.modality || 'X-Ray'}
                  </span>
                  <span className="text-[11px] bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg font-semibold">
                    {selectedCase.scanType}
                  </span>
                </div>
              )}
            </div>

            {/* ── IMAGE UPLOAD + VIEWER (hero section) ─────────────────────── */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-3.5 h-3.5 text-slate-600" />
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    {t('Scan Images', 'Imej Imbasan')}
                  </span>
                </div>
                {previews.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                      {previews.length} {t('image(s) uploaded', 'imej dimuat naik')}
                    </span>
                    <label htmlFor="scan-upload-more" className="text-[11px] text-slate-500 hover:text-slate-700 cursor-pointer font-medium underline">
                      + Add more
                    </label>
                    <input type="file" multiple accept="image/*,.dcm" onChange={handleFileChange} className="hidden" id="scan-upload-more" />
                  </div>
                )}
              </div>

              <div className="p-5">
                {previews.length === 0 ? (
                  /* Empty state — dropzone */
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center hover:border-slate-400 transition-colors bg-slate-50">
                    <ImageIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-500 mb-1">{t('Upload the patient scan here', 'Muat naik imbasan pesakit di sini')}</p>
                    <p className="text-xs text-slate-400 mb-4">{t('DICOM files or standard image formats (JPG, PNG)', 'Fail DICOM atau format imej standard (JPG, PNG)')}</p>
                    <input type="file" multiple accept="image/*,.dcm" onChange={handleFileChange} className="hidden" id="scan-upload" />
                    <label htmlFor="scan-upload" className="btn-secondary text-xs cursor-pointer inline-block px-5 py-2.5 font-semibold">
                      {t('Choose Image Files', 'Pilih Fail Imej')}
                    </label>
                  </div>
                ) : (
                  /* Image viewer — large previews */
                  <div className="space-y-3">
                    {/* Primary image — large */}
                    <div
                      className="relative group rounded-xl overflow-hidden border border-slate-200 bg-black cursor-pointer shadow-sm"
                      style={{ maxHeight: '420px', minHeight: '280px' }}
                      onClick={() => setLightboxSrc(previews[0])}
                    >
                      <img src={previews[0]} alt="Primary scan" className="w-full h-full object-contain" style={{ maxHeight: '420px' }} />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                        <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeFile(0); }}
                        className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <span className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] font-mono px-2 py-0.5 rounded">Image #1 — Click to expand</span>
                    </div>

                    {/* Additional images — smaller row */}
                    {previews.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {previews.slice(1).map((src, i) => (
                          <div
                            key={i + 1}
                            className="relative group flex-shrink-0 w-28 h-20 rounded-lg overflow-hidden border border-slate-200 bg-black cursor-pointer"
                            onClick={() => setLightboxSrc(src)}
                          >
                            <img src={src} alt={`Scan ${i + 2}`} className="w-full h-full object-contain" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all" />
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); removeFile(i + 1); }}
                              className="absolute top-1 right-1 p-0.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                            <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[8px] font-mono px-1 py-0.5 rounded">#{i + 2}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <p className="text-[11px] text-slate-400">{t('Click any image to view full-screen.', 'Klik imej untuk besarkan.')}</p>
                  </div>
                )}
              </div>
            </div>

            {selectedCase && (
              <>
                {/* ── RADIOGRAPHER FINDINGS ────────────────────────────────── */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        {t('Radiographer Findings', 'Penemuan Radiografer')}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAiDraft}
                      disabled={analyzingImage}
                      className="px-2.5 py-1 bg-purple-100 hover:bg-purple-200 text-purple-900 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border border-purple-300 disabled:opacity-60"
                    >
                      {analyzingImage
                        ? <><Loader className="w-3.5 h-3.5 animate-spin" />{t('Analysing...', 'Menganalisis...')}</>
                        : <><Sparkles className="w-3.5 h-3.5" />{t('AI Copilot Draft', 'Draf Kopilot AI')}</>
                      }
                    </button>
                  </div>
                  <div className="p-5 space-y-3">
                    {previews.length === 0 && (
                      <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
                        {t('Upload an image above first to enable image-based AI analysis.', 'Muat naik imej di atas dahulu untuk analisis AI berasaskan imej.')}
                      </p>
                    )}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t('Image Findings / Observations', 'Penemuan Imej / Pemerhatian')}</label>
                      <textarea
                        rows={5}
                        value={radiographerFindings}
                        onChange={(e) => setRadiographerFindings(e.target.value)}
                        className="input-field resize-none text-xs"
                        placeholder={t('Review the image above, then describe your observations (e.g. Lung fields clear, no consolidation. Cardiothoracic ratio normal...)', 'Semak imej di atas, kemudian huraikan pemerhatian anda...')}
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

                {/* ── TECHNICAL EXPOSURE PARAMETERS ───────────────────────── */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        {t('Technical Exposure Parameters', 'Parameter Pendedahan Teknikal')}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 italic font-medium border border-slate-200 rounded px-2 py-0.5">Optional — MOH PER.SS-RA301</span>
                  </div>
                  <div className="p-5">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                          kVp (Voltage) <span className="text-[10px] text-slate-400 cursor-help" title="Peak Kilovoltage">(i)</span>
                        </label>
                        <input type="text" value={doseKvp} onChange={(e) => setDoseKvp(e.target.value)} className="input-field text-xs font-mono" placeholder="e.g. 70" />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                          mAs (Current) <span className="text-[10px] text-slate-400 cursor-help" title="Milliampere-seconds">(i)</span>
                        </label>
                        <input type="text" value={doseMas} onChange={(e) => setDoseMas(e.target.value)} className="input-field text-xs font-mono" placeholder="e.g. 15" />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                          Radiation Dose (mSv) <span className="text-[10px] text-amber-600 font-bold cursor-help" title="Effective Radiation Dose — MOH Safety Compliance">(i)</span>
                        </label>
                        <input type="number" step="0.01" value={dosRadiasi} onChange={(e) => setDosRadiasi(e.target.value)} className="input-field text-xs font-mono text-amber-800 font-bold" placeholder="e.g. 0.02" />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                          Film / CD Count <span className="text-[10px] text-slate-400 cursor-help" title="Physical media outputs">(i)</span>
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
                </div>

                {/* ── QUALITY CONTROL ──────────────────────────────────────── */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      {t('Quality Control (QA)', 'Kawalan Kualiti (QA)')}
                    </span>
                  </div>
                  <div className="p-5">
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
                </div>

                {/* ── ROUTING DECISION ────────────────────────────────────── */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">{t('Route Completed Scan To', 'Hantar Imbasan Selesai Ke')}</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">{t('Based on your findings, decide where this case goes next.', 'Berdasarkan penemuan anda, tentukan ke mana kes ini perlu disemak.')}</p>
                  </div>
                  <div className="p-5">
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
                </div>

                {/* ── SUBMIT ──────────────────────────────────────────────── */}
                <div className="flex justify-end pb-6">
                  <button
                    type="submit"
                    disabled={uploading || !selectedCaseId || files.length === 0}
                    className="btn-primary text-xs px-8 py-3 font-bold flex items-center gap-2 disabled:opacity-40"
                  >
                    {uploading
                      ? <><Loader className="w-4 h-4 animate-spin" />{t('Uploading...', 'Memuat Naik...')}</>
                      : <><Upload className="w-4 h-4" />{t(`Upload & Route to ${routedToRole}`, `Muat Naik & Hantar ke ${routedToRole}`)}</>
                    }
                  </button>
                </div>
              </>
            )}
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
