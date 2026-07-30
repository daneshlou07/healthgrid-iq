import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ux/Toast';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import { Plus } from 'lucide-react';

export default function PatientRequests() {
  const { currentUser } = useAuth();
  const { patients, patientRequests, addPatientRequest, addAuditLog } = useData();
  const toast = useToast();
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ patientId: '', requestType: 'Update' as 'Update' | 'Archive', reason: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    const patient = patients.find((p) => p.id === form.patientId);
    if (!patient) return;

    await addPatientRequest({
      patientId: patient.id, patientName: patient.name, mrn: patient.mrn,
      requestType: form.requestType, requestedBy: currentUser.name,
      requestedById: currentUser.id, requestedByRole: currentUser.role,
      dateSubmitted: new Date().toISOString(),
      requestedChanges: {},
      reason: form.reason, status: 'Pending', remarks: '',
    });

    await addAuditLog({
      userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role,
      action: 'PATIENT_REQUEST_SUBMITTED', target: `patient_requests/new`,
      details: `Submitted ${form.requestType} request for ${patient.name}`,
      timestamp: new Date().toISOString(),
    });

    toast.success(`Request submitted for ${patient.name}`);
    setShowNew(false);
    setForm({ patientId: '', requestType: 'Update', reason: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="page-title">Medical Officer Patient Record Requests</h1>
            <span className="badge-purple font-mono text-xs font-bold">MO INTAKE</span>
          </div>
          <p className="page-subtitle">Submit patient demographic update or record archiving requests for administrative approval.</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary text-sm">
          <Plus className="w-4 h-4 inline mr-1" /> New Request
        </button>
      </div>

      <div className="space-y-3">
        {patientRequests.map((req) => (
          <div key={req.id} className="card">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-navy-700">{req.requestType} — {req.patientName}</h3>
              <StatusBadge status={req.status} />
            </div>
            <p className="text-xs text-surface-500">MRN: {req.mrn} &middot; Reason: {req.reason}</p>
            <p className="text-xs text-surface-400 mt-1">Submitted: {new Date(req.dateSubmitted).toLocaleString()}</p>
          </div>
        ))}
        {patientRequests.length === 0 && <div className="text-center py-12 text-surface-400 text-sm">No requests submitted.</div>}
      </div>

      <Modal isOpen={showNew} onClose={() => setShowNew(false)} title="New Patient Request">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Patient *</label>
            <select required value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })} className="select-field">
              <option value="">Select patient</option>
              {patients.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.mrn})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Request Type *</label>
            <select value={form.requestType} onChange={(e) => setForm({ ...form, requestType: e.target.value as 'Update' | 'Archive' })} className="select-field">
              <option value="Update">Update Profile</option>
              <option value="Archive">Archive Record</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Reason *</label>
            <textarea required rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="input-field resize-none" placeholder="Clinical justification for this request..." />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowNew(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Submit Request</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
