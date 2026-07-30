import React from 'react';
import { useData } from '../../context/DataContext';
import SeverityBadge from '../../components/ui/SeverityBadge';
import { Link } from 'react-router-dom';
import { Clock, AlertTriangle } from 'lucide-react';
import { getCaseIndication } from '../../utils/caseDisplay';

export default function TrackStatus() {
  const { cases } = useData();

  const pending = cases.filter((c) => c.status === 'CREATED');
  const scheduled = cases.filter((c) => c.status === 'SCHEDULED');
  const scanned = cases.filter((c) => c.status === 'SCANNED');
  const finalized = cases.filter((c) => c.status === 'FINALIZED');

  // Flag overdue pending cases (>24h)
  const now = new Date();
  const isOverdue = (createdAt: string) => (now.getTime() - new Date(createdAt).getTime()) > 24 * 60 * 60 * 1000;

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="page-title">Medical Officer Referral Tracker</h1>
          <span className="badge-purple font-mono text-xs font-bold">MO STATUS</span>
        </div>
        <p className="page-subtitle">Monitor real-time scanning &amp; reporting progress for Medical Officer radiology referrals.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
        {/* Pending Column */}
        <KanbanColumn title="Pending Scheduling" count={pending.length} color="amber">
          {pending.map((c) => (
            <KanbanCard key={c.id} caseId={c.id} caseNumber={c.caseNumber} patient={c.patientName}
              detail={`${c.scanType}${getCaseIndication(c) ? ' — ' + getCaseIndication(c) : ''}`}
              severity={c.severity} date={c.createdAt} overdue={isOverdue(c.createdAt)} />
          ))}
        </KanbanColumn>

        {/* Scheduled Column */}
        <KanbanColumn title="Scheduled" count={scheduled.length} color="navy">
          {scheduled.map((c) => (
            <KanbanCard key={c.id} caseId={c.id} caseNumber={c.caseNumber} patient={c.patientName}
              detail={`${c.scanType} — ${c.clinicName || ''}`}
              severity={c.severity} date={c.scheduledAt || c.createdAt} />
          ))}
        </KanbanColumn>

        {/* Imaging Done Column */}
        <KanbanColumn title="Imaging Done" count={scanned.length} color="purple">
          {scanned.map((c) => (
            <KanbanCard key={c.id} caseId={c.id} caseNumber={c.caseNumber} patient={c.patientName}
              detail={`${c.scanType} — ${c.clinicName || ''}`}
              severity={c.severity} date={c.scannedAt || c.createdAt} />
          ))}
        </KanbanColumn>

        {/* Report Ready Column */}
        <KanbanColumn title="Report Finalized" count={finalized.length} color="emerald">
          {finalized.map((c) => (
            <KanbanCard key={c.id} caseId={c.id} caseNumber={c.caseNumber} patient={c.patientName}
              detail={`${c.scanType} — ${c.clinicName || ''}`}
              severity={c.severity} date={c.finalizedAt || c.createdAt} />
          ))}
        </KanbanColumn>
      </div>
    </div>
  );
}

function KanbanColumn({ title, count, color, children }: { title: string; count: number; color: 'navy' | 'emerald' | 'purple' | 'amber'; children: React.ReactNode }) {
  const headerColors = { navy: 'text-navy-700', emerald: 'text-emerald-700', purple: 'text-purple-700', amber: 'text-amber-700' };
  const countColors = { navy: 'bg-navy-100 text-navy-700', emerald: 'bg-emerald-100 text-emerald-700', purple: 'bg-purple-100 text-purple-700', amber: 'bg-amber-100 text-amber-700' };

  return (
    <div className="bg-surface-100 rounded-xl border border-surface-200 p-4 min-h-[300px]">
      <div className="flex items-center justify-between mb-4">
        <h2 className={`text-xs font-semibold uppercase tracking-wider ${headerColors[color]}`}>{title}</h2>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${countColors[color]}`}>{count}</span>
      </div>
      <div className="space-y-2.5">
        {children}
      </div>
      {count === 0 && <div className="text-center py-8 text-surface-400 text-[11px]">No cases</div>}
    </div>
  );
}

function KanbanCard({ caseId, caseNumber, patient, detail, severity, date, overdue }: {
  caseId: string; caseNumber: string; patient: string; detail: string;
  severity?: 'Mild' | 'Moderate' | 'Severe' | 'Critical'; date: string; overdue?: boolean;
}) {
  return (
    <Link to={`/case/${caseId}`} className={`block bg-white rounded-lg border p-3 shadow-card hover:shadow-card-hover transition-shadow ${overdue ? 'border-red-300 bg-red-50/30' : 'border-surface-300'}`}>
      <div className="flex items-start justify-between mb-1">
        <span className="text-xs font-mono font-semibold text-navy-600">{caseNumber}</span>
        <SeverityBadge severity={severity} />
      </div>
      <p className="text-sm font-medium text-surface-800">{patient}</p>
      <p className="text-xs text-surface-500 mt-0.5">{detail}</p>
      <div className="flex items-center justify-between mt-1.5">
        <p className="text-[10px] text-surface-400">{new Date(date).toLocaleDateString()}</p>
        {overdue && (
          <span className="flex items-center gap-0.5 text-[9px] text-red-600 font-medium">
            <AlertTriangle className="w-2.5 h-2.5" /> Overdue
          </span>
        )}
      </div>
    </Link>
  );
}
