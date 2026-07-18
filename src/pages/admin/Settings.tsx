import React, { useState } from 'react';
import { Shield, Database, Cloud, Settings as SettingsIcon, RotateCcw, AlertTriangle } from 'lucide-react';

export default function Settings() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleReset = () => {
    setResetting(true);
    setTimeout(() => {
      localStorage.clear();
      window.location.href = '/';
    }, 500);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">System Settings</h1>
        <p className="page-subtitle">Platform configuration</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Cloud className="w-4 h-4 text-navy-600" />
            <h3 className="text-sm font-semibold text-navy-700">Firebase</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-surface-500">Status</span><span className="badge-warning">Demo Mode</span></div>
            <div className="flex justify-between"><span className="text-surface-500">Project</span><span className="text-surface-700 font-mono text-xs">healthgrid-iq-demo</span></div>
            <div className="flex justify-between"><span className="text-surface-500">Region</span><span className="text-surface-700">asia-southeast1</span></div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-semibold text-navy-700">Security</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-surface-500">Auth</span><span className="text-surface-700">Firebase + Fallback</span></div>
            <div className="flex justify-between"><span className="text-surface-500">Audit Logs</span><span className="badge-success">Immutable</span></div>
            <div className="flex justify-between"><span className="text-surface-500">Report Lock</span><span className="badge-success">Enabled</span></div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-4 h-4 text-purple-500" />
            <h3 className="text-sm font-semibold text-navy-700">Collections</h3>
          </div>
          <div className="space-y-2 text-sm">
            {['users', 'clinics', 'patients', 'cases', 'reports', 'audit_logs'].map((col) => (
              <div key={col} className="flex justify-between">
                <span className="text-surface-500 font-mono text-xs">{col}</span>
                <span className="badge-success text-[9px]">Active</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <SettingsIcon className="w-4 h-4 text-surface-500" />
            <h3 className="text-sm font-semibold text-navy-700">Platform</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-surface-500">Version</span><span className="text-surface-700">1.0.0</span></div>
            <div className="flex justify-between"><span className="text-surface-500">Stack</span><span className="text-surface-700">React 18 + Vite</span></div>
            <div className="flex justify-between"><span className="text-surface-500">Compliance</span><span className="text-surface-700">HIPAA-Ready</span></div>
          </div>
        </div>
      </div>

      {/* Demo & Testing — Reset Button */}
      <div className="card border-l-4 border-l-amber-400">
        <div className="flex items-center gap-2 mb-3">
          <RotateCcw className="w-4 h-4 text-amber-600" />
          <h3 className="text-sm font-semibold text-navy-700">Demo & Testing</h3>
        </div>
        <p className="text-xs text-surface-500 mb-4">
          Reset the system to its original demo state. This clears all changes (new patients, scheduled cases, deleted items, profile pictures, etc.) and reloads fresh mock data.
        </p>

        {!showConfirm ? (
          <button onClick={() => setShowConfirm(true)} className="btn-secondary text-sm flex items-center gap-2">
            <RotateCcw className="w-4 h-4" /> Reset System to Demo State
          </button>
        ) : (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800">Are you sure?</p>
                <p className="text-xs text-red-600 mt-0.5">This will erase all data and log you out. The system will reload with fresh demo data.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleReset} disabled={resetting} className="btn-danger text-sm flex items-center gap-2 disabled:opacity-50">
                {resetting ? (
                  <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Resetting...</>
                ) : (
                  <><RotateCcw className="w-4 h-4" /> Confirm Reset</>
                )}
              </button>
              <button onClick={() => setShowConfirm(false)} className="btn-secondary text-sm">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
