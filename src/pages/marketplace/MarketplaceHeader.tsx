import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ux/Toast';
import Modal from '../../components/ui/Modal';

import {
  Stethoscope,
  Building2,
  Layers,
  LogOut,
  User,
  Lock,
  ChevronDown,
  ShoppingBag,
  Package,
  ClipboardList,
} from 'lucide-react';

interface MarketplaceHeaderProps {
  onOpenDraftDrawer?: () => void;
}

export default function MarketplaceHeader({
  onOpenDraftDrawer,
}: MarketplaceHeaderProps) {
  const { currentUser, logout, updateCurrentUser, isMasterAdmin } = useAuth();
  const { rfqDraft, quotationRequests } = useData();
  const toast = useToast();

  const isSuperOrMaster = isMasterAdmin || currentUser?.role === 'Super Admin';
  const pendingOrdersCount = quotationRequests.filter((q) => q.status === 'SUBMITTED').length;
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

  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
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
      'gap-2',
      'px-4 lg:px-5',
      'text-[13px]',
      'font-semibold',
      'whitespace-nowrap',
      'transition-colors',
      isActive ? 'text-[#0F4C42]' : 'text-[#475569] hover:text-[#0F4C42]',
      'after:absolute',
      'after:bottom-0',
      'after:left-4',
      'after:right-4',
      'after:h-[2px]',
      'after:rounded-full',
      isActive ? 'after:bg-[#0F4C42]' : 'after:bg-transparent',
    ].join(' ');

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-[#E2E8F0] bg-white">
        {/* DESKTOP HEADER (Adjust height with h-[76px], horizontal padding with px-6 lg:px-8 xl:px-12) */}
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
                  {isSuperOrMaster ? 'Marketplace Admin' : 'Marketplace'}
                </span>
              </div>
              <p className="mt-1.5 text-[10px] font-medium tracking-wide text-[#64748B]">
                Institutional Healthcare Procurement
              </p>
            </div>
          </button>

          {/* MAIN NAVIGATION (Adjust spacing from brand using ml-8 to ml-16) */}
          <nav className="ml-8 hidden h-full items-center lg:flex xl:ml-12">
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

            {/* SUPER ADMIN MANAGEMENT TABS */}
            {isSuperOrMaster && (
              <>
                <NavLink to="/marketplace/manage-items" className={navClass}>
                  <Package className="h-[17px] w-[17px]" />
                  Manage Equipment
                </NavLink>

                <NavLink to="/marketplace/orders" className={navClass}>
                  <ClipboardList className="h-[17px] w-[17px]" />
                  <span>Manage Orders</span>
                  {pendingOrdersCount > 0 && (
                    <span className="ml-1 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-extrabold text-white">
                      {pendingOrdersCount}
                    </span>
                  )}
                </NavLink>
              </>
            )}
          </nav>

          {/* RIGHT CONTROLS */}
          <div className="ml-auto flex items-center gap-3 sm:gap-4">
            {/* REVIEW RFQ DRAFT BUTTON */}
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

            {/* USER PROFILE DROPDOWN */}
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => {
                  setShowProfileDropdown(!showProfileDropdown);
                }}
                className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EFF6F3] text-[11px] font-bold text-[#0F4C42] ring-1 ring-[#CDE1DA]">
                  {initials}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-xs font-bold text-[#112A28] leading-tight">
                    {currentUser?.name || 'User'}
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
            Medical
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
            Non-Medical
          </NavLink>

          {isSuperOrMaster && (
            <>
              <NavLink
                to="/marketplace/manage-items"
                className={({ isActive }) =>
                  `inline-flex h-11 shrink-0 items-center gap-1.5 px-4 text-xs font-semibold ${
                    isActive ? 'border-b-2 border-[#0F4C42] text-[#0F4C42]' : 'text-[#64748B]'
                  }`
                }
              >
                <Package className="h-3.5 w-3.5" />
                Manage Equipment
              </NavLink>

              <NavLink
                to="/marketplace/orders"
                className={({ isActive }) =>
                  `inline-flex h-11 shrink-0 items-center gap-1.5 px-4 text-xs font-semibold ${
                    isActive ? 'border-b-2 border-[#0F4C42] text-[#0F4C42]' : 'text-[#64748B]'
                  }`
                }
              >
                <ClipboardList className="h-3.5 w-3.5" />
                Orders {pendingOrdersCount > 0 && `(${pendingOrdersCount})`}
              </NavLink>
            </>
          )}
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