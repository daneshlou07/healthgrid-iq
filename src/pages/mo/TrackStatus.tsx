import React, { useState, useMemo } from "react";
import { useData } from "../../context/DataContext";
import SeverityBadge from "../../components/ui/SeverityBadge";
import { Link } from "react-router-dom";
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
} from "lucide-react";
import type { Case, Report } from "../../types";
import { getCaseIndication } from "../../utils/caseDisplay";

export type CaseStage = "pending" | "scheduled" | "scanned" | "finalized" | "other";

export function getCaseStage(c: Case, report?: Report): CaseStage {
  // Stage 4: Report Finalized
  if (
    c.status === "FINALIZED" ||
    c.status === "COMPLETED" ||
    c.status === "REPORT_SUBMITTED" ||
    Boolean(c.finalizedAt) ||
    (report && (report.status === "final" || report.status === "Verified / Signed Off"))
  ) {
    return "finalized";
  }

  // Stage 3: Imaging Uploaded
  if (
    c.status === "SCANNED" ||
    c.status === "IMAGES_AVAILABLE" ||
    c.status === "EXTERNAL_IMAGES_AVAILABLE" ||
    c.status === "RADIOLOGIST_REVIEW" ||
    c.status === "MO_REVIEW" ||
    c.status === "REPORTED"
  ) {
    return "scanned";
  }

  // Stage 2: Scheduled
  if (
    c.status === "SCHEDULED" ||
    c.status === "SCHEDULING" ||
    c.status === "RADIOGRAPHER_ASSIGNED" ||
    c.status === "READY_FOR_SCAN" ||
    c.status === "SCANNING" ||
    c.status === "EXTERNAL_SCANNING" ||
    c.status === "MACHINE_UNAVAILABLE" ||
    c.status === "EXTERNAL_REFERRAL_PENDING" ||
    c.status === "BEMZ_REVIEW" ||
    c.status === "FACILITY_SELECTED" ||
    c.status === "EXTERNAL_RADIOGRAPHER_ASSIGNED" ||
    c.status === "PRIVATE_HOSPITAL_ADMIN_REVIEW"
  ) {
    return "scheduled";
  }

  // Stage 1: Pending Triage
  if (
    c.status === "CREATED" ||
    c.status === "CASE_CREATED" ||
    !c.status
  ) {
    return "pending";
  }

  return "other";
}

export function getStageTimestamp(c: Case, stage: CaseStage, report?: Report): string {
  if (stage === "finalized") {
    return (
      c.finalizedAt ||
      report?.signedAt ||
      report?.createdAt ||
      c.reportedAt ||
      c.createdAt
    );
  }
  if (stage === "scanned") {
    return c.scannedAt || c.createdAt;
  }
  if (stage === "scheduled") {
    return c.scheduledAt || c.createdAt;
  }
  return c.createdAt;
}

function getInitials(name: string): string {
  if (!name) return "PT";

  const parts = name.trim().split(" ");

  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarColor(name: string): string {
  const colors = [
    "bg-blue-50 text-blue-700 border-blue-200",
    "bg-emerald-50 text-emerald-700 border-emerald-200",
    "bg-indigo-50 text-indigo-700 border-indigo-200",
    "bg-teal-50 text-teal-700 border-teal-200",
    "bg-purple-50 text-purple-700 border-purple-200",
  ];

  let charSum = 0;

  for (let i = 0; i < name.length; i++) {
    charSum += name.charCodeAt(i);
  }

  return colors[charSum % colors.length];
}

function formatRelativeTime(isoString?: string): string {
  if (!isoString) return "Recently";
  const time = new Date(isoString).getTime();
  if (isNaN(time)) return "Recently";

  const diffMs = Date.now() - time;
  if (diffMs < 0) {
    const futureHours = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60));
    if (futureHours < 24) return `in ${futureHours}h`;
    const futureDays = Math.ceil(futureHours / 24);
    return `in ${futureDays}d`;
  }

  const elapsedMins = Math.floor(diffMs / (1000 * 60));
  if (elapsedMins < 1) return "Just now";
  if (elapsedMins < 60) return `${elapsedMins}m ago`;

  const elapsedHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (elapsedHours < 24) return `${elapsedHours}h ago`;

  const elapsedDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (elapsedDays === 1) return "1d ago";
  if (elapsedDays < 7) return `${elapsedDays}d ago`;

  try {
    const d = new Date(isoString);
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return `${elapsedDays}d ago`;
  }
}

export function getCardStatusInfo(
  caseData: Case,
  stage: CaseStage,
  report?: Report,
): {
  isOverdue: boolean;
  isCompleted: boolean;
  label: string;
} {
  if (stage === "finalized") {
    const finalDate =
      caseData.finalizedAt ||
      report?.signedAt ||
      report?.createdAt ||
      caseData.reportedAt ||
      caseData.createdAt;
    return {
      isOverdue: false,
      isCompleted: true,
      label: `Finalized ${formatRelativeTime(finalDate)}`,
    };
  }

  if (stage === "scanned") {
    const scanDate = caseData.scannedAt || caseData.createdAt;
    const elapsedMs = Date.now() - new Date(scanDate).getTime();
    const elapsedHours = Math.floor(elapsedMs / (1000 * 60 * 60));
    if (elapsedHours >= 12) {
      return {
        isOverdue: true,
        isCompleted: false,
        label: `Report Delayed (${elapsedHours}h)`,
      };
    }
    return {
      isOverdue: false,
      isCompleted: false,
      label: `Scanned ${formatRelativeTime(scanDate)}`,
    };
  }

  if (stage === "scheduled") {
    if (caseData.scheduledAt) {
      try {
        const d = new Date(caseData.scheduledAt);
        const formatted = d.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
        return {
          isOverdue: false,
          isCompleted: false,
          label: `Scheduled: ${formatted}`,
        };
      } catch {
        return {
          isOverdue: false,
          isCompleted: false,
          label: `Scheduled ${formatRelativeTime(caseData.scheduledAt)}`,
        };
      }
    }
    return {
      isOverdue: false,
      isCompleted: false,
      label: `Scheduled ${formatRelativeTime(caseData.createdAt)}`,
    };
  }

  // Pending triage
  const elapsedMs = Date.now() - new Date(caseData.createdAt).getTime();
  const elapsedHours = Math.floor(elapsedMs / (1000 * 60 * 60));

  if (elapsedHours >= 24) {
    return {
      isOverdue: true,
      isCompleted: false,
      label: `Overdue (${elapsedHours}h)`,
    };
  }

  return {
    isOverdue: false,
    isCompleted: false,
    label: `${elapsedHours}h ago`,
  };
}

export function isCaseSlaBreached(caseData: Case): boolean {
  if (
    caseData.status === "FINALIZED" ||
    caseData.status === "COMPLETED" ||
    caseData.status === "REPORT_SUBMITTED" ||
    Boolean(caseData.finalizedAt)
  ) {
    return false;
  }
  const now = Date.now();
  if (
    caseData.status === "CREATED" ||
    caseData.status === "CASE_CREATED" ||
    !caseData.status
  ) {
    const elapsedHours = Math.floor(
      (now - new Date(caseData.createdAt).getTime()) / (1000 * 60 * 60),
    );
    return elapsedHours >= 24;
  }
  if (
    caseData.status === "SCANNED" ||
    caseData.status === "IMAGES_AVAILABLE"
  ) {
    const scanTime = new Date(
      caseData.scannedAt || caseData.createdAt,
    ).getTime();
    const elapsedHours = Math.floor((now - scanTime) / (1000 * 60 * 60));
    return elapsedHours >= 12;
  }
  return false;
}

type SortOrder = "newest" | "oldest" | "severity" | "slaBreach";

type DateFilter = "all" | "today" | "7days" | "30days";

