import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ux/Toast';
import { useLanguage } from '../../context/LanguageContext';
import {
  Upload,
  Image as ImageIcon,
  X,
  CheckSquare,
  Zap,
  ShieldCheck,
  FileText,
  Sparkles,
  Loader,
  ZoomIn,
  User,
  Clock,
  Activity,
  AlertCircle
} from 'lucide-react';
import { saveImage } from '../../services/imageStorage';
import { getEffectiveDoseForExam } from '../../data/effectiveDoseTable';
import { analyzeImageWithVisionAi } from '../../services/visionAiAnalyzer';
import { generateAiReportDraft } from '../../services/aiReportingCopilot';
import PacsImageViewer from '../../components/ui/PacsImageViewer';

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
  const [activePreviewIndex, setActivePreviewIndex] = useState<number>(0);
  const [uploading, setUploading] = useState(false);
  const [routedToRole, setRoutedToRole] = useState<'Medical Officer' | 'Radiologist'>('Medical Officer');

  // Lightbox state
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  // Technical Exposure Factors (MOH PER.SS-RA301 Section 19 & 20)
  const [doseKvp, setDoseKvp] = useState('');
  const [doseMas, setDoseMas] = useState('');
  const [dosRadiasi, setDosRadiasi] = useState('');
  const [bilanganFilem, setBilanganFilem] = useState('1');
  const [bilanganCdDvd, setBilanganCdDvd] = useState('0');
  const [komen, setKomen] = useState('');

  // Radiographer Findings (preliminary image observations)
  const [radiographerFindings, setRadiographerFindings] = useState('');
  const [radiographerImpression, setRadiographerImpression] = useState('');
  const [analyzingImage, setAnalyzingImage] = useState(false);

  // Quality Assurance Checklist State
  const [qaPatientIdVerified, setQaPatientIdVerified] = useState(true);
  const [qaMarkerVerified, setQaMarkerVerified] = useState(true);
  const [qaQualityVerified, setQaQualityVerified] = useState(true);

  // Completed Views Checklist State
  const [completedViewIds, setCompletedViewIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (caseIdFromUrl) {
      setSelectedCaseId(caseIdFromUrl);
    }
  }, [caseIdFromUrl]);

  const availableCases = cases.filter(
    (c) => c.status === 'SCHEDULED' || c.id === caseIdFromUrl || c.status === 'CREATED'
  );

  const selectedCase = useMemo(() => {
    return availableCases.find((c) => c.id === selectedCaseId);
  }, [availableCases, selectedCaseId]);

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

  // Initialize all requested views as unchecked on case selection and auto-fill radiation dose benchmark
  useEffect(() => {
    if (!selectedCase) return;
    const initialChecked: Record<string, boolean> = {};
    flattenedViews.forEach((v) => { initialChecked[v.id] = false; });
    setCompletedViewIds(initialChecked);

    if (selectedCase.requestedExaminations && selectedCase.requestedExaminations[0]) {
      const benchmark = getEffectiveDoseForExam(selectedCase.modality || 'X-Ray', selectedCase.requestedExaminations[0].bodyPart);
      if (benchmark) setDosRadiasi(String(benchmark.dosMsv));
    }
  }, [selectedCase, flattenedViews]);

  const toggleViewCompleted = (id: string) => {
    setCompletedViewIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const totalViewsCount = flattenedViews.length;
  const completedViewsCount = flattenedViews.filter((v) => completedViewIds[v.id]).length;

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
        // Image-based analysis using the currently active or first uploaded image
        const targetImage = previews[activePreviewIndex] || previews[0];
        const result = await analyzeImageWithVisionAi(targetImage, selectedCase);
        setRadiographerFindings(result.findings);
        setRadiographerImpression(result.impression);
        toast.success(
          t(
            `Image analysed — ${result.confidenceScore}% confidence (${result.processingTimeMs}ms)`,
            `Imej dianalisis — ${result.confidenceScore}% keyakinan`
          )
        );
      } else {
        // Fallback: text-based draft from case metadata
        const draft = generateAiReportDraft(selectedCase);
        setRadiographerFindings(draft.findings);
        setRadiographerImpression(draft.impression);
        toast.success(
          t(
            `Draft generated from case data (${draft.confidenceScore}% confidence). Upload an image for image-based analysis.`,
            `Draf dijana dari data kes. Muat naik imej untuk analisis berasaskan imej.`
          )
        );
      }
    } catch {
      toast.error(t('AI analysis failed. Please try again.', 'Analisis AI gagal. Sila cuba lagi.'));
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
      const key = await saveImage(dataUrl);
      imageKeys.push(key);
    }

    await editCase(selectedCaseId, {
      status: 'SCANNED',
      scannedAt: new Date().toISOString(),
      radiographerId: currentUser.id,
      radiographerName: currentUser.name,
      images: imageKeys,
      routedToRole,
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
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'SCAN_UPLOADED',
      target: `cases/${selectedCaseId}`,
      details: `Uploaded ${files.length} image(s) for case ${selectedCase?.caseNumber} & routed to ${routedToRole}`,
      timestamp: new Date().toISOString(),
    });

    toast.success(t(`Case ${selectedCase?.caseNumber} scanned & routed to ${routedToRole}`, `Kes ${selectedCase?.caseNumber} diimbas & dihantar ke ${routedToRole}`));
    setUploading(false);
    setFiles([]);
    setPreviews([]);
    setSelectedCaseId('');
    setRadiographerFindings('');
    setRadiographerImpression('');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="page-title">{t('Upload Scans & Document Findings', 'Muat Naik Imbasan & Rekod Penemuan')}</h1>
        <p className="page-subtitle">
          {t('Upload scan images first, analyze them, record your findings, and route the case.', 'Muat naik imbasan imej dahulu, semak imej, rekod penemuan, dan hantar kes.')}
        </p>
      </div>

      <form onSubmit={handleUpload} className="space-y-6">

        {/* ── 1. CASE SELECTOR & CASE SUMMARY CARD ─────────────────────────── */}
        <div className="card bg-white p-5 border border-slate-200 rounded-xl shadow-sm space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5 uppercase tracking-wider">
              {t('Select Scheduled Case *', 'Pilih Kes Dijadualkan *')}
            </label>
            <select
              required
              value={selectedCaseId}
              onChange={(e) => setSelectedCaseId(e.target.value)}
              className="select-field text-xs"
            >
              <option value="">-- Choose a scheduled case --</option>
              {availableCases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.caseNumber} — {c.patientName} ({c.scanType})
                </option>
              ))}
            </select>
            {availableCases.length === 0 && (
              <p className="text-xs text-slate-400 mt-1">No scheduled cases available in queue.</p>
            )}
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
                <span className="text-[11px] font-semibold text-slate-500 block uppercase">Modality & Procedure</span>
                <span className="font-bold text-teal-900 mt-0.5 block">{selectedCase.modality || 'X-Ray'} — {selectedCase.scanType}</span>
                <span className="text-[10px] text-slate-500 font-mono">Case #{selectedCase.caseNumber}</span>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-500 block uppercase">Priority & Status</span>
                <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                  {selectedCase.severity || 'ROUTINE'}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-500 block uppercase">Clinical Indication</span>
                <p className="text-[11px] text-slate-700 font-medium truncate mt-0.5" title={selectedCase.indication || 'N/A'}>
                  {selectedCase.indication || 'Routine screening'}
                </p>
              </div>
            </div>
          )}
        </div>

        {selectedCase && (
          <>
            {/* ── 2. STEP 1: UPLOAD IMAGES & ACQUIRED VIEWS CHECKLIST (SIDE-BY-SIDE) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* UPLOAD DROPZONE PANEL (Left Column - 7 cols) */}
              <div className="lg:col-span-7 card bg-white p-5 border border-slate-200 rounded-xl shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <Upload className="w-4 h-4 text-teal-700" />
                      <span>{t('1. Upload Medical Scans / DICOM', '1. Muat Naik Imbasan / DICOM')}</span>
                    </h2>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {t('Select or drag image files acquired during examination', 'Pilih atau seret fail imej yang diambil')}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                    {files.length} {t('File(s) Added', 'Fail Ditambah')}
                  </span>
                </div>

                <div className="border-2 border-dashed border-slate-300 hover:border-teal-500 transition-colors rounded-xl p-6 text-center bg-slate-50/60">
                  <ImageIcon className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-600 mb-1 font-semibold">
                    {t('Drop DICOM / Image files here', 'Seret fail DICOM / imej di sini')}
                  </p>
                  <p className="text-[11px] text-slate-400 mb-3">Supports DICOM (.dcm), PNG, JPG, JPEG</p>
                  <input
                    type="file"
                    multiple
                    accept="image/*,.dcm"
                    onChange={handleFileChange}
                    className="hidden"
                    id="scan-upload-input"
                  />
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <label
                      htmlFor="scan-upload-input"
                      className="btn-secondary text-xs cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 font-bold"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{t('Browse Image Files', 'Cari Fail Imej')}</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        // Create sample high-quality diagnostic scan canvas preview
                        const canvas = document.createElement('canvas');
                        canvas.width = 640;
                        canvas.height = 640;
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                          ctx.fillStyle = '#0f172a';
                          ctx.fillRect(0, 0, 640, 640);
                          ctx.fillStyle = '#334155';
                          ctx.beginPath();
                          ctx.arc(320, 320, 220, 0, Math.PI * 2);
                          ctx.fill();
                          ctx.strokeStyle = '#94a3b8';
                          ctx.lineWidth = 4;
                          ctx.stroke();
                          ctx.fillStyle = '#f8fafc';
                          ctx.font = '14px monospace';
                          ctx.fillText(`HARDWARE SIMULATOR: ${selectedCase.modality || 'X-Ray'}`, 30, 40);
                          ctx.fillText(`PATIENT: ${selectedCase.patientName} (ID: ${selectedCase.patientId})`, 30, 65);
                          ctx.fillText(`ACQUIRED: ${new Date().toISOString()}`, 30, 90);
                        }
                        const sampleUrl = canvas.toDataURL('image/png');
                        setPreviews((prev) => [...prev, sampleUrl]);
                        setFiles((prev) => [...prev, new File([], `DICOM_SIM_${selectedCase.modality || 'XRAY'}_001.dcm`)]);
                        toast.success(`Hardware Simulator: Simulated ${selectedCase.modality || 'X-Ray'} scan transfer acquired!`);
                      }}
                      className="px-3 py-2 bg-teal-100 text-teal-900 hover:bg-teal-200 border border-teal-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                      title="Simulate acquiring DICOM scan from physical scanner hardware"
                    >
                      <Zap className="w-3.5 h-3.5 text-teal-700" />
                      <span>Simulate Modality Scan Push</span>
                    </button>
                  </div>

                </div>

                {/* Uploaded File List Badges */}
                {files.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <p className="text-[11px] font-bold text-slate-700 uppercase">{t('Selected Files:', 'Fail Dipilih:')}</p>
                    <div className="flex flex-wrap gap-2">
                      {files.map((file, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 text-slate-800 text-[11px] px-2.5 py-1 rounded-lg font-mono">
                          <span className="truncate max-w-[140px]">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => removeFile(idx)}
                            className="text-slate-400 hover:text-red-600 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* REQUESTED EXAM VIEWS CHECKLIST (Right Column - 5 cols) */}
              <div className="lg:col-span-5 card bg-white p-5 border border-slate-200 rounded-xl shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckSquare className="w-4 h-4 text-teal-700" />
                      <span>{t('Requested Views Checklist', 'Senarai Semak Pandangan')}</span>
                    </h2>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {t('Tick off views as you acquire & upload them', 'Tandakan pandangan semasa muat naik')}
                    </p>
                  </div>
                  <span className="text-[11px] font-bold text-teal-900 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
                    {completedViewsCount} / {totalViewsCount}
                  </span>
                </div>

                {selectedCase.requestedExaminations && selectedCase.requestedExaminations.length > 0 ? (
                  <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                    {selectedCase.requestedExaminations.map((ex, examIdx) => (
                      <div key={ex.id || examIdx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">
                            #{examIdx + 1} — {ex.bodyPart} {ex.side && ex.side !== 'N/A' ? `[${ex.side}]` : ''}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {ex.viewsOrProtocol.length} View(s)
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {ex.viewsOrProtocol.map((viewName) => {
                            const key = `${ex.bodyPart}_${viewName}_${examIdx}`;
                            const isChecked = !!completedViewIds[key];
                            return (
                              <label
                                key={viewName}
                                className={`p-2 rounded border cursor-pointer flex items-center justify-between gap-2 transition-all ${
                                  isChecked
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleViewCompleted(key)}
                                    className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                                  />
                                  <span className={`text-xs font-semibold ${isChecked ? 'line-through opacity-80' : ''}`}>
                                    {viewName}
                                  </span>
                                </div>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  isChecked ? 'bg-emerald-200/80 text-emerald-900' : 'bg-slate-200/70 text-slate-600'
                                }`}>
                                  {isChecked ? t('Acquired', 'Selesai') : t('Pending', 'Belum')}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                        {ex.notes && (
                          <p className="text-[10px] text-slate-500 italic bg-white p-1.5 rounded border border-slate-100">
                            <strong>Note:</strong> {ex.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700">
                    {selectedCase.scanType}
                  </div>
                )}
              </div>
            </div>

            {/* ── 3. STEP 2: SCAN IMAGE VIEWER & RADIOGRAPHER FINDINGS ───────── */}
            <div className="card bg-white p-5 border border-slate-200 rounded-xl shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-teal-700" />
                    <span>{t('2. Image Review & Preliminary Findings', '2. Semakan Imej & Penemuan Awal')}</span>
                  </h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {t('Examine uploaded scans, run Vision AI analysis, and record preliminary observations', 'Semak imbasan, jalankan analisis AI, dan rekod pemerhatian')}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAiDraft}
                  disabled={analyzingImage}
                  className="px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-900 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border border-purple-300 disabled:opacity-60"
                  title={previews.length > 0 ? 'Analyse active uploaded image with AI' : 'Generate draft from case metadata'}
                >
                  {analyzingImage ? (
                    <><Loader className="w-3.5 h-3.5 animate-spin" />{t('Analysing...', 'Menganalisis...')}</>
                  ) : (
                    <><Sparkles className="w-3.5 h-3.5 text-purple-700" />{t('AI Copilot Draft', 'Draf Kopilot AI')}</>
                  )}
                </button>
              </div>

              {/* ─── Full PACS Image Viewer (radiographer pre-upload mode) ─────── */}
              {previews.length > 0 ? (
                <div className="space-y-2">
                  <PacsImageViewer
                    previewUrls={previews}
                    heightClass="h-[400px]"
                    caseItem={selectedCase}
                    onAiAnalyzed={(res) => {
                      setRadiographerFindings(res.findings);
                      setRadiographerImpression(res.impression);
                      toast.success(`Vision AI analyzed image pixels (${res.confidenceScore}% confidence)`);
                    }}
                  />
                </div>
              ) : (
                <div className="p-8 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-2">
                  <AlertCircle className="w-6 h-6 text-slate-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">
                    {t('No Scan Images Uploaded Yet', 'Tiada Imej Imbasan Dimuat Naik Lagi')}
                  </p>
                  <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                    {t(
                      'Please upload DICOM / image files in Step 1 above. The image viewer and AI analysis will activate once images are selected.',
                      'Sila muat naik fail DICOM / imej di Langkah 1 di atas. Semakan imej dan analisis AI akan diaktifkan sebaik sahaja imej dipilih.'
                    )}
                  </p>
                </div>
              )}

              {/* Radiographer Findings Inputs */}
              <div className="space-y-4 pt-2 border-t border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                    <span>{t('Image Findings / Preliminary Observations', 'Penemuan Imej / Pemerhatian Awal')}</span>
                    <span className="text-[10px] text-slate-400 font-normal">Optional radiographer technical notes</span>
                  </label>
                  <textarea
                    rows={4}
                    value={radiographerFindings}
                    onChange={(e) => setRadiographerFindings(e.target.value)}
                    className="input-field resize-none text-xs"
                    placeholder={t(
                      'Describe visible radiological findings (e.g., Lung fields clear, no focal consolidation, cardiac contour within normal limits...)',
                      'Huraikan penemuan radiologi yang kelihatan...'
                    )}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    {t('Preliminary Impression / Technical Note', 'Tanggapan Awal / Nota Teknikal')}
                  </label>
                  <textarea
                    rows={2}
                    value={radiographerImpression}
                    onChange={(e) => setRadiographerImpression(e.target.value)}
                    className="input-field resize-none text-xs"
                    placeholder={t(
                      'Summary statement or key technical observation for reviewing clinician...',
                      'Kenyataan ringkasan atau nota teknikal utama untuk doktor...'
                    )}
                  />
                </div>
              </div>
            </div>

            {/* ── 4. STEP 3: TECHNICAL DOSE PARAMETERS & QUALITY ASSURANCE (QA) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* Technical Exposure Parameters (7 cols) */}
              <div className="lg:col-span-7 card bg-white p-5 border border-slate-200 rounded-xl shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-600" />
                    <span>{t('Technical Exposure Parameters (MOH PER.SS-RA301)', 'Parameter Pendedahan Teknikal (KKM PER.SS-RA301)')}</span>
                  </h2>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">kVp (Voltage)</label>
                    <input
                      type="text"
                      value={doseKvp}
                      onChange={(e) => setDoseKvp(e.target.value)}
                      className="input-field text-xs font-mono"
                      placeholder="e.g. 70"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">mAs (Current)</label>
                    <input
                      type="text"
                      value={doseMas}
                      onChange={(e) => setDoseMas(e.target.value)}
                      className="input-field text-xs font-mono"
                      placeholder="e.g. 15"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Dose (mSv)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={dosRadiasi}
                      onChange={(e) => setDosRadiasi(e.target.value)}
                      className="input-field text-xs font-mono font-bold text-amber-900"
                      placeholder="e.g. 0.02"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Film / CD Count</label>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        value={bilanganFilem}
                        onChange={(e) => setBilanganFilem(e.target.value)}
                        className="input-field text-xs font-mono"
                        placeholder="Films"
                        title="Film count"
                      />
                      <input
                        type="number"
                        value={bilanganCdDvd}
                        onChange={(e) => setBilanganCdDvd(e.target.value)}
                        className="input-field text-xs font-mono"
                        placeholder="CDs"
                        title="CD count"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Radiographer Exposure Comments</label>
                  <input
                    type="text"
                    value={komen}
                    onChange={(e) => setKomen(e.target.value)}
                    className="input-field text-xs"
                    placeholder="e.g. Patient upright PA, optimal inspiration, good penetration"
                  />
                </div>
              </div>

              {/* Quality Control QA Checkbox (5 cols) */}
              <div className="lg:col-span-5 card bg-white p-5 border border-slate-200 rounded-xl shadow-sm space-y-4">
                <div className="border-b border-slate-200 pb-3">
                  <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    <span>{t('Quality Control (QA)', 'Kawalan Kualiti Imbasan')}</span>
                  </h2>
                </div>

                <div className="space-y-2.5 text-xs font-medium text-slate-800">
                  <label className="flex items-center gap-2.5 p-2 rounded-lg border border-slate-200 bg-emerald-50/40 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={qaPatientIdVerified}
                      onChange={(e) => setQaPatientIdVerified(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Patient Identity & RN Verified</span>
                  </label>

                  <label className="flex items-center gap-2.5 p-2 rounded-lg border border-slate-200 bg-emerald-50/40 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={qaMarkerVerified}
                      onChange={(e) => setQaMarkerVerified(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Anatomical Markers (L/R) Correct</span>
                  </label>

                  <label className="flex items-center gap-2.5 p-2 rounded-lg border border-slate-200 bg-emerald-50/40 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={qaQualityVerified}
                      onChange={(e) => setQaQualityVerified(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>No Motion Artifacts / Re-take Not Needed</span>
                  </label>
                </div>
              </div>
            </div>

            {/* ── 5. STEP 4: ROUTING DECISION & SUBMISSION ────────────────────── */}
            <div className="card bg-white p-5 border border-slate-200 rounded-xl shadow-sm space-y-4">
              <div className="border-b border-slate-200 pb-3">
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-purple-700" />
                  <span>{t('3. Route Completed Scan To *', '3. Hantar Imbasan Selesai Ke *')}</span>
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {t('Select destination workflow for doctor review based on findings and case complexity.', 'Pilih destinasi semakan doktor.')}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
                <label className={`p-4 rounded-xl border cursor-pointer flex items-center gap-3 transition-all ${
                  routedToRole === 'Medical Officer'
                    ? 'bg-teal-50/70 border-teal-600 text-teal-950 shadow-sm ring-2 ring-teal-600/20'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white'
                }`}>
                  <input
                    type="radio"
                    name="routedToRole"
                    value="Medical Officer"
                    checked={routedToRole === 'Medical Officer'}
                    onChange={() => setRoutedToRole('Medical Officer')}
                    className="w-4 h-4 text-teal-600 focus:ring-teal-500"
                  />
                  <div>
                    <p className="font-bold text-sm">{t('Medical Officer (MO)', 'Pegawai Perubatan (MO)')}</p>
                    <p className="text-[11px] font-normal text-slate-600 mt-0.5">
                      {t('Routine primary doctor review & clinical management', 'Semakan rutin doktor perawat')}
                    </p>
                  </div>
                </label>

                <label className={`p-4 rounded-xl border cursor-pointer flex items-center gap-3 transition-all ${
                  routedToRole === 'Radiologist'
                    ? 'bg-purple-50/70 border-purple-600 text-purple-950 shadow-sm ring-2 ring-purple-600/20'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white'
                }`}>
                  <input
                    type="radio"
                    name="routedToRole"
                    value="Radiologist"
                    checked={routedToRole === 'Radiologist'}
                    onChange={() => setRoutedToRole('Radiologist')}
                    className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                  />
                  <div>
                    <p className="font-bold text-sm">{t('Specialist Radiologist', 'Pakar Radiologi')}</p>
                    <p className="text-[11px] font-normal text-slate-600 mt-0.5">
                      {t('Complex diagnostic scan requiring formal specialist report', 'Semakan pakar radiologi')}
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-200">
                <button
                  type="submit"
                  disabled={uploading || !selectedCaseId || files.length === 0}
                  className="btn-primary text-xs px-6 py-3 font-bold flex items-center gap-2 disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  <span>
                    {uploading
                      ? t('Uploading Scans...', 'Memuat Naik Imbasan...')
                      : t(`Upload Scans & Route to ${routedToRole}`, `Muat Naik & Hantar ke ${routedToRole}`)}
                  </span>
                </button>
              </div>
            </div>
          </>
        )}
      </form>

      {/* ── LIGHTBOX MODAL ──────────────────────────────────────────────── */}
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
