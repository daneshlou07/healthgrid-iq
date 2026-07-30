import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ux/Toast';
import {
  FileText,
  User,
  Activity,
  Layers,
  AlertTriangle,
  Check,
  Plus,
  Trash2,
  Calendar,
  Building2,
  Stethoscope,
  Info,
} from 'lucide-react';
import type { SeverityLevel, ExaminationSide, MohYaTidak, MohPaymentCategory } from '../../types';

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
  { id: 1, title: 'Patient & Referral', subtitle: 'Select patient & clinical symptom' },
  { id: 2, title: 'Modality & Examinations', subtitle: 'Select imaging modality & body region' },
  { id: 3, title: 'Clinical Screening', subtitle: 'Safety assessment & risk factors' },
  { id: 4, title: 'Review & Submit', subtitle: 'Final MOH PER.SS-RA301 verification' },
];

const MODALITIES = ['X-Ray', 'CT', 'MRI', 'Ultrasound', 'Mammography'];

export default function MoNewCaseRegistration() {
  const navigate = useNavigate();
  const { patients, addCase, addAuditLog } = useData();
  const { currentUser } = useAuth();
  const toast = useToast();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1 State
  const [patientId, setPatientId] = useState('');
  const [notes, setNotes] = useState('');
  const [disease, setDisease] = useState('');
  const [clinicName, setClinicName] = useState('HealthGrid MO Radiology Centre');
  const [severity, setSeverity] = useState<SeverityLevel>('Routine' as any);

  // Step 2 State
  const [modality, setModality] = useState('X-Ray');
  const [examCards, setExamCards] = useState<FormExamCard[]>([createBlankExamCard(1)]);

  // Step 3 State
  const [isWarganegara, setIsWarganegara] = useState('Yes');
  const [isPenjawatAwam, setIsPenjawatAwam] = useState('No');
  const [isFpp, setIsFpp] = useState('No');
  const [paymentCategory, setPaymentCategory] = useState('Bayaran Penuh (Awam)');
  const [isPregnant, setIsPregnant] = useState('No');
  const [lmp, setLmp] = useState('');
  const [hasAllergy, setHasAllergy] = useState('No');
  const [allergyDetails, setAllergyDetails] = useState('');
  const [hasMobileDevice, setHasMobileDevice] = useState('No');
  const [renalFunctionDate, setRenalFunctionDate] = useState('');
  const [creatinine, setCreatinine] = useState('');
  const [egfr, setEgfr] = useState('');

  const selectedPatient = patients.find((p) => p.id === patientId);

  const handleAddExamCard = () => {
    setExamCards((prev) => [...prev, createBlankExamCard(prev.length + 1)]);
  };

  const handleRemoveExamCard = (id: string) => {
    if (examCards.length <= 1) return;
    setExamCards((prev) => prev.filter((card) => card.id !== id));
  };

  const handleUpdateExamCard = (id: string, updates: Partial<FormExamCard>) => {
    setExamCards((prev) => prev.map((card) => (card.id === id ? { ...card, ...updates } : card)));
  };

  const handleSubmitCase = async () => {
    if (!selectedPatient) {
      toast.error('Please select a patient.');
      setCurrentStep(1);
      return;
    }

    setSubmitting(true);
    try {
      const firstExam = examCards[0];
      const primaryBodyPart = firstExam?.bodyPart === 'Other' ? firstExam.customBodyPart : firstExam?.bodyPart || 'Unspecified';
      const caseNumber = `${modality.substring(0, 2).toUpperCase()}${new Date().getFullYear()}${Math.floor(100000 + Math.random() * 900000)}`;
      const newId = `case-${Date.now()}`;

      await addCase({
        caseNumber,
        patientId: selectedPatient.id,
        patientName: selectedPatient.name,
        notes,
        disease,
        severity,
        modality,
        scanType: `${modality} — ${primaryBodyPart}`,
        clinicName,
        status: 'CREATED',
        createdAt: new Date().toISOString(),
        registeredByName: currentUser?.name || 'Dr. Medical Officer',
        isWarganegara: isWarganegara as MohYaTidak,
        isPenjawatAwam: isPenjawatAwam as MohYaTidak,
        isFpp: isFpp as MohYaTidak,
        paymentCategory: paymentCategory as MohPaymentCategory,
        isPregnant: isPregnant as MohYaTidak,
        lmp: isPregnant === 'Yes' ? lmp : undefined,
        hasAllergy: hasAllergy as MohYaTidak,
        allergyDetails: hasAllergy === 'Yes' ? allergyDetails : undefined,
        hasMobileDevice: hasMobileDevice as MohYaTidak,
        renalFunctionDate: renalFunctionDate || undefined,
        creatinine: creatinine || undefined,
        egfr: egfr || undefined,
        bodyRegion: primaryBodyPart,
      });

      if (currentUser) {
        await addAuditLog({
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          action: 'CASE_CREATED',
          target: `cases/${newId}`,
          details: `Medical Officer ${currentUser.name} submitted radiology referral ${caseNumber} for ${selectedPatient.name}`,
          timestamp: new Date().toISOString(),
        });
      }

      toast.success(`Referral Case ${caseNumber} submitted by MO`);
      navigate('/cases');
    } catch (err) {
      toast.error('Failed to submit case.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="page-title">Medical Officer Clinical Referral Intake</h1>
        <p className="page-subtitle">Issue a digital radiology request (MOH Borang PER.SS-RA301) for radiographer imaging.</p>
      </div>

      {/* Stepper Header */}
      <div className="card p-3 sm:p-4 bg-white border border-slate-200 shadow-sm">
        <div className="grid grid-cols-4 gap-2">
          {STEPS.map((step) => {
            const isCompleted = step.id < currentStep;
            const isActive = step.id === currentStep;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => { if (isCompleted) setCurrentStep(step.id as any); }}
                disabled={!isCompleted && !isActive}
                className={`text-left p-2.5 sm:p-3 rounded-xl transition-all flex flex-col justify-between border ${
                  isActive
                    ? 'bg-purple-900 text-white border-purple-900 shadow-md ring-2 ring-purple-200'
                    : isCompleted
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-200 cursor-pointer'
                    : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center ${
                    isActive ? 'bg-white text-purple-900' : isCompleted ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {isCompleted ? <Check className="w-3 h-3 stroke-[3]" /> : step.id}
                  </span>
                  <span className="text-[10px] uppercase font-bold opacity-75">Step {step.id}</span>
                </div>
                <div>
                  <p className="text-xs font-bold truncate">{step.title}</p>
                  <p className={`text-[10px] truncate ${isActive ? 'text-purple-200' : isCompleted ? 'text-emerald-700' : 'text-slate-400'}`}>
                    {step.subtitle}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP 1: PATIENT & REFERRAL */}
      {currentStep === 1 && (
        <div className="card space-y-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <User className="w-5 h-5 text-purple-600" />
            <h2 className="text-base font-bold text-slate-900">Step 1: Patient Selection &amp; Indication</h2>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Select Patient *</label>
            <select
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="input-field border-purple-300 focus:ring-purple-500"
              required
            >
              <option value="">-- Choose Patient from Registry --</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.name} (MRN: {p.mrn}) &middot; NRIC: {p.nric || 'N/A'}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Presenting Indication / Symptom *</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe clinical symptoms, physical examination findings, or trauma mechanism..."
              className="input-field text-xs"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Primary Clinical Diagnosis</label>
              <input
                type="text"
                value={disease}
                onChange={(e) => setDisease(e.target.value)}
                placeholder="e.g., Suspected Tibial Fracture / Pneumonia"
                className="input-field text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Urgency Severity Level</label>
              <select value={severity} onChange={(e) => setSeverity(e.target.value as SeverityLevel)} className="input-field text-xs">
                <option value="Routine">Routine</option>
                <option value="Urgent">Urgent (Within 4 Hours)</option>
                <option value="Emergency">Emergency STAT (Immediate)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => {
                if (!patientId) { toast.error('Please select a patient.'); return; }
                if (!notes) { toast.error('Please specify clinical indication.'); return; }
                setCurrentStep(2);
              }}
              className="btn-primary text-xs font-bold px-6 py-2.5 shadow-md"
            >
              Continue to Step 2 &rarr;
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: MODALITY & EXAMINATIONS */}
      {currentStep === 2 && (
        <div className="card space-y-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-600" />
              <h2 className="text-base font-bold text-slate-900">Step 2: Imaging Modality &amp; Body Region</h2>
            </div>
            <span className="text-xs font-bold text-purple-900 bg-purple-100 px-3 py-1 rounded-full border border-purple-300">
              Modality: {modality}
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Select Modality *</label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {MODALITIES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModality(m)}
                  className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${
                    modality === m
                      ? 'bg-purple-900 text-white border-purple-900 shadow-md ring-2 ring-purple-200'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {examCards.map((card, idx) => (
              <div key={card.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-900 uppercase">Examination Card #{idx + 1}</span>
                  {examCards.length > 1 && (
                    <button type="button" onClick={() => handleRemoveExamCard(card.id)} className="text-red-600 hover:text-red-800 text-xs font-bold flex items-center gap-1">
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Anatomical Region / Body Part *</label>
                  <input
                    type="text"
                    value={card.bodyPart}
                    onChange={(e) => handleUpdateExamCard(card.id, { bodyPart: e.target.value })}
                    placeholder="e.g., Chest PA, Lumbar Spine, Knee Joint"
                    className="input-field text-xs"
                    required
                  />
                </div>
              </div>
            ))}

            <button type="button" onClick={handleAddExamCard} className="btn-secondary text-xs font-bold py-2 w-full flex items-center justify-center gap-1.5 border-dashed border-slate-300">
              <Plus className="w-4 h-4" /> Add Additional Examination Card
            </button>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button type="button" onClick={() => setCurrentStep(1)} className="btn-secondary text-xs font-bold px-4 py-2">
              &larr; Back to Step 1
            </button>
            <button type="button" onClick={() => setCurrentStep(3)} className="btn-primary text-xs font-bold px-6 py-2.5 shadow-md">
              Continue to Step 3 &rarr;
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: CLINICAL SCREENING */}
      {currentStep === 3 && (
        <div className="card space-y-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <Activity className="w-5 h-5 text-purple-600" />
            <h2 className="text-base font-bold text-slate-900">Step 3: Clinical Safety &amp; Risk Screening</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <label className="font-bold text-slate-800 block">Pregnancy Status (Female Patient)</label>
              <select value={isPregnant} onChange={(e) => setIsPregnant(e.target.value)} className="input-field text-xs">
                <option value="No">No / Not Applicable</option>
                <option value="Yes">Yes (Pregnant)</option>
                <option value="Uncertain">Uncertain</option>
              </select>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <label className="font-bold text-slate-800 block">Contrast Allergy / Asthma History</label>
              <select value={hasAllergy} onChange={(e) => setHasAllergy(e.target.value)} className="input-field text-xs">
                <option value="No">No Known Allergies</option>
                <option value="Yes">Yes (Has Allergy / Asthma)</option>
              </select>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <label className="font-bold text-slate-800 block">Mobile Bedside Scanning Required?</label>
              <select value={hasMobileDevice} onChange={(e) => setHasMobileDevice(e.target.value)} className="input-field text-xs">
                <option value="No">No (Patient comes to Radiology)</option>
                <option value="Yes">Yes (Bedside Scanning Required)</option>
              </select>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <label className="font-bold text-slate-800 block">Renal Function Lab (Creatinine / eGFR)</label>
              <div className="grid grid-cols-2 gap-2">
                <input type="text" value={creatinine} onChange={(e) => setCreatinine(e.target.value)} placeholder="Creatinine..." className="input-field text-xs font-mono" />
                <input type="text" value={egfr} onChange={(e) => setEgfr(e.target.value)} placeholder="eGFR..." className="input-field text-xs font-mono" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button type="button" onClick={() => setCurrentStep(2)} className="btn-secondary text-xs font-bold px-4 py-2">
              &larr; Back to Step 2
            </button>
            <button type="button" onClick={() => setCurrentStep(4)} className="btn-primary text-xs font-bold px-6 py-2.5 shadow-md">
              Review &amp; Verify Referral &rarr;
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: REVIEW & SUBMIT */}
      {currentStep === 4 && (
        <div className="card space-y-6 border border-purple-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-emerald-600" />
              <h2 className="text-base font-bold text-slate-900">Step 4: Final Requisition Verification</h2>
            </div>
            <span className="badge-purple font-bold text-xs">MO AUTHORIZED</span>
          </div>

          <div className="p-4 bg-purple-50 rounded-xl border border-purple-200 space-y-2 text-xs">
            <p className="font-bold text-purple-900">Patient: {selectedPatient?.name} (MRN: {selectedPatient?.mrn})</p>
            <p className="text-slate-700">Modality: <strong>{modality}</strong> &middot; Indication: <em>{notes}</em></p>
            <p className="text-slate-600">Bedside Mobile: {hasMobileDevice} &middot; Urgency: <span className="font-bold text-purple-950">{severity}</span></p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button type="button" onClick={() => setCurrentStep(3)} className="btn-secondary text-xs font-bold px-4 py-2">
              &larr; Back to Step 3
            </button>
            <button
              type="button"
              onClick={handleSubmitCase}
              disabled={submitting}
              className="btn-success text-xs font-bold px-7 py-3 shadow-lg disabled:opacity-50"
            >
              {submitting ? 'Submitting Case...' : 'Submit Radiology Referral'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
