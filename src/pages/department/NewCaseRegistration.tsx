import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ux/Toast';
import { useDebounce } from '../../hooks/useDebounce';
import { useLanguage } from '../../context/LanguageContext';
import type { SeverityLevel, ExaminationRequest, ExaminationSide, MohYaTidak, MohPaymentCategory } from '../../types';
import {
  getModalityRef,
  MODALITY_REFERENCE_DATASET,
  getSideOptions,
} from '../../data/modalityReference';
import { getEffectiveDoseForExam, SENARAI_DOS_BERKESAN } from '../../data/effectiveDoseTable';
import { calculateMohPaymentCategory, formatPaymentCategoryBadge } from '../../utils/paymentCategory';
import {
  Info,
  Plus,
  Trash2,
  Layers,
  Check,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  User,
  Activity,
  FileCheck2,
  Building2,
  Sparkles,
  CreditCard,
  ShieldCheck,
} from 'lucide-react';

const MODALITIES = Object.keys(MODALITY_REFERENCE_DATASET);

interface FormExamCard {
  id: string;
  bodyPart: string;
  customBodyPart: string;
  side: ExaminationSide;
  viewsOrProtocol: string[];
  notes: string;
}

function createBlankExamCard(idSuffix: number): FormExamCard {
  return {
    id: `exam-${Date.now()}-${idSuffix}`,
    bodyPart: '',
    customBodyPart: '',
    side: 'N/A',
    viewsOrProtocol: [],
    notes: '',
  };
}

