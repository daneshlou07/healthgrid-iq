import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Keyboard } from 'lucide-react';

const SHORTCUTS = [
  { category: 'Navigation', items: [
    { keys: ['Ctrl', 'K'], description: 'Open global search' },
    { keys: ['?'], description: 'Show keyboard shortcuts' },
    { keys: ['Esc'], description: 'Close modal / dialog' },
  ]},
  { category: 'Actions', items: [
    { keys: ['Ctrl', 'Enter'], description: 'Submit current form' },
    { keys: ['Ctrl', 'N'], description: 'New item (context-dependent)' },
  ]},
  { category: 'Tables', items: [
    { keys: ['Ctrl', 'E'], description: 'Export current table to CSV' },
  ]},
];

export default function KeyboardShortcutsOverlay() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't trigger when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape' && open) setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-navy-900/20 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-md bg-white border border-surface-300 rounded-2xl shadow-elevated overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-navy-600" />
            <h2 className="text-base font-semibold text-navy-800">Keyboard Shortcuts</h2>
          </div>
          <button onClick={() => setOpen(false)} className="p-1.5 hover:bg-surface-100 rounded-lg text-surface-400 hover:text-surface-600">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-4 max-h-[60vh] overflow-y-auto space-y-5">
          {SHORTCUTS.map((group) => (
            <div key={group.category}>
              <h3 className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider mb-2">{group.category}</h3>
              <div className="space-y-2">
                {group.items.map((item) => (
                  <div key={item.description} className="flex items-center justify-between">
                    <span className="text-sm text-surface-700">{item.description}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((key, i) => (
                        <React.Fragment key={key}>
                          {i > 0 && <span className="text-[10px] text-surface-400">+</span>}
                          <kbd className="px-2 py-0.5 bg-surface-100 border border-surface-300 rounded text-xs font-mono text-surface-600">{key}</kbd>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="px-6 py-3 border-t border-surface-200 bg-surface-50">
          <p className="text-[10px] text-surface-400 text-center">Press <kbd className="px-1 py-0.5 bg-white border border-surface-300 rounded text-[10px] font-mono">?</kbd> to toggle this overlay</p>
        </div>
      </div>
    </div>,
    document.body
  );
}
