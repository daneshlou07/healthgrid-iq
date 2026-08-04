import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useNotifications } from '../../context/NotificationContext';
import { getClinics, getUsersByRole } from '../../services/dataService';
import type { Clinic, User } from '../../types';
import StatusBadge from '../../components/ui/StatusBadge';
import SeverityBadge from '../../components/ui/SeverityBadge';
import Modal from '../../components/ui/Modal';
import { CheckCircle, UserCheck, RefreshCw } from 'lucide-react';

export default function Scheduling() {
  const { currentUser } = useAuth();
  const { cases, editCase, addAuditLog } = useData();
  const { addNotification } = useNotifications();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [radiographers, setRadiographers] = useState<User[]>([]);
  const [selectedCase, setSelectedCase] = useState<(typeof cases)[number] | null>(null);
  const [form, setForm] = useState({ scheduledAt: '', clinicId: '', radiographerId: '' });
  const [success, setSuccess] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'pending' | 'all'>('pending');

  useEffect(() => {
    getClinics().then(setClinics);
    getUsersByRole('Radiographer').then(setRadiographers);
  }, []);

  const displayed = filterStatus === 'pending'
    ? cases.filter((c) => c.status === 'CREATED')
    : cases.filter((c) => ['CREATED', 'SCHEDULED'].includes(c.status));

  const getRadiographerName = (id?: string) =>
    id ? (radiographers.find((r) => r.id === id)?.name || id) : null;

  const handleSchedule = async () => {
    if (!currentUser || !selectedCase) return;
    const clinic = clinics.find((c) => c.id === form.clinicId);
    const radiographer = radiographers.find((r) => r.id === form.radiographerId);

    // Use DataContext editCase — persists to localStorage and syncs via BroadcastChannel
    await editCase(selectedCase.id, {
      status: 'SCHEDULED',
      scheduledAt: new Date(form.scheduledAt).toISOString(),
      clinicId: form.clinicId || selectedCase.clinicId,
      clinicName: clinic?.name || selectedCase.clinicName,
      radiographerId: form.radiographerId,
      radiographerName: radiographer?.name || '',
    });

    await addAuditLog({
      userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role,
      action: 'CASE_SCHEDULED', target: `cases/${selectedCase.id}`,
      details: `Scheduled ${selectedCase.caseNumber} at ${clinic?.name || selectedCase.clinicName} → ${radiographer?.name || form.radiographerId}`,
      timestamp: new Date().toISOString(),
    });

    addNotification({
      userId: form.radiographerId,
      title: 'New Case Assigned',
      message: `Case ${selectedCase.caseNumber} scheduled for you at ${clinic?.name || selectedCase.clinicName}.`,
      type: 'info',
    });

    setSuccess(true);
    setSelectedCase(null);
    setForm({ scheduledAt: '', clinicId: '', radiographerId: '' });
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Case Scheduling</h1>
          <p className="page-subtitle">Assign radiographers and schedule imaging slots</p>
        </div>
        <button
          onClick={() => setFilterStatus(filterStatus === 'pending' ? 'all' : 'pending')}
          className="btn-secondary text-xs flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {filterStatus === 'pending' ? 'Show Scheduled Too' : 'Show Only Pending'}
        </button>
      </div>

      {success && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg text-sm">
          <CheckCircle className="w-4 h-4" /> Case scheduled and radiographer notified.
        </div>
      )}

      <div className="space-y-3">
        {displayed.map((c) => {
          const assignedName = getRadiographerName(c.radiographerId);
          return (
            <div key={c.id} className="card">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-semibold text-navy-700 font-mono">{c.caseNumber}</span>
                    <StatusBadge status={c.status} />
                    <SeverityBadge severity={c.severity} />
                  </div>
                  <p className="text-sm text-surface-700">Patient: <span className="font-medium">{c.patientName}</span></p>
                  <p className="text-xs text-surface-500">Scan: {c.scanType} &middot; Clinic: {c.clinicName || '—'}</p>
                  {assignedName ? (
                    <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5" /> Assigned to: <span className="font-medium">{assignedName}</span>
                      {c.scheduledAt && ` · ${new Date(c.scheduledAt).toLocaleString()}`}
                    </p>
                  ) : (
                    <p className="text-xs text-amber-500 mt-1">No radiographer assigned yet</p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSelectedCase(c);
                    setForm({
                      scheduledAt: c.scheduledAt ? new Date(c.scheduledAt).toISOString().slice(0, 16) : '',
                      clinicId: c.clinicId || '',
                      radiographerId: c.radiographerId || '',
                    });
                  }}
                  className="btn-primary text-xs flex-shrink-0"
                >
                  {assignedName ? 'Reassign' : 'Schedule'}
                </button>
              </div>
            </div>
          );
        })}
        {displayed.length === 0 && (
          <div className="text-center py-12 text-surface-400 text-sm">
            {filterStatus === 'pending' ? 'All cases have been scheduled ✓' : 'No cases found.'}
          </div>
        )}
      </div>

      <Modal isOpen={!!selectedCase} onClose={() => setSelectedCase(null)} title={`Schedule ${selectedCase?.caseNumber || ''}`}>
        <div className="space-y-4">
          <div className="p-3 bg-surface-100 rounded-lg border border-surface-200 text-sm text-surface-700">
            <p className="font-medium">{selectedCase?.patientName}</p>
            <p className="text-xs text-surface-500 mt-0.5">{selectedCase?.scanType} &middot; {selectedCase?.clinicName}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Date &amp; Time *</label>
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
              {radiographers.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} {r.supportedModalities ? `(${r.supportedModalities.join(', ')})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setSelectedCase(null)} className="btn-secondary">Cancel</button>
            <button onClick={handleSchedule} disabled={!form.scheduledAt || !form.radiographerId} className="btn-primary disabled:opacity-50">
              Confirm
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
