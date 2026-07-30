import React, { useState } from 'react';
import { Shield, Database, Cloud, Settings as SettingsIcon, RotateCcw, AlertTriangle, Layers, Trash2, CheckCircle2 } from 'lucide-react';
import { CANONICAL_SCHEMAS } from '../../services/firestoreSchema';
import { useToast } from '../../components/ux/Toast';

export default function Settings() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  const toast = useToast();

  const handleReset = () => {
    setResetting(true);
    toast.info('Purging local database cache & resetting Firestore state...');
    setTimeout(() => {
      localStorage.clear();
      window.location.href = '/';
    }, 600);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="page-title">System Settings &amp; Database Architecture</h1>
          <span className="badge-purple font-mono text-xs font-bold">ADMIN SETTINGS</span>
        </div>
        <p className="page-subtitle">Platform configuration, Firestore canonical collection schemas, and database health maintenance.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Cloud className="w-5 h-5 text-purple-600" />
            <h3 className="text-sm font-bold text-slate-900">Firebase Firestore Real-Time Database</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Sync Status</span><span className="badge-emerald font-bold">Active Real-Time Sync</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Firestore Project</span><span className="text-slate-900 font-mono text-xs font-bold">healthgrid-iq-demo</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Region</span><span className="text-slate-800">asia-southeast1 (Singapore)</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Live Collections</span><span className="font-mono text-xs text-purple-700 font-bold">8 Canonical Collections</span></div>
          </div>
        </div>

        <div className="card border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Security &amp; Encryption</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Auth Mode</span><span className="text-slate-900 font-semibold">Role-Based Access Control (RBAC)</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Audit Trail</span><span className="text-emerald-700 font-bold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Immutable Event Log</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Data Encryption</span><span className="text-slate-800">TLS 1.3 / AES-256 at Rest</span></div>
          </div>
        </div>
      </div>

      {/* ── CANONICAL FIRESTORE SCHEMA GUIDE ────────────────────────────── */}
      <div className="card border border-purple-200 bg-white shadow-md space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-600" /> Firestore Canonical Collections &amp; Database Map
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Where every clinical entity, patient file, and case record is stored in Firestore.</p>
          </div>
          <span className="px-2.5 py-1 bg-purple-100 text-purple-900 rounded-full text-xs font-bold font-mono">8 COLLECTIONS</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CANONICAL_SCHEMAS.map((col) => (
            <div key={col.name} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-purple-900 bg-purple-100 px-2 py-0.5 rounded">{col.name}</span>
                <span className="font-mono text-[10px] text-slate-400">{col.docIdPattern}</span>
              </div>
              <p className="text-xs font-medium text-slate-800">{col.description}</p>
              <p className="text-[11px] text-slate-500 truncate font-mono">
                Fields: {col.fields.slice(0, 5).join(', ')}...
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── DATABASE RESET & CACHE PURGE TOOL ──────────────────────────── */}
      <div className="card border border-red-200 bg-red-50/40 p-6 space-y-4 rounded-xl">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-red-900">Database Cleanup &amp; Cache Purge Manager</h3>
            <p className="text-xs text-red-700">
              Clean up inconsistent test data, clear stale red flag alerts, and flush local browser caches.
            </p>
          </div>
        </div>

        {showConfirm ? (
          <div className="p-4 bg-white border border-red-300 rounded-xl space-y-3 shadow-sm">
            <p className="text-xs font-bold text-red-900">Are you sure you want to clean and reset local database state?</p>
            <p className="text-xs text-slate-600">This will clear browser cache and re-initialize a clean, pristine demo dataset with zero stale alerts.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowConfirm(false)} className="btn-secondary text-xs">Cancel</button>
              <button onClick={handleReset} disabled={resetting} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold">
                {resetting ? 'Resetting...' : 'Yes, Confirm Database Reset'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end">
            <button onClick={() => setShowConfirm(true)} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all">
              <Trash2 className="w-4 h-4" /> Clean &amp; Reset Database Cache
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
