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
import { Info, Plus, Trash2, Layers, Check, ChevronDown, AlertTriangle } from 'lucide-react';

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
  const { patients, clinics, addCase, addAuditLog } = useData();
  const toast = useToast();

  const [patientId, setPatientId] = useState('');
  const [modality, setModality] = useState('X-Ray');
  const [indication, setIndication] = useState('');
  const [severity, setSeverity] = useState<SeverityLevel>('Moderate');
  const [incubationPeriod, setIncubationPeriod] = useState('');
  const [preferredClinicId, setPreferredClinicId] = useState('');
  const [notes, setNotes] = useState('');

  // ── MOH Clinical Screening State ─────────────────────────────────────
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
  const [bahagianPemeriksaan, setBahagianPemeriksaan] = useState('');
  const [ringkasanKlinikal, setRingkasanKlinikal] = useState('');

  // Repeatable Examination Cards State
  const [examCards, setExamCards] = useState<FormExamCard[]>([createBlankExamCard(1)]);

  const selectedPatient = patients.find((p) => p.id === patientId);
  const modalityRef = useMemo(() => getModalityRef(modality), [modality]);
  const isFemalePatient = selectedPatient?.gender === 'Female';
  const requiresRenal = contrastMediaRequired; // enforce renal when contrast is needed

  // MOH validation: required fields
  const mohScreeningValid = useMemo(() => {
    if (!patientId) return true; // Don't block before patient is selected
    if (isFemalePatient && !isPregnant) return false;
    if (!hasAllergy) return false;
    if (hasAllergy === 'Ya' && !allergyDetails.trim()) return false;
    if (requiresRenal && (!renalFunctionDate || !creatinine || !egfr)) return false;
    if (contrastMediaRequired && !contrastMediaName.trim()) return false;
    return true;
  }, [patientId, isFemalePatient, isPregnant, hasAllergy, allergyDetails, requiresRenal, renalFunctionDate, creatinine, egfr, contrastMediaRequired, contrastMediaName]);

  // Handle Modality Change — reset all examination cards to match new modality
  const handleModalityChange = (newModality: string) => {
    setModality(newModality);
    setExamCards([createBlankExamCard(1)]);
    // If switching away from contrast-compatible modalities, clear contrast fields
    if (!['CT', 'MRI', 'Fluoro', 'Angio'].includes(newModality)) {
      setContrastMediaRequired(false);
    }
  };

  // Add Examination Card
  const handleAddCard = () => {
    setExamCards((prev) => [...prev, createBlankExamCard(prev.length + 1)]);
  };

  // Remove Examination Card (except index 0)
  const handleRemoveCard = (index: number) => {
    if (index === 0) return;
    setExamCards((prev) => prev.filter((_, i) => i !== index));
  };

  // Update specific card field
  const updateCard = (index: number, updates: Partial<FormExamCard>) => {
    setExamCards((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  // Handle Body Part selection on a specific card — auto default side & options
  const handleBodyPartChange = (index: number, bodyPartName: string) => {
    if (bodyPartName === 'Other') {
      updateCard(index, { bodyPart: 'Other', customBodyPart: '', side: 'N/A', viewsOrProtocol: [] });
      return;
    }

    const partRef = modalityRef.bodyParts.find((b) => b.name === bodyPartName);
    const newSide: ExaminationSide = partRef?.supportsLaterality ? 'Right' : 'N/A';
    const defaultOpts = partRef?.defaultViewsOrProtocols || [];

    updateCard(index, {
      bodyPart: bodyPartName,
      customBodyPart: '',
      side: newSide,
      viewsOrProtocol: defaultOpts,
    });
  };

  // Toggle View/Protocol option for a card
  const toggleCardOption = (index: number, option: string) => {
    const currentOpts = examCards[index].viewsOrProtocol || [];
    if (modalityRef.isMultiOptionAllowed) {
      const exists = currentOpts.includes(option);
      const nextOpts = exists ? currentOpts.filter((o) => o !== option) : [...currentOpts, option];
      updateCard(index, { viewsOrProtocol: nextOpts });
    } else {
      // Single choice
      updateCard(index, { viewsOrProtocol: [option] });
    }
  };

  // Validate form submission
  const isValid = useMemo(() => {
    if (!currentUser || !patientId || !indication.trim() || !modality) return false;
    if (examCards.length === 0) return false;
    if (!mohScreeningValid) return false;
    return examCards.every((card) => {
      const partValid = card.bodyPart === 'Other' ? Boolean(card.customBodyPart.trim()) : Boolean(card.bodyPart);
      const optsValid = card.viewsOrProtocol.length > 0;
      return partValid && optsValid;
    });
  }, [currentUser, patientId, indication, modality, examCards, mohScreeningValid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || !currentUser) return;

    const patient = patients.find((p) => p.id === patientId);
    const preferredClinic = clinics.find((c) => c.id === preferredClinicId);
    const caseNumber = `XR${new Date().getFullYear()}${String(Date.now()).slice(-6)}`;

    // Build requestedExaminations array
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

    // Build summary string for parent scanType and bodyRegion
    const scanTypeSummary = requestedExaminations.map((ex) => {
      const sideStr = ex.side && ex.side !== 'N/A' ? ` [${ex.side}]` : '';
      const optsStr = ex.viewsOrProtocol.length ? ` (${ex.viewsOrProtocol.join(', ')})` : '';
      return `${ex.bodyPart}${sideStr}${optsStr}`;
    }).join('; ');

    const fullScanType = `${modality} — ${scanTypeSummary}`;

    // Extract unique body regions for parent record
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
        notes,
        status: 'CREATED',
        createdAt: new Date().toISOString(),
        // ── MOH Clinical Screening fields ──
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
        bahagianPemeriksaan: bahagianPemeriksaan.trim() || undefined,
        ringkasanKlinikal: ringkasanKlinikal.trim() || undefined,
        // Default office No. Pemeriksaan = caseNumber
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
      setPatientId('');
      setIndication('');
      setSeverity('Moderate');
      setIncubationPeriod('');
      setPreferredClinicId('');
      setNotes('');
      setExamCards([createBlankExamCard(1)]);
      // Reset MOH fields
      setLmp(''); setIsPregnant(''); setHasAllergy(''); setAllergyDetails('');
      setHasMobileDevice(''); setIsWarganegara(''); setIsPenjawatAwam(''); setIsFpp('');
      setPaymentCategory(''); setRenalFunctionDate(''); setCreatinine(''); setEgfr('');
      setContrastMediaRequired(false); setContrastMediaName(''); setContrastMediaVolumeMl('');
      setBahagianPemeriksaan(''); setRingkasanKlinikal('');
    } catch {
      toast.error('Failed to create case.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="page-title">Register New Case</h1>
        <p className="page-subtitle">
          Register a patient imaging referral with one or more requested examinations under a single imaging modality.
        </p>
      </div>

      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-blue-700 space-y-1">
          <p className="font-medium">Multi-Examination Case Registration</p>
          <p>
            1. Select patient &amp; presenting indication &rarr; 2. Select imaging modality &rarr; 3. Add requested examinations (body parts, sides, views/protocols) &rarr; 4. Submit for automated AI scheduling.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-6">
        {/* ── Patient & Presenting Indication ── */}
        <div>
          <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">
            Clinical Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-surface-700 mb-1">Registered by</label>
              <input
                disabled
                value={currentUser?.name || ''}
                className="input-field bg-surface-100 text-surface-600 cursor-not-allowed"
              />
            </div>

            {/* Presenting indication */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-surface-700 mb-1">
                Indication / Symptom *
              </label>
              <input
                required
                list="symptom-suggestions"
                value={indication}
                onChange={(e) => setIndication(e.target.value)}
                className="input-field"
                placeholder="Type the patient's presenting symptom or clinical indication..."
              />
              <datalist id="symptom-suggestions">
                {SYMPTOM_SUGGESTIONS.map((symptom) => (
                  <option key={symptom} value={symptom} />
                ))}
              </datalist>
            </div>

            {/* Patient Selection */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-surface-700 mb-1">Patient *</label>
              <PatientSearchSelect
                patients={patients}
                value={patientId}
                onChange={(id) => setPatientId(id)}
              />
              {selectedPatient && (
                <div className="mt-2 p-3 bg-surface-100 rounded-lg border border-surface-200 text-xs space-y-0.5">
                  <p className="font-medium text-surface-700">
                    {selectedPatient.name} — <span className="font-mono">{selectedPatient.mrn}</span> ({selectedPatient.nric})
                  </p>
                  <p className="text-surface-500">Address: {selectedPatient.address}</p>
                  {selectedPatient.medicalHistory.length > 0 && (
                    <p className="text-surface-500">History: {selectedPatient.medicalHistory.join(', ')}</p>
                  )}
                </div>
              )}
            </div>

            {/* Severity */}
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">Severity *</label>
              <div className="flex gap-2">
                {SEVERITIES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSeverity(s)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                      severity === s
                        ? 'bg-navy-600 text-white border-navy-600'
                        : 'bg-white border-surface-300 text-surface-600 hover:border-surface-400'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Incubation Period */}
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">
                Incubation Period (days)
              </label>
              <input
                value={incubationPeriod}
                onChange={(e) => setIncubationPeriod(e.target.value)}
                className="input-field"
                placeholder="Optional — e.g. 3"
              />
            </div>
          </div>
        </div>

        {/* ── Single Imaging Modality Selection ── */}
        <div className="pt-4 border-t border-surface-200">
          <label className="block text-sm font-medium text-surface-700 mb-1.5">
            Imaging Modality * <span className="text-xs text-surface-400 font-normal">(applies to all requested examinations in this case)</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {MODALITIES.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => handleModalityChange(m)}
                className={`py-3 rounded-xl text-xs font-semibold border transition-all duration-150 flex flex-col items-center gap-1 ${
                  modality === m
                    ? 'bg-navy-700 text-white border-navy-700 shadow-md ring-2 ring-navy-300'
                    : 'bg-white border-surface-300 text-surface-700 hover:border-surface-400 hover:bg-surface-50'
                }`}
              >
                <span>{m}</span>
                {modality === m && <span className="text-[10px] text-emerald-300 font-normal">Active Selection</span>}
              </button>
            ))}
          </div>
        </div>

        {/* ── Repeatable Requested Examinations Component ── */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-navy-600" />
              <h3 className="text-sm font-bold text-navy-800">
                Requested Examinations ({examCards.length})
              </h3>
            </div>
            <span className="text-[11px] text-surface-500">
              Modality: <strong className="text-navy-700">{modality}</strong>
            </span>
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
                  {/* Card Header */}
                  <div className="flex items-center justify-between border-b border-surface-200 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 bg-navy-600 text-white text-[11px] font-bold rounded-full flex items-center justify-center">
                        {index + 1}
                      </span>
                      <span className="text-xs font-bold text-navy-800 uppercase tracking-wider">
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
                      <span className="text-[10px] text-surface-400">Primary Examination</span>
                    )}
                  </div>

                  {/* Body Part & Side Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    {/* Body Part */}
                    <div className="sm:col-span-7">
                      <label className="block text-xs font-medium text-surface-700 mb-1">
                        Body Part *
                      </label>
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

                    {/* Side / Laterality */}
                    <div className="sm:col-span-5">
                      <label className="block text-xs font-medium text-surface-700 mb-1">
                        Side / Laterality *
                      </label>
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
                                  ? 'bg-navy-700 text-white border-navy-700'
                                  : 'bg-white border-surface-300 text-surface-600 hover:border-surface-400'
                              }`}
                            >
                              {s}
                            </button>
                          );
                        })}
                      </div>
                      {!supportsLaterality && (
                        <p className="text-[10px] text-surface-400 mt-1">N/A applies to central anatomical structures.</p>
                      )}
                    </div>
                  </div>

                  {/* Adaptive Examination Details (Views / Protocols) */}
                  {card.bodyPart && (
                    <div className="pt-2 border-t border-surface-200">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-medium text-surface-700">
                          {modalityRef.optionTypeLabel} *
                        </label>
                        {modalityRef.isMultiOptionAllowed && (
                          <span className="text-[10px] text-navy-600 font-medium">
                            {card.viewsOrProtocol.length} selected
                          </span>
                        )}
                      </div>

                      {/* X-Ray: Multi-Select Pill Checkboxes for Views */}
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
                        /* CT / MRI / Ultrasound: Protocol Select Dropdown */
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
                                    ? 'bg-navy-700 text-white border-navy-700 shadow-sm'
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

                  {/* Card Notes */}
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

          {/* Add Another Examination Button */}
          <button
            type="button"
            onClick={handleAddCard}
            className="w-full py-2.5 border-2 border-dashed border-navy-200 hover:border-navy-400 bg-navy-50/50 hover:bg-navy-50 text-navy-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-all duration-150"
          >
            <Plus className="w-4 h-4 text-navy-600" />
            Add Another Examination ({modality})
          </button>
        </div>

        {/* Clinical Notes & Preferred Clinic */}
        <div className="pt-4 border-t border-surface-200 space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">General Clinical Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input-field resize-none text-xs"
              placeholder="Additional referral history, clinical notes..."
            />
          </div>

          <details className="group">
            <summary className="cursor-pointer text-xs font-semibold text-surface-500 uppercase tracking-wider flex items-center gap-2 select-none hover:text-navy-600 transition-colors">
              <span>Advanced Options</span>
              <span className="text-[10px] font-normal text-surface-400 normal-case">(optional)</span>
            </summary>
            <div className="mt-3 p-4 bg-surface-50 rounded-lg border border-surface-200 space-y-3">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">
                  Preferred Healthcare Centre
                </label>
                <select
                  value={preferredClinicId}
                  onChange={(e) => setPreferredClinicId(e.target.value)}
                  className="select-field"
                >
                  <option value="">No preference — AI Scheduler will determine</option>
                  {clinics.filter((c) => c.status === 'active').map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </details>
        </div>

        {/* ── MOH PER.SS-RA301 Clinical Screening ── */}
        <div className="pt-4 border-t-2 border-dashed border-blue-200">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center flex-shrink-0">
              <span className="text-white text-[10px] font-bold">MOH</span>
            </div>
            <h3 className="text-sm font-bold text-blue-800">Borang PER.SS-RA301 — Clinical Screening</h3>
            <span className="text-[10px] text-blue-500 font-medium bg-blue-50 px-2 py-0.5 rounded-full">Fields 12–17 + Sections 18 &amp; 22</span>
          </div>

          {!mohScreeningValid && patientId && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">Complete the required MOH screening fields below before submitting.</p>
            </div>
          )}

          <div className="space-y-5">
            {/* Row 1: LMP + Pregnancy */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* LMP — only relevant for female patients */}
              {isFemalePatient && (
                <div>
                  <label className="block text-xs font-medium text-surface-700 mb-1">
                    12. LMP (Last Menstrual Period)
                    <span className="text-surface-400 font-normal ml-1">Jika berkaitan</span>
                  </label>
                  <input
                    type="date"
                    value={lmp}
                    onChange={(e) => setLmp(e.target.value)}
                    className="input-field text-xs"
                  />
                </div>
              )}

              {/* Pregnancy */}
              {isFemalePatient && (
                <div>
                  <label className="block text-xs font-medium text-surface-700 mb-1.5">
                    *13. Mengandung (Pregnancy) <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    {(['Ya', 'Tidak'] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setIsPregnant(opt)}
                        className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${
                          isPregnant === opt
                            ? opt === 'Ya' ? 'bg-red-600 text-white border-red-600' : 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white border-surface-300 text-surface-600 hover:border-surface-400'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                  {!isPregnant && <p className="text-[10px] text-red-500 mt-1">Required for female patients</p>}
                </div>
              )}
            </div>

            {/* Row 2: Allergy */}
            <div>
              <label className="block text-xs font-medium text-surface-700 mb-1.5">
                14. Asma / Alergi / Reaksi Media Kontras <span className="text-red-500">*</span>
                <span className="text-surface-400 font-normal ml-1">(Nyatakan)</span>
              </label>
              <div className="flex gap-2 mb-2">
                {(['Ya', 'Tidak'] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setHasAllergy(opt)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${
                      hasAllergy === opt
                        ? opt === 'Ya' ? 'bg-amber-500 text-white border-amber-500' : 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white border-surface-300 text-surface-600 hover:border-surface-400'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              {!hasAllergy && <p className="text-[10px] text-red-500 mt-1">Required — select Ya or Tidak</p>}
              {hasAllergy === 'Ya' && (
                <input
                  required
                  value={allergyDetails}
                  onChange={(e) => setAllergyDetails(e.target.value)}
                  className="input-field text-xs mt-2"
                  placeholder="Specify allergy / reaction details... *"
                />
              )}
            </div>

            {/* Row 3: Mobile */}
            <div>
              <label className="block text-xs font-medium text-surface-700 mb-1.5">
                15. Mobile
              </label>
              <div className="flex gap-2">
                {(['Ya', 'Tidak'] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setHasMobileDevice(opt)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${
                      hasMobileDevice === opt
                        ? 'bg-navy-700 text-white border-navy-700'
                        : 'bg-white border-surface-300 text-surface-600 hover:border-surface-400'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Row 4: Status Bayaran — Warganegara / Penjawat Awam / FPP */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-surface-700 mb-1.5">16. Status Bayaran</label>
                <select
                  value={paymentCategory}
                  onChange={(e) => setPaymentCategory(e.target.value as any)}
                  className="select-field text-xs"
                >
                  <option value="">— Pilih —</option>
                  <option value="Kerajaan">Kerajaan</option>
                  <option value="Swasta">Swasta</option>
                  <option value="Bayar Sendiri">Bayar Sendiri</option>
                  <option value="Lain-lain">Lain-lain</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-700 mb-1.5">Warganegara / Penjawat Awam / FPP</label>
                <div className="flex gap-1.5">
                  {(['Ya', 'Tidak'] as const).map((opt) => (
                    <button key={`wn-${opt}`} type="button" onClick={() => setIsWarganegara(opt)}
                      className={`flex-1 py-1.5 rounded text-[11px] font-medium border transition-all ${isWarganegara === opt ? 'bg-navy-700 text-white border-navy-700' : 'bg-white border-surface-300 text-surface-600 hover:border-surface-400'}`}>
                      WN {opt}
                    </button>
                  ))}
                  {(['Ya', 'Tidak'] as const).map((opt) => (
                    <button key={`pa-${opt}`} type="button" onClick={() => setIsPenjawatAwam(opt)}
                      className={`flex-1 py-1.5 rounded text-[11px] font-medium border transition-all ${isPenjawatAwam === opt ? 'bg-navy-700 text-white border-navy-700' : 'bg-white border-surface-300 text-surface-600 hover:border-surface-400'}`}>
                      PA {opt}
                    </button>
                  ))}
                  {(['Ya', 'Tidak'] as const).map((opt) => (
                    <button key={`fpp-${opt}`} type="button" onClick={() => setIsFpp(opt)}
                      className={`flex-1 py-1.5 rounded text-[11px] font-medium border transition-all ${isFpp === opt ? 'bg-navy-700 text-white border-navy-700' : 'bg-white border-surface-300 text-surface-600 hover:border-surface-400'}`}>
                      FPP {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Row 5: Contrast Media Toggle */}
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-purple-800">*22. Media Kontras (Contrast Media) — Nyatakan Jika Berkaitan</label>
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
                    <label className="block text-xs font-medium text-purple-700 mb-1">Jenama (Brand) <span className="text-red-500">*</span></label>
                    <input
                      required
                      value={contrastMediaName}
                      onChange={(e) => setContrastMediaName(e.target.value)}
                      className="input-field text-xs border-purple-300 focus:ring-purple-200"
                      placeholder="e.g., Omnipaque, Visipaque..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-purple-700 mb-1">Isipadu (ml)</label>
                    <input
                      type="number"
                      min="0"
                      value={contrastMediaVolumeMl}
                      onChange={(e) => setContrastMediaVolumeMl(e.target.value)}
                      className="input-field text-xs border-purple-300 focus:ring-purple-200"
                      placeholder="e.g., 100"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Row 6: Renal Function — shown when contrast required */}
            {requiresRenal && (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl space-y-3">
                <p className="text-xs font-bold text-orange-800">17. Renal Function <span className="text-red-500">*</span> <span className="font-normal">(Required when contrast is used)</span></p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-orange-700 mb-1">Tarikh <span className="text-red-500">*</span></label>
                    <input type="date" value={renalFunctionDate} onChange={(e) => setRenalFunctionDate(e.target.value)} className="input-field text-xs border-orange-300" required={requiresRenal} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-orange-700 mb-1">Creatinine <span className="text-red-500">*</span></label>
                    <input value={creatinine} onChange={(e) => setCreatinine(e.target.value)} className="input-field text-xs border-orange-300" placeholder="μmol/L" required={requiresRenal} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-orange-700 mb-1">eGFR <span className="text-red-500">*</span></label>
                    <input value={egfr} onChange={(e) => setEgfr(e.target.value)} className="input-field text-xs border-orange-300" placeholder="mL/min/1.73m²" required={requiresRenal} />
                  </div>
                </div>
              </div>
            )}

            {/* Row 7: Bahagian Pemeriksaan */}
            <div>
              <label className="block text-xs font-medium text-surface-700 mb-1">18. Bahagian Pemeriksaan</label>
              <input
                value={bahagianPemeriksaan}
                onChange={(e) => setBahagianPemeriksaan(e.target.value)}
                className="input-field text-xs"
                placeholder="Specify examination area / section..."
              />
            </div>

            {/* Row 8: Ringkasan Klinikal */}
            <div>
              <label className="block text-xs font-medium text-surface-700 mb-1">
                Ringkasan Klinikal
                <span className="text-surface-400 font-normal ml-2">(Clinical Summary — doctor's referral notes, history, and diagnosis)</span>
              </label>
              <textarea
                rows={4}
                value={ringkasanKlinikal}
                onChange={(e) => setRingkasanKlinikal(e.target.value)}
                className="input-field resize-none text-xs"
                placeholder="Provide a full clinical summary: presenting complaint, history, examination findings, provisional diagnosis, and reason for referral..."
              />
              <p className="text-[10px] text-surface-400 mt-1">This field corresponds to the Ringkasan Klinikal block at the bottom of MOH form PER.SS-RA301.</p>
            </div>
          </div>
        </div>

        {/* Form Submission Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-surface-200">
          <p className="text-[10px] text-surface-400">
            All {examCards.length} examination(s) will be submitted under 1 parent case for AI scheduling.
          </p>
          <button
            type="submit"
            disabled={!isValid}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Register Case ({examCards.length} Examination{examCards.length > 1 ? 's' : ''})
          </button>
        </div>
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
        value={open ? search : (selected ? `${selected.name} (${selected.mrn})` : '')}
        onChange={(e) => { setSearch(e.target.value); if (!open) setOpen(true); }}
        onFocus={() => { setOpen(true); setSearch(''); }}
        placeholder="Type patient name, MRN, or NRIC..."
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
                className={`w-full text-left px-3 py-2 text-sm hover:bg-surface-100 transition-colors border-b border-surface-100 last:border-0 ${value === p.id ? 'bg-navy-50' : ''}`}
              >
                <span className="font-medium text-surface-800">{p.name}</span>
                <span className="text-xs text-surface-500 ml-2">({p.mrn})</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
