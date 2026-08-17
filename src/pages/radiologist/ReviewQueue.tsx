import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import StatusBadge from '../../components/ui/StatusBadge';
import SeverityBadge from '../../components/ui/SeverityBadge';
import { Link } from 'react-router-dom';
import { AlertTriangle, Brain, Clock, User, Activity } from 'lucide-react';
import { computeAiUrgencyScore, type AiUrgencyLevel } from '../../utils/aiUrgencyScore';

type UrgencyFilter = 'ALL' | 'CRITICAL' | 'HIGH' | 'ROUTINE';

function AiUrgencyBadge({ level, flags }: { level: AiUrgencyLevel; flags: string[] }) {
  const config: Record<AiUrgencyLevel, { label: string; className: string }> = {
    CRITICAL: {
      label: 'AI CRITICAL',
      className: 'bg-red-600 text-white border border-red-700',
    },
    HIGH: {
      label: 'AI HIGH',
      className: 'bg-amber-500 text-white border border-amber-600',
    },
    ROUTINE: {
      label: 'AI ROUTINE',
      className: 'bg-slate-200 text-slate-700 border border-slate-300',
    },
  };
  const { label, className } = config[level];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider ${className}`}
      title={flags.length > 0 ? `Flagged keywords: ${flags.join(', ')}` : 'No concerning keywords detected'}
    >
      <Brain className="w-3 h-3" />
      {label}
    </span>
  );
}

export default function ReviewQueue() {
  const { currentUser } = useAuth();
  const { cases } = useData();
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyFilter>('ALL');

  // Filter cases routed to Radiologist or escalated by MO
  const rawScannedCases = cases.filter(
    (c) => c.status === 'SCANNED' && (c.routedToRole === 'Radiologist' || c.isEscalated || !c.routedToRole)
  );

  // Compute AI urgency for each case
  const scoredCases = rawScannedCases.map((c) => {
    const urgency = computeAiUrgencyScore(c.radiographerFindings, c.radiographerImpression);
    return { ...c, _urgency: urgency };
  });

  // Sort: escalated first, then by AI score descending
  const sortedCases = scoredCases.sort((a, b) => {
    if (b.isEscalated && !a.isEscalated) return 1;
    if (a.isEscalated && !b.isEscalated) return -1;
    return b._urgency.score - a._urgency.score;
  });

  // Apply urgency filter
  const filteredCases = urgencyFilter === 'ALL'
    ? sortedCases
    : sortedCases.filter((c) => c._urgency.level === urgencyFilter);

  const criticalCount = scoredCases.filter((c) => c._urgency.level === 'CRITICAL').length;
  const highCount = scoredCases.filter((c) => c._urgency.level === 'HIGH').length;
  const routineCount = scoredCases.filter((c) => c._urgency.level === 'ROUTINE').length;

  const filterTabs: { key: UrgencyFilter; label: string; count: number; className: string }[] = [
    { key: 'ALL', label: 'All Cases', count: scoredCases.length, className: 'text-slate-700 border-slate-300 bg-white-50' },
    { key: 'CRITICAL', label: 'AI Critical', count: criticalCount, className: 'text-red-700 border-red-300 bg-red-50' },
    { key: 'HIGH', label: 'AI High', count: highCount, className: 'text-amber-700 border-amber-300 bg-amber-50' },
    { key: 'ROUTINE', label: 'Routine', count: routineCount, className: 'text-slate-600 border-slate-200 bg-slate-50' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="page-title">Radiologist Review Queue</h1>

        </div>
        <p className="page-subtitle">
          {scoredCases.length} cases pending specialist review &middot; AI triage ranking active.
          {criticalCount > 0 && (
            <span className="ml-2 text-red-700 font-bold">
              {criticalCount} critical finding{criticalCount > 1 ? 's' : ''} detected.
            </span>
          )}
        </p>
      </div>

      {/* AI Triage Filter Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setUrgencyFilter(tab.key)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${urgencyFilter === tab.key
              ? tab.className + ' shadow-sm'
              : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
          >
            <Brain className="w-3 h-3" />
            {tab.label}
            <span className={`px-1.5 py-0.5 rounded font-mono ${urgencyFilter === tab.key ? 'bg-white/60' : 'bg-slate-100'}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>


      <div className="space-y-3">
        {filteredCases.map((c) => {
          const isCritical = c._urgency.level === 'CRITICAL';
          const isHigh = c._urgency.level === 'HIGH';
          return (
            <div
              key={c.id}
              className={`card transition-all ${c.isEscalated
                ? 'border-2 border-red-400 bg-red-50/30'
                : isCritical
                  ? 'border border-red-300 bg-red-50/20'
                  : isHigh
                    ? 'border border-amber-200 bg-amber-50/20'
                    : ''
                }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      to={`/case/${c.id}`}
                      className="text-sm font-semibold text-navy-700 hover:underline font-mono"
                    >
                      {c.caseNumber}
                    </Link>
                    <SeverityBadge severity={c.severity} />
                    <AiUrgencyBadge level={c._urgency.level} flags={c._urgency.flags} />
                    {c.isEscalated && (
                      <span className="px-2.5 py-0.5 bg-red-600 text-white text-[10px] font-extrabold rounded-full flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Escalated by Medical Officer
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-600">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" />
                      {c.patientName}
                    </span>
                    <span>{c.scanType}</span>
                    <span className="text-slate-400">{c.clinicName}</span>
                  </div>

                  {/* AI-flagged keywords preview */}
                  {c._urgency.flags.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Brain className="w-3 h-3 text-slate-400 flex-shrink-0" />
                      <span className="text-[10px] text-slate-500 font-medium">AI flags:</span>
                      {c._urgency.flags.slice(0, 4).map((flag) => (
                        <span
                          key={flag}
                          className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${isCritical
                            ? 'bg-red-100 text-red-800 border border-red-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                        >
                          {flag}
                        </span>
                      ))}
                      {c._urgency.flags.length > 4 && (
                        <span className="text-[10px] text-slate-400">+{c._urgency.flags.length - 4} more</span>
                      )}
                    </div>
                  )}

                  {/* Radiographer preliminary findings snippet */}
                  {c.radiographerFindings && (
                    <p className="text-[11px] text-slate-500 italic line-clamp-2 bg-slate-50 px-2 py-1.5 rounded border border-slate-100">
                      <span className="font-semibold text-slate-600 not-italic">Radiographer notes: </span>
                      {c.radiographerFindings}
                    </p>
                  )}

                  {c.escalationReason && (
                    <p className="text-xs text-red-700 font-semibold">
                      Escalation: {c.escalationReason} (by {c.escalatedBy || 'MO'})
                    </p>
                  )}

                  {c.notes && !c.radiographerFindings && (
                    <p className="text-xs text-slate-400 italic">"{c.notes}"</p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <Link to="/reporting" className="btn-primary text-xs whitespace-nowrap">
                    Review & Report
                  </Link>
                  {c.scheduledAt && (
                    <span className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                      <Clock className="w-3 h-3" />
                      {new Date(c.scheduledAt).toLocaleDateString('en-MY')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {filteredCases.length === 0 && (
          <div className="text-center py-12">
            <Brain className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-600">
              {urgencyFilter === 'ALL' ? 'Inbox is clear' : `No ${urgencyFilter.toLowerCase()} priority cases`}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {urgencyFilter === 'ALL' ? 'No pending reports. Great work!' : 'Switch to All Cases to see other cases.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
