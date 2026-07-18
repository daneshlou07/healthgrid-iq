import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ux/Toast';
import type { SeverityLevel } from '../../types';
import { Info } from 'lucide-react';

// Modality → Examination mapping with auto body-region
const MODALITY_EXAMINATIONS: Record<string, { name: string; bodyRegion: string }[]> = {
  'X-Ray': [
    { name: 'Chest X-Ray', bodyRegion: 'Chest' },
    { name: 'Abdomen X-Ray', bodyRegion: 'Abdomen' },
    { name: 'Skull X-Ray', bodyRegion: 'Head' },
    { name: 'Spine X-Ray', bodyRegion: 'Lumbar Spine' },
    { name: 'Knee X-Ray', bodyRegion: 'Knee' },
    { name: 'Ankle X-Ray', bodyRegion: 'Ankle' },
    { name: 'Wrist X-Ray', bodyRegion: 'Wrist' },
    { name: 'Hip X-Ray', bodyRegion: 'Hip' },
    { name: 'Shoulder X-Ray', bodyRegion: 'Shoulder' },
    { name: 'Cervical Spine X-Ray', bodyRegion: 'Cervical Spine' },
    { name: 'Thoracic Spine X-Ray', bodyRegion: 'Thoracic Spine' },
    { name: 'Pelvis X-Ray', bodyRegion: 'Pelvis' },
    { name: 'Hand X-Ray', bodyRegion: 'Hand' },
    { name: 'Foot X-Ray', bodyRegion: 'Foot' },
  ],
  'CT Scan': [
    { name: 'CT Brain', bodyRegion: 'Head' },
    { name: 'CT Thorax', bodyRegion: 'Chest' },
    { name: 'CT Abdomen', bodyRegion: 'Abdomen' },
    { name: 'CT Abdomen & Pelvis', bodyRegion: 'Abdomen' },
    { name: 'CT Pulmonary Angiography', bodyRegion: 'Chest' },
    { name: 'CT Paranasal Sinus', bodyRegion: 'Head' },
    { name: 'CT Cervical Spine', bodyRegion: 'Cervical Spine' },
    { name: 'CT Lumbar Spine', bodyRegion: 'Lumbar Spine' },
    { name: 'CT Kidney', bodyRegion: 'Abdomen' },
    { name: 'CT Angiography', bodyRegion: 'Chest' },
  ],
  'MRI': [
    { name: 'MRI Brain', bodyRegion: 'Head' },
    { name: 'MRI Cervical Spine', bodyRegion: 'Cervical Spine' },
    { name: 'MRI Thoracic Spine', bodyRegion: 'Thoracic Spine' },
    { name: 'MRI Lumbar Spine', bodyRegion: 'Lumbar Spine' },
    { name: 'MRI Brain & Spine', bodyRegion: 'Head' },
    { name: 'MRI Knee', bodyRegion: 'Knee' },
    { name: 'MRI Shoulder', bodyRegion: 'Shoulder' },
    { name: 'MRI Hip', bodyRegion: 'Hip' },
    { name: 'MRI Wrist', bodyRegion: 'Wrist' },
    { name: 'MRI Ankle', bodyRegion: 'Ankle' },
    { name: 'MRI Abdomen', bodyRegion: 'Abdomen' },
    { name: 'MRI Pelvis', bodyRegion: 'Pelvis' },
  ],
  'Ultrasound': [
    { name: 'Abdominal Ultrasound', bodyRegion: 'Abdomen' },
    { name: 'Pelvic Ultrasound', bodyRegion: 'Pelvis' },
    { name: 'Thyroid Ultrasound', bodyRegion: 'Neck' },
    { name: 'Obstetric Ultrasound', bodyRegion: 'Pelvis' },
    { name: 'Cardiac Echo', bodyRegion: 'Chest' },
    { name: 'Renal Ultrasound', bodyRegion: 'Abdomen' },
    { name: 'Breast Ultrasound', bodyRegion: 'Chest' },
    { name: 'Musculoskeletal Ultrasound', bodyRegion: 'Upper Limb' },
  ],
};

const MODALITIES = Object.keys(MODALITY_EXAMINATIONS);

const DISEASES = [
  'Osteoarthritis', 'Lumbar Disc Herniation', 'Suspected Lung Cancer',
  'Brain Tumor Investigation', 'Stroke Assessment', 'Stroke Follow-Up',
  'Tuberculosis Screening', 'Head Trauma', 'Kidney Stone',
  'Pulmonary Embolism', 'Pneumonia', 'Multiple Sclerosis',
  'Scoliosis assessment', 'Chronic Back Pain', 'Wrist Fracture',
  'Ankle Sprain', 'Knee Ligament Injury', 'Liver Lesion Assessment',
  'Cervical Disc Compression', 'Sinus Disease', 'Foreign body evaluation',
  'Rib fracture', 'Abdominal Pain Investigation',
];

