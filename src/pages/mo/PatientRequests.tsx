import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ux/Toast';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import { Plus, Trash2, Clock, CheckCircle2, XCircle, FileText, Inbox } from 'lucide-react';

type RequestStatusTab = 'Pending' | 'Approved' | 'Rejected' | 'all';

export default function PatientRequests() {
  const { currentUser } = useAuth();
  const { patients, patientRequests, addPatientRequest, deletePatientRequest, addAuditLog } = useData();
  const toast = useToast();
  const [showNew, setShowNew] = useState(false);
  const [statusTab, setStatusTab] = useState<RequestStatusTab>('Pending');
  const [form, setForm] = useState({ patientId: '', requestType: 'Update' as 'Update' | 'Archive', reason: '' });

  const pendingCount = useMemo(() => patientRequests.filter((r) => r.status === 'Pending').length, [patientRequests]);
  const approvedCount = useMemo(() => patientRequests.filter((r) => r.status === 'Approved').length, [patientRequests]);
  const rejectedCount = useMemo(() => patientRequests.filter((r) => r.status === 'Rejected').length, [patientRequests]);
  const allCount = patientRequests.length;

  const displayedRequests = useMemo(() => {
    if (statusTab === 'all') return patientRequests;
    return patientRequests.filter((r) => r.status === statusTab);
  }, [patientRequests, statusTab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    const patient = patients.find((p) => p.id === form.patientId);
    if (!patient) return;

    await addPatientRequest({
      patientId: patient.id,
      patientName: patient.name,
      mrn: patient.mrn,
      requestType: form.requestType,
      requestedBy: currentUser.name,
      requestedById: currentUser.id,
      requestedByRole: currentUser.role,
      dateSubmitted: new Date().toISOString(),
      requestedChanges: {},
      reason: form.reason,
      status: 'Pending',
      remarks: '',
    });

    await addAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'PATIENT_REQUEST_SUBMITTED',
      target: `patient_requests/new`,
      details: `Submitted ${form.requestType} request for ${patient.name}`,
      timestamp: new Date().toISOString(),
    });

    toast.success(`Request submitted for ${patient.name}`);
    setShowNew(false);
    setForm({ patientId: '', requestType: 'Update', reason: '' });
    setStatusTab('Pending');
  };

  const handleDelete = async (req: typeof patientRequests[0]) => {
    if (!window.confirm(`Delete request for ${req.patientName}?`)) return;
    await deletePatientRequest(req.id);
    if (currentUser) {
      await addAuditLog({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'PATIENT_REQUEST_DELETED',
        target: `patient_requests/${req.id}`,
        details: `Deleted ${req.requestType} request for ${req.patientName}`,
        timestamp: new Date().toISOString(),
      });
    }
    toast.success('Request removed');
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="page-title">Patient Record Requests</h1>
          </div>
          <p className="page-subtitle">Request changes to a patient profile or archive a patient record.</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary text-xs flex items-center gap-1.5 self-start sm:self-auto">
          <Plus className="w-4 h-4" />
          <span>New Request</span>
        </button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setStatusTab('Pending')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            statusTab === 'Pending'
              ? 'bg-[#0F4C42] text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Pending Approval</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              statusTab === 'Pending' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
            }`}
          >
            {pendingCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusTab('Approved')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            statusTab === 'Approved'
              ? 'bg-[#0F4C42] text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Approved History</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              statusTab === 'Approved' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {approvedCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusTab('Rejected')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            statusTab === 'Rejected'
              ? 'bg-[#0F4C42] text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <XCircle className="w-3.5 h-3.5" />
          <span>Rejected</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              statusTab === 'Rejected' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-800'
            }`}
          >
            {rejectedCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusTab('all')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            statusTab === 'all'
              ? 'bg-[#0F4C42] text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>All Records</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              statusTab === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}
          >
            {allCount}
          </span>
        </button>
      </div>

      {/* Requests List */}
      <div className="space-y-3">
        {displayedRequests.map((req) => (
          <div key={req.id} className="card p-4 bg-white border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800">
                  {req.requestType} &mdash; <span className="text-navy-900">{req.patientName}</span>
                </span>
                <span className="font-mono text-[10px] text-slate-400">({req.mrn})</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={req.status} />
                <button
                  type="button"
                  onClick={() => handleDelete(req)}
                  className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Delete Request"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <span className="font-bold text-slate-500 mr-1.5">Reason:</span>
              <span>{req.reason || 'No clinical reason provided.'}</span>
            </div>

            {req.remarks && (
              <div className="text-xs text-amber-900 bg-amber-50/70 p-2 rounded-lg border border-amber-200">
                <span className="font-bold mr-1.5">Admin Remarks:</span>
                <span>{req.remarks}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
              <span>Submitted by: <strong>{req.requestedBy || 'Medical Officer'}</strong></span>
              <span>{new Date(req.dateSubmitted).toLocaleString()}</span>
            </div>
          </div>
        ))}

        {displayedRequests.length === 0 && (
          <div className="card p-12 text-center bg-white border border-slate-200 rounded-xl">
            <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
              <Inbox className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-slate-600">
              {statusTab === 'Pending'
                ? 'No pending requests. Active queue is clear.'
                : statusTab === 'Approved'
                ? 'No approved requests in history.'
                : statusTab === 'Rejected'
                ? 'No rejected requests.'
                : 'No patient requests found.'}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Click &quot;New Request&quot; above to submit an update or archiving request.
            </p>
          </div>
        )}
      </div>

      {/* New Request Modal */}
      <Modal isOpen={showNew} onClose={() => setShowNew(false)} title="New Patient Request">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Target Patient *</label>
            <select required value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })} className="select-field text-xs">
              <option value="">Select patient</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.mrn})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Request Type *</label>
            <select
              value={form.requestType}
              onChange={(e) => setForm({ ...form, requestType: e.target.value as 'Update' | 'Archive' })}
              className="select-field text-xs"
            >
              <option value="Update">Update Profile</option>
              <option value="Archive">Archive Record</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Clinical Justification / Reason *</label>
            <textarea
              required
              rows={3}
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className="input-field text-xs resize-none"
              placeholder="State reasons for demographic change or medical record archiving..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowNew(false)} className="btn-secondary text-xs">
              Cancel
            </button>
            <button type="submit" className="btn-primary text-xs">
              Submit Request
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
