import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ux/Toast';
import type { Clinic } from '../../types';
import Modal from '../../components/ui/Modal';
import { MapPin, Phone, Mail, Plus, Edit2, Trash2, ShieldCheck, ShieldOff, Search } from 'lucide-react';

const MODALITIES = ['X-Ray', 'CT', 'MRI', 'Ultrasound', 'Mammography', 'Fluoroscopy'];

export default function ClinicsManagement() {
  const { currentUser } = useAuth();
  const { clinics, setClinics, softDelete, addAuditLog } = useData();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Clinic | null>(null);
  const [form, setForm] = useState({
    name: '', address: '', phone: '', email: '',
    latitude: '', longitude: '', modalities: [] as string[],
    operatingHours: '08:00 – 17:00',
  });

  const filtered = clinics.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.address.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', address: '', phone: '', email: '', latitude: '', longitude: '', modalities: [], operatingHours: '08:00 – 17:00' });
    setShowModal(true);
  };

  const openEdit = (clinic: Clinic) => {
    setEditing(clinic);
    setForm({
      name: clinic.name, address: clinic.address, phone: clinic.phone, email: clinic.email,
      latitude: String(clinic.latitude), longitude: String(clinic.longitude),
      modalities: [], operatingHours: '08:00 – 17:00',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!currentUser) return;
    if (editing) {
      setClinics((prev) => prev.map((c) => c.id === editing.id ? {
        ...c, name: form.name, address: form.address, phone: form.phone, email: form.email,
        latitude: parseFloat(form.latitude) || c.latitude, longitude: parseFloat(form.longitude) || c.longitude,
      } : c));
      await addAuditLog({ userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role, action: 'CLINIC_UPDATED', target: `clinics/${editing.id}`, details: `Updated clinic: ${form.name}`, timestamp: new Date().toISOString() });
      toast.success(`${form.name} updated`);
    } else {
      const newClinic: Clinic = {
        id: `clinic-${Date.now()}`, name: form.name, address: form.address,
        phone: form.phone, email: form.email,
        latitude: parseFloat(form.latitude) || 3.0, longitude: parseFloat(form.longitude) || 101.5,
        status: 'active',
      };
      setClinics((prev) => [...prev, newClinic]);
      await addAuditLog({ userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role, action: 'CLINIC_CREATED', target: `clinics/${newClinic.id}`, details: `Created clinic: ${form.name}`, timestamp: new Date().toISOString() });
      toast.success(`${form.name} created`);
    }
    setShowModal(false);
  };

  const toggleStatus = async (clinic: Clinic) => {
    if (!currentUser) return;
    const newStatus = clinic.status === 'active' ? 'inactive' : 'active';
    setClinics((prev) => prev.map((c) => c.id === clinic.id ? { ...c, status: newStatus } : c));
    await addAuditLog({ userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role, action: newStatus === 'active' ? 'CLINIC_ACTIVATED' : 'CLINIC_DEACTIVATED', target: `clinics/${clinic.id}`, details: `${newStatus === 'active' ? 'Activated' : 'Deactivated'} clinic: ${clinic.name}`, timestamp: new Date().toISOString() });
    toast.info(`${clinic.name} ${newStatus}`);
  };

  const deleteClinic = async (clinic: Clinic) => {
    if (!currentUser) return;
    softDelete('clinic', clinic.id, currentUser.name);
    await addAuditLog({ userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role, action: 'CLINIC_DELETED', target: `clinics/${clinic.id}`, details: `Moved to trash: ${clinic.name}`, timestamp: new Date().toISOString() });
    toast.success(`${clinic.name} moved to Recycle Bin`);
  };

  const toggleModality = (mod: string) => {
    setForm((f) => ({
      ...f,
      modalities: f.modalities.includes(mod) ? f.modalities.filter((m) => m !== mod) : [...f.modalities, mod],
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Clinic Management</h1>
          <p className="page-subtitle">Create, edit, and manage healthcare centres</p>
        </div>
        <button onClick={openCreate} className="btn-primary text-sm flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Add Clinic
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
        <input type="text" placeholder="Search clinics..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map((clinic) => (
          <div key={clinic.id} className="card">
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-sm font-semibold text-navy-700">{clinic.name}</h3>
              <span className={clinic.status === 'active' ? 'badge-success' : 'badge-error'}>{clinic.status}</span>
            </div>
            <div className="space-y-1.5 text-xs text-surface-600">
              <div className="flex items-start gap-2"><MapPin className="w-3.5 h-3.5 text-surface-400 mt-0.5 flex-shrink-0" />{clinic.address}</div>
              <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-surface-400 flex-shrink-0" />{clinic.phone}</div>
              <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-surface-400 flex-shrink-0" />{clinic.email}</div>
              <div className="text-[10px] text-surface-400 pt-1">Lat: {clinic.latitude.toFixed(4)}, Lon: {clinic.longitude.toFixed(4)}</div>
            </div>
            <div className="flex items-center gap-1 mt-3 pt-3 border-t border-surface-200">
              <button onClick={() => openEdit(clinic)} className="p-1.5 text-surface-400 hover:text-navy-600 hover:bg-navy-50 rounded transition-colors" title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>
              <button onClick={() => toggleStatus(clinic)} className="p-1.5 text-surface-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors" title={clinic.status === 'active' ? 'Deactivate' : 'Activate'}>
                {clinic.status === 'active' ? <ShieldOff className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
              </button>
              <button onClick={() => deleteClinic(clinic)} className="p-1.5 text-surface-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))}
      </div>
      {filtered.length === 0 && <div className="text-center py-12 text-surface-400 text-sm">No clinics found.</div>}

      {/* Create/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Clinic' : 'Add Healthcare Centre'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-surface-700 mb-1">Clinic Name *</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" placeholder="e.g., Hospital Tanjong Karang" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-surface-700 mb-1">Address *</label>
              <input required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input-field" placeholder="Full address" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Phone *</label>
              <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field" placeholder="+60 3-XXXX-XXXX" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Email *</label>
              <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" placeholder="clinic@moh.gov.my" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Latitude</label>
              <input type="number" step="0.0001" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} className="input-field" placeholder="e.g., 3.4242" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Longitude</label>
              <input type="number" step="0.0001" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} className="input-field" placeholder="e.g., 101.1824" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Operating Hours</label>
              <input value={form.operatingHours} onChange={(e) => setForm({ ...form, operatingHours: e.target.value })} className="input-field" placeholder="08:00 – 17:00" />
            </div>
          </div>

          {/* Modalities */}
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-2">Imaging Modalities</label>
            <div className="flex flex-wrap gap-2">
              {MODALITIES.map((mod) => (
                <button
                  key={mod} type="button" onClick={() => toggleModality(mod)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    form.modalities.includes(mod) ? 'bg-navy-50 border-navy-300 text-navy-700' : 'bg-white border-surface-300 text-surface-600 hover:border-surface-400'
                  }`}
                >
                  {mod}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} disabled={!form.name || !form.address || !form.phone || !form.email} className="btn-primary disabled:opacity-50">
              {editing ? 'Save Changes' : 'Create Clinic'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
