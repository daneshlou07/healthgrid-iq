import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';

type Severity = 'success' | 'error' | 'warning' | 'info';
interface ToastOptions { message: string; severity?: Severity; duration?: number; action?: { label: string; onClick: () => void }; }
interface ToastItem extends ToastOptions { id: string; }
interface ToastContextValue { toast: (options: ToastOptions) => string; success: (message: string) => string; error: (message: string) => string; warning: (message: string) => string; info: (message: string) => string; dismiss: (id: string) => void; }

type Action = { type: 'ADD'; payload: ToastItem } | { type: 'REMOVE'; id: string };
function reducer(state: ToastItem[], action: Action): ToastItem[] {
  switch (action.type) {
    case 'ADD': return state.length >= 5 ? [...state.slice(1), action.payload] : [...state, action.payload];
    case 'REMOVE': return state.filter((t) => t.id !== action.id);
    default: return state;
  }
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, dispatch] = useReducer(reducer, []);
  const addToast = useCallback((options: ToastOptions): string => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    dispatch({ type: 'ADD', payload: { ...options, id } });
    const duration = options.duration ?? 5000;
    if (duration > 0) setTimeout(() => dispatch({ type: 'REMOVE', id }), duration);
    return id;
  }, []);

  const ctx: ToastContextValue = {
    toast: addToast,
    success: (m) => addToast({ message: m, severity: 'success' }),
    error: (m) => addToast({ message: m, severity: 'error', duration: 7000 }),
    warning: (m) => addToast({ message: m, severity: 'warning' }),
    info: (m) => addToast({ message: m, severity: 'info' }),
    dismiss: (id) => dispatch({ type: 'REMOVE', id }),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      {createPortal(<ToastPortal toasts={toasts} onDismiss={(id) => dispatch({ type: 'REMOVE', id })} />, document.body)}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be within ToastProvider');
  return ctx;
}

function ToastPortal({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  const icons: Record<Severity, React.ReactNode> = { success: <CheckCircle className="w-4 h-4 text-emerald-600" />, error: <AlertCircle className="w-4 h-4 text-red-600" />, warning: <AlertTriangle className="w-4 h-4 text-amber-600" />, info: <Info className="w-4 h-4 text-blue-600" /> };
  const bg: Record<Severity, string> = { success: 'border-emerald-200 bg-emerald-50', error: 'border-red-200 bg-red-50', warning: 'border-amber-200 bg-amber-50', info: 'border-blue-200 bg-blue-50' };

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 w-80 pointer-events-none" role="region" aria-label="Notifications">
      {toasts.map((t) => (
        <div key={t.id} className={`pointer-events-auto flex items-start gap-2.5 p-3 rounded-lg border shadow-elevated animate-slideIn ${bg[t.severity || 'info']}`} role="alert">
          {icons[t.severity || 'info']}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-surface-800">{t.message}</p>
            {t.action && <button onClick={t.action.onClick} className="text-xs font-semibold text-navy-600 mt-1">{t.action.label}</button>}
          </div>
          <button onClick={() => onDismiss(t.id)} className="text-surface-400 hover:text-surface-600 flex-shrink-0"><X className="w-3.5 h-3.5" /></button>
        </div>
      ))}
    </div>
  );
}
