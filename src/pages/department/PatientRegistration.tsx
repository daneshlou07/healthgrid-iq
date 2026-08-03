import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ux/Toast';
import type { Gender } from '../../types';
import { Info, CheckCircle, AlertCircle, Sparkles, Loader2, UserX } from 'lucide-react';

import { parseMalaysianNric, normalizeNric, formatNric } from '../../utils/malaysianNric';
import { PredictiveAddressInput } from '../../components/ui/PredictiveAddressInput';

type IdType = 'mykad' | 'passport';

/**
 * Generate a collision-resistant MRN using crypto.randomUUID (when available)
 * or a high-entropy fallback. Format: MRN-YYYY-XXXXXXXX
 */
function generateMrn(): string {
  const year = new Date().getFullYear();
  let suffix: string;
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    // Take the first 8 hex chars of a UUID (32 bits of randomness)
    suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
  } else {
    // Fallback: timestamp + random, zero-padded to 8 chars
    suffix = (Date.now() % 100000000).toString().padStart(8, '0');
  }
  return `MRN-${year}-${suffix}`;
}

// --- Component ---

export default function PatientRegistration() {
  const { currentUser } = useAuth();
  const { clinics, patients, addPatient } = useData();
  const toast = useToast();
  const [idType, setIdType] = useState<IdType>('mykad');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    idNumber: '',
    dob: '',
    gender: 'Male' as Gender,
    phone: '',
    email: '',
    address: '',
    medicalHistory: '',
    emergencyContact: '',
    preferredClinicId: '',
    ethnicity: '',
  });

  const ETHNICITY_OPTIONS = ['Malay', 'Chinese', 'Indian', 'Bumiputera (Sabah)', 'Bumiputera (Sarawak)', 'Others'];

  // Parse NRIC on every change
  const nricResult = useMemo(() => {
    if (idType !== 'mykad') return null;
    const normalized = normalizeNric(form.idNumber);
    if (normalized.length === 0) return null;
    if (normalized.length < 12) {
      return { valid: false, normalized, formatted: form.idNumber, dob: '', gender: 'Male' as Gender, stateOfBirth: 'Unknown', stateCode: '', age: 0, error: `${12 - normalized.length} digits remaining` };
    }
    return parseMalaysianNric(form.idNumber);
  }, [form.idNumber, idType]);

  // Auto-fill DOB and Gender when NRIC is valid
  useEffect(() => {
    if (nricResult?.valid) {
      setForm((prev) => ({ ...prev, dob: nricResult.dob, gender: nricResult.gender }));
    }
  }, [nricResult?.valid, nricResult?.dob, nricResult?.gender]);

  const isNricLocked = idType === 'mykad' && nricResult?.valid === true;

  // Keep a stable ref to the latest patients list — always current regardless of render cycle
  const patientsRef = useRef(patients);
  useEffect(() => { patientsRef.current = patients; }, [patients]);

  // Duplicate NRIC — drive entirely from form.idNumber string (not nricResult object).
  // This effect only clears/sets when the NRIC digits themselves change.
  // It never re-runs due to patients list updates (avoiding the flicker).
  const [duplicatePatient, setDuplicatePatient] = useState<typeof patients[0] | null>(null);
  useEffect(() => {
    const rawNric = normalizeNric(form.idNumber);
    if (idType !== 'mykad' || rawNric.length < 12) {
      setDuplicatePatient(null);
      return;
    }
    // Use patientsRef.current — always the latest list even if patients hasn't re-rendered yet
    const found = patientsRef.current.find((p) => p.nric && normalizeNric(p.nric) === rawNric) || null;
    setDuplicatePatient(found);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.idNumber, idType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || submitting) return;

    // Block if duplicate already detected by the effect
    if (duplicatePatient) {
      toast.error(`NRIC already registered to ${duplicatePatient.name} (${duplicatePatient.mrn}). Use the Patient Registry to update their record.`);
      return;
    }

    // Final safety check at submit time using the ref (always current)
    if (idType === 'mykad' && nricResult?.valid) {
      const nricToCheck = normalizeNric(form.idNumber);
      const existingPatient = patientsRef.current.find((p) => p.nric && normalizeNric(p.nric) === nricToCheck);
      if (existingPatient) {
        toast.error(`NRIC already registered to ${existingPatient.name} (${existingPatient.mrn}). Use the Patient Registry to update their record.`);
        return;
      }
    }

    // Phone validation
    const cleanPhone = form.phone.replace(/[\s-]/g, '');
    if (!/^\+?\d{8,15}$/.test(cleanPhone)) {
      toast.error('Please enter a valid phone number (digits only, e.g. 012-3456789).');
      return;
    }

    // Address validation
    const trimmedAddr = form.address.trim();
    if (trimmedAddr.length < 6 || /^(test|abc|123|asdf)$/i.test(trimmedAddr)) {
      toast.error('Please enter a valid residential address in Malaysia for AI Scheduler routing.');
      return;
    }

    const mrnGenerated = generateMrn();
    const preferredClinic = clinics.find((c) => c.id === form.preferredClinicId);
    const rawNricDigits = normalizeNric(form.idNumber);
    const nricValue = idType === 'mykad'
      ? (rawNricDigits.length === 12 ? formatNric(rawNricDigits) : form.idNumber.trim())
      : form.idNumber.trim();

    setSubmitting(true);
    try {
      const patientData: Omit<Parameters<typeof addPatient>[0], never> = {
        name: form.name,
        dob: form.dob,
        gender: form.gender,
        phone: form.phone,
        email: form.email,
        address: form.address,
        nric: nricValue,
        mrn: mrnGenerated,
        medicalHistory: form.medicalHistory.split(',').map((s) => s.trim()).filter(Boolean),
      };
      if (form.ethnicity) patientData.ethnicity = form.ethnicity;
      if (form.emergencyContact) patientData.emergencyContact = form.emergencyContact;
      if (form.preferredClinicId) {
        patientData.preferredClinicId = form.preferredClinicId;
        if (preferredClinic?.name) patientData.preferredClinicName = preferredClinic.name;
      }
      await addPatient(patientData);

      toast.success(`${form.name} registered successfully — MRN: ${mrnGenerated}`);
      setForm({ name: '', idNumber: '', dob: '', gender: 'Male', phone: '', email: '', address: '', medicalHistory: '', emergencyContact: '', preferredClinicId: '', ethnicity: '' });
    } catch (err: any) {
      console.error('Patient registration error:', err);
      toast.error(err?.message || 'Failed to register patient. Please check NRIC and required fields.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="page-title">Register New Patient</h1>
        <p className="page-subtitle">Collect patient demographics and contact information. The healthcare centre will be assigned during scheduling.</p>
      </div>

      {/* Workflow info */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-blue-700 space-y-1">
          <p className="font-medium">Registration Workflow</p>
          <p>1. Register patient here &rarr; 2. Create imaging referral &rarr; 3. AI Scheduler recommends optimal healthcare centre &rarr; 4. Administrator confirms appointment</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-6 bg-white border border-slate-200 border-t-4 border-t-purple-600 shadow-md rounded-xl p-6">
        {/* Section: Identity */}
        <div>
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Patient Identity &amp; Demographics</h3>
            <span className="text-xs text-purple-700 bg-purple-50 font-bold px-2.5 py-1 rounded-full border border-purple-200">
              Step 1 of 2
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-800">Full Name</label>
                <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded">* Required</span>
              </div>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={`input-field transition-all ${form.name ? 'border-l-4 border-l-emerald-500 bg-emerald-50/20' : 'focus:ring-2 focus:ring-purple-500/30'}`}
                placeholder="Patient full name as in MyKad / Passport"
              />
            </div>

            {/* ID Type Selector */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-800">Identification Type</label>
                <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded">* Required</span>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setIdType('mykad'); setForm((f) => ({ ...f, idNumber: '', dob: '', gender: 'Male' })); }}
                  className={`flex-1 py-2.5 px-4 rounded-xl border text-xs font-bold transition-all ${
                    idType === 'mykad'
                      ? 'bg-purple-900 text-white border-purple-900 shadow-md ring-2 ring-purple-200'
                      : 'bg-white border-slate-300 text-slate-700 hover:border-purple-300 hover:bg-slate-50'
                  }`}
                >
                  Malaysian MyKad (NRIC)
                </button>
                <button
                  type="button"
                  onClick={() => { setIdType('passport'); setForm((f) => ({ ...f, idNumber: '', dob: '', gender: 'Male' })); }}
                  className={`flex-1 py-2.5 px-4 rounded-xl border text-xs font-bold transition-all ${
                    idType === 'passport'
                      ? 'bg-purple-900 text-white border-purple-900 shadow-md ring-2 ring-purple-200'
                      : 'bg-white border-slate-300 text-slate-700 hover:border-purple-300 hover:bg-slate-50'
                  }`}
                >
                  Passport
                </button>
              </div>
            </div>

            {/* NRIC / Passport input */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-800">
                  {idType === 'mykad' ? 'NRIC Number' : 'Passport Number'}
                </label>
                <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded">* Required</span>
              </div>
              <input
                required
                value={form.idNumber}
                onChange={(e) => {
                  const val = idType === 'mykad'
                    ? e.target.value.replace(/[^\d]/g, '')
                    : e.target.value;
                  setForm({ ...form, idNumber: val });
                }}
                className={`input-field font-mono
                  ${nricResult && !nricResult.valid && normalizeNric(form.idNumber).length >= 12 ? 'border-red-400 focus:ring-red-200' : ''}
                  ${nricResult?.valid && !duplicatePatient ? 'border-l-4 border-l-emerald-500 bg-emerald-50/20' : ''}
                  ${duplicatePatient ? 'border-red-400 bg-red-50/30 focus:ring-red-200' : ''}
                `}
                placeholder={idType === 'mykad' ? 'e.g., 850312015678 (digits only)' : 'e.g., A12345678'}
                maxLength={idType === 'mykad' ? 12 : 20}
                inputMode={idType === 'mykad' ? 'numeric' : 'text'}
              />

              {/* Duplicate NRIC warning — highest priority feedback */}
              {duplicatePatient && (
                <div className="mt-1.5 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-2.5">
                  <UserX className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold text-red-700">NRIC already registered</p>
                    <p className="text-red-600">
                      {duplicatePatient.name} &middot; <span className="font-mono">{duplicatePatient.mrn}</span>
                      {duplicatePatient.dob && ` &middot; DOB: ${duplicatePatient.dob}`}
                    </p>
                    <p className="text-red-500 text-[10px] mt-0.5">Use the Patient Registry to update this patient's record instead.</p>
                  </div>
                </div>
              )}

              {/* NRIC validation feedback — only shown when no duplicate */}
              {idType === 'mykad' && nricResult && !duplicatePatient && (
                <div className="mt-1.5">
                  {nricResult.valid ? (
                    <div className="flex flex-wrap items-center gap-1.5 text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-xs font-bold">{nricResult.formatted}</span>
                      <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded font-medium">
                        Negeri Kelahiran: {nricResult.stateOfBirth} ({nricResult.stateCode})
                      </span>
                      <span className="text-[10px] text-emerald-600">Age: {nricResult.age} yrs</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-red-600">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span className="text-xs font-semibold">{nricResult.error}</span>
                    </div>
                  )}
                </div>
              )}
              {idType === 'mykad' && (
                <p className="text-[10px] text-slate-400 mt-1">Enter 12 digits (e.g. 850312015678). DOB and Gender will be extracted automatically.</p>
              )}
            </div>

            {/* Date of Birth */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-800">
                  Date of Birth
                  {isNricLocked && <span className="text-emerald-700 text-[10px] ml-1.5 font-bold">Auto-extracted</span>}
                </label>
                <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded">* Required</span>
              </div>
              <input
                required
                type="date"
                value={form.dob}
                onChange={(e) => setForm({ ...form, dob: e.target.value })}
                disabled={isNricLocked}
                className={`input-field ${isNricLocked ? 'bg-emerald-50 border-emerald-300 text-slate-800 font-medium cursor-not-allowed' : form.dob ? 'border-l-4 border-l-emerald-500 bg-emerald-50/20' : ''}`}
              />
            </div>

            {/* Gender */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-800">
                  Gender
                  {isNricLocked && <span className="text-emerald-700 text-[10px] ml-1.5 font-bold">Auto-extracted</span>}
                </label>
                <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded">* Required</span>
              </div>
              <select
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value as Gender })}
                disabled={isNricLocked}
                className={`select-field ${isNricLocked ? 'bg-emerald-50 border-emerald-300 text-slate-800 font-medium cursor-not-allowed' : ''}`}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* MRN */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-800 mb-1">
                MRN <span className="text-slate-400 font-normal text-[10px]">(System Auto-Generated)</span>
              </label>
              <input disabled value="Auto-generated on submission" className="input-field bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200" />
              <p className="text-[10px] text-slate-400 mt-1">Medical Record Number is generated automatically.</p>
            </div>
          </div>
        </div>

        {/* Section: Contact */}
        <div>
          <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">Contact Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Phone *</label>
              <input
                required
                type="tel"
                value={form.phone}
                onChange={(e) => {
                  const numericOnly = e.target.value.replace(/[^\d+\s-]/g, '');
                  setForm({ ...form, phone: numericOnly });
                }}
                className="input-field font-mono"
                placeholder="+60 12-345-6789"
              />
              <p className="text-[10px] text-slate-400 mt-1">Digits only (e.g. +60 12-345-6789)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Ethnicity</label>
              <select
                value={form.ethnicity}
                onChange={(e) => setForm({ ...form, ethnicity: e.target.value })}
                className="select-field"
              >
                <option value="">— Select Ethnicity —</option>
                {ETHNICITY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" placeholder="patient@email.com" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-surface-700 mb-1">Address *</label>
              <PredictiveAddressInput
                required
                value={form.address}
                onChange={(addressValue) => setForm({ ...form, address: addressValue })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-surface-700 mb-1">Emergency Contact <span className="text-surface-400 font-normal">(optional)</span></label>
              <input value={form.emergencyContact} onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })} className="input-field" placeholder="Name — Relationship — Phone" />
            </div>
          </div>
        </div>

        {/* Section: Medical */}
        <div>
          <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">Medical Information</h3>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Medical History <span className="text-surface-400 font-normal">(comma-separated)</span></label>
            <textarea rows={2} value={form.medicalHistory} onChange={(e) => setForm({ ...form, medicalHistory: e.target.value })} className="input-field resize-none" placeholder="e.g., Hypertension, Type 2 Diabetes, Previous knee surgery" />
          </div>
        </div>

        {/* Section: Preference */}
        <div>
          <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">Preference</h3>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Preferred Healthcare Centre <span className="text-surface-400 font-normal">(optional)</span></label>
            <select value={form.preferredClinicId} onChange={(e) => setForm({ ...form, preferredClinicId: e.target.value })} className="select-field">
              <option value="">No preference — AI Scheduler will determine</option>
              {clinics.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <p className="text-[10px] text-surface-400 mt-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-purple-600 inline shrink-0" />
              <span>Select a specific centre to assign your designated facility, or select "No preference" to allow the AI Scheduler to determine the optimal facility.</span>
            </p>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between pt-3 border-t border-surface-200">
          <p className="text-[10px] text-surface-400">Patient will be added to the Patient Registry. No clinic is assigned until scheduling.</p>
          <button
            type="submit"
            disabled={submitting || !!duplicatePatient}
            className="btn-primary flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Registering…
              </>
            ) : (
              'Register Patient'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
