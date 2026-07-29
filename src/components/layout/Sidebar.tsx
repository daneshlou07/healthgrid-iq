import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import type { UserRole } from '../../types';
import {
  Activity, LayoutDashboard, Users, FolderOpen, FileText, ClipboardList,
  ScanLine, Upload, Eye, PenTool, Calendar, Building2, CheckSquare,
  Truck, ScrollText, Settings, Brain, Megaphone, BarChart3,
  Layers, Search, UserCheck, Trash2,
} from 'lucide-react';

interface NavItem { label: string; path: string; icon: React.ReactNode; badge?: number; }
interface NavGroup { title: string; items: NavItem[]; }

function getNavGroups(role: UserRole, pendingRequests: number): NavGroup[] {
  switch (role) {
    case 'Radiographer':
      return [
        { title: 'MAIN', items: [
          { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
          { label: 'My Schedule', path: '/schedule', icon: <Calendar className="w-[18px] h-[18px]" /> },
        ]},
        { title: 'CASES', items: [
          { label: 'My Cases', path: '/scan-queue', icon: <FolderOpen className="w-[18px] h-[18px]" /> },
          { label: 'Upload Scans', path: '/upload', icon: <Upload className="w-[18px] h-[18px]" /> },
        ]},
        { title: 'ACCOUNT', items: [
          { label: 'Onboarding', path: '/onboarding', icon: <UserCheck className="w-[18px] h-[18px]" /> },
        ]},
      ];
    case 'Radiologist':
      return [
        { title: 'MAIN', items: [
          { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
          { label: 'Inbox', path: '/review-queue', icon: <Eye className="w-[18px] h-[18px]" /> },
        ]},
        { title: 'REPORTS', items: [
          { label: 'Imaging Completed', path: '/reports', icon: <FileText className="w-[18px] h-[18px]" /> },
        ]},
        { title: 'ACCOUNT', items: [
          { label: 'Onboarding', path: '/onboarding', icon: <UserCheck className="w-[18px] h-[18px]" /> },
        ]},
      ];
    case 'Radiology Department':
      return [
        { title: 'RADIOLOGY DEPARTMENT', items: [
          { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
          { label: 'Patient Registry', path: '/patients', icon: <Users className="w-[18px] h-[18px]" /> },
          { label: 'Register Patient', path: '/patients/register', icon: <ClipboardList className="w-[18px] h-[18px]" /> },
          { label: 'Register New Case', path: '/cases/new', icon: <FileText className="w-[18px] h-[18px]" /> },
          { label: 'Cases', path: '/cases', icon: <FolderOpen className="w-[18px] h-[18px]" /> },
          { label: 'Diagnostic Reports', path: '/reports', icon: <FileText className="w-[18px] h-[18px]" /> },
          { label: 'Patient Record Requests', path: '/requests', icon: <CheckSquare className="w-[18px] h-[18px]" /> },
          { label: 'Track Status', path: '/track-status', icon: <Search className="w-[18px] h-[18px]" /> },
        ]},
      ];
    case 'Administrator':
      return [
        { title: 'MAIN', items: [
          { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
          { label: 'User Management', path: '/users', icon: <Users className="w-[18px] h-[18px]" /> },
          { label: 'Clinic Management', path: '/clinics', icon: <Building2 className="w-[18px] h-[18px]" /> },
          { label: 'Imaging Equipment', path: '/fleet', icon: <Truck className="w-[18px] h-[18px]" /> },
        ]},
        { title: 'OPERATIONS', items: [
          { label: 'Patient Registry', path: '/patient-registry', icon: <ClipboardList className="w-[18px] h-[18px]" /> },
          { label: 'Patient Requests', path: '/patient-requests', icon: <CheckSquare className="w-[18px] h-[18px]" />, badge: pendingRequests },
          { label: 'AI Scheduler', path: '/ai-scheduler', icon: <Brain className="w-[18px] h-[18px]" /> },
          { label: 'Analytics', path: '/analytics', icon: <BarChart3 className="w-[18px] h-[18px]" /> },
        ]},
        { title: 'SYSTEM', items: [
          { label: 'Announcements', path: '/announcements', icon: <Megaphone className="w-[18px] h-[18px]" /> },
          { label: 'System Settings', path: '/settings', icon: <Settings className="w-[18px] h-[18px]" /> },
          { label: 'Audit Trail', path: '/audit-logs', icon: <ScrollText className="w-[18px] h-[18px]" /> },
          { label: 'Recycle Bin', path: '/recycle-bin', icon: <Trash2 className="w-[18px] h-[18px]" /> },
          { label: 'Infrastructure', path: '/tech-stack', icon: <Layers className="w-[18px] h-[18px]" /> },
        ]},
      ];
    default:
      return [];
  }
}

export default function Sidebar() {
  const { currentUser } = useAuth();
  const { patientRequests } = useData();
  const location = useLocation();
  if (!currentUser) return null;

  const pendingRequests = patientRequests.filter((r) => r.status === 'Pending').length;
  const groups = getNavGroups(currentUser.role, pendingRequests);

  return (
    <aside className="w-60 bg-white border-r border-surface-300 flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-surface-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-navy-600 rounded-lg flex items-center justify-center">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-navy-800 leading-tight">
              HealthGrid <span className="text-emerald-600">IQ</span>
            </h1>
            <p className="text-[10px] text-surface-500 leading-tight">Theta Edge Berhad</p>
          </div>
        </div>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 overflow-y-auto py-3 px-3">
        {groups.map((group, gi) => (
          <div key={group.title} className={gi > 0 ? 'mt-4' : ''}>
            <p className="px-3 mb-1.5 text-[10px] font-semibold text-surface-400 uppercase tracking-wider">{group.title}</p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-100 ${
                      isActive
                        ? 'bg-navy-50 text-navy-700 border border-navy-100'
                        : 'text-surface-600 hover:text-navy-700 hover:bg-surface-100 border border-transparent'
                    }`}
                  >
                    {item.icon}
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

      {/* No user section in sidebar — use header profile dropdown */}
    </aside>
  );
}
