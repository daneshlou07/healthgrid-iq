import React from 'react';
import type { CaseStatus, PatientRequestStatus, ReportStatus } from '../../types';

interface Props {
  status: CaseStatus | PatientRequestStatus | ReportStatus | string;
}

export default function StatusBadge({ status }: Props) {
  const getClass = () => {
    switch (status) {
      case 'CREATED':
      case 'Pending':
      case 'draft':
        return 'badge-warning';
      case 'SCHEDULED':
        return 'badge-info';
      case 'SCANNED':
      case 'REPORTED':
        return 'badge-purple';
      case 'FINALIZED':
      case 'Approved':
      case 'final':
      case 'Verified / Signed Off':
        return 'badge-success';
      case 'NO_SHOW':
        return 'bg-slate-100 text-slate-700 border border-slate-300 px-2 py-0.5 rounded-full text-[11px] font-semibold inline-flex items-center';
      case 'CANCELLED':
      case 'Rejected':
        return 'badge-error';
      default:
        return 'badge-neutral';
    }
  };

  return <span className={getClass()}>{status}</span>;
}
