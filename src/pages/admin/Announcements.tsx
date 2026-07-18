import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ux/Toast';
import { createAuditLog } from '../../services/dataService';
import Modal from '../../components/ui/Modal';
import { Megaphone, Plus, Edit2, Trash2 } from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high';
  status: 'draft' | 'published';
  createdAt: string;
  createdBy: string;
}

const mockAnnouncements: Announcement[] = [
  { id: 'ann-001', title: 'Scheduled Maintenance Window', message: 'HealthGrid IQ will undergo scheduled maintenance on 2026-07-20 from 02:00 to 04:00 MYT. All services will be temporarily unavailable.', priority: 'high', status: 'published', createdAt: '2026-07-15T08:00:00Z', createdBy: 'Tan Wei Ming' },
  { id: 'ann-002', title: 'New MRI Unit Deployment', message: 'PACS Bravo has been equipped with a new 3T MRI system. Radiographers operating at Klinik Kesihatan Cyberjaya should update their modality certifications.', priority: 'normal', status: 'published', createdAt: '2026-07-14T10:00:00Z', createdBy: 'Tan Wei Ming' },
];

export default function Announcements() {
  const { currentUser } = useAuth();
  const toast = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>(mockAnnouncements);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState({ title: '', message: '', priority: 'normal' as 'low' | 'normal' | 'high' });

  const priorityBadge: Record<string, string> = { low: 'badge-neutral', normal: 'badge-info', high: 'badge-error' };

  const openCreate = () => { setEditing(null); setForm({ title: '', message: '', priority: 'normal' }); setShowModal(true); };
  const openEdit = (ann: Announcement) => { setEditing(ann); setForm({ title: ann.title, message: ann.message, priority: ann.priority }); setShowModal(true); };

  const handleSave = async (publish: boolean) => {
    if (!currentUser) return;
    if (editing) {
      setAnnouncements((prev) => prev.map((a) => a.id === editing.id ? { ...a, title: form.title, message: form.message, priority: form.priority, status: publish ? 'published' : a.status } : a));
      await createAuditLog({ userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role, action: 'ANNOUNCEMENT_UPDATED', target: `announcements/${editing.id}`, details: `Updated announcement: ${form.title}`, timestamp: new Date().toISOString() });
      toast.success(`Announcement updated`);
    } else {
      const newAnn: Announcement = { id: `ann-${Date.now()}`, title: form.title, message: form.message, priority: form.priority, status: publish ? 'published' : 'draft', createdAt: new Date().toISOString(), createdBy: currentUser.name };
      setAnnouncements((prev) => [newAnn, ...prev]);
      await createAuditLog({ userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role, action: publish ? 'ANNOUNCEMENT_PUBLISHED' : 'ANNOUNCEMENT_CREATED', target: `announcements/${newAnn.id}`, details: `${publish ? 'Published' : 'Created draft'}: ${form.title}`, timestamp: new Date().toISOString() });
      toast.success(publish ? 'Announcement published' : 'Draft saved');
    }
    setShowModal(false);
  };

  const deleteAnn = async (ann: Announcement) => {
    if (!currentUser) return;
    if (!confirm(`Delete "${ann.title}"?`)) return;
    setAnnouncements((prev) => prev.filter((a) => a.id !== ann.id));
    await createAuditLog({ userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role, action: 'ANNOUNCEMENT_DELETED', target: `announcements/${ann.id}`, details: `Deleted announcement: ${ann.title}`, timestamp: new Date().toISOString() });
    toast.success('Announcement deleted');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Announcements</h1>
          <p className="page-subtitle">Create, publish, edit, and delete system-wide announcements</p>
        </div>
        <button onClick={openCreate} className="btn-primary text-sm flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> New Announcement
        </button>
      </div>

      <div className="space-y-3">
        {announcements.map((ann) => (
          <div key={ann.id} className="card">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-navy-500" />
                <h3 className="text-sm font-semibold text-navy-700">{ann.title}</h3>
                {ann.status === 'draft' && <span className="badge-warning text-[9px]">Draft</span>}
              </div>
              <div className="flex items-center gap-1">
                <span className={`${priorityBadge[ann.priority]} mr-2`}>{ann.priority}</span>
                <button onClick={() => openEdit(ann)} className="p-1.5 text-surface-400 hover:text-navy-600 hover:bg-navy-50 rounded transition-colors" title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>
                <button onClick={() => deleteAnn(ann)} className="p-1.5 text-surface-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <p className="text-sm text-surface-600 mb-2">{ann.message}</p>
            <p className="text-[10px] text-surface-400">By {ann.createdBy} &middot; {new Date(ann.createdAt).toLocaleString()}</p>
          </div>
        ))}
        {announcements.length === 0 && <div className="text-center py-12 text-surface-400 text-sm">No announcements.</div>}
      </div>

      {/* Create/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Announcement' : 'New Announcement'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Title *</label>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field" placeholder="Announcement title" />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Message *</label>
            <textarea required rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="input-field resize-none" placeholder="Announcement content..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Priority</label>
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as any })} className="select-field w-auto">
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            {!editing && <button onClick={() => handleSave(false)} disabled={!form.title || !form.message} className="btn-secondary disabled:opacity-50">Save as Draft</button>}
            <button onClick={() => handleSave(true)} disabled={!form.title || !form.message} className="btn-primary disabled:opacity-50">
              {editing ? 'Save Changes' : 'Publish'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
