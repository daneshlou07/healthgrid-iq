import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, Download, Columns, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import EmptyState from './EmptyState';

export interface Column<T> {
  key: keyof T & string;
  header: string;
  sortable?: boolean;
  visible?: boolean;
  width?: string;
  render?: (value: any, row: T) => React.ReactNode;
}

interface Props<T extends { id: string }> {
  data: T[];
  columns: Column<T>[];
  pageSize?: number;
  searchable?: boolean;
  searchPlaceholder?: string;
  exportFilename?: string;
  loading?: boolean;
  emptyState?: React.ReactNode;
}

export default function EnhancedDataTable<T extends { id: string }>({ data, columns: allColumns, pageSize = 10, searchable, searchPlaceholder, exportFilename, loading, emptyState }: Props<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [visibleCols, setVisibleCols] = useState<Set<string>>(new Set(allColumns.filter((c) => c.visible !== false).map((c) => c.key)));
  const [showColMenu, setShowColMenu] = useState(false);

  const columns = allColumns.filter((c) => visibleCols.has(c.key));

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter((row) => columns.some((col) => { const val = row[col.key]; return val != null && String(val).toLowerCase().includes(q); }));
  }, [data, search, columns]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey as keyof T]; const bv = b[sortKey as keyof T];
      if (av == null) return 1; if (bv == null) return -1;
      let cmp: number;
      if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv;
      else cmp = String(av).localeCompare(String(bv));
      return sortDir === 'desc' ? -cmp : cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (key: string) => { if (sortKey === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc'); else { setSortKey(key); setSortDir('asc'); } };

  const exportCSV = () => {
    if (sorted.length === 0) return;
    const headers = columns.map((c) => c.header);
    const rows = sorted.map((row) => columns.map((col) => { const v = row[col.key]; const s = v == null ? '' : String(v); return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s; }));
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${exportFilename || 'export'}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  if (loading) return <div className="card p-6"><div className="animate-pulse space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-4 bg-surface-200 rounded" />)}</div></div>;

  return (
    <div className="card p-0 overflow-hidden">
      {(searchable || exportFilename) && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-surface-200">
          {searchable && (
            <div className="relative max-w-xs flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-400" />
              <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="input-field pl-9 py-2 text-xs" placeholder={searchPlaceholder || 'Search...'} />
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="relative">
              <button onClick={() => setShowColMenu(!showColMenu)} className="btn-ghost text-xs flex items-center gap-1 py-1.5 px-2"><Columns className="w-3.5 h-3.5" /> Columns</button>
              {showColMenu && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-surface-300 rounded-lg shadow-elevated z-20 py-1">
                  {allColumns.map((col) => (
                    <label key={col.key} className="flex items-center gap-2 px-3 py-1.5 text-xs text-surface-700 hover:bg-surface-100 cursor-pointer">
                      <input type="checkbox" checked={visibleCols.has(col.key)} onChange={() => { const next = new Set(visibleCols); if (next.has(col.key) && next.size > 1) next.delete(col.key); else next.add(col.key); setVisibleCols(next); }} className="rounded border-surface-400" />
                      {col.header}
                    </label>
                  ))}
                </div>
              )}
            </div>
            {exportFilename && <button onClick={exportCSV} className="btn-ghost text-xs flex items-center gap-1 py-1.5 px-2"><Download className="w-3.5 h-3.5" /> Export</button>}
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead><tr className="border-b border-surface-200">
            {columns.map((col) => (
              <th key={col.key} className={`table-header ${col.sortable ? 'cursor-pointer select-none hover:text-navy-600' : ''}`} style={{ width: col.width }} onClick={() => col.sortable && handleSort(col.key)}>
                <span className="flex items-center gap-1">{col.header}{col.sortable && sortKey === col.key && (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</span>
              </th>
            ))}
          </tr></thead>
          <tbody className="divide-y divide-surface-200">
            {paginated.map((row) => (
              <tr key={row.id} className="hover:bg-surface-100 transition-colors">
                {columns.map((col) => <td key={col.key} className="table-cell">{col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '—')}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {paginated.length === 0 && (emptyState || <EmptyState title="No results" description="Try adjusting your search." />)}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-surface-200">
          <p className="text-xs text-surface-500">{sorted.length} results &middot; Page {page}/{totalPages}</p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost p-1.5 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-ghost p-1.5 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
