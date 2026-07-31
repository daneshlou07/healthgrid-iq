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

export default function StatusBadge({ status, timestamp, showTimeInline = false }: Props) {
  const getClass = () => {
    switch (status) {
      case 'CREATED':
      case 'Pending':
      case 'draft':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'SCHEDULED':
      case 'SCANNED':
      case 'REPORTED':
      case 'In Progress':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'FINALIZED':
      case 'Approved':
      case 'final':
      case 'Verified / Signed Off':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'NO_SHOW':
      case 'CANCELLED':
      case 'Rejected':
        return 'bg-slate-100 text-slate-500 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const formattedTime = formatTime(timestamp);
  const fullTooltip = timestamp ? `Status: ${status} (${new Date(timestamp).toLocaleString()})` : `Status: ${status}`;

  return (
    <span
      title={fullTooltip}
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getClass()}`}
    >
      <span>{status}</span>
      {showTimeInline && formattedTime && (
        <span className="text-[10px] opacity-75 font-mono">
          &bull; {formattedTime}
        </span>
      )}
    </span>
  );
}
