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
  SlidersHorizontal,
  RotateCcw,
  MapPin,
} from 'lucide-react';
import { findNearestClinic, haversineDistance } from '../../services/routingService';

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
  const { clinics, patients, addCase, addAuditLog, users } = useData();
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

  const uniqueClinics = useMemo(() => {
    const seen = new Set<string>();
    return clinics.filter((c) => {
      const key = (c.name || '').trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [clinics]);

  const [isManualClinicOverride, setIsManualClinicOverride] = useState(false);

  // Count active radiographers deployed per clinic
  const radiographersByClinic = useMemo(() => {
    const map: Record<string, number> = {};
    (users || []).forEach((u) => {
      const isRad =
        u.role === 'Radiographer' ||
        u.role === 'Public Hospital Radiographer' ||
        u.role === 'Private Hospital Radiographer';
      if (isRad && u.status === 'active' && u.deploymentLocationId && u.leaveStatus !== 'On Leave') {
        map[u.deploymentLocationId] = (map[u.deploymentLocationId] || 0) + 1;
      }
    });
    return map;
  }, [users]);

  // Compute nearest clinic for the selected patient factoring in radiographers & distance
  const nearestClinicForPatient = useMemo(() => {
    if (!selectedPatient) return null;
    const activeClinics = uniqueClinics.filter((c) => c.status === 'active' || !c.status);
    if (activeClinics.length === 0) return null;

    if (selectedPatient.latitude && selectedPatient.longitude) {
      const sorted = activeClinics
        .map((c) => {
          const lat = c.latitude;
          const lon = c.longitude;
          const dist = haversineDistance(
            selectedPatient.latitude!,
            selectedPatient.longitude!,
            lat,
            lon
          );
          const radCount = radiographersByClinic[c.id] || 0;
          return { clinic: c, distanceKm: Math.round(dist * 10) / 10, radCount };
        })
        .sort((a, b) => {
          if (a.radCount > 0 && b.radCount === 0) return -1;
          if (b.radCount > 0 && a.radCount === 0) return 1;
          return a.distanceKm - b.distanceKm;
        });

      if (sorted.length > 0) {
        return sorted[0];
      }
    }
    if (selectedPatient.preferredClinicId) {
      const found = activeClinics.find((c) => c.id === selectedPatient.preferredClinicId);
      if (found) return { clinic: found, distanceKm: 0, radCount: radiographersByClinic[found.id] || 0 };
    }
    return null;
  }, [selectedPatient, uniqueClinics, radiographersByClinic]);

  // When patient changes, automatically default to AI recommended facility unless manual override is toggled
  React.useEffect(() => {
    if (selectedPatient && !isManualClinicOverride) {
      if (nearestClinicForPatient?.clinic.id) {
        setPreferredClinicId(nearestClinicForPatient.clinic.id);
      } else if (selectedPatient.preferredClinicId) {
        setPreferredClinicId(selectedPatient.preferredClinicId);
      }
    }
  }, [selectedPatient, nearestClinicForPatient, isManualClinicOverride]);

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
        notes: indication.trim(),
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
    <div className="w-full pb-10">

      {/* =========================================================
          PAGE HEADER
      ========================================================== */}

      <form onSubmit={handleSubmit} className="space-y-2">

        {/* =========================================================
            WORKFLOW STEPPER
        ========================================================== */}
        <section className="bg-white border border-surface-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-surface-200 bg-surface-50/60">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { step: 1, label: t('Patient & Referral', 'Pesakit & Rujukan') },
                { step: 2, label: t('Examination', 'Pemeriksaan') },
                { step: 3, label: t('Clinical Screening', 'Saringan Klinikal') },
                { step: 4, label: t('Review & Submit', 'Semak & Hantar') },
              ].map((item) => {
                const accessible =
                  item.step === 1 ||
                  (item.step === 2 && step1Valid) ||
                  (item.step === 3 && step1Valid && step2Valid) ||
                  (item.step === 4 && step1Valid && step2Valid && step3Valid);

                return (
                  <button
                    key={item.step}
                    type="button"
                    disabled={!accessible}
                    onClick={() => {
                      if (!accessible) return;
                      setCurrentStep(item.step as 1 | 2 | 3 | 4);
                    }}
                    className={`
                      inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold
                      border transition-all
                      ${currentStep === item.step
                        ? 'bg-[#0F4C42] text-white border-[#0F4C42] shadow-sm'
                        : item.step < currentStep
                          ? 'bg-[#EFF6F3] text-[#0F4C42] border-[#D8E8E2] hover:bg-[#E5F1ED]'
                          : 'bg-white text-surface-400 border-surface-200 hover:bg-surface-50 hover:text-surface-600'
                      }
                      disabled:cursor-not-allowed
                    `}
                  >
                    <span className={`
                      w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold
                      ${currentStep === item.step
                        ? 'bg-white/15 text-white'
                        : item.step < currentStep
                          ? 'bg-white text-[#0F4C42]'
                          : 'bg-surface-100 text-surface-500'
                      }
                    `}>
                      {item.step}
                    </span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* =========================================================
            STEP 1 — PATIENT & INDICATION
        ========================================================== */}
        {currentStep === 1 && (
          <>
            <section className="bg-white border border-surface-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-surface-200 bg-surface-50/60">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#EFF6F3] flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-[#0F4C42]" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-navy-900">
                      {t('Patient & Referral Details', 'Maklumat Pesakit & Rujukan')}
                    </h2>
                    <p className="text-[11px] text-surface-500 mt-0.5">
                      {t(
                        'Select the patient and provide referral details.',
                        'Pilih pesakit dan masukkan maklumat rujukan.'
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-surface-700 mb-1.5">
                    {t('Patient *', 'Pesakit *')}
                  </label>
                  <PatientSearchSelect patients={patients} value={patientId} onChange={setPatientId} />
                </div>

                {selectedPatient && (
                  <div className="rounded-xl border border-surface-200 bg-surface-50/60 p-4 space-y-2.5">
                    {/* NRIC */}
                    <div className="grid grid-cols-[110px_1fr] sm:grid-cols-[130px_1fr] gap-2 items-baseline text-xs">
                      <span className="text-surface-500 font-medium">{t('NRIC', 'No. KP')}</span>
                      <span className="font-mono font-semibold text-surface-900">{selectedPatient.nric}</span>
                    </div>

                    {/* Gender */}
                    <div className="grid grid-cols-[110px_1fr] sm:grid-cols-[130px_1fr] gap-2 items-baseline text-xs">
                      <span className="text-surface-500 font-medium">{t('Gender', 'Jantina')}</span>
                      <span className="font-semibold text-surface-900">{selectedPatient.gender}</span>
                    </div>

                    {/* Date of Birth */}
                    <div className="grid grid-cols-[110px_1fr] sm:grid-cols-[130px_1fr] gap-2 items-baseline text-xs">
                      <span className="text-surface-500 font-medium">{t('Date of birth', 'Tarikh lahir')}</span>
                      <span className="font-semibold text-surface-900">{selectedPatient.dob}</span>
                    </div>

                    {/* Address */}
                    {selectedPatient.address && (
                      <div className="grid grid-cols-[110px_1fr] sm:grid-cols-[130px_1fr] gap-2 items-baseline text-xs">
                        <span className="text-surface-500 font-medium">{t('Address', 'Alamat')}</span>
                        <span className="text-surface-700 leading-relaxed">{selectedPatient.address}</span>
                      </div>
                    )}

                    {/* Medical History */}
                    {selectedPatient.medicalHistory && (
                      <div className="grid grid-cols-[110px_1fr] sm:grid-cols-[130px_1fr] gap-2 items-baseline text-xs">
                        <span className="text-surface-500 font-medium">{t('History', 'Sejarah')}</span>
                        <span className="text-surface-700 leading-relaxed">{selectedPatient.medicalHistory}</span>
                      </div>
                    )}
                  </div>
                )}


                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-surface-700 mb-1.5">
                      {t('Requesting Location *', 'Lokasi Pemohon *')}
                    </label>
                    <select
                      value={wardOrClinic}
                      onChange={(e) => setWardOrClinic(e.target.value)}
                      className="select-field w-full"
                      required
                    >
                      <option value="">{t('Select ward, clinic, or A&E', 'Pilih wad, klinik, atau A&E')}</option>
                      {LOCATION_PRESETS.map((loc) => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                    </select>

                    {wardOrClinic === 'Other' && (
                      <input
                        type="text"
                        value={customWardOrClinic}
                        onChange={(e) => setCustomWardOrClinic(e.target.value)}
                        className="input-field text-sm mt-2 w-full"
                        placeholder={t(
                          'Specify location details (e.g., Ward 4B, Room 12)',
                          'Nyatakan butiran lokasi (cth. Wad 4B, Bilik 12)'
                        )}
                        required
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-surface-700 mb-1.5">
                      {t('Requesting Department *', 'Jabatan Pemohon *')}
                    </label>
                    <select
                      value={disiplin}
                      onChange={(e) => setDisiplin(e.target.value)}
                      className="select-field w-full"
                      required
                    >
                      <option value="">
                        {t('Select department', 'Pilih jabatan')}
                      </option>
                      {SPECIALTY_PRESETS.map((spec) => (
                        <option key={spec} value={spec}>{spec}</option>
                      ))}
                    </select>

                    {disiplin === 'Other' && (
                      <input
                        type="text"
                        value={customDisiplin}
                        onChange={(e) => setCustomDisiplin(e.target.value)}
                        className="input-field text-sm mt-2 w-full"
                        placeholder={t('Specify specialty / department name', 'Nyatakan nama jabatan / disiplin')}
                        required
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-surface-700 mb-1.5">
                    {t('Clinical Indication & Referral Notes *', 'Indikasi Klinikal & Nota Rujukan *')}
                  </label>
                  <textarea
                    required
                    value={indication}
                    onChange={(e) => setIndication(e.target.value)}
                    className="input-field !h-auto min-h-[110px] py-2.5 resize-y text-sm w-full"
                    placeholder={t(
                      'Describe symptoms, relevant history, and reason for examination...',
                      'Nyatakan simptom, sejarah berkaitan, dan sebab pemeriksaan...'
                    )}
                  />

                  <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-semibold text-surface-400">
                      {t('Common indications', 'Indikasi biasa')}:
                    </span>
                    {SYMPTOM_SUGGESTIONS.slice(0, 7).map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setIndication((prev) => (prev ? `${prev} ; ${preset}` : preset))}
                        className="text-[10px] bg-surface-50 hover:bg-[#EFF6F3] hover:border-[#BFD8D0] text-surface-700 border border-surface-200 px-2 py-1 rounded-md transition-all"
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-surface-700 mb-2">
                    {t('Clinical Severity', 'Tahap Keutamaan Klinikal')}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {SEVERITIES.map((sev) => (
                      <button
                        key={sev}
                        type="button"
                        onClick={() => setSeverity(sev)}
                        className={`
                          px-3 py-2 rounded-lg text-xs font-semibold border transition-all
                          ${severity === sev
                            ? sev === 'Mild'
                              ? 'bg-blue-100 text-blue-700 border-blue-200'
                              : sev === 'Moderate'
                                ? 'bg-amber-100 text-amber-700 border-amber-200'
                                : sev === 'Severe'
                                  ? 'bg-orange-100 text-orange-700 border-orange-200'
                                  : 'bg-red-600 text-white border-red-600'
                            : 'bg-white text-surface-700 border-surface-200 hover:bg-surface-50'
                          }
                        `}
                      >
                        {sev}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <div className="bg-white border border-surface-200 rounded-xl shadow-sm px-6 py-4 flex justify-end">
              <button
                type="button"
                disabled={!step1Valid}
                onClick={() => setCurrentStep(2)}
                className="btn-primary text-sm px-5 py-2.5 flex items-center gap-2 disabled:opacity-60"
              >
                {t('Next: Examination', 'Seterusnya: Pemeriksaan')}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}

        {/* =========================================================
            STEP 2 — MODALITY & EXAMINATIONS
        ========================================================== */}
        {currentStep === 2 && (
          <>
            <section className="bg-white border border-surface-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-surface-200 bg-surface-50/60">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#EFF6F3] flex items-center justify-center shrink-0">
                    <Activity className="w-4 h-4 text-[#0F4C42]" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-navy-900">
                      {t('Examination Requests', 'Permohonan Pemeriksaan')}
                    </h2>
                    <p className="text-[11px] text-surface-500 mt-0.5">
                      {t(
                        'Select the imaging modality and requested examination.',
                        'Pilih modaliti pengimejan dan pemeriksaan yang diperlukan.'
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-surface-700 mb-2">
                    {t('Imaging Modality *', 'Modaliti Radiologi *')}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {MODALITIES.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => handleModalityChange(m)}
                        className={`
                          min-h-[64px] rounded-lg text-xs font-semibold border transition-all
                          flex items-center justify-center
                          ${modality === m
                            ? 'bg-[#EFF6F3] text-[#0F4C42] border-[#A9C9BF] shadow-sm'
                            : 'bg-white border-surface-200 text-surface-700 hover:bg-surface-50 hover:border-surface-300'
                          }
                        `}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {primaryExamDose && (
                  <div className="rounded-lg bg-[#FFF9E8] border border-[#F0D58A] px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <Activity className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-amber-900">
                          {t('Effective Dose Reference', 'Rujukan Dos Berkesan')}
                        </p>
                        <p className="text-[11px] text-amber-800 mt-0.5">
                          {primaryExamDose.examination} — <span className="font-mono font-bold">{primaryExamDose.dosMsv} mSv</span>
                          <span className="mx-1.5">•</span>
                          ~{primaryExamDose.chestXrayRatio} Chest X-Ray(s)
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowDoseModal(true)}
                      className="text-[11px] font-semibold text-amber-900 bg-white/70 border border-amber-200 rounded-md px-3 py-1.5 hover:bg-white"
                    >
                      {t('View Dose Table', 'Lihat Jadual Dos')}
                    </button>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                      <h3 className="text-sm font-bold text-navy-900">
                        {t('Requested Examinations', 'Senarai Pemeriksaan')} ({examCards.length})
                      </h3>
                      <p className="text-[10px] text-surface-400 mt-0.5">
                        {t('Add one or more examination requests for this case.', 'Tambah satu atau lebih permohonan pemeriksaan untuk kes ini.')}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddCard}
                      className="btn-secondary text-xs flex items-center gap-1.5 py-2 px-3"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {t('Add Examination', 'Tambah Ujian')}
                    </button>
                  </div>

                  <div className="space-y-3">
                    {examCards.map((card, index) => {
                      const partRef = modalityRef.bodyParts.find((b) => b.name === card.bodyPart);
                      const supportsLaterality = partRef?.supportsLaterality ?? true;
                      const sideOpts = getSideOptions(supportsLaterality);

                      return (
                        <div key={card.id} className="rounded-lg border border-surface-200 overflow-hidden">
                          <div className="px-4 py-3 bg-surface-50/60 border-b border-surface-200 flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold text-navy-900">
                                {t('Examination Request', 'Permohonan Pemeriksaan')} #{index + 1}
                              </p>
                            </div>
                            {index > 0 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveCard(index)}
                                className="text-[11px] text-red-600 font-semibold hover:text-red-700 flex items-center gap-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                {t('Remove', 'Buang')}
                              </button>
                            )}
                          </div>

                          <div className="p-4 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-semibold text-surface-700 mb-1.5">
                                  {t('Anatomical Region / Body Part *', 'Bahagian Anatomi *')}
                                </label>
                                <select
                                  value={card.bodyPart}
                                  onChange={(e) => handleBodyPartChange(index, e.target.value)}
                                  className="select-field w-full"
                                  required
                                >
                                  <option value="">{t('-- Select Body Part --', '-- Pilih Bahagian --')}</option>
                                  {modalityRef.bodyParts.map((b) => (
                                    <option key={b.name} value={b.name}>{b.name}</option>
                                  ))}
                                  <option value="Other">{t('Other / Custom', 'Lain-lain / Tersuai')}</option>
                                </select>
                              </div>

                              {card.bodyPart === 'Other' && (
                                <div>
                                  <label className="block text-sm font-semibold text-surface-700 mb-1.5">
                                    {t('Custom Body Part *', 'Bahagian Tersuai *')}
                                  </label>
                                  <input
                                    type="text"
                                    value={card.customBodyPart}
                                    onChange={(e) => updateCard(index, { customBodyPart: e.target.value })}
                                    className="input-field w-full"
                                    placeholder={t('Specify body part', 'Nyatakan bahagian')}
                                    required
                                  />
                                </div>
                              )}

                              {supportsLaterality && (
                                <div>
                                  <label className="block text-sm font-semibold text-surface-700 mb-1.5">
                                    {t('Laterality (Side) *', 'Sisi *')}
                                  </label>
                                  <select
                                    value={card.side}
                                    onChange={(e) => updateCard(index, { side: e.target.value as ExaminationSide })}
                                    className="select-field w-full"
                                  >
                                    {sideOpts.map((s) => <option key={s} value={s}>{s}</option>)}
                                  </select>
                                </div>
                              )}
                            </div>

                            {partRef && (
                              <div>
                                <label className="block text-sm font-semibold text-surface-700 mb-2">
                                  {modalityRef.optionTypeLabel} *
                                </label>
                                <div className="flex flex-wrap gap-2">
                                  {partRef.defaultViewsOrProtocols.map((opt) => {
                                    const isSelected = card.viewsOrProtocol.includes(opt);
                                    return (
                                      <button
                                        key={opt}
                                        type="button"
                                        onClick={() => toggleCardOption(index, opt)}
                                        className={`
                                          px-3 py-2 rounded-lg text-xs font-semibold border transition-all
                                          ${isSelected
                                            ? 'bg-[#0F4C42] text-white border-[#0F4C42]'
                                            : 'bg-white text-surface-700 border-surface-200 hover:bg-surface-50'
                                          }
                                        `}
                                      >
                                        {opt}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            <div>
                              <label className="block text-sm font-semibold text-surface-700 mb-1.5">
                                {t('Examination Notes', 'Nota Pemeriksaan')}
                              </label>
                              <textarea
                                value={card.notes}
                                onChange={(e) => updateCard(index, { notes: e.target.value })}
                                className="input-field !h-auto min-h-[110px] py-2.5 resize-y text-sm w-full"
                                placeholder={t('Optional notes for the radiographer or radiologist...', 'Nota tambahan untuk radiografer atau radiologis...')}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            <div className="bg-white border border-surface-200 rounded-xl shadow-sm px-6 py-4 flex items-center justify-between gap-3">
              <button type="button" onClick={() => setCurrentStep(1)} className="btn-secondary text-sm flex items-center gap-1.5">
                <ChevronLeft className="w-4 h-4" />
                {t('Back', 'Kembali')}
              </button>
              <button type="button" disabled={!step2Valid} onClick={() => setCurrentStep(3)} className="btn-primary text-sm flex items-center gap-1.5 disabled:opacity-60">
                {t('Next: Clinical Screening', 'Seterusnya: Saringan Klinikal')}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}

        {/* =========================================================
            STEP 3 — CLINICAL SCREENING
        ========================================================== */}
        {currentStep === 3 && (
          <>
            <section className="bg-white border border-surface-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-surface-200 bg-surface-50/60">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#EFF6F3] flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4 text-[#0F4C42]" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-navy-900">
                      {t('Clinical Screening', 'Saringan Klinikal')}
                    </h2>
                    <p className="text-[11px] text-surface-500 mt-0.5">
                      {t(
                        'Complete the safety checks required for this imaging request.',
                        'Lengkapkan pemeriksaan keselamatan yang diperlukan untuk permohonan ini.'
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-5">
                {isFemalePatient && (
                  <div className="rounded-lg border border-pink-200 bg-pink-50/50 p-4 space-y-4">
                    <div>
                      <h3 className="text-xs font-bold text-pink-900">
                        {t('Pregnancy Screening', 'Saringan Kehamilan')}
                      </h3>
                      <p className="text-[10px] text-pink-700 mt-0.5">
                        {t('Radiation safety check for female patients.', 'Pemeriksaan keselamatan radiasi untuk pesakit wanita.')}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-surface-700 mb-1.5">
                          {t('Is Patient Currently Pregnant? *', 'Adakah Pesakit Mengandung? *')}
                        </label>
                        <select
                          required
                          value={isPregnant}
                          onChange={(e) => setIsPregnant(e.target.value as MohYaTidak)}
                          className="select-field w-full"
                        >
                          <option value="">-- Select --</option>
                          <option value="No">No (Tidak)</option>
                          <option value="Yes">Yes (Ya)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-surface-700 mb-1.5">
                          {t('Last Menstrual Period (LMP)', 'Tarikh Haid Terakhir (LMP)')}
                        </label>
                        <input type="date" value={lmp} onChange={(e) => setLmp(e.target.value)} className="input-field w-full" />
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-surface-700 mb-1.5">
                      {t('Patient Transport / Mobility Mode', 'Mod Pengangkutan / Pergerakan Pesakit')}
                    </label>
                    <select
                      value={hasMobileDevice}
                      onChange={(e) => setHasMobileDevice(e.target.value as MohYaTidak)}
                      className="select-field w-full"
                    >
                      <option value="No">Ambulatory / Walking (Mobile)</option>
                      <option value="Yes">Wheelchair / Stretcher / Trolley Required</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-surface-700 mb-1.5">
                      {t('Workflow Priority', 'Tahap Keutamaan Workflow')}
                    </label>
                    <select
                      value={workflowPriority}
                      onChange={(e) => setWorkflowPriority(e.target.value as 'Emergency' | 'Non-Emergency')}
                      className="select-field w-full"
                    >
                      <option value="Emergency">Emergency (Immediate Slot / PACS Van Routing)</option>
                      <option value="Non-Emergency">Non-Emergency / Elective Appointment</option>
                    </select>
                  </div>
                </div>

                {['CT', 'MRI', 'Fluoro', 'Angio'].includes(modality) && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-xs font-bold text-blue-950">
                          {t('Contrast Media Screening', 'Saringan Media Kontras')}
                        </h3>
                        <p className="text-[10px] text-blue-700 mt-0.5">
                          {t('Complete renal safety information when IV contrast is required.', 'Lengkapkan maklumat keselamatan buah pinggang apabila media kontras IV diperlukan.')}
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={contrastMediaRequired}
                        onChange={(e) => setContrastMediaRequired(e.target.checked)}
                        className="w-4 h-4 accent-[#0F4C42] rounded shrink-0"
                      />
                    </div>

                    {contrastMediaRequired && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-surface-700 mb-1.5">Renal Lab Test Date *</label>
                          <input type="date" required value={renalFunctionDate} onChange={(e) => setRenalFunctionDate(e.target.value)} className="input-field w-full" />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-surface-700 mb-1.5">Serum Creatinine (µmol/L) *</label>
                          <input type="number" required value={creatinine} onChange={(e) => setCreatinine(e.target.value)} className="input-field w-full" placeholder="e.g. 78" />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-surface-700 mb-1.5">eGFR (mL/min/1.73m²) *</label>
                          <input type="number" required value={egfr} onChange={(e) => setEgfr(e.target.value)} className="input-field w-full" placeholder="e.g. 95" />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>

            <div className="bg-white border border-surface-200 rounded-xl shadow-sm px-6 py-4 flex items-center justify-between gap-3">
              <button type="button" onClick={() => setCurrentStep(2)} className="btn-secondary text-sm flex items-center gap-1.5">
                <ChevronLeft className="w-4 h-4" />
                {t('Back', 'Kembali')}
              </button>
              <button type="button" disabled={!step3Valid} onClick={() => setCurrentStep(4)} className="btn-primary text-sm flex items-center gap-1.5 disabled:opacity-60">
                {t('Next: Review & Submit', 'Seterusnya: Semak & Hantar')}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}

        {/* =========================================================
            STEP 4 — PRIORITY & SUBMIT
        ========================================================== */}
        {currentStep === 4 && (
          <>
            <section className="bg-white border border-surface-200 rounded-lg shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-surface-200 bg-surface-50/60">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#EFF6F3] flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4 text-[#0F4C42]" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-navy-900">
                      {t('Review & Submit', 'Semak & Hantar')}
                    </h2>
                    <p className="text-[11px] text-surface-500 mt-0.5">
                      {t(
                        'Review the case details and scheduling preference before submitting.',
                        'Semak butiran kes dan keutamaan penjadualan sebelum menghantar.'
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-5">
                {/* 1. COMPREHENSIVE CASE SUMMARY CARD */}
                <div className="rounded-xl border border-surface-200 bg-white p-5 space-y-5">
                  <div className="flex items-center justify-between border-b border-surface-100 pb-3">
                    <h3 className="text-xs font-bold text-surface-900 uppercase tracking-wider flex items-center gap-2">
                      <FileCheck2 className="w-4 h-4 text-[#0F4C42]" />
                      {t('Case Summary', 'Ringkasan Kes')}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        workflowPriority === 'Emergency'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {workflowPriority}
                      </span>
                      <span className="text-[10px] font-semibold text-surface-600 bg-surface-100 px-2.5 py-0.5 rounded-full">
                        {t('Severity', 'Tahap')}: {severity}
                      </span>
                    </div>
                  </div>

                  {/* Section A: Patient Details */}
                  <div className="space-y-2">
                    <h4 className="text-[11px] font-bold text-surface-700 uppercase tracking-wider flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#0F4C42]" />
                      {t('Patient Details', 'Maklumat Pesakit')}
                    </h4>
                    <div className="rounded-lg border border-surface-200 bg-surface-50/60 p-3.5 space-y-2.5 text-xs">
                      {/* Name */}
                      <div className="grid grid-cols-[120px_1fr] sm:grid-cols-[160px_1fr] gap-2 items-baseline">
                        <span className="text-surface-500 font-medium">{t('Patient Name', 'Nama Pesakit')}</span>
                        <span className="font-bold text-surface-900">{selectedPatient?.name || '—'}</span>
                      </div>

                      {/* IC / NRIC */}
                      <div className="grid grid-cols-[120px_1fr] sm:grid-cols-[160px_1fr] gap-2 items-baseline">
                        <span className="text-surface-500 font-medium">{t('IC / NRIC', 'No. KP')}</span>
                        <span className="font-mono font-semibold text-surface-900">{selectedPatient?.nric || '—'}</span>
                      </div>

                      {/* MRN */}
                      <div className="grid grid-cols-[120px_1fr] sm:grid-cols-[160px_1fr] gap-2 items-baseline">
                        <span className="text-surface-500 font-medium">{t('MRN', 'No. MRN')}</span>
                        <span className="font-mono font-semibold text-surface-900">{selectedPatient?.mrn || '—'}</span>
                      </div>

                      {/* Gender */}
                      <div className="grid grid-cols-[120px_1fr] sm:grid-cols-[160px_1fr] gap-2 items-baseline">
                        <span className="text-surface-500 font-medium">{t('Gender', 'Jantina')}</span>
                        <span className="font-semibold text-surface-900">{selectedPatient?.gender || '—'}</span>
                      </div>

                      {/* Date of Birth */}
                      <div className="grid grid-cols-[120px_1fr] sm:grid-cols-[160px_1fr] gap-2 items-baseline">
                        <span className="text-surface-500 font-medium">{t('Date of Birth', 'Tarikh Lahir')}</span>
                        <span className="font-semibold text-surface-900">{selectedPatient?.dob || '—'}</span>
                      </div>

                      {/* Address */}
                      <div className="grid grid-cols-[120px_1fr] sm:grid-cols-[160px_1fr] gap-2 items-baseline">
                        <span className="text-surface-500 font-medium">{t('Address', 'Alamat')}</span>
                        <span className="font-medium text-surface-800 leading-relaxed">{selectedPatient?.address || '—'}</span>
                      </div>

                      {/* History */}
                      <div className="grid grid-cols-[120px_1fr] sm:grid-cols-[160px_1fr] gap-2 items-baseline">
                        <span className="text-surface-500 font-medium">{t('Medical History', 'Sejarah Perubatan')}</span>
                        <span className="font-medium text-surface-800">
                          {selectedPatient?.medicalHistory && selectedPatient.medicalHistory.length > 0
                            ? selectedPatient.medicalHistory.join(', ')
                            : t('No prior medical history recorded', 'Tiada sejarah perubatan direkodkan')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Section B: Referral, Location & Context */}
                  <div className="space-y-2">
                    <h4 className="text-[11px] font-bold text-surface-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-[#0F4C42]" />
                      {t('Referral Context & Location', 'Konteks Rujukan & Lokasi')}
                    </h4>
                    <div className="rounded-lg border border-surface-200 bg-surface-50/60 p-3.5 space-y-2.5 text-xs">
                      {/* Requesting Location */}
                      <div className="grid grid-cols-[120px_1fr] sm:grid-cols-[160px_1fr] gap-2 items-baseline">
                        <span className="text-surface-500 font-medium">{t('Requesting Location', 'Lokasi Pemohon')}</span>
                        <span className="font-bold text-surface-900">{resolvedWardOrClinic || '—'}</span>
                      </div>

                      {/* Requesting Department */}
                      <div className="grid grid-cols-[120px_1fr] sm:grid-cols-[160px_1fr] gap-2 items-baseline">
                        <span className="text-surface-500 font-medium">{t('Requesting Department', 'Jabatan / Disiplin')}</span>
                        <span className="font-semibold text-surface-900">{resolvedDisiplin || '—'}</span>
                      </div>

                      {/* Clinical Indication */}
                      <div className="grid grid-cols-[120px_1fr] sm:grid-cols-[160px_1fr] gap-2 items-baseline">
                        <span className="text-surface-500 font-medium">{t('Clinical Indication', 'Indikasi Klinikal')}</span>
                        <span className="font-bold text-surface-900">{indication || '—'}</span>
                      </div>

                      {/* Referral / Clinical Notes */}
                      {clinicalNotes && (
                        <div className="grid grid-cols-[120px_1fr] sm:grid-cols-[160px_1fr] gap-2 items-baseline">
                          <span className="text-surface-500 font-medium">{t('Referral Notes', 'Nota Rujukan')}</span>
                          <span className="font-medium text-surface-800">{clinicalNotes}</span>
                        </div>
                      )}

                      {/* Severity & Workflow Priority */}
                      <div className="grid grid-cols-[120px_1fr] sm:grid-cols-[160px_1fr] gap-2 items-baseline">
                        <span className="text-surface-500 font-medium">{t('Severity & Priority', 'Tahap & Keutamaan')}</span>
                        <span className="font-semibold text-surface-900">
                          {severity} ({t('Workflow Priority', 'Keutamaan')}: {workflowPriority})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Section C: Imaging & Requested Examination */}
                  <div className="space-y-2">
                    <h4 className="text-[11px] font-bold text-surface-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-[#0F4C42]" />
                      {t('Imaging & Requested Examination', 'Pengimejan & Pemeriksaan Dimohon')}
                    </h4>
                    <div className="rounded-lg border border-surface-200 bg-surface-50/60 p-3.5 space-y-2.5 text-xs">
                      {/* Imaging Modality */}
                      <div className="grid grid-cols-[120px_1fr] sm:grid-cols-[160px_1fr] gap-2 items-baseline">
                        <span className="text-surface-500 font-medium">{t('Imaging Modality', 'Modaliti Pengimejan')}</span>
                        <span className="font-bold text-[#0F4C42]">{modality}</span>
                      </div>

                      {/* Requested Examination(s) */}
                      <div className="grid grid-cols-[120px_1fr] sm:grid-cols-[160px_1fr] gap-2 items-start">
                        <span className="text-surface-500 font-medium">{t('Requested Examination', 'Pemeriksaan Dimohon')}</span>
                        <div className="space-y-2">
                          {examCards.map((card, idx) => {
                            const part = card.bodyPart === 'Other' ? card.customBodyPart : card.bodyPart;
                            const sideStr = card.side && card.side !== 'N/A' ? ` (${card.side})` : '';
                            const viewsStr = card.viewsOrProtocol?.length > 0 ? ` · ${card.viewsOrProtocol.join(', ')}` : '';
                            return (
                              <div key={card.id || idx} className="space-y-0.5">
                                <div className="font-semibold text-surface-900">
                                  <span>{examCards.length > 1 ? `${idx + 1}. ` : ''}{part || 'Unspecified'}{sideStr}{viewsStr}</span>
                                </div>
                                {card.notes && (
                                  <div className="text-[11px] text-surface-600 bg-white/80 border border-surface-200 rounded px-2 py-1">
                                    <span className="font-semibold text-surface-700">{t('Exam Notes', 'Nota Pemeriksaan')}:</span> {card.notes}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Estimated Dose */}
                      {primaryExamDose && (
                        <div className="grid grid-cols-[120px_1fr] sm:grid-cols-[160px_1fr] gap-2 items-baseline">
                          <span className="text-surface-500 font-medium">{t('Estimated Dose', 'Anggaran Dos')}</span>
                          <span className="font-semibold text-emerald-700">
                            ~{primaryExamDose.dosMsv} mSv ({primaryExamDose.category})
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Section D: Clinical Safety, Female Screening & Patient Transport */}
                  <div className="space-y-2">
                    <h4 className="text-[11px] font-bold text-surface-700 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#0F4C42]" />
                      {t('Clinical Safety & Patient Transport', 'Keselamatan Klinikal & Pengangkutan Pesakit')}
                    </h4>
                    <div className="rounded-lg border border-surface-200 bg-surface-50/60 p-3.5 space-y-2.5 text-xs">
                      {/* Patient Transport */}
                      <div className="grid grid-cols-[120px_1fr] sm:grid-cols-[160px_1fr] gap-2 items-baseline">
                        <span className="text-surface-500 font-medium">{t('Patient Transport', 'Pengangkutan Pesakit')}</span>
                        <span className="font-semibold text-surface-900">
                          {hasMobileDevice === 'Yes'
                            ? t('Wheelchair / Stretcher / Trolley Required', 'Kerusi Roda / Pengusung Diperlukan')
                            : t('Ambulatory / Walking (Mobile)', 'Boleh Berjalan (Bergerak Sendiri)')}
                        </span>
                      </div>

                      {/* Workflow Priority */}
                      <div className="grid grid-cols-[120px_1fr] sm:grid-cols-[160px_1fr] gap-2 items-baseline">
                        <span className="text-surface-500 font-medium">{t('Workflow Priority', 'Tahap Keutamaan Workflow')}</span>
                        <span className="font-bold text-surface-900">
                          {workflowPriority}
                        </span>
                      </div>

                      {/* Female Screening if applicable */}
                      {isFemalePatient && (
                        <>
                          <div className="grid grid-cols-[120px_1fr] sm:grid-cols-[160px_1fr] gap-2 items-baseline">
                            <span className="text-surface-500 font-medium">{t('Pregnant Status', 'Status Mengandung')}</span>
                            <span className="font-semibold text-surface-900">
                              {isPregnant === 'Yes'
                                ? t('Yes (Pregnant)', 'Ya (Mengandung)')
                                : isPregnant === 'No'
                                ? t('No (Not Pregnant)', 'Tidak (Tidak Mengandung)')
                                : '—'}
                            </span>
                          </div>

                          <div className="grid grid-cols-[120px_1fr] sm:grid-cols-[160px_1fr] gap-2 items-baseline">
                            <span className="text-surface-500 font-medium">{t('Last Menstrual Period (LMP)', 'Tarikh Haid Terakhir (LMP)')}</span>
                            <span className="font-semibold text-surface-900">{lmp || '—'}</span>
                          </div>
                        </>
                      )}

                      {/* Contrast Media details if applicable */}
                      {contrastMediaRequired && (
                        <div className="grid grid-cols-[120px_1fr] sm:grid-cols-[160px_1fr] gap-2 items-baseline">
                          <span className="text-surface-500 font-medium">{t('IV Contrast', 'Media Kontras IV')}</span>
                          <span className="font-semibold text-blue-900">
                            {t('Required', 'Diperlukan')} · {t('Lab Date', 'Tarikh Lab')}: {renalFunctionDate || '—'} · Creatinine: {creatinine || '—'} µmol/L · eGFR: {egfr || '—'} mL/min/1.73m²
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. SCREENING FACILITY CARD */}
                <div className="rounded-xl border border-surface-200 bg-white p-5 space-y-3.5">
                  <div>
                    <h3 className="text-xs font-bold text-surface-900 uppercase tracking-wider">
                      {t('Screening Facility', 'Pusat Saringan')}
                    </h3>
                    <p className="text-xs text-surface-500 mt-0.5">
                      {t(
                        "HealthGrid IQ will recommend a suitable facility based on the patient's location and availability.",
                        'HealthGrid IQ akan mengesyorkan pusat saringan yang sesuai berdasarkan lokasi dan ketersediaan pesakit.'
                      )}
                    </p>
                  </div>

                  <div className="space-y-2">
                    {/* Automatic recommendation */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsManualClinicOverride(false);
                        if (nearestClinicForPatient?.clinic.id) {
                          setPreferredClinicId(nearestClinicForPatient.clinic.id);
                        }
                      }}
                      className={`w-full text-left rounded-lg border p-3.5 transition ${!isManualClinicOverride
                        ? 'border-teal-300 bg-teal-50/60'
                        : 'border-surface-200 bg-white hover:bg-surface-50'
                        }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${!isManualClinicOverride
                            ? 'border-teal-600'
                            : 'border-surface-300'
                            }`}
                        >
                          {!isManualClinicOverride && (
                            <div className="w-2 h-2 rounded-full bg-teal-600" />
                          )}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-surface-900">
                              {t('Automatic recommendation', 'Cadangan automatik')}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">
                              {t('Recommended', 'Disyorkan')}
                            </span>
                          </div>

                          <p className="text-xs text-surface-500 mt-0.5">
                            {t('Nearest suitable healthcare centre.', 'Pusat kesihatan yang sesuai dan terdekat.')}
                          </p>
                        </div>
                      </div>
                    </button>

                    {/* Patient preference */}
                    <button
                      type="button"
                      onClick={() => setIsManualClinicOverride(true)}
                      className={`w-full text-left rounded-lg border p-3.5 transition ${isManualClinicOverride
                        ? 'border-teal-300 bg-teal-50/60'
                        : 'border-surface-200 bg-white hover:bg-surface-50'
                        }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${isManualClinicOverride
                            ? 'border-teal-600'
                            : 'border-surface-300'
                            }`}
                        >
                          {isManualClinicOverride && (
                            <div className="w-2 h-2 rounded-full bg-teal-600" />
                          )}
                        </div>

                        <div>
                          <span className="text-sm font-semibold text-surface-900">
                            {t('Patient prefers a specific healthcare centre', 'Pesakit memilih pusat kesihatan tertentu')}
                          </span>

                          <p className="text-xs text-surface-500 mt-0.5">
                            {t('Patient-requested facility.', 'Pusat yang diminta oleh pesakit.')}
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>

                  {isManualClinicOverride && (
                    <div className="mt-3 pl-7">
                      <label className="block text-xs font-semibold text-surface-700 mb-1.5">
                        {t('Preferred Healthcare Centre', 'Pusat Kesihatan Pilihan')}
                      </label>

                      <select
                        value={preferredClinicId}
                        onChange={(e) => setPreferredClinicId(e.target.value)}
                        className="select-field w-full"
                      >
                        <option value="">
                          -- {t('Select healthcare centre', 'Pilih pusat kesihatan')} --
                        </option>

                        {uniqueClinics.map(clinic => (
                          <option key={clinic.id} value={clinic.id}>
                            {clinic.name}
                            {radiographersByClinic[clinic.id] ? ` (${radiographersByClinic[clinic.id]} Radiographer on duty)` : ''}
                            {nearestClinicForPatient?.clinic.id === clinic.id ? ' [Auto Recommended Nearest]' : ''}
                          </option>
                        ))}
                      </select>

                      <p className="text-[11px] text-surface-400 mt-1.5">
                        {t(
                          'This preference will be considered when the AI Scheduler processes the patient case.',
                          'Pilihan ini akan dipertimbangkan apabila AI Scheduler memproses kes pesakit.'
                        )}
                      </p>
                    </div>
                  )}

                  {!isManualClinicOverride && nearestClinicForPatient && (
                    <div className="mt-3 flex items-center gap-2 rounded-lg bg-surface-50 border border-surface-200 px-3 py-2.5">
                      <Building2 className="w-4 h-4 text-teal-600 shrink-0" />

                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-surface-800">
                          {nearestClinicForPatient.clinic.name}
                        </p>

                        <p className="text-[11px] text-surface-500">
                          {nearestClinicForPatient.distanceKm > 0 ? `${nearestClinicForPatient.distanceKm} km away` : t('Nearest active facility', 'Pusat aktif terdekat')}
                          {nearestClinicForPatient.radCount > 0 ? ` · ${nearestClinicForPatient.radCount} Radiographer(s) on duty` : ''}
                        </p>
                      </div>

                      <span className="ml-auto text-[10px] font-semibold text-surface-500">
                        {t('AI recommendation', 'Cadangan AI')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <div className="bg-white border border-surface-200 rounded-xl shadow-sm px-6 py-4 flex items-center justify-between gap-3">
              <button type="button" onClick={() => setCurrentStep(3)} className="btn-secondary text-sm flex items-center gap-1.5">
                <ChevronLeft className="w-4 h-4" />
                {t('Back', 'Kembali')}
              </button>

              <button
                type="submit"
                disabled={!isFormValid || submitting}
                className="btn-primary flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed text-sm px-6 py-2.5 min-w-[210px]"
              >
                {submitting && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                {submitting
                  ? t('Submitting Case...', 'Menghantar Kes...')
                  : t('Submit Case', 'Hantar Kes')}
              </button>
            </div>
          </>
        )}
      </form>

      {/* =========================================================
          DOSE REFERENCE MODAL
      ========================================================== */}
      {
        showDoseModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-surface-200">
              <div className="px-5 py-4 bg-[#0F4C42] text-white flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm">
                    {t('Effective Radiation Dose Reference List', 'Senarai Dos Berkesan Pemeriksaan Radiologi')}
                  </h3>
                  <p className="text-[10px] text-emerald-100 mt-0.5">
                    Kementerian Kesihatan Malaysia PER.SS-RA301 Benchmark
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDoseModal(false)}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-red-500 text-white flex items-center justify-center font-bold text-xs transition-colors"
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
        )
      }
    </div >
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
        value={open ? search : (selected ? `${selected.name} (${selected.mrn})` : '')}
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