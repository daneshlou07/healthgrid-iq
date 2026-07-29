import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ux/Toast';
import type { SeverityLevel, ExaminationRequest, ExaminationSide, MohYaTidak, MohPaymentCategory } from '../../types';
import {
  getModalityRef,
  MODALITY_REFERENCE_DATASET,
  getSideOptions,
} from '../../data/modalityReference';
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
  Send,
  Building2,
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

const STEPS = [
  { id: 1, title: 'Patient & Indication', subtitle: 'Select patient & symptom' },
  { id: 2, title: 'Modality & Exams', subtitle: 'Body parts & views' },
  { id: 3, title: 'Clinical Screening', subtitle: 'Safety & MOH PER.SS-RA301' },
  { id: 4, title: 'Review & Submit', subtitle: 'Final verification' },
];

export default function NewCaseRegistration() {
  const { currentUser } = useAuth();
  const { patients, clinics, addCase, addAuditLog } = useData();
  const toast = useToast();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // ── Step 1 State ─────────────────────────────────────────────────────
  const [patientId, setPatientId] = useState('');
  const [indication, setIndication] = useState('');
  const [severity, setSeverity] = useState<SeverityLevel>('Moderate');
  const [incubationPeriod, setIncubationPeriod] = useState('');

  // ── Step 2 State ─────────────────────────────────────────────────────
  const [modality, setModality] = useState('X-Ray');
  const [examCards, setExamCards] = useState<FormExamCard[]>([createBlankExamCard(1)]);

  // ── Step 3 State (Clinical Screening & Notes) ─────────────────────────
  const [lmp, setLmp] = useState('');
  const [isPregnant, setIsPregnant] = useState<MohYaTidak | ''>('');
  const [hasAllergy, setHasAllergy] = useState<MohYaTidak | ''>('');
  const [allergyDetails, setAllergyDetails] = useState('');
  const [hasMobileDevice, setHasMobileDevice] = useState<MohYaTidak | ''>('');
  const [isWarganegara, setIsWarganegara] = useState<MohYaTidak | ''>('');
  const [isPenjawatAwam, setIsPenjawatAwam] = useState<MohYaTidak | ''>('');
  const [isFpp, setIsFpp] = useState<MohYaTidak | ''>('');
  const [paymentCategory, setPaymentCategory] = useState<MohPaymentCategory | ''>('');
  const [renalFunctionDate, setRenalFunctionDate] = useState('');
  const [creatinine, setCreatinine] = useState('');
  const [egfr, setEgfr] = useState('');
  const [contrastMediaRequired, setContrastMediaRequired] = useState(false);
  const [contrastMediaName, setContrastMediaName] = useState('');
  const [contrastMediaVolumeMl, setContrastMediaVolumeMl] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');

  // ── Step 4 State ─────────────────────────────────────────────────────
  const [preferredClinicId, setPreferredClinicId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedPatient = patients.find((p) => p.id === patientId);
  const modalityRef = useMemo(() => getModalityRef(modality), [modality]);
  const isFemalePatient = selectedPatient?.gender === 'Female';
  const requiresRenal = contrastMediaRequired;

  // Step 1 Validation
  const step1Valid = Boolean(patientId && indication.trim());

  // Step 2 Validation
  const step2Valid = useMemo(() => {
    if (!modality || examCards.length === 0) return false;
    return examCards.every((card) => {
      const partValid = card.bodyPart === 'Other' ? Boolean(card.customBodyPart.trim()) : Boolean(card.bodyPart);
      const optsValid = card.viewsOrProtocol.length > 0;
      return partValid && optsValid;
    });
  }, [modality, examCards]);

  // Step 3 Validation (Clinical Screening)
  const step3Valid = useMemo(() => {
    if (!patientId) return true;
    if (isFemalePatient && !isPregnant) return false;
    if (!hasAllergy) return false;
    if ((hasAllergy === 'Yes' || hasAllergy === 'Ya') && !allergyDetails.trim()) return false;
    if (requiresRenal && (!renalFunctionDate || !creatinine || !egfr)) return false;
    if (contrastMediaRequired && !contrastMediaName.trim()) return false;
    return true;
  }, [patientId, isFemalePatient, isPregnant, hasAllergy, allergyDetails, requiresRenal, renalFunctionDate, creatinine, egfr, contrastMediaRequired, contrastMediaName]);

  const isFormValid = step1Valid && step2Valid && step3Valid;

  // Handle Modality Change
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

  const handleBodyPartChange = (index: number, bodyPartName: string) => {
    if (bodyPartName === 'Other') {
      updateCard(index, { bodyPart: 'Other', customBodyPart: '', side: 'N/A', viewsOrProtocol: [] });
      return;
    }
    const partRef = modalityRef.bodyParts.find((b) => b.name === bodyPartName);
    const newSide: ExaminationSide = partRef?.supportsLaterality ? 'Right' : 'N/A';
    const defaultOpts = partRef?.defaultViewsOrProtocols || [];
    updateCard(index, { bodyPart: bodyPartName, customBodyPart: '', side: newSide, viewsOrProtocol: defaultOpts });
  };

  const toggleCardOption = (index: number, option: string) => {
    const currentOpts = examCards[index].viewsOrProtocol || [];
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

    const patient = patients.find((p) => p.id === patientId);
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

    const scanTypeSummary = requestedExaminations.map((ex) => {
      const sideStr = ex.side && ex.side !== 'N/A' ? ` [${ex.side}]` : '';
      const optsStr = ex.viewsOrProtocol.length ? ` (${ex.viewsOrProtocol.join(', ')})` : '';
      return `${ex.bodyPart}${sideStr}${optsStr}`;
    }).join('; ');

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
        registeredById: currentUser.id,
        registeredByName: currentUser.name,
        clinicId: preferredClinicId || undefined,
        clinicName: preferredClinic?.name || undefined,
        scanType: fullScanType,
        modality,
        requestedExaminations,
        indication: indication.trim(),
        bodyRegion: uniqueRegions || 'General',
        severity,
        incubationPeriod: incubationPeriod || undefined,
        notes: clinicalNotes.trim(),
        status: 'CREATED',
        createdAt: new Date().toISOString(),
        lmp: lmp || undefined,
        isPregnant: isPregnant || undefined,
        hasAllergy: hasAllergy || undefined,
        allergyDetails: allergyDetails.trim() || undefined,
        hasMobileDevice: hasMobileDevice || undefined,
        isWarganegara: isWarganegara || undefined,
        isPenjawatAwam: isPenjawatAwam || undefined,
        isFpp: isFpp || undefined,
        paymentCategory: paymentCategory || undefined,
        renalFunctionDate: renalFunctionDate || undefined,
        creatinine: creatinine || undefined,
        egfr: egfr || undefined,
        contrastMediaRequired: contrastMediaRequired || undefined,
        contrastMediaName: contrastMediaName.trim() || undefined,
        contrastMediaVolumeMl: contrastMediaVolumeMl ? Number(contrastMediaVolumeMl) : undefined,
        ringkasanKlinikal: clinicalNotes.trim() || undefined,
        officeNoPemeriksaan: caseNumber,
      });

      await addAuditLog({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'CASE_CREATED',
        target: `cases/${caseNumber}`,
        details: `Registered ${caseNumber} for ${patient?.name} — ${indication} (${requestedExaminations.length} exam(s) under ${modality})`,
        timestamp: new Date().toISOString(),
      });

      toast.success(`Case ${caseNumber} registered with ${requestedExaminations.length} examination(s) — pending AI Scheduler`);

      // Reset form
      setPatientId(''); setIndication(''); setSeverity('Moderate'); setIncubationPeriod('');
      setPreferredClinicId(''); setClinicalNotes(''); setExamCards([createBlankExamCard(1)]);
      setLmp(''); setIsPregnant(''); setHasAllergy(''); setAllergyDetails('');
      setHasMobileDevice(''); setIsWarganegara(''); setIsPenjawatAwam(''); setIsFpp('');
      setPaymentCategory(''); setRenalFunctionDate(''); setCreatinine(''); setEgfr('');
      setContrastMediaRequired(false); setContrastMediaName(''); setContrastMediaVolumeMl('');
      setCurrentStep(1);
    } catch {
      toast.error('Failed to create case.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="page-title">Register Radiology Referral</h1>
        <p className="page-subtitle">
          Complete the 4-step registration wizard to issue a digital radiology request (MOH Borang PER.SS-RA301).
        </p>
      </div>

      {/* ── STEPPER NAVIGATION BAR ────────────────────────────────────────────── */}
      <div className="card p-3 sm:p-4 bg-white border border-surface-200 shadow-sm">
        <div className="grid grid-cols-4 gap-2">
          {STEPS.map((step) => {
            const isCompleted = step.id < currentStep;
            const isActive = step.id === currentStep;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => {
                  if (isCompleted) setCurrentStep(step.id as any);
                }}
                disabled={!isCompleted && !isActive}
                className={`text-left p-2.5 sm:p-3 rounded-xl transition-all flex flex-col justify-between border ${
                  isActive
                    ? 'bg-navy-900 text-white border-navy-900 shadow-md ring-2 ring-navy-200'
                    : isCompleted
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100 cursor-pointer'
                    : 'bg-surface-50 text-surface-400 border-surface-200 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center ${
                      isActive
                        ? 'bg-white text-navy-900'
                        : isCompleted
                        ? 'bg-emerald-600 text-white'
                        : 'bg-surface-200 text-surface-500'
                    }`}
                  >
                    {isCompleted ? <Check className="w-3 h-3 stroke-[3]" /> : step.id}
                  </span>
                  <span className="text-[10px] uppercase font-bold opacity-75">
                    Step {step.id}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-bold truncate">{step.title}</p>
                  <p
                    className={`text-[10px] truncate ${
                      isActive
                        ? 'text-navy-200'
                        : isCompleted
                        ? 'text-emerald-700'
                        : 'text-surface-400'
                    }`}
                  >
                    {step.subtitle}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── STEP CONTENT FORM ─────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── STEP 1: PATIENT & PRESENTING CLINICAL INDICATION ──────────────────── */}
        {currentStep === 1 && (
          <div className="card space-y-6 bg-white border border-slate-200 border-t-4 border-t-purple-600 shadow-md rounded-xl p-6">
            {/* Step Guidance Banner */}
            <div className="p-3 bg-purple-50/80 border border-purple-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Info className="w-4 h-4 text-purple-700 shrink-0" />
                <p className="text-xs text-purple-900 font-medium">
                  <strong>Step 1 of 4:</strong> Select a patient from the registry first, then enter their main presenting clinical symptom to unlock Step 2.
                </p>
              </div>
              <span className="text-[10px] bg-purple-200 text-purple-800 font-bold px-2 py-0.5 rounded-full uppercase shrink-0">
                Action Required
              </span>
            </div>

            <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
              <User className="w-5 h-5 text-purple-700" />
              <h2 className="text-base font-bold text-slate-900">Step 1: Patient &amp; Clinical Indication</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Registered by <span className="text-slate-400 font-normal text-[10px]">(System User)</span>
                </label>
                <input
                  disabled
                  value={currentUser?.name || ''}
                  className="input-field bg-slate-100 text-slate-600 cursor-not-allowed border-slate-200"
                />
              </div>

              {/* Patient Selection FIRST */}
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-800">Select Patient</label>
                  <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded">
                    * Required
                  </span>
                </div>
                <PatientSearchSelect
                  patients={patients}
                  value={patientId}
                  onChange={(id) => setPatientId(id)}
                />
                {selectedPatient && (
                  <div className="mt-2 p-3 bg-purple-50/60 rounded-xl border border-purple-200 text-xs space-y-1">
                    <p className="font-bold text-purple-950">
                      {selectedPatient.name} — <span className="font-mono">{selectedPatient.mrn}</span> ({selectedPatient.nric})
                    </p>
                    <p className="text-purple-900">Gender: <strong>{selectedPatient.gender}</strong> &middot; DOB: <strong>{selectedPatient.dob}</strong> &middot; Ethnicity: <strong>{selectedPatient.ethnicity || 'Not specified'}</strong></p>
                    <p className="text-purple-800 text-[11px]">Address: {selectedPatient.address}</p>
                    {selectedPatient.medicalHistory.length > 0 && (
                      <p className="text-purple-800 text-[11px]">Medical History: {selectedPatient.medicalHistory.join(', ')}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Presenting Indication / Symptom SECOND */}
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-800">
                    Presenting Indication / Symptom
                  </label>
                  <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded">
                    * Required
                  </span>
                </div>
                <input
                  required
                  list="symptom-suggestions"
                  value={indication}
                  onChange={(e) => setIndication(e.target.value)}
                  className={`input-field transition-all ${
                    indication ? 'border-l-4 border-l-emerald-500 bg-emerald-50/20' : 'focus:ring-2 focus:ring-purple-500/30'
                  }`}
                  placeholder="Type the patient's presenting symptom or clinical indication..."
                />
                <datalist id="symptom-suggestions">
                  {SYMPTOM_SUGGESTIONS.map((symptom) => (
                    <option key={symptom} value={symptom} />
                  ))}
                </datalist>
              </div>

              {/* Severity */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-800">Severity</label>
                  <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded">
                    * Required
                  </span>
                </div>
                <div className="flex gap-2">
                  {SEVERITIES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSeverity(s)}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${
                        severity === s
                          ? 'bg-purple-900 text-white border-purple-900 shadow-sm ring-2 ring-purple-200'
                          : 'bg-white border-slate-300 text-slate-700 hover:border-purple-300 hover:bg-slate-50'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Incubation Period */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-800">
                    Incubation Period (days)
                  </label>
                  <span className="text-slate-400 font-normal text-[10px]">(Optional)</span>
                </div>
                <input
                  value={incubationPeriod}
                  onChange={(e) => setIncubationPeriod(e.target.value)}
                  className={`input-field ${incubationPeriod ? 'border-l-4 border-l-emerald-500 bg-emerald-50/20' : ''}`}
                  placeholder="Optional — e.g. 3"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                disabled={!step1Valid}
                className="bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-md flex items-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next: Modality &amp; Exams <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: MODALITY & REQUESTED EXAMINATIONS ───────────────────────── */}
        {currentStep === 2 && (
          <div className="card space-y-6">
            <div className="flex items-center justify-between border-b border-surface-200 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-navy-600" />
                <h2 className="text-base font-bold text-navy-900">Step 2: Imaging Modality &amp; Examinations</h2>
              </div>
              <span className="text-xs text-navy-700 font-semibold bg-navy-50 px-2.5 py-1 rounded-full border border-navy-200">
                Selected: {modality}
              </span>
            </div>

            {/* Modality Selector */}
            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-2">
                Imaging Modality * <span className="text-surface-400 font-normal">(applies to all requested examinations)</span>
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
                    {modality === m && <span className="text-[9px] text-emerald-300 font-normal">Selected</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Repeatable Exam Cards */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-surface-700 uppercase tracking-wider">
                  Requested Examination List ({examCards.length})
                </h3>
              </div>

              <div className="space-y-4">
                {examCards.map((card, index) => {
                  const selectedPartRef = modalityRef.bodyParts.find((b) => b.name === card.bodyPart);
                  const supportsLaterality = selectedPartRef?.supportsLaterality ?? true;
                  const sideOptions = getSideOptions(supportsLaterality);

                  return (
                    <div
                      key={card.id}
                      className="p-4 bg-surface-50 border border-surface-250 rounded-xl space-y-4 relative group"
                    >
                      <div className="flex items-center justify-between border-b border-surface-200 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 bg-navy-800 text-white text-[11px] font-bold rounded-full flex items-center justify-center">
                            {index + 1}
                          </span>
                          <span className="text-xs font-bold text-navy-900 uppercase tracking-wider">
                            Examination #{index + 1}
                          </span>
                        </div>

                        {index > 0 ? (
                          <button
                            type="button"
                            onClick={() => handleRemoveCard(index)}
                            className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Remove
                          </button>
                        ) : (
                          <span className="text-[10px] text-surface-400 font-medium">Primary Exam</span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                        <div className="sm:col-span-7">
                          <label className="block text-xs font-medium text-surface-700 mb-1">Body Part *</label>
                          <select
                            required={card.bodyPart !== 'Other'}
                            value={card.bodyPart}
                            onChange={(e) => handleBodyPartChange(index, e.target.value)}
                            className="select-field text-xs"
                          >
                            <option value="">Select body part for {modality}...</option>
                            {modalityRef.bodyParts.map((part) => (
                              <option key={part.name} value={part.name}>
                                {part.name} ({part.bodyRegion})
                              </option>
                            ))}
                            <option value="Other">Other / Custom Body Part</option>
                          </select>
                          {card.bodyPart === 'Other' && (
                            <input
                              required
                              value={card.customBodyPart}
                              onChange={(e) => updateCard(index, { customBodyPart: e.target.value })}
                              className="input-field text-xs mt-2"
                              placeholder="Type body part name..."
                            />
                          )}
                        </div>

                        <div className="sm:col-span-5">
                          <label className="block text-xs font-medium text-surface-700 mb-1">Side / Laterality *</label>
                          <div className="flex gap-1">
                            {sideOptions.map((s) => {
                              const isSelected = card.side === s;
                              return (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() => updateCard(index, { side: s })}
                                  className={`flex-1 py-2 text-[11px] font-medium rounded-lg border transition-all ${
                                    isSelected
                                      ? 'bg-navy-800 text-white border-navy-800'
                                      : 'bg-white border-surface-300 text-surface-600 hover:border-surface-400'
                                  }`}
                                >
                                  {s}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {card.bodyPart && (
                        <div className="pt-2 border-t border-surface-200">
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-xs font-medium text-surface-700">
                              {modalityRef.optionTypeLabel} *
                            </label>
                          </div>

                          {modalityRef.isMultiOptionAllowed ? (
                            <div className="flex flex-wrap gap-1.5">
                              {modalityRef.availableViewsOrProtocols.map((opt) => {
                                const isSelected = card.viewsOrProtocol.includes(opt);
                                return (
                                  <button
                                    key={opt}
                                    type="button"
                                    onClick={() => toggleCardOption(index, opt)}
                                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 ${
                                      isSelected
                                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                        : 'bg-white border-surface-300 text-surface-600 hover:border-surface-400 hover:bg-surface-100'
                                    }`}
                                  >
                                    {isSelected && <Check className="w-3 h-3 text-white" />}
                                    <span>{opt}</span>
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {modalityRef.availableViewsOrProtocols.map((opt) => {
                                const isSelected = card.viewsOrProtocol.includes(opt);
                                return (
                                  <button
                                    key={opt}
                                    type="button"
                                    onClick={() => toggleCardOption(index, opt)}
                                    className={`p-2.5 rounded-lg text-xs font-medium border text-left transition-all flex items-center justify-between ${
                                      isSelected
                                        ? 'bg-navy-800 text-white border-navy-800 shadow-sm'
                                        : 'bg-white border-surface-300 text-surface-700 hover:border-surface-400 hover:bg-surface-100'
                                    }`}
                                  >
                                    <span>{opt}</span>
                                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-300 shrink-0" />}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      <div>
                        <input
                          type="text"
                          value={card.notes}
                          onChange={(e) => updateCard(index, { notes: e.target.value })}
                          placeholder="Specific exam instruction / notes (optional)..."
                          className="input-field text-xs bg-white"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={handleAddCard}
                className="w-full py-2.5 border-2 border-dashed border-navy-200 hover:border-navy-400 bg-navy-50/50 hover:bg-navy-50 text-navy-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                <Plus className="w-4 h-4 text-navy-600" />
                Add Another Examination ({modality})
              </button>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-surface-200">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="btn-secondary text-xs flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" /> Back: Patient &amp; Indication
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                disabled={!step2Valid}
                className="btn-primary text-xs flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next: Clinical Screening <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: CLINICAL SCREENING & NOTES ────────────────────────────────── */}
        {currentStep === 3 && (
          <div className="card space-y-6">
            <div className="flex items-center gap-2 border-b border-surface-200 pb-3">
              <FileCheck2 className="w-5 h-5 text-blue-600" />
              <div>
                <h2 className="text-base font-bold text-navy-900">Step 3: Radiology Request Screening (MOH PER.SS-RA301)</h2>
                <p className="text-xs text-surface-500">Clinical screening questions (Fields 12–17 &amp; 22)</p>
              </div>
            </div>

            {!step3Valid && patientId && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">Please complete all required screening fields (pregnancy for female patients, allergy details, renal function if contrast media is required) before proceeding.</p>
              </div>
            )}

            <div className="space-y-5">
              {/* Row 1: LMP + Pregnancy */}
              {isFemalePatient && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-surface-50 rounded-xl border border-surface-200">
                  <div>
                    <label className="block text-xs font-semibold text-surface-700 mb-1">
                      12. LMP (Last Menstrual Period Date) <span className="text-surface-400 font-normal">(If applicable)</span>
                    </label>
                    <input
                      type="date"
                      value={lmp}
                      onChange={(e) => setLmp(e.target.value)}
                      className="input-field text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-surface-700 mb-1.5">
                      13. Pregnant Status <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      {(['Yes', 'No'] as const).map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setIsPregnant(opt)}
                          className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                            isPregnant === opt || (isPregnant === 'Ya' && opt === 'Yes') || (isPregnant === 'Tidak' && opt === 'No')
                              ? opt === 'Yes' ? 'bg-red-600 text-white border-red-600' : 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white border-surface-300 text-surface-600 hover:border-surface-400'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                    {!isPregnant && <p className="text-[10px] text-red-500 mt-1 font-medium">Required for female patients</p>}
                  </div>
                </div>
              )}

              {/* Row 2: Allergy */}
              <div className="p-4 bg-surface-50 rounded-xl border border-surface-200 space-y-3">
                <label className="block text-xs font-semibold text-surface-700">
                  14. Asthma / Allergy / Contrast Media Reaction <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  {(['Yes', 'No'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setHasAllergy(opt)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                        hasAllergy === opt || (hasAllergy === 'Ya' && opt === 'Yes') || (hasAllergy === 'Tidak' && opt === 'No')
                          ? opt === 'Yes' ? 'bg-amber-500 text-white border-amber-500' : 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white border-surface-300 text-surface-600 hover:border-surface-400'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                {!hasAllergy && <p className="text-[10px] text-red-500 font-medium">Required — select Yes or No</p>}
                {(hasAllergy === 'Yes' || hasAllergy === 'Ya') && (
                  <input
                    required
                    value={allergyDetails}
                    onChange={(e) => setAllergyDetails(e.target.value)}
                    className="input-field text-xs"
                    placeholder="Specify allergy / reaction details... *"
                  />
                )}
              </div>

              {/* Row 3: Mobile & Payment status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-surface-50 rounded-xl border border-surface-200">
                  <label className="block text-xs font-semibold text-surface-700 mb-1.5">15. Mobile Scanning Required</label>
                  <div className="flex gap-2">
                    {(['Yes', 'No'] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setHasMobileDevice(opt)}
                        className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${
                          hasMobileDevice === opt || (hasMobileDevice === 'Ya' && opt === 'Yes') || (hasMobileDevice === 'Tidak' && opt === 'No')
                            ? 'bg-navy-800 text-white border-navy-800'
                            : 'bg-white border-surface-300 text-surface-600 hover:border-surface-400'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-surface-50 rounded-xl border border-surface-200">
                  <label className="block text-xs font-semibold text-surface-700 mb-1.5">16. Payment Category</label>
                  <select
                    value={paymentCategory}
                    onChange={(e) => setPaymentCategory(e.target.value as any)}
                    className="select-field text-xs"
                  >
                    <option value="">— Select Category —</option>
                    <option value="Government">Government</option>
                    <option value="Private">Private</option>
                    <option value="Self-Pay">Self-Pay</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Row 4: Citizen / Civil Servant / FPP */}
              <div className="p-4 bg-surface-50 rounded-xl border border-surface-200 space-y-2">
                <label className="block text-xs font-semibold text-surface-700">Classification Toggles</label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-surface-600">Malaysian Citizen</span>
                    <div className="flex gap-1">
                      {(['Yes', 'No'] as const).map((opt) => (
                        <button key={`wn-${opt}`} type="button" onClick={() => setIsWarganegara(opt)}
                          className={`flex-1 py-1 rounded text-[11px] font-bold border ${isWarganegara === opt || (isWarganegara === 'Ya' && opt === 'Yes') ? 'bg-navy-800 text-white border-navy-800' : 'bg-white border-surface-300 text-surface-600'}`}>
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-surface-600">Civil Servant</span>
                    <div className="flex gap-1">
                      {(['Yes', 'No'] as const).map((opt) => (
                        <button key={`pa-${opt}`} type="button" onClick={() => setIsPenjawatAwam(opt)}
                          className={`flex-1 py-1 rounded text-[11px] font-bold border ${isPenjawatAwam === opt || (isPenjawatAwam === 'Ya' && opt === 'Yes') ? 'bg-navy-800 text-white border-navy-800' : 'bg-white border-surface-300 text-surface-600'}`}>
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-surface-600">FPP</span>
                    <div className="flex gap-1">
                      {(['Yes', 'No'] as const).map((opt) => (
                        <button key={`fpp-${opt}`} type="button" onClick={() => setIsFpp(opt)}
                          className={`flex-1 py-1 rounded text-[11px] font-bold border ${isFpp === opt || (isFpp === 'Ya' && opt === 'Yes') ? 'bg-navy-800 text-white border-navy-800' : 'bg-white border-surface-300 text-surface-600'}`}>
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 5: Contrast Media Toggle */}
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-purple-900">22. Contrast Media Required</label>
                  <button
                    type="button"
                    onClick={() => setContrastMediaRequired(!contrastMediaRequired)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${contrastMediaRequired ? 'bg-purple-600' : 'bg-surface-300'}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${contrastMediaRequired ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
                {contrastMediaRequired && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-purple-800 mb-1">Brand / Name *</label>
                      <input
                        required
                        value={contrastMediaName}
                        onChange={(e) => setContrastMediaName(e.target.value)}
                        className="input-field text-xs border-purple-300"
                        placeholder="e.g., Omnipaque, Visipaque..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-purple-800 mb-1">Volume (ml)</label>
                      <input
                        type="number"
                        min="0"
                        value={contrastMediaVolumeMl}
                        onChange={(e) => setContrastMediaVolumeMl(e.target.value)}
                        className="input-field text-xs border-purple-300"
                        placeholder="e.g., 100"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Row 6: Renal Function */}
              {requiresRenal && (
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl space-y-3">
                  <p className="text-xs font-bold text-orange-900">17. Renal Function Test * <span className="font-normal text-orange-700">(Required when contrast media is used)</span></p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-orange-800 mb-1">Test Date *</label>
                      <input type="date" value={renalFunctionDate} onChange={(e) => setRenalFunctionDate(e.target.value)} className="input-field text-xs border-orange-300" required />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-orange-800 mb-1">Creatinine *</label>
                      <input value={creatinine} onChange={(e) => setCreatinine(e.target.value)} className="input-field text-xs border-orange-300" placeholder="μmol/L" required />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-orange-800 mb-1">eGFR *</label>
                      <input value={egfr} onChange={(e) => setEgfr(e.target.value)} className="input-field text-xs border-orange-300" placeholder="mL/min/1.73m²" required />
                    </div>
                  </div>
                </div>
              )}

              {/* Row 7: Clinical Notes */}
              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">
                  Clinical Notes
                  <span className="text-surface-400 font-normal ml-2">(Patient presentation history, clinical diagnosis, and referral notes)</span>
                </label>
                <textarea
                  rows={4}
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  className="input-field resize-none text-xs"
                  placeholder="Provide full clinical notes: presenting complaint, history, provisional diagnosis, and reason for referral..."
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-surface-200">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="btn-secondary text-xs flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" /> Back: Modality &amp; Exams
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                disabled={!step3Valid}
                className="btn-primary text-xs flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next: Review &amp; Submit <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: REVIEW & SUBMIT ───────────────────────────────────────────── */}
        {currentStep === 4 && (
          <div className="card space-y-6">
            <div className="flex items-center gap-2 border-b border-surface-200 pb-3">
              <Activity className="w-5 h-5 text-emerald-600" />
              <div>
                <h2 className="text-base font-bold text-navy-900">Step 4: Summary Review &amp; Confirmation</h2>
                <p className="text-xs text-surface-500">Verify all referral parameters before submitting for automated AI scheduling</p>
              </div>
            </div>

            {/* Summary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Patient Badge */}
              <div className="p-3.5 bg-navy-50 rounded-xl border border-navy-200 space-y-1">
                <p className="text-[10px] font-bold text-navy-700 uppercase tracking-wider">Patient Summary</p>
                <p className="text-sm font-bold text-navy-900">{selectedPatient?.name}</p>
                <p className="text-navy-700">MRN: <span className="font-mono font-semibold">{selectedPatient?.mrn}</span> &middot; NRIC: <span className="font-mono font-semibold">{selectedPatient?.nric}</span></p>
                <p className="text-navy-600">Gender: {selectedPatient?.gender} &middot; DOB: {selectedPatient?.dob} &middot; Ethnicity: {selectedPatient?.ethnicity || '—'}</p>
              </div>

              {/* Referral Badge */}
              <div className="p-3.5 bg-surface-100 rounded-xl border border-surface-200 space-y-1">
                <p className="text-[10px] font-bold text-surface-500 uppercase tracking-wider">Clinical Referral</p>
                <p className="text-sm font-bold text-surface-900">{indication}</p>
                <p className="text-surface-700">Severity: <span className="font-semibold text-navy-800">{severity}</span> {incubationPeriod ? `· Incubation: ${incubationPeriod} days` : ''}</p>
                <p className="text-surface-500">Modality: <strong className="text-navy-800">{modality}</strong> ({examCards.length} Examination{examCards.length > 1 ? 's' : ''})</p>
              </div>

              {/* Exams Summary */}
              <div className="md:col-span-2 p-3.5 bg-surface-50 rounded-xl border border-surface-200 space-y-2">
                <p className="text-[10px] font-bold text-surface-500 uppercase tracking-wider">Requested Examinations ({examCards.length})</p>
                <div className="space-y-1.5">
                  {examCards.map((card, i) => (
                    <div key={card.id} className="p-2 bg-white rounded-lg border border-surface-200 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-navy-900">#{i + 1} {card.bodyPart === 'Other' ? card.customBodyPart : card.bodyPart}</span>
                        {card.side && card.side !== 'N/A' && <span className="ml-1 px-1.5 py-0.5 bg-navy-100 text-navy-700 rounded font-semibold text-[10px]">Side: {card.side}</span>}
                      </div>
                      <span className="text-surface-600 text-[11px] font-medium">{card.viewsOrProtocol.join(', ')}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* MOH Flags Summary */}
              <div className="md:col-span-2 p-3.5 bg-blue-50 rounded-xl border border-blue-200 space-y-1.5">
                <p className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Clinical Screening Summary (MOH PER.SS-RA301)</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div><span className="text-blue-600 font-medium">Pregnant:</span> <strong className="text-blue-900">{isPregnant || 'N/A'}</strong></div>
                  <div><span className="text-blue-600 font-medium">Allergy:</span> <strong className="text-blue-900">{hasAllergy || 'N/A'}</strong></div>
                  <div><span className="text-blue-600 font-medium">Contrast:</span> <strong className="text-blue-900">{contrastMediaRequired ? `${contrastMediaName} (${contrastMediaVolumeMl}ml)` : 'No'}</strong></div>
                  <div><span className="text-blue-600 font-medium">Payment:</span> <strong className="text-blue-900">{paymentCategory || '—'}</strong></div>
                </div>
              </div>

              {/* Clinical Notes Summary Preview */}
              {clinicalNotes && (
                <div className="md:col-span-2 p-3.5 bg-surface-100 rounded-xl border border-surface-200 space-y-1">
                  <p className="text-[10px] font-bold text-surface-600 uppercase tracking-wider">Clinical Notes</p>
                  <p className="text-surface-800 text-xs whitespace-pre-line">{clinicalNotes}</p>
                </div>
              )}
            </div>

            {/* Advanced Preferences */}
            <div className="space-y-3 pt-2 border-t border-surface-200">
              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">Preferred Healthcare Centre <span className="text-surface-400 font-normal">(optional)</span></label>
                <select
                  value={preferredClinicId}
                  onChange={(e) => setPreferredClinicId(e.target.value)}
                  className="select-field text-xs"
                >
                  <option value="">No preference — AI Scheduler will determine</option>
                  {clinics.filter((c) => c.status === 'active').map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-surface-200">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="btn-secondary text-xs flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" /> Back: Clinical Screening
              </button>

              <button
                type="submit"
                disabled={!isFormValid || submitting}
                className="btn-primary flex items-center gap-2 py-2.5 px-6 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                {submitting ? 'Registering Case…' : 'Register Radiology Referral Case'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

// Searchable patient selector component
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

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = patients.find((p) => p.id === value);
  const filtered = patients.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.mrn.toLowerCase().includes(search.toLowerCase()) ||
    p.nric.toLowerCase().includes(search.toLowerCase())
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
