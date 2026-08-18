import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useNotifications } from '../../context/NotificationContext';
import { useToast } from '../../components/ux/Toast';
import Modal from '../../components/ui/Modal';

import {
  Stethoscope,
  Building2,
  Layers,
  LogOut,
  Bell,
  Bot,
  User,
  Lock,
  ChevronDown,
  Camera,
  X,
  ShieldCheck,
  ShoppingBag,
} from 'lucide-react';

interface MarketplaceHeaderProps {
  onOpenDraftDrawer?: () => void;
}

export default function MarketplaceHeader({
  onOpenDraftDrawer,
}: MarketplaceHeaderProps) {
  const navigate = useNavigate();
  const { currentUser, logout, updateCurrentUser } = useAuth();
  const { rfqDraft } = useData();
  const { notifications, unreadCount, markAllAsRead, removeNotification, clearAll } = useNotifications();
  const toast = useToast();

  const [copilotActive, setCopilotActive] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  // Profile Modal State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editablePhone, setEditablePhone] = useState(currentUser?.phone || '');
  const [editableEmail, setEditableEmail] = useState(currentUser?.email || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', newPass: '', confirm: '' });
  const [passwordError, setPasswordError] = useState('');

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleSaveProfile = () => {
    updateCurrentUser({ phone: editablePhone, email: editableEmail });
    toast.success('Profile contact details updated');
    setShowProfileModal(false);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    if (!passwordForm.newPass || passwordForm.newPass.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }
    if (passwordForm.newPass !== passwordForm.confirm) {
      setPasswordError('Passwords do not match.');
      return;
    }
    toast.success('Password updated successfully');
    setShowPasswordModal(false);
    setPasswordForm({ current: '', newPass: '', confirm: '' });
  };

  const initials =
    currentUser?.name
      ?.split(' ')
      .filter(Boolean)
      .map((part) => part.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U';

  const navClass = ({ isActive }: { isActive: boolean }) =>
    [
      'relative',
      'flex',
      'h-[76px]',
      'items-center',
      'gap-2.5',
      'px-6',
      'text-[13px]',
      'font-semibold',
      'whitespace-nowrap',
      'transition-colors',
      isActive ? 'text-[#0F4C42]' : 'text-[#475569] hover:text-[#0F4C42]',
      'after:absolute',
      'after:bottom-0',
      'after:left-6',
      'after:right-6',
      'after:h-[2px]',
      'after:rounded-full',
      isActive ? 'after:bg-[#0F4C42]' : 'after:bg-transparent',
    ].join(' ');

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-[#E2E8F0] bg-white">
        {/* DESKTOP HEADER */}
        <div className="flex h-[76px] w-full items-center px-6 lg:px-8 xl:px-12">
          {/* BRAND */}
          <button
            type="button"
            onClick={() => navigate('/marketplace')}
            className="group flex shrink-0 items-center gap-3 text-left"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EFF6F3] text-[#0F4C42] ring-1 ring-[#CDE1DA] transition-colors group-hover:bg-[#E5F2ED]">
              <ShoppingBag className="h-5 w-5" />
            </div>

            <div className="leading-none">
              <div className="flex items-center gap-2">
                <span className="text-[18px] font-bold tracking-[-0.02em] text-[#112A28]">
                  HealthGrid IQ
                </span>
                <span className="rounded-md bg-[#EFF6F3] px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-[#0F4C42]">
                  Marketplace
                </span>
              </div>
              <p className="mt-1.5 text-[10px] font-medium tracking-wide text-[#64748B]">
                Institutional Healthcare Procurement
              </p>
            </div>
          </button>

          {/* MAIN NAVIGATION */}
          <nav className="ml-12 hidden h-full items-center lg:flex xl:ml-16">
            <NavLink to="/marketplace" end className={navClass}>
              Home
            </NavLink>

            <NavLink to="/marketplace/medical" className={navClass}>
              <Stethoscope className="h-[17px] w-[17px]" />
              Medical Equipment
            </NavLink>

            <NavLink to="/marketplace/non-medical" className={navClass}>
              <Building2 className="h-[17px] w-[17px]" />
              Non-Medical Equipment
            </NavLink>
          </nav>

          {/* RIGHT CONTROLS */}
          <div className="ml-auto flex items-center gap-3 sm:gap-4">
            {/* 1. AI COPILOT TOGGLE */}
            <button
              type="button"
              onClick={() => {
                const next = !copilotActive;
                setCopilotActive(next);
                toast.info(next ? 'AI Procurement Copilot enabled' : 'AI Copilot turned off');
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border transition-all cursor-pointer ${
                copilotActive
                  ? 'bg-emerald-50 border-emerald-300 text-[#0F4C42]'
                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
              }`}
              title={copilotActive ? 'Hide AI Copilot' : 'Enable AI Copilot'}
            >
              <Bot className={`w-3.5 h-3.5 ${copilotActive ? 'text-[#0F4C42]' : 'text-slate-400'}`} />
              <span className="hidden sm:inline text-[11px] font-semibold">
                {copilotActive ? 'Copilot On' : 'Copilot Off'}
              </span>
            </button>

            {/* 2. NOTIFICATIONS BELL */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowProfileDropdown(false);
                }}
                className="relative p-2 text-slate-500 hover:text-[#0F4C42] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                aria-label="Notifications"
              >
                <Bell className="w-[18px] h-[18px]" />
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-12 w-[380px] max-w-[calc(100vw-24px)] bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
                    <div>
                      <h3 className="text-xs font-bold text-slate-800">Notifications</h3>
                      <p className="text-[10px] text-slate-400">
                        {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                      </p>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllAsRead}
                        className="text-[11px] text-[#0F4C42] font-semibold hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-[320px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-6 py-8 text-center text-xs text-slate-400">
                        No notifications right now
                      </div>
                    ) : (
                      notifications.slice(0, 5).map((n) => (
                        <div
                          key={n.id}
                          className="px-4 py-3 border-b border-slate-100 hover:bg-slate-50 text-left"
                        >
                          <p className="text-xs font-semibold text-slate-800">{n.title}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="border-t border-slate-200 p-2 flex items-center gap-2">
                    {notifications.length > 0 && (
                      <button
                        type="button"
                        onClick={clearAll}
                        className="flex-1 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        Clear all
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowNotifications(false)}
                      className="flex-1 py-1.5 text-xs font-semibold text-[#0F4C42] hover:bg-slate-100 rounded-lg"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 3. REVIEW RFQ DRAFT BUTTON */}
            <button
              type="button"
              onClick={onOpenDraftDrawer}
              className="inline-flex h-9 sm:h-10 items-center gap-2 rounded-xl bg-[#0F4C42] px-3.5 sm:px-4 text-[12px] font-bold text-white shadow-sm transition-all hover:bg-[#0B3831] cursor-pointer"
            >
              <Layers className="h-4 w-4" />
              <span className="hidden sm:inline">Review RFQ Draft</span>
              <span className="sm:hidden">RFQ</span>
              {rfqDraft.length > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-[10px] font-extrabold text-[#0F4C42]">
                  {rfqDraft.length}
                </span>
              )}
            </button>

            <div className="h-6 w-px bg-slate-200" />

            {/* 4. USER PROFILE DROPDOWN */}
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => {
                  setShowProfileDropdown(!showProfileDropdown);
                  setShowNotifications(false);
                }}
                className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EFF6F3] text-[11px] font-bold text-[#0F4C42] ring-1 ring-[#CDE1DA]">
                  {initials}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-xs font-bold text-[#112A28] leading-tight">
                    {currentUser?.name || 'Farid Zakaria'}
                  </p>
                  <p className="text-[10px] text-[#64748B] leading-tight">
                    {currentUser?.role || 'Equipment Marketplace'}
                  </p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden md:block" />
              </button>

              {showProfileDropdown && (
                <div className="absolute right-0 top-12 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                    <p className="text-xs font-bold text-slate-800 truncate">
                      {currentUser?.name || 'Marketplace User'}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">
                      {currentUser?.email || ''}
                    </p>
                  </div>

                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileDropdown(false);
                        setShowProfileModal(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 text-left cursor-pointer"
                    >
                      <User className="w-4 h-4 text-slate-400" />
                      <span>My Profile</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileDropdown(false);
                        setShowPasswordModal(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 text-left cursor-pointer"
                    >
                      <Lock className="w-4 h-4 text-slate-400" />
                      <span>Change Password</span>
                    </button>
                  </div>

                  <div className="border-t border-slate-100 py-1">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 text-left cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* MOBILE NAVIGATION STRIP */}
        <div className="flex overflow-x-auto border-t border-[#F1F5F9] px-4 lg:hidden scrollbar-none">
          <NavLink
            to="/marketplace"
            end
            className={({ isActive }) =>
              `inline-flex h-11 shrink-0 items-center px-4 text-xs font-semibold ${
                isActive ? 'border-b-2 border-[#0F4C42] text-[#0F4C42]' : 'text-[#64748B]'
              }`
            }
          >
            Home
          </NavLink>

          <NavLink
            to="/marketplace/medical"
            className={({ isActive }) =>
              `inline-flex h-11 shrink-0 items-center gap-1.5 px-4 text-xs font-semibold ${
                isActive ? 'border-b-2 border-[#0F4C42] text-[#0F4C42]' : 'text-[#64748B]'
              }`
            }
          >
            <Stethoscope className="h-3.5 w-3.5" />
            Medical Equipment
          </NavLink>

          <NavLink
            to="/marketplace/non-medical"
            className={({ isActive }) =>
              `inline-flex h-11 shrink-0 items-center gap-1.5 px-4 text-xs font-semibold ${
                isActive ? 'border-b-2 border-[#0F4C42] text-[#0F4C42]' : 'text-[#64748B]'
              }`
            }
          >
            <Building2 className="h-3.5 w-3.5" />
            Non-Medical Equipment
          </NavLink>
        </div>
      </header>

      {/* MY PROFILE MODAL */}
      <Modal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        title="My Profile"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
            <div className="w-14 h-14 bg-[#EFF6F3] rounded-full flex items-center justify-center text-lg font-bold text-[#0F4C42] ring-1 ring-[#CDE1DA]">
              {initials}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">{currentUser?.name}</h3>
              <p className="text-xs text-[#0F4C42] font-semibold">{currentUser?.role}</p>
              <p className="text-xs text-slate-500">{currentUser?.specialty || 'Institutional Healthcare Procurement'}</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-500 mb-1">Email Address</label>
              <input
                type="email"
                value={editableEmail}
                onChange={(e) => setEditableEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-500 mb-1">Phone Number</label>
              <input
                type="tel"
                value={editablePhone}
                onChange={(e) => setEditablePhone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                placeholder="+60 12-345 6789"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowProfileModal(false)}
              className="px-4 py-2 border border-slate-200 text-xs font-semibold rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveProfile}
              className="px-4 py-2 bg-[#0F4C42] text-white text-xs font-semibold rounded-lg hover:bg-[#0B3831]"
            >
              Save Changes
            </button>
          </div>
        </div>
      </Modal>

      {/* CHANGE PASSWORD MODAL */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title="Change Password"
        size="sm"
      >
        <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
          {passwordError && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {passwordError}
            </div>
          )}

          <div>
            <label className="block text-slate-600 mb-1">Current Password</label>
            <input
              type="password"
              value={passwordForm.current}
              onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              placeholder="Enter current password"
              required
            />
          </div>

          <div>
            <label className="block text-slate-600 mb-1">New Password</label>
            <input
              type="password"
              value={passwordForm.newPass}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPass: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              placeholder="Min 6 characters"
              required
            />
          </div>

          <div>
            <label className="block text-slate-600 mb-1">Confirm New Password</label>
            <input
              type="password"
              value={passwordForm.confirm}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              placeholder="Re-enter new password"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowPasswordModal(false)}
              className="px-4 py-2 border border-slate-200 text-xs font-semibold rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#0F4C42] text-white text-xs font-semibold rounded-lg hover:bg-[#0B3831]"
            >
              Update Password
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}