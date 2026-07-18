import React from 'react';

interface Props {
  tabs: string[];
  active: string;
  onChange: (tab: string) => void;
  counts?: Record<string, number>;
}

export default function TabFilter({ tabs, active, onChange, counts }: Props) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            active === tab
              ? 'bg-navy-600 text-white'
              : 'bg-surface-100 text-surface-600 hover:bg-surface-200 border border-surface-300'
          }`}
        >
          {tab}
          {counts && counts[tab] !== undefined && (
            <span className={`ml-1.5 ${active === tab ? 'text-white/70' : 'text-surface-400'}`}>
              {counts[tab]}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
