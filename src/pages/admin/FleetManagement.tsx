import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ux/Toast';
import { updateMobilePacsVan } from '../../services/dataService';
import type { MobilePacsVan, Clinic, User } from '../../types';
import Modal from '../../components/ui/Modal';
import { Truck, MapPin, Wrench, Plus, Edit2, Trash2, Search, Calendar, AlertCircle } from 'lucide-react';

const EQUIPMENT_OPTIONS = ['X-Ray Unit', 'Portable CT Scanner', 'MRI System', 'Ultrasound Unit', 'Mammography Unit', 'CR System'];
type EquipmentStatus = 'deployed' | 'maintenance' | 'idle';

export default function FleetManagement() {
  const { currentUser } = useAuth();
  const { equipment: vans, setEquipment: setVans, clinics, users: allUsers, softDelete, addAuditLog } = useData();
  const toast = useToast();
  const radiographers = allUsers.filter((u) => u.role === 'Radiographer');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<MobilePacsVan | null>(null);
  const [showRelocate, setShowRelocate] = useState<MobilePacsVan | null>(null);
  const [relocateForm, setRelocateForm] = useState({ clinicId: '', radiographerId: '' });
  const [form, setForm] = useState({
    name: '', plateNumber: '', equipment: [] as string[], status: 'idle' as EquipmentStatus,
    maintenanceDate: '',
  });

  const filtered = vans.filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.plateNumber.toLowerCase().includes(search.toLowerCase()) ||
    v.equipment.join(' ').toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', plateNumber: '', equipment: [], status: 'idle', maintenanceDate: '' });
    setShowModal(true);
  };

  const openEdit = (van: MobilePacsVan) => {
    setEditing(van);
    setForm({ name: van.name, plateNumber: van.plateNumber, equipment: [...van.equipment], status: van.status, maintenanceDate: '' });
    setShowModal(true);
  };

  const toggleEquipment = (eq: string) => {
    setForm((f) => ({ ...f, equipment: f.equipment.includes(eq) ? f.equipment.filter((e) => e !== eq) : [...f.equipment, eq] }));
  };

  const handleSave = async () => {
    if (!currentUser) return;
    if (editing) {
      setVans((prev) => prev.map((v) => v.id === editing.id ? { ...v, name: form.name, plateNumber: form.plateNumber, equipment: form.equipment, status: form.status } : v));
      await addAuditLog({ userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role, action: 'EQUIPMENT_UPDATED', target: `mobile_pacs_vans/${editing.id}`, details: `Updated equipment: ${form.name} (${form.plateNumber})`, timestamp: new Date().toISOString() });
      toast.success(`${form.name} updated`);
    } else {
      const newVan: MobilePacsVan = {
        id: `van-${Date.now()}`, name: form.name, plateNumber: form.plateNumber,
        equipment: form.equipment, status: form.status,
        latitude: 3.0, longitude: 101.5,
      };
      setVans((prev) => [...prev, newVan]);
      await addAuditLog({ userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role, action: 'EQUIPMENT_REGISTERED', target: `mobile_pacs_vans/${newVan.id}`, details: `Registered equipment: ${form.name} (${form.plateNumber})`, timestamp: new Date().toISOString() });
      toast.success(`${form.name} registered`);
    }
    setShowModal(false);
  };

  const handleRelocate = async () => {
    if (!currentUser || !showRelocate) return;
    const clinic = clinics.find((c) => c.id === relocateForm.clinicId);
    const radiographer = radiographers.find((r) => r.id === relocateForm.radiographerId);
    const updates: Partial<MobilePacsVan> = {};
    if (relocateForm.clinicId) { updates.currentClinicId = relocateForm.clinicId; updates.currentClinicName = clinic?.name; updates.latitude = clinic?.latitude || showRelocate.latitude; updates.longitude = clinic?.longitude || showRelocate.longitude; updates.status = 'deployed'; }
    if (relocateForm.radiographerId) { updates.assignedRadiographerId = relocateForm.radiographerId; updates.assignedRadiographerName = radiographer?.name; }
    await updateMobilePacsVan(showRelocate.id, updates);
    setVans((prev) => prev.map((v) => v.id === showRelocate.id ? { ...v, ...updates } : v));
    await addAuditLog({ userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role, action: 'EQUIPMENT_ASSIGNED', target: `mobile_pacs_vans/${showRelocate.id}`, details: `Assigned ${showRelocate.name} to ${clinic?.name || 'location'}${radiographer ? `, operator: ${radiographer.name}` : ''}`, timestamp: new Date().toISOString() });
    toast.success(`${showRelocate.name} assigned`);
    setShowRelocate(null); setRelocateForm({ clinicId: '', radiographerId: '' });
  };

  const setMaintenance = async (van: MobilePacsVan) => {
    if (!currentUser) return;
    const newStatus: EquipmentStatus = van.status === 'maintenance' ? 'idle' : 'maintenance';
    setVans((prev) => prev.map((v) => v.id === van.id ? { ...v, status: newStatus } : v));
    await addAuditLog({ userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role, action: newStatus === 'maintenance' ? 'EQUIPMENT_MAINTENANCE' : 'EQUIPMENT_CLEARED', target: `mobile_pacs_vans/${van.id}`, details: `${van.name} ${newStatus === 'maintenance' ? 'set to maintenance' : 'cleared from maintenance'}`, timestamp: new Date().toISOString() });
    toast.info(`${van.name} ${newStatus === 'maintenance' ? 'set to maintenance' : 'available'}`);
  };

  const deleteVan = async (van: MobilePacsVan) => {
    if (!currentUser) return;
    softDelete('equipment', van.id, currentUser.name);
    await addAuditLog({ userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role, action: 'EQUIPMENT_DELETED', target: `mobile_pacs_vans/${van.id}`, details: `Moved to trash: ${van.name}`, timestamp: new Date().toISOString() });
    toast.success(`${van.name} moved to Recycle Bin`);
  };

  const statusBadge = (s: EquipmentStatus) => s === 'deployed' ? 'badge-success' : s === 'maintenance' ? 'badge-warning' : 'badge-neutral';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Imaging Equipment</h1>
          <p className="page-subtitle">Register, assign, and manage diagnostic equipment fleet</p>
        </div>
        <button onClick={openCreate} className="btn-primary text-sm flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Register Equipment
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
        <input type="text" placeholder="Search equipment..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((van) => (
          <div key={van.id} className="card">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-navy-600" />
                <h3 className="text-sm font-semibold text-navy-700">{van.name}</h3>
              </div>
              <span className={statusBadge(van.status)}>{van.status}</span>
            </div>
            <div className="space-y-1.5 text-xs text-surface-600">
              <p className="font-medium">Plate: {van.plateNumber}</p>
              <p className="flex items-start gap-1.5"><Wrench className="w-3 h-3 text-surface-400 mt-0.5 flex-shrink-0" />{van.equipment.join(', ')}</p>
              <p className="flex items-center gap-1.5"><MapPin className="w-3 h-3 text-surface-400 flex-shrink-0" />{van.currentClinicName || 'Unassigned Outreach'}</p>
              {van.assignedRadiographerName && <p className="text-surface-500 font-medium">Operator: {van.assignedRadiographerName}</p>}
              <div className="pt-1.5 flex items-center justify-between text-[10px]">
                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-mono font-semibold border border-emerald-200">
                  Calibration: OK (30 days)
                </span>
                <span className="text-navy-600 bg-navy-50 px-2 py-0.5 rounded font-mono font-semibold border border-navy-200">
                  Selangor Outreach
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3 pt-3 border-t border-surface-200">
              <button onClick={() => openEdit(van)} className="p-1.5 text-surface-400 hover:text-navy-600 hover:bg-navy-50 rounded transition-colors" title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>
              <button onClick={() => { setShowRelocate(van); setRelocateForm({ clinicId: '', radiographerId: '' }); }} className="p-1.5 text-surface-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors" title="Assign/Relocate"><MapPin className="w-3.5 h-3.5" /></button>
              <button onClick={() => setMaintenance(van)} className="p-1.5 text-surface-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors" title={van.status === 'maintenance' ? 'Clear Maintenance' : 'Set Maintenance'}>
                {van.status === 'maintenance' ? <AlertCircle className="w-3.5 h-3.5" /> : <Calendar className="w-3.5 h-3.5" />}
              </button>
              <button onClick={() => deleteVan(van)} className="p-1.5 text-surface-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))}
      </div>
      {filtered.length === 0 && <div className="text-center py-12 text-surface-400 text-sm">No equipment found.</div>}

      {/* Register/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Equipment' : 'Register Equipment'}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Unit Name *</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" placeholder="e.g., PACS Delta" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Plate Number *</label>
              <input required value={form.plateNumber} onChange={(e) => setForm({ ...form, plateNumber: e.target.value })} className="input-field" placeholder="e.g., WKL 5504" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as EquipmentStatus })} className="select-field">
                <option value="idle">Idle</option>
                <option value="deployed">Deployed</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-2">Equipment Modules *</label>
            <div className="flex flex-wrap gap-2">
              {EQUIPMENT_OPTIONS.map((eq) => (
                <button key={eq} type="button" onClick={() => toggleEquipment(eq)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${form.equipment.includes(eq) ? 'bg-navy-50 border-navy-300 text-navy-700' : 'bg-white border-surface-300 text-surface-600 hover:border-surface-400'}`}
                >{eq}</button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} disabled={!form.name || !form.plateNumber || form.equipment.length === 0} className="btn-primary disabled:opacity-50">
              {editing ? 'Save Changes' : 'Register'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Assign/Relocate Modal */}
      <Modal isOpen={!!showRelocate} onClose={() => setShowRelocate(null)} title={`Assign ${showRelocate?.name || ''}`}>
        <div className="space-y-4">
          <div className="p-3 bg-surface-100 rounded-lg border border-surface-200 text-sm text-surface-700">
            {showRelocate?.name} ({showRelocate?.plateNumber}) — {showRelocate?.equipment.join(', ')}
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Deploy to Healthcare Centre</label>
            <select value={relocateForm.clinicId} onChange={(e) => setRelocateForm({ ...relocateForm, clinicId: e.target.value })} className="select-field">
              <option value="">Select centre...</option>
              {clinics.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Assign Operator</label>
            <select value={relocateForm.radiographerId} onChange={(e) => setRelocateForm({ ...relocateForm, radiographerId: e.target.value })} className="select-field">
              <option value="">Select radiographer...</option>
              {radiographers.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowRelocate(null)} className="btn-secondary">Cancel</button>
            <button onClick={handleRelocate} disabled={!relocateForm.clinicId} className="btn-primary disabled:opacity-50">Deploy & Assign</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
