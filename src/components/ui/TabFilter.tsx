import React from 'react';

interface Props {
  tabs: string[];
  active: string;
  onChange: (tab: string) => void;
  counts?: Record<string, number>;
}

export default function TabFilter({ tabs, active, onChange, counts }: Props) {
  return (
    <div className="inline-flex items-center gap-1.5 p-1 bg-surface-100/80 rounded-xl border border-surface-200/80">
      {tabs.map((tab) => {
        const isActive = active === tab;
        const count = counts && counts[tab] !== undefined ? counts[tab] : null;

        return (
          <button
            key={tab}
            onClick={() => onChange(tab)}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
              isActive
                ? 'bg-navy-700 text-white shadow-sm'
                : 'text-surface-600 hover:text-navy-800 hover:bg-white/80'
            }`}
          >
            <span>{tab}</span>
            {count !== null && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-surface-200 text-surface-600'
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
