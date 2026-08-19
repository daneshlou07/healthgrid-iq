import type { UserRole } from '../types';

export interface NavModuleDefinition {
  id: string;
  label: string;
  category: 'Clinical Core' | 'Imaging & Technical' | 'Administration & Governance' | 'Operations & Fleet';
  description: string;
  defaultPath: string;
  iconName: string;
}

export const ALL_NAV_MODULES: NavModuleDefinition[] = [
  // Clinical Core
  {
    id: 'dashboard',
    label: 'Dashboard & KPIs',
    category: 'Clinical Core',
    description: 'Main operational overview, active queue stats, and daily performance metrics.',
    defaultPath: '/dashboard',
    iconName: 'House',
  },
  {
    id: 'patients',
    label: 'Patient Registry',
    category: 'Clinical Core',
    description: 'Patient directory, demographics, and clinical history repository.',
    defaultPath: '/patients',
    iconName: 'Users',
  },
  {
    id: 'register_patient',
    label: 'Register New Patient',
    category: 'Clinical Core',
    description: 'Form for registering new patients into the MOH HealthGrid database.',
    defaultPath: '/patients/register',
    iconName: 'UserPlus',
  },
  {
    id: 'new_case',
    label: 'New Case Registration',
    category: 'Clinical Core',
    description: 'Clinical order intake form to request diagnostic imaging for a patient.',
    defaultPath: '/cases/new',
    iconName: 'FilePlus2',
  },
  {
    id: 'cases',
    label: 'All Medical Cases',
    category: 'Clinical Core',
    description: 'Searchable clinical case repository with status, modality, and facility filters.',
    defaultPath: '/cases',
    iconName: 'FolderOpen',
  },
  {
    id: 'reporting',
    label: 'Diagnostic Hub & Reports',
    category: 'Clinical Core',
    description: '3-in-1 triage queue, PACS diagnostic desk, AI Copilot, and signed reports archive.',
    defaultPath: '/reporting',
    iconName: 'FileText',
  },
  {
    id: 'patient_requests',
    label: 'Patient Transfer Requests',
    category: 'Clinical Core',
    description: 'Queue for patient records modification and transfer requests between centers.',
    defaultPath: '/requests',
    iconName: 'ClipboardList',
  },
  {
    id: 'track_status',
    label: 'Track Case Status',
    category: 'Clinical Core',
    description: 'Real-time patient journey tracker across registration, scanning, and diagnosis.',
    defaultPath: '/track-status',
    iconName: 'ArrowRightLeft',
  },

  // Imaging & Technical
  {
    id: 'scan_queue',
    label: 'Scan Queue & Upload',
    category: 'Imaging & Technical',
    description: 'Radiographer worksheet with DICOM dropzone, exam checklist, and radiation dose entry.',
    defaultPath: '/scan-queue',
    iconName: 'Upload',
  },
  {
    id: 'schedule',
    label: 'Daily Worklist & Schedule',
    category: 'Imaging & Technical',
    description: 'Daily appointment roster, hourly timetable grid, and clinical time slots.',
    defaultPath: '/schedule',
    iconName: 'Calendar',
  },
  {
    id: 'credentials',
    label: 'My Credentials & License',
    category: 'Imaging & Technical',
    description: 'MOH practitioner credentialing, professional licensing, and profile onboarding.',
    defaultPath: '/onboarding',
    iconName: 'ShieldCheck',
  },

  // Operations & Referrals
  {
    id: 'bems',
    label: 'BEMS Referral Portal',
    category: 'Operations & Fleet',
    description: 'Biomedical engineering portal for managing machine breakdowns and facility routing.',
    defaultPath: '/bems',
    iconName: 'Wrench',
  },
  {
    id: 'private_admin',
    label: 'Private Hospital Intake',
    category: 'Operations & Fleet',
    description: 'Intake workspace for private hospital administrators to assign their imaging staff.',
    defaultPath: '/private-admin',
    iconName: 'Building2',
  },
  {
    id: 'ai_scheduler',
    label: 'AI Resource Scheduler',
    category: 'Operations & Fleet',
    description: 'Intelligent schedule optimization for mobile PACS vans and clinical shifts.',
    defaultPath: '/ai-scheduler',
    iconName: 'Sparkles',
  },
  {
    id: 'fleet',
    label: 'Mobile Fleet Management',
    category: 'Operations & Fleet',
    description: 'Vehicle tracking, van readiness status, generator fuel levels, and maintenance.',
    defaultPath: '/fleet',
    iconName: 'Truck',
  },
  {
    id: 'clinics',
    label: 'Clinics & Centers',
    category: 'Operations & Fleet',
    description: 'Directory of primary clinics, partner hospitals, and deployment zones.',
    defaultPath: '/clinics',
    iconName: 'Building',
  },

  // Administration & Governance
  {
    id: 'users',
    label: 'User Management & RBAC',
    category: 'Administration & Governance',
    description: 'Manage staff accounts, credentials, shift assignments, and sidebar access permissions.',
    defaultPath: '/users',
    iconName: 'Shield',
  },
  {
    id: 'audit_logs',
    label: 'Clinical Audit Logs',
    category: 'Administration & Governance',
    description: 'Immutable regulatory audit trail of all logins, uploads, case edits, and sign-offs.',
    defaultPath: '/audit-logs',
    iconName: 'ScrollText',
  },
  {
    id: 'analytics',
    label: 'Operational Analytics',
    category: 'Administration & Governance',
    description: 'Turnaround time (TAT) metrics, modality utilization charts, and clinic volumes.',
    defaultPath: '/analytics',
    iconName: 'BarChart3',
  },
  {
    id: 'tech_stack',
    label: 'Tech Stack & Architecture',
    category: 'Administration & Governance',
    description: 'System specifications, database schema, PACS gateway, and security certifications.',
    defaultPath: '/tech-stack',
    iconName: 'Layers',
  },
];

export type RoleNavigationConfig = Record<UserRole, string[]>;

export const DEFAULT_ROLE_NAV_CONFIG: RoleNavigationConfig = {
  'Medical Officer': [
    'dashboard',
    'patients',
    'register_patient',
    'new_case',
    'cases',
    'reporting',
    'patient_requests',
    'track_status',
    'credentials',
  ],
  'Radiographer': [
    'dashboard',
    'scan_queue',
    'schedule',
    'cases',
    'track_status',
    'credentials',
  ],
  'Public Hospital Radiographer': [
    'dashboard',
    'scan_queue',
    'schedule',
    'cases',
    'track_status',
    'credentials',
  ],
  'Private Hospital Radiographer': [
    'dashboard',
    'scan_queue',
    'schedule',
    'cases',
    'track_status',
    'credentials',
  ],
  'Radiologist': [
    'dashboard',
    'reporting',
    'cases',
    'track_status',
    'credentials',
  ],
  'BEMZ': [
    'dashboard',
    'bems',
    'cases',
    'track_status',
  ],
  'Private Hospital Admin': [
    'dashboard',
    'private_admin',
    'cases',
    'track_status',
  ],
  'Administrator': [
    'dashboard',
    'patients',
    'register_patient',
    'new_case',
    'cases',
    'reporting',
    'bems',
    'private_admin',
    'ai_scheduler',
    'fleet',
    'clinics',
    'users',
    'audit_logs',
    'analytics',
    'tech_stack',
    'track_status',
  ],
  'Super Admin': ALL_NAV_MODULES.map((m) => m.id),
  'Equipment Marketplace': [
    'dashboard',
    'tech_stack',
  ],
};

const STORAGE_KEY = 'healthgrid_role_navigation_config';

export function loadRoleNavConfig(): RoleNavigationConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_ROLE_NAV_CONFIG };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_ROLE_NAV_CONFIG,
      ...parsed,
    };
  } catch {
    return { ...DEFAULT_ROLE_NAV_CONFIG };
  }
}

export function saveRoleNavConfig(config: RoleNavigationConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn('Failed to persist role navigation config:', e);
  }
}
