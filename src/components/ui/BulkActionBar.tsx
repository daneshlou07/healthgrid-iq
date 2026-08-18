import React from 'react';
import { Download, Calendar, X } from 'lucide-react';

interface Props {
  selectedCount: number;
  onClear: () => void;
  onBulkReschedule?: () => void;
  onBulkExport?: () => void;
}

export default function BulkActionBar({
  selectedCount,
  onClear,
  onBulkReschedule,
  onBulkExport,
}: Props) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-surface-300 bg-white px-4 py-3 text-[13px] text-surface-800 shadow-elevated">
      {/* Selection Count */}
      <div className="flex items-center gap-2 border-r border-surface-200 pr-3">
        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#0F4C42] px-1.5 text-[11px] font-semibold text-white">
          {selectedCount}
        </span>

        <span className="font-medium text-surface-700">
          Selected
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {onBulkReschedule && (
          <button
            type="button"
            onClick={onBulkReschedule}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-surface-300 bg-white px-3 text-[12px] font-medium text-surface-700 transition-colors hover:bg-surface-100 hover:text-navy-700"
          >
            <Calendar
              className="h-3.5 w-3.5 text-surface-500"
              aria-hidden="true"
            />

            <span>Bulk Reschedule</span>
          </button>
        )}

        {onBulkExport && (
          <button
            type="button"
            onClick={onBulkExport}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#0F4C42] px-3 text-[12px] font-medium text-white transition-colors hover:bg-[#0B3931] focus:outline-none focus:ring-2 focus:ring-[#0F4C42]/15"
          >
            <Download
              className="h-3.5 w-3.5"
              aria-hidden="true"
            />

            <span>Export Selected CSV</span>
          </button>
        )}
      </div>

      {/* Clear Selection */}
      <button
        type="button"
        onClick={onClear}
        title="Clear Selection"
        aria-label="Clear selection"
        className="ml-1 flex h-8 w-8 items-center justify-center rounded-lg text-surface-500 transition-colors hover:bg-surface-100 hover:text-surface-800"
      >
        <X
          className="h-4 w-4"
          aria-hidden="true"
        />
      </button>
    </div>
  );
}