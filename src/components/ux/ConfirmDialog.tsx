import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2, Info } from 'lucide-react';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | undefined>(undefined);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ options: ConfirmOptions; resolve: (v: boolean) => void } | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => { setState({ options, resolve }); });
  }, []);

  const handleConfirm = () => { state?.resolve(true); setState(null); };
  const handleCancel = () => { state?.resolve(false); setState(null); };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-navy-900/30 backdrop-blur-sm" onClick={handleCancel} />
          <div className="relative w-full max-w-sm bg-white border border-surface-300 rounded-2xl shadow-elevated p-6 animate-slideIn">
            <div className="flex items-start gap-3 mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                state.options.variant === 'danger' ? 'bg-red-50 border border-red-200' :
                state.options.variant === 'warning' ? 'bg-amber-50 border border-amber-200' :
                'bg-blue-50 border border-blue-200'
              }`}>
                {state.options.variant === 'danger' ? <Trash2 className="w-5 h-5 text-red-500" /> :
                 state.options.variant === 'warning' ? <AlertTriangle className="w-5 h-5 text-amber-500" /> :
                 <Info className="w-5 h-5 text-blue-500" />}
              </div>
              <div>
                <h3 className="text-base font-semibold text-navy-800">{state.options.title}</h3>
                <p className="text-sm text-surface-600 mt-1">{state.options.message}</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={handleCancel} className="btn-secondary text-sm">
                {state.options.cancelLabel || 'Cancel'}
              </button>
              <button onClick={handleConfirm} className={`text-sm font-medium px-5 py-2.5 rounded-lg transition-colors ${
                state.options.variant === 'danger' ? 'bg-red-600 hover:bg-red-700 text-white' :
                state.options.variant === 'warning' ? 'bg-amber-600 hover:bg-amber-700 text-white' :
                'btn-primary'
              }`}>
                {state.options.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): (options: ConfirmOptions) => Promise<boolean> {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be within ConfirmProvider');
  return ctx.confirm;
}
