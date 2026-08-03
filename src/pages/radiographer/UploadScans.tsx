import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ux/Toast';
import { useLanguage } from '../../context/LanguageContext';
import { Upload, Image as ImageIcon, X, CheckSquare, Zap, ShieldCheck } from 'lucide-react';
import { saveImage } from '../../services/imageStorage';
import { getEffectiveDoseForExam } from '../../data/effectiveDoseTable';

interface FlattenedViewItem {
  id: string; // e.g. "Chest / Thorax_PA (Posteroanterior)_0"
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

  // Technical Exposure Factors (MOH PER.SS-RA301 Section 19 & 20)
  const [doseKvp, setDoseKvp] = useState('');
  const [doseMas, setDoseMas] = useState('');
  const [dosRadiasi, setDosRadiasi] = useState('');
  const [bilanganFilem, setBilanganFilem] = useState('1');
  const [bilanganCdDvd, setBilanganCdDvd] = useState('0');
  const [komen, setKomen] = useState('');

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
        items.push({
          id,
          examIndex,
          bodyPart: ex.bodyPart,
          side: ex.side,
          viewName,
          notes: ex.notes,
        });
      });
    });
    return items;
  }, [selectedCase]);

  // Initialize all requested views as unchecked on case selection and auto-fill radiation dose benchmark
  useEffect(() => {
    if (!selectedCase) return;
    const initialChecked: Record<string, boolean> = {};
    flattenedViews.forEach((v) => {
      initialChecked[v.id] = false;
    });
    setCompletedViewIds(initialChecked);

    // Dose lookup
    if (selectedCase.requestedExaminations && selectedCase.requestedExaminations[0]) {
      const benchmark = getEffectiveDoseForExam(selectedCase.modality || 'X-Ray', selectedCase.requestedExaminations[0].bodyPart);
      if (benchmark) {
        setDosRadiasi(String(benchmark.dosMsv));
      }
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
      reader.onload = (event) => setPreviews((prev) => [...prev, event.target?.result as string]);
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
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
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="page-title">{t('Upload Scans & Route Case', 'Muat Naik Imbasan & Hantar Kes')}</h1>
        <p className="page-subtitle">
          {t('Upload DICOM/medical images, verify examination checklist, log exposure factors, and route case.', 'Muat naik imbasan perubatan, sahkan senarai ujian, catat faktor pendedahan, dan hantar kes.')}
        </p>
      </div>

      <form onSubmit={handleUpload} className="card space-y-6 bg-white p-6 border border-slate-200 rounded-xl shadow-sm">
        {/* Case Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1">{t('Select Scheduled Case *', 'Pilih Kes Dijadualkan *')}</label>
          <select required value={selectedCaseId} onChange={(e) => setSelectedCaseId(e.target.value)} className="select-field text-xs">
            <option value="">-- Choose a scheduled case --</option>
            {availableCases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.caseNumber} — {c.patientName} ({c.scanType})
              </option>
            ))}
          </select>
          {availableCases.length === 0 && <p className="text-xs text-surface-400 mt-1">No scheduled cases available in queue.</p>}
        </div>

        {selectedCase && (
          <>
            {/* ── 1. REQUESTED EXAMINATIONS CHECKLIST (Native Light Theme) ───────────────────────── */}
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-[#0F4C42]" />
                    <span>{t('Requested Examinations Checklist', 'Senarai Semak Ujian Dipesan')}</span>
                  </h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {t('Verify acquired projection views for the requested scan(s)', 'Sahkan pandangan imbasan bagi ujian yang dipesan')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                    {selectedCase.modality || 'X-Ray'}
                  </span>
                  <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-lg border border-emerald-200">
                    {completedViewsCount} / {totalViewsCount} {t('Views Acquired', 'Pandangan Selesai')}
                  </span>
                </div>
              </div>

              {/* Grouped Examination Cards */}
              {selectedCase.requestedExaminations && selectedCase.requestedExaminations.length > 0 ? (
                <div className="space-y-3">
                  {selectedCase.requestedExaminations.map((ex, examIdx) => (
                    <div key={ex.id || examIdx} className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-navy-900">
                          #{examIdx + 1} — {ex.bodyPart} {ex.side && ex.side !== 'N/A' ? `[${ex.side}]` : ''}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {ex.viewsOrProtocol.length} Required View(s)
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {ex.viewsOrProtocol.map((viewName) => {
                          const key = `${ex.bodyPart}_${viewName}_${examIdx}`;
                          const isChecked = !!completedViewIds[key];
                          return (
                            <label
                              key={viewName}
                              className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between gap-2.5 transition-all ${
                                isChecked
                                  ? 'bg-emerald-50/60 border-emerald-300 text-emerald-950'
                                  : 'bg-slate-50/80 border-slate-200 text-slate-700 hover:bg-white'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleViewCompleted(key)}
                                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                                />
                                <span className={`text-xs font-semibold ${isChecked ? 'line-through opacity-80' : ''}`}>
                                  {viewName}
                                </span>
                              </div>

                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                isChecked
                                  ? 'bg-emerald-200/70 text-emerald-900'
                                  : 'bg-slate-200/60 text-slate-600'
                              }`}>
                                {isChecked ? t('Acquired', 'Selesai') : t('Pending', 'Belum')}
                              </span>
                            </label>
                          );
                        })}
                      </div>

                      {ex.notes && (
                        <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded border border-slate-100">
                          <strong>Instruction:</strong> {ex.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700">
                  {selectedCase.scanType}
                </div>
              )}
            </div>

            {/* ── 2. ROUTING DECISION ────────────────────────────────────── */}
            <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2">
              <label className="block text-xs font-bold text-purple-950 uppercase tracking-wider">
                {t('Route Completed Scan To *', 'Hantar Imbasan Selesai Ke *')}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-semibold">
                <label className={`p-3 rounded-xl border cursor-pointer flex items-center gap-2.5 transition-all ${
                  routedToRole === 'Medical Officer'
                    ? 'bg-white border-purple-600 text-purple-950 shadow-sm ring-2 ring-purple-600/20'
                    : 'bg-surface-50 border-surface-200 text-slate-600 hover:bg-white'
                }`}>
                  <input
                    type="radio"
                    name="routedToRole"
                    value="Medical Officer"
                    checked={routedToRole === 'Medical Officer'}
                    onChange={() => setRoutedToRole('Medical Officer')}
                    className="text-purple-600 focus:ring-purple-500"
                  />
                  <div>
                    <p className="font-bold">{t('Medical Officer (MO)', 'Pegawai Perubatan (MO)')}</p>
                    <p className="text-[11px] font-normal text-slate-500">{t('Routine scan / primary doctor review', 'Semakan rutin doktor perawat')}</p>
                  </div>
                </label>

                <label className={`p-3 rounded-xl border cursor-pointer flex items-center gap-2.5 transition-all ${
                  routedToRole === 'Radiologist'
                    ? 'bg-white border-purple-600 text-purple-950 shadow-sm ring-2 ring-purple-600/20'
                    : 'bg-surface-50 border-surface-200 text-slate-600 hover:bg-white'
                }`}>
                  <input
                    type="radio"
                    name="routedToRole"
                    value="Radiologist"
                    checked={routedToRole === 'Radiologist'}
                    onChange={() => setRoutedToRole('Radiologist')}
                    className="text-purple-600 focus:ring-purple-500"
                  />
                  <div>
                    <p className="font-bold">{t('Specialist Radiologist', 'Pakar Radiologi')}</p>
                    <p className="text-[11px] font-normal text-slate-500">{t('Complex scan / priority specialist review', 'Laporan pakar radiologi berprestasi tinggi')}</p>
                  </div>
                </label>
              </div>
            </div>

            {/* ── 3. TECHNICAL EXPOSURE FACTORS (MOH PER.SS-RA301) ────────── */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-600" />
                {t('Technical Exposure Parameters (MOH PER.SS-RA301 Section 19 & 20)', 'Parameter Pendedahan Teknikal (KKM PER.SS-RA301)')}
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <span>kVp (Voltage)</span>
                    <span className="text-[10px] text-slate-400 cursor-help" title="Peak Kilovoltage — Machine penetration power factor">(i)</span>
                  </label>
                  <input type="text" value={doseKvp} onChange={(e) => setDoseKvp(e.target.value)} className="input-field text-xs font-mono" placeholder="e.g. 70" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <span>mAs (Current)</span>
                    <span className="text-[10px] text-slate-400 cursor-help" title="Milliampere-seconds — Machine tube current time exposure factor">(i)</span>
                  </label>
                  <input type="text" value={doseMas} onChange={(e) => setDoseMas(e.target.value)} className="input-field text-xs font-mono" placeholder="e.g. 15" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <span>Radiation Dose (mSv)</span>
                    <span className="text-[10px] text-amber-600 font-bold cursor-help" title="Effective Radiation Dose in Millisieverts — MOH Safety Compliance">(i)</span>
                  </label>
                  <input type="number" step="0.01" value={dosRadiasi} onChange={(e) => setDosRadiasi(e.target.value)} className="input-field text-xs font-mono text-amber-800 font-bold" placeholder="e.g. 0.02" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <span>Film / CD Count</span>
                    <span className="text-[10px] text-slate-400 cursor-help" title="Physical media outputs delivered to patient or ward">(i)</span>
                  </label>
                  <div className="flex gap-1">
                    <input type="number" value={bilanganFilem} onChange={(e) => setBilanganFilem(e.target.value)} className="input-field text-xs font-mono" placeholder="Films" title="Film count" />
                    <input type="number" value={bilanganCdDvd} onChange={(e) => setBilanganCdDvd(e.target.value)} className="input-field text-xs font-mono" placeholder="CDs" title="CD count" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Radiographer Comments / Remarks</label>
                <input type="text" value={komen} onChange={(e) => setKomen(e.target.value)} className="input-field text-xs" placeholder="e.g. Patient upright PA, good inspiration, optimal exposure" />
              </div>
            </div>

            {/* ── 4. QUALITY ASSURANCE CHECKLIST ───────────────────────────── */}
            <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-2 text-xs">
              <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                {t('Radiographer Quality Control (QA)', 'Kawalan Kualiti Imbasan (QA)')}
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-medium text-emerald-900">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={qaPatientIdVerified} onChange={(e) => setQaPatientIdVerified(e.target.checked)} className="rounded text-emerald-600" />
                  <span>Patient Identity Verified</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={qaMarkerVerified} onChange={(e) => setQaMarkerVerified(e.target.checked)} className="rounded text-emerald-600" />
                  <span>Anatomical Marker (L/R) Correct</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={qaQualityVerified} onChange={(e) => setQaQualityVerified(e.target.checked)} className="rounded text-emerald-600" />
                  <span>No Motion Artifacts</span>
                </label>
              </div>
            </div>
          </>
        )}

        {/* Image Dropzone & Previews */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-2">
            {t('Medical Images / DICOM Files *', 'Imbasan Perubatan / Fail DICOM *')}
          </label>
          <div className="border-2 border-dashed border-surface-300 rounded-xl p-8 text-center hover:border-navy-400 transition-colors bg-slate-50/50">
            <ImageIcon className="w-8 h-8 text-surface-400 mx-auto mb-2" />
            <p className="text-xs text-surface-600 mb-2 font-medium">Drop DICOM / image files here or click to browse</p>
            <input type="file" multiple accept="image/*,.dcm" onChange={handleFileChange} className="hidden" id="scan-upload" />
            <label htmlFor="scan-upload" className="btn-secondary text-xs cursor-pointer inline-block px-4 py-2 font-semibold">
              Choose Image Files
            </label>
          </div>

          {previews.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-bold text-surface-700 uppercase tracking-wider">
                Uploaded Image Previews ({previews.length})
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {previews.map((src, i) => (
                  <div key={i} className="relative group rounded-lg overflow-hidden border border-surface-300 bg-black aspect-square shadow-sm">
                    <img src={src} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-90 hover:opacity-100 transition-opacity"
                      title="Remove image"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[9px] font-mono px-1.5 py-0.5 rounded">
                      Image #{i + 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-3 border-t">
          <button
            type="submit"
            disabled={uploading || !selectedCaseId || files.length === 0}
            className="btn-primary text-xs px-6 py-2.5 font-bold flex items-center gap-2 disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            <span>{uploading ? t('Uploading Scans...', 'Memuat Naik Imbasan...') : t(`Upload Scans & Route to ${routedToRole}`, `Muat Naik & Hantar ke ${routedToRole}`)}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
