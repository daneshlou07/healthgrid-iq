import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import StatusBadge from '../../components/ui/StatusBadge';
import SeverityBadge from '../../components/ui/SeverityBadge';
import { Link } from 'react-router-dom';
import { getCaseRegistrar } from '../../utils/caseDisplay';

export default function ScanQueue() {
  const { currentUser } = useAuth();
  const { cases } = useData();

  const myCases = cases.filter((c) => c.radiographerId === currentUser?.id);
  const scheduled = myCases.filter((c) => c.status === 'SCHEDULED');
  const scanned = myCases.filter((c) => c.status === 'SCANNED');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">My Cases</h1>
        <p className="page-subtitle">{myCases.length} assigned cases</p>
      </div>

      <div>
        <h2 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">Pending ({scheduled.length})</h2>
        <div className="space-y-3">
          {scheduled.map((c) => (
            <div key={c.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Link to={`/case/${c.id}`} className="text-sm font-semibold text-navy-700 font-mono hover:underline">{c.caseNumber}</Link>
                    <SeverityBadge severity={c.severity} />
                  </div>
                  <p className="text-sm text-surface-700">Patient: {c.patientName}</p>
                  <p className="text-xs text-surface-500">Type: {c.scanType}{c.bodyRegion ? ` · ${c.bodyRegion}` : ''} &middot; Clinic: {c.clinicName}</p>
                  <p className="text-xs text-surface-500">Registered by: {getCaseRegistrar(c)}</p>
                  {c.scheduledAt && <p className="text-xs text-emerald-600 mt-1">Scheduled: {new Date(c.scheduledAt).toLocaleString()}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Link to={`/case/${c.id}`} className="btn-secondary text-xs">
                    View Details
                  </Link>
                  <Link to={`/upload?caseId=${c.id}`} className="btn-primary text-xs">Upload Scan</Link>
                </div>
              </div>
            </div>
          ))}
          {scheduled.length === 0 && <div className="text-center py-8 text-surface-400 text-sm">No pending scans.</div>}
        </div>
      </div>

      {scanned.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">Imaging Completed ({scanned.length})</h2>
          <div className="space-y-2">
            {scanned.map((c) => (
              <div key={c.id} className="flex items-center justify-between p-3 bg-white border border-surface-300 rounded-lg">
                <div>
                  <Link to={`/case/${c.id}`} className="text-sm font-medium text-navy-700 hover:underline">{c.caseNumber} — {c.patientName}</Link>
                  <p className="text-xs text-surface-500">{c.scanType}</p>
                </div>
                <StatusBadge status={c.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