const BODY_REGIONS = [
  'Head', 'Neck', 'Chest', 'Abdomen', 'Pelvis',
  'Cervical Spine', 'Thoracic Spine', 'Lumbar Spine',
  'Shoulder', 'Upper Limb', 'Wrist', 'Hand',
  'Hip', 'Knee', 'Ankle', 'Foot',
];

const SEVERITIES: SeverityLevel[] = ['Mild', 'Moderate', 'Severe', 'Critical'];

export default function NewCaseReferral() {
  const { currentUser } = useAuth();
  const { patients, clinics, addCase, addAuditLog } = useData();
  const toast = useToast();
  const [form, setForm] = useState({
    patientId: '',
    modality: '',
    examination: '',
    customExamination: '',
    bodyRegion: '',
    disease: '',
    customDisease: '',
    severity: 'Moderate' as SeverityLevel,
    incubationPeriod: '',
    preferredClinicId: '',
    notes: '',
  });

  const selectedPatient = patients.find((p) => p.id === form.patientId);

  // Get available examinations based on selected modality
  const examinations = useMemo(() => {
    if (!form.modality) return [];
    return MODALITY_EXAMINATIONS[form.modality] || [];
  }, [form.modality]);

  // Handle modality change — reset examination and body region
  const handleModalityChange = (modality: string) => {
    setForm({ ...form, modality, examination: '', customExamination: '', bodyRegion: '' });
  };

  // Handle examination change — auto-populate body region
  const handleExaminationChange = (examination: string) => {
    if (examination === 'Other') {
      setForm({ ...form, examination: 'Other', customExamination: '', bodyRegion: '' });
    } else {
      const exam = examinations.find((e) => e.name === examination);
      setForm({ ...form, examination, customExamination: '', bodyRegion: exam?.bodyRegion || '' });
    }
  };

  // Resolve the final scan type for submission
  const resolvedScanType = form.examination === 'Other' ? form.customExamination : form.examination;
  const resolvedDisease = form.disease === 'Other' ? form.customDisease : form.disease;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !resolvedScanType || !resolvedDisease) return;
    const patient = patients.find((p) => p.id === form.patientId);
    const preferredClinic = clinics.find((c) => c.id === form.preferredClinicId);
    const caseNumber = `XR${new Date().getFullYear()}${String(Date.now()).slice(-6)}`;

    try {
      await addCase({
        caseNumber,
        patientId: form.patientId,
        patientName: patient?.name || '',
        doctorId: currentUser.id,
        doctorName: currentUser.name,
        clinicId: form.preferredClinicId || undefined,
        clinicName: preferredClinic?.name || undefined,
        scanType: resolvedScanType,
        disease: resolvedDisease,
        bodyRegion: form.bodyRegion,
        severity: form.severity,
        incubationPeriod: form.incubationPeriod || undefined,
        notes: form.notes,
        status: 'CREATED',
        createdAt: new Date().toISOString(),
      });

      await addAuditLog({
        userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role,
        action: 'CASE_CREATED', target: `cases/${caseNumber}`,
        details: `Created ${caseNumber} for ${patient?.name} — ${resolvedDisease} (${resolvedScanType})`,
        timestamp: new Date().toISOString(),
      });

      toast.success(`Case ${caseNumber} submitted — pending AI Scheduler`);
      setForm({ patientId: '', modality: '', examination: '', customExamination: '', bodyRegion: '', disease: '', customDisease: '', severity: 'Moderate', incubationPeriod: '', preferredClinicId: '', notes: '' });
    } catch {
      toast.error('Failed to create case.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="page-title">Register New Case</h1>
        <p className="page-subtitle">Submit clinical imaging referral. The AI Scheduler handles all operational assignments.</p>
      </div>

      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-blue-700 space-y-1">
          <p className="font-medium">Referral Workflow</p>
          <p>1. Submit clinical information below &rarr; 2. Case enters AI Scheduler queue &rarr; 3. System recommends optimal healthcare centre, radiographer, and appointment &rarr; 4. Administrator reviews and confirms assignment</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-6">
        {/* Clinical Information */}
        <div>
          <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">Clinical Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-surface-700 mb-1">Referring Doctor</label>
              <input disabled value={currentUser?.name || ''} className="input-field bg-surface-100 text-surface-600 cursor-not-allowed" />
            </div>

            {/* Disease / Condition — with manual typing */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-surface-700 mb-1">Disease / Condition *</label>
              <select required={form.disease !== 'Other'} value={form.disease} onChange={(e) => setForm({ ...form, disease: e.target.value, customDisease: '' })} className="select-field">
                <option value="">Select disease type...</option>
                {DISEASES.map((d) => <option key={d} value={d}>{d}</option>)}
                <option value="Other">Other (type manually)</option>
              </select>
              {form.disease === 'Other' && (
                <input
                  required
                  value={form.customDisease}
                  onChange={(e) => setForm({ ...form, customDisease: e.target.value })}
                  className="input-field mt-2"
                  placeholder="Enter disease or condition..."
                />
              )}
            </div>

            {/* Imaging Modality */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-surface-700 mb-1">Imaging Modality *</label>
              <div className="grid grid-cols-4 gap-2">
                {MODALITIES.map((m) => (
                  <button key={m} type="button" onClick={() => handleModalityChange(m)}
                    className={`py-2.5 rounded-lg text-xs font-medium border transition-colors ${
                      form.modality === m ? 'bg-navy-600 text-white border-navy-600' : 'bg-white border-surface-300 text-surface-600 hover:border-surface-400'
                    }`}
                  >{m}</button>
                ))}
              </div>
            </div>

            {/* Examination / Study — dynamic based on modality */}
            {form.modality && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-surface-700 mb-1">Examination / Study *</label>
                <select
                  required={form.examination !== 'Other'}
                  value={form.examination}
                  onChange={(e) => handleExaminationChange(e.target.value)}
                  className="select-field"
                >
                  <option value="">Select examination...</option>
                  {examinations.map((ex) => <option key={ex.name} value={ex.name}>{ex.name}</option>)}
                  <option value="Other">Other (type manually)</option>
                </select>
                {form.examination === 'Other' && (
                  <input
                    required
                    value={form.customExamination}
                    onChange={(e) => setForm({ ...form, customExamination: e.target.value })}
                    className="input-field mt-2"
                    placeholder="Enter examination name..."
                  />
                )}
              </div>
            )}

            {/* Body Region — auto-populated, editable */}
            {form.modality && (
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Body Region *</label>
                <select required value={form.bodyRegion} onChange={(e) => setForm({ ...form, bodyRegion: e.target.value })} className="select-field">
                  <option value="">Select body region...</option>
                  {BODY_REGIONS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
                {form.examination && form.examination !== 'Other' && (
                  <p className="text-[10px] text-emerald-600 mt-1">Auto-populated from examination</p>
                )}
              </div>
            )}

            {/* Severity */}
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">Severity *</label>
              <div className="flex gap-2">
                {SEVERITIES.map((s) => (
                  <button key={s} type="button" onClick={() => setForm({ ...form, severity: s })}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                      form.severity === s ? 'bg-navy-600 text-white border-navy-600' : 'bg-white border-surface-300 text-surface-600 hover:border-surface-400'
                    }`}
                  >{s}</button>
                ))}
              </div>
            </div>

            {/* Incubation Period */}
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Incubation Period (days)</label>
              <input value={form.incubationPeriod} onChange={(e) => setForm({ ...form, incubationPeriod: e.target.value })} className="input-field" placeholder="Optional — if applicable" />
            </div>
          </div>
        </div>

        {/* Patient Information */}
        <div>
          <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">Patient Information</h3>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-surface-700 mb-1">Patient *</label>
            <PatientSearchSelect patients={patients} value={form.patientId} onChange={(id) => setForm({ ...form, patientId: id })} />
          </div>
          {selectedPatient && (
            <div className="mt-3 p-3 bg-surface-100 rounded-lg border border-surface-200 text-xs space-y-1">
              <p className="font-medium text-surface-700">{selectedPatient.name} — {selectedPatient.nric}</p>
              <p className="text-surface-500">Address: {selectedPatient.address}</p>
              {selectedPatient.medicalHistory.length > 0 && <p className="text-surface-500">History: {selectedPatient.medicalHistory.join(', ')}</p>}
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Clinical Notes</label>
          <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input-field resize-none" placeholder="Additional clinical information, symptoms, history..." />
        </div>

        {/* Advanced Options — collapsible */}
        <details className="group">
          <summary className="cursor-pointer text-xs font-semibold text-surface-500 uppercase tracking-wider flex items-center gap-2 select-none hover:text-navy-600 transition-colors">
            <span>Advanced Options</span>
            <span className="text-[10px] font-normal text-surface-400 normal-case">(optional)</span>
          </summary>
          <div className="mt-3 p-4 bg-surface-50 rounded-lg border border-surface-200 space-y-3">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Preferred Healthcare Centre</label>
              <select value={form.preferredClinicId} onChange={(e) => setForm({ ...form, preferredClinicId: e.target.value })} className="select-field">
                <option value="">No preference — AI Scheduler will determine</option>
                {clinics.filter((c) => c.status === 'active').map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <p className="text-[10px] text-surface-400 mt-1">Advisory only. The AI Scheduler will honour this preference if scheduling constraints allow. Otherwise, the next most suitable centre will be recommended.</p>
            </div>
          </div>
        </details>

        <div className="flex items-center justify-between pt-3 border-t border-surface-200">
          <p className="text-[10px] text-surface-400">AI Scheduler will determine healthcare centre, radiographer, and appointment.</p>
          <button type="submit" className="btn-primary">Submit Referral</button>
        </div>
      </form>
    </div>
  );
}

// Searchable patient selector component
function PatientSearchSelect({ patients, value, onChange }: {
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
