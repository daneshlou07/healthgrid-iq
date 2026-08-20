import React, { useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { mockUsers } from '../../services/mockData';
import type { User } from '../../types';
import { Shield, ArrowLeft, UserCheck } from 'lucide-react';

const ROLE_HIERARCHY_RANK: Record<string, number> = {
  'Super Admin': 1,
  'Master Admin': 1,
  'BEMS Officer': 2,
  'BEMZ': 2,
  'BEMS': 2,
  'Administrator': 3,
  'Medical Officer': 4,
  'Radiologist': 5,
  'Radiographer': 6,
  'Public Hospital Admin': 7,
  'Public Hospital Radiographer': 8,
  'Private Hospital Admin': 9,
  'Private Hospital Radiographer': 10,
  'Equipment Marketplace': 11,
};

export default function ImpersonationBanner() {
  const { currentUser, originalAdminUser, isMasterAdmin, impersonateUser, stopImpersonating } = useAuth();
  const { users, clinics, trash } = useData();

  // Combine live users, exclude deleted/trash accounts, deduplicate, and sort by hierarchy rank
  const allAvailableUsers = useMemo(() => {
    const deletedUserIds = new Set(
      trash.filter((t) => t.type === 'user').map((t) => t.data?.id)
    );
    const deletedEmails = new Set(
      trash.filter((t) => t.type === 'user').map((t) => (t.data?.email || '').toLowerCase())
    );

    const map = new Map<string, User>();
    (users || []).forEach((u) => {
      // Exclude deprecated Radiology Department role or accounts
      if (
        u.role === ('Radiology Department' as any) ||
        u.id === 'dept-001' ||
        (u.email || '').toLowerCase() === 'nurul.aisyah@healthgrid.my'
      ) {
        return;
      }
      const emailKey = (u.email || u.id).toLowerCase();
      if (!deletedUserIds.has(u.id) && !deletedEmails.has(emailKey)) {
        map.set(emailKey, u);
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      // 1. Master Admin (daneshlou05@gmail.com) always at the very top
      if (a.email === 'daneshlou05@gmail.com') return -1;
      if (b.email === 'daneshlou05@gmail.com') return 1;

      // 2. Sort by Role Hierarchy Rank
      const rankA = ROLE_HIERARCHY_RANK[a.role] ?? 99;
      const rankB = ROLE_HIERARCHY_RANK[b.role] ?? 99;
      if (rankA !== rankB) {
        return rankA - rankB;
      }

      // 3. Sort alphabetically by Name within the same role rank
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [users, trash]);

  // Show banner if currently impersonating OR if signed in as Master Admin / Administrator / Super Admin
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
            <span>Active View:</span>
            <span className="bg-amber-400/20 px-2 py-0.5 rounded text-amber-200 font-semibold flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5" />
              {currentUser?.name} &middot; <span className="text-amber-100 font-normal">{currentUser?.role}</span>
            </span>
          </div>
        ) : (
          <span className="text-slate-300">
            Welcome, <strong>{currentUser?.name || 'Master Admin'}</strong>. Full multi-account access enabled.
          </span>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Switch Impersonation Dropdown */}
        <div className="relative flex items-center gap-1.5">
          <label className="text-[12px] text-slate-400 font-medium hidden sm:inline">Switch Account View:</label>
          <select
            onChange={(e) => {
              if (e.target.value) {
                const target = allAvailableUsers.find((u) => u.id === e.target.value);
                impersonateUser(e.target.value, target);
              }
            }}
            value={currentUser?.id || ''}
            className="px-2.5 py-1 bg-slate-800 border border-slate-600 rounded text-[12px] text-slate-100 cursor-pointer focus:outline-none focus:border-emerald-500 max-w-[320px] truncate"
          >
            <option value="" disabled>-- Select User to Impersonate --</option>
            {allAvailableUsers.map((user) => {
              const centerId = user.healthcareCenterId || user.deploymentLocationId;
              const facility = centerId ? clinics.find((c) => c.id === centerId) : null;
              const facilitySuffix = facility ? ` — ${facility.name}` : '';
              return (
                <option key={user.id} value={user.id}>
                  [{user.email === 'daneshlou05@gmail.com' ? 'Master Admin' : user.role}] {user.name}{facilitySuffix} ({user.email})
                </option>
              );
            })}
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


