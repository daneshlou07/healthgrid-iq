import React from 'react';
import type { SeverityLevel } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

interface Props {
  severity?: SeverityLevel;
}

export default function SeverityBadge({ severity }: Props) {
  const { language } = useLanguage();
  if (!severity) return <span className="text-xs text-surface-400">—</span>;

  const labels: Record<SeverityLevel, { en: string; ms: string }> = {
    Mild: { en: 'Mild', ms: 'Ringan' },
    Moderate: { en: 'Moderate', ms: 'Sederhana' },
    Severe: { en: 'Severe', ms: 'Teruk' },
    Critical: { en: 'Critical', ms: 'Kritikal' },
  };

  const styles: Record<SeverityLevel, string> = {
    Mild: 'bg-slate-100 text-slate-700 font-medium',
    Moderate: 'bg-amber-100/80 text-amber-900 font-semibold',
    Severe: 'bg-orange-100/80 text-orange-900 font-semibold',
    Critical: 'bg-red-100 text-red-900 font-bold',
  };

  const displayLabel = language === 'ms' ? labels[severity]?.ms : labels[severity]?.en;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${styles[severity]}`}>
      {displayLabel || severity}
    </span>
  );
}
