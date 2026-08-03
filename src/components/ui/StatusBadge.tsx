import React from 'react';
import type { CaseStatus, PatientRequestStatus, ReportStatus } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

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
  const { language } = useLanguage();
  const isMs = language === 'ms';

  const formatStatusLabel = (st: string): string => {
    const mapEn: Record<string, string> = {
      'CREATED': 'Pending',
      'SCHEDULED': 'Scheduled',
      'SCANNED': 'Scanned',
      'REPORTED': 'Reported',
      'FINALIZED': 'Finalized',
      'NO_SHOW': 'No Show',
      'CANCELLED': 'Cancelled',
      'IN_PROGRESS': 'In Progress',
    };
    const mapMs: Record<string, string> = {
      'CREATED': 'Belum Selesai',
      'SCHEDULED': 'Dijadualkan',
      'SCANNED': 'Diimbas',
      'REPORTED': 'Dilaporkan',
      'FINALIZED': 'Disahkan',
      'NO_SHOW': 'Tidak Hadir',
      'CANCELLED': 'Dibatalkan',
      'IN_PROGRESS': 'Dalam Proses',
      'Pending': 'Belum Selesai',
    };

    if (isMs) return mapMs[st] || st;
    return mapEn[st] || st;
  };

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

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs ${getClass()}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      <span>{formatStatusLabel(status)}</span>
      {showTimeInline && formattedTime && (
        <span className="opacity-75 font-mono text-[10px] pl-1 border-l border-current/20">
          {formattedTime}
        </span>
      )}
    </span>
  );
}
