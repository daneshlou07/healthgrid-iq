import React from 'react';

interface Props {
  tabs: string[];
  active: string;
  onChange: (tab: string) => void;
  counts?: Record<string, number>;
}

const TAB_STYLES: Record<
  string,
  {
    active: string;
    count: string;
  }
> = {
  'All Cases': {
    active: 'bg-[#0F4C42] text-white',
    count: 'bg-white/15 text-white',
  },

  'Pending Triage': {
    active: 'bg-amber-500 text-white',
    count: 'bg-white/20 text-white',
  },

  'In Progress': {
    active: 'bg-blue-600 text-white',
    count: 'bg-white/20 text-white',
  },

  Completed: {
    active: 'bg-emerald-600 text-white',
    count: 'bg-white/20 text-white',
  },
};

export default function TabFilter({
  tabs,
  active,
  onChange,
  counts,
}: Props) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-surface-300 bg-white p-1">
      {tabs.map((tab) => {
        const isActive = active === tab;

        const count =
          counts && counts[tab] !== undefined
            ? counts[tab]
            : null;

        const style =
          TAB_STYLES[tab] ?? TAB_STYLES['All Cases'];

        return (
          <button
            key={tab}
            type="button"
            onClick={() => onChange(tab)}
            className={`inline-flex h-8 items-center gap-2 rounded-md px-3 text-[12px] font-medium transition-colors duration-150 ${isActive
              ? `${style.active} shadow-sm`
              : 'text-surface-600 hover:bg-surface-100 hover:text-surface-800'
              }`}
          >
            <span>{tab}</span>

            {count !== null && (
              <span
                className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold ${isActive
                  ? style.count
                  : 'bg-surface-100 text-surface-500'
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