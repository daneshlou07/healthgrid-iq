import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import SeverityBadge from '../../components/ui/SeverityBadge';
import { Link } from 'react-router-dom';
import {
  Search,
  AlertTriangle,
  Clock,
  ArrowRight,
  X,
  ArrowUpDown,
  Calendar,
  CheckCircle2,
  Circle,
  ScanLine,
  FileCheck2,
} from 'lucide-react';
import { getCaseIndication } from '../../utils/caseDisplay';

function getInitials(name: string): string {
  if (!name) return 'PT';

  const parts = name.trim().split(' ');

  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }

  return (
    parts[0][0] +
    parts[parts.length - 1][0]
  ).toUpperCase();
}

function getAvatarColor(name: string): string {
  const colors = [
    'bg-blue-50 text-blue-700 border-blue-200',
    'bg-emerald-50 text-emerald-700 border-emerald-200',
    'bg-indigo-50 text-indigo-700 border-indigo-200',
    'bg-teal-50 text-teal-700 border-teal-200',
    'bg-purple-50 text-purple-700 border-purple-200',
  ];

  let charSum = 0;

  for (let i = 0; i < name.length; i++) {
    charSum += name.charCodeAt(i);
  }

  return colors[charSum % colors.length];
}

function getSlaInfo(
  createdAt: string,
  status: string
): {
  isOverdue: boolean;
  label: string;
} {
  const elapsedMs =
    new Date().getTime() -
    new Date(createdAt).getTime();

  const elapsedHours = Math.floor(
    elapsedMs / (1000 * 60 * 60)
  );

  if (
    status === 'CREATED' &&
    elapsedHours >= 24
  ) {
    return {
      isOverdue: true,
      label: `Overdue (${elapsedHours}h)`,
    };
  }

  if (
    status === 'SCANNED' &&
    elapsedHours >= 12
  ) {
    return {
      isOverdue: true,
      label: `Report Delayed (${elapsedHours}h)`,
    };
  }

  return {
    isOverdue: false,
    label: `${elapsedHours}h ago`,
  };
}

type SortOrder =
  | 'newest'
  | 'oldest'
  | 'severity'
  | 'slaBreach';

type DateFilter =
  | 'all'
  | 'today'
  | '7days'
  | '30days';

