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
      'CASE_CREATED': 'Case Created',
      'CREATED': 'Case Created',
      'Pending': 'Pending',
      'SCHEDULING': 'AI Scheduling',
      'RADIOGRAPHER_ASSIGNED': 'Radiographer Assigned',
      'READY_FOR_SCAN': 'Ready for Scan',
      'SCHEDULED': 'Scheduled',
      'SCANNING': 'Scanning in Progress',
      'IMAGES_AVAILABLE': 'Images Available',
      'SCANNED': 'Images Available',
      'RADIOLOGIST_REVIEW': 'Radiologist Review',
      'MO_REVIEW': 'MO Final Review',
      'REPORTED': 'Reported',
      'REPORT_SUBMITTED': 'Report Submitted',
      'COMPLETED': 'Completed',
      'FINALIZED': 'Completed',
      'MACHINE_UNAVAILABLE': 'Machine Unavailable',
      'EXTERNAL_REFERRAL_PENDING': 'BEMS Referral Pending',
      'BEMZ_REVIEW': 'BEMS Review',
      'FACILITY_SELECTED': 'Facility Selected',
      'EXTERNAL_RADIOGRAPHER_ASSIGNED': 'External Radiographer Assigned',
      'PRIVATE_HOSPITAL_ADMIN_REVIEW': 'Hospital Admin Review',
      'EXTERNAL_SCANNING': 'External Scanning',
      'EXTERNAL_IMAGES_AVAILABLE': 'External Images Available',
      'NO_SHOW': 'No Show',
      'CANCELLED': 'Cancelled',
      'IN_PROGRESS': 'In Progress',
    };
    const mapMs: Record<string, string> = {
      'CASE_CREATED': 'Kes Dicipta',
      'CREATED': 'Kes Dicipta',
      'Pending': 'Belum Selesai',
      'SCHEDULING': 'Penjadualan AI',
      'RADIOGRAPHER_ASSIGNED': 'Juru X-Ray Ditugaskan',
      'READY_FOR_SCAN': 'Sedia Untuk Imbasan',
      'SCHEDULED': 'Dijadualkan',
      'SCANNING': 'Imbasan Berjalan',
      'IMAGES_AVAILABLE': 'Imej Tersedia',
      'SCANNED': 'Imej Tersedia',
      'RADIOLOGIST_REVIEW': 'Semakan Pakar Radiologi',
      'MO_REVIEW': 'Semakan Akhir MO',
      'REPORTED': 'Dilaporkan',
      'REPORT_SUBMITTED': 'Laporan Dihantar',
      'COMPLETED': 'Selesai',
      'FINALIZED': 'Selesai',
      'MACHINE_UNAVAILABLE': 'Mesin Tidak Berfungsi',
      'EXTERNAL_REFERRAL_PENDING': 'Rujukan BEMS Menunggu',
      'BEMZ_REVIEW': 'Semakan BEMS',
      'FACILITY_SELECTED': 'Fasiliti Dipilih',
      'EXTERNAL_RADIOGRAPHER_ASSIGNED': 'Juru X-Ray Luar Ditugaskan',
      'PRIVATE_HOSPITAL_ADMIN_REVIEW': 'Semakan Admin Hospital Swasta',
      'EXTERNAL_SCANNING': 'Imbasan Luar Sedang Dijalankan',
      'EXTERNAL_IMAGES_AVAILABLE': 'Imej Luar Tersedia',
      'NO_SHOW': 'Tidak Hadir',
      'CANCELLED': 'Dibatalkan',
      'IN_PROGRESS': 'Dalam Proses',
    };

    if (isMs) return mapMs[st] || st;
    return mapEn[st] || st;
  };

  const getClass = () => {
    switch (status) {
      case 'CASE_CREATED':
      case 'CREATED':
      case 'Pending':
      case 'draft':
        return 'bg-slate-100 text-slate-700 font-medium border border-slate-200';
      case 'SCHEDULING':
      case 'RADIOGRAPHER_ASSIGNED':
      case 'READY_FOR_SCAN':
      case 'SCHEDULED':
      case 'SCANNING':
      case 'EXTERNAL_SCANNING':
      case 'In Progress':
      case 'IN_PROGRESS':
        return 'bg-blue-50 text-blue-700 font-semibold border border-blue-200';
      case 'IMAGES_AVAILABLE':
      case 'SCANNED':
      case 'EXTERNAL_IMAGES_AVAILABLE':
        return 'bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200';
      case 'RADIOLOGIST_REVIEW':
      case 'MO_REVIEW':
      case 'REPORTED':
        return 'bg-purple-50 text-purple-700 font-semibold border border-purple-200';
      case 'MACHINE_UNAVAILABLE':
      case 'EXTERNAL_REFERRAL_PENDING':
        return 'bg-red-50 text-red-700 font-semibold border border-red-200';
      case 'BEMZ_REVIEW':
      case 'FACILITY_SELECTED':
      case 'PRIVATE_HOSPITAL_ADMIN_REVIEW':
        return 'bg-amber-50 text-amber-700 font-semibold border border-amber-200';
      case 'EXTERNAL_RADIOGRAPHER_ASSIGNED':
        return 'bg-teal-50 text-teal-700 font-semibold border border-teal-200';
      case 'REPORT_SUBMITTED':
      case 'COMPLETED':
      case 'FINALIZED':
      case 'Approved':
      case 'final':
      case 'Verified / Signed Off':
        return 'bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200';
      case 'NO_SHOW':
      case 'CANCELLED':
      case 'Rejected':
        return 'bg-slate-100 text-slate-500 font-medium border border-slate-200';
      default:
        return 'bg-slate-100 text-slate-600 font-medium border border-slate-200';
    }
  };

  const formattedTime = formatTime(timestamp);

  return (
    <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs ${getClass()}`}>
      <span>{formatStatusLabel(status)}</span>
      {showTimeInline && formattedTime && (
        <span className="opacity-75 font-mono text-[10px] pl-1.5 ml-1 border-l border-current/20">
          {formattedTime}
        </span>
      )}
    </span>
  );
}
