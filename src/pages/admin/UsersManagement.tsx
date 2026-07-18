import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ux/Toast';
import type { User, UserRole } from '../../types';
import Modal from '../../components/ui/Modal';
import { Search, Plus, Edit2, Trash2, ShieldCheck, ShieldOff } from 'lucide-react';

const ROLES: UserRole[] = ['Doctor', 'Radiographer', 'Radiologist', 'Radiology Department', 'Administrator'];

export default function UsersManagement() {
  const { currentUser } = useAuth();
  const { users, setUsers, softDelete, addAuditLog } = useData();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState({
    name: '', email: '', role: 'Doctor' as UserRole, specialty: '', shift: '',
  });

  const filtered = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditingUser(null);
    setForm({ name: '', email: '', role: 'Doctor', specialty: '', shift: '' });
    setShowModal(true);
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setForm({ name: user.name, email: user.email, role: user.role, specialty: user.specialty || '', shift: user.shift || '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!currentUser) return;
    if (editingUser) {
      // Update existing
      const idx = users.findIndex((u) => u.id === editingUser.id);
      if (idx !== -1) {
        const updated = { ...users[idx], name: form.name, email: form.email, role: form.role, specialty: form.specialty || undefined, shift: form.shift || undefined };
        const next = [...users]; next[idx] = updated; setUsers(next);
        await addAuditLog({ userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role, action: 'USER_UPDATED', target: `users/${editingUser.id}`, details: `Updated user: ${form.name} (${form.role})`, timestamp: new Date().toISOString() });
        toast.success(`${form.name} updated`);
      }
    } else {
      // Create new
      const newUser: User = {
        id: `user-${Date.now()}`, name: form.name, email: form.email, role: form.role,
        specialty: form.specialty || undefined, shift: form.shift || undefined,
        status: 'active', createdAt: new Date().toISOString(),
      };
      setUsers((prev) => [...prev, newUser]);
      await addAuditLog({ userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role, action: 'USER_CREATED', target: `users/${newUser.id}`, details: `Created user: ${form.name} (${form.role})`, timestamp: new Date().toISOString() });
      toast.success(`${form.name} created`);
    }
    setShowModal(false);
  };

  const toggleStatus = async (user: User) => {
    if (!currentUser) return;
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, status: newStatus } : u));
    await addAuditLog({ userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role, action: newStatus === 'active' ? 'USER_ACTIVATED' : 'USER_DEACTIVATED', target: `users/${user.id}`, details: `${newStatus === 'active' ? 'Activated' : 'Deactivated'} user: ${user.name}`, timestamp: new Date().toISOString() });
    toast.info(`${user.name} ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
  };

  const deleteUser = async (user: User) => {
    if (!currentUser) return;
    softDelete('user', user.id, currentUser.name);
    await addAuditLog({ userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role, action: 'USER_DELETED', target: `users/${user.id}`, details: `Moved to trash: ${user.name}`, timestamp: new Date().toISOString() });
    toast.success(`${user.name} moved to Recycle Bin`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">Create, edit, and manage system user accounts</p>
        </div>
        <button onClick={openCreate} className="btn-primary text-sm flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Create User
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
        <input type="text" placeholder="Search by name, email, or role..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" />
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-200">
              <th className="table-header">Name</th>
              <th className="table-header">Email</th>
              <th className="table-header">Role</th>
              <th className="table-header">Status</th>
              <th className="table-header">Shift</th>
              <th className="table-header text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-200">
            {filtered.map((user) => (
              <tr key={user.id} className="hover:bg-surface-100 transition-colors">
                <td className="table-cell font-medium text-surface-800">{user.name}</td>
                <td className="table-cell text-surface-500 text-xs">{user.email}</td>
                <td className="table-cell"><span className="badge-info text-[10px]">{user.role}</span></td>
                <td className="table-cell"><span className={user.status === 'active' ? 'badge-success' : 'badge-error'}>{user.status}</span></td>
                <td className="table-cell text-surface-500 text-xs">{user.shift || '—'}</td>
                <td className="table-cell text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openEdit(user)} className="p-1.5 text-surface-400 hover:text-navy-600 hover:bg-navy-50 rounded transition-colors" title="Edit">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => toggleStatus(user)} className="p-1.5 text-surface-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors" title={user.status === 'active' ? 'Deactivate' : 'Activate'}>
                      {user.status === 'active' ? <ShieldOff className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => deleteUser(user)} className="p-1.5 text-surface-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-10 text-surface-400 text-sm">No users found.</div>}
      </div>

      {/* Create/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingUser ? 'Edit User' : 'Create User'}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Full Name *</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" placeholder="User full name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Email *</label>
              <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" placeholder="user@healthgrid.my" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Role *</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })} className="select-field">
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Shift</label>
              <select value={form.shift} onChange={(e) => setForm({ ...form, shift: e.target.value })} className="select-field">
                <option value="">None</option>
                <option value="Morning">Morning</option>
                <option value="Day">Day</option>
                <option value="Evening">Evening</option>
                <option value="Night">Night</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-surface-700 mb-1">Specialty</label>
              <input value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} className="input-field" placeholder="e.g., Diagnostic Radiology" />
            </div>
          </div>
          {!editingUser && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
              A temporary password will be generated and sent to the user's email. They will be required to change it on first login.
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} disabled={!form.name || !form.email} className="btn-primary disabled:opacity-50">
              {editingUser ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
