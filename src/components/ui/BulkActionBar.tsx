import React from 'react';
import { CheckSquare, Download, Calendar, X, RefreshCw } from 'lucide-react';

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
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-950 text-white border border-slate-800 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4 text-xs animate-in fade-in slide-in-from-bottom-4 backdrop-blur-md">
      <div className="flex items-center gap-2 pr-3 border-r border-slate-800">
        <span className="w-5 h-5 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-[11px]">
          {selectedCount}
        </span>
        <span className="font-bold text-slate-200">Selected</span>
      </div>

      <div className="flex items-center gap-2">
        {onBulkReschedule && (
          <button
            onClick={onBulkReschedule}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
          >
            <Calendar className="w-3.5 h-3.5 text-purple-400" />
            Bulk Reschedule
          </button>
        )}

        {onBulkExport && (
          <button
            onClick={onBulkExport}
            className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold flex items-center gap-1.5 transition-all shadow-md"
          >
            <Download className="w-3.5 h-3.5" />
            Export Selected CSV
          </button>
        )}
      </div>

      <button
        onClick={onClear}
        className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors ml-1"
        title="Clear Selection"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
