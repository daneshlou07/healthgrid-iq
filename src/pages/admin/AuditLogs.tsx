import React, { useEffect, useState } from 'react';
import { getAuditLogs } from '../../services/dataService';
import type { AuditLog } from '../../types';
import { Search, Shield, Download } from 'lucide-react';
import { exportToCSV } from '../../utils/exportUtils';

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('all');

  useEffect(() => { getAuditLogs().then(setLogs); }, []);

  const actions = [...new Set(logs.map((l) => l.action))];
  const filtered = logs.filter((log) => {
    const matchSearch = log.details.toLowerCase().includes(search.toLowerCase()) || log.userName.toLowerCase().includes(search.toLowerCase());
    const matchAction = filterAction === 'all' || log.action === filterAction;
    return matchSearch && matchAction;
  });

  const handleExport = () => {
    exportToCSV(
      filtered.map((l) => ({
        Timestamp: new Date(l.timestamp).toLocaleString(),
        User: l.userName,
        Role: l.userRole,
        Action: l.action,
        Details: l.details,
      })),
      'HealthGrid_Audit_Logs'
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="page-title">System Audit Logs</h1>
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-[10px] font-bold rounded-md flex items-center gap-1">
              <Shield className="w-3 h-3 text-emerald-600" />
              FIRESTORE SECURED &bull; IMMUTABLE
            </span>
          </div>
          <p className="page-subtitle flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> Immutable, append-only audit trail for medical compliance.</p>
        </div>
        <button onClick={handleExport} className="btn-secondary text-sm flex items-center gap-1.5">
          <Download className="w-4 h-4" /> Export to Spreadsheet (CSV)
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input type="text" placeholder="Search logs..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" />
        </div>
        <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)} className="select-field w-auto">
          <option value="all">All Actions</option>
          {actions.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-200">
              <th className="table-header">Timestamp</th>
              <th className="table-header">User</th>
              <th className="table-header">Role</th>
              <th className="table-header">Action</th>
              <th className="table-header">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-200">
            {filtered.map((log) => (
              <tr key={log.id} className="hover:bg-surface-100">
                <td className="table-cell text-xs text-surface-500 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                <td className="table-cell font-medium">{log.userName}</td>
                <td className="table-cell"><span className="badge-neutral text-[10px]">{log.userRole}</span></td>
                <td className="table-cell"><span className="text-xs font-mono font-medium text-navy-600">{log.action}</span></td>
                <td className="table-cell text-surface-600 max-w-xs truncate">{log.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-10 text-surface-400 text-sm">No logs found.</div>}
      </div>
      <p className="text-[10px] text-surface-400 text-center">{filtered.length} of {logs.length} records</p>
    </div>
  );
}
