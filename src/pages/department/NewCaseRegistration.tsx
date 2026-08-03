import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ux/Toast';
import { useDebounce } from '../../hooks/useDebounce';
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
  const toast = useToast();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // ── Step 1 State ─────────────────────────────────────────────────────
  const [patientId, setPatientId] = useState('');
  const [indication, setIndication] = useState('');
  const [symptomOption, setSymptomOption] = useState('');
  const [customIndication, setCustomIndication] = useState('');
  const [severity, setSeverity] = useState<SeverityLevel>('Moderate');
  const [incubationPeriod, setIncubationPeriod] = useState('');

  // ── Step 1 Context (MOH Field 10 & 11) ────────────────────────────────
  const [wardOrClinic, setWardOrClinic] = useState('Klinik Kesihatan / A&E');
  const [disiplin, setDisiplin] = useState('Kesihatan Awam / General Medicine');

  // ── Step 2 State ─────────────────────────────────────────────────────
  const [modality, setModality] = useState('X-Ray');
  const [examCards, setExamCards] = useState<FormExamCard[]>([createBlankExamCard(1)]);
  const [showDoseModal, setShowDoseModal] = useState(false);

  // ── Step 3 State (Clinical Screening & Notes) ─────────────────────────
  const [lmp, setLmp] = useState('');
  const [isPregnant, setIsPregnant] = useState<MohYaTidak | ''>('');
  const [hasAsthma, setHasAsthma] = useState<MohYaTidak | ''>('');
  const [hasAllergy, setHasAllergy] = useState<MohYaTidak | ''>('');
  const [allergyDetails, setAllergyDetails] = useState('');
  const [previousContrastReaction, setPreviousContrastReaction] = useState<MohYaTidak | ''>('');
  const [previousContrastDetails, setPreviousContrastDetails] = useState('');
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
  const [workflowPriority, setWorkflowPriority] = useState<'Emergency' | 'Non-Emergency'>('Emergency');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedPatient = patients.find((p) => p.id === patientId);

  React.useEffect(() => {
    if (!selectedPatient) return;
    if (selectedPatient.isWarganegara) setIsWarganegara(selectedPatient.isWarganegara);
    if (selectedPatient.isPenjawatAwam) setIsPenjawatAwam(selectedPatient.isPenjawatAwam);
    if (selectedPatient.isFpp) setIsFpp(selectedPatient.isFpp);
    if (selectedPatient.paymentCategory) {
      setPaymentCategory(selectedPatient.paymentCategory);
    } else if (selectedPatient.isWarganegara) {
      setPaymentCategory(calculateMohPaymentCategory(selectedPatient.isWarganegara, selectedPatient.isPenjawatAwam, selectedPatient.isFpp));
    }
    if (selectedPatient.hasAsthma) setHasAsthma(selectedPatient.hasAsthma);
    if (selectedPatient.previousContrastReaction) {
      setPreviousContrastReaction(selectedPatient.previousContrastReaction);
      if (selectedPatient.previousContrastDetails) setPreviousContrastDetails(selectedPatient.previousContrastDetails);
    }
  }, [selectedPatient]);

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
    if (!hasAllergy) return false;
    if ((hasAllergy === 'Yes' || hasAllergy === 'Ya') && !allergyDetails.trim()) return false;
    if (requiresRenal && (!renalFunctionDate || !creatinine || !egfr)) return false;
    return true;
  }, [patientId, isFemalePatient, isPregnant, hasAllergy, allergyDetails, requiresRenal, renalFunctionDate, creatinine, egfr]);

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
        hasAsthma: hasAsthma || undefined,
        hasAllergy: hasAllergy || undefined,
        allergyDetails: allergyDetails.trim() || undefined,
        previousContrastReaction: previousContrastReaction || undefined,
        previousContrastDetails: previousContrastDetails.trim() || undefined,
        hasMobileDevice: hasMobileDevice || undefined,
        isWarganegara: isWarganegara || undefined,
        isPenjawatAwam: isPenjawatAwam || undefined,
        isFpp: isFpp || undefined,
        paymentCategory: paymentCategory || undefined,
        officeNoPemeriksaan: caseNumber,
      });

      await addAuditLog({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'CASE_CREATED',
        target: `cases/${caseNumber}`,
        details: `Department Registered ${caseNumber} for ${patient?.name}`,
        timestamp: new Date().toISOString(),
      });

      toast.success(`Case ${caseNumber} registered successfully — pending AI Scheduler`);
      setPatientId(''); setIndication(''); setExamCards([createBlankExamCard(1)]); setCurrentStep(1);
    } catch {
      toast.error('Failed to create case.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900 tracking-tight">Register New Radiology Case</h1>
        <p className="text-xs text-surface-500 mt-1">Official MOH PER.SS-RA301 Radiology Referral &amp; Examination Request Form.</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-6 bg-white border border-slate-200 rounded-xl p-6 shadow-md">
        {currentStep === 1 && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-slate-900">Step 1: Patient &amp; Clinical Indication</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Field 10: Ward / Clinic / A&amp;E</label>
                <input value={wardOrClinic} onChange={(e) => setWardOrClinic(e.target.value)} className="input-field text-xs" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Field 11: Requesting Specialty (Disiplin)</label>
                <input value={disiplin} onChange={(e) => setDisiplin(e.target.value)} className="input-field text-xs" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-800 mb-1">Select Patient *</label>
                <select value={patientId} onChange={(e) => setPatientId(e.target.value)} className="select-field text-xs" required>
                  <option value="">— Select Patient —</option>
                  {patients.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.mrn}) — {p.nric}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-800 mb-1">Presenting Clinical Indication *</label>
                <textarea required rows={2} value={indication} onChange={(e) => setIndication(e.target.value)} className="input-field text-xs" placeholder="e.g. Cough for 2 weeks with fever" />
              </div>
            </div>
            <div className="flex justify-end">
              <button type="button" disabled={!step1Valid} onClick={() => setCurrentStep(2)} className="btn-primary text-xs flex items-center gap-1">Next: Modality <ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-slate-900">Step 2: Modality &amp; Examination Request</h2>
            <div className="grid grid-cols-5 gap-2">
              {MODALITIES.map((m) => (
                <button key={m} type="button" onClick={() => handleModalityChange(m)} className={`py-2 rounded-lg text-xs font-bold border ${modality === m ? 'bg-navy-800 text-white' : 'bg-white'}`}>{m}</button>
              ))}
            </div>

            {primaryExamDose && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-amber-900">Senarai Dos Berkesan: {primaryExamDose.examination} — {primaryExamDose.dosMsv} mSv</p>
                  <p className="text-amber-700 text-[10px]">Equivalency: ~{primaryExamDose.chestXrayRatio} Chest X-Rays</p>
                </div>
                <button type="button" onClick={() => setShowDoseModal(true)} className="text-amber-900 font-bold underline text-xs">View Dose Table</button>
              </div>
            )}

            <div className="flex justify-between">
              <button type="button" onClick={() => setCurrentStep(1)} className="btn-secondary text-xs"><ChevronLeft className="w-4 h-4" /> Back</button>
              <button type="button" disabled={!step2Valid} onClick={() => setCurrentStep(3)} className="btn-primary text-xs">Next: Screening <ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-4 text-xs">
            <h2 className="text-base font-bold text-slate-900">Step 3: Clinical Screening (MOH PER.SS-RA301)</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-bold block mb-1">Asthma (Field 14)</label>
                <select value={hasAsthma} onChange={(e) => setHasAsthma(e.target.value as MohYaTidak)} className="select-field text-xs"><option value="No">No</option><option value="Yes">Yes</option></select>
              </div>
              <div>
                <label className="font-bold block mb-1">Allergies (Field 14) *</label>
                <select value={hasAllergy} onChange={(e) => setHasAllergy(e.target.value as MohYaTidak)} className="select-field text-xs" required><option value="">Select...</option><option value="No">No</option><option value="Yes">Yes</option></select>
              </div>
            </div>
            {hasAllergy === 'Yes' && <input value={allergyDetails} onChange={(e) => setAllergyDetails(e.target.value)} className="input-field text-xs" placeholder="Allergy details..." required />}
            <div className="flex justify-between pt-4">
              <button type="button" onClick={() => setCurrentStep(2)} className="btn-secondary text-xs"><ChevronLeft className="w-4 h-4" /> Back</button>
              <button type="submit" disabled={!isFormValid || submitting} className="btn-primary text-xs">Submit Case Referral</button>
            </div>
          </div>
        )}
      </form>

      {showDoseModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-4 space-y-4">
            <h3 className="font-bold text-sm">SENARAI DOS BERKESAN UNTUK PEMERIKSAAN RADIOLOGI</h3>
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
