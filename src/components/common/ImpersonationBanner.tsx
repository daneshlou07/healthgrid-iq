import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { mockUsers } from '../../services/mockData';
import { Shield, UserCheck, ArrowLeft, ChevronDown } from 'lucide-react';

export default function ImpersonationBanner() {
  const { currentUser, originalAdminUser, isMasterAdmin, impersonateUser, stopImpersonating } = useAuth();

  // Show banner if currently impersonating OR if signed in as Master Admin
  if (!isMasterAdmin && !originalAdminUser) return null;

  return (
    <div className="w-full bg-[#0F172A] border-b border-[#334155] text-white text-[13px] px-4 py-2 flex items-center justify-between shadow-md z-50 shrink-0">
      
      {/* Left Details */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#0A5236] text-emerald-100 rounded text-[11px] font-semibold tracking-wide uppercase">
          <Shield className="w-3.5 h-3.5" />
          Master Super-Admin
        </div>

        {originalAdminUser ? (
          <div className="flex items-center gap-2 text-amber-300 font-medium">
            <span>Impersonating:</span>
            <span className="bg-amber-400/20 px-2 py-0.5 rounded text-amber-200 font-semibold">
              {currentUser?.name} ({currentUser?.role})
            </span>
          </div>
        ) : (
          <span className="text-slate-300">
            Welcome, <strong>Super Admin</strong>. You have full system access and user view controls.
          </span>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Switch Impersonation Dropdown */}
        <div className="relative flex items-center gap-1.5">
          <label className="text-[12px] text-slate-400 font-medium hidden sm:inline">Switch View:</label>
          <select
            onChange={(e) => {
              if (e.target.value) impersonateUser(e.target.value);
            }}
            value={currentUser?.id || ''}
            className="px-2.5 py-1 bg-slate-800 border border-slate-600 rounded text-[12px] text-slate-100 cursor-pointer focus:outline-none focus:border-emerald-500"
          >
            <option value="" disabled>-- Select User to Impersonate --</option>
            {mockUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.role}: {user.name} ({user.email})
              </option>
            ))}
          </select>
        </div>

        {/* Return to Master Admin Button */}
        {originalAdminUser && (
          <button
            onClick={stopImpersonating}
            className="flex items-center gap-1.5 px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-[12px] rounded transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Return to Master Admin
          </button>
        )}
      </div>

    </div>
  );
}
