import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import StatusBadge from '../../components/ui/StatusBadge';
import SeverityBadge from '../../components/ui/SeverityBadge';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

export default function ReviewQueue() {
  const { currentUser } = useAuth();
  const { cases } = useData();
  const isMO = currentUser?.role === 'Medical Officer';

  // Filter cases routed directly to Radiologist OR escalated by MO for 2nd opinion
  const scannedCases = cases
    .filter((c) => c.status === 'SCANNED' && (c.routedToRole === 'Radiologist' || c.isEscalated || !c.routedToRole))
    .sort((a, b) => (b.isEscalated ? 1 : 0) - (a.isEscalated ? 1 : 0));

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="page-title">Specialist Radiologist Report Inbox</h1>
          <span className="badge-purple font-mono text-xs font-bold">RADIOLOGIST QUEUE</span>
        </div>
        <p className="page-subtitle">
          {scannedCases.length} cases pending specialist review &middot; Priority 2nd opinion requests &amp; complex cases.
        </p>
      </div>

      <div className="space-y-3">
        {scannedCases.map((c) => (
          <div key={c.id} className={`card ${c.isEscalated ? 'border-2 border-red-400 bg-red-50/30' : ''}`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Link to={`/case/${c.id}`} className="text-sm font-semibold text-navy-700 hover:underline font-mono">{c.caseNumber}</Link>
                  <SeverityBadge severity={c.severity} />
                  {c.isEscalated && (
                    <span className="px-2.5 py-0.5 bg-red-600 text-white text-[10px] font-extrabold rounded-full flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> ESCALATED BY MO
                    </span>
                  )}
                </div>
                <p className="text-sm text-surface-700">Patient: {c.patientName}</p>
                <p className="text-xs text-surface-500">Scan: {c.scanType} &middot; Clinic: {c.clinicName}</p>
                {c.escalationReason && (
                  <p className="text-xs text-red-700 mt-1 font-semibold">
                    Escalation Rationale: {c.escalationReason} (by {c.escalatedBy || 'MO'})
                  </p>
                )}
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
