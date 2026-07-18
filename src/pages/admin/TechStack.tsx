import React from 'react';
import { Server, Database, Shield, Globe, Cpu, HardDrive, Activity, CheckCircle, AlertCircle } from 'lucide-react';

interface ServiceStatus { name: string; status: 'online' | 'degraded' | 'offline'; latency?: string; }

const services: ServiceStatus[] = [
  { name: 'Firebase Firestore', status: 'online', latency: '12ms' },
  { name: 'Firebase Authentication', status: 'online', latency: '8ms' },
  { name: 'OSRM Routing API', status: 'online', latency: '45ms' },
  { name: 'Nominatim Geocoding', status: 'online', latency: '120ms' },
  { name: 'OpenStreetMap Tiles', status: 'online', latency: '30ms' },
  { name: 'Firebase Hosting (CDN)', status: 'online', latency: '5ms' },
];

export default function TechStack() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">System Infrastructure</h1>
        <p className="page-subtitle">Application services, API status, storage, and system health</p>
      </div>

      {/* Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center gap-2 mb-2"><Activity className="w-4 h-4 text-emerald-600" /><span className="text-xs font-medium text-surface-500">System Status</span></div>
          <p className="text-lg font-bold text-emerald-600">Operational</p>
          <p className="text-[10px] text-surface-400 mt-1">All services running</p>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 mb-2"><Server className="w-4 h-4 text-navy-600" /><span className="text-xs font-medium text-surface-500">Uptime</span></div>
          <p className="text-lg font-bold text-navy-800">99.97%</p>
          <p className="text-[10px] text-surface-400 mt-1">Last 30 days</p>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 mb-2"><HardDrive className="w-4 h-4 text-purple-500" /><span className="text-xs font-medium text-surface-500">Storage Used</span></div>
          <p className="text-lg font-bold text-navy-800">2.4 GB</p>
          <p className="text-[10px] text-surface-400 mt-1">of 10 GB allocated</p>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 mb-2"><Cpu className="w-4 h-4 text-amber-600" /><span className="text-xs font-medium text-surface-500">API Calls (24h)</span></div>
          <p className="text-lg font-bold text-navy-800">14,832</p>
          <p className="text-[10px] text-surface-400 mt-1">Avg latency: 22ms</p>
        </div>
      </div>

      {/* Service Status */}
      <div className="card">
        <h2 className="section-title mb-4">Service Status</h2>
        <div className="space-y-2">
          {services.map((svc) => (
            <div key={svc.name} className="flex items-center justify-between p-3 bg-surface-100 rounded-lg border border-surface-200">
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${svc.status === 'online' ? 'bg-emerald-500' : svc.status === 'degraded' ? 'bg-amber-500' : 'bg-red-500'}`} />
                <span className="text-sm font-medium text-surface-800">{svc.name}</span>
              </div>
              <div className="flex items-center gap-3">
                {svc.latency && <span className="text-xs text-surface-500">{svc.latency}</span>}
                <span className={svc.status === 'online' ? 'badge-success text-[10px]' : svc.status === 'degraded' ? 'badge-warning text-[10px]' : 'badge-error text-[10px]'}>{svc.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Application Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="section-title mb-4 flex items-center gap-2"><Globe className="w-4 h-4 text-navy-600" /> Application</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-surface-500">Version</span><span className="text-surface-800 font-medium">1.0.0</span></div>
            <div className="flex justify-between"><span className="text-surface-500">Environment</span><span className="badge-success text-[10px]">Production</span></div>
            <div className="flex justify-between"><span className="text-surface-500">Region</span><span className="text-surface-800">asia-southeast1 (Singapore)</span></div>
            <div className="flex justify-between"><span className="text-surface-500">Build</span><span className="text-surface-800 font-mono text-xs">vite-5.4.10+react-18.3</span></div>
            <div className="flex justify-between"><span className="text-surface-500">Last Deploy</span><span className="text-surface-800">Jul 15, 2026 07:00 MYT</span></div>
          </div>
        </div>

        <div className="card">
          <h2 className="section-title mb-4 flex items-center gap-2"><Database className="w-4 h-4 text-purple-500" /> Database</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-surface-500">Provider</span><span className="text-surface-800">Firebase Firestore</span></div>
            <div className="flex justify-between"><span className="text-surface-500">Mode</span><span className="badge-warning text-[10px]">Demo (Local Mock)</span></div>
            <div className="flex justify-between"><span className="text-surface-500">Collections</span><span className="text-surface-800">8 active</span></div>
            <div className="flex justify-between"><span className="text-surface-500">Documents</span><span className="text-surface-800">~150</span></div>
            <div className="flex justify-between"><span className="text-surface-500">Backup</span><span className="text-surface-800">Daily at 02:00 MYT</span></div>
          </div>
        </div>

        <div className="card">
          <h2 className="section-title mb-4 flex items-center gap-2"><Shield className="w-4 h-4 text-emerald-600" /> Security</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-surface-500">Authentication</span><span className="text-surface-800">Firebase Auth + Fallback</span></div>
            <div className="flex justify-between"><span className="text-surface-500">Encryption</span><span className="badge-success text-[10px]">TLS 1.3</span></div>
            <div className="flex justify-between"><span className="text-surface-500">Audit Logs</span><span className="badge-success text-[10px]">Immutable</span></div>
            <div className="flex justify-between"><span className="text-surface-500">Report Locking</span><span className="badge-success text-[10px]">Enabled</span></div>
            <div className="flex justify-between"><span className="text-surface-500">Compliance</span><span className="text-surface-800">HIPAA-Ready</span></div>
          </div>
        </div>

        <div className="card">
          <h2 className="section-title mb-4 flex items-center gap-2"><Cpu className="w-4 h-4 text-amber-600" /> AI Services</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-surface-500">Scheduler Engine</span><span className="badge-success text-[10px]">Active</span></div>
            <div className="flex justify-between"><span className="text-surface-500">Geocoding</span><span className="text-surface-800">Nominatim + Fallback</span></div>
            <div className="flex justify-between"><span className="text-surface-500">Routing</span><span className="text-surface-800">OSRM + Haversine</span></div>
            <div className="flex justify-between"><span className="text-surface-500">Scoring Algorithm</span><span className="text-surface-800">Workload-Weighted</span></div>
            <div className="flex justify-between"><span className="text-surface-500">Recommendations</span><span className="text-surface-800">Demand-Based</span></div>
          </div>
        </div>
      </div>

      {/* Storage Breakdown */}
      <div className="card">
        <h2 className="section-title mb-4">Storage Breakdown</h2>
        <div className="space-y-3">
          {[
            { label: 'Medical Images (PACS)', used: 1.8, total: 5, color: 'bg-navy-500' },
            { label: 'Patient Records', used: 0.3, total: 2, color: 'bg-purple-400' },
            { label: 'Audit Logs', used: 0.2, total: 2, color: 'bg-amber-500' },
            { label: 'System Config', used: 0.1, total: 1, color: 'bg-emerald-500' },
          ].map((item) => (
            <div key={item.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-surface-700">{item.label}</span>
                <span className="text-xs text-surface-500">{item.used} GB / {item.total} GB</span>
              </div>
              <div className="h-2 bg-surface-200 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${item.color}`} style={{ width: `${(item.used / item.total) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
