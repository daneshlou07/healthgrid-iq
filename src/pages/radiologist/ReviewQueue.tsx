import React from 'react';
import { useData } from '../../context/DataContext';
import StatusBadge from '../../components/ui/StatusBadge';
import SeverityBadge from '../../components/ui/SeverityBadge';
import { Link } from 'react-router-dom';

export default function ReviewQueue() {
  const { cases } = useData();
  const scannedCases = cases.filter((c) => c.status === 'SCANNED');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Report Inbox</h1>
        <p className="page-subtitle">{scannedCases.length} cases pending report</p>
      </div>

      <div className="space-y-3">
        {scannedCases.map((c) => (
          <div key={c.id} className="card">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Link to={`/case/${c.id}`} className="text-sm font-semibold text-navy-700 hover:underline font-mono">{c.caseNumber}</Link>
                  <SeverityBadge severity={c.severity} />
                </div>
                <p className="text-sm text-surface-700">Patient: {c.patientName}</p>
                <p className="text-xs text-surface-500">Scan: {c.scanType} &middot; Clinic: {c.clinicName}</p>
                {c.notes && <p className="text-xs text-surface-400 mt-1 italic">"{c.notes}"</p>}
              </div>
              <Link to="/reporting" className="btn-primary text-xs">Write Report</Link>
            </div>
          </div>
        ))}
        {scannedCases.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm font-medium text-surface-600">Inbox is clear</p>
            <p className="text-xs text-surface-400 mt-1">No pending reports. Great work!</p>
          </div>
        )}
      </div>
    </div>
  );
}
