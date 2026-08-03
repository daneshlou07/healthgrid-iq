import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ux/Toast';
import { useLanguage } from '../../context/LanguageContext';
import type { Gender, MohYaTidak } from '../../types';
import { Info, CheckCircle, AlertCircle, Sparkles, Loader2, UserX, CreditCard, ShieldCheck } from 'lucide-react';

import { parseMalaysianNric, normalizeNric, formatNric } from '../../utils/malaysianNric';
import { PredictiveAddressInput } from '../../components/ui/PredictiveAddressInput';
import { geocodeAddress } from '../../services/routingService';
import { calculateMohPaymentCategory, formatPaymentCategoryBadge } from '../../utils/paymentCategory';

type IdType = 'mykad' | 'passport';

function generateMrn(): string {
  const year = new Date().getFullYear();
  let suffix: string;
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
  } else {
    suffix = (Date.now() % 100000000).toString().padStart(8, '0');
  }
  return `MRN-${year}-${suffix}`;
}

export default function PatientRegistration() {
  const { currentUser } = useAuth();
  const { clinics, patients, addPatient } = useData();
  const { language, t } = useLanguage();
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
    isWarganegara: 'Yes' as MohYaTidak,
    isPenjawatAwam: 'No' as MohYaTidak,
    isFpp: 'No' as MohYaTidak,
    hasAsthma: 'No' as MohYaTidak,
    previousContrastReaction: 'No' as MohYaTidak,
    previousContrastDetails: '',
  });

  const ETHNICITY_OPTIONS = ['Malay', 'Chinese', 'Indian', 'Bumiputera (Sabah)', 'Bumiputera (Sarawak)', 'Others'];

  const computedPaymentCategory = useMemo(() => {
    return calculateMohPaymentCategory(form.isWarganegara, form.isPenjawatAwam, form.isFpp);
  }, [form.isWarganegara, form.isPenjawatAwam, form.isFpp]);

  const paymentBadge = useMemo(() => {
    return formatPaymentCategoryBadge(computedPaymentCategory, language);
  }, [computedPaymentCategory, language]);

  const nricResult = useMemo(() => {
    if (idType !== 'mykad') return null;
    const normalized = normalizeNric(form.idNumber);
    if (normalized.length === 0) return null;
    if (normalized.length < 12) {
      return { valid: false, normalized, formatted: form.idNumber, dob: '', gender: 'Male' as Gender, stateOfBirth: 'Unknown', stateCode: '', age: 0, error: `${12 - normalized.length} digits remaining` };
    }
    return parseMalaysianNric(form.idNumber);
  }, [form.idNumber, idType]);

  useEffect(() => {
    if (nricResult?.valid) {
      setForm((prev) => ({ ...prev, dob: nricResult.dob, gender: nricResult.gender }));
    }
  }, [nricResult?.valid, nricResult?.dob, nricResult?.gender]);

  const isNricLocked = idType === 'mykad' && nricResult?.valid === true;

  const patientsRef = useRef(patients);
  useEffect(() => { patientsRef.current = patients; }, [patients]);

  const [duplicatePatient, setDuplicatePatient] = useState<typeof patients[0] | null>(null);
  useEffect(() => {
    const rawNric = normalizeNric(form.idNumber);
    if (idType !== 'mykad' || rawNric.length < 12) {
      setDuplicatePatient(null);
      return;
    }
    const found = patientsRef.current.find((p) => p.nric && normalizeNric(p.nric) === rawNric) || null;
    setDuplicatePatient(found);
  }, [form.idNumber, idType]);

  const [patientGeo, setPatientGeo] = useState<{ lat?: number; lon?: number }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || submitting) return;

    if (duplicatePatient) {
      toast.error(`NRIC already registered to ${duplicatePatient.name} (${duplicatePatient.mrn}). Use the Patient Registry to update their record.`);
      return;
    }

    const cleanPhone = form.phone.replace(/[\s-]/g, '');
    if (!/^\+?\d{8,15}$/.test(cleanPhone)) {
      toast.error('Please enter a valid phone number.');
      return;
    }

    const trimmedAddr = form.address.trim();
    if (trimmedAddr.length < 6) {
      toast.error('Please enter a valid residential address.');
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
      // Resolve lat/lon for custom typed address if not selected from suggestions
      let resolvedLat = patientGeo.lat;
      let resolvedLon = patientGeo.lon;
      if (!resolvedLat || !resolvedLon) {
        const geo = await geocodeAddress(trimmedAddr);
        if (geo) {
          resolvedLat = geo.lat;
          resolvedLon = geo.lon;
        }
      }

      const patientData: Omit<Parameters<typeof addPatient>[0], never> = {
        name: form.name,
        dob: form.dob,
        gender: form.gender,
        phone: form.phone,
        email: form.email,
        address: form.address,
        latitude: resolvedLat,
        longitude: resolvedLon,
        nric: nricValue,
        mrn: mrnGenerated,
        medicalHistory: form.medicalHistory.split(',').map((s) => s.trim()).filter(Boolean),
        isWarganegara: form.isWarganegara,
        isPenjawatAwam: form.isPenjawatAwam,
        isFpp: form.isFpp,
        paymentCategory: computedPaymentCategory,
        hasAsthma: form.hasAsthma,
        previousContrastReaction: form.previousContrastReaction,
        previousContrastDetails: form.previousContrastDetails,
      };
      if (form.ethnicity) patientData.ethnicity = form.ethnicity;
      if (form.emergencyContact) patientData.emergencyContact = form.emergencyContact;
      if (form.preferredClinicId) {
        patientData.preferredClinicId = form.preferredClinicId;
        if (preferredClinic?.name) patientData.preferredClinicName = preferredClinic.name;
      }
      await addPatient(patientData);

      toast.success(`${form.name} registered successfully — MRN: ${mrnGenerated}`);
      setForm({
        name: '', idNumber: '', dob: '', gender: 'Male', phone: '', email: '', address: '',
        medicalHistory: '', emergencyContact: '', preferredClinicId: '', ethnicity: '',
        isWarganegara: 'Yes', isPenjawatAwam: 'No', isFpp: 'No', hasAsthma: 'No', previousContrastReaction: 'No', previousContrastDetails: ''
      });
      setPatientGeo({});
    } catch (err: any) {
      toast.error(err?.message || 'Failed to register patient.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900 tracking-tight">
          {t('Register New Patient', 'Daftar Pesakit Baharu')}
        </h1>
        <p className="text-xs text-surface-500 mt-1">
          {t('Create a new patient record in the master registry with billing classification and clinical profile.', 'Cipta rekod pesakit baharu dalam daftar induk dengan klasifikasi bayaran dan profil klinikal.')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-surface-200 rounded-xl p-6 shadow-sm space-y-6">
        <div>
          <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">
            {t('Patient Identity & Demographics', 'Identiti & Demografi Pesakit')}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-surface-700 mb-1">
                {t('Full Name *', 'Nama Penuh *')}
              </label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field uppercase font-semibold" placeholder="e.g., SITI AMINAH BINTI HASSAN" />
            </div>

            <div className="md:col-span-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700">{t('Identification Document Type *', 'Jenis Dokumen Pengenalan *')}</span>
                <div className="flex bg-white rounded-md border border-slate-200 p-0.5 text-xs font-semibold">
                  <button type="button" onClick={() => setIdType('mykad')} className={`px-3 py-1 rounded transition-colors ${idType === 'mykad' ? 'bg-navy-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>MyKad (Malaysian IC)</button>
                  <button type="button" onClick={() => setIdType('passport')} className={`px-3 py-1 rounded transition-colors ${idType === 'passport' ? 'bg-navy-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>Passport (Foreign National)</button>
                </div>
              </div>

              <label className="block text-xs font-bold text-slate-800 mb-1">{idType === 'mykad' ? 'MyKad Number (12 Digits)' : 'Passport Number'} *</label>
              <input
                required
                type="text"
                value={form.idNumber}
                onChange={(e) => {
                  const val = idType === 'mykad' ? e.target.value.replace(/[^\d]/g, '') : e.target.value;
                  setForm({ ...form, idNumber: val });
                }}
                className={`input-field font-mono ${duplicatePatient ? 'border-red-400 bg-red-50' : ''}`}
                placeholder={idType === 'mykad' ? 'e.g., 850312015678 (digits only)' : 'e.g., A12345678'}
                maxLength={idType === 'mykad' ? 12 : 20}
              />

              {duplicatePatient && (
                <div className="mt-1.5 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-2.5">
                  <UserX className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold text-red-700">NRIC already registered</p>
                    <p className="text-red-600">{duplicatePatient.name} &middot; <span className="font-mono">{duplicatePatient.mrn}</span></p>
                  </div>
                </div>
              )}

              {idType === 'mykad' && nricResult && !duplicatePatient && (
                <div className="mt-1.5">
                  {nricResult.valid ? (
                    <div className="flex flex-wrap items-center gap-1.5 text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-xs font-bold">{nricResult.formatted}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-red-600">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span className="text-xs font-semibold">{nricResult.error}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">{t('Date of Birth *', 'Tarikh Lahir *')}</label>
              <input required type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} className="input-field text-xs" readOnly={isNricLocked} />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">{t('Gender *', 'Jantina *')}</label>
              <select required value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value as Gender })} className="select-field text-xs" disabled={isNricLocked}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">{t('Phone Number *', 'Nombor Telefon *')}</label>
              <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field font-mono text-xs" placeholder="e.g., +60 12-345 6789" />
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">{t('Ethnicity', 'Etnik / Bangsa')}</label>
              <select value={form.ethnicity} onChange={(e) => setForm({ ...form, ethnicity: e.target.value })} className="select-field text-xs">
                <option value="">-- Select Ethnicity --</option>
                {ETHNICITY_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field text-xs" placeholder="patient@email.com" />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-surface-700 mb-1">{t('Residential Address *', 'Alamat Kediaman *')}</label>
              <PredictiveAddressInput
                required
                value={form.address}
                onChange={(addressValue, details) => {
                  setForm({ ...form, address: addressValue });
                  if (details) setPatientGeo(details);
                }}
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-surface-700 mb-1">{t('Emergency Contact', 'Hubungi Kecemasan')}</label>
              <input value={form.emergencyContact} onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })} className="input-field text-xs" placeholder="Name — Relationship — Phone" />
            </div>
          </div>
        </div>

        {/* Section: Master Payment & Billing Profile */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-navy-700" />
              <h3 className="text-xs font-bold text-navy-900 uppercase tracking-wider">
                {t('Master Payment & Billing Profile (Field 16)', 'Profil Bayaran & Status Induk (Ruangan 16)')}
              </h3>
            </div>
            <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${paymentBadge.color}`}>
              {paymentBadge.label}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t('Citizenship Status', 'Status Kewarganegaraan')}</label>
              <select value={form.isWarganegara} onChange={(e) => setForm({ ...form, isWarganegara: e.target.value as MohYaTidak })} className="select-field text-xs font-semibold">
                <option value="Yes">{t('Malaysian Citizen', 'Warganegara Malaysia')}</option>
                <option value="No">{t('Non-Citizen / Foreign National', 'Bukan Warganegara')}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t('Civil Servant Status', 'Status Penjawat Awam')}</label>
              <select value={form.isPenjawatAwam} onChange={(e) => setForm({ ...form, isPenjawatAwam: e.target.value as MohYaTidak })} className="select-field text-xs font-semibold" disabled={form.isWarganegara === 'No'}>
                <option value="No">{t('No', 'Tidak')}</option>
                <option value="Yes">{t('Yes (Civil Servant / Pensioner)', 'Ya (Penjawat Awam / Pesara)')}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t('Full Paying Patient (FPP)', 'Skim Pesakit Bayar Penuh')}</label>
              <select value={form.isFpp} onChange={(e) => setForm({ ...form, isFpp: e.target.value as MohYaTidak })} className="select-field text-xs font-semibold" disabled={form.isWarganegara === 'No'}>
                <option value="No">{t('No', 'Tidak')}</option>
                <option value="Yes">{t('Yes (FPP Scheme)', 'Ya (Skim FPP)')}</option>
              </select>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0 inline" />
            <span>{t('MOH Payment Category is auto-calculated and inherits into all radiology case referrals.', 'Kategori bayaran KKM dikira secara otomatik dan diwarisi ke semua rujukan kes radiologi.')}</span>
          </p>
        </div>

        {/* Section: Baseline Clinical Screening */}
        <div>
          <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">
            {t('Baseline Clinical & Allergy Profile', 'Profil Klinikal & Alergi Induk')}
          </h3>
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('Asthma History (Field 14)', 'Sejarah Asma (Ruangan 14)')}</label>
                <select value={form.hasAsthma} onChange={(e) => setForm({ ...form, hasAsthma: e.target.value as MohYaTidak })} className="select-field text-xs">
                  <option value="No">{t('No', 'Tidak')}</option>
                  <option value="Yes">{t('Yes', 'Ya')}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('Previous Contrast Media Reaction', 'Reaksi Kontras Dahulu')}</label>
                <select value={form.previousContrastReaction} onChange={(e) => setForm({ ...form, previousContrastReaction: e.target.value as MohYaTidak })} className="select-field text-xs">
                  <option value="No">{t('No', 'Tidak')}</option>
                  <option value="Yes">{t('Yes (Prior Contrast Reaction)', 'Ya (Pernah Reaksi Kontras)')}</option>
                </select>
              </div>
            </div>

            {form.previousContrastReaction === 'Yes' && (
              <div>
                <label className="block text-xs font-bold text-amber-800 mb-1">Contrast Reaction Details</label>
                <input value={form.previousContrastDetails} onChange={(e) => setForm({ ...form, previousContrastDetails: e.target.value })} className="input-field text-xs border-amber-300 bg-amber-50/40" placeholder="e.g. Mild urticaria or nausea during prior CT contrast scan" />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">{t('General Medical History', 'Sejarah Perubatan Am')}</label>
              <textarea rows={2} value={form.medicalHistory} onChange={(e) => setForm({ ...form, medicalHistory: e.target.value })} className="input-field resize-none text-xs" placeholder="e.g., Hypertension, Type 2 Diabetes" />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-surface-200">
          <p className="text-[10px] text-surface-400">{t('Patient will be registered into master registry.', 'Pesakit akan didaftarkan ke dalam pangkalan data induk.')}</p>
          <button type="submit" disabled={submitting || !!duplicatePatient} className="btn-primary flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed text-xs px-4 py-2">
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? t('Registering Patient...', 'Mendaftarkan Pesakit...') : t('Register Patient', 'Daftar Pesakit')}
          </button>
        </div>
      </form>
    </div>
  );
}
