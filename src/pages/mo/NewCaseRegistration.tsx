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
import { LOCATION_PRESETS, SPECIALTY_PRESETS } from '../../data/clinicalLocations';
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
  Calendar,
  Clock,
} from 'lucide-react';

const MODALITIES = Object.keys(MODALITY_REFERENCE_DATASET);

const SYMPTOM_SUGGESTIONS = [
  'Persistent cough', 'Chest pain', 'Shortness of breath',
  'Headache or dizziness', 'Head injury', 'Neck pain',
  'Back pain', 'Abdominal pain', 'Pelvic pain',
  'Joint pain or swelling', 'Limb injury', 'Numbness or weakness',
  'Suspected fracture', 'Post-operative follow-up',
];

const SEVERITIES: SeverityLevel[] = ['Mild', 'Moderate', 'Severe', 'Critical'];

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

  // ── Step 1 State (Patient & Context) ──────────────────────────────────
  const [patientId, setPatientId] = useState('');
  const [wardOrClinic, setWardOrClinic] = useState('');
  const [customWardOrClinic, setCustomWardOrClinic] = useState('');
  const [disiplin, setDisiplin] = useState('');
  const [customDisiplin, setCustomDisiplin] = useState('');
  const [indication, setIndication] = useState('');
  const [symptomOption, setSymptomOption] = useState('');
  const [customIndication, setCustomIndication] = useState('');
  const [severity, setSeverity] = useState<SeverityLevel>('Moderate');

  // ── Step 2 State (Modality & Examinations) ────────────────────────────
  const [modality, setModality] = useState('X-Ray');
  const [examCards, setExamCards] = useState<FormExamCard[]>([createBlankExamCard(1)]);
  const [showDoseModal, setShowDoseModal] = useState(false);

  // ── Step 3 State (Case-Specific Screening) ─────────────────────────────
  const [lmp, setLmp] = useState('');
  const [isPregnant, setIsPregnant] = useState<MohYaTidak | ''>('');
  const [hasMobileDevice, setHasMobileDevice] = useState<MohYaTidak | ''>('No'); // Transport mobility
  const [renalFunctionDate, setRenalFunctionDate] = useState('');
  const [creatinine, setCreatinine] = useState('');
  const [egfr, setEgfr] = useState('');
  const [contrastMediaRequired, setContrastMediaRequired] = useState(false);
  const [contrastMediaName, setContrastMediaName] = useState('');
  const [contrastMediaVolumeMl, setContrastMediaVolumeMl] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');

  // ── Step 4 State (Priority & Scheduling) ──────────────────────────────
  const [preferredClinicId, setPreferredClinicId] = useState('');
  const [workflowPriority, setWorkflowPriority] = useState<'Emergency' | 'Non-Emergency'>('Emergency');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedPatient = patients.find((p) => p.id === patientId);

  // Auto-calculated Payment Category Badge
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

  // Estimated Dose for primary exam
  const primaryExamDose = useMemo(() => {
    const primaryCard = examCards[0];
    if (!primaryCard || !primaryCard.bodyPart) return undefined;
    return getEffectiveDoseForExam(modality, primaryCard.bodyPart);
  }, [modality, examCards]);

  const resolvedWardOrClinic = wardOrClinic === 'Other' ? customWardOrClinic.trim() : wardOrClinic;
  const resolvedDisiplin = disiplin === 'Other' ? customDisiplin.trim() : disiplin;

  // Step Validations
  const step1Valid = Boolean(patientId && indication.trim() && resolvedWardOrClinic && resolvedDisiplin);
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

  const handleSymptomSelect = (symptom: string) => {
    setSymptomOption(symptom);
    if (symptom !== 'Others') {
      setIndication(symptom);
    } else {
      setIndication(customIndication);
    }
  };

  const handleCustomIndicationChange = (text: string) => {
    setCustomIndication(text);
    if (symptomOption === 'Others') {
      setIndication(text);
    }
  };

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

    const scanTypeSummary = requestedExaminations
      .map((ex) => `${ex.bodyPart} (${ex.viewsOrProtocol.join(', ')})`)
      .join('; ');
    const fullScanType = `${modality} — ${scanTypeSummary}`;

    const uniqueRegions = Array.from(
      new Set(
        examCards.map((card) => {
          const partRef = modalityRef.bodyParts.find((b) => b.name === card.bodyPart);
          return partRef?.bodyRegion || (card.bodyPart === 'Other' ? card.customBodyPart : card.bodyPart);
        }).filter(Boolean)
      )
    ).join(', ');

    try {
      await addCase({
        caseNumber,
        patientId,
        patientName: patient?.name || '',
        wardOrClinic: resolvedWardOrClinic || undefined,
        disiplin: resolvedDisiplin || undefined,
        registeredById: currentUser.id,
        registeredByName: currentUser.name,
        clinicId: preferredClinicId || undefined,
        clinicName: preferredClinic?.name || undefined,
        scanType: fullScanType,
        modality,
        requestedExaminations,
        indication: indication.trim(),
        bodyRegion: uniqueRegions || 'General',
        severity: severity || 'Moderate',
        notes: clinicalNotes.trim(),
        status: 'CREATED',
        createdAt: new Date().toISOString(),
        scheduledAt: workflowPriority === 'Non-Emergency' && scheduledDate ? `${scheduledDate}T${scheduledTime || '09:00'}:00` : undefined,
        officeTarikhAppointment: workflowPriority === 'Non-Emergency' ? scheduledDate : undefined,
        officeMasaAppointment: workflowPriority === 'Non-Emergency' ? scheduledTime : undefined,
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
      setPatientId('');
      setWardOrClinic('');
      setCustomWardOrClinic('');
      setDisiplin('');
      setCustomDisiplin('');
      setIndication('');
      setExamCards([createBlankExamCard(1)]);
      setCurrentStep(1);
    } catch {
      toast.error(t('Failed to create case.', 'Gagal mendaftarkan kes.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 tracking-tight">
            {t('Register New Radiology Case', 'Daftar Kes Radiologi Baharu')}
          </h1>
          <p className="text-xs text-surface-500 mt-1">
            {t('MOH PER.SS-RA301 Radiology Referral & Examination Request Form', 'Borang Permohonan Pemeriksaan Radiologi KKM PER.SS-RA301')}
          </p>
        </div>
      </div>

      {/* Stepper Bar */}
      <div className="bg-white border border-surface-200 rounded-xl p-3 shadow-sm flex items-center justify-between">
        {[
          { step: 1, label: t('1. Patient & Indication', '1. Pesakit & Indikasi') },
          { step: 2, label: t('2. Modality & Exam', '2. Modaliti & Ujian') },
          { step: 3, label: t('3. Case Screening', '3. Saringan Kes') },
          { step: 4, label: t('4. Priority & Submit', '4. Keutamaan & Hantar') },
        ].map((item) => (
          <button
            key={item.step}
            type="button"
            onClick={() => {
              if (item.step === 1) setCurrentStep(1);
              if (item.step === 2 && step1Valid) setCurrentStep(2);
              if (item.step === 3 && step1Valid && step2Valid) setCurrentStep(3);
              if (item.step === 4 && step1Valid && step2Valid && step3Valid) setCurrentStep(4);
            }}
            className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
              currentStep === item.step
                ? 'bg-navy-900 text-white shadow-sm'
                : item.step < currentStep
                ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                : 'text-surface-400 hover:text-surface-600'
            }`}
          >
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── STEP 1: PATIENT & INDICATION ─────────────────────────────────── */}
        {currentStep === 1 && (
          <div className="card space-y-5 bg-white p-6 border border-surface-200 rounded-xl shadow-sm">
            <h2 className="text-base font-bold text-navy-900 border-b pb-2">
              {t('Step 1: Patient Selection & Clinical Indication', 'Langkah 1: Pemilihan Pesakit & Indikasi Klinikal')}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-surface-700 mb-1">
                  {t('Location (Ward / Clinic / A&E)', 'Lokasi (Wad / Klinik / A&E)')} *
                </label>
                <select
                  value={wardOrClinic}
                  onChange={(e) => setWardOrClinic(e.target.value)}
                  className="input-field text-xs bg-white"
                  required
                >
                  <option value="">{t('-- Select Location --', '-- Pilih Lokasi --')}</option>
                  {LOCATION_PRESETS.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
                {wardOrClinic === 'Other' && (
                  <input
                    type="text"
                    value={customWardOrClinic}
                    onChange={(e) => setCustomWardOrClinic(e.target.value)}
                    className="input-field text-xs mt-2"
                    placeholder={t('Specify location details (e.g., Ward 4B, Room 12)', 'Nyatakan butiran lokasi (cth. Wad 4B, Bilik 12)')}
                    required
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-surface-700 mb-1">
                  {t('Requesting Specialty / Department', 'Jabatan / Disiplin Pemohon')} *
                </label>
                <select
                  value={disiplin}
                  onChange={(e) => setDisiplin(e.target.value)}
                  className="input-field text-xs bg-white"
                  required
                >
                  <option value="">{t('-- Select Specialty / Department --', '-- Pilih Jabatan / Disiplin --')}</option>
                  {SPECIALTY_PRESETS.map((spec) => (
                    <option key={spec} value={spec}>
                      {spec}
                    </option>
                  ))}
                </select>
                {disiplin === 'Other' && (
                  <input
                    type="text"
                    value={customDisiplin}
                    onChange={(e) => setCustomDisiplin(e.target.value)}
                    className="input-field text-xs mt-2"
                    placeholder={t('Specify specialty / department name', 'Nyatakan nama jabatan / disiplin')}
                    required
                  />
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-surface-700 mb-1">
                  {t('Select Registered Patient', 'Pilih Pesakit Berdaftar')} *
                </label>
                <PatientSearchSelect patients={patients} value={patientId} onChange={setPatientId} />
              </div>
            </div>

            {/* Selected Patient Auto-Summary Card */}
            {selectedPatient && (
              <div className="p-4 bg-navy-50/60 border border-navy-200 rounded-xl flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-navy-900">{selectedPatient.name}</h3>
                    <span className="text-xs font-mono bg-white px-2 py-0.5 rounded border text-navy-800 font-bold">
                      {selectedPatient.mrn}
                    </span>
                    {paymentBadge && (
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${paymentBadge.color}`}>
                        {paymentBadge.label}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-surface-600 mt-1">
                    NRIC: <span className="font-mono">{selectedPatient.nric}</span> &middot; Gender: {selectedPatient.gender} &middot; DOB: {selectedPatient.dob}
                  </p>
                  <p className="text-xs text-surface-500 mt-0.5">
                    Address: {selectedPatient.address} &middot; Phone: {selectedPatient.phone}
                  </p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-surface-700 mb-1">
                {t('Clinical Indication & History', 'Indikasi Klinikal & Sejarah')} *
              </label>
              <textarea
                required
                rows={3}
                value={indication}
                onChange={(e) => setIndication(e.target.value)}
                className="input-field text-xs"
                placeholder={t('Enter clinical indication, symptoms, and referral notes...', 'Masukkan indikasi klinikal, simptom, dan nota rujukan...')}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-surface-700 mb-2">
                {t('Clinical Severity', 'Tahap Keutamaan Klinikal')}
              </label>
              <div className="flex gap-2">
                {SEVERITIES.map((sev) => (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => setSeverity(sev)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                      severity === sev ? 'bg-navy-900 text-white border-navy-900' : 'bg-white text-surface-700 border-surface-300 hover:bg-surface-50'
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                disabled={!step1Valid}
                onClick={() => setCurrentStep(2)}
                className="btn-primary text-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                <span>{t('Next: Imaging Modality', 'Seterusnya: Modaliti')}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: MODALITY & EXAMINATIONS ─────────────────────────────── */}
        {currentStep === 2 && (
          <div className="card space-y-6 bg-white p-6 border border-surface-200 rounded-xl shadow-sm">
            <h2 className="text-base font-bold text-navy-900 border-b pb-2">
              {t('Step 2: Imaging Modality & Examination Requests', 'Langkah 2: Modaliti & Permohonan Ujian')}
            </h2>

            <div>
              <label className="block text-xs font-bold text-surface-700 mb-2">
                {t('Imaging Modality', 'Modaliti Radiologi')} *
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {MODALITIES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleModalityChange(m)}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-0.5 ${
                      modality === m
                        ? 'bg-navy-800 text-white border-navy-800 shadow-md ring-2 ring-navy-200'
                        : 'bg-white border-surface-300 text-surface-700 hover:border-surface-400 hover:bg-surface-50'
                    }`}
                  >
                    <span>{m}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Effective Dose Indicator */}
            {primaryExamDose && (
              <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Activity className="w-4 h-4 text-amber-700 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-amber-950">
                      {t('Effective Dose Reference:', 'Dos Berkesan:')} {primaryExamDose.examination} — <span className="font-mono text-amber-800">{primaryExamDose.dosMsv} mSv</span>
                    </p>
                    <p className="text-[10px] text-amber-700">
                      Equivalency: <strong>~{primaryExamDose.chestXrayRatio} Chest X-Ray(s)</strong> (MOH UNSCEAR benchmark)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDoseModal(true)}
                  className="text-xs text-amber-900 font-bold underline px-2 py-1 bg-amber-100/60 rounded-lg hover:bg-amber-200/60 transition-colors shrink-0"
                >
                  {t('View Dose Table', 'Lihat Jadual Dos')}
                </button>
              </div>
            )}

            {/* Repeatable Exam Cards */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-surface-700 uppercase tracking-wider">
                  {t('Requested Examinations', 'Senarai Pemeriksaan')} ({examCards.length})
                </h3>
                <button
                  type="button"
                  onClick={handleAddCard}
                  className="btn-secondary text-xs flex items-center gap-1.5 py-1 px-2.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('Add Examination', 'Tambah Ujian')}</span>
                </button>
              </div>

              {examCards.map((card, index) => {
                const partRef = modalityRef.bodyParts.find((b) => b.name === card.bodyPart);
                const supportsLaterality = partRef?.supportsLaterality ?? true;
                const sideOpts = getSideOptions(supportsLaterality);

                return (
                  <div key={card.id} className="p-4 bg-surface-50 border border-surface-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-navy-800">
                        {t('Exam Card', 'Kad Ujian')} #{index + 1}
                      </span>
                      {index > 0 && (
                        <button type="button" onClick={() => handleRemoveCard(index)} className="text-xs text-red-600 font-semibold hover:text-red-700 flex items-center gap-1">
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-surface-700 mb-1">
                          {t('Anatomical Region / Body Part', 'Bahagian Anggota / Anatomi')} *
                        </label>
                        <select
                          value={card.bodyPart}
                          onChange={(e) => handleBodyPartChange(index, e.target.value)}
                          className="select-field text-xs"
                          required
                        >
                          <option value="">-- Select Body Part --</option>
                          {modalityRef.bodyParts.map((b) => (
                            <option key={b.name} value={b.name}>{b.name}</option>
                          ))}
                          <option value="Other">Other / Custom</option>
                        </select>
                      </div>

                      {card.bodyPart === 'Other' && (
                        <div>
                          <label className="block text-xs font-medium text-surface-700 mb-1">Custom Body Part *</label>
                          <input
                            type="text"
                            value={card.customBodyPart}
                            onChange={(e) => updateCard(index, { customBodyPart: e.target.value })}
                            className="input-field text-xs"
                            placeholder="Specify body part"
                            required
                          />
                        </div>
                      )}

                      {supportsLaterality && (
                        <div>
                          <label className="block text-xs font-medium text-surface-700 mb-1">Laterality (Side) *</label>
                          <select
                            value={card.side}
                            onChange={(e) => updateCard(index, { side: e.target.value as ExaminationSide })}
                            className="select-field text-xs"
                          >
                            {sideOpts.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                      )}
                    </div>

                    {partRef && (
                      <div>
                        <label className="block text-xs font-semibold text-surface-700 mb-1.5">
                          {modalityRef.optionTypeLabel} *
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {partRef.defaultViewsOrProtocols.map((opt) => {
                            const isSelected = card.viewsOrProtocol.includes(opt);
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => toggleCardOption(index, opt)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                                  isSelected ? 'bg-navy-800 text-white border-navy-800' : 'bg-white text-surface-700 border-surface-300 hover:bg-surface-100'
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button type="button" onClick={() => setCurrentStep(1)} className="btn-secondary text-xs flex items-center gap-1">
                <ChevronLeft className="w-4 h-4" />
                <span>{t('Back', 'Kembali')}</span>
              </button>
              <button type="button" disabled={!step2Valid} onClick={() => setCurrentStep(3)} className="btn-primary text-xs flex items-center gap-1.5 disabled:opacity-50">
                <span>{t('Next: Case Screening', 'Seterusnya: Saringan')}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: CASE-SPECIFIC CLINICAL SCREENING ─────────────────────── */}
        {currentStep === 3 && (
          <div className="card space-y-5 bg-white p-6 border border-surface-200 rounded-xl shadow-sm">
            <h2 className="text-base font-bold text-navy-900 border-b pb-2">
              {t('Step 3: Clinical Screening (MOH PER.SS-RA301)', 'Langkah 3: Saringan Klinikal (KKM PER.SS-RA301)')}
            </h2>

            {/* Master Patient Inheritance Summary Badge Card */}
            {selectedPatient && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    {t('Master Patient & Billing Profile (Auto-Inherited)', 'Profil Pesakit & Bayaran Induk (Warisan Otomatik)')}
                  </span>
                  {paymentBadge && (
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md border ${paymentBadge.color}`}>
                      {paymentBadge.label}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-600 pt-1">
                  <div><span className="font-semibold">Name:</span> {selectedPatient.name}</div>
                  <div><span className="font-semibold">MRN:</span> {selectedPatient.mrn}</div>
                  <div><span className="font-semibold">NRIC:</span> {selectedPatient.nric}</div>
                  <div><span className="font-semibold">Gender:</span> {selectedPatient.gender}</div>
                  <div><span className="font-semibold">Asthma:</span> {selectedPatient.hasAsthma || 'No'}</div>
                  <div><span className="font-semibold">Prior Contrast Reaction:</span> {selectedPatient.previousContrastReaction || 'No'}</div>
                </div>
              </div>
            )}

            {/* Episode-Specific Screening */}
            <div className="space-y-4">
              {/* Pregnancy Screening (For Female Patients) */}
              {isFemalePatient && (
                <div className="p-4 bg-pink-50/70 border border-pink-200 rounded-xl space-y-3">
                  <h3 className="text-xs font-bold text-pink-950 uppercase tracking-wider flex items-center gap-1.5">
                    <span>{t('Pregnancy Screening (Field 13)', 'Saringan Kehamilan (Ruangan 13)')}</span>
                    <span className="text-[10px] text-pink-700 cursor-help" title="Radiation Safety Check — Prevents accidental X-Ray radiation exposure to fetus">(i)</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                        <span>{t('Is Patient Currently Pregnant?', 'Adakah Pesakit Mengandung?')} *</span>
                        <span className="text-[10px] text-slate-400 cursor-help" title="Required for radiation safety protocol">(i)</span>
                      </label>
                      <select
                        required
                        value={isPregnant}
                        onChange={(e) => setIsPregnant(e.target.value as MohYaTidak)}
                        className="select-field text-xs font-semibold"
                      >
                        <option value="">-- Select --</option>
                        <option value="No">No (Tidak)</option>
                        <option value="Yes">Yes (Ya)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                        <span>{t('Last Menstrual Period (LMP)', 'Tarikh Haid Terakhir (LMP)')}</span>
                        <span className="text-[10px] text-slate-400 cursor-help" title="Last Menstrual Period — Verifies radiation safety window">(i)</span>
                      </label>
                      <input
                        type="date"
                        value={lmp}
                        onChange={(e) => setLmp(e.target.value)}
                        className="input-field text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Patient Mobility & Transport */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  {t('Patient Transport / Mobility Mode', 'Mod Pengangkutan / Pergerakan Pesakit')}
                </label>
                <select
                  value={hasMobileDevice}
                  onChange={(e) => setHasMobileDevice(e.target.value as MohYaTidak)}
                  className="select-field text-xs font-semibold max-w-xs"
                >
                  <option value="No">Ambulatory / Walking (Mobile)</option>
                  <option value="Yes">Wheelchair / Stretcher / Trolley Required</option>
                </select>
              </div>

              {/* Contrast Media Renal Screening (If IV Contrast Scan) */}
              {['CT', 'MRI', 'Fluoro', 'Angio'].includes(modality) && (
                <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-navy-900">
                      {t('Requires IV Contrast Media Administration?', 'Memerlukan Pentadbiran Media Kontras?')}
                    </label>
                    <input
                      type="checkbox"
                      checked={contrastMediaRequired}
                      onChange={(e) => setContrastMediaRequired(e.target.checked)}
                      className="w-4 h-4 text-navy-800 rounded"
                    />
                  </div>

                  {contrastMediaRequired && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Renal Lab Test Date *</label>
                        <input
                          type="date"
                          required
                          value={renalFunctionDate}
                          onChange={(e) => setRenalFunctionDate(e.target.value)}
                          className="input-field text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Serum Creatinine (µmol/L) *</label>
                        <input
                          type="number"
                          required
                          value={creatinine}
                          onChange={(e) => setCreatinine(e.target.value)}
                          className="input-field text-xs"
                          placeholder="e.g. 78"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">eGFR (mL/min/1.73m²) *</label>
                        <input
                          type="number"
                          required
                          value={egfr}
                          onChange={(e) => setEgfr(e.target.value)}
                          className="input-field text-xs"
                          placeholder="e.g. 95"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Clinical Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  {t('Additional Clinical Notes for Radiologist / Radiographer', 'Nota Tambahan Untuk Radiologis / Juru X-Ray')}
                </label>
                <textarea
                  rows={3}
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  className="input-field text-xs"
                  placeholder="Optional referral notes..."
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button type="button" onClick={() => setCurrentStep(2)} className="btn-secondary text-xs flex items-center gap-1">
                <ChevronLeft className="w-4 h-4" />
                <span>{t('Back', 'Kembali')}</span>
              </button>
              <button type="button" disabled={!step3Valid} onClick={() => setCurrentStep(4)} className="btn-primary text-xs flex items-center gap-1.5 disabled:opacity-50">
                <span>{t('Next: Scheduling & Priority', 'Seterusnya: Penjadualan')}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: PRIORITY & SUBMIT ────────────────────────────────────── */}
        {currentStep === 4 && (
          <div className="card space-y-5 bg-white p-6 border border-surface-200 rounded-xl shadow-sm">
            <h2 className="text-base font-bold text-navy-900 border-b pb-2">
              {t('Step 4: Scheduling Priority & Referral Submission', 'Langkah 4: Keutamaan & Penyerahan')}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  {t('Workflow Priority', 'Tahap Keutamaan Workflow')}
                </label>
                <select
                  value={workflowPriority}
                  onChange={(e) => setWorkflowPriority(e.target.value as 'Emergency' | 'Non-Emergency')}
                  className="select-field text-xs font-bold"
                >
                  <option value="Emergency">Emergency (Immediate Slot / PACS Van Routing)</option>
                  <option value="Non-Emergency">Non-Emergency / Elective Appointment</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  {t('Preferred Diagnostic Centre / PACS Van', 'Pilihan Klinik / Van PACS')}
                </label>
                <select
                  value={preferredClinicId}
                  onChange={(e) => setPreferredClinicId(e.target.value)}
                  className="select-field text-xs"
                >
                  <option value="">-- No preference (AI Auto-Assign) --</option>
                  {clinics.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {workflowPriority === 'Non-Emergency' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">Preferred Appointment Date</label>
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="input-field text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">Preferred Time Slot</label>
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="input-field text-xs"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <button type="button" onClick={() => setCurrentStep(3)} className="btn-secondary text-xs flex items-center gap-1">
                <ChevronLeft className="w-4 h-4" />
                <span>{t('Back', 'Kembali')}</span>
              </button>
              <button type="submit" disabled={!isFormValid || submitting} className="btn-primary text-xs px-5 py-2.5 font-bold flex items-center gap-2">
                {submitting ? 'Submitting Case...' : 'Submit Radiology Case Referral'}
              </button>
            </div>
          </div>
        )}
      </form>

      {/* SENARAI DOS BERKESAN MODAL */}
      {showDoseModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-4 bg-navy-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">
                  {t('EFFECTIVE RADIATION DOSE REFERENCE LIST', 'SENARAI DOS BERKESAN UNTUK PEMERIKSAAN RADIOLOGI')}
                </h3>
                <p className="text-[10px] text-navy-200">Kementerian Kesihatan Malaysia PER.SS-RA301 Benchmark</p>
              </div>
              <button
                type="button"
                onClick={() => setShowDoseModal(false)}
                className="w-7 h-7 rounded-full bg-navy-800 hover:bg-red-600 text-white flex items-center justify-center font-bold text-xs transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 text-xs">
              <p className="text-slate-600 text-[11px] italic bg-slate-50 p-2 rounded-lg border border-slate-200">
                Source: Health Physics Society Fact Sheet 2010, UNSCEAR 2008 Report Vol.1 &amp; FA Mettler et al., Radiology 2008
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse border border-slate-200 text-xs">
                  <thead className="bg-slate-100 font-bold text-slate-800">
                    <tr>
                      <th className="p-2.5 border border-slate-200">Radiology Examination</th>
                      <th className="p-2.5 border border-slate-200 text-center">Dose (mSv)</th>
                      <th className="p-2.5 border border-slate-200 text-center">Chest (AP) Ratio</th>
                      <th className="p-2.5 border border-slate-200">Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SENARAI_DOS_BERKESAN.map((item) => (
                      <tr key={item.id} className="hover:bg-amber-50/40 border-b border-slate-200">
                        <td className="p-2.5 font-semibold text-slate-900 border border-slate-200">
                          {item.examination}
                          {item.notes && <span className="block text-[10px] text-amber-700 font-normal">{item.notes}</span>}
                        </td>
                        <td className="p-2.5 border border-slate-200 text-center font-mono font-bold text-navy-900">
                          {item.dosMsv}
                        </td>
                        <td className="p-2.5 border border-slate-200 text-center font-mono font-bold text-emerald-700">
                          ~{item.chestXrayRatio}
                        </td>
                        <td className="p-2.5 border border-slate-200 text-[11px] text-slate-600">
                          {item.category}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowDoseModal(false)}
                className="btn-secondary text-xs px-4 py-2"
              >
                Close Reference Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PatientSearchSelect({
  patients,
  value,
  onChange,
}: {
  patients: import('../../types').Patient[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [search, setSearch] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const debouncedSearch = useDebounce(search, 180);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = patients.find((p) => p.id === value);
  const filtered = patients.filter((p) =>
    p.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    p.mrn.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    p.nric.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  return (
    <div className="relative" ref={ref}>
      <input
        type="text"
        value={open ? search : (selected ? `${selected.name} (${selected.mrn}) — NRIC: ${selected.nric}` : '')}
        onChange={(e) => { setSearch(e.target.value); if (!open) setOpen(true); }}
        onFocus={() => { setOpen(true); setSearch(''); }}
        placeholder="Search patient name, MRN, or NRIC..."
        className="input-field"
        required={!value}
      />
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-surface-300 rounded-lg shadow-elevated z-30 max-h-60 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="p-3 text-sm text-surface-400 text-center">No patients found</p>
          ) : (
            filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => { onChange(p.id); setOpen(false); setSearch(''); }}
                className={`w-full text-left px-3 py-2.5 text-sm hover:bg-surface-100 transition-colors border-b border-surface-100 last:border-0 ${value === p.id ? 'bg-navy-50 font-semibold' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-surface-800">{p.name}</span>
                  <span className="text-xs text-surface-500 font-mono">{p.mrn}</span>
                </div>
                <div className="text-[11px] text-surface-500 mt-0.5">
                  NRIC: {p.nric} &middot; Gender: {p.gender} &middot; DOB: {p.dob}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
