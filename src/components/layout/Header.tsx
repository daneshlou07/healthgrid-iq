import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { useSearchPalette } from '../ux/SearchPalette';
import { useToast } from '../ux/Toast';
import { Bell, Search, User, Lock, LogOut, ChevronDown, Camera, AlertTriangle, Clock, Megaphone, Info } from 'lucide-react';
import Modal from '../ui/Modal';

// Notification categories
type NotifCategory = 'critical' | 'reports' | 'scheduling' | 'announcements' | 'system';
const CATEGORY_META: Record<NotifCategory, { label: string; color: string; icon: React.ReactNode }> = {
  critical: { label: 'Critical Alerts', color: 'text-red-600', icon: <AlertTriangle className="w-3.5 h-3.5 text-red-500" /> },
  reports: { label: 'Pending Reports', color: 'text-purple-600', icon: <Clock className="w-3.5 h-3.5 text-purple-500" /> },
  scheduling: { label: 'Scheduling Updates', color: 'text-navy-600', icon: <Clock className="w-3.5 h-3.5 text-navy-500" /> },
  announcements: { label: 'Announcements', color: 'text-amber-600', icon: <Megaphone className="w-3.5 h-3.5 text-amber-500" /> },
  system: { label: 'System', color: 'text-surface-600', icon: <Info className="w-3.5 h-3.5 text-surface-400" /> },
};

function categorizeNotification(type: string): NotifCategory {
  if (type === 'error') return 'critical';
  if (type === 'warning') return 'scheduling';
  if (type === 'success') return 'reports';
  return 'system';
}

