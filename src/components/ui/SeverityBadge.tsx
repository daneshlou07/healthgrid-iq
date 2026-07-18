import React from 'react';
import type { SeverityLevel } from '../../types';

interface Props {
  severity?: SeverityLevel;
}

export default function SeverityBadge({ severity }: Props) {
  if (!severity) return <span className="text-xs text-surface-400">—</span>;

  const styles: Record<SeverityLevel, string> = {
    Mild: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Moderate: 'bg-amber-50 text-amber-700 border-amber-200',
    Severe: 'bg-orange-50 text-orange-700 border-orange-200',
    Critical: 'bg-red-50 text-red-700 border-red-200',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${styles[severity]}`}>
      {severity}
    </span>
  );
}
