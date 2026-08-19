import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ux/Toast';
import { Link, useSearchParams } from 'react-router-dom';
import type { ExternalImagingRequest } from '../../types';
import StatusBadge from '../../components/ui/StatusBadge';
import { saveImage } from '../../services/imageStorage';
import {
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  Building2,
  FileText,
  ShieldCheck,
  Zap,
  Activity,
  X,
  Send,
  SlidersHorizontal,
} from 'lucide-react';

export default function ExternalRadiographerWorkspace() {
  const [searchParams] = useSearchParams();
  const caseIdFromUrl = searchParams.get('caseId');
  const { currentUser } = useAuth();
  const { externalReferrals, cases, externalUploadScans } = useData();
  const toast = useToast();

  const [selectedReferralId, setSelectedReferralId] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // Technical Exposure Factors
  const [doseKvp, setDoseKvp] = useState('75');
  const [doseMas, setDoseMas] = useState('12');
  const [dosRadiasi, setDosRadiasi] = useState('0.02');
  const [bilanganFilem, setBilanganFilem] = useState('1');
  const [bilanganCdDvd, setBilanganCdDvd] = useState('0');
  const [radiographerFindings, setRadiographerFindings] = useState('');
  const [radiographerImpression, setRadiographerImpression] = useState('');
  const [routedToRole, setRoutedToRole] = useState<'Medical Officer' | 'Radiologist'>('Medical Officer');

  // Filter assigned external imaging cases
  const assignedCases = useMemo(() => {
    return externalReferrals.filter(
      (r) =>
        r.assignedRadiographerId === currentUser?.id ||
        r.status === 'EXTERNAL_RADIOGRAPHER_ASSIGNED' ||
        r.caseId === caseIdFromUrl
    );
  }, [externalReferrals, currentUser?.id, caseIdFromUrl]);

  // Set initial selected referral if caseId in URL or list available
  React.useEffect(() => {
    if (caseIdFromUrl) {
      const match = externalReferrals.find((r) => r.caseId === caseIdFromUrl);
      if (match) setSelectedReferralId(match.id);
    } else if (assignedCases.length > 0 && !selectedReferralId) {
      setSelectedReferralId(assignedCases[0].id);
    }
  }, [caseIdFromUrl, assignedCases, selectedReferralId, externalReferrals]);

  const selectedReferral = useMemo(() => {
    return externalReferrals.find((r) => r.id === selectedReferralId);
  }, [externalReferrals, selectedReferralId]);

  const matchedCase = useMemo(() => {
    if (!selectedReferral) return null;
    return cases.find((c) => c.id === selectedReferral.caseId);
  }, [cases, selectedReferral]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...selectedFiles]);
    selectedFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviews((prev) => [...prev, event.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReferral || !currentUser) return;
    if (files.length === 0) {
      toast.error('Please attach at least one medical scan image.');
      return;
    }

    setUploading(true);
    try {
      // Save images into local image storage
      const imageKeys: string[] = [];
      for (const dataUrl of previews) {
        const key = await saveImage(dataUrl);
        imageKeys.push(key);
      }

      await externalUploadScans(selectedReferral.id, {
        imageKeys,
        technicalFactors: {
          doseKvp: Number(doseKvp) || undefined,
          doseMas: Number(doseMas) || undefined,
          dosRadiasi: Number(dosRadiasi) || undefined,
          bilanganFilem: Number(bilanganFilem) || 1,
          bilanganCdDvd: Number(bilanganCdDvd) || 0,
        },
        radiographerFindings: radiographerFindings.trim(),
        radiographerImpression: radiographerImpression.trim(),
        routedToRole,
        uploadedBy: currentUser,
      });

      toast.success(
        `Scans uploaded successfully! Case returned to Initial Medical Officer (${matchedCase?.initialMoName || 'Primary MO'}) for final clinical review.`
      );

      setFiles([]);
      setPreviews([]);
      setRadiographerFindings('');
      setRadiographerImpression('');
    } catch (err: any) {
      console.error('External scan upload failed:', err);
      toast.error(err.message || 'Failed to upload scans.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 text-[10px] font-bold bg-[#0F4C42] text-white rounded">
              EXTERNAL RADIOGRAPHER WORKSPACE
            </span>
            <span className="text-xs text-slate-500 font-medium">Public &amp; Private Hospital Imaging</span>
          </div>
          <h1 className="page-title">External Imaging Upload &amp; Worksheet</h1>
          <p className="page-subtitle">
            Perform assigned external scans and upload DICOM/imaging files directly back to HealthGrid IQ.
          </p>
        </div>
      </div>

      {/* ── CORE BUSINESS RULE BANNER ───────────────────────────────────── */}
      <div className="bg-[#EFF6F3] border border-[#BFD8D0] rounded-xl p-4 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-[#0F4C42] shrink-0 mt-0.5" />
        <div className="text-xs space-y-0.5">
          <div className="font-bold text-[#0F172A]">External Imaging Service Protocol:</div>
          <p className="text-[#334155] leading-relaxed">
            External hospitals DO NOT create duplicate clinical cases. You are providing imaging service only. Once uploaded, scans attach directly to the original patient case and route back to the Initial Medical Officer for final sign-off.
          </p>
        </div>
      </div>

      {/* ── ASSIGNED CASE SELECTOR & WORKSPACE ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Assigned External Queue */}
        <div className="space-y-4 lg:col-span-1">
          <div className="card p-4 space-y-3">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span>Assigned Referral Queue</span>
              <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px]">{assignedCases.length}</span>
            </h2>

            <div className="space-y-2">
              {assignedCases.map((req) => {
                const isSelected = req.id === selectedReferralId;
                return (
                  <button
                    key={req.id}
                    type="button"
                    onClick={() => setSelectedReferralId(req.id)}
                    className={`w-full text-left p-3 rounded-lg border text-xs transition-all space-y-1 ${
                      isSelected
                        ? 'bg-[#EFF6F3] border-[#0F4C42] ring-1 ring-[#0F4C42]'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-[#0F4C42]">{req.caseNumber}</span>
                      <StatusBadge status={req.status} />
                    </div>
                    <div className="font-semibold text-slate-900">{req.patientName}</div>
                    <div className="text-[11px] text-slate-500">
                      Modality: {req.modality} · Clinic: {req.originatingClinicName || 'Origin'}
                    </div>
                  </button>
                );
              })}
              {assignedCases.length === 0 && (
                <div className="text-center py-6 text-slate-400 text-xs">
                  No external cases currently assigned to you.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Imaging Execution & Upload Form */}
        <div className="lg:col-span-2 space-y-4">
          {selectedReferral && matchedCase ? (
            <form onSubmit={handleUploadSubmit} className="card p-5 space-y-5">
              {/* Selected Case Header */}
              <div className="flex items-start justify-between border-b border-slate-200 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-[#0F4C42]">{selectedReferral.caseNumber}</span>
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-700 rounded">
                      {selectedReferral.modality}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-900 mt-1">Patient: {selectedReferral.patientName}</p>
                  <p className="text-[11px] text-slate-500">
                    Originating Facility: {selectedReferral.originatingClinicName || 'Primary Health Center'} · Primary MO: {matchedCase.initialMoName || 'Dr. Medical Officer'}
                  </p>
                </div>

                <Link to={`/case/${selectedReferral.caseId}`} className="btn-secondary text-xs">
                  View Full Case
                </Link>
              </div>

              {/* Upload Dropzone */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Attach Medical Scan Files (DICOM / JPEG / PNG) <span className="text-red-500">*</span>
                </label>
                <div className="border-2 border-dashed border-slate-300 hover:border-[#0F4C42] rounded-xl p-6 text-center bg-slate-50/60 transition-colors">
                  <input
                    type="file"
                    id="externalScanUpload"
                    multiple
                    accept="image/*,.dcm"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="externalScanUpload" className="cursor-pointer space-y-2 flex flex-col items-center">
                    <Upload className="w-8 h-8 text-slate-400" />
                    <span className="text-xs font-semibold text-[#0F4C42]">
                      Click to browse or drag and drop scans here
                    </span>
                    <span className="text-[11px] text-slate-400">High-resolution diagnostic captures</span>
                  </label>
                </div>

                {/* Previews */}
                {previews.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-2">
                    {previews.map((src, i) => (
                      <div key={i} className="relative group rounded-lg overflow-hidden border border-slate-200 bg-black max-h-24">
                        <img src={src} alt={`Scan ${i + 1}`} className="w-full h-24 object-contain" />
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Technical Factors */}
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#0F4C42]" />
                  Technical Exposure Factors
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">kVp</label>
                    <input
                      type="text"
                      value={doseKvp}
                      onChange={(e) => setDoseKvp(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0F4C42]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">mAs</label>
                    <input
                      type="text"
                      value={doseMas}
                      onChange={(e) => setDoseMas(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0F4C42]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Radiation Dose (mSv)</label>
                    <input
                      type="text"
                      value={dosRadiasi}
                      onChange={(e) => setDosRadiasi(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0F4C42]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Film Count</label>
                    <input
                      type="text"
                      value={bilanganFilem}
                      onChange={(e) => setBilanganFilem(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0F4C42]"
                    />
                  </div>
                </div>
              </div>

              {/* Preliminary Findings & Routing Target */}
              <div className="space-y-3 pt-2 border-t border-slate-200 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Preliminary Radiographer Observations / Findings
                  </label>
                  <textarea
                    value={radiographerFindings}
                    onChange={(e) => setRadiographerFindings(e.target.value)}
                    placeholder="Enter preliminary image quality notes, technical observations, or anatomy views completed..."
                    rows={2}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0F4C42]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Forward Review Pathway <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={routedToRole}
                      onChange={(e) => setRoutedToRole(e.target.value as 'Medical Officer' | 'Radiologist')}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0F4C42]"
                    >
                      <option value="Medical Officer">Initial Medical Officer (Standard Review)</option>
                      <option value="Radiologist">Specialist Radiologist (Diagnostic Report Required)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="submit"
                  disabled={uploading || files.length === 0}
                  className="btn-primary text-xs flex items-center gap-1.5 px-5 py-2.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  {uploading ? 'Attaching & Routing Scans...' : 'Submit Scans to HealthGrid IQ'}
                </button>
              </div>
            </form>
          ) : (
            <div className="card p-12 text-center text-slate-400 space-y-2">
              <ImageIcon className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">Select a case from the assigned queue</p>
              <p className="text-xs text-slate-400">Cases assigned to your external radiographer account appear on the left</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
