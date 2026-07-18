import React, { ReactNode } from 'react';

interface Props {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: string;
  color?: 'navy' | 'emerald' | 'purple' | 'amber' | 'red';
}

export default function StatsCard({ title, value, icon, trend, color = 'navy' }: Props) {
  const iconBg = {
    navy: 'bg-navy-50 text-navy-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <div className="card flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconBg[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-surface-500 font-medium">{title}</p>
        <p className="text-2xl font-bold text-navy-800">{value}</p>
        {trend && <p className="text-[11px] text-emerald-600 font-medium mt-0.5">{trend}</p>}
      </div>
    </div>
  );
}
