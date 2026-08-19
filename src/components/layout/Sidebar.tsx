import React from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useLanguage } from '../../context/LanguageContext';
import type { UserRole } from '../../types';

import {
  House,
  Users,
  UserPlus,
  FolderOpen,
  FileText,
  FilePlus2,
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
  Inbox,
  ArrowRightLeft,
  FileImage,
  ClipboardPenLine,
  ShieldCheck,
  Stethoscope,
  Package,
  ShoppingBag,
  Wrench,
  GitBranch,
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
  pendingOrders: number,
  pendingBems: number,
  t: (en: string, ms: string) => string
): NavGroup[] {
  switch (role) {
    case 'Radiographer':
    case 'Public Hospital Radiographer':
    case 'Private Hospital Radiographer':
      return [
        {
          title: t('CLINICAL RADIOGRAPHY', 'RADIOGRAFI KLINIKAL'),
          items: [
            {
              label: t('Dashboard', 'Papan Pemuka'),
              path: '/dashboard',
              icon: <House className="w-[18px] h-[18px]" />,
            },
            {
              label: t('Scan Queue & Upload', 'Giliran & Muat Naik Imbasan'),
              path: '/scan-queue',
              icon: <Upload className="w-[18px] h-[18px]" />,
            },
            {
              label: t('Daily Worklist & Schedule', 'Senarai Tugas Harian & Jadual'),
              path: '/schedule',
              icon: <Calendar className="w-[18px] h-[18px]" />,
            },
            {
              label: t('All Medical Cases', 'Semua Kes Perubatan'),
              path: '/cases',
              icon: <FolderOpen className="w-[18px] h-[18px]" />,
            },
            {
              label: t('Track Case Status', 'Jejak Status Kes'),
              path: '/track-status',
              icon: <ArrowRightLeft className="w-[18px] h-[18px]" />,
            },
            {
              label: t('My Credentials', 'Kelayakan Saya'),
              path: '/onboarding',
              icon: <ShieldCheck className="w-[18px] h-[18px]" />,
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
              icon: <House className="w-[18px] h-[18px]" />,
            },
            {
              label: t('Diagnostic Hub & Reports', 'Hab Diagnostik & Laporan'),
              path: '/reporting',
              icon: <FileText className="w-[18px] h-[18px]" />,
            },
            {
              label: t('Specialist Credentials', 'Kelayakan Pakar'),
              path: '/onboarding',
              icon: <ShieldCheck className="w-[18px] h-[18px]" />,
            },
          ],
        },
      ];

    case 'Medical Officer':
      return [
        {
          title: t(
            'CLINICAL CARE',
            'PENJAGAAN KLINIKAL'
          ),
          items: [
            {
              label: t(
                'Dashboard',
                'Papan Pemuka'
              ),
              path: '/dashboard',
              icon: (
                <House className="w-[18px] h-[18px]" />
              ),
            },
            {
              label: t(
                'Patient Registry',
                'Pendaftaran Pesakit'
              ),
              path: '/patients',
              icon: (
                <Users className="w-[18px] h-[18px]" />
              ),
            },
            {
              label: t(
                'Register Patient',
                'Daftar Pesakit'
              ),
              path: '/patients/register',
              icon: (
                <UserPlus className="w-[18px] h-[18px]" />
              ),
            },
            {
              label: t(
                'New Case Registration',
                'Pendaftaran Kes Baharu'
              ),
              path: '/cases/new',
              icon: (
                <FilePlus2 className="w-[18px] h-[18px]" />
              ),
            },
            {
              label: t(
                'All Medical Cases',
                'Semua Kes Perubatan'
              ),
              path: '/cases',
              icon: (
                <FolderOpen className="w-[18px] h-[18px]" />
              ),
            },
            {
              label: t(
                'Patient Requests',
                'Permohonan Pemindahan Pesakit'
              ),
              path: '/requests',
              icon: (
                <Inbox className="w-[18px] h-[18px]" />
              ),
              badge: pendingRequests,
            },
            {
              label: t(
                'Track Transfer Status',
                'Jejak Status Pemindahan'
              ),
              path: '/track-status',
              icon: (
                <ArrowRightLeft className="w-[18px] h-[18px]" />
              ),
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
                'Diagnostic Hub & Reports',
                'Hab Diagnostik & Laporan'
              ),
              path: '/reporting',
              icon: (
                <FileText className="w-[18px] h-[18px]" />
              ),
            },
          ],
        },
        {
          title: t(
            'ACCOUNT & VERIFICATION',
            'AKAUN & PENGESAHAN'
          ),
          items: [
            {
              label: t(
                'Clinical Credentials',
                'Kelayakan Klinikal'
              ),
              path: '/onboarding',
              icon: (
                <ShieldCheck className="w-[18px] h-[18px]" />
              ),
            },
          ],
        },
      ];

    case 'BEMZ':
      return [
        {
          title: t('BEMS OPERATIONS', 'OPERASI BEMS'),
          items: [
            {
              label: t('Dashboard', 'Papan Pemuka'),
              path: '/dashboard',
              icon: <House className="w-[18px] h-[18px]" />,
            },
            {
              label: t('BEMS Referral Portal', 'Portal Rujukan BEMS'),
              path: '/bems',
              icon: <Wrench className="w-[18px] h-[18px]" />,
              badge: pendingBems,
            },
            {
              label: t('All Medical Cases', 'Semua Kes Perubatan'),
              path: '/cases',
              icon: <FolderOpen className="w-[18px] h-[18px]" />,
            },
            {
              label: t('Track Case Status', 'Jejak Status Kes'),
              path: '/track-status',
              icon: <ArrowRightLeft className="w-[18px] h-[18px]" />,
            },
          ],
        },
      ];

    case 'Private Hospital Admin':
      return [
        {
          title: t('HOSPITAL REFERRALS', 'RUJUKAN HOSPITAL'),
          items: [
            {
              label: t('Dashboard', 'Papan Pemuka'),
              path: '/dashboard',
              icon: <House className="w-[18px] h-[18px]" />,
            },
            {
              label: t('External Referrals Intake', 'Pengambilan Rujukan Luar'),
              path: '/private-admin',
              icon: <Building2 className="w-[18px] h-[18px]" />,
            },
            {
              label: t('Track Status', 'Jejak Status'),
              path: '/track-status',
              icon: <ArrowRightLeft className="w-[18px] h-[18px]" />,
            },
          ],
        },
      ];



    case 'Equipment Marketplace':
      return [];

    case 'Administrator':
      return [
        {
          title: t(
            'MANAGEMENT',
            'PENGURUSAN'
          ),
          items: [
            {
              label: t(
                'Dashboard',
                'Papan Pemuka'
              ),
              path: '/dashboard',
              icon: (
                <House className="w-[18px] h-[18px]" />
              ),
            },
            {
              label: t(
                'Clinic Management',
                'Pengurusan Klinik'
              ),
              path: '/clinics',
              icon: (
                <Building2 className="w-[18px] h-[18px]" />
              ),
            },

            {
              label: t(
                'AI Scheduler',
                'Penjadual AI'
              ),
              path: '/ai-scheduler',
              icon: (
                <Brain className="w-[18px] h-[18px]" />
              ),
            },
            {
              label: t(
                'Patient Management',
                'Pengurusan Pesakit'
              ),
              path: '/patients',
              icon: (
                <Users className="w-[18px] h-[18px]" />
              ),
            },
            {
              label: t(
                'All Cases Overview',
                'Gambaran Keseluruhan Kes'
              ),
              path: '/cases',
              icon: (
                <FolderOpen className="w-[18px] h-[18px]" />
              ),
            },
            {
              label: t(
                'Transfer Requests',
                'Permohonan Pemindahan'
              ),
              path: '/requests',
              icon: (
                <Truck className="w-[18px] h-[18px]" />
              ),
              badge: pendingRequests,
            },
            {
              label: t(
                'BEMS Referral Portal',
                'Portal Rujukan BEMS'
              ),
              path: '/bems',
              icon: (
                <Wrench className="w-[18px] h-[18px]" />
              ),
              badge: pendingBems,
            },
            {
              label: t(
                'Private Hospital Referrals',
                'Rujukan Hospital Swasta'
              ),
              path: '/private-admin',
              icon: (
                <Building2 className="w-[18px] h-[18px]" />
              ),
            },
            {
              label: t(
                'External Radiographer Hub',
                'Hab Juruxray Luar'
              ),
              path: '/external-radiographer',
              icon: (
                <ClipboardList className="w-[18px] h-[18px]" />
              ),
            },
          ],
        },
        {
          title: t(
            'SYSTEM',
            'SISTEM'
          ),
          items: [
            {
              label: t(
                'System Reports',
                'Laporan Sistem'
              ),
              path: '/reports',
              icon: (
                <FileText className="w-[18px] h-[18px]" />
              ),
            },
            {
              label: t(
                'User Management',
                'Pengurusan Pengguna'
              ),
              path: '/users',
              icon: (
                <UserCheck className="w-[18px] h-[18px]" />
              ),
            },
            {
              label: t(
                'Trash / Recycle Bin',
                'Tong Sampah / Tong Kitar Semula'
              ),
              path: '/recycle-bin',
              icon: (
                <Trash2 className="w-[18px] h-[18px]" />
              ),
            },
            {
              label: t(
                'Audit Logs',
                'Log Audit'
              ),
              path: '/audit-logs',
              icon: (
                <ScrollText className="w-[18px] h-[18px]" />
              ),
            },
          ],
        },
      ];

    case 'Super Admin':
      return [
        {
          title: t(
            'MANAGEMENT',
            'PENGURUSAN'
          ),
          items: [
            {
              label: t(
                'Dashboard',
                'Papan Pemuka'
              ),
              path: '/dashboard',
              icon: (
                <House className="w-[18px] h-[18px]" />
              ),
            },
            {
              label: t(
                'Clinic Management',
                'Pengurusan Klinik'
              ),
              path: '/clinics',
              icon: (
                <Building2 className="w-[18px] h-[18px]" />
              ),
            },

            {
              label: t(
                'AI Scheduler',
                'Penjadual AI'
              ),
              path: '/ai-scheduler',
              icon: (
                <Brain className="w-[18px] h-[18px]" />
              ),
            },
            {
              label: t(
                'Patient Management',
                'Pengurusan Pesakit'
              ),
              path: '/patients',
              icon: (
                <Users className="w-[18px] h-[18px]" />
              ),
            },
            {
              label: t(
                'All Cases Overview',
                'Gambaran Keseluruhan Kes'
              ),
              path: '/cases',
              icon: (
                <FolderOpen className="w-[18px] h-[18px]" />
              ),
            },
            {
              label: t(
                'Transfer Requests',
                'Permohonan Pemindahan'
              ),
              path: '/requests',
              icon: (
                <Truck className="w-[18px] h-[18px]" />
              ),
              badge: pendingRequests,
            },
            {
              label: t(
                'BEMS Referral Portal',
                'Portal Rujukan BEMS'
              ),
              path: '/bems',
              icon: (
                <Wrench className="w-[18px] h-[18px]" />
              ),
              badge: pendingBems,
            },
            {
              label: t(
                'Private Hospital Referrals',
                'Rujukan Hospital Swasta'
              ),
              path: '/private-admin',
              icon: (
                <Building2 className="w-[18px] h-[18px]" />
              ),
            },
            {
              label: t(
                'External Radiographer Hub',
                'Hab Juruxray Luar'
              ),
              path: '/external-radiographer',
              icon: (
                <ClipboardList className="w-[18px] h-[18px]" />
              ),
            },
          ],
        },
        {
          title: t(
            'EQUIPMENT MARKETPLACE',
            'PASARAN PERALATAN'
          ),
          items: [
            {
              label: t(
                'Medical Equipment',
                'Peralatan Perubatan'
              ),
              path: '/marketplace/medical',
              icon: (
                <Stethoscope className="w-[18px] h-[18px]" />
              ),
            },
            {
              label: t(
                'Non-Medical Equipment',
                'Peralatan Bukan Perubatan'
              ),
              path: '/marketplace/non-medical',
              icon: (
                <Building2 className="w-[18px] h-[18px]" />
              ),
            },
            {
              label: t(
                'Orders & Quotations',
                'Pesanan & Sebut Harga'
              ),
              path: '/marketplace/orders',
              icon: (
                <ClipboardList className="w-[18px] h-[18px]" />
              ),
              badge: pendingOrders,
            },
            {
              label: t(
                'Equipment Management',
                'Pengurusan Peralatan'
              ),
              path: '/marketplace/manage-items',
              icon: (
                <Package className="w-[18px] h-[18px]" />
              ),
            },
            {
              label: t(
                'Browse All Equipment',
                'Lihat Semua Peralatan'
              ),
              path: '/marketplace',
              icon: (
                <ShoppingBag className="w-[18px] h-[18px]" />
              ),
            },
          ],
        },
        {
          title: t(
            'SYSTEM',
            'SISTEM'
          ),
          items: [
            {
              label: t(
                'System Reports',
                'Laporan Sistem'
              ),
              path: '/reports',
              icon: (
                <FileText className="w-[18px] h-[18px]" />
              ),
            },
            {
              label: t(
                'User Management',
                'Pengurusan Pengguna'
              ),
              path: '/users',
              icon: (
                <UserCheck className="w-[18px] h-[18px]" />
              ),
            },
            {
              label: t(
                'Trash / Recycle Bin',
                'Tong Sampah / Tong Kitar Semula'
              ),
              path: '/recycle-bin',
              icon: (
                <Trash2 className="w-[18px] h-[18px]" />
              ),
            },
            {
              label: t(
                'Audit Logs',
                'Log Audit'
              ),
              path: '/audit-logs',
              icon: (
                <ScrollText className="w-[18px] h-[18px]" />
              ),
            },
          ],
        },
      ];

    default:
      return [];
  }
}

