import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Search, X, User, FolderOpen, FileText, ArrowRight } from 'lucide-react';
import { getPatients, getCases, getReports } from '../../services/dataService';

interface SearchResult { id: string; type: string; title: string; subtitle?: string; path: string; }
interface SearchPaletteContextValue { isOpen: boolean; open: () => void; close: () => void; toggle: () => void; }

const SearchPaletteContext = createContext<SearchPaletteContextValue | undefined>(undefined);

export function SearchPaletteProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setIsOpen((v) => !v); } };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <SearchPaletteContext.Provider value={{ isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false), toggle: () => setIsOpen((v) => !v) }}>
      {children}
      {isOpen && createPortal(<PaletteOverlay onClose={() => setIsOpen(false)} />, document.body)}
    </SearchPaletteContext.Provider>
  );
}

export function useSearchPalette(): SearchPaletteContextValue {
  const ctx = useContext(SearchPaletteContext);
  if (!ctx) throw new Error('useSearchPalette must be within SearchPaletteProvider');
  return ctx;
}

function PaletteOverlay({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onClose]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const q = query.toLowerCase();
      const [patients, cases, reports] = await Promise.all([getPatients(), getCases(), getReports()]);
      const r: SearchResult[] = [];
      patients.filter((p) => p.name.toLowerCase().includes(q) || p.mrn.toLowerCase().includes(q)).slice(0, 4).forEach((p) => r.push({ id: p.id, type: 'patient', title: p.name, subtitle: p.mrn, path: '/patients' }));
      cases.filter((c) => c.caseNumber.toLowerCase().includes(q) || c.patientName.toLowerCase().includes(q)).slice(0, 4).forEach((c) => r.push({ id: c.id, type: 'case', title: c.caseNumber, subtitle: `${c.patientName} — ${c.scanType}`, path: '/cases' }));
      reports.filter((rep) => rep.caseNumber.toLowerCase().includes(q) || rep.patientName.toLowerCase().includes(q)).slice(0, 3).forEach((rep) => r.push({ id: rep.id, type: 'report', title: rep.caseNumber, subtitle: rep.patientName, path: '/reports' }));
      setResults(r); setSelectedIdx(0);
    }, 200);
  }, [query]);

  const handleSelect = (result: SearchResult) => { navigate(result.path); onClose(); };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx((i) => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && results[selectedIdx]) { handleSelect(results[selectedIdx]); }
  };

  const icons: Record<string, React.ReactNode> = { patient: <User className="w-4 h-4 text-navy-500" />, case: <FolderOpen className="w-4 h-4 text-purple-500" />, report: <FileText className="w-4 h-4 text-emerald-600" /> };

  return (
    <div className="fixed inset-0 z-[9998] flex items-start justify-center pt-[15vh]">
      <div className="absolute inset-0 bg-navy-900/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-elevated border border-surface-300 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-200">
          <Search className="w-4 h-4 text-surface-400 flex-shrink-0" />
          <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={handleKeyDown} className="flex-1 text-sm text-surface-800 placeholder-surface-400 bg-transparent outline-none" placeholder="Search patients, cases, reports..." />
          <kbd className="hidden sm:inline-flex px-1.5 py-0.5 bg-surface-100 border border-surface-300 rounded text-[10px] text-surface-500 font-mono">Esc</kbd>
        </div>
        <div className="max-h-[50vh] overflow-y-auto">
          {results.length === 0 && query.trim() && <p className="py-8 text-center text-sm text-surface-400">No results for "{query}"</p>}
          {results.length === 0 && !query.trim() && <p className="py-8 text-center text-sm text-surface-400">Start typing to search...</p>}
          {results.map((r, idx) => (
            <button key={r.id} onClick={() => handleSelect(r)} className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${idx === selectedIdx ? 'bg-navy-50' : 'hover:bg-surface-100'}`}>
              {icons[r.type] || <Search className="w-4 h-4 text-surface-400" />}
              <div className="flex-1 min-w-0"><p className="text-sm font-medium text-surface-800 truncate">{r.title}</p>{r.subtitle && <p className="text-xs text-surface-500 truncate">{r.subtitle}</p>}</div>
              <ArrowRight className="w-3.5 h-3.5 text-surface-400 flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