export default function Header() {
  const { currentUser, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { open: openSearch } = useSearchPalette();
  const toast = useToast();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [editablePhone, setEditablePhone] = useState('');
  const [editableEmail, setEditableEmail] = useState('');
  const [passwordForm, setPasswordForm] = useState({ current: '', newPass: '', confirm: '' });
  const [passwordError, setPasswordError] = useState('');
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(`healthgrid_profile_pic_${currentUser?.id}`);
    if (saved) setProfilePic(saved);
  }, [currentUser?.id]);

  useEffect(() => {
    if (currentUser) {
      setEditablePhone(localStorage.getItem(`healthgrid_phone_${currentUser.id}`) || '+60 ');
      setEditableEmail(currentUser.email);
    }
  }, [currentUser]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!currentUser) return null;

  const handleProfilePicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setProfilePic(base64);
      localStorage.setItem(`healthgrid_profile_pic_${currentUser.id}`, base64);
      toast.success('Profile picture updated');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = () => {
    localStorage.setItem(`healthgrid_phone_${currentUser.id}`, editablePhone);
    toast.success('Profile updated');
  };

  const handleChangePassword = () => {
    setPasswordError('');
    if (!passwordForm.current) { setPasswordError('Current password is required'); return; }
    if (passwordForm.newPass.length < 8) { setPasswordError('New password must be at least 8 characters'); return; }
    if (passwordForm.newPass !== passwordForm.confirm) { setPasswordError('New passwords do not match'); return; }
    if (passwordForm.current === passwordForm.newPass) { setPasswordError('New password must be different from current'); return; }
    toast.success('Password changed successfully');
    setShowPasswordModal(false);
    setPasswordForm({ current: '', newPass: '', confirm: '' });
  };

  const avatarElement = profilePic ? (
    <img src={profilePic} alt="" className="w-full h-full object-cover rounded-full" />
  ) : (
    <span className="text-[11px] font-bold text-navy-700">{currentUser.name.charAt(0)}</span>
  );

  // Group notifications by category
  const groupedNotifs = notifications.reduce<Record<NotifCategory, typeof notifications>>((acc, n) => {
    const cat = categorizeNotification(n.type);
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(n);
    return acc;
  }, {} as any);

  return (
    <>
      <header className="h-16 bg-white border-b border-surface-300 flex items-center px-6 gap-4">
        <div className="flex-1 max-w-md">
          <button onClick={openSearch} className="w-full flex items-center gap-2.5 px-3 py-1.5 bg-surface-100 border border-surface-300 rounded-lg text-xs text-surface-500 hover:border-navy-300 hover:text-navy-600 transition-colors text-left">
            <Search className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="flex-1">Search patients, cases, reports...</span>
            <kbd className="hidden sm:inline-flex px-1.5 py-0.5 bg-white border border-surface-300 rounded text-[9px] font-mono text-surface-400">Ctrl+K</kbd>
          </button>
        </div>

        <div className="ml-auto flex items-center gap-1">
          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false); }} className="relative p-2 text-surface-500 hover:text-navy-600 hover:bg-surface-100 rounded-lg transition-colors" aria-label="Notifications">
              <Bell className="w-[18px] h-[18px]" />
              {unreadCount > 0 && <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{unreadCount}</span>}
            </button>
            {showNotifications && (
              <div className="absolute right-0 top-12 w-96 bg-white border border-surface-300 rounded-xl shadow-elevated z-50">
                <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200">
                  <h3 className="text-sm font-semibold text-navy-800">Notifications</h3>
                  {unreadCount > 0 && <button onClick={markAllAsRead} className="text-[11px] text-purple-500 font-medium hover:text-purple-600">Mark all read</button>}
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center"><Bell className="w-8 h-8 text-surface-300 mx-auto mb-2" /><p className="text-sm text-surface-400">No notifications</p></div>
                  ) : (
                    Object.entries(groupedNotifs).map(([cat, notifs]) => (
                      <div key={cat}>
                        <div className="px-4 py-2 bg-surface-50 border-b border-surface-200 flex items-center gap-2">
                          {CATEGORY_META[cat as NotifCategory]?.icon}
                          <span className={`text-[11px] font-semibold uppercase tracking-wider ${CATEGORY_META[cat as NotifCategory]?.color}`}>
                            {CATEGORY_META[cat as NotifCategory]?.label}
                          </span>
                          <span className="text-[10px] text-surface-400 ml-auto">{notifs.filter((n) => !n.read).length} unread</span>
                        </div>
                        {notifs.map((n) => (
                          <div key={n.id} onClick={() => markAsRead(n.id)} className={`px-4 py-3 border-b border-surface-100 cursor-pointer hover:bg-surface-50 transition-colors ${!n.read ? 'bg-blue-50/20' : ''}`}>
                            <div className="flex items-start gap-2.5">
                              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.read ? 'bg-surface-300' : 'bg-emerald-500'}`} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-surface-800">{n.title}</p>
                                <p className="text-xs text-surface-500 mt-0.5 truncate">{n.message}</p>
                                <p className="text-[10px] text-surface-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <button onClick={() => { setShowProfile(!showProfile); setShowNotifications(false); }} className="flex items-center gap-2 px-2 py-1.5 hover:bg-surface-100 rounded-lg transition-colors">
              <div className="w-8 h-8 bg-navy-100 rounded-full flex items-center justify-center overflow-hidden">
                {avatarElement}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-medium text-surface-800 leading-tight">{currentUser.name}</p>
                <p className="text-[10px] text-surface-500 leading-tight">{currentUser.role}</p>
              </div>
              <ChevronDown className="w-3 h-3 text-surface-400 hidden md:block" />
            </button>

            {showProfile && (
              <div className="absolute right-0 top-12 w-56 bg-white border border-surface-300 rounded-xl shadow-elevated z-50 py-1">
                <div className="px-4 py-3 border-b border-surface-200">
                  <p className="text-sm font-medium text-surface-800">{currentUser.name}</p>
                  <p className="text-xs text-surface-500">{currentUser.email}</p>
                </div>
                <div className="py-1">
                  <button onClick={() => { setShowProfile(false); setShowProfileModal(true); }} className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-surface-700 hover:bg-surface-100 transition-colors text-left">
                    <User className="w-4 h-4 text-surface-400" /> My Profile
                  </button>
                  <button onClick={() => { setShowProfile(false); setShowPasswordModal(true); setPasswordForm({ current: '', newPass: '', confirm: '' }); setPasswordError(''); }} className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-surface-700 hover:bg-surface-100 transition-colors text-left">
                    <Lock className="w-4 h-4 text-surface-400" /> Change Password
                  </button>
                </div>
                <div className="border-t border-surface-200 py-1">
                  <button onClick={logout} className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors text-left">
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* My Profile Modal */}
      <Modal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} title="My Profile" size="lg">
        <div className="space-y-6">
          {/* Avatar + Editable Section */}
          <div className="flex items-start gap-6">
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 bg-navy-100 rounded-full flex items-center justify-center overflow-hidden border-2 border-surface-300">
                {profilePic ? <img src={profilePic} alt="" className="w-full h-full object-cover" /> : <span className="text-3xl font-bold text-navy-700">{currentUser.name.charAt(0)}</span>}
              </div>
              <button onClick={() => fileInputRef.current?.click()} className="absolute -bottom-1 -right-1 w-7 h-7 bg-navy-600 text-white rounded-full flex items-center justify-center hover:bg-navy-700 transition-colors shadow-md" title="Change photo">
                <Camera className="w-3.5 h-3.5" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleProfilePicUpload} className="hidden" />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <label className="block text-xs text-surface-500 mb-0.5">Phone Number</label>
                <input value={editablePhone} onChange={(e) => setEditablePhone(e.target.value)} className="input-field text-sm" placeholder="+60 12-345-6789" />
              </div>
              <div>
                <label className="block text-xs text-surface-500 mb-0.5">Email Address</label>
                <input value={editableEmail} onChange={(e) => setEditableEmail(e.target.value)} className="input-field text-sm" />
              </div>
              <button onClick={handleSaveProfile} className="btn-primary text-xs">Save Changes</button>
            </div>
          </div>

          {/* Admin-managed fields */}
          <div className="pt-4 border-t border-surface-200">
            <div className="flex items-center gap-2 mb-3">
              <Lock className="w-3.5 h-3.5 text-surface-400" />
              <span className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider">Administrator Managed</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div><span className="text-[10px] text-surface-400 uppercase">Full Name</span><p className="text-surface-800 font-medium">{currentUser.name}</p></div>
              <div><span className="text-[10px] text-surface-400 uppercase">Role</span><p className="text-surface-800">{currentUser.role}</p></div>
              <div><span className="text-[10px] text-surface-400 uppercase">Shift</span><p className="text-surface-800">{currentUser.shift || '—'}</p></div>
              <div><span className="text-[10px] text-surface-400 uppercase">Specialty</span><p className="text-surface-800">{currentUser.specialty || '—'}</p></div>
              <div><span className="text-[10px] text-surface-400 uppercase">Employment Status</span><p><span className="badge-success text-[10px]">{currentUser.status}</span></p></div>
              <div><span className="text-[10px] text-surface-400 uppercase">Leave Status</span><p className="text-surface-800">{currentUser.leaveStatus || 'Active'}</p></div>
              {currentUser.supportedModalities && currentUser.supportedModalities.length > 0 && (
                <div className="col-span-2 md:col-span-3"><span className="text-[10px] text-surface-400 uppercase">Certified Modalities</span>
                  <div className="flex flex-wrap gap-1 mt-1">{currentUser.supportedModalities.map((m) => <span key={m} className="badge-info text-[9px]">{m}</span>)}</div>
                </div>
              )}
              <div><span className="text-[10px] text-surface-400 uppercase">Member Since</span><p className="text-surface-800">{new Date(currentUser.createdAt).toLocaleDateString()}</p></div>
            </div>
            <p className="text-[10px] text-surface-400 mt-3 italic">These fields can only be modified by a system administrator.</p>
          </div>
        </div>
      </Modal>

      {/* Change Password Modal */}
      <Modal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} title="Change Password">
        <div className="space-y-4">
          {passwordError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">{passwordError}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Current Password *</label>
            <input type="password" value={passwordForm.current} onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })} className="input-field" placeholder="Enter current password" />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">New Password *</label>
            <input type="password" value={passwordForm.newPass} onChange={(e) => setPasswordForm({ ...passwordForm, newPass: e.target.value })} className="input-field" placeholder="Min. 8 characters" />
            {passwordForm.newPass && passwordForm.newPass.length < 8 && (
              <p className="text-[10px] text-amber-600 mt-1">Password must be at least 8 characters</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Confirm New Password *</label>
            <input type="password" value={passwordForm.confirm} onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })} className="input-field" placeholder="Re-enter new password" />
            {passwordForm.newPass && passwordForm.confirm && passwordForm.newPass !== passwordForm.confirm && (
              <p className="text-[10px] text-red-500 mt-1">Passwords do not match</p>
            )}
          </div>
          <div className="p-3 bg-surface-50 border border-surface-200 rounded-lg text-[10px] text-surface-500 space-y-1">
            <p className="font-medium text-surface-600">Password Requirements:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Minimum 8 characters</li>
              <li>Must differ from current password</li>
              <li>Both new password fields must match</li>
            </ul>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowPasswordModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleChangePassword} disabled={!passwordForm.current || !passwordForm.newPass || !passwordForm.confirm} className="btn-primary disabled:opacity-50">Update Password</button>
          </div>
        </div>
      </Modal>
    </>
  );
}
