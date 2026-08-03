import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ux/Toast';
import { useDebounce } from '../../hooks/useDebounce';
import { normalizeNric, formatNric } from '../../utils/malaysianNric';
import type { Patient } from '../../types';
import Modal from '../../components/ui/Modal';
import { Search, Eye, Edit2, Archive, RotateCcw, Download, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { exportToCSV } from '../../utils/exportUtils';
import { Link } from 'react-router-dom';

/** Display helper — formats raw 12-digit NRICs as YYMMDD-PB-#### for readability */
function displayNric(nric: string): string {
  if (!nric) return '—';
  const digits = normalizeNric(nric);
  return digits.length === 12 ? formatNric(digits) : nric;
}

function getInitials(name: string): string {
  if (!name) return 'PT';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarColor(name: string): string {
  const colors = [
    'bg-blue-100 text-blue-700 border-blue-200',
    'bg-emerald-100 text-emerald-700 border-emerald-200',
    'bg-indigo-100 text-indigo-700 border-indigo-200',
    'bg-teal-100 text-teal-700 border-teal-200',
    'bg-purple-100 text-purple-700 border-purple-200',
  ];
  let charSum = 0;
  for (let i = 0; i < name.length; i++) charSum += name.charCodeAt(i);
  return colors[charSum % colors.length];
}

export default function PatientRegistry() {
  const { currentUser } = useAuth();
  const { patients, editPatient, addAuditLog } = useData();
  const toast = useToast();
  const [archived, setArchived] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 180);
  const [showView, setShowView] = useState<Patient | null>(null);
  const [showEdit, setShowEdit] = useState<Patient | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [form, setForm] = useState({
    name: '', phone: '', email: '', address: '', medicalHistory: '', emergencyContact: '',
  });

  const filtered = (showArchived ? archived : patients).filter((p) =>
    p.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    p.mrn.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    p.nric.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    p.address.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  // Pagination bounds
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedPatients = filtered.slice(startIndex, startIndex + pageSize);

  const handleExport = () => {
    exportToCSV(
      filtered.map((p) => ({
        MRN: p.mrn,
        Name: p.name,
        NRIC: displayNric(p.nric),
        Gender: p.gender,
        DOB: p.dob,
        Phone: p.phone,
        Email: p.email || '',
        Address: p.address,
        MedicalHistory: p.medicalHistory ? p.medicalHistory.join('; ') : '',
        AssignedClinic: p.clinicName || '',
      })),
      showArchived ? 'HealthGrid_Archived_Patients' : 'HealthGrid_Patients_Registry'
    );
    toast.success(`Exported ${filtered.length} patient records to CSV`);
  };

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
    const updates = {
      name: form.name, phone: form.phone, email: form.email, address: form.address,
      medicalHistory: form.medicalHistory.split(',').map((s) => s.trim()).filter(Boolean),
      emergencyContact: form.emergencyContact || undefined,
    };
    await editPatient(showEdit.id, updates);
    await addAuditLog({ userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role, action: 'PATIENT_UPDATED', target: `patients/${showEdit.id}`, details: `Updated patient: ${form.name} (${showEdit.mrn})`, timestamp: new Date().toISOString() });
    toast.success(`${form.name} updated`);
    setShowEdit(null);
  };

  const archivePatient = async (patient: Patient) => {
    if (!currentUser) return;
    if (!confirm(`Archive ${patient.name}? They can be restored later.`)) return;
    setArchived((prev) => [...prev, patient]);
    await addAuditLog({ userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role, action: 'PATIENT_ARCHIVED', target: `patients/${patient.id}`, details: `Archived patient: ${patient.name} (${patient.mrn})`, timestamp: new Date().toISOString() });
    toast.info(`${patient.name} archived`);
  };

  const restorePatient = async (patient: Patient) => {
    if (!currentUser) return;
    setArchived((prev) => prev.filter((t) => t.id !== patient.id));
    await addAuditLog({ userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role, action: 'PATIENT_RESTORED', target: `patients/${patient.id}`, details: `Restored patient: ${patient.name} (${patient.mrn})`, timestamp: new Date().toISOString() });
    toast.success(`${patient.name} restored`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-surface-200">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-navy-900 tracking-tight">Patient Registry</h1>
            <span className="px-2 py-0.5 bg-navy-50 text-navy-700 border border-navy-200 font-mono text-[11px] font-bold rounded-md">
              MASTER REGISTRY
            </span>
          </div>
          <p className="text-xs text-surface-500 mt-1">
            {patients.length} active patient records &middot; Search, edit, and manage clinical patient demographics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="btn-secondary text-xs flex items-center gap-1.5 py-2">
            <Download className="w-3.5 h-3.5" /> Export (CSV)
          </button>
          <button
            onClick={() => {
              setShowArchived(!showArchived);
              setCurrentPage(1);
            }}
            className={`text-xs flex items-center gap-1.5 px-3 py-2 rounded-lg border font-semibold transition-colors ${
              showArchived ? 'bg-amber-50 border-amber-300 text-amber-700' : 'btn-secondary'
            }`}
          >
            <Archive className="w-3.5 h-3.5" /> {showArchived ? `Archived (${archived.length})` : 'View Archived'}
          </button>
        </div>
      </div>

      {/* Toolbar Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
        <input
          type="text"
          placeholder="Search patient by name, MRN, NRIC, or address..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full bg-white border border-surface-300 rounded-lg pl-9 pr-8 py-2 text-xs text-surface-800 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-navy-200 focus:border-navy-500"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Table Card (Soft Sage Green Style) */}
      <div className="bg-[#FAFCFB] border border-[#D8E5E1] rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#E6F0ED] border-b border-[#D8E5E1] text-[11px] font-semibold text-[#2C524B] uppercase tracking-wider">
                <th className="py-3 px-4">Patient</th>
                <th className="py-3 px-4">MRN</th>
                <th className="py-3 px-4">NRIC</th>
                <th className="py-3 px-4">Gender</th>
                <th className="py-3 px-4">DOB</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Address</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6F0ED] text-xs text-[#112A28]">
              {paginatedPatients.map((p) => {
                const avatarStyle = getAvatarColor(p.name);
                const initials = getInitials(p.name);

                return (
                  <tr key={p.id} className="hover:bg-[#E2EEEB] transition-colors">
                    {/* Patient Name with Avatar */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-full border flex items-center justify-center font-bold text-xs shrink-0 ${avatarStyle}`}>
                          {initials}
                        </div>
                        <div>
                          <Link to={`/patient/${p.id}`} className="font-semibold text-surface-900 hover:text-[#0F4C42] hover:underline block text-xs">
                            {p.name}
                          </Link>
                        </div>
                      </div>
                    </td>

                    {/* MRN */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <Link to={`/patient/${p.id}`} className="font-semibold text-[#0F4C42] hover:underline text-xs">
                        {p.mrn}
                      </Link>
                    </td>

                    {/* NRIC */}
                    <td className="py-3.5 px-4 text-xs text-surface-600 whitespace-nowrap font-medium">{displayNric(p.nric)}</td>

                    {/* Gender */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-100 text-surface-700">
                        {p.gender}
                      </span>
                    </td>

                    {/* DOB */}
                    <td className="py-3.5 px-4 text-xs text-surface-600 whitespace-nowrap font-medium">{p.dob}</td>

                    {/* Contact */}
                    <td className="py-3.5 px-4 text-xs text-surface-600 whitespace-nowrap font-medium">
                      <div>{p.phone}</div>
                      {p.email && <div className="text-[11px] text-surface-400 truncate">{p.email}</div>}
                    </td>

                    {/* Address */}
                    <td className="py-3.5 px-4 text-xs text-surface-600 max-w-[180px] truncate font-medium" title={p.address}>
                      {p.address}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setShowView(p)}
                          className="p-1.5 text-surface-400 hover:text-navy-600 hover:bg-navy-50 rounded transition-colors"
                          title="Quick View"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {!showArchived && (
                          <button
                            onClick={() => openEdit(p)}
                            className="p-1.5 text-surface-400 hover:text-navy-600 hover:bg-navy-50 rounded transition-colors"
                            title="Edit Record"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {!showArchived ? (
                          <button
                            onClick={() => archivePatient(p)}
                            className="p-1.5 text-surface-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Archive Patient"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => restorePatient(p)}
                            className="p-1.5 text-surface-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                            title="Restore Patient"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-surface-400 text-xs">
            No patient records found matching query.
          </div>
        )}

        {/* Pagination Footer */}
        {filtered.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-surface-50 border-t border-surface-200 text-xs text-surface-600">
            <div>
              Showing <span className="font-semibold text-surface-800">{startIndex + 1}</span> to{' '}
              <span className="font-semibold text-surface-800">
                {Math.min(startIndex + pageSize, totalItems)}
              </span>{' '}
              of <span className="font-semibold text-surface-800">{totalItems}</span> patients
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="text-surface-500">Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-surface-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-navy-500"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  className="p-1 rounded border border-surface-300 bg-white hover:bg-surface-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 font-medium">
                  {currentPage} / {totalPages}
                </span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  className="p-1 rounded border border-surface-300 bg-white hover:bg-surface-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals for View & Edit */}
      {showView && (
        <Modal isOpen={!!showView} onClose={() => setShowView(null)} title={`Patient Profile — ${showView.name}`}>
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 bg-surface-50 rounded-lg">
              <div><span className="text-surface-500 block">MRN</span><span className="font-mono font-bold text-navy-700">{showView.mrn}</span></div>
              <div><span className="text-surface-500 block">NRIC</span><span className="font-mono">{displayNric(showView.nric)}</span></div>
              <div><span className="text-surface-500 block">Gender</span><span>{showView.gender}</span></div>
              <div><span className="text-surface-500 block">DOB</span><span>{showView.dob}</span></div>
              <div><span className="text-surface-500 block">Phone</span><span>{showView.phone}</span></div>
              <div><span className="text-surface-500 block">Email</span><span>{showView.email || '—'}</span></div>
            </div>
            <div><span className="text-surface-500 block">Address</span><span>{showView.address}</span></div>
            {showView.medicalHistory?.length > 0 && (
              <div>
                <span className="text-surface-500 block mb-1">Medical History</span>
                <div className="flex flex-wrap gap-1">
                  {showView.medicalHistory.map((h, i) => (
                    <span key={i} className="px-2 py-0.5 bg-surface-100 border rounded text-[10px] font-medium">{h}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {showEdit && (
        <Modal isOpen={!!showEdit} onClose={() => setShowEdit(null)} title={`Edit Patient — ${showEdit.name}`}>
          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-surface-600 mb-1">Full Name</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-surface-600 mb-1">Phone</label>
                <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="block text-surface-600 mb-1">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" />
              </div>
            </div>
            <div>
              <label className="block text-surface-600 mb-1">Address</label>
              <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-surface-600 mb-1">Medical History (comma separated)</label>
              <input type="text" value={form.medicalHistory} onChange={(e) => setForm({ ...form, medicalHistory: e.target.value })} className="input-field" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowEdit(null)} className="btn-secondary text-xs">Cancel</button>
              <button onClick={handleSave} className="btn-primary text-xs">Save Changes</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
