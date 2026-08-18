/**
 * DevAccountSwitcher — floating demo tool that lets you instantly impersonate
 * any mock user without going back to the login page.
 *
 * Shows a compact pill button in the bottom-right corner. Clicking it opens a
 * panel with the 3 demo radiographers highlighted at the top (with live case
 * counts), then all other users grouped by role below.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Users, ChevronDown, ChevronUp, UserCheck, Radio } from 'lucide-react';

const DEMO_RADIOGRAPHERS = [
  { id: 'rad-001', name: 'Ahmad Razak',       clinic: 'Putrajaya'       },
  { id: 'rad-002', name: 'Lim Mei Ling',      clinic: 'Cyberjaya'       },
  { id: 'rad-003', name: 'Kumaran Pillai',    clinic: 'Bangi'           },
  { id: 'rad-006', name: 'Zainal Abidin',     clinic: 'Tanjong Karang'  },
  { id: 'rad-008', name: 'Syed Farid Hassan', clinic: 'Ijok'            },
  { id: 'rad-009', name: 'Tan Li Wen',        clinic: 'Bestari Jaya'    },
  { id: 'rad-010', name: 'Anis Farhanah',     clinic: 'Bukit Cherakah'  },
];


const OTHER_ROLES = ['Super Admin', 'Administrator', 'Equipment Marketplace', 'Radiology Department', 'Radiologist'] as const;

export default function DevAccountSwitcher() {
  const { currentUser, loginAsUser } = useAuth();
  const { cases, users } = useData();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const handleSwitch = (userId: string) => {
    loginAsUser(userId);
    setOpen(false);
    navigate('/dashboard');
  };

  // Count SCHEDULED cases per radiographer so you know who got assigned
  const scheduledCount = (userId: string) =>
    cases.filter((c) => c.radiographerId === userId && c.status === 'SCHEDULED').length;

  const isMasterAdmin = currentUser?.email === 'daneshlou05@gmail.com';
  const otherUsers = users.filter(
    (u) => u.status === 'active' &&
           !DEMO_RADIOGRAPHERS.some((d) => d.id === u.id) &&
           (isMasterAdmin || (u.email !== 'daneshlou05@gmail.com' && u.id !== 'admin-002'))
  );

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col items-end gap-2">
      {open && (
        <div className="w-72 bg-white border border-surface-200 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 bg-navy-700 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="text-sm font-semibold">Quick Account Switch</span>
            </div>
            <span className="text-[9px] bg-white/20 px-2 py-0.5 rounded-full font-mono tracking-wider">DEMO</span>
          </div>

          {/* Currently logged in */}
          {currentUser && (
            <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-100 flex items-center gap-2">
              <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] text-emerald-800 font-semibold truncate">{currentUser.name}</p>
                <p className="text-[9px] text-emerald-600">{currentUser.role}</p>
              </div>
            </div>
          )}

          <div className="max-h-[420px] overflow-y-auto">
            {/* ── Demo Radiographers ── */}
            <div className="p-3 border-b border-surface-100">
              <p className="text-[9px] font-bold text-surface-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                <Radio className="w-3 h-3 text-navy-600" /> Radiographers
              </p>
              <div className="space-y-1.5">
                {DEMO_RADIOGRAPHERS.map((r) => {
                  const isCurrent = r.id === currentUser?.id;
                  const count = scheduledCount(r.id);
                  return (
                    <button
                      key={r.id}
                      onClick={() => !isCurrent && handleSwitch(r.id)}
                      disabled={isCurrent}
                      className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl border transition-all text-left ${
                        isCurrent
                          ? 'bg-navy-50 border-navy-200 cursor-default'
                          : 'bg-surface-50 border-surface-200 hover:bg-navy-50 hover:border-navy-300 cursor-pointer'
                      }`}
                    >
                      <div className="w-8 h-8 bg-navy-600 rounded-lg flex items-center justify-center shrink-0">
                        <Radio className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-navy-800 truncate">
                          {r.name} {isCurrent && <span className="text-[9px] text-navy-600 font-medium ml-1">(Active)</span>}
                        </p>
                        <p className="text-[10px] text-surface-500">{r.clinic}</p>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${
                        count > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-surface-200 text-surface-500'
                      }`}>
                        {count} {count === 1 ? 'case' : 'cases'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Other Roles (collapsible) ── */}
            <div className="p-3">
              <button
                onClick={() => setShowAll((s) => !s)}
                className="w-full flex items-center justify-between text-[10px] text-surface-400 hover:text-navy-600 font-medium mb-2"
              >
                <span>Other accounts (Admin / Dept / Radiologist)</span>
                {showAll ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              {showAll && OTHER_ROLES.map((role) => {
                const roleUsers = otherUsers.filter((u) => u.role === role);
                if (!roleUsers.length) return null;
                return (
                  <div key={role} className="mb-2">
                    <p className="text-[9px] font-semibold text-surface-500 uppercase mb-1">{role}</p>
                    {roleUsers.map((u) => {
                      const isCurrent = u.id === currentUser?.id;
                      return (
                        <button
                          key={u.id}
                          onClick={() => !isCurrent && handleSwitch(u.id)}
                          disabled={isCurrent}
                          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-colors text-left mb-0.5 ${
                            isCurrent ? 'bg-navy-50 cursor-default' : 'hover:bg-surface-100 cursor-pointer'
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-surface-800 truncate">
                              {u.name} {isCurrent && <span className="text-[9px] text-navy-600 font-medium ml-1">(Active)</span>}
                            </p>
                            <p className="text-[10px] text-surface-400 truncate">{u.email}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="px-4 py-2 border-t border-surface-100 bg-surface-50 flex items-center justify-between">
            <p className="text-[9px] text-surface-400">Demo mode active</p>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="text-[9px] text-navy-600 hover:text-navy-800 font-semibold underline"
            >
              Reset Seed Data
            </button>
          </div>
        </div>
      )}


      {/* Toggle pill */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-2 bg-navy-700 hover:bg-navy-800 text-white text-xs font-medium rounded-xl shadow-lg transition-all duration-150 border border-navy-600"
      >
        <Users className="w-3.5 h-3.5" />
        <span className="max-w-[110px] truncate">{currentUser?.name?.split(' ')[0] ?? 'Switch'}</span>
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
    </div>
  );
}
