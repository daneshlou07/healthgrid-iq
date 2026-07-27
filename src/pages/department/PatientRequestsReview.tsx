import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ux/Toast';
import { updatePatientRequest, updatePatient } from '../../services/dataService';
import type { PatientRequest } from '../../types';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import { CheckCircle, XCircle, Trash2, Search, Eye } from 'lucide-react';

export default function PatientRequestsReview() {
  const { currentUser } = useAuth();
  const { patientRequests, setPatientRequests, editPatient, addAuditLog } = useData();
  const toast = useToast();
  const [selectedReq, setSelectedReq] = useState<PatientRequest | null>(null);
  const [remarks, setRemarks] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filtered = patientRequests.filter((r) => {
    const matchSearch = r.patientName.toLowerCase().includes(search.toLowerCase()) || r.mrn.toLowerCase().includes(search.toLowerCase()) || r.requestedBy.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const handleDecision = async (decision: 'Approved' | 'Rejected') => {
    if (!currentUser || !selectedReq) return;
    const updated = { status: decision, approverName: currentUser.name, approvedOrRejectedAt: new Date().toISOString(), remarks };
    setPatientRequests((prev) => prev.map((r) => r.id === selectedReq.id ? { ...r, ...updated } : r));
    updatePatientRequest(selectedReq.id, updated).catch(() => {});

    if (decision === 'Approved' && selectedReq.requestType === 'Update') {
      editPatient(selectedReq.patientId, selectedReq.requestedChanges as Record<string, any>);
      updatePatient(selectedReq.patientId, selectedReq.requestedChanges as Record<string, any>).catch(() => {});
    }

    addAuditLog({
      userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role,
      action: `PATIENT_REQUEST_${decision.toUpperCase()}`, target: `patient_requests/${selectedReq.id}`,
      details: `${decision} ${selectedReq.requestType} request for ${selectedReq.patientName} (${selectedReq.mrn})`,
      timestamp: new Date().toISOString(),
    });

    toast.success(`Request ${decision.toLowerCase()} for ${selectedReq.patientName}`);
    setSelectedReq(null); setRemarks('');
  };

  const deleteRequest = async (req: PatientRequest) => {
    if (!currentUser) return;
    if (!confirm(`Delete this ${req.requestType} request for ${req.patientName}?`)) return;
    setPatientRequests((prev) => prev.filter((r) => r.id !== req.id));
    addAuditLog({
      userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role,
      action: 'PATIENT_REQUEST_DELETED', target: `patient_requests/${req.id}`,
      details: `Deleted ${req.requestType} request for ${req.patientName}`,
      timestamp: new Date().toISOString(),
    });
    toast.success('Request deleted');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Patient Requests</h1>
        <p className="page-subtitle">Review, approve, reject, or delete profile update and archive requests</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input type="text" placeholder="Search by patient, MRN, requester..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="select-field w-auto">
          <option value="all">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-200">
              <th className="table-header">Patient</th>
              <th className="table-header">MRN</th>
              <th className="table-header">Type</th>
              <th className="table-header">Requested By</th>
              <th className="table-header">Date</th>
              <th className="table-header">Status</th>
              <th className="table-header text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-200">
            {filtered.map((req) => (
              <tr key={req.id} className="hover:bg-surface-100 transition-colors">
                <td className="table-cell font-medium text-surface-800">{req.patientName}</td>
                <td className="table-cell font-mono text-xs text-navy-600">{req.mrn}</td>
                <td className="table-cell"><span className={req.requestType === 'Update' ? 'badge-info text-[10px]' : 'badge-warning text-[10px]'}>{req.requestType}</span></td>
                <td className="table-cell text-xs text-surface-500">{req.requestedBy}</td>
                <td className="table-cell text-xs text-surface-500">{new Date(req.dateSubmitted).toLocaleDateString()}</td>
                <td className="table-cell"><StatusBadge status={req.status} /></td>
                <td className="table-cell text-right">
                  <div className="flex items-center justify-end gap-1">
                    {req.status === 'Pending' && (
                      <>
                        <button onClick={() => { setSelectedReq(req); setRemarks(''); }} className="p-1.5 text-surface-400 hover:text-navy-600 hover:bg-navy-50 rounded transition-colors" title="Review"><Eye className="w-3.5 h-3.5" /></button>
                        <button onClick={() => { setSelectedReq(req); setRemarks(''); handleDecision('Approved'); }} className="p-1.5 text-surface-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors" title="Quick Approve"><CheckCircle className="w-3.5 h-3.5" /></button>
                        <button onClick={() => { setSelectedReq(req); setRemarks(''); handleDecision('Rejected'); }} className="p-1.5 text-surface-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Quick Reject"><XCircle className="w-3.5 h-3.5" /></button>
                      </>
                    )}
                    <button onClick={() => deleteRequest(req)} className="p-1.5 text-surface-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-10 text-surface-400 text-sm">No requests found.</div>}
      </div>

      {/* Review Modal */}
      <Modal isOpen={!!selectedReq && !['Approved', 'Rejected'].includes(selectedReq?.status || '')} onClose={() => setSelectedReq(null)} title="Review Patient Request">
        {selectedReq && selectedReq.status === 'Pending' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-surface-500 text-xs">Patient</span><p className="text-surface-800 font-medium">{selectedReq.patientName}</p></div>
              <div><span className="text-surface-500 text-xs">MRN</span><p className="text-surface-800 font-mono">{selectedReq.mrn}</p></div>
              <div><span className="text-surface-500 text-xs">Request Type</span><p className="text-surface-800">{selectedReq.requestType}</p></div>
              <div><span className="text-surface-500 text-xs">Requested By</span><p className="text-surface-800">{selectedReq.requestedBy} ({selectedReq.requestedByRole})</p></div>
            </div>
            <div className="p-3 bg-surface-100 rounded-lg border border-surface-200">
              <p className="text-xs text-surface-500 mb-1">Reason</p>
              <p className="text-sm text-surface-700">{selectedReq.reason}</p>
            </div>
            {Object.keys(selectedReq.requestedChanges).length > 0 && (
              <div className="p-3 bg-surface-100 rounded-lg border border-surface-200">
                <p className="text-xs text-surface-500 mb-1">Proposed Changes</p>
                <pre className="text-xs text-navy-600 font-mono whitespace-pre-wrap">{JSON.stringify(selectedReq.requestedChanges, null, 2)}</pre>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Review Remarks</label>
              <textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} className="input-field resize-none text-sm" placeholder="Optional remarks for the requester..." />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => handleDecision('Rejected')} className="btn-danger text-sm flex items-center gap-1.5"><XCircle className="w-4 h-4" /> Reject</button>
              <button onClick={() => handleDecision('Approved')} className="btn-success text-sm flex items-center gap-1.5"><CheckCircle className="w-4 h-4" /> Approve</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
