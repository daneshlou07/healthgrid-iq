import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { getCases, getClinics, getUsersByRole, updateCase, createAuditLog } from '../../services/dataService';
import type { Case, Clinic, User } from '../../types';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import { CheckCircle } from 'lucide-react';

export default function Scheduling() {
  const { currentUser } = useAuth();
  const { addNotification } = useNotifications();
  const [cases, setCases] = useState<Case[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [radiographers, setRadiographers] = useState<User[]>([]);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [form, setForm] = useState({ scheduledAt: '', clinicId: '', radiographerId: '' });
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    getCases().then((data) => setCases(data.filter((c) => c.status === 'CREATED')));
    getClinics().then(setClinics);
    getUsersByRole('Radiographer').then(setRadiographers);
  }, []);

  const handleSchedule = async () => {
    if (!currentUser || !selectedCase) return;
    const clinic = clinics.find((c) => c.id === form.clinicId);
    const radiographer = radiographers.find((r) => r.id === form.radiographerId);

    await updateCase(selectedCase.id, {
      status: 'SCHEDULED', scheduledAt: new Date(form.scheduledAt).toISOString(),
      clinicId: form.clinicId || selectedCase.clinicId, clinicName: clinic?.name || selectedCase.clinicName,
      radiographerId: form.radiographerId, radiographerName: radiographer?.name || '',
    });
    await createAuditLog({ userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role, action: 'CASE_SCHEDULED', target: `cases/${selectedCase.id}`, details: `Scheduled ${selectedCase.caseNumber} at ${clinic?.name || selectedCase.clinicName}`, timestamp: new Date().toISOString() });
    addNotification({ userId: form.radiographerId, title: 'New Case Assigned', message: `Case ${selectedCase.caseNumber} scheduled for you.`, type: 'info' });

    setSuccess(true); setSelectedCase(null); setForm({ scheduledAt: '', clinicId: '', radiographerId: '' });
    getCases().then((data) => setCases(data.filter((c) => c.status === 'CREATED')));
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Case Scheduling</h1>
        <p className="page-subtitle">Schedule pending cases and assign radiographers</p>
      </div>

      {success && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg text-sm">
          <CheckCircle className="w-4 h-4" /> Case scheduled.
        </div>
      )}

      <div className="space-y-3">
        {cases.map((c) => (
          <div key={c.id} className="card">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-navy-700">{c.caseNumber}</span>
                  <StatusBadge status={c.status} />
                </div>
                <p className="text-sm text-surface-700">Patient: {c.patientName}</p>
                <p className="text-xs text-surface-500">Scan: {c.scanType} &middot; Clinic: {c.clinicName}</p>
              </div>
              <button onClick={() => setSelectedCase(c)} className="btn-primary text-xs">Schedule</button>
            </div>
          </div>
        ))}
        {cases.length === 0 && <div className="text-center py-12 text-surface-400 text-sm">All cases scheduled.</div>}
      </div>

      <Modal isOpen={!!selectedCase} onClose={() => setSelectedCase(null)} title={`Schedule ${selectedCase?.caseNumber || ''}`}>
        <div className="space-y-4">
          <div className="p-3 bg-surface-100 rounded-lg border border-surface-200 text-sm text-surface-700">
            {selectedCase?.patientName} — {selectedCase?.scanType}
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Date & Time *</label>
            <input type="datetime-local" required value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Clinic</label>
            <select value={form.clinicId} onChange={(e) => setForm({ ...form, clinicId: e.target.value })} className="select-field">
              <option value="">Use preferred ({selectedCase?.clinicName})</option>
              {clinics.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Radiographer *</label>
            <select required value={form.radiographerId} onChange={(e) => setForm({ ...form, radiographerId: e.target.value })} className="select-field">
              <option value="">Select radiographer</option>
              {radiographers.map((r) => <option key={r.id} value={r.id}>{r.name} {r.supportedModalities ? `(${r.supportedModalities.join(', ')})` : ''}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setSelectedCase(null)} className="btn-secondary">Cancel</button>
            <button onClick={handleSchedule} disabled={!form.scheduledAt || !form.radiographerId} className="btn-primary disabled:opacity-50">Confirm</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