export default function TrackStatus() {
  const { cases, reports, getScopedCases } = useData();
  const scopedCases = getScopedCases ? getScopedCases() : cases;

  const [search, setSearch] = useState("");
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [selectedModality, setSelectedModality] = useState<string>("All");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");

  const reportMap = useMemo(() => {
    return new Map(reports.map((r) => [r.caseId, r]));
  }, [reports]);

  const { pending, scheduled, scanned, finalized, overdueCount } = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const nowMs = now.getTime();

    // 1. Filter cases
    const filtered = scopedCases.filter((c) => {
      const searchLower = search.toLowerCase().trim();
      const indication = getCaseIndication(c);

      const searchMatch =
        !searchLower ||
        c.caseNumber.toLowerCase().includes(searchLower) ||
        c.patientName.toLowerCase().includes(searchLower) ||
        indication.toLowerCase().includes(searchLower) ||
        c.id.toLowerCase().includes(searchLower);

      const modalityMatch =
        selectedModality === "All" ||
        c.scanType === selectedModality ||
        c.modality === selectedModality;

      const report = reportMap.get(c.id);
      const stage = getCaseStage(c, report);
      if (stage === "other" && (c.status === "CANCELLED" || c.status === "NO_SHOW")) {
        return false;
      }

      const isBreached = isCaseSlaBreached(c);
      const overdueMatch = !onlyOverdue || isBreached;

      let dateMatch = true;
      if (dateFilter !== "all") {
        const stageTs = getStageTimestamp(c, stage, report);
        const stageDate = new Date(stageTs);
        const createDate = new Date(c.createdAt);

        if (dateFilter === "today") {
          const sDateStr = !isNaN(stageDate.getTime())
            ? stageDate.toISOString().split("T")[0]
            : "";
          const cDateStr = !isNaN(createDate.getTime())
            ? createDate.toISOString().split("T")[0]
            : "";
          dateMatch = sDateStr === todayStr || cDateStr === todayStr;
        } else {
          const maxDiffMs =
            dateFilter === "7days"
              ? 7 * 24 * 60 * 60 * 1000
              : 30 * 24 * 60 * 60 * 1000;
          const sDiff = !isNaN(stageDate.getTime())
            ? nowMs - stageDate.getTime()
            : Infinity;
          const cDiff = !isNaN(createDate.getTime())
            ? nowMs - createDate.getTime()
            : Infinity;
          dateMatch =
            (sDiff >= 0 && sDiff <= maxDiffMs) ||
            (cDiff >= 0 && cDiff <= maxDiffMs);
        }
      }

      return searchMatch && modalityMatch && overdueMatch && dateMatch;
    });

    // 2. Separate into 4 stages
    const pendingCases: Case[] = [];
    const scheduledCases: Case[] = [];
    const scannedCases: Case[] = [];
    const finalizedCases: Case[] = [];

    for (const c of filtered) {
      const report = reportMap.get(c.id);
      const stage = getCaseStage(c, report);
      if (stage === "pending") pendingCases.push(c);
      else if (stage === "scheduled") scheduledCases.push(c);
      else if (stage === "scanned") scannedCases.push(c);
      else if (stage === "finalized") finalizedCases.push(c);
    }

    // 3. Stage-aware sorting
    const sortList = (items: Case[], stage: CaseStage) => {
      return [...items].sort((a, b) => {
        const reportA = reportMap.get(a.id);
        const reportB = reportMap.get(b.id);
        const tsA =
          new Date(getStageTimestamp(a, stage, reportA)).getTime() || 0;
        const tsB =
          new Date(getStageTimestamp(b, stage, reportB)).getTime() || 0;

        if (sortOrder === "newest") {
          return tsB - tsA;
        }

        if (sortOrder === "oldest") {
          return tsA - tsB;
        }

        if (sortOrder === "severity") {
          const severityRank: Record<string, number> = {
            Critical: 4,
            Severe: 3,
            Moderate: 2,
            Mild: 1,
          };

          const rankA = severityRank[a.severity || "Moderate"] || 2;
          const rankB = severityRank[b.severity || "Moderate"] || 2;

          if (rankB !== rankA) return rankB - rankA;
          return tsB - tsA;
        }

        if (sortOrder === "slaBreach") {
          const slaA = isCaseSlaBreached(a) ? 1 : 0;
          const slaB = isCaseSlaBreached(b) ? 1 : 0;

          if (slaB !== slaA) return slaB - slaA;
          return tsB - tsA;
        }

        return 0;
      });
    };

    const countOverdue = scopedCases.filter((c) => isCaseSlaBreached(c)).length;

    return {
      pending: sortList(pendingCases, "pending"),
      scheduled: sortList(scheduledCases, "scheduled"),
      scanned: sortList(scannedCases, "scanned"),
      finalized: sortList(finalizedCases, "finalized"),
      overdueCount: countOverdue,
    };
  }, [scopedCases, reports, reportMap, search, selectedModality, onlyOverdue, dateFilter, sortOrder]);

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
        </div>

        {overdueCount > 0 && (
          <div className="inline-flex items-center gap-3 self-start lg:self-auto px-3 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-600" />

            <div>
              <p className="text-xs font-bold">{overdueCount} SLA Breached</p>

              <p className="text-[12px] text-red-500">Requires attention</p>
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
              onChange={(e) => setSearch(e.target.value)}
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
                onClick={() => setSearch("")}
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
              onClick={() => setOnlyOverdue(!onlyOverdue)}
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
                ${
                  onlyOverdue
                    ? "bg-red-50 text-red-700 border border-red-200"
                    : "bg-surface-50 text-surface-700 border border-surface-300 hover:bg-surface-100"
                }
              `}
            >
              <AlertTriangle className="w-3.5 h-3.5" />

              <span>SLA Breached</span>
            </button>

            {/* Sort */}

            <div className="relative inline-flex items-center">
              <ArrowUpDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500 pointer-events-none" />

              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as SortOrder)}
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
                <option value="newest">Sort: Newest</option>

                <option value="oldest">Sort: Oldest</option>

                <option value="severity">Sort: Severity</option>

                <option value="slaBreach">Sort: SLA</option>
              </select>
            </div>

            {/* Date */}

            <div className="relative inline-flex items-center">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500 pointer-events-none" />

              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as DateFilter)}
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
                <option value="all">All Time</option>

                <option value="today">Today</option>

                <option value="7days">Past 7 Days</option>

                <option value="30days">Past 30 Days</option>
              </select>
            </div>

            {/* Modality */}

            <select
              value={selectedModality}
              onChange={(e) => setSelectedModality(e.target.value)}
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
              <option value="All">All Modalities</option>

              <option value="Chest X-Ray">Chest X-Ray</option>

              <option value="Brain MRI">Brain MRI</option>

              <option value="Abdominal CT">Abdominal CT</option>

              <option value="Knee Ultrasound">Knee Ultrasound</option>

              <option value="Lumbar Spine X-Ray">Lumbar Spine X-Ray</option>
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
          icon={<Circle className="w-3.5 h-3.5" />}
        >
          {pending.map((c) => (
            <KanbanCard
              key={c.id}
              caseData={c}
              stage="pending"
              report={reportMap.get(c.id)}
            />
          ))}
        </KanbanColumn>

        <KanbanColumn
          title="Scheduled"
          count={scheduled.length}
          color="slate"
          icon={<CheckCircle2 className="w-3.5 h-3.5" />}
        >
          {scheduled.map((c) => (
            <KanbanCard
              key={c.id}
              caseData={c}
              stage="scheduled"
              report={reportMap.get(c.id)}
            />
          ))}
        </KanbanColumn>

        <KanbanColumn
          title="Imaging Uploaded"
          count={scanned.length}
          color="blue"
          icon={<Circle className="w-3.5 h-3.5" />}
        >
          {scanned.map((c) => (
            <KanbanCard
              key={c.id}
              caseData={c}
              stage="scanned"
              report={reportMap.get(c.id)}
            />
          ))}
        </KanbanColumn>

        <KanbanColumn
          title="Report Finalized"
          count={finalized.length}
          color="emerald"
          icon={<FileCheck2 className="w-3.5 h-3.5" />}
        >
          {finalized.map((c) => (
            <KanbanCard
              key={c.id}
              caseData={c}
              stage="finalized"
              report={reportMap.get(c.id)}
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
      label: "Pending Triage",
      count: pending,
      color: "amber",
    },
    {
      label: "Scheduled",
      count: scheduled,
      color: "slate",
    },
    {
      label: "Imaging Uploaded",
      count: scanned,
      color: "blue",
    },
    {
      label: "Report Finalized",
      count: finalized,
      color: "emerald",
    },
  ];

  return (
    <div className="bg-white border border-surface-200 rounded-xl px-5 py-4 shadow-sm">
      <div className="flex items-center justify-between gap-3 overflow-x-auto">
        {stages.map((stage, index) => (
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
                    ${
                      stage.color === "amber"
                        ? "bg-amber-50 text-amber-700"
                        : stage.color === "blue"
                          ? "bg-blue-50 text-blue-700"
                          : stage.color === "emerald"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-surface-100 text-surface-600"
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
        ))}
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
  color: "slate" | "emerald" | "blue" | "amber";
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const colors = {
    slate: {
      title: "text-slate-700",
      icon: "bg-slate-100 text-slate-600",
      count: "bg-slate-100 text-slate-700",
    },

    emerald: {
      title: "text-emerald-700",
      icon: "bg-emerald-50 text-emerald-700",
      count: "bg-emerald-50 text-emerald-700",
    },

    blue: {
      title: "text-blue-700",
      icon: "bg-blue-50 text-blue-700",
      count: "bg-blue-50 text-blue-700",
    },

    amber: {
      title: "text-amber-700",
      icon: "bg-amber-50 text-amber-700",
      count: "bg-amber-50 text-amber-700",
    },
  };

  const theme = colors[color];

  return (
    <div className="min-w-0">
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
  stage,
  report,
}: {
  caseData: Case;
  stage: CaseStage;
  report?: Report;
}) {
  const indication = getCaseIndication(caseData);
  const statusInfo = getCardStatusInfo(caseData, stage, report);
  const avatarStyle = getAvatarColor(caseData.patientName);
  const initials = getInitials(caseData.patientName);

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
        ${
          statusInfo.isOverdue
            ? "border-red-200 bg-red-50/20 hover:border-red-300"
            : statusInfo.isCompleted
              ? "border-surface-200 hover:border-emerald-300"
              : "border-surface-200 hover:border-navy-300"
        }
        hover:shadow-sm
      `}
    >
      {/* Case number + severity */}

      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-[11px] font-bold text-navy-700 tracking-wide">
          {caseData.caseNumber}
        </span>

        <SeverityBadge severity={caseData.severity} />
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

          <p className="text-[10px] text-surface-400">Patient</p>
        </div>
      </div>

      {/* Modality */}

      <div className="mb-3">
        <p
          className="text-[11px] text-surface-500 font-medium truncate"
          title={indication}
        >
          {caseData.scanType}
          {" · "}
          {indication || "Unspecified"}
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
          ${
            statusInfo.isOverdue
              ? "border-red-100"
              : statusInfo.isCompleted
                ? "border-emerald-100/70"
                : "border-surface-100"
          }
        `}
      >
        <span
          className={`
            flex
            items-center
            gap-1.5
            text-[11px]
            ${
              statusInfo.isOverdue
                ? "text-red-700 font-bold"
                : statusInfo.isCompleted
                  ? "text-emerald-700 font-medium"
                  : "text-surface-500 font-medium"
            }
          `}
        >
          {statusInfo.isCompleted ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          ) : statusInfo.isOverdue ? (
            <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
          ) : stage === "scanned" ? (
            <ScanLine className="w-3.5 h-3.5 text-surface-400 shrink-0" />
          ) : stage === "scheduled" ? (
            <Calendar className="w-3.5 h-3.5 text-surface-400 shrink-0" />
          ) : (
            <Clock className="w-3.5 h-3.5 text-surface-400 shrink-0" />
          )}

          <span className="truncate max-w-[170px]" title={statusInfo.label}>
            {statusInfo.label}
          </span>
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
            shrink-0
          "
        >
          View
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}