export default function NewCaseRegistration() {
  const { currentUser } = useAuth();
  const { clinics, patients, addCase, addAuditLog } = useData();
  const { language, t } = useLanguage();
  const toast = useToast();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // ── Step 1 State ─────────────────────────────────────────────────────
  const [patientId, setPatientId] = useState('');
  const [wardOrClinic, setWardOrClinic] = useState('Outpatient Clinic / A&E');
  const [disiplin, setDisiplin] = useState('General Medicine');
  const [indication, setIndication] = useState('');
  const [severity, setSeverity] = useState<SeverityLevel>('Moderate');

  // ── Step 2 State ─────────────────────────────────────────────────────
  const [modality, setModality] = useState('X-Ray');
  const [examCards, setExamCards] = useState<FormExamCard[]>([createBlankExamCard(1)]);
  const [showDoseModal, setShowDoseModal] = useState(false);

  // ── Step 3 State (Case Screening) ────────────────────────────────────
  const [lmp, setLmp] = useState('');
  const [isPregnant, setIsPregnant] = useState<MohYaTidak | ''>('');
  const [hasMobileDevice, setHasMobileDevice] = useState<MohYaTidak | ''>('No');
  const [renalFunctionDate, setRenalFunctionDate] = useState('');
  const [creatinine, setCreatinine] = useState('');
  const [egfr, setEgfr] = useState('');
  const [contrastMediaRequired, setContrastMediaRequired] = useState(false);
  const [clinicalNotes, setClinicalNotes] = useState('');

  // ── Step 4 State ─────────────────────────────────────────────────────
  const [preferredClinicId, setPreferredClinicId] = useState('');
  const [workflowPriority, setWorkflowPriority] = useState<'Emergency' | 'Non-Emergency'>('Emergency');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedPatient = patients.find((p) => p.id === patientId);

  const paymentBadge = useMemo(() => {
    if (!selectedPatient) return null;
    const cat = selectedPatient.paymentCategory || calculateMohPaymentCategory(
      selectedPatient.isWarganegara,
      selectedPatient.isPenjawatAwam,
      selectedPatient.isFpp
    );
    return formatPaymentCategoryBadge(cat, language);
  }, [selectedPatient, language]);

  const modalityRef = useMemo(() => getModalityRef(modality), [modality]);
  const isFemalePatient = selectedPatient?.gender === 'Female';
  const requiresRenal = contrastMediaRequired;

  const primaryExamDose = useMemo(() => {
    const primaryCard = examCards[0];
    if (!primaryCard || !primaryCard.bodyPart) return undefined;
    return getEffectiveDoseForExam(modality, primaryCard.bodyPart);
  }, [modality, examCards]);

  const step1Valid = Boolean(patientId && indication.trim());
  const step2Valid = useMemo(() => {
    if (!modality || examCards.length === 0) return false;
    return examCards.every((card) => {
      const partValid = card.bodyPart === 'Other' ? Boolean(card.customBodyPart.trim()) : Boolean(card.bodyPart);
      return partValid && card.viewsOrProtocol.length > 0;
    });
  }, [modality, examCards]);

  const step3Valid = useMemo(() => {
    if (!patientId) return true;
    if (isFemalePatient && !isPregnant) return false;
    if (requiresRenal && (!renalFunctionDate || !creatinine || !egfr)) return false;
    return true;
  }, [patientId, isFemalePatient, isPregnant, requiresRenal, renalFunctionDate, creatinine, egfr]);

  const isFormValid = step1Valid && step2Valid && step3Valid;

  const handleModalityChange = (newModality: string) => {
    setModality(newModality);
    setExamCards([createBlankExamCard(1)]);
    if (!['CT', 'MRI', 'Fluoro', 'Angio'].includes(newModality)) {
      setContrastMediaRequired(false);
    }
  };

  const handleAddCard = () => {
    setExamCards((prev) => [...prev, createBlankExamCard(prev.length + 1)]);
  };

  const handleRemoveCard = (index: number) => {
    if (index === 0) return;
    setExamCards((prev) => prev.filter((_, i) => i !== index));
  };

  const updateCard = (index: number, updates: Partial<FormExamCard>) => {
    setExamCards((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  const handleBodyPartChange = (index: number, newPart: string) => {
    const partRef = modalityRef.bodyParts.find((b) => b.name === newPart);
    const supportsLaterality = partRef?.supportsLaterality ?? true;
    const defaultSide: ExaminationSide = supportsLaterality ? 'Left' : 'N/A';
    const defaultOpts = partRef?.defaultViewsOrProtocols || [];

    updateCard(index, {
      bodyPart: newPart,
      customBodyPart: newPart === 'Other' ? '' : '',
      side: defaultSide,
      viewsOrProtocol: defaultOpts,
    });
  };

  const toggleCardOption = (index: number, option: string) => {
    const currentOpts = examCards[index].viewsOrProtocol;
    if (modalityRef.isMultiOptionAllowed) {
      const exists = currentOpts.includes(option);
      const nextOpts = exists ? currentOpts.filter((o) => o !== option) : [...currentOpts, option];
      updateCard(index, { viewsOrProtocol: nextOpts });
    } else {
      updateCard(index, { viewsOrProtocol: [option] });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || !currentUser) return;
    setSubmitting(true);

    const patient = selectedPatient;
    const preferredClinic = clinics.find((c) => c.id === preferredClinicId);
    const caseNumber = `XR${new Date().getFullYear()}${String(Date.now()).slice(-6)}`;

    const requestedExaminations: ExaminationRequest[] = examCards.map((card) => {
      const resolvedPart = card.bodyPart === 'Other' ? card.customBodyPart.trim() : card.bodyPart;
      return {
        id: card.id,
        bodyPart: resolvedPart,
        side: card.side,
        viewsOrProtocol: card.viewsOrProtocol,
        notes: card.notes.trim() || undefined,
      };
    });

    const scanTypeSummary = requestedExaminations.map((ex) => `${ex.bodyPart} (${ex.viewsOrProtocol.join(', ')})`).join('; ');
    const fullScanType = `${modality} — ${scanTypeSummary}`;

    try {
      await addCase({
        caseNumber,
        patientId,
        patientName: patient?.name || '',
        wardOrClinic: wardOrClinic || undefined,
        disiplin: disiplin || undefined,
        registeredById: currentUser.id,
        registeredByName: currentUser.name,
        clinicId: preferredClinicId || undefined,
        clinicName: preferredClinic?.name || undefined,
        scanType: fullScanType,
        modality,
        requestedExaminations,
        indication: indication.trim(),
        bodyRegion: 'General',
        severity: severity || 'Moderate',
        notes: clinicalNotes.trim(),
        status: 'CREATED',
        createdAt: new Date().toISOString(),
        lmp: lmp || undefined,
        isPregnant: isPregnant || undefined,
        hasAsthma: patient?.hasAsthma || 'No',
        previousContrastReaction: patient?.previousContrastReaction || 'No',
        hasMobileDevice: hasMobileDevice || undefined,
        isWarganegara: patient?.isWarganegara || 'Yes',
        isPenjawatAwam: patient?.isPenjawatAwam || 'No',
        isFpp: patient?.isFpp || 'No',
        paymentCategory: patient?.paymentCategory || 'Kerajaan',
        officeNoPemeriksaan: caseNumber,
      });

      await addAuditLog({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'CASE_CREATED',
        target: `cases/${caseNumber}`,
        details: `Registered ${caseNumber} for ${patient?.name}`,
        timestamp: new Date().toISOString(),
      });

      toast.success(t(`Case ${caseNumber} registered successfully`, `Kes ${caseNumber} berjaya didaftarkan`));
      setPatientId(''); setIndication(''); setExamCards([createBlankExamCard(1)]); setCurrentStep(1);
    } catch {
      toast.error(t('Failed to create case.', 'Gagal mendaftarkan kes.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900 tracking-tight">
          {t('Register New Radiology Case', 'Daftar Kes Radiologi Baharu')}
        </h1>
        <p className="text-xs text-surface-500 mt-1">
          {t('MOH PER.SS-RA301 Radiology Referral & Examination Request Form', 'Borang Permohonan Pemeriksaan Radiologi KKM PER.SS-RA301')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-6 bg-white border border-slate-200 rounded-xl p-6 shadow-md">
        {currentStep === 1 && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-slate-900">
              {t('Step 1: Patient & Clinical Indication', 'Langkah 1: Pesakit & Indikasi Klinikal')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  {t('Location (Ward / Clinic / A&E)', 'Lokasi (Wad / Klinik / A&E)')}
                </label>
                <input value={wardOrClinic} onChange={(e) => setWardOrClinic(e.target.value)} className="input-field text-xs" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  {t('Requesting Specialty / Department', 'Jabatan Pemohon')}
                </label>
                <input value={disiplin} onChange={(e) => setDisiplin(e.target.value)} className="input-field text-xs" required />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  {t('Select Registered Patient *', 'Pilih Pesakit Berdaftar *')}
                </label>
                <select value={patientId} onChange={(e) => setPatientId(e.target.value)} className="select-field text-xs" required>
                  <option value="">-- Select Patient --</option>
                  {patients.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.mrn}) — {p.nric}</option>)}
                </select>
              </div>

              {selectedPatient && (
                <div className="md:col-span-2 p-3 bg-navy-50/60 border border-navy-200 rounded-xl flex items-center justify-between">
                  <div className="text-xs text-navy-900">
                    <span className="font-bold">{selectedPatient.name}</span> &middot; MRN: <span className="font-mono font-bold">{selectedPatient.mrn}</span> &middot; NRIC: <span className="font-mono">{selectedPatient.nric}</span>
                  </div>
                  {paymentBadge && (
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${paymentBadge.color}`}>
                      {paymentBadge.label}
                    </span>
                  )}
                </div>
              )}

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  {t('Clinical Indication *', 'Indikasi Klinikal *')}
                </label>
                <textarea required rows={2} value={indication} onChange={(e) => setIndication(e.target.value)} className="input-field text-xs" placeholder="Presenting symptoms and history..." />
              </div>
            </div>
            <div className="flex justify-end">
              <button type="button" disabled={!step1Valid} onClick={() => setCurrentStep(2)} className="btn-primary text-xs flex items-center gap-1">
                <span>{t('Next: Modality', 'Seterusnya: Modaliti')}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-slate-900">
              {t('Step 2: Modality & Examination Request', 'Langkah 2: Modaliti & Ujian')}
            </h2>
            <div className="grid grid-cols-5 gap-2">
              {MODALITIES.map((m) => (
                <button key={m} type="button" onClick={() => handleModalityChange(m)} className={`py-2 rounded-lg text-xs font-bold border ${modality === m ? 'bg-navy-800 text-white' : 'bg-white'}`}>{m}</button>
              ))}
            </div>

            {primaryExamDose && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-amber-900">
                    {t('Effective Radiation Dose:', 'Dos Berkesan:')} {primaryExamDose.examination} — {primaryExamDose.dosMsv} mSv
                  </p>
                  <p className="text-amber-700 text-[10px]">Equivalency: ~{primaryExamDose.chestXrayRatio} Chest X-Rays</p>
                </div>
                <button type="button" onClick={() => setShowDoseModal(true)} className="text-amber-900 font-bold underline text-xs">View Dose Table</button>
              </div>
            )}

            <div className="flex justify-between">
              <button type="button" onClick={() => setCurrentStep(1)} className="btn-secondary text-xs"><ChevronLeft className="w-4 h-4" /> {t('Back', 'Kembali')}</button>
              <button type="button" disabled={!step2Valid} onClick={() => setCurrentStep(3)} className="btn-primary text-xs">{t('Next: Screening', 'Seterusnya: Saringan')} <ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-4 text-xs">
            <h2 className="text-base font-bold text-slate-900">
              {t('Step 3: Clinical Screening (MOH PER.SS-RA301)', 'Langkah 3: Saringan Klinikal')}
            </h2>

            {selectedPatient && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800">{selectedPatient.name}</span> ({selectedPatient.mrn}) &middot; Gender: {selectedPatient.gender}
                </div>
                {paymentBadge && (
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${paymentBadge.color}`}>
                    {paymentBadge.label}
                  </span>
                )}
              </div>
            )}

            {isFemalePatient && (
              <div className="p-3 bg-pink-50/70 border border-pink-200 rounded-xl space-y-2">
                <label className="font-bold text-pink-950 block">Pregnancy Screening (Field 13) *</label>
                <select value={isPregnant} onChange={(e) => setIsPregnant(e.target.value as MohYaTidak)} className="select-field text-xs" required>
                  <option value="">Select...</option>
                  <option value="No">No (Tidak)</option>
                  <option value="Yes">Yes (Ya)</option>
                </select>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <button type="button" onClick={() => setCurrentStep(2)} className="btn-secondary text-xs"><ChevronLeft className="w-4 h-4" /> {t('Back', 'Kembali')}</button>
              <button type="submit" disabled={!isFormValid || submitting} className="btn-primary text-xs">{t('Submit Case Referral', 'Hantar Rujukan Kes')}</button>
            </div>
          </div>
        )}
      </form>

      {showDoseModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-4 space-y-4">
            <h3 className="font-bold text-sm">EFFECTIVE RADIATION DOSE REFERENCE LIST</h3>
            <div className="max-h-60 overflow-y-auto text-xs">
              <table className="w-full border-collapse border border-slate-200">
                <thead className="bg-slate-100 font-bold"><tr><th className="p-2 border">Exam</th><th className="p-2 border">Dose (mSv)</th><th className="p-2 border">Chest X-Ray Ratio</th></tr></thead>
                <tbody>{SENARAI_DOS_BERKESAN.map((item) => <tr key={item.id} className="border-b"><td className="p-2 border font-medium">{item.examination}</td><td className="p-2 border font-mono font-bold text-center">{item.dosMsv}</td><td className="p-2 border font-mono text-center">~{item.chestXrayRatio}</td></tr>)}</tbody>
              </table>
            </div>
            <div className="flex justify-end"><button onClick={() => setShowDoseModal(false)} className="btn-secondary text-xs">Close</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
