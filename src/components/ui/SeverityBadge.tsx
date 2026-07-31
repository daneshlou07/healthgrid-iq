import React from 'react';
import type { SeverityLevel } from '../../types';

interface Props {
  severity?: SeverityLevel;
}

export default function SeverityBadge({ severity }: Props) {
  if (!severity) return <span className="text-xs text-surface-400">—</span>;

  const styles: Record<SeverityLevel, string> = {
    Mild: 'bg-slate-100 text-slate-700 font-medium',
    Moderate: 'bg-amber-100/80 text-amber-900 font-semibold',
    Severe: 'bg-orange-100/80 text-orange-900 font-semibold',
    Critical: 'bg-red-100 text-red-900 font-bold',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${styles[severity]}`}>
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
