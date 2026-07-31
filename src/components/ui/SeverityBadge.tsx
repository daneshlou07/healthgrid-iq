import React from 'react';
import type { SeverityLevel } from '../../types';

interface Props {
  severity?: SeverityLevel;
}

export default function SeverityBadge({ severity }: Props) {
  if (!severity) return <span className="text-xs text-surface-400">—</span>;

  const styles: Record<SeverityLevel, string> = {
    Mild: 'bg-slate-100 text-slate-700 border-slate-200',
    Moderate: 'bg-amber-50 text-amber-800 border-amber-200',
    Severe: 'bg-orange-50 text-orange-800 border-orange-200',
    Critical: 'bg-red-50 text-red-800 border-red-200 font-bold',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${styles[severity]}`}>
      {severity === 'Critical' && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
        </span>
      )}
      {severity}
    </span>
  );
}
