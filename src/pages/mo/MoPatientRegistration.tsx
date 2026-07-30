import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ux/Toast';
import { UserPlus, ArrowLeft } from 'lucide-react';

export default function MoPatientRegistration() {
  const navigate = useNavigate();
  const { addPatient, addAuditLog } = useData();
  const { currentUser } = useAuth();
  const toast = useToast();

  const [name, setName] = useState('');
  const [nric, setNric] = useState('');
  const [mrn, setMrn] = useState(`MRN-${Math.floor(100000 + Math.random() * 900000)}`);
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('Male');
  const [phone, setPhone] = useState('');
  const [ethnicity, setEthnicity] = useState('Malay');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !nric) {
      toast.error('Patient Name and NRIC are required.');
      return;
    }

    setSubmitting(true);
    try {
      const newId = `pat-${Date.now()}`;
      await addPatient({
        name,
        nric,
        mrn,
        dob: dob || '',
        gender: gender as any,
        phone: phone || '',
        email: '',
        address: address || '',
        medicalHistory: [],
        ethnicity: ethnicity || '',
      });

      if (currentUser) {
        await addAuditLog({
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          action: 'PATIENT_REGISTERED',
          target: `patients/${newId}`,
          details: `Medical Officer ${currentUser.name} registered patient: ${name} (${mrn})`,
          timestamp: new Date().toISOString(),
        });
      }

      toast.success(`Patient ${name} registered successfully by MO`);
      navigate('/patients');
    } catch (err) {
      toast.error('Failed to register patient.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="page-title">Medical Officer Patient Admission</h1>
          <p className="page-subtitle">Register a new patient record into the HealthGrid clinical database.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <UserPlus className="w-5 h-5 text-purple-600" />
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Patient Information</h2>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Full Name *</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g., Siti Aminah binti Hassan" className="input-field" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">NRIC / Passport *</label>
            <input type="text" value={nric} onChange={(e) => setNric(e.target.value)} required placeholder="e.g., 880315-10-5432" className="input-field font-mono" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">MRN (Medical Record No)</label>
            <input type="text" value={mrn} onChange={(e) => setMrn(e.target.value)} required className="input-field font-mono bg-slate-50" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Date of Birth</label>
            <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="input-field text-xs" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Gender</label>
            <select value={gender} onChange={(e) => setGender(e.target.value)} className="input-field">
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Ethnicity</label>
            <select value={ethnicity} onChange={(e) => setEthnicity(e.target.value)} className="input-field">
              <option value="Malay">Malay</option>
              <option value="Chinese">Chinese</option>
              <option value="Indian">Indian</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Phone Contact</label>
          <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g., +60 12-345 6789" className="input-field" />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Residential Address</label>
          <textarea rows={2} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Full home address..." className="input-field text-xs" />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary text-xs px-4 py-2 font-bold">Cancel</button>
          <button type="submit" disabled={submitting} className="btn-primary text-xs px-5 py-2 font-bold shadow-md">
            {submitting ? 'Registering...' : 'Complete Patient Admission'}
          </button>
        </div>
      </form>
    </div>
  );
}
