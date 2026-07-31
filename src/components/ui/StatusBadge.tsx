import React from 'react';
import type { CaseStatus, PatientRequestStatus, ReportStatus } from '../../types';

interface Props {
  status: CaseStatus | PatientRequestStatus | ReportStatus | string;
  timestamp?: string;
  showTimeInline?: boolean;
}

function formatTime(isoString?: string): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function formatStatusLabel(status: string): string {
  const map: Record<string, string> = {
    'CREATED': 'Pending',
    'SCHEDULED': 'Scheduled',
    'SCANNED': 'Scanned',
    'REPORTED': 'Reported',
    'FINALIZED': 'Finalized',
    'NO_SHOW': 'No Show',
    'CANCELLED': 'Cancelled',
    'IN_PROGRESS': 'In Progress',
  };
  return map[status] || status;
}

export default function StatusBadge({ status, timestamp, showTimeInline = false }: Props) {
  const getClass = () => {
    switch (status) {
      case 'CREATED':
      case 'Pending':
      case 'draft':
        return 'bg-slate-100 text-slate-700 font-medium';
      case 'SCHEDULED':
      case 'SCANNED':
      case 'REPORTED':
      case 'In Progress':
        return 'bg-blue-100/80 text-blue-800 font-semibold';
      case 'FINALIZED':
      case 'Approved':
      case 'final':
      case 'Verified / Signed Off':
        return 'bg-emerald-100/80 text-emerald-800 font-semibold';
      case 'NO_SHOW':
      case 'CANCELLED':
      case 'Rejected':
        return 'bg-slate-100 text-slate-500 font-medium';
      default:
        return 'bg-slate-100 text-slate-600 font-medium';
    }
  };

  const formattedTime = formatTime(timestamp);
  const displayLabel = formatStatusLabel(status);
  const fullTooltip = timestamp ? `Status: ${displayLabel} (${new Date(timestamp).toLocaleString()})` : `Status: ${displayLabel}`;

  return (
    <span
      title={fullTooltip}
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${getClass()}`}
    >
      <span>{displayLabel}</span>
      {showTimeInline && formattedTime && (
        <span className="text-[11px] opacity-75">
          &bull; {formattedTime}
        </span>
      )}
    </span>
  );
}