export default function TrackStatus() {
  const { cases } = useData();

  const [search, setSearch] =
    useState('');

  const [onlyOverdue, setOnlyOverdue] =
    useState(false);

  const [selectedModality, setSelectedModality] =
    useState<string>('All');

  const [sortOrder, setSortOrder] =
    useState<SortOrder>('newest');

  const [dateFilter, setDateFilter] =
    useState<DateFilter>('all');

  const filteredCases = useMemo(() => {
    const now = new Date();

    const todayStr =
      now.toISOString().split('T')[0];

    return cases
      .filter((c) => {
        const searchLower =
          search.toLowerCase().trim();

        const searchMatch =
          !searchLower ||
          c.caseNumber
            .toLowerCase()
            .includes(searchLower) ||
          c.patientName
            .toLowerCase()
            .includes(searchLower) ||
          getCaseIndication(c)
            .toLowerCase()
            .includes(searchLower);

        const modalityMatch =
          selectedModality === 'All' ||
          c.scanType === selectedModality ||
          c.modality === selectedModality;

        const slaInfo = getSlaInfo(
          c.createdAt,
          c.status
        );

        const overdueMatch =
          !onlyOverdue ||
          slaInfo.isOverdue;

        let dateMatch = true;

        if (dateFilter === 'today') {
          const caseDateStr =
            new Date(c.createdAt)
              .toISOString()
              .split('T')[0];

          dateMatch =
            caseDateStr === todayStr;
        }

        if (dateFilter === '7days') {
          const diffMs =
            now.getTime() -
            new Date(c.createdAt).getTime();

          dateMatch =
            diffMs <=
            7 * 24 * 60 * 60 * 1000;
        }

        if (dateFilter === '30days') {
          const diffMs =
            now.getTime() -
            new Date(c.createdAt).getTime();

          dateMatch =
            diffMs <=
            30 * 24 * 60 * 60 * 1000;
        }

        return (
          searchMatch &&
          modalityMatch &&
          overdueMatch &&
          dateMatch
        );
      })
      .sort((a, b) => {
        if (sortOrder === 'newest') {
          return (
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime()
          );
        }

        if (sortOrder === 'oldest') {
          return (
            new Date(a.createdAt).getTime() -
            new Date(b.createdAt).getTime()
          );
        }

        if (sortOrder === 'severity') {
          const severityRank: Record<
            string,
            number
          > = {
            Critical: 4,
            Severe: 3,
            Moderate: 2,
            Mild: 1,
          };

          const rankA =
            severityRank[
            a.severity || 'Moderate'
            ] || 2;

          const rankB =
            severityRank[
            b.severity || 'Moderate'
            ] || 2;

          return rankB - rankA;
        }

        if (sortOrder === 'slaBreach') {
          const slaA = getSlaInfo(
            a.createdAt,
            a.status
          ).isOverdue
            ? 1
            : 0;

          const slaB = getSlaInfo(
            b.createdAt,
            b.status
          ).isOverdue
            ? 1
            : 0;

          return slaB - slaA;
        }

        return 0;
      });
  }, [
    cases,
    search,
    selectedModality,
    onlyOverdue,
    dateFilter,
    sortOrder,
  ]);

  const pending = filteredCases.filter(
    (c) => c.status === 'CREATED'
  );

  const scheduled = filteredCases.filter(
    (c) => c.status === 'SCHEDULED'
  );

  const scanned = filteredCases.filter(
    (c) => c.status === 'SCANNED'
  );

  const finalized = filteredCases.filter(
    (c) => c.status === 'FINALIZED'
  );

  const overdueCount = cases.filter(
    (c) =>
      getSlaInfo(
        c.createdAt,
        c.status
      ).isOverdue
  ).length;

  return (
    <div className="space-y-2">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 pb-4 border-b border-surface-200">

        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-surface-500 mb-1">
            Radiology Workflow
          </p>

          <h1 className="text-2xl font-bold text-navy-900 tracking-tight">
            MO Case Tracker
          </h1>

          <p className="text-xs text-surface-500 mt-1">
            Track referral cases through scanning
            and reporting stages.
          </p>
        </div>

        {overdueCount > 0 && (
          <div className="inline-flex items-center gap-3 self-start lg:self-auto px-3 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg">

            <AlertTriangle className="w-5 h-5 text-red-600" />

            <div>
              <p className="text-xs font-bold">
                {overdueCount} SLA Breached
              </p>

              <p className="text-[12px] text-red-500">
                Requires attention
              </p>
            </div>

          </div>
        )}

      </div>

      {/* =====================================================
          FILTER BAR
      ====================================================== */}

      <div className="bg-white p-3 rounded-xl border border-surface-200 shadow-sm">

        <div className="flex flex-col xl:flex-row xl:items-center gap-3">

          {/* Search */}

          <div className="relative flex-1">

            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />

            <input
              type="text"
              placeholder="Search cases, patients, or symptoms..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              className="
                w-full
                bg-surface-50
                border border-surface-300
                rounded-lg
                pl-9
                pr-8
                py-2
                text-xs
                text-surface-800
                placeholder-surface-400
                focus:outline-none
                focus:ring-2
                focus:ring-navy-100
                focus:border-navy-400
              "
            />

            {search && (
              <button
                type="button"
                onClick={() =>
                  setSearch('')
                }
                className="
                  absolute
                  right-2.5
                  top-1/2
                  -translate-y-1/2
                  text-surface-400
                  hover:text-surface-600
                "
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

          </div>

          {/* Filters */}

          <div className="flex items-center gap-2 flex-wrap">

            {/* SLA */}

            <button
              type="button"
              onClick={() =>
                setOnlyOverdue(
                  !onlyOverdue
                )
              }
              className={`
                inline-flex
                items-center
                gap-1.5
                px-3
                py-2
                rounded-lg
                text-xs
                font-semibold
                transition-all
                ${onlyOverdue
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-surface-50 text-surface-700 border border-surface-300 hover:bg-surface-100'
                }
              `}
            >
              <AlertTriangle className="w-3.5 h-3.5" />

              <span>
                SLA Breached
              </span>
            </button>

            {/* Sort */}

            <div className="relative inline-flex items-center">

              <ArrowUpDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500 pointer-events-none" />

              <select
                value={sortOrder}
                onChange={(e) =>
                  setSortOrder(
                    e.target.value as SortOrder
                  )
                }
                className="
                  appearance-none
                  bg-surface-50
                  border border-surface-300
                  text-surface-700
                  font-medium
                  rounded-lg
                  pl-8
                  pr-8
                  py-2
                  text-xs
                  focus:outline-none
                  focus:ring-2
                  focus:ring-navy-100
                  cursor-pointer
                "
              >
                <option value="newest">
                  Sort: Newest
                </option>

                <option value="oldest">
                  Sort: Oldest
                </option>

                <option value="severity">
                  Sort: Severity
                </option>

                <option value="slaBreach">
                  Sort: SLA
                </option>
              </select>

            </div>

            {/* Date */}

            <div className="relative inline-flex items-center">

              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500 pointer-events-none" />

              <select
                value={dateFilter}
                onChange={(e) =>
                  setDateFilter(
                    e.target.value as DateFilter
                  )
                }
                className="
                  appearance-none
                  bg-surface-50
                  border border-surface-300
                  text-surface-700
                  font-medium
                  rounded-lg
                  pl-8
                  pr-8
                  py-2
                  text-xs
                  focus:outline-none
                  focus:ring-2
                  focus:ring-navy-100
                  cursor-pointer
                "
              >
                <option value="all">
                  All Time
                </option>

                <option value="today">
                  Today
                </option>

                <option value="7days">
                  Past 7 Days
                </option>

                <option value="30days">
                  Past 30 Days
                </option>
              </select>

            </div>

            {/* Modality */}

            <select
              value={selectedModality}
              onChange={(e) =>
                setSelectedModality(
                  e.target.value
                )
              }
              className="
                bg-surface-50
                border border-surface-300
                rounded-lg
                px-3
                py-2
                text-xs
                font-medium
                text-surface-700
                focus:outline-none
                focus:ring-2
                focus:ring-navy-100
              "
            >
              <option value="All">
                All Modalities
              </option>

              <option value="Chest X-Ray">
                Chest X-Ray
              </option>

              <option value="Brain MRI">
                Brain MRI
              </option>

              <option value="Abdominal CT">
                Abdominal CT
              </option>

              <option value="Knee Ultrasound">
                Knee Ultrasound
              </option>

              <option value="Lumbar Spine X-Ray">
                Lumbar Spine X-Ray
              </option>
            </select>

          </div>
        </div>
      </div>

      {/* =====================================================
          WORKFLOW PROGRESS
      ====================================================== */}

      <WorkflowProgress
        pending={pending.length}
        scheduled={scheduled.length}
        scanned={scanned.length}
        finalized={finalized.length}
      />

      {/* =====================================================
          KANBAN BOARD
      ====================================================== */}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 items-start">

        <KanbanColumn
          title="Pending Triage"
          count={pending.length}
          color="amber"
          icon={
            <Circle className="w-3.5 h-3.5" />
          }
        >
          {pending.map((c) => (
            <KanbanCard
              key={c.id}
              caseData={c}
            />
          ))}
        </KanbanColumn>

        <KanbanColumn
          title="Scheduled"
          count={scheduled.length}
          color="slate"
          icon={
            <CheckCircle2 className="w-3.5 h-3.5" />
          }
        >
          {scheduled.map((c) => (
            <KanbanCard
              key={c.id}
              caseData={c}
            />
          ))}
        </KanbanColumn>

        <KanbanColumn
          title="Imaging Uploaded"
          count={scanned.length}
          color="blue"
          icon={
            <ScanLine className="w-3.5 h-3.5" />
          }
        >
          {scanned.map((c) => (
            <KanbanCard
              key={c.id}
              caseData={c}
            />
          ))}
        </KanbanColumn>

        <KanbanColumn
          title="Report Finalized"
          count={finalized.length}
          color="emerald"
          icon={
            <FileCheck2 className="w-3.5 h-3.5" />
          }
        >
          {finalized.map((c) => (
            <KanbanCard
              key={c.id}
              caseData={c}
            />
          ))}
        </KanbanColumn>

      </div>
    </div>
  );
}

/* =========================================================
   WORKFLOW PROGRESS
========================================================= */

function WorkflowProgress({
  pending,
  scheduled,
  scanned,
  finalized,
}: {
  pending: number;
  scheduled: number;
  scanned: number;
  finalized: number;
}) {
  const stages = [
    {
      label: 'Pending Triage',
      count: pending,
      color: 'amber',
    },
    {
      label: 'Scheduled',
      count: scheduled,
      color: 'slate',
    },
    {
      label: 'Imaging Uploaded',
      count: scanned,
      color: 'blue',
    },
    {
      label: 'Report Finalized',
      count: finalized,
      color: 'emerald',
    },
  ];

  return (
    <div className="bg-white border border-surface-200 rounded-xl px-5 py-4 shadow-sm">

      <div className="flex items-center justify-between gap-3 overflow-x-auto">

        {stages.map(
          (stage, index) => (
            <React.Fragment key={stage.label}>

              <div className="flex items-center gap-2.5 min-w-max">

                <div
                  className={`
                    w-7
                    h-7
                    rounded-full
                    flex
                    items-center
                    justify-center
                    text-[11px]
                    font-bold
                    ${stage.color === 'amber'
                      ? 'bg-amber-50 text-amber-700'
                      : stage.color === 'blue'
                        ? 'bg-blue-50 text-blue-700'
                        : stage.color === 'emerald'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-surface-100 text-surface-600'
                    }
                  `}
                >
                  {index + 1}
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-wide font-bold text-surface-400">
                    Stage {index + 1}
                  </p>

                  <p className="text-xs font-semibold text-navy-900">
                    {stage.label}
                  </p>
                </div>

                <span
                  className="
                    ml-1
                    min-w-[24px]
                    h-5
                    px-1.5
                    rounded-full
                    bg-surface-100
                    text-surface-700
                    text-[10px]
                    font-bold
                    flex
                    items-center
                    justify-center
                  "
                >
                  {stage.count}
                </span>

              </div>

              {index < stages.length - 1 && (
                <ArrowRight className="w-4 h-4 text-surface-300 shrink-0" />
              )}

            </React.Fragment>
          )
        )}

      </div>
    </div>
  );
}

/* =========================================================
   KANBAN COLUMN
========================================================= */

function KanbanColumn({
  title,
  count,
  color,
  icon,
  children,
}: {
  title: string;
  count: number;
  color:
  | 'slate'
  | 'emerald'
  | 'blue'
  | 'amber';
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const colors = {
    slate: {
      title: 'text-slate-700',
      icon: 'bg-slate-100 text-slate-600',
      count:
        'bg-slate-100 text-slate-700',
    },

    emerald: {
      title: 'text-emerald-700',
      icon:
        'bg-emerald-50 text-emerald-700',
      count:
        'bg-emerald-50 text-emerald-700',
    },

    blue: {
      title: 'text-blue-700',
      icon: 'bg-blue-50 text-blue-700',
      count:
        'bg-blue-50 text-blue-700',
    },

    amber: {
      title: 'text-amber-700',
      icon: 'bg-amber-50 text-amber-700',
      count:
        'bg-amber-50 text-amber-700',
    },
  };

  const theme = colors[color];

  return (
    <div className="min-w-0">
      {/* Column Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${theme.icon}`}>
            {icon}
          </div>
          <h3 className={`text-xs font-bold uppercase tracking-wider ${theme.title}`}>
            {title}
          </h3>
        </div>
        <span
          className={`min-w-[28px] h-6 px-2 rounded-full flex items-center justify-center text-[11px] font-bold ${theme.count}`}
        >
          {count}
        </span>
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {children}

        {count === 0 && (
          <div className="border border-dashed border-surface-200 rounded-xl bg-surface-50/50 py-10 text-center">
            <p className="text-xs font-medium text-surface-400">
              No cases in this stage
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   CASE CARD
========================================================= */

function KanbanCard({
  caseData,
}: {
  caseData: any;
}) {
  const indication =
    getCaseIndication(caseData);

  const sla = getSlaInfo(
    caseData.createdAt,
    caseData.status
  );

  const avatarStyle =
    getAvatarColor(
      caseData.patientName
    );

  const initials =
    getInitials(
      caseData.patientName
    );

  return (
    <div
      className={`
        group
        bg-white
        rounded-xl
        border
        p-4
        transition-all
        duration-150
        ${sla.isOverdue
          ? 'border-red-200 bg-red-50/20 hover:border-red-300'
          : 'border-surface-200 hover:border-navy-300'
        }
        hover:shadow-sm
      `}
    >

      {/* Case number + severity */}

      <div className="flex items-center justify-between gap-2 mb-3">

        <span className="text-[11px] font-bold text-navy-700 tracking-wide">
          {caseData.caseNumber}
        </span>

        <SeverityBadge
          severity={caseData.severity}
        />

      </div>

      {/* Patient */}

      <div className="flex items-center gap-2.5 mb-2">

        <div
          className={`
            w-8
            h-8
            rounded-full
            border
            flex
            items-center
            justify-center
            font-bold
            text-[10px]
            shrink-0
            ${avatarStyle}
          `}
        >
          {initials}
        </div>

        <div className="min-w-0">

          <p className="text-sm font-bold text-navy-900 truncate">
            {caseData.patientName}
          </p>

          <p className="text-[10px] text-surface-400">
            Patient
          </p>

        </div>

      </div>

      {/* Modality */}

      <div className="mb-3">

        <p
          className="text-[11px] text-surface-500 font-medium truncate"
          title={indication}
        >
          {caseData.scanType}
          {' · '}
          {indication ||
            'Unspecified'}
        </p>

      </div>

      {/* SLA + Action */}

      <div
        className={`
          flex
          items-center
          justify-between
          pt-3
          border-t
          ${sla.isOverdue
            ? 'border-red-100'
            : 'border-surface-100'
          }
        `}
      >

        <span
          className={`
            flex
            items-center
            gap-1.5
            text-[11px]
            ${sla.isOverdue
              ? 'text-red-700 font-bold'
              : 'text-surface-500 font-medium'
            }
          `}
        >
          <Clock className="w-3.5 h-3.5" />

          {sla.label}
        </span>

        <Link
          to={`/case/${caseData.id}`}
          className="
            inline-flex
            items-center
            gap-1
            text-xs
            font-bold
            text-navy-700
            hover:text-navy-900
            transition-colors
          "
        >
          View

          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>

      </div>

    </div>
  );
}