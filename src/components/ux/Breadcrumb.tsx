import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard', patients: 'Patients', register: 'Register Patient',
  cases: 'Cases', new: 'New Referral', reports: 'Reports', requests: 'My Requests',
  'scan-queue': 'Scan Queue', schedule: 'Schedule', upload: 'Upload Scans',
  'review-queue': 'Review Queue', reporting: 'Reporting',
  'track-status': 'Track Status', 'ai-scheduler': 'AI Scheduler',
  clinics: 'Clinics', 'patient-requests': 'Patient Requests',
  fleet: 'Imaging Equipment', users: 'User Management',
  'audit-logs': 'Audit Trail', 'patient-registry': 'Patient Registry',
  analytics: 'Operational Analytics', announcements: 'Announcements',
  settings: 'System Settings', 'tech-stack': 'Technology Stack',
};

export default function Breadcrumb() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);
  if (segments.length <= 1) return null;

  const items = segments.map((seg, i) => ({
    label: ROUTE_LABELS[seg] || seg.charAt(0).toUpperCase() + seg.slice(1),
    path: '/' + segments.slice(0, i + 1).join('/'),
    isCurrent: i === segments.length - 1,
  }));

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs">
      {items.map((item, i) => (
        <React.Fragment key={item.path}>
          {i > 0 && <ChevronRight className="w-3 h-3 text-surface-400" />}
          {item.isCurrent ? (
            <span className="text-surface-600 font-medium" aria-current="page">{item.label}</span>
          ) : (
            <Link to={item.path} className="text-surface-400 hover:text-navy-600 transition-colors">{item.label}</Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
