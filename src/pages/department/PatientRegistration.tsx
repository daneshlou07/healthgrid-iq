import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ux/Toast';
import type { Gender } from '../../types';
import { Info, CheckCircle, AlertCircle } from 'lucide-react';

// --- MyKad NRIC Utilities ---

type IdType = 'mykad' | 'passport';

interface NricParseResult {
  valid: boolean;
  normalized: string;
  formatted: string;
  dob: string; // YYYY-MM-DD
  gender: Gender;
  error?: string;
}

function normalizeNric(raw: string): string {
  return raw.replace(/[-\s]/g, '');
}

function formatNric(normalized: string): string {
  if (normalized.length !== 12) return normalized;
  return `${normalized.slice(0, 6)}-${normalized.slice(6, 8)}-${normalized.slice(8)}`;
}

function parseMyKad(raw: string): NricParseResult {
  const normalized = normalizeNric(raw);

  // Must be exactly 12 digits
  if (!/^\d{12}$/.test(normalized)) {
    return { valid: false, normalized, formatted: raw, dob: '', gender: 'Male', error: 'NRIC must be exactly 12 digits' };
  }

  // Extract date components
  const yyStr = normalized.slice(0, 2);
  const mmStr = normalized.slice(2, 4);
  const ddStr = normalized.slice(4, 6);

  const yy = parseInt(yyStr, 10);
  const mm = parseInt(mmStr, 10);
  const dd = parseInt(ddStr, 10);

  // Determine century: if yy > current 2-digit year, assume 1900s; else 2000s
  const currentYear = new Date().getFullYear();
  const currentYY = currentYear % 100;
  const century = yy > currentYY ? 1900 : 2000;
  const fullYear = century + yy;

  // Validate month
  if (mm < 1 || mm > 12) {
    return { valid: false, normalized, formatted: formatNric(normalized), dob: '', gender: 'Male', error: 'Invalid month in NRIC' };
  }

  // Validate day
  const daysInMonth = new Date(fullYear, mm, 0).getDate();
  if (dd < 1 || dd > daysInMonth) {
    return { valid: false, normalized, formatted: formatNric(normalized), dob: '', gender: 'Male', error: 'Invalid day in NRIC' };
  }

  // Validate date is not in the future
  const dobDate = new Date(fullYear, mm - 1, dd);
  if (dobDate > new Date()) {
    return { valid: false, normalized, formatted: formatNric(normalized), dob: '', gender: 'Male', error: 'Date of birth cannot be in the future' };
  }

  const dob = `${fullYear}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;

  // Gender: last digit odd = Male, even = Female
  const lastDigit = parseInt(normalized.charAt(11), 10);
  const gender: Gender = lastDigit % 2 === 0 ? 'Female' : 'Male';

  return { valid: true, normalized, formatted: formatNric(normalized), dob, gender };
}

// --- Component ---

export default function PatientRegistration() {
  const { currentUser } = useAuth();
  const { clinics, addPatient, addAuditLog } = useData();
  const toast = useToast();
  const [idType, setIdType] = useState<IdType>('mykad');
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

  const ETHNICITY_OPTIONS = ['Melayu', 'Cina', 'India', 'Bumiputera Sabah', 'Bumiputera Sarawak', 'Lain-lain'];

  // Parse NRIC on every change
  const nricResult = useMemo<NricParseResult | null>(() => {
    if (idType !== 'mykad') return null;
    const normalized = normalizeNric(form.idNumber);
    if (normalized.length === 0) return null;
    if (normalized.length < 12) return { valid: false, normalized, formatted: form.idNumber, dob: '', gender: 'Male', error: `${12 - normalized.length} digits remaining` };
    return parseMyKad(form.idNumber);
  }, [form.idNumber, idType]);

  // Auto-fill DOB and Gender when NRIC is valid
  useEffect(() => {
    if (nricResult?.valid) {
      setForm((prev) => ({ ...prev, dob: nricResult.dob, gender: nricResult.gender }));
    }
  }, [nricResult?.valid, nricResult?.dob, nricResult?.gender]);

  const isNricLocked = idType === 'mykad' && nricResult?.valid === true;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    // Final validation
    if (idType === 'mykad' && !nricResult?.valid) {
      toast.error('Please enter a valid 12-digit Malaysian NRIC.');
      return;
    }

    const mrnGenerated = `MRN-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    const preferredClinic = clinics.find((c) => c.id === form.preferredClinicId);
    const nricValue = idType === 'mykad' ? (nricResult?.formatted || form.idNumber) : form.idNumber;

    try {
      await addPatient({
        name: form.name,
        dob: form.dob,
        gender: form.gender,
        phone: form.phone,
        email: form.email,
        address: form.address,
        nric: nricValue,
        mrn: mrnGenerated,
        ethnicity: form.ethnicity || undefined,
        medicalHistory: form.medicalHistory.split(',').map((s) => s.trim()).filter(Boolean),
        emergencyContact: form.emergencyContact || undefined,
        preferredClinicId: form.preferredClinicId || undefined,
        preferredClinicName: preferredClinic?.name || undefined,
      });

      await addAuditLog({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'PATIENT_REGISTER',
        target: `patients/${mrnGenerated}`,
        details: `Registered new patient: ${form.name} (${mrnGenerated})`,
        timestamp: new Date().toISOString(),
      });

      toast.success(`${form.name} registered successfully — MRN: ${mrnGenerated}`);
      setForm({ name: '', idNumber: '', dob: '', gender: 'Male', phone: '', email: '', address: '', medicalHistory: '', emergencyContact: '', preferredClinicId: '', ethnicity: '' });
    } catch (err: any) {
      console.error('Patient registration error:', err);
      toast.error(err?.message || 'Failed to register patient. Please check NRIC and required fields.');
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

      <form onSubmit={handleSubmit} className="card space-y-5">
        {/* Section: Identity */}
        <div>
          <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">Patient Identity</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-surface-700 mb-1">Full Name *</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" placeholder="Patient full name" />
            </div>

            {/* ID Type Selector */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-surface-700 mb-1.5">Identification Type *</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setIdType('mykad'); setForm((f) => ({ ...f, dob: '', gender: 'Male' })); }}
                  className={`flex-1 py-2.5 px-4 rounded-lg border text-sm font-medium transition-all ${
                    idType === 'mykad'
                      ? 'bg-navy-50 border-navy-300 text-navy-700'
                      : 'bg-white border-surface-300 text-surface-600 hover:border-surface-400'
                  }`}
                >
                  Malaysian MyKad (NRIC)
                </button>
                <button
                  type="button"
                  onClick={() => { setIdType('passport'); setForm((f) => ({ ...f, dob: '', gender: 'Male' })); }}
                  className={`flex-1 py-2.5 px-4 rounded-lg border text-sm font-medium transition-all ${
                    idType === 'passport'
                      ? 'bg-navy-50 border-navy-300 text-navy-700'
                      : 'bg-white border-surface-300 text-surface-600 hover:border-surface-400'
                  }`}
                >
                  Passport
                </button>
              </div>
            </div>

            {/* NRIC / Passport input */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-surface-700 mb-1">
                {idType === 'mykad' ? 'NRIC Number *' : 'Passport Number *'}
              </label>
              <input
                required
                value={form.idNumber}
                onChange={(e) => setForm({ ...form, idNumber: e.target.value })}
                className={`input-field ${nricResult && !nricResult.valid && normalizeNric(form.idNumber).length >= 12 ? 'border-red-300 focus:ring-red-200' : ''} ${nricResult?.valid ? 'border-emerald-300 focus:ring-emerald-200' : ''}`}
                placeholder={idType === 'mykad' ? 'e.g., 850312-01-5678 or 850312015678' : 'e.g., A12345678'}
                maxLength={idType === 'mykad' ? 14 : 20}
              />
              {/* NRIC validation feedback */}
              {idType === 'mykad' && nricResult && (
                <div className="mt-1.5">
                  {nricResult.valid ? (
                    <div className="flex items-center gap-1.5 text-emerald-600">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium">Valid — {nricResult.formatted}</span>
                      <span className="text-[10px] text-surface-500 ml-2">DOB and Gender auto-extracted</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-red-500">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span className="text-xs">{nricResult.error}</span>
                    </div>
                  )}
                </div>
              )}
              {idType === 'mykad' && (
                <p className="text-[10px] text-surface-400 mt-1">Accepts format: YYMMDD-PB-####G or YYMMDDPB####G. DOB and Gender will be extracted automatically.</p>
              )}
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">
                Date of Birth *
                {isNricLocked && <span className="text-emerald-600 text-[10px] ml-1.5 font-normal">Auto-extracted</span>}
              </label>
              <input
                required
                type="date"
                value={form.dob}
                onChange={(e) => setForm({ ...form, dob: e.target.value })}
                disabled={isNricLocked}
                className={`input-field ${isNricLocked ? 'bg-emerald-50 border-emerald-200 text-surface-700 cursor-not-allowed' : ''}`}
              />
            </div>

            {/* Gender */}
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">
                Gender *
                {isNricLocked && <span className="text-emerald-600 text-[10px] ml-1.5 font-normal">Auto-extracted</span>}
              </label>
              <select
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value as Gender })}
                disabled={isNricLocked}
                className={`select-field ${isNricLocked ? 'bg-emerald-50 border-emerald-200 text-surface-700 cursor-not-allowed' : ''}`}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* MRN */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-surface-700 mb-1">MRN</label>
              <input disabled value="Auto-generated on submission" className="input-field bg-surface-100 text-surface-500 cursor-not-allowed" />
              <p className="text-[10px] text-surface-400 mt-1">Medical Record Number is generated automatically.</p>
            </div>
          </div>
        </div>

        {/* Section: Contact */}
        <div>
          <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">Contact Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Phone *</label>
              <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field" placeholder="+60 12-345-6789" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Etnik (Ethnicity)</label>
              <select
                value={form.ethnicity}
                onChange={(e) => setForm({ ...form, ethnicity: e.target.value })}
                className="select-field"
              >
                <option value="">— Pilih Etnik / Select Ethnicity —</option>
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
              <input required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input-field" placeholder="Full residential address (used for scheduling proximity)" />
              <p className="text-[10px] text-surface-400 mt-1">The AI Scheduler uses this address to recommend the nearest healthcare centre.</p>
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
            <p className="text-[10px] text-surface-400 mt-1">The AI Scheduler will still determine the optimal centre based on availability, equipment, and proximity. This preference is advisory only.</p>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between pt-3 border-t border-surface-200">
          <p className="text-[10px] text-surface-400">Patient will be added to the Patient Registry. No clinic is assigned until scheduling.</p>
          <button type="submit" className="btn-primary">Register Patient</button>
        </div>
      </form>
    </div>
  );
}
