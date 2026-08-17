import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ux/Toast';
import type { Clinic } from '../../types';
import Modal from '../../components/ui/Modal';
import { PredictiveAddressInput } from '../../components/ui/PredictiveAddressInput';
import { saveClinic } from '../../services/dataService';
import {
  MapPin,
  Phone,
  Mail,
  Plus,
  Edit2,
  Trash2,
  ShieldCheck,
  ShieldOff,
  Search,
  AlertTriangle,
  Sparkles,
  ClipboardPaste,
  ExternalLink,
  Compass,
  Printer,
} from 'lucide-react';

const MODALITIES = ['X-Ray', 'CT', 'MRI', 'Ultrasound', 'Mammography', 'Fluoroscopy'];

/**
 * Robust Google Maps & standard coordinate parser.
 * Preserves the EXACT full-precision strings as copied from Google Maps.
 */
function parseCoordinatePair(raw: string): { latStr: string; lonStr: string; lat: number; lon: number } | null {
  if (!raw) return null;
  const trimmed = raw.trim();

  // 1. Google Maps URL pattern: /@3.425957,101.178600, or ?q=3.425957,101.178600 or &ll=3.425957,101.178600
  const urlMatch = trimmed.match(/[@?&](?:q=|ll=)?(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/);
  if (urlMatch) {
    const lat = parseFloat(urlMatch[1]);
    const lon = parseFloat(urlMatch[2]);
    if (!isNaN(lat) && !isNaN(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      return { latStr: urlMatch[1], lonStr: urlMatch[2], lat, lon };
    }
  }

  // 2. Comma/space/tab separated coordinates: e.g. "3.425956609242111, 101.17859962394074"
  const pairMatch = trimmed.match(/^(-?\d+(?:\.\d+)?)[,\s\t]+(-?\d+(?:\.\d+)?)$/);
  if (pairMatch) {
    const lat = parseFloat(pairMatch[1]);
    const lon = parseFloat(pairMatch[2]);
    if (!isNaN(lat) && !isNaN(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      return { latStr: pairMatch[1], lonStr: pairMatch[2], lat, lon };
    }
  }

  return null;
}

export default function ClinicsManagement() {
  const { currentUser } = useAuth();
  const { clinics, setClinics, softDelete, addAuditLog } = useData();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Clinic | null>(null);
  const [deletingClinic, setDeletingClinic] = useState<Clinic | null>(null);
  const [rawCoordinates, setRawCoordinates] = useState('');
  const [form, setForm] = useState({
    name: '', address: '', phone: '', fax: '', email: '',
    latitude: '', longitude: '', modalities: [] as string[],
    operatingHours: '08:00 – 17:00',
  });

  const filtered = clinics.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.address.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditing(null);
    setRawCoordinates('');
    setForm({ name: '', address: '', phone: '', fax: '', email: '', latitude: '', longitude: '', modalities: [], operatingHours: '08:00 – 17:00' });
    setShowModal(true);
  };

  const openEdit = (clinic: Clinic) => {
    setEditing(clinic);
    const coords = clinic.latitude && clinic.longitude ? `${clinic.latitude}, ${clinic.longitude}` : '';
    setRawCoordinates(coords);
    setForm({
      name: clinic.name, address: clinic.address, phone: clinic.phone, fax: clinic.fax || '', email: clinic.email,
      latitude: String(clinic.latitude), longitude: String(clinic.longitude),
      modalities: [], operatingHours: clinic.operatingHours || '08:00 – 17:00',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!currentUser) return;
    if (editing) {
      const updated: Clinic = {
        ...editing, name: form.name, address: form.address, phone: form.phone, fax: form.fax, email: form.email,
        operatingHours: form.operatingHours,
        latitude: parseFloat(form.latitude) || editing.latitude, longitude: parseFloat(form.longitude) || editing.longitude,
      };
      setClinics((prev) => prev.map((c) => c.id === editing.id ? updated : c));
      await saveClinic(updated);
      await addAuditLog({ userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role, action: 'CLINIC_UPDATED', target: `clinics/${editing.id}`, details: `Updated clinic: ${form.name}`, timestamp: new Date().toISOString() });
      toast.success(`${form.name} updated`);
    } else {
      const newClinic: Clinic = {
        id: `clinic-${Date.now()}`, name: form.name, address: form.address,
        phone: form.phone, fax: form.fax, email: form.email,
        operatingHours: form.operatingHours,
        latitude: parseFloat(form.latitude) || 3.0, longitude: parseFloat(form.longitude) || 101.5,
        status: 'active',
      };
      setClinics((prev) => [...prev, newClinic]);
      await saveClinic(newClinic);
      await addAuditLog({ userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role, action: 'CLINIC_CREATED', target: `clinics/${newClinic.id}`, details: `Created clinic: ${form.name}`, timestamp: new Date().toISOString() });
      toast.success(`${form.name} created`);
    }
    setShowModal(false);
  };

  const toggleStatus = async (clinic: Clinic) => {
    if (!currentUser) return;
    const newStatus = clinic.status === 'active' ? 'inactive' : 'active';
    const updated: Clinic = { ...clinic, status: newStatus };
    setClinics((prev) => prev.map((c) => c.id === clinic.id ? updated : c));
    await saveClinic(updated);
    await addAuditLog({ userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role, action: newStatus === 'active' ? 'CLINIC_ACTIVATED' : 'CLINIC_DEACTIVATED', target: `clinics/${clinic.id}`, details: `${newStatus === 'active' ? 'Activated' : 'Deactivated'} clinic: ${clinic.name}`, timestamp: new Date().toISOString() });
    toast.info(`${clinic.name} ${newStatus}`);
  };

  const confirmDeleteClinic = async (clinic: Clinic) => {
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
          <h1 className="page-title">Healthcare Management</h1>
          <p className="page-subtitle">Manage healthcare facilities, locations, and operational status.</p>
        </div>
        <button onClick={openCreate} className="btn-primary text-sm flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Add Healthcare Center
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
        <input type="text" placeholder="Search clinics..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((clinic) => (
          <div key={clinic.id} className="card">
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-sm font-semibold text-navy-700">{clinic.name}</h3>
              <span className={clinic.status === 'active' ? 'badge-success' : 'badge-error'}>{clinic.status}</span>
            </div>
            <div className="space-y-1.5 text-xs text-surface-600">
              <div className="flex items-start gap-2"><MapPin className="w-3.5 h-3.5 text-surface-400 mt-0.5 flex-shrink-0" />{clinic.address}</div>
              <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-surface-400 flex-shrink-0" /><span>Tel: {clinic.phone}</span></div>
              {clinic.fax && (
                <div className="flex items-center gap-2"><Printer className="w-3.5 h-3.5 text-surface-400 flex-shrink-0" /><span>Faks: {clinic.fax}</span></div>
              )}
              {clinic.email && (
                <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-surface-400 flex-shrink-0" /><span>{clinic.email}</span></div>
              )}
              <div className="text-[10px] text-surface-400 pt-1">Lat: {clinic.latitude.toFixed(4)}, Lon: {clinic.longitude.toFixed(4)}</div>
            </div>
            <div className="flex items-center gap-1 mt-3 pt-3 border-t border-surface-200">
              <button onClick={() => openEdit(clinic)} className="p-1.5 text-surface-400 hover:text-navy-600 hover:bg-navy-50 rounded transition-colors" title="Edit Clinic"><Edit2 className="w-3.5 h-3.5" /></button>
              <button onClick={() => toggleStatus(clinic)} className="p-1.5 text-surface-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors" title={clinic.status === 'active' ? 'Deactivate Clinic' : 'Activate Clinic'}>
                {clinic.status === 'active' ? <ShieldOff className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
              </button>
              <button onClick={() => setDeletingClinic(clinic)} className="p-1.5 text-surface-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete Clinic"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))}
      </div>
      {filtered.length === 0 && <div className="text-center py-12 text-surface-400 text-sm">No clinics found.</div>}

      {/* Create/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Healthcare Centre' : 'Add Healthcare Centre'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-surface-700 mb-1">Healthcare Center Name *</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" placeholder="e.g., Hospital Tanjong Karang" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-surface-700 mb-1">Address *</label>
              <PredictiveAddressInput
                required
                value={form.address}
                onChange={(addressValue, details) => {
                  setForm(prev => ({
                    ...prev,
                    address: addressValue,
                    latitude: details?.lat ? String(details.lat) : prev.latitude,
                    longitude: details?.lon ? String(details.lon) : prev.longitude,
                  }));
                  if (details?.lat && details?.lon) {
                    setRawCoordinates(`${details.lat}, ${details.lon}`);
                  }
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Phone *</label>
              <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field" placeholder="e.g., 03-32791167" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Fax </label>
              <input value={form.fax} onChange={(e) => setForm({ ...form, fax: e.target.value })} className="input-field" placeholder="e.g., 03-32891167 (Optional)" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" placeholder="clinic@moh.gov.my (Optional)" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Operating Hours</label>
              <input value={form.operatingHours} onChange={(e) => setForm({ ...form, operatingHours: e.target.value })} className="input-field" placeholder="08:00 – 17:00" />
            </div>

            {/* GPS Coordinates (Combined Field) */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-surface-700">
                  GPS Coordinates
                </label>
                {form.latitude && form.longitude && !isNaN(parseFloat(form.latitude)) && !isNaN(parseFloat(form.longitude)) ? (
                  <a
                    href={`https://www.google.com/maps?q=${form.latitude},${form.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-teal-700 hover:text-teal-900 flex items-center gap-0.5 font-semibold hover:underline"
                    title="View pin on Google Maps"
                  >
                    <span>View Map</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        if (navigator?.clipboard?.readText) {
                          const text = await navigator.clipboard.readText();
                          const parsed = parseCoordinatePair(text);
                          if (parsed) {
                            setRawCoordinates(`${parsed.latStr}, ${parsed.lonStr}`);
                            setForm((prev) => ({
                              ...prev,
                              latitude: parsed.latStr,
                              longitude: parsed.lonStr,
                            }));
                            toast.success(`Coordinates pasted: ${parsed.latStr}, ${parsed.lonStr}`);
                          } else {
                            toast.error('Clipboard text is not a valid coordinate pair.');
                          }
                        }
                      } catch {
                        toast.info('Paste coordinates directly into the box.');
                      }
                    }}
                    className="text-[11px] font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1 hover:underline"
                    title="Paste Google Maps coordinates from clipboard"
                  >
                    <ClipboardPaste className="w-3 h-3 text-teal-600" />
                    Paste Pin
                  </button>
                )}
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={rawCoordinates}
                  onChange={(e) => {
                    const val = e.target.value;
                    setRawCoordinates(val);
                    const parsed = parseCoordinatePair(val);
                    if (parsed) {
                      setForm((prev) => ({
                        ...prev,
                        latitude: parsed.latStr,
                        longitude: parsed.lonStr,
                      }));
                    } else if (val.trim() === '') {
                      setForm((prev) => ({ ...prev, latitude: '', longitude: '' }));
                    }
                  }}
                  onPaste={(e) => {
                    const text = e.clipboardData.getData('text');
                    const parsed = parseCoordinatePair(text);
                    if (parsed) {
                      e.preventDefault();
                      setRawCoordinates(`${parsed.latStr}, ${parsed.lonStr}`);
                      setForm((prev) => ({
                        ...prev,
                        latitude: parsed.latStr,
                        longitude: parsed.lonStr,
                      }));
                      toast.success(`Coordinates saved: ${parsed.latStr}, ${parsed.lonStr}`);
                    }
                  }}
                  className="input-field font-mono text-sm pr-8"
                  placeholder="e.g., 3.425957, 101.178600"
                />
                <MapPin className="w-4 h-4 text-surface-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Modalities */}
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-2">Imaging Modalities</label>
            <div className="flex flex-wrap gap-2">
              {MODALITIES.map((mod) => (
                <button
                  key={mod} type="button" onClick={() => toggleModality(mod)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${form.modalities.includes(mod) ? 'bg-navy-50 border-navy-300 text-navy-700' : 'bg-white border-surface-300 text-surface-600 hover:border-surface-400'
                    }`}
                >
                  {mod}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} disabled={!form.name || !form.address || !form.phone} className="btn-primary disabled:opacity-50">
              {editing ? 'Save Changes' : 'Create Clinic'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deletingClinic} onClose={() => setDeletingClinic(null)} title="Delete Healthcare Center">
        <div className="space-y-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 text-xs">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800">Confirm Deletion</p>
              <p className="mt-0.5">Are you sure you want to delete <strong>{deletingClinic?.name}</strong>?</p>
            </div>
          </div>
          <p className="text-xs text-surface-600">
            This healthcare center will be removed from active clinic listings and stored in the <strong>Recycle Bin</strong> where administrators can review or restore it if needed.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setDeletingClinic(null)} className="btn-secondary text-xs">Cancel</button>
            <button
              onClick={() => {
                if (deletingClinic) {
                  confirmDeleteClinic(deletingClinic);
                  setDeletingClinic(null);
                }
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-medium transition-colors"
            >
              Delete Center
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
