import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ux/Toast';
import type { Case } from '../../types';
import { Save, Lock, FileText, Radiation, Building2, ClipboardList } from 'lucide-react';

interface Props {
  caseItem: Case;
}

function ReadOnlyField({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-[10px] text-surface-500 uppercase font-semibold mb-0.5">{label}</p>
      <p className="text-sm text-surface-800">{value ?? <span className="text-surface-400 italic">—</span>}</p>
    </div>
  );
}

function YesNoBadge({ value }: { value?: string }) {
  if (!value) return <span className="text-surface-400 italic text-sm">—</span>;
  const isAffirmative = value === 'Yes' || value === 'Ya';
  const displayLabel = isAffirmative ? 'Yes' : 'No';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
      isAffirmative ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
    }`}>{displayLabel}</span>
  );
}

export default function RadiologyWorksheet({ caseItem }: Props) {
  const { currentUser } = useAuth();
  const { editCase, addAuditLog } = useData();
  const toast = useToast();

  const isRadiographer = currentUser?.role === 'Radiographer';
  const isAdmin = currentUser?.role === 'Administrator';
  const isReadOnly = !isRadiographer && !isAdmin;

  // Radiographer fields
  const [doseKvp, setDoseKvp] = useState(String(caseItem.doseKvp ?? ''));
  const [doseMas, setDoseMas] = useState(String(caseItem.doseMas ?? ''));
  const [dosRadiasi, setDosRadiasi] = useState(String(caseItem.dosRadiasi ?? ''));
  const [bilanganFilem, setBilanganFilem] = useState(String(caseItem.bilanganFilem ?? ''));
  const [bilanganCdDvd, setBilanganCdDvd] = useState(String(caseItem.bilanganCdDvd ?? ''));
  const [komen, setKomen] = useState(caseItem.komen ?? '');
  const [contrastMediaName, setContrastMediaName] = useState(caseItem.contrastMediaName ?? '');
  const [contrastMediaVolumeMl, setContrastMediaVolumeMl] = useState(String(caseItem.contrastMediaVolumeMl ?? ''));

  // Admin / Office-use fields
  const [waktuTerima, setWaktuTerima] = useState(caseItem.officeWaktuTerima ?? '');
  const [waktuSelesai, setWaktuSelesai] = useState(caseItem.officeWaktuSelesai ?? '');
  const [juruXRay, setJuruXRay] = useState(caseItem.officeJuruXRay ?? '');
  const [tarikhPemeriksaan, setTarikhPemeriksaan] = useState(
    caseItem.officeTarikhPemeriksaan ?? caseItem.scannedAt?.slice(0, 10) ?? ''
  );
  const [tarikhAppointment, setTarikhAppointment] = useState(caseItem.officeTarikhAppointment ?? '');
  const [masaAppointment, setMasaAppointment] = useState(caseItem.officeMasaAppointment ?? '');

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDoseKvp(String(caseItem.doseKvp ?? ''));
    setDoseMas(String(caseItem.doseMas ?? ''));
    setDosRadiasi(String(caseItem.dosRadiasi ?? ''));
    setBilanganFilem(String(caseItem.bilanganFilem ?? ''));
    setBilanganCdDvd(String(caseItem.bilanganCdDvd ?? ''));
    setKomen(caseItem.komen ?? '');
    setContrastMediaName(caseItem.contrastMediaName ?? '');
    setContrastMediaVolumeMl(String(caseItem.contrastMediaVolumeMl ?? ''));
    setWaktuTerima(caseItem.officeWaktuTerima ?? '');
    setWaktuSelesai(caseItem.officeWaktuSelesai ?? '');
    setJuruXRay(caseItem.officeJuruXRay ?? '');
    setTarikhPemeriksaan(caseItem.officeTarikhPemeriksaan ?? caseItem.scannedAt?.slice(0, 10) ?? '');
    setTarikhAppointment(caseItem.officeTarikhAppointment ?? '');
    setMasaAppointment(caseItem.officeMasaAppointment ?? '');
  }, [caseItem]);

  const handleSaveRadiographer = async () => {
    if (!currentUser) return;
    setSaving(true);
    try {
      await editCase(caseItem.id, {
        doseKvp: doseKvp ? Number(doseKvp) : undefined,
        doseMas: doseMas ? Number(doseMas) : undefined,
        dosRadiasi: dosRadiasi ? Number(dosRadiasi) : undefined,
        bilanganFilem: bilanganFilem ? Number(bilanganFilem) : undefined,
        bilanganCdDvd: bilanganCdDvd ? Number(bilanganCdDvd) : undefined,
        komen: komen.trim() || undefined,
        contrastMediaName: contrastMediaName.trim() || undefined,
        contrastMediaVolumeMl: contrastMediaVolumeMl ? Number(contrastMediaVolumeMl) : undefined,
      });
      await addAuditLog({
        userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role,
        action: 'MOH_WORKSHEET_DOSE_SAVED', target: `cases/${caseItem.id}`,
        details: `Saved dose/image worksheet for ${caseItem.caseNumber}`,
        timestamp: new Date().toISOString(),
      });
      toast.success('Dose & Exposure parameters saved');
    } catch {
      toast.error('Failed to save worksheet');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAdmin = async () => {
    if (!currentUser) return;
    setSaving(true);
    try {
      await editCase(caseItem.id, {
        officeWaktuTerima: waktuTerima || undefined,
        officeWaktuSelesai: waktuSelesai || undefined,
        officeJuruXRay: juruXRay.trim() || undefined,
        officeTarikhPemeriksaan: tarikhPemeriksaan || undefined,
        officeTarikhAppointment: tarikhAppointment || undefined,
        officeMasaAppointment: masaAppointment.trim() || undefined,
      });
      await addAuditLog({
        userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role,
        action: 'MOH_WORKSHEET_OFFICE_SAVED', target: `cases/${caseItem.id}`,
        details: `Saved administration data for ${caseItem.caseNumber}`,
        timestamp: new Date().toISOString(),
      });
      toast.success('Administration data saved');
    } catch {
      toast.error('Failed to save administration data');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header banner */}
      <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <ClipboardList className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-blue-800">Radiology Worksheet — MOH PER.SS-RA301</p>
          <p className="text-xs text-blue-600">Case Reference: {caseItem.caseNumber} — Patient: {caseItem.patientName}</p>
        </div>
        {isReadOnly && (
          <div className="ml-auto flex items-center gap-1.5 text-xs text-surface-500 bg-surface-100 px-2.5 py-1.5 rounded-lg">
            <Lock className="w-3.5 h-3.5" />
            Read-only
          </div>
        )}
      </div>

      {/* ── Clinical Screening Summary ───────────────────────────────────────── */}
      <div className="card">
        <h2 className="section-title flex items-center gap-2 mb-4">
          <FileText className="w-4 h-4 text-navy-600" />
          Clinical Screening Summary (Fields 12–17 &amp; 22)
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <ReadOnlyField label="12. LMP Date" value={caseItem.lmp} />
          <div>
            <p className="text-[10px] text-surface-500 uppercase font-semibold mb-0.5">13. Pregnant Status</p>
            <YesNoBadge value={caseItem.isPregnant} />
          </div>
          <div>
            <p className="text-[10px] text-surface-500 uppercase font-semibold mb-0.5">14. Allergy / Asthma</p>
            <YesNoBadge value={caseItem.hasAllergy} />
            {caseItem.allergyDetails && (
              <p className="text-xs text-amber-700 mt-1">{caseItem.allergyDetails}</p>
            )}
          </div>
          <div>
            <p className="text-[10px] text-surface-500 uppercase font-semibold mb-0.5">15. Mobile Required</p>
            <YesNoBadge value={caseItem.hasMobileDevice} />
          </div>
          <div>
            <p className="text-[10px] text-surface-500 uppercase font-semibold mb-0.5">16. Classification Toggles</p>
            <div className="flex gap-1 flex-wrap mt-1">
              {caseItem.isWarganegara && <span className="text-[10px] bg-navy-100 text-navy-700 px-1.5 py-0.5 rounded font-medium">Citizen: {caseItem.isWarganegara}</span>}
              {caseItem.isPenjawatAwam && <span className="text-[10px] bg-navy-100 text-navy-700 px-1.5 py-0.5 rounded font-medium">Civil Servant: {caseItem.isPenjawatAwam}</span>}
              {caseItem.isFpp && <span className="text-[10px] bg-navy-100 text-navy-700 px-1.5 py-0.5 rounded font-medium">FPP: {caseItem.isFpp}</span>}
              {!caseItem.isWarganegara && !caseItem.isPenjawatAwam && !caseItem.isFpp && <span className="text-surface-400 italic text-sm">—</span>}
            </div>
          </div>
          <ReadOnlyField label="Payment Category" value={caseItem.paymentCategory} />
          <ReadOnlyField label="17. Renal — Creatinine" value={caseItem.creatinine} />
          <ReadOnlyField label="17. eGFR" value={caseItem.egfr} />
          {caseItem.contrastMediaRequired && (
            <>
              <ReadOnlyField label="22. Contrast Brand" value={caseItem.contrastMediaName} />
              <ReadOnlyField label="22. Contrast Volume (ml)" value={caseItem.contrastMediaVolumeMl} />
            </>
          )}
        </div>
        {(caseItem.ringkasanKlinikal || caseItem.notes) && (
          <div className="mt-4 pt-4 border-t border-surface-200">
            <p className="text-[10px] text-surface-500 uppercase font-semibold mb-1">Clinical Notes</p>
            <p className="text-sm text-surface-700 whitespace-pre-line bg-surface-100 rounded-lg p-3">{caseItem.ringkasanKlinikal || caseItem.notes}</p>
          </div>
        )}
      </div>

      {/* ── Section 19 & 20: Dose + Image (Radiographer fills) ──────────────── */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title flex items-center gap-2">
            <span className="w-5 h-5 bg-emerald-600 rounded flex items-center justify-center text-white text-[10px] font-bold">19</span>
            Image Exposure &amp; Radiation Parameters (Sections 19 &amp; 20)
            {isRadiographer && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium ml-1">Radiographer Access</span>}
          </h2>
          {isRadiographer && (
            <button
              onClick={handleSaveRadiographer}
              disabled={saving}
              className="btn-primary text-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving…' : 'Save Parameters'}
            </button>
          )}
        </div>

        {isReadOnly ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ReadOnlyField label="Film Count" value={caseItem.bilanganFilem} />
            <ReadOnlyField label="CD / DVD Count" value={caseItem.bilanganCdDvd} />
            <ReadOnlyField label="kVp" value={caseItem.doseKvp} />
            <ReadOnlyField label="mAs" value={caseItem.doseMas} />
            <ReadOnlyField label="Radiation Dose (mSv)" value={caseItem.dosRadiasi} />
            {caseItem.contrastMediaName && <ReadOnlyField label="Contrast Brand" value={caseItem.contrastMediaName} />}
            {caseItem.contrastMediaVolumeMl && <ReadOnlyField label="Contrast Volume (ml)" value={caseItem.contrastMediaVolumeMl} />}
            {caseItem.komen && (
              <div className="col-span-full">
                <ReadOnlyField label="Radiographer Operational Comments" value={caseItem.komen} />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Image counts */}
            <div className="p-4 bg-surface-50 rounded-xl border border-surface-200 space-y-3">
              <p className="text-xs font-bold text-surface-700 uppercase tracking-wider">19. Image Exposure Output</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-surface-700 mb-1">Film Count</label>
                  <input type="number" min="0" value={bilanganFilem} onChange={(e) => setBilanganFilem(e.target.value)} className="input-field text-xs" placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-700 mb-1">CD / DVD Count</label>
                  <input type="number" min="0" value={bilanganCdDvd} onChange={(e) => setBilanganCdDvd(e.target.value)} className="input-field text-xs" placeholder="0" />
                </div>
              </div>
            </div>

            {/* Dose */}
            <div className="p-4 bg-surface-50 rounded-xl border border-surface-200 space-y-3">
              <p className="text-xs font-bold text-surface-700 uppercase tracking-wider">20. Radiation Exposure Parameters</p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-surface-700 mb-1">kVp</label>
                  <input type="number" min="0" value={doseKvp} onChange={(e) => setDoseKvp(e.target.value)} className="input-field text-xs" placeholder="e.g., 80" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-700 mb-1">mAs</label>
                  <input type="number" min="0" value={doseMas} onChange={(e) => setDoseMas(e.target.value)} className="input-field text-xs" placeholder="e.g., 20" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-700 mb-1">Radiation Dose (mSv)</label>
                  <input type="number" min="0" step="0.001" value={dosRadiasi} onChange={(e) => setDosRadiasi(e.target.value)} className="input-field text-xs" placeholder="e.g., 0.02" />
                </div>
              </div>
            </div>

            {/* Contrast Media */}
            {caseItem.contrastMediaRequired && (
              <div className="p-4 bg-purple-50 rounded-xl border border-purple-200 space-y-3">
                <p className="text-xs font-bold text-purple-800 uppercase tracking-wider">22. Contrast Media Details (Actual Administered)</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-purple-700 mb-1">Brand / Name</label>
                    <input value={contrastMediaName} onChange={(e) => setContrastMediaName(e.target.value)} className="input-field text-xs border-purple-200" placeholder="e.g., Omnipaque" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-purple-700 mb-1">Actual Volume (ml)</label>
                    <input type="number" min="0" value={contrastMediaVolumeMl} onChange={(e) => setContrastMediaVolumeMl(e.target.value)} className="input-field text-xs border-purple-200" placeholder="e.g., 100" />
                  </div>
                </div>
              </div>
            )}

            {/* Comments */}
            <div>
              <label className="block text-xs font-medium text-surface-700 mb-1">Radiographer Operational Comments</label>
              <textarea rows={3} value={komen} onChange={(e) => setKomen(e.target.value)} className="input-field resize-none text-xs" placeholder="Any technical notes, patient position, or scan parameters..." />
            </div>
          </div>
        )}
      </div>

      {/* ── Administration & Office Use (Admin fills) ───────────────────────── */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title flex items-center gap-2">
            <span className="w-5 h-5 bg-navy-600 rounded flex items-center justify-center text-white text-[10px] font-bold">ADM</span>
            Administration &amp; Office Use
            {isAdmin && <span className="text-[10px] bg-navy-100 text-navy-700 px-2 py-0.5 rounded-full font-medium ml-1">Administrator Access</span>}
          </h2>
          {isAdmin && (
            <button
              onClick={handleSaveAdmin}
              disabled={saving}
              className="btn-primary text-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving…' : 'Save Administration Data'}
            </button>
          )}
        </div>

        {isReadOnly || !isAdmin ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <ReadOnlyField label="Examination Reference No." value={caseItem.officeNoPemeriksaan ?? caseItem.caseNumber} />
            <ReadOnlyField label="Reception Time" value={caseItem.officeWaktuTerima ? new Date(caseItem.officeWaktuTerima).toLocaleString() : undefined} />
            <ReadOnlyField label="Completion Time" value={caseItem.officeWaktuSelesai ? new Date(caseItem.officeWaktuSelesai).toLocaleString() : undefined} />
            <ReadOnlyField label="X-Ray Technologist" value={caseItem.officeJuruXRay} />
            <ReadOnlyField label="Examination Date" value={caseItem.officeTarikhPemeriksaan} />
            <ReadOnlyField label="Appointment Date" value={caseItem.officeTarikhAppointment} />
            <ReadOnlyField label="Appointment Time" value={caseItem.officeMasaAppointment} />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-surface-700 mb-1">Examination Reference No.</label>
              <input disabled value={caseItem.officeNoPemeriksaan ?? caseItem.caseNumber} className="input-field text-xs bg-surface-100 text-surface-500 cursor-not-allowed font-mono" />
              <p className="text-[10px] text-surface-400 mt-1">Automatically bound to Case Number.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-surface-700 mb-1">Reception Time</label>
                <input type="datetime-local" value={waktuTerima} onChange={(e) => setWaktuTerima(e.target.value)} className="input-field text-xs" />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-700 mb-1">Completion Time</label>
                <input type="datetime-local" value={waktuSelesai} onChange={(e) => setWaktuSelesai(e.target.value)} className="input-field text-xs" />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-700 mb-1">X-Ray Technologist Name</label>
                <input value={juruXRay} onChange={(e) => setJuruXRay(e.target.value)} className="input-field text-xs" placeholder="Name of Radiographer / Technologist" />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-700 mb-1">Examination Date</label>
                <input type="date" value={tarikhPemeriksaan} onChange={(e) => setTarikhPemeriksaan(e.target.value)} className="input-field text-xs" />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-700 mb-1">Appointment Date</label>
                <input type="date" value={tarikhAppointment} onChange={(e) => setTarikhAppointment(e.target.value)} className="input-field text-xs" />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-700 mb-1">Appointment Time</label>
                <input type="time" value={masaAppointment} onChange={(e) => setMasaAppointment(e.target.value)} className="input-field text-xs" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
