import React, { useEffect, useState } from 'react';
import { getPatients, createAuditLog } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ux/Toast';
import type { Patient, Gender } from '../../types';
import Modal from '../../components/ui/Modal';
import { Search, Eye, Edit2, Archive, RotateCcw, Plus } from 'lucide-react';

export default function PatientRegistry() {
  const { currentUser } = useAuth();
  const toast = useToast();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [archived, setArchived] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [showView, setShowView] = useState<Patient | null>(null);
  const [showEdit, setShowEdit] = useState<Patient | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [form, setForm] = useState({
    name: '', phone: '', email: '', address: '', medicalHistory: '', emergencyContact: '',
  });

  useEffect(() => { getPatients().then(setPatients); }, []);

  const filtered = (showArchived ? archived : patients).filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.mrn.toLowerCase().includes(search.toLowerCase()) ||
    p.nric.toLowerCase().includes(search.toLowerCase()) ||
    p.address.toLowerCase().includes(search.toLowerCase())
  );

  const openEdit = (patient: Patient) => {
    setShowEdit(patient);
    setForm({
      name: patient.name, phone: patient.phone, email: patient.email,
      address: patient.address, medicalHistory: patient.medicalHistory.join(', '),
      emergencyContact: patient.emergencyContact || '',
    });
  };

  const handleSave = async () => {
    if (!currentUser || !showEdit) return;
    setPatients((prev) => prev.map((p) => p.id === showEdit.id ? {
      ...p, name: form.name, phone: form.phone, email: form.email, address: form.address,
      medicalHistory: form.medicalHistory.split(',').map((s) => s.trim()).filter(Boolean),
      emergencyContact: form.emergencyContact || undefined,
    } : p));
    await createAuditLog({ userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role, action: 'PATIENT_UPDATED', target: `patients/${showEdit.id}`, details: `Updated patient: ${form.name} (${showEdit.mrn})`, timestamp: new Date().toISOString() });
    toast.success(`${form.name} updated`);
    setShowEdit(null);
  };

  const archivePatient = async (patient: Patient) => {
    if (!currentUser) return;
    if (!confirm(`Archive ${patient.name}? They can be restored later.`)) return;
    setPatients((prev) => prev.filter((p) => p.id !== patient.id));
    setArchived((prev) => [...prev, patient]);
    await createAuditLog({ userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role, action: 'PATIENT_ARCHIVED', target: `patients/${patient.id}`, details: `Archived patient: ${patient.name} (${patient.mrn})`, timestamp: new Date().toISOString() });
    toast.info(`${patient.name} archived`);
  };

  const restorePatient = async (patient: Patient) => {
    if (!currentUser) return;
    setArchived((prev) => prev.filter((p) => p.id !== patient.id));
    setPatients((prev) => [...prev, patient]);
    await createAuditLog({ userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role, action: 'PATIENT_RESTORED', target: `patients/${patient.id}`, details: `Restored patient: ${patient.name} (${patient.mrn})`, timestamp: new Date().toISOString() });
    toast.success(`${patient.name} restored`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Patient Registry</h1>
          <p className="page-subtitle">View, edit, archive, and restore patient records</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`text-sm flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-colors ${showArchived ? 'bg-amber-50 border-amber-300 text-amber-700' : 'btn-secondary'}`}
          >
            <Archive className="w-4 h-4" /> {showArchived ? `Archived (${archived.length})` : 'View Archived'}
          </button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
        <input type="text" placeholder="Search by name, MRN, NRIC, address..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" />
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-surface-500">
        <span>{patients.length} active records</span>
        <span>&middot;</span>
        <span>{archived.length} archived</span>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-200">
                <th className="table-header">Name</th>
                <th className="table-header">MRN</th>
                <th className="table-header">NRIC</th>
                <th className="table-header">Gender</th>
                <th className="table-header">DOB</th>
                <th className="table-header">Phone</th>
                <th className="table-header">Address</th>
                <th className="table-header text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-surface-100 transition-colors">
                  <td className="table-cell font-medium text-surface-800">{p.name}</td>
                  <td className="table-cell font-mono text-xs text-navy-600">{p.mrn}</td>
                  <td className="table-cell text-xs text-surface-500">{p.nric}</td>
                  <td className="table-cell"><span className="badge-info text-[10px]">{p.gender}</span></td>
                  <td className="table-cell text-xs text-surface-500">{p.dob}</td>
                  <td className="table-cell text-xs text-surface-500">{p.phone}</td>
                  <td className="table-cell text-xs text-surface-500 max-w-[180px] truncate">{p.address}</td>
                  <td className="table-cell text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setShowView(p)} className="p-1.5 text-surface-400 hover:text-navy-600 hover:bg-navy-50 rounded transition-colors" title="View"><Eye className="w-3.5 h-3.5" /></button>
                      {!showArchived && <button onClick={() => openEdit(p)} className="p-1.5 text-surface-400 hover:text-navy-600 hover:bg-navy-50 rounded transition-colors" title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>}
                      {!showArchived ? (
                        <button onClick={() => archivePatient(p)} className="p-1.5 text-surface-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors" title="Archive"><Archive className="w-3.5 h-3.5" /></button>
                      ) : (
                        <button onClick={() => restorePatient(p)} className="p-1.5 text-surface-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors" title="Restore"><RotateCcw className="w-3.5 h-3.5" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="text-center py-10 text-surface-400 text-sm">{showArchived ? 'No archived patients.' : 'No patients found.'}</div>}
      </div>

      {/* View Modal */}
      <Modal isOpen={!!showView} onClose={() => setShowView(null)} title={`Patient: ${showView?.name || ''}`} size="lg">
        {showView && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-surface-500 text-xs">Full Name</span><p className="text-surface-800 font-medium">{showView.name}</p></div>
              <div><span className="text-surface-500 text-xs">MRN</span><p className="text-navy-600 font-mono">{showView.mrn}</p></div>
              <div><span className="text-surface-500 text-xs">NRIC</span><p className="text-surface-800">{showView.nric}</p></div>
              <div><span className="text-surface-500 text-xs">Gender</span><p className="text-surface-800">{showView.gender}</p></div>
              <div><span className="text-surface-500 text-xs">Date of Birth</span><p className="text-surface-800">{showView.dob}</p></div>
              <div><span className="text-surface-500 text-xs">Phone</span><p className="text-surface-800">{showView.phone}</p></div>
              <div className="col-span-2"><span className="text-surface-500 text-xs">Email</span><p className="text-surface-800">{showView.email || '—'}</p></div>
              <div className="col-span-2"><span className="text-surface-500 text-xs">Address</span><p className="text-surface-800">{showView.address}</p></div>
              <div className="col-span-2"><span className="text-surface-500 text-xs">Medical History</span><p className="text-surface-800">{showView.medicalHistory.length > 0 ? showView.medicalHistory.join(', ') : '—'}</p></div>
              {showView.emergencyContact && <div className="col-span-2"><span className="text-surface-500 text-xs">Emergency Contact</span><p className="text-surface-800">{showView.emergencyContact}</p></div>}
              {showView.preferredClinicName && <div className="col-span-2"><span className="text-surface-500 text-xs">Preferred Centre</span><p className="text-surface-800">{showView.preferredClinicName}</p></div>}
              {showView.clinicName && <div className="col-span-2"><span className="text-surface-500 text-xs">Assigned Centre</span><p className="text-emerald-600 font-medium">{showView.clinicName}</p></div>}
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!showEdit} onClose={() => setShowEdit(null)} title={`Edit: ${showEdit?.name || ''}`}>
        <div className="space-y-4">
          <div className="p-3 bg-surface-100 rounded-lg border border-surface-200 text-xs text-surface-500">
            MRN: {showEdit?.mrn} &middot; NRIC: {showEdit?.nric} &middot; DOB: {showEdit?.dob} — These fields are read-only.
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-surface-700 mb-1">Full Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Phone</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Email</label>
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-surface-700 mb-1">Address</label>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input-field" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-surface-700 mb-1">Medical History (comma-separated)</label>
              <textarea rows={2} value={form.medicalHistory} onChange={(e) => setForm({ ...form, medicalHistory: e.target.value })} className="input-field resize-none" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-surface-700 mb-1">Emergency Contact</label>
              <input value={form.emergencyContact} onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })} className="input-field" placeholder="Name — Relationship — Phone" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowEdit(null)} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} className="btn-primary">Save Changes</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
