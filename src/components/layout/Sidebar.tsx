import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useLanguage } from '../../context/LanguageContext';
import type { UserRole } from '../../types';

import {
  LayoutDashboard,
  Users,
  FolderOpen,
  FileText,
  ClipboardList,
  Upload,
  Eye,
  Calendar,
  Building2,
  CheckSquare,
  Truck,
  ScrollText,
  Brain,
  Megaphone,
  BarChart3,
  Layers,
  Search,
  UserCheck,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  badge?: number;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

interface SidebarProps {
  onClose?: () => void;
}

function getNavGroups(
  role: UserRole,
  pendingRequests: number,
  t: (en: string, ms: string) => string
): NavGroup[] {
  switch (role) {
    case 'Radiographer':
      return [
        {
          title: t('MAIN', 'UTAMA'),
          items: [
            {
              label: t('Dashboard', 'Papan Pemuka'),
              path: '/dashboard',
              icon: <LayoutDashboard className="w-[18px] h-[18px]" />,
            },
            {
              label: t('My Schedule', 'Jadual Saya'),
              path: '/schedule',
              icon: <Calendar className="w-[18px] h-[18px]" />,
            },
            {
              label: t('Scan Queue', 'Giliran Imbasan'),
              path: '/scan-queue',
              icon: <ClipboardList className="w-[18px] h-[18px]" />,
            },
            {
              label: t('Upload Scans', 'Muat Naik Imbasan'),
              path: '/upload',
              icon: <Upload className="w-[18px] h-[18px]" />,
            },
          ],
        },
      ];

    case 'Radiologist':
      return [
        {
          title: t('MAIN', 'UTAMA'),
          items: [
            {
              label: t('Dashboard', 'Papan Pemuka'),
              path: '/dashboard',
              icon: <LayoutDashboard className="w-[18px] h-[18px]" />,
            },
            {
              label: t('Review Queue', 'Giliran Semakan'),
              path: '/review-queue',
              icon: <Eye className="w-[18px] h-[18px]" />,
            },
            {
              label: t('Reporting Workspace', 'Ruang Kerja Laporan'),
              path: '/reporting',
              icon: <FileText className="w-[18px] h-[18px]" />,
            },
            {
              label: t('Department Reports', 'Laporan Jabatan'),
              path: '/reports',
              icon: <FolderOpen className="w-[18px] h-[18px]" />,
            },
          ],
        },
      ];

    case 'Medical Officer':
      return [
        {
          title: t('CLINICAL CARE', 'PENJAGAAN KLINIKAL'),
          items: [
            {
              label: t('Dashboard', 'Papan Pemuka'),
              path: '/dashboard',
              icon: <LayoutDashboard className="w-[18px] h-[18px]" />,
            },
            {
              label: t('Patient Registry', 'Pendaftaran Pesakit'),
              path: '/patients',
              icon: <Users className="w-[18px] h-[18px]" />,
            },
            {
              label: t('Register Patient', 'Daftar Pesakit'),
              path: '/patients/register',
              icon: <Users className="w-[18px] h-[18px]" />,
            },
            {
              label: t('All Medical Cases', 'Semua Kes Perubatan'),
              path: '/cases',
              icon: <FolderOpen className="w-[18px] h-[18px]" />,
            },
            {
              label: t('New Case Registration', 'Pendaftaran Kes Baharu'),
              path: '/cases/new',
              icon: <FileText className="w-[18px] h-[18px]" />,
            },
            {
              label: t(
                'Patient Requests',
                'Permohonan Pemindahan Pesakit'
              ),
              path: '/requests',
              icon: <Truck className="w-[18px] h-[18px]" />,
              badge: pendingRequests,
            },
            {
              label: t(
                'Track Transfer Status',
                'Jejak Status Pemindahan'
              ),
              path: '/track-status',
              icon: <CheckSquare className="w-[18px] h-[18px]" />,
            },
          ],
        },
        {
          title: t(
            'REPORTS & DIAGNOSTICS',
            'LAPORAN & DIAGNOSTIK'
          ),
          items: [
            {
              label: t(
                'Imaging Reports',
                'Laporan Pengimejan'
              ),
              path: '/reports',
              icon: <FileText className="w-[18px] h-[18px]" />,
            },
            {
              label: t(
                'Diagnostic Review Queue',
                'Giliran Semakan Diagnostik'
              ),
              path: '/review-queue',
              icon: <Eye className="w-[18px] h-[18px]" />,
            },
            {
              label: t(
                'Clinical Reporting',
                'Pelaporan Klinikal'
              ),
              path: '/reporting',
              icon: <ScrollText className="w-[18px] h-[18px]" />,
            },
          ],
        },
      ];

    case 'Administrator':
      return [
        {
          title: t('MANAGEMENT', 'PENGURUSAN'),
          items: [
            {
              label: t('Dashboard', 'Papan Pemuka'),
              path: '/dashboard',
              icon: <LayoutDashboard className="w-[18px] h-[18px]" />,
            },
            {
              label: t(
                'Clinic Management',
                'Pengurusan Klinik'
              ),
              path: '/clinics',
              icon: <Building2 className="w-[18px] h-[18px]" />,
            },
            {
              label: t(
                'Resource Scheduling',
                'Penjadualan Sumber'
              ),
              path: '/scheduling',
              icon: <Calendar className="w-[18px] h-[18px]" />,
            },
            {
              label: t(
                'AI Scheduler',
                'Penjadual AI'
              ),
              path: '/ai-scheduler',
              icon: <Brain className="w-[18px] h-[18px]" />,
            },
            {
              label: t(
                'Patient Management',
                'Pengurusan Pesakit'
              ),
              path: '/patients',
              icon: <Users className="w-[18px] h-[18px]" />,
            },
            {
              label: t(
                'All Cases Overview',
                'Gambaran Keseluruhan Kes'
              ),
              path: '/cases',
              icon: <FolderOpen className="w-[18px] h-[18px]" />,
            },
            {
              label: t(
                'Transfer Requests',
                'Permohonan Pemindahan'
              ),
              path: '/requests',
              icon: <Truck className="w-[18px] h-[18px]" />,
              badge: pendingRequests,
            },
          ],
        },
        {
          title: t('SYSTEM', 'SISTEM'),
          items: [
            {
              label: t(
                'System Reports',
                'Laporan Sistem'
              ),
              path: '/reports',
              icon: <FileText className="w-[18px] h-[18px]" />,
            },
            {
              label: t(
                'User Management',
                'Pengurusan Pengguna'
              ),
              path: '/users',
              icon: <UserCheck className="w-[18px] h-[18px]" />,
            },
            {
              label: t(
                'Trash / Recycle Bin',
                'Tong Sampah / Tong Kitar Semula'
              ),
              path: '/recycle-bin',
              icon: <Trash2 className="w-[18px] h-[18px]" />,
            },
            {
              label: t(
                'Audit Logs',
                'Log Audit'
              ),
              path: '/audit-logs',
              icon: <ScrollText className="w-[18px] h-[18px]" />,
            },
          ],
        },
      ];

    default:
      return [];
  }
}

export default function Sidebar({ onClose }: SidebarProps) {
  const { currentUser } = useAuth();
  const { patientRequests } = useData();
  const { t } = useLanguage();
  const location = useLocation();

  const [collapsed, setCollapsed] = React.useState(false);

  if (!currentUser) return null;

  const pendingRequests = patientRequests.filter(
    (r) => r.status === 'Pending'
  ).length;

  const groups = getNavGroups(
    currentUser.role,
    pendingRequests,
    t
  );

  return (
    <aside
      className={`
        relative
        bg-white
        border-r border-[#E2E8E6]
        flex flex-col
        h-full
        shrink-0
        transition-all
        duration-300
        ease-in-out
        ${collapsed ? 'w-[72px]' : 'w-60'}
      `}
    >
      {/* =========================
          LOGO / HEADER
      ========================== */}
      <div
        className={`
          relative
          border-b border-[#E2E8E6]
          flex items-center
          transition-all duration-300
          ${collapsed
            ? 'px-2 py-3 justify-center'
            : 'px-4 py-3 justify-between'
          }
        `}
      >
        <div
          className={`
            flex items-center
            justify-center
            overflow-hidden
            transition-all duration-300
            ${collapsed
              ? 'w-10 h-16'
              : 'flex-1 h-16'
            }
          `}
        >
          {collapsed ? (
            <div
              className="
                w-10 h-10
                rounded-xl
                bg-[#0F4C42]
                text-white
                flex items-center justify-center
                font-bold
                text-lg
                select-none
              "
            >
              H
            </div>
          ) : (
            <img
              src="/assets/healthgrid-iq-logo-transparent.png"
              alt="HealthGrid IQ — Connected Capacity. Better Care."
              className="
                w-full
                h-14
                object-cover
                object-center
                translate-y-1
              "
            />
          )}
        </div>

        {/* Desktop Collapse Button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`
            absolute
            -right-3
            top-6
            z-30
            w-6 h-6
            rounded-full
            bg-white
            border border-[#E2E8E6]
            flex items-center justify-center
            text-[#45645E]
            hover:text-[#0F4C42]
            hover:border-[#BFD8D0]
            shadow-sm
            transition-all duration-200
            cursor-pointer
          `}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={
            collapsed ? 'Expand sidebar' : 'Collapse sidebar'
          }
        >
          {collapsed ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* =========================
          NAVIGATION
      ========================== */}
      <nav
        className={`
          flex-1
          overflow-y-auto
          py-3
          transition-all duration-300
          ${collapsed ? 'px-2' : 'px-3'}
        `}
      >
        {groups.map((group, gi) => (
          <div
            key={group.title}
            className={`
              transition-all duration-300
              ${gi > 0 ? 'mt-4' : ''}
            `}
          >
            {/* Section Title */}
            <p
              className={`
                px-3
                mb-1.5
                text-[10px]
                font-semibold
                text-[#6B8580]
                uppercase
                tracking-wider
                whitespace-nowrap
                overflow-hidden
                transition-all duration-200
                ${collapsed
                  ? 'opacity-0 h-0 mb-0'
                  : 'opacity-100 h-auto'
                }
              `}
            >
              {group.title}
            </p>

            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  location.pathname === item.path;

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => {
                      if (
                        onClose &&
                        window.innerWidth < 1024
                      ) {
                        onClose();
                      }
                    }}
                    className={`
                      group
                      relative
                      flex
                      items-center
                      ${collapsed
                        ? 'justify-center px-2'
                        : 'gap-2.5 px-3'
                      }
                      py-2
                      rounded-lg
                      text-[13px]
                      font-medium
                      transition-all
                      duration-200
                      ${isActive
                        ? 'bg-[#EFF6F3] text-[#0F4C42] font-semibold border border-[#D8E8E2]'
                        : 'text-[#45645E] hover:text-[#0F4C42] hover:bg-[#F3F8F6] border border-transparent'
                      }
                    `}
                  >
                    {/* Icon */}
                    <span
                      className={`
                        flex
                        items-center
                        justify-center
                        shrink-0
                        transition-colors
                        duration-200
                        ${isActive
                          ? 'text-[#0F4C42]'
                          : 'text-[#45645E]'
                        }
                      `}
                    >
                      {item.icon}
                    </span>

                    {/* Label */}
                    <span
                      className={`
                        flex-1
                        whitespace-nowrap
                        overflow-hidden
                        transition-all
                        duration-200
                        ${collapsed
                          ? 'opacity-0 w-0 flex-none'
                          : 'opacity-100 w-auto'
                        }
                      `}
                    >
                      {item.label}
                    </span>

                    {/* Badge */}
                    {item.badge !== undefined &&
                      item.badge > 0 && (
                        <span
                          className={`
                            shrink-0
                            w-5 h-5
                            bg-red-500
                            text-white
                            text-[10px]
                            font-bold
                            rounded-full
                            flex
                            items-center
                            justify-center
                            transition-all duration-200
                            ${collapsed
                              ? 'absolute -top-1 -right-1'
                              : ''
                            }
                          `}
                        >
                          {item.badge}
                        </span>
                      )}

                    {/* Tooltip */}
                    {collapsed && (
                      <span
                        className="
                          absolute
                          left-full
                          ml-3
                          px-2.5
                          py-1.5
                          rounded-md
                          bg-[#0F4C42]
                          text-white
                          text-xs
                          font-medium
                          whitespace-nowrap
                          opacity-0
                          invisible
                          group-hover:opacity-100
                          group-hover:visible
                          pointer-events-none
                          transition-all
                          duration-150
                          z-50
                          shadow-md
                        "
                      >
                        {item.label}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}