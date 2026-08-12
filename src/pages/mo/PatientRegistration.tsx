import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ux/Toast';
import { useLanguage } from '../../context/LanguageContext';
import type { Gender, MohYaTidak } from '../../types';

import {
  CheckCircle,
  AlertCircle,
  Loader2,
  UserX,
  CreditCard,
  ShieldCheck,
  User,
  MapPin,
  HeartPulse,
  Building2,
} from 'lucide-react';

import {
  parseMalaysianNric,
  normalizeNric,
  formatNric,
} from '../../utils/malaysianNric';

import { PredictiveAddressInput } from '../../components/ui/PredictiveAddressInput';
import { geocodeAddress } from '../../services/routingService';
import {
  calculateMohPaymentCategory,
  formatPaymentCategoryBadge,
} from '../../utils/paymentCategory';

type IdType = 'mykad' | 'passport';

function generateMrn(): string {
  const year = new Date().getFullYear();

  let suffix: string;

  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    suffix = crypto
      .randomUUID()
      .replace(/-/g, '')
      .slice(0, 8)
      .toUpperCase();
  } else {
    suffix = (Date.now() % 100000000)
      .toString()
      .padStart(8, '0');
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

  const ETHNICITY_OPTIONS = [
    'Malay',
    'Chinese',
    'Indian',
    'Bumiputera (Sabah)',
    'Bumiputera (Sarawak)',
    'Others',
  ];

  const computedPaymentCategory = useMemo(() => {
    return calculateMohPaymentCategory(
      form.isWarganegara,
      form.isPenjawatAwam,
      form.isFpp
    );
  }, [
    form.isWarganegara,
    form.isPenjawatAwam,
    form.isFpp,
  ]);

  const paymentBadge = useMemo(() => {
    return formatPaymentCategoryBadge(
      computedPaymentCategory,
      language
    );
  }, [computedPaymentCategory, language]);

  const nricResult = useMemo(() => {
    if (idType !== 'mykad') return null;

    const normalized = normalizeNric(form.idNumber);

    if (normalized.length === 0) return null;

    if (normalized.length < 12) {
      return {
        valid: false,
        normalized,
        formatted: form.idNumber,
        dob: '',
        gender: 'Male' as Gender,
        stateOfBirth: 'Unknown',
        stateCode: '',
        age: 0,
        error: `${12 - normalized.length} digits remaining`,
      };
    }

    return parseMalaysianNric(form.idNumber);
  }, [form.idNumber, idType]);

  useEffect(() => {
    if (nricResult?.valid) {
      setForm((prev) => ({
        ...prev,
        dob: nricResult.dob,
        gender: nricResult.gender,
      }));
    }
  }, [
    nricResult?.valid,
    nricResult?.dob,
    nricResult?.gender,
  ]);

  const isNricLocked =
    idType === 'mykad' && nricResult?.valid === true;

  const patientsRef = useRef(patients);

  useEffect(() => {
    patientsRef.current = patients;
  }, [patients]);

  const [duplicatePatient, setDuplicatePatient] =
    useState<typeof patients[0] | null>(null);

  useEffect(() => {
    const rawNric = normalizeNric(form.idNumber);

    if (idType !== 'mykad' || rawNric.length < 12) {
      setDuplicatePatient(null);
      return;
    }

    const found =
      patientsRef.current.find(
        (p) =>
          p.nric &&
          normalizeNric(p.nric) === rawNric
      ) || null;

    setDuplicatePatient(found);
  }, [form.idNumber, idType]);

  const [patientGeo, setPatientGeo] = useState<{
    lat?: number;
    lon?: number;
  }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser || submitting) return;

    if (duplicatePatient) {
      toast.error(
        `NRIC already registered to ${duplicatePatient.name} (${duplicatePatient.mrn}). Use the Patient Registry to update their record.`
      );
      return;
    }

    const cleanPhone = form.phone.replace(/[\s-]/g, '');

    if (!/^\+?\d{8,15}$/.test(cleanPhone)) {
      toast.error('Please enter a valid phone number.');
      return;
    }

    const trimmedAddr = form.address.trim();

    if (trimmedAddr.length < 6) {
      toast.error(
        'Please enter a valid residential address.'
      );
      return;
    }

    const mrnGenerated = generateMrn();

    const preferredClinic = clinics.find(
      (c) => c.id === form.preferredClinicId
    );

    const rawNricDigits = normalizeNric(form.idNumber);

    const nricValue =
      idType === 'mykad'
        ? rawNricDigits.length === 12
          ? formatNric(rawNricDigits)
          : form.idNumber.trim()
        : form.idNumber.trim();

    setSubmitting(true);

    try {
      let resolvedLat = patientGeo.lat;
      let resolvedLon = patientGeo.lon;

      if (!resolvedLat || !resolvedLon) {
        const geo = await geocodeAddress(trimmedAddr);

        if (geo) {
          resolvedLat = geo.lat;
          resolvedLon = geo.lon;
        }
      }

      const patientData: Omit<
        Parameters<typeof addPatient>[0],
        never
      > = {
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
        medicalHistory: form.medicalHistory
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        isWarganegara: form.isWarganegara,
        isPenjawatAwam: form.isPenjawatAwam,
        isFpp: form.isFpp,
        paymentCategory: computedPaymentCategory,
        hasAsthma: form.hasAsthma,
        previousContrastReaction:
          form.previousContrastReaction,
        previousContrastDetails:
          form.previousContrastDetails,
      };

      if (form.ethnicity) {
        patientData.ethnicity = form.ethnicity;
      }

      if (form.emergencyContact) {
        patientData.emergencyContact =
          form.emergencyContact;
      }

      if (form.preferredClinicId) {
        patientData.preferredClinicId =
          form.preferredClinicId;

        if (preferredClinic?.name) {
          patientData.preferredClinicName =
            preferredClinic.name;
        }
      }

      await addPatient(patientData);

      toast.success(
        `${form.name} registered successfully — MRN: ${mrnGenerated}`
      );

      setForm({
        name: '',
        idNumber: '',
        dob: '',
        gender: 'Male',
        phone: '',
        email: '',
        address: '',
        medicalHistory: '',
        emergencyContact: '',
        preferredClinicId: '',
        ethnicity: '',
        isWarganegara: 'Yes',
        isPenjawatAwam: 'No',
        isFpp: 'No',
        hasAsthma: 'No',
        previousContrastReaction: 'No',
        previousContrastDetails: '',
      });

      setPatientGeo({});
      setIdType('mykad');
    } catch (err: any) {
      toast.error(
        err?.message || 'Failed to register patient.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 lg:px-6 pb-10">

      {/* =========================================================
          PAGE HEADER
      ========================================================== */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-lg bg-[#EFF6F3] flex items-center justify-center">
              <User className="w-5 h-5 text-[#0F4C42]" />
            </div>

            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B8580]">
              {t(
                'Patient Registration',
                'Pendaftaran Pesakit'
              )}
            </span>
          </div>

          <h1 className="text-2xl font-bold text-navy-900 tracking-tight">
            {t(
              'Register New Patient',
              'Daftar Pesakit Baharu'
            )}
          </h1>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6"
      >

        {/* =========================================================
            SECTION 1 — PATIENT IDENTITY
        ========================================================== */}
        <section className="bg-white border border-surface-200 rounded-lg shadow-sm overflow-hidden">

          <div className="px-6 py-4 border-b border-surface-200 bg-surface-50/60">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#EFF6F3] flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-[#0F4C42]" />
              </div>

              <div>
                <h2 className="text-sm font-bold text-navy-900">
                  {t(
                    'Patient Identity & Demographics',
                    'Identiti & Demografi Pesakit'
                  )}
                </h2>

                <p className="text-[11px] text-surface-500 mt-0.5">
                  {t(
                    'Basic information used to identify and contact the patient.',
                    'Maklumat asas untuk mengenal pasti dan menghubungi pesakit.'
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5">

            {/* Full Name */}
            <div>
              <label className="block text-sm font-semibold text-surface-700 mb-1.5">
                {t('Full Name *', 'Nama Penuh *')}
              </label>

              <input
                required
                value={form.name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    name: e.target.value,
                  })
                }
                className="input-field uppercase font-semibold w-full"
                placeholder="E.G., SITI AMINAH BINTI HASSAN"
              />
            </div>

            {/* Identification */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

              <div className="lg:col-span-4">
                <label className="block text-sm font-semibold text-surface-700 mb-1.5">
                  {t(
                    'Identification Document *',
                    'Dokumen Pengenalan *'
                  )}
                </label>

                <div className="flex bg-[#F8FAFC] rounded-lg border border-[#DCE3E1] p-1 h-[42px]">
                  <button
                    type="button"
                    onClick={() =>
                      setIdType('mykad')
                    }
                    className={`
                      flex-1
                      rounded-md
                      text-xs
                      font-semibold
                      transition-all
                      ${idType === 'mykad'
                        ? 'bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]'
                        : 'text-surface-600 hover:bg-white'
                      }
                    `}
                  >
                    MyKad
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setIdType('passport')
                    }
                    className={`
                      flex-1
                      rounded-md
                      text-xs
                      font-semibold
                      transition-all
                      ${idType === 'passport'
                        ? 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]'
                        : 'text-surface-600 hover:bg-white'
                      }
                    `}
                  >
                    Passport
                  </button>
                </div>
              </div>

              <div className="lg:col-span-8">
                <label className="block text-sm font-semibold text-surface-700 mb-1.5">
                  {idType === 'mykad'
                    ? 'MyKad Number (12 Digits) *'
                    : 'Passport Number *'}
                </label>

                <input
                  required
                  type="text"
                  value={form.idNumber}
                  onChange={(e) => {
                    const val =
                      idType === 'mykad'
                        ? e.target.value.replace(
                          /[^\d]/g,
                          ''
                        )
                        : e.target.value;

                    setForm({
                      ...form,
                      idNumber: val,
                    });
                  }}
                  className={`
                    input-field
                    font-mono
                    w-full
                    ${duplicatePatient
                      ? 'border-red-400 bg-red-50'
                      : ''
                    }
                  `}
                  placeholder={
                    idType === 'mykad'
                      ? 'e.g., 850312015678'
                      : 'e.g., A12345678'
                  }
                  maxLength={
                    idType === 'mykad' ? 12 : 20
                  }
                />

                {/* Duplicate */}
                {duplicatePatient && (
                  <div className="mt-2 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
                    <UserX className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />

                    <div className="text-xs">
                      <p className="font-bold text-red-700">
                        NRIC already registered
                      </p>

                      <p className="text-red-600 mt-0.5">
                        {duplicatePatient.name}
                        {' · '}
                        <span className="font-mono">
                          {duplicatePatient.mrn}
                        </span>
                      </p>
                    </div>
                  </div>
                )}

                {/* NRIC validation */}
                {idType === 'mykad' &&
                  nricResult &&
                  !duplicatePatient && (
                    <div className="mt-2">
                      {nricResult.valid ? (
                        <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200">
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />

                          <span className="text-xs font-bold">
                            {nricResult.formatted}
                          </span>

                          <span className="text-[11px] text-emerald-600 ml-auto">
                            Details detected
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-red-600">
                          <AlertCircle className="w-3.5 h-3.5" />

                          <span className="text-xs font-semibold">
                            {nricResult.error}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
              </div>
            </div>

            {/* DOB / Gender / Phone */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              <div>
                <label className="block text-sm font-semibold text-surface-700 mb-1.5">
                  {t(
                    'Date of Birth *',
                    'Tarikh Lahir *'
                  )}
                </label>

                <input
                  required
                  type="date"
                  value={form.dob}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      dob: e.target.value,
                    })
                  }
                  className="input-field w-full"
                  readOnly={isNricLocked}
                />

                {isNricLocked && (
                  <p className="text-[10px] text-surface-400 mt-1">
                    Automatically detected from MyKad
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-surface-700 mb-1.5">
                  {t('Gender *', 'Jantina *')}
                </label>

                <select
                  required
                  value={form.gender}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      gender:
                        e.target.value as Gender,
                    })
                  }
                  className="select-field w-full"
                  disabled={isNricLocked}
                >
                  <option value="Male">Male</option>
                  <option value="Female">
                    Female
                  </option>
                  <option value="Other">
                    Other
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-surface-700 mb-1.5">
                  {t(
                    'Phone Number *',
                    'Nombor Telefon *'
                  )}
                </label>

                <input
                  required
                  value={form.phone}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      phone: e.target.value,
                    })
                  }
                  className="input-field font-mono w-full"
                  placeholder="+60 12-345 6789"
                />
              </div>
            </div>

            {/* Ethnicity / Email / Clinic */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              <div>
                <label className="block text-sm font-semibold text-surface-700 mb-1.5">
                  {t(
                    'Ethnicity',
                    'Etnik / Bangsa'
                  )}
                </label>

                <select
                  value={form.ethnicity}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      ethnicity: e.target.value,
                    })
                  }
                  className="select-field w-full"
                >
                  <option value="">
                    -- Select Ethnicity --
                  </option>

                  {ETHNICITY_OPTIONS.map(
                    (opt) => (
                      <option
                        key={opt}
                        value={opt}
                      >
                        {opt}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-surface-700 mb-1.5">
                  {t('Email', 'E-mel')}
                </label>

                <input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      email: e.target.value,
                    })
                  }
                  className="input-field w-full"
                  placeholder="patient@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-surface-700 mb-1.5">
                  {t(
                    'Preferred Clinic',
                    'Klinik Pilihan'
                  )}
                </label>

                <select
                  value={form.preferredClinicId}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      preferredClinicId:
                        e.target.value,
                    })
                  }
                  className="select-field w-full"
                >
                  <option value="">
                    -- Select Clinic --
                  </option>

                  {clinics.map((clinic) => (
                    <option
                      key={clinic.id}
                      value={clinic.id}
                    >
                      {clinic.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-semibold text-surface-700 mb-1.5">
                {t(
                  'Residential Address *',
                  'Alamat Kediaman *'
                )}
              </label>

              <PredictiveAddressInput
                required
                value={form.address}
                onChange={(
                  addressValue,
                  details
                ) => {
                  setForm({
                    ...form,
                    address: addressValue,
                  });

                  if (details) {
                    setPatientGeo(details);
                  }
                }}
              />

              <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-surface-400">
                <MapPin className="w-3 h-3" />

                <span>
                  Address coordinates will be resolved
                  automatically for location-based
                  scheduling.
                </span>
              </div>
            </div>

            {/* Emergency Contact */}
            <div>
              <label className="block text-sm font-semibold text-surface-700 mb-1.5">
                {t(
                  'Emergency Contact',
                  'Hubungi Kecemasan'
                )}
              </label>

              <input
                value={form.emergencyContact}
                onChange={(e) =>
                  setForm({
                    ...form,
                    emergencyContact:
                      e.target.value,
                  })
                }
                className="input-field w-full"
                placeholder="Name — Relationship — Phone"
              />
            </div>
          </div>
        </section>

        {/* =========================================================
            SECONDARY INFORMATION
        ========================================================== */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* =======================================================
              PAYMENT
          ======================================================== */}
          <section className="bg-white border border-surface-200 rounded-xl shadow-sm overflow-hidden">

            <div className="px-6 py-4 border-b border-surface-200 bg-surface-50/60">
              <div className="flex items-center justify-between gap-3">

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#EFF6F3] flex items-center justify-center shrink-0">
                    <CreditCard className="w-4 h-4 text-[#0F4C42]" />
                  </div>

                  <div>
                    <h2 className="text-sm font-bold text-navy-900">
                      {t(
                        'Payment & Billing',
                        'Bayaran & Bil'
                      )}
                    </h2>

                    <p className="text-[11px] text-surface-500 mt-0.5">
                      {t(
                        'Master payment classification',
                        'Klasifikasi bayaran induk'
                      )}
                    </p>
                  </div>
                </div>

                <span
                  className={`
                    px-2.5 py-1
                    text-[10px]
                    font-bold
                    rounded-full
                    border
                    whitespace-nowrap
                    ${paymentBadge.color}
                  `}
                >
                  {paymentBadge.label}
                </span>
              </div>
            </div>

            <div className="p-6 space-y-5">

              <div className="grid grid-cols-1 gap-4">

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {t(
                      'Citizenship Status',
                      'Status Kewarganegaraan'
                    )}
                  </label>

                  <select
                    value={form.isWarganegara}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        isWarganegara:
                          e.target.value as MohYaTidak,
                      })
                    }
                    className="select-field w-full"
                  >
                    <option value="Yes">
                      {t(
                        'Malaysian Citizen',
                        'Warganegara Malaysia'
                      )}
                    </option>

                    <option value="No">
                      {t(
                        'Non-Citizen / Foreign National',
                        'Bukan Warganegara'
                      )}
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {t(
                      'Civil Servant Status',
                      'Status Penjawat Awam'
                    )}
                  </label>

                  <select
                    value={form.isPenjawatAwam}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        isPenjawatAwam:
                          e.target.value as MohYaTidak,
                      })
                    }
                    className="select-field w-full"
                    disabled={
                      form.isWarganegara === 'No'
                    }
                  >
                    <option value="No">
                      {t('No', 'Tidak')}
                    </option>

                    <option value="Yes">
                      {t(
                        'Yes (Civil Servant / Pensioner)',
                        'Ya (Penjawat Awam / Pesara)'
                      )}
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {t(
                      'Full Paying Patient (FPP)',
                      'Skim Pesakit Bayar Penuh'
                    )}
                  </label>

                  <select
                    value={form.isFpp}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        isFpp:
                          e.target.value as MohYaTidak,
                      })
                    }
                    className="select-field w-full"
                    disabled={
                      form.isWarganegara === 'No'
                    }
                  >
                    <option value="No">
                      {t('No', 'Tidak')}
                    </option>

                    <option value="Yes">
                      {t(
                        'Yes (FPP Scheme)',
                        'Ya (Skim FPP)'
                      )}
                    </option>
                  </select>
                </div>
              </div>

              <div className="rounded-lg bg-[#F3F8F6] border border-[#D8E8E2] p-3">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />

                  <div>
                    <p className="text-xs font-semibold text-[#0F4C42]">
                      {paymentBadge.label}
                    </p>

                    <p className="text-[10px] text-surface-500 mt-0.5 leading-relaxed">
                      {t(
                        'MOH Payment Category is auto-calculated and inherits into all radiology case referrals.',
                        'Kategori bayaran KKM dikira secara automatik dan diwarisi ke semua rujukan kes radiologi.'
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* =======================================================
              CLINICAL
          ======================================================== */}
          <section className="bg-white border border-surface-200 rounded-xl shadow-sm overflow-hidden">

            <div className="px-6 py-4 border-b border-surface-200 bg-surface-50/60">
              <div className="flex items-center gap-3">

                <div className="w-8 h-8 rounded-lg bg-[#EFF6F3] flex items-center justify-center shrink-0">
                  <HeartPulse className="w-4 h-4 text-[#0F4C42]" />
                </div>

                <div>
                  <h2 className="text-sm font-bold text-navy-900">
                    {t(
                      'Clinical & Allergy Profile',
                      'Profil Klinikal & Alergi'
                    )}
                  </h2>

                  <p className="text-[11px] text-surface-500 mt-0.5">
                    {t(
                      'Baseline information relevant to future radiology procedures.',
                      'Maklumat asas berkaitan prosedur radiologi akan datang.'
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {t(
                      'Asthma History',
                      'Sejarah Asma'
                    )}
                  </label>

                  <select
                    value={form.hasAsthma}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        hasAsthma:
                          e.target.value as MohYaTidak,
                      })
                    }
                    className="select-field w-full"
                  >
                    <option value="No">
                      {t('No', 'Tidak')}
                    </option>

                    <option value="Yes">
                      {t('Yes', 'Ya')}
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {t(
                      'Previous Contrast Media Reaction',
                      'Reaksi Kontras Dahulu'
                    )}
                  </label>

                  <select
                    value={
                      form.previousContrastReaction
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,
                        previousContrastReaction:
                          e.target.value as MohYaTidak,
                      })
                    }
                    className="select-field w-full"
                  >
                    <option value="No">
                      {t('No', 'Tidak')}
                    </option>

                    <option value="Yes">
                      {t(
                        'Yes (Prior Contrast Reaction)',
                        'Ya (Pernah Reaksi Kontras)'
                      )}
                    </option>
                  </select>
                </div>
              </div>

              {form.previousContrastReaction ===
                'Yes' && (
                  <div>
                    <label className="block text-xs font-bold text-amber-800 mb-1.5">
                      Contrast Reaction Details
                    </label>

                    <input
                      value={
                        form.previousContrastDetails
                      }
                      onChange={(e) =>
                        setForm({
                          ...form,
                          previousContrastDetails:
                            e.target.value,
                        })
                      }
                      className="input-field w-full border-amber-300 bg-amber-50/40"
                      placeholder="e.g. Mild urticaria or nausea during prior CT contrast scan"
                    />
                  </div>
                )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {t(
                    'General Medical History',
                    'Sejarah Perubatan Am'
                  )}
                </label>

                <textarea
                  rows={4}
                  value={form.medicalHistory}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      medicalHistory:
                        e.target.value,
                    })
                  }
                  className="input-field resize-none w-full"
                  placeholder="e.g., Hypertension, Type 2 Diabetes"
                />

                <p className="text-[10px] text-surface-400 mt-1.5">
                  Separate multiple conditions with commas.
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* =========================================================
            SUBMIT BAR
        ========================================================== */}
        <div className="bg-white border border-surface-200 rounded-xl shadow-sm px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

          <div className="flex items-start gap-2">
            <div className="w-7 h-7 rounded-full bg-[#EFF6F3] flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle className="w-3.5 h-3.5 text-[#0F4C42]" />
            </div>

            <div>
              <p className="text-xs font-semibold text-surface-700">
                {t(
                  'Ready to register patient',
                  'Sedia untuk mendaftarkan pesakit'
                )}
              </p>

              <p className="text-[10px] text-surface-400 mt-0.5">
                {t(
                  'The patient will be added to the master registry.',
                  'Pesakit akan ditambah ke dalam daftar induk.'
                )}
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={
              submitting || !!duplicatePatient
            }
            className="
              btn-primary
              flex
              items-center
              justify-center
              gap-2
              disabled:opacity-60
              disabled:cursor-not-allowed
              text-sm
              px-6
              py-2.5
              min-w-[170px]
              shrink-0
            "
          >
            {submitting && (
              <Loader2 className="w-4 h-4 animate-spin" />
            )}

            {submitting
              ? t(
                'Registering Patient...',
                'Mendaftarkan Pesakit...'
              )
              : t(
                'Register Patient',
                'Daftar Pesakit'
              )}
          </button>
        </div>
      </form>
    </div>
  );
}