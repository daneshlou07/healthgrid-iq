import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import StatusBadge from '../../components/ui/StatusBadge';
import SeverityBadge from '../../components/ui/SeverityBadge';
import { Search, Clock, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function MoTrackStatus() {
  const { cases } = useData();
  const [search, setSearch] = useState('');

  const targetCase = search.trim()
    ? cases.find((c) =>
        c.caseNumber.toLowerCase() === search.trim().toLowerCase() ||
        c.patientName.toLowerCase().includes(search.trim().toLowerCase())
      )
    : null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="page-title">Medical Officer Referral Tracker</h1>
          <span className="badge-purple font-mono text-xs font-bold">MO STATUS</span>
        </div>
        <p className="page-subtitle">Track real-time scanning &amp; reporting progress for radiology referrals.</p>
      </div>

      <div className="card space-y-3 border border-slate-200 shadow-sm">
        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">Search Case Reference or Patient Name</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            type="text"
            placeholder="Type Case # (e.g. XR2026849201) or Patient Name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10 font-mono text-sm"
          />
        </div>
      </div>

      {targetCase && (
        <div className="card space-y-5 border border-purple-200 bg-white shadow-md">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <span className="text-xs font-mono font-bold text-purple-700">{targetCase.caseNumber}</span>
              <h2 className="text-base font-bold text-slate-900">{targetCase.patientName}</h2>
            </div>
            <StatusBadge status={targetCase.status} />
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div><span className="text-slate-500">Modality:</span> <span className="font-bold text-slate-900">{targetCase.scanType}</span></div>
            <div><span className="text-slate-500">Severity:</span> <SeverityBadge severity={targetCase.severity} /></div>
            <div><span className="text-slate-500">Registered Date:</span> <span className="text-slate-800">{new Date(targetCase.createdAt).toLocaleString()}</span></div>
            <div><span className="text-slate-500">Radiographer:</span> <span className="font-semibold text-emerald-700">{targetCase.radiographerName || 'Assigned'}</span></div>
          </div>

          {/* Clinical Progress Timeline */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Referral Pipeline Lifecycle</h3>
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2 bg-emerald-50 text-emerald-800 rounded-lg font-bold border border-emerald-200">1. Referral Submitted</div>
              <div className={`p-2 rounded-lg font-bold border ${targetCase.status !== 'CREATED' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>2. PACS Scheduled</div>
              <div className={`p-2 rounded-lg font-bold border ${targetCase.status === 'SCANNED' || targetCase.status === 'FINALIZED' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>3. Image Scanned</div>
              <div className={`p-2 rounded-lg font-bold border ${targetCase.status === 'FINALIZED' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>4. Report Finalized</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
