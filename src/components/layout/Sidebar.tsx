import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useLanguage } from '../../context/LanguageContext';
import type { UserRole } from '../../types';
import {
  Activity, LayoutDashboard, Users, FolderOpen, FileText, ClipboardList,
  Upload, Eye, Calendar, Building2, CheckSquare,
  Truck, ScrollText, Settings, Brain, Megaphone, BarChart3,
  Layers, Search, UserCheck, Trash2,
} from 'lucide-react';

interface NavItem { label: string; path: string; icon: React.ReactNode; badge?: number; }
interface NavGroup { title: string; items: NavItem[]; }

function getNavGroups(role: UserRole, pendingRequests: number, t: (en: string, ms: string) => string): NavGroup[] {
  switch (role) {
    case 'Radiographer':
      return [
        { title: t('MAIN', 'UTAMA'), items: [
          { label: t('Dashboard', 'Papan Pemuka'), path: '/dashboard', icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
          { label: t('My Schedule', 'Jadual Saya'), path: '/schedule', icon: <Calendar className="w-[18px] h-[18px]" /> },
        ]},
        { title: t('CASES', 'KES-KES'), items: [
          { label: t('My Cases', 'Kes Saya'), path: '/scan-queue', icon: <FolderOpen className="w-[18px] h-[18px]" /> },
          { label: t('Upload Scans', 'Muat Naik Imbasan'), path: '/upload', icon: <Upload className="w-[18px] h-[18px]" /> },
        ]},
        { title: t('ACCOUNT', 'AKAUN'), items: [
          { label: t('Onboarding', 'Panduan Pengguna'), path: '/onboarding', icon: <UserCheck className="w-[18px] h-[18px]" /> },
        ]},
      ];
    case 'Medical Officer':
      return [
        { title: t('MAIN', 'UTAMA'), items: [
          { label: t('Dashboard', 'Papan Pemuka'), path: '/dashboard', icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
          { label: t('Cases to Review', 'Kes Untuk Disemak'), path: '/review-queue', icon: <Eye className="w-[18px] h-[18px]" /> },
          { label: t('All Cases Queue', 'Senarai Semua Kes'), path: '/cases', icon: <FolderOpen className="w-[18px] h-[18px]" /> },
        ]},
        { title: t('CASE INTAKE & REGISTRATION', 'PENDAFTARAN KES & PESAKIT'), items: [
          { label: t('Register Patient', 'Daftar Pesakit'), path: '/patients/register', icon: <ClipboardList className="w-[18px] h-[18px]" /> },
          { label: t('Register New Case', 'Daftar Kes Baharu'), path: '/cases/new', icon: <FileText className="w-[18px] h-[18px]" /> },
          { label: t('Patient Requests', 'Permohonan Pesakit'), path: '/requests', icon: <CheckSquare className="w-[18px] h-[18px]" /> },
        ]},
        { title: t('PATIENTS & REPORTS', 'PESAKIT & LAPORAN'), items: [
          { label: t('Patient Registry', 'Daftar Induk Pesakit'), path: '/patients', icon: <Users className="w-[18px] h-[18px]" /> },
          { label: t('Diagnostic Reports', 'Laporan Diagnostik'), path: '/reports', icon: <FileText className="w-[18px] h-[18px]" /> },
          { label: t('Track Status', 'Jejak Status'), path: '/track-status', icon: <Search className="w-[18px] h-[18px]" /> },
        ]},
        { title: t('ACCOUNT', 'AKAUN'), items: [
          { label: t('Onboarding', 'Panduan Pengguna'), path: '/onboarding', icon: <UserCheck className="w-[18px] h-[18px]" /> },
        ]},
      ];
    case 'Radiologist':
      return [
        { title: t('MAIN', 'UTAMA'), items: [
          { label: t('Dashboard', 'Papan Pemuka'), path: '/dashboard', icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
          { label: t('Inbox', 'Peti Masuk'), path: '/review-queue', icon: <Eye className="w-[18px] h-[18px]" /> },
        ]},
        { title: t('REPORTS', 'LAPORAN'), items: [
          { label: t('Imaging Completed', 'Imbasan Selesai'), path: '/reports', icon: <FileText className="w-[18px] h-[18px]" /> },
        ]},
        { title: t('ACCOUNT', 'AKAUN'), items: [
          { label: t('Onboarding', 'Panduan Pengguna'), path: '/onboarding', icon: <UserCheck className="w-[18px] h-[18px]" /> },
        ]},
      ];
    case 'Radiology Department':
      return [
        { title: t('MAIN', 'UTAMA'), items: [
          { label: t('Dashboard', 'Papan Pemuka'), path: '/dashboard', icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
          { label: t('Patient Registry', 'Daftar Pesakit'), path: '/patients', icon: <Users className="w-[18px] h-[18px]" /> },
          { label: t('Register Patient', 'Daftar Pesakit'), path: '/patients/register', icon: <ClipboardList className="w-[18px] h-[18px]" /> },
          { label: t('Register New Case', 'Daftar Kes Baharu'), path: '/cases/new', icon: <FileText className="w-[18px] h-[18px]" /> },
        ]},
      ];
    case 'Administrator':
      return [
        { title: t('MAIN', 'UTAMA'), items: [
          { label: t('Dashboard', 'Papan Pemuka'), path: '/dashboard', icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
          { label: t('User Management', 'Pengurusan Pengguna'), path: '/users', icon: <Users className="w-[18px] h-[18px]" /> },
          { label: t('Clinic Management', 'Pengurusan Klinik'), path: '/clinics', icon: <Building2 className="w-[18px] h-[18px]" /> },
          { label: t('Imaging Equipment', 'Peralatan Imbasan'), path: '/fleet', icon: <Truck className="w-[18px] h-[18px]" /> },
        ]},
        { title: t('OPERATIONS', 'OPERASI'), items: [
          { label: t('Patient Registry', 'Daftar Pesakit'), path: '/patient-registry', icon: <ClipboardList className="w-[18px] h-[18px]" /> },
          { label: t('Patient Requests', 'Permohonan Pesakit'), path: '/patient-requests', icon: <CheckSquare className="w-[18px] h-[18px]" />, badge: pendingRequests },
          { label: t('Track Status', 'Jejak Status'), path: '/track-status', icon: <Search className="w-[18px] h-[18px]" /> },
          { label: t('AI Scheduler', 'Penjadual AI'), path: '/ai-scheduler', icon: <Brain className="w-[18px] h-[18px]" /> },
          { label: t('Analytics', 'Analitik'), path: '/analytics', icon: <BarChart3 className="w-[18px] h-[18px]" /> },
        ]},
        { title: t('SYSTEM', 'SISTEM'), items: [
          { label: t('Announcements', 'Pengumuman'), path: '/announcements', icon: <Megaphone className="w-[18px] h-[18px]" /> },
          { label: t('System Settings', 'Tetapan Sistem'), path: '/settings', icon: <Settings className="w-[18px] h-[18px]" /> },
          { label: t('Audit Trail', 'Log Audit'), path: '/audit-logs', icon: <ScrollText className="w-[18px] h-[18px]" /> },
          { label: t('Recycle Bin', 'Tong Sampah'), path: '/recycle-bin', icon: <Trash2 className="w-[18px] h-[18px]" /> },
          { label: t('Infrastructure', 'Infrastruktur'), path: '/tech-stack', icon: <Layers className="w-[18px] h-[18px]" /> },
        ]},
      ];
    default:
      return [];
  }
}

export default function Sidebar() {
  const { currentUser } = useAuth();
  const { patientRequests } = useData();
  const { t } = useLanguage();
  const location = useLocation();
  if (!currentUser) return null;

  const pendingRequests = patientRequests.filter((r) => r.status === 'Pending').length;
  const groups = getNavGroups(currentUser.role, pendingRequests, t);

  return (
    <aside className="w-60 bg-[#D4E2DD] border-r border-[#C0D3CD] flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-3 border-b border-[#C0D3CD]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#14315A] rounded-lg flex items-center justify-center shadow-xs">
            <Activity className="w-4 h-4 text-[#00A86B]" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-[#14315A] leading-tight">
              HealthGrid <span className="text-[#8C226E]">IQ</span>
            </h1>
            <p className="text-[10px] text-[#8C226E] leading-tight font-semibold">Theta Edge Berhad</p>
          </div>
        </div>
        <div className="mt-2.5 px-2 py-0.5 bg-white/70 border border-[#C0D3CD] rounded text-[10px] font-bold text-[#14315A] tracking-wider uppercase truncate">
          {currentUser.role} Portal
        </div>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 overflow-y-auto py-3 px-3">
        {groups.map((group, gi) => (
          <div key={group.title} className={gi > 0 ? 'mt-4' : ''}>
            <p className="px-3 mb-1.5 text-[10px] font-semibold text-[#3B665E] uppercase tracking-wider">{group.title}</p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-100 ${
                      isActive
                        ? 'bg-white text-surface-900 font-semibold border border-surface-200/80 shadow-xs'
                        : 'text-[#2C524B] hover:text-[#0F4C42] hover:bg-[#C8DAD4] border border-transparent'
                    }`}
                  >
                    <span className={isActive ? 'text-[#0F4C42]' : ''}>{item.icon}</span>
                    <span className="flex-1">{item.label}</span>
                    {item.badge && item.badge > 0 && (
                      <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {item.badge}
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