export default function Sidebar({
  onClose,
}: SidebarProps) {
  const { currentUser } = useAuth();
  const { patientRequests, quotationRequests, externalReferrals, cases, roleNavigationConfig } = useData();
  const { t } = useLanguage();
  const location = useLocation();

  const [collapsed, setCollapsed] =
    React.useState(false);

  if (!currentUser) return null;

  const pendingRequests =
    patientRequests.filter(
      (r) => r.status === 'Pending'
    ).length;

  const pendingOrders =
    quotationRequests.filter(
      (q) => q.status === 'SUBMITTED'
    ).length;

  const pendingBems =
    externalReferrals.filter(
      (r) => r.status === 'PENDING_BEMZ' || r.status === 'BEMZ_REVIEWING'
    ).length +
    cases.filter(
      (c) =>
        (c.status === 'EXTERNAL_REFERRAL_PENDING' ||
          c.status === 'MACHINE_UNAVAILABLE' ||
          c.status === 'BEMZ_REVIEW' ||
          Boolean(c.machineIssue)) &&
        !externalReferrals.some((r) => r.caseId === c.id || r.id === c.externalReferralId)
    ).length;

  const rawGroups = getNavGroups(
    currentUser.role,
    pendingRequests,
    pendingOrders,
    pendingBems,
    t
  );

  // Map route paths to RBAC module identifiers
  const pathToKeyMap: Record<string, string> = {
    '/dashboard': 'dashboard',
    '/scan-queue': 'scan_queue',
    '/schedule': 'schedule',
    '/reporting': 'reporting',
    '/patients': 'patients',
    '/patients/register': 'register_patient',
    '/cases/new': 'new_case',
    '/cases': 'cases',
    '/requests': 'patient_requests',
    '/bems': 'bems',
    '/private-admin': 'private_admin',
    '/ai-scheduler': 'ai_scheduler',
    '/fleet': 'fleet',
    '/clinics': 'clinics',
    '/users': 'users',
    '/audit-logs': 'audit_logs',
    '/analytics': 'analytics',
    '/tech-stack': 'tech_stack',
    '/track-status': 'track_status',
    '/onboarding': 'credentials',
  };

  const allowedKeys = roleNavigationConfig?.[currentUser.role];

  // Dynamically filter items according to configured role permissions
  const groups = React.useMemo(() => {
    // If Super Admin, always show everything
    if (currentUser.role === 'Super Admin' || !allowedKeys) {
      return rawGroups;
    }

    return rawGroups
      .map((g) => ({
        ...g,
        items: g.items.filter((item) => {
          const key = pathToKeyMap[item.path];
          if (!key) return true;
          return allowedKeys.includes(key);
        }),
      }))
      .filter((g) => g.items.length > 0);
  }, [rawGroups, allowedKeys, currentUser.role]);

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
        ${collapsed
          ? 'w-[72px]'
          : 'w-60'
        }
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

        <Link
          to="/"
          onClick={onClose}
          title="Return to Dashboard"
          className={`
            flex items-center
            justify-center
            overflow-hidden
            transition-all duration-300
            hover:opacity-85
            cursor-pointer
            ${collapsed
              ? 'w-10 h-16'
              : 'flex-1 h-16'
            }
          `}
        >

          {collapsed ? (
            <img
              src="/assets/iq-logo-transparent.png"
              alt="HealthGrid IQ"
              className="
                w-11
                h-11
                object-contain
                select-none
              "
            />
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

        </Link>

        {/* Desktop Collapse Button */}

        <button
          onClick={() =>
            setCollapsed(!collapsed)
          }
          className={`
            absolute
            -right-3
            top-6
            z-30
            w-6
            h-6
            rounded-full
            bg-white
            border border-[#E2E8E6]
            flex
            items-center
            justify-center
            text-[#45645E]
            hover:text-[#0F4C42]
            hover:border-[#BFD8D0]
            shadow-sm
            transition-all
            duration-200
            cursor-pointer
          `}
          title={
            collapsed
              ? 'Expand sidebar'
              : 'Collapse sidebar'
          }
          aria-label={
            collapsed
              ? 'Expand sidebar'
              : 'Collapse sidebar'
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
          ${collapsed
            ? 'px-2'
            : 'px-3'
          }
        `}
      >

        {groups.map(
          (group, gi) => (
            <div
              key={group.title}
              className={`
                transition-all duration-300
                ${gi > 0
                  ? 'mt-4'
                  : ''
                }
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

                {group.items.map(
                  (item) => {
                    const isActive =
                      location.pathname ===
                      item.path;

                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => {
                          if (
                            onClose &&
                            window.innerWidth <
                            1024
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

                        {item.badge !==
                          undefined &&
                          item.badge > 0 && (
                            <span
                              className={`
                                shrink-0
                                w-5
                                h-5
                                bg-red-500
                                text-white
                                text-[10px]
                                font-bold
                                rounded-full
                                flex
                                items-center
                                justify-center
                                transition-all
                                duration-200
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
                  }
                )}

              </div>
            </div>
          )
        )}

      </nav>

    </aside>
  );
}