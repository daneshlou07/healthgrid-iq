import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import SeverityBadge from '../../components/ui/SeverityBadge';
import { Link } from 'react-router-dom';
import { Search, AlertTriangle, Clock, ArrowRight, X, ArrowUpDown, Calendar } from 'lucide-react';
import { getCaseIndication } from '../../utils/caseDisplay';

function getInitials(name: string): string {
  if (!name) return 'PT';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarColor(name: string): string {
  const colors = [
    'bg-blue-100 text-blue-700 border-blue-200',
    'bg-emerald-100 text-emerald-700 border-emerald-200',
    'bg-indigo-100 text-indigo-700 border-indigo-200',
    'bg-teal-100 text-teal-700 border-teal-200',
    'bg-purple-100 text-purple-700 border-purple-200',
  ];
  let charSum = 0;
  for (let i = 0; i < name.length; i++) charSum += name.charCodeAt(i);
  return colors[charSum % colors.length];
}

function getSlaInfo(createdAt: string, status: string): { isOverdue: boolean; label: string } {
  const elapsedMs = new Date().getTime() - new Date(createdAt).getTime();
  const elapsedHours = Math.floor(elapsedMs / (1000 * 60 * 60));

  if (status === 'CREATED' && elapsedHours >= 24) {
    return { isOverdue: true, label: `Overdue (${elapsedHours}h)` };
  }
  if (status === 'SCANNED' && elapsedHours >= 12) {
    return { isOverdue: true, label: `Report Delayed (${elapsedHours}h)` };
  }
  return { isOverdue: false, label: `${elapsedHours}h ago` };
}

type SortOrder = 'newest' | 'oldest' | 'severity' | 'slaBreach';
type DateFilter = 'all' | 'today' | '7days' | '30days';

export default function TrackStatus() {
  const { cases } = useData();
  const [search, setSearch] = useState('');
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [selectedModality, setSelectedModality] = useState<string>('All');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');

  const filteredCases = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return cases
      .filter((c) => {
        const searchLower = search.toLowerCase().trim();
        const searchMatch =
          !searchLower ||
          c.caseNumber.toLowerCase().includes(searchLower) ||
          c.patientName.toLowerCase().includes(searchLower) ||
          getCaseIndication(c).toLowerCase().includes(searchLower);

        const modalityMatch = selectedModality === 'All' || c.scanType === selectedModality || c.modality === selectedModality;

        const slaInfo = getSlaInfo(c.createdAt, c.status);
        const overdueMatch = !onlyOverdue || slaInfo.isOverdue;

        let dateMatch = true;
        if (dateFilter === 'today') {
          const caseDateStr = new Date(c.createdAt).toISOString().split('T')[0];
          dateMatch = caseDateStr === todayStr;
        } else if (dateFilter === '7days') {
          const diffMs = now.getTime() - new Date(c.createdAt).getTime();
          dateMatch = diffMs <= 7 * 24 * 60 * 60 * 1000;
        } else if (dateFilter === '30days') {
          const diffMs = now.getTime() - new Date(c.createdAt).getTime();
          dateMatch = diffMs <= 30 * 24 * 60 * 60 * 1000;
        }

        return searchMatch && modalityMatch && overdueMatch && dateMatch;
      })
      .sort((a, b) => {
        if (sortOrder === 'newest') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (sortOrder === 'oldest') {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        if (sortOrder === 'severity') {
          const severityRank: Record<string, number> = { Critical: 4, Severe: 3, Moderate: 2, Mild: 1 };
          const rankA = severityRank[a.severity || 'Moderate'] || 2;
          const rankB = severityRank[b.severity || 'Moderate'] || 2;
          return rankB - rankA;
        }
        if (sortOrder === 'slaBreach') {
          const slaA = getSlaInfo(a.createdAt, a.status).isOverdue ? 1 : 0;
          const slaB = getSlaInfo(b.createdAt, b.status).isOverdue ? 1 : 0;
          return slaB - slaA;
        }
        return 0;
      });
  }, [cases, search, selectedModality, onlyOverdue, dateFilter, sortOrder]);

  const pending = filteredCases.filter((c) => c.status === 'CREATED');
  const scheduled = filteredCases.filter((c) => c.status === 'SCHEDULED');
  const scanned = filteredCases.filter((c) => c.status === 'SCANNED');
  const finalized = filteredCases.filter((c) => c.status === 'FINALIZED');

  const overdueCount = cases.filter((c) => getSlaInfo(c.createdAt, c.status).isOverdue).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-surface-200">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-navy-900 tracking-tight">MO Case Tracker</h1>
            <span className="px-2 py-0.5 bg-navy-50 text-navy-700 border border-navy-200 font-mono text-[11px] font-bold rounded-md">
              MO TRACKER
            </span>
          </div>
          <p className="text-xs text-surface-500 mt-1">
            Monitor real-time scanning &amp; reporting progress for Medical Officer referral cases.
          </p>
        </div>

        {overdueCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-semibold">
            <AlertTriangle className="w-4 h-4 text-red-600 animate-pulse" />
            <span>{overdueCount} case{overdueCount > 1 ? 's' : ''} breached SLA</span>
          </div>
        )}
      </div>

      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-surface-300 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            type="text"
            placeholder="Search referrals by case #, patient, or symptom..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface-50 border border-surface-300 rounded-lg pl-9 pr-8 py-1.5 text-xs text-surface-800 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-navy-200 focus:border-navy-500"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setOnlyOverdue(!onlyOverdue)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              onlyOverdue
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-surface-100 text-surface-700 hover:bg-surface-200 border border-surface-300'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Overdue SLA Only</span>
          </button>

          {/* Sort Order Selector */}
          <div className="relative inline-flex items-center">
            <ArrowUpDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500 pointer-events-none" />
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
              className="bg-surface-100 border border-surface-300 hover:border-navy-400 text-surface-700 font-medium rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-navy-200 cursor-pointer transition-colors"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="oldest">Sort: Oldest First</option>
              <option value="severity">Sort: Highest Severity</option>
              <option value="slaBreach">Sort: SLA Overdue First</option>
            </select>
          </div>

          {/* Date Filter Selector */}
          <div className="relative inline-flex items-center">
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500 pointer-events-none" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as DateFilter)}
              className="bg-surface-100 border border-surface-300 hover:border-navy-400 text-surface-700 font-medium rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-navy-200 cursor-pointer transition-colors"
            >
              <option value="all">Date: All Time</option>
              <option value="today">Date: Today Only</option>
              <option value="7days">Date: Past 7 Days</option>
              <option value="30days">Date: Past 30 Days</option>
            </select>
          </div>

          <select
            value={selectedModality}
            onChange={(e) => setSelectedModality(e.target.value)}
            className="bg-surface-100 border border-surface-300 rounded-lg px-3 py-1.5 text-xs font-medium text-surface-700 focus:outline-none focus:ring-2 focus:ring-navy-200"
          >
            <option value="All">All Modalities</option>
            <option value="Chest X-Ray">Chest X-Ray</option>
            <option value="Brain MRI">Brain MRI</option>
            <option value="Abdominal CT">Abdominal CT</option>
            <option value="Knee Ultrasound">Knee Ultrasound</option>
            <option value="Lumbar Spine X-Ray">Lumbar Spine X-Ray</option>
          </select>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
        <KanbanColumn title="Pending Triage" count={pending.length} color="amber">
          {pending.map((c) => (
            <KanbanCard key={c.id} caseData={c} />
          ))}
        </KanbanColumn>

        <KanbanColumn title="Scheduled" count={scheduled.length} color="navy">
          {scheduled.map((c) => (
            <KanbanCard key={c.id} caseData={c} />
          ))}
        </KanbanColumn>

        <KanbanColumn title="Imaging Uploaded" count={scanned.length} color="blue">
          {scanned.map((c) => (
            <KanbanCard key={c.id} caseData={c} />
          ))}
        </KanbanColumn>

        <KanbanColumn title="Report Finalized" count={finalized.length} color="emerald">
          {finalized.map((c) => (
            <KanbanCard key={c.id} caseData={c} />
          ))}
        </KanbanColumn>
      </div>
    </div>
  );
}

function KanbanColumn({
  title,
  count,
  color,
  children,
}: {
  title: string;
  count: number;
  color: 'navy' | 'emerald' | 'blue' | 'amber';
  children: React.ReactNode;
}) {
  const headerColors = {
    navy: 'text-navy-800',
    emerald: 'text-emerald-800',
    blue: 'text-blue-800',
    amber: 'text-amber-800',
  };
  const countColors = {
    navy: 'bg-navy-100 text-navy-800',
    emerald: 'bg-emerald-100 text-emerald-800',
    blue: 'bg-blue-100 text-blue-800',
    amber: 'bg-amber-100 text-amber-800',
  };

  return (
    <div className="bg-surface-100/70 rounded-2xl border border-surface-200/80 p-4 min-h-[420px] flex flex-col">
      <div className="flex items-center justify-between mb-3.5 px-1">
        <h2 className={`text-xs font-bold uppercase tracking-wider ${headerColors[color]}`}>
          {title}
        </h2>
        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${countColors[color]}`}>
          {count}
        </span>
      </div>

      <div className="space-y-3 flex-1">{children}</div>

      {count === 0 && (
        <div className="text-center py-12 text-surface-400 text-xs my-auto font-medium">
          No cases in this stage
        </div>
      )}
    </div>
  );
}

function KanbanCard({ caseData }: { caseData: any }) {
  const indication = getCaseIndication(caseData);
  const sla = getSlaInfo(caseData.createdAt, caseData.status);
  const avatarStyle = getAvatarColor(caseData.patientName);
  const initials = getInitials(caseData.patientName);

  return (
    <div
      className={`bg-white rounded-xl border p-3.5 shadow-xs hover:shadow-md transition-all duration-150 group ${
        sla.isOverdue ? 'border-red-200 bg-red-50/30' : 'border-surface-200/80 hover:border-navy-300'
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-semibold text-navy-700">
          {caseData.caseNumber}
        </span>
        <SeverityBadge severity={caseData.severity} />
      </div>

      <div className="flex items-center gap-2 mb-1.5">
        <div
          className={`w-6 h-6 rounded-full border flex items-center justify-center font-bold text-xs shrink-0 ${avatarStyle}`}
        >
          {initials}
        </div>
        <p className="text-xs font-semibold text-surface-900 group-hover:text-navy-700 truncate">
          {caseData.patientName}
        </p>
      </div>

      <p className="text-[11px] text-surface-500 font-medium truncate mb-2.5" title={indication}>
        {caseData.scanType} &bull; {indication || 'Unspecified'}
      </p>

      <div className="flex items-center justify-between pt-2 border-t border-surface-100 text-xs">
        <span
          className={`font-medium flex items-center gap-1 text-[11px] ${
            sla.isOverdue ? 'text-red-700 font-semibold' : 'text-surface-500'
          }`}
        >
          <Clock className="w-3 h-3" />
          <span>{sla.label}</span>
        </span>

        <Link
          to={`/case/${caseData.id}`}
          className="inline-flex items-center gap-0.5 text-navy-600 font-semibold hover:text-navy-800 hover:underline text-xs"
        >
          <span>View</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
