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

  // Filter pending cases and sort escalated cases to top
  const scannedCases = cases
    .filter((c) => c.status === 'SCANNED')
    .sort((a, b) => (b.isEscalated ? 1 : 0) - (a.isEscalated ? 1 : 0));

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="page-title">Medical Officer Cases to Review</h1>
          <span className="badge-purple font-mono text-xs font-bold">MO REVIEW INBOX</span>
        </div>
        <p className="page-subtitle">
          {scannedCases.length} cases pending report &middot; Finalize routine cases or escalate complex cases to Specialist Radiologist.
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
                      <AlertTriangle className="w-3 h-3" /> ESCALATED TO RADIOLOGIST
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-surface-900">{c.patientName}</h3>
                <p className="text-xs text-surface-500 mt-1">{c.scanType} &bull; Clinical Indication: {c.indication || 'Unspecified'}</p>
                {c.radiographerName && <p className="text-xs text-emerald-700 font-medium mt-1">Scanned by: {c.radiographerName}</p>}
              </div>

              <div className="flex flex-col items-end gap-2">
                <StatusBadge status={c.status} />
                <Link to={`/reporting?caseId=${c.id}`} className="btn-primary text-xs py-1.5 px-3">
                  Open Medical Officer Reporting &rarr;
                </Link>
              </div>
            </div>
          </div>
        ))}

        {scannedCases.length === 0 && (
          <div className="card text-center py-12 text-surface-400">
            <p className="text-sm font-medium">Inbox is clear</p>
            <p className="text-xs mt-1">No pending reports awaiting Medical Officer review. Great work!</p>
          </div>
        )}
      </div>
    </div>
  );
}
