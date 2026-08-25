import React from 'react';
import type { Case, RadioScheduleProfile, RadioScheduleSlot, SeverityLevel } from '../../types';
import { User, CheckCircle, AlertTriangle, Sparkles, Building2, ChevronDown, ChevronUp, Clock, MapPin } from 'lucide-react';
import SeverityBadge from '../ui/SeverityBadge';

interface Props {
  profiles: RadioScheduleProfile[];
  allProfiles?: RadioScheduleProfile[];
  requiredModality: string;
  selectedId: string | null;
  recommendedId: string | null;
  onSelect: (userId: string) => void;
  existingCases?: Case[];
  targetClinicId?: string | null;
  targetClinicName?: string | null;
  caseSeverity?: SeverityLevel;
  onReassignCase?: (caseId: string, newRadiographerId: string) => void | Promise<void>;
}

/**
 * Convert a schedule time such as:
 *   08:00
 *   8:00
 *   08:00 AM
 *   8:00 PM
 * into minutes after midnight.
 */
export function timeToMinutes(time: string): number | null {
  const value = time.trim().toUpperCase();
  const match = value.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2] ?? '0');
  const meridiem = match[3];

  if (minutes < 0 || minutes > 59) return null;

  if (meridiem) {
    if (hours < 1 || hours > 12) return null;
    if (meridiem === 'AM') hours = hours === 12 ? 0 : hours;
    if (meridiem === 'PM') hours = hours === 12 ? 12 : hours + 12;
  } else if (hours < 0 || hours > 23) {
    return null;
  }

  return hours * 60 + minutes;
}

/**
 * Parse a YYYY-MM-DD + schedule time as a local Date.
 * We intentionally avoid Date.parse on strings containing AM/PM because
 * browser parsing is inconsistent for those formats.
 */
export function slotToLocalDateTime(
  date: string,
  startTime: string
): Date | null {
  const match = date.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const minutes = timeToMinutes(startTime);
  if (!match || minutes === null) return null;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  const result = new Date(year, month, day, hours, mins, 0, 0);

  // Reject invalid calendar dates such as 2026-02-31.
  if (
    result.getFullYear() !== year ||
    result.getMonth() !== month ||
    result.getDate() !== day ||
    result.getHours() !== hours ||
    result.getMinutes() !== mins
  ) {
    return null;
  }

  return result;
}

/**
 * Return a stable local datetime value for <input type="datetime-local">
 * and for storing appointmentTime in the scheduler UI state.
 */
export function slotToDateTimeValue(
  date: string,
  startTime: string
): string | null {
  const parsed = slotToLocalDateTime(date, startTime);
  if (!parsed) return null;

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  const hours = String(parsed.getHours()).padStart(2, '0');
  const minutes = String(parsed.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function extractModality(scanType: string): string {
  const upper = scanType.toUpperCase();
  if (upper.includes('MRI')) return 'MRI';
  if (upper.includes('CT')) return 'CT';
  if (upper.includes('X-RAY') || upper.includes('XRAY')) return 'X-Ray';
  if (upper.includes('ULTRASOUND') || upper.includes('ECHO')) return 'Ultrasound';
  return 'X-Ray';
}

export function isSlotOccupied(
  slotDate: string,
  slotStartTime: string,
  radiographerId: string,
  existingCases?: Case[],
  transientAssignedSlots?: Set<string>,
  ignoreCaseId?: string
): Case | null {
  const slotMinutes = timeToMinutes(slotStartTime);
  if (slotMinutes === null) return null;

  const slotKey = `${radiographerId}_${slotDate}_${slotMinutes}`;
  if (transientAssignedSlots?.has(slotKey)) {
    return { id: 'bulk-assigned', caseNumber: 'Bulk Queue' } as Case;
  }

  if (!existingCases || existingCases.length === 0) return null;

  const matchingCase = existingCases.find((c) => {
    if (c.id === ignoreCaseId) return false;
    if (c.radiographerId !== radiographerId) return false;
    if (
      !c.scheduledAt ||
      (c.status !== 'SCHEDULED' &&
        c.status !== 'CREATED' &&
        c.status !== 'SCANNED')
    ) {
      return false;
    }

    const caseDateObj = new Date(c.scheduledAt);
    if (Number.isNaN(caseDateObj.getTime())) return false;

    const caseDay = `${caseDateObj.getFullYear()}-${String(
      caseDateObj.getMonth() + 1
    ).padStart(2, '0')}-${String(caseDateObj.getDate()).padStart(2, '0')}`;

    if (caseDay !== slotDate) return false;

    const caseMinutes =
      caseDateObj.getHours() * 60 + caseDateObj.getMinutes();

    return caseMinutes === slotMinutes;
  });

  return matchingCase || null;
}

export function getEarliestSlot(
  schedule: RadioScheduleSlot[],
  radiographerId?: string,
  existingCases?: Case[],
  transientAssignedSlots?: Set<string>,
  ignoreCaseId?: string
): RadioScheduleSlot | null {
  const now = new Date();

  const validSlots = schedule
    .filter((slot) => !slot.booked)
    .map((slot) => ({
      slot,
      dateTime: slotToLocalDateTime(slot.date, slot.startTime),
    }))
    .filter(
      (item): item is {
        slot: RadioScheduleSlot;
        dateTime: Date;
      } => item.dateTime !== null
    )
    .filter((item) => item.dateTime >= now)
    .filter(
      (item) =>
        !radiographerId ||
        !isSlotOccupied(
          item.slot.date,
          item.slot.startTime,
          radiographerId,
          existingCases,
          transientAssignedSlots,
          ignoreCaseId
        )
    )
    .sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());

  return validSlots[0]?.slot || null;
}

export function getAvailableSlots(
  schedule: RadioScheduleSlot[],
  count: number = 8,
  radiographerId?: string,
  existingCases?: Case[],
  ignoreCaseId?: string
): { slot: RadioScheduleSlot; isOccupied: boolean; occupiedByCase?: Case }[] {
  const now = new Date();

  return schedule
    .map((slot) => ({
      slot,
      dateTime: slotToLocalDateTime(slot.date, slot.startTime),
    }))
    .filter(
      (item): item is {
        slot: RadioScheduleSlot;
        dateTime: Date;
      } => item.dateTime !== null
    )
    // Critical: do not show today's slots that have already passed.
    .filter((item) => item.dateTime >= now)
    .sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime())
    .slice(0, count)
    .map(({ slot }) => {
      const occupiedBy =
        radiographerId && existingCases
          ? isSlotOccupied(
            slot.date,
            slot.startTime,
            radiographerId,
            existingCases,
            undefined,
            ignoreCaseId
          )
          : null;

      return {
        slot,
        isOccupied: slot.booked || Boolean(occupiedBy),
        occupiedByCase: occupiedBy || undefined,
      };
    });
}

export function isRadiographerAtClinic(
  profile: RadioScheduleProfile,
  targetClinicId?: string | null,
  targetClinicName?: string | null
): boolean {
  if (!targetClinicId && !targetClinicName) return true;

  // 1. Direct ID match
  if (targetClinicId && profile.deployedClinicId) {
    if (profile.deployedClinicId === targetClinicId) return true;
    const pClean = profile.deployedClinicId.toLowerCase().replace(/[^a-z0-9]/g, '');
    const tClean = targetClinicId.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (pClean && tClean && (pClean === tClean || pClean.includes(tClean) || tClean.includes(pClean))) {
      return true;
    }
  }

  // 2. Clean Name match
  if (targetClinicName && profile.deployedClinicName) {
    const pName = profile.deployedClinicName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const tName = targetClinicName.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (pName && tName && (pName === tName || pName.includes(tName) || tName.includes(pName))) {
      return true;
    }
  }

  // 3. Fallback name check if targetClinicId contains recognizable name tokens (e.g. 'bestari', 'cherakah', etc.)
  if (targetClinicId && profile.deployedClinicName) {
    const pName = profile.deployedClinicName.toLowerCase();
    const tId = targetClinicId.toLowerCase();
    if (pName.includes(tId) || tId.includes(pName)) return true;
  }

  return false;
}

export function scoreRadiographer(
  profile: RadioScheduleProfile,
  requiredModality: string,
  existingCases?: Case[],
  targetClinicId?: string | null,
  targetClinicName?: string | null,
  caseSeverity?: SeverityLevel
): number {
  if (profile.leaveStatus === 'On Leave') return Infinity;

  const supports = profile.supportedModalities.includes(requiredModality);
  const earliest = getEarliestSlot(
    profile.schedule,
    profile.userId,
    existingCases
  );

  // No future slot means this radiographer should not win the recommendation.
  if (!earliest) return Infinity;

  const earliestDate = slotToLocalDateTime(
    earliest.date,
    earliest.startTime
  );

  if (!earliestDate) return Infinity;

  const now = new Date();
  const daysAway = Math.max(
    0,
    (earliestDate.getTime() - now.getTime()) / 86400000
  );

  const activeAssignedCases = existingCases
    ? existingCases.filter(
      (c) =>
        c.radiographerId === profile.userId &&
        (c.status === 'SCHEDULED' || c.status === 'SCANNED')
    )
    : [];

  const liveCount = activeAssignedCases.length > 0 ? activeAssignedCases.length : profile.currentCaseload;

  const workloadRatio =
    profile.maxDailyCaseload > 0
      ? liveCount / profile.maxDailyCaseload
      : 1;

  // Location / On-site bonus/penalty: heavily prioritize radiographers stationed at the clinic
  let locationScore = 0;
  if (targetClinicId || targetClinicName) {
    if (isRadiographerAtClinic(profile, targetClinicId, targetClinicName)) {
      locationScore = -1000; // Strong preference for on-site radiographer
    } else {
      locationScore = 600; // Deprioritize radiographers stationed at other clinics
    }
  }

  // Severity workload balancing:
  // Count existing high-severity cases to prevent cognitive overload and procedural delays
  const activeCriticalCount = activeAssignedCases.filter((c) => c.severity === 'Critical').length;
  const activeSevereCount = activeAssignedCases.filter((c) => c.severity === 'Severe').length;
  const heavySeverityLoad = activeCriticalCount * 3 + activeSevereCount * 1.5;

  let severityScore = 0;
  if (caseSeverity === 'Critical') {
    // For critical emergencies, prefer radiographer with zero/minimal critical burden right now
    severityScore = activeCriticalCount === 0 ? -300 : activeCriticalCount * 250;
  } else if (caseSeverity === 'Severe') {
    severityScore = activeCriticalCount * 150 + activeSevereCount * 80;
  } else {
    // Routine / Mild / Moderate cases
    severityScore = heavySeverityLoad * 40;
  }

  return (
    (supports ? 0 : 5000) +
    locationScore +
    severityScore +
    daysAway * 100 +
    workloadRatio * 150
  );
}

export function getRecommendationReasons(
  profile: RadioScheduleProfile,
  requiredModality: string,
  existingCases?: Case[],
  targetClinicId?: string | null,
  targetClinicName?: string | null,
  caseSeverity?: SeverityLevel
): string[] {
  const reasons: string[] = [];

  if ((targetClinicId || targetClinicName) && isRadiographerAtClinic(profile, targetClinicId, targetClinicName)) {
    reasons.push(`Stationed on-site at ${profile.deployedClinicName || 'this healthcare centre'}`);
  }

  if (profile.supportedModalities.includes(requiredModality)) {
    reasons.push(`Certified for ${requiredModality} examinations`);
  }

  const activeAssignedCases = existingCases
    ? existingCases.filter(
      (c) =>
        c.radiographerId === profile.userId &&
        (c.status === 'SCHEDULED' || c.status === 'SCANNED')
    )
    : [];

  const activeCriticalCount = activeAssignedCases.filter((c) => c.severity === 'Critical').length;

  if (caseSeverity === 'Critical') {
    if (activeCriticalCount === 0) {
      reasons.push('Zero active critical cases — optimal capacity for emergency procedure');
    } else {
      reasons.push(`Currently handling ${activeCriticalCount} critical case(s) with available slot`);
    }
  } else if (caseSeverity === 'Severe') {
    reasons.push('Low urgent case fatigue index');
  }

  const liveCount = activeAssignedCases.length > 0 ? activeAssignedCases.length : profile.currentCaseload;
  const workloadRatio =
    profile.maxDailyCaseload > 0
      ? liveCount / profile.maxDailyCaseload
      : 1;

  if (workloadRatio <= 0.4) reasons.push('Low workload (available capacity)');
  else if (workloadRatio <= 0.75) reasons.push('Balanced daily caseload');

  return reasons;
}

export function recommendBestRadiographer(
  profiles: RadioScheduleProfile[],
  requiredModality: string,
  existingCases?: Case[],
  targetClinicId?: string | null,
  targetClinicName?: string | null,
  caseSeverity?: SeverityLevel
): string | null {
  let bestId: string | null = null;
  let bestScore = Infinity;

  // Strictly filter to radiographers stationed at the selected healthcare centre
  const candidateProfiles = (targetClinicId || targetClinicName)
    ? profiles.filter((p) => isRadiographerAtClinic(p, targetClinicId, targetClinicName))
    : profiles;

  for (const profile of candidateProfiles) {
    const score = scoreRadiographer(
      profile,
      requiredModality,
      existingCases,
      targetClinicId,
      targetClinicName,
      caseSeverity
    );

    if (score < bestScore) {
      bestScore = score;
      bestId = profile.userId;
    }
  }

  return bestId;
}

export default function RadiograperSelector({
  profiles,
  allProfiles,
  requiredModality,
  selectedId,
  recommendedId,
  onSelect,
  existingCases,
  targetClinicId,
  targetClinicName,
  caseSeverity,
  onReassignCase,
}: Props) {
  // State for expanded 3-day schedule and filters
  const [expandedScheduleId, setExpandedScheduleId] = React.useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = React.useState<string>('all');
  const [reassigningCaseId, setReassigningCaseId] = React.useState<string | null>(null);
  const [targetReassignRadId, setTargetReassignRadId] = React.useState<string>('');

  // Strictly filter to radiographers stationed at the selected healthcare centre
  const facilityProfiles = (targetClinicId || targetClinicName)
    ? profiles.filter((p) => isRadiographerAtClinic(p, targetClinicId, targetClinicName))
    : profiles;

  const eligible = facilityProfiles.filter(
    (p) =>
      p.leaveStatus !== 'On Leave' &&
      p.supportedModalities.includes(requiredModality)
  );

  const unavailable = facilityProfiles.filter(
    (p) => !eligible.some((e) => e.userId === p.userId)
  );

  // Sort display profiles:
  // 1. Recommended (Best Match)
  // 2. Alphabetical
  const sortedProfiles = [...eligible].sort((a, b) => {
    if (a.userId === recommendedId) return -1;
    if (b.userId === recommendedId) return 1;

    return a.userName.localeCompare(b.userName);
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-surface-500">
          Radiographer Assignment ({sortedProfiles.length} Available)
        </h3>
      </div>

      {sortedProfiles.length === 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
          <span>
            No radiographers are registered or stationed at this healthcare centre for {requiredModality}.
          </span>
        </div>
      )}

      {sortedProfiles.map((profile) => {
        const isRecommended = profile.userId === recommendedId;
        const isSelected = profile.userId === selectedId;
        const isExpanded = expandedScheduleId === profile.userId;
        const isOnSite = Boolean(targetClinicId && profile.deployedClinicId === targetClinicId);

        const assignedCases = existingCases
          ? existingCases.filter(
            (c) =>
              c.radiographerId === profile.userId &&
              (c.status === 'SCHEDULED' || c.status === 'SCANNED' || c.status === 'READY_FOR_SCAN')
          )
          : [];

        const liveCaseload = assignedCases.length > 0 ? assignedCases.length : profile.currentCaseload;
        const activeCriticalCount = assignedCases.filter((c) => c.severity === 'Critical').length;
        const activeSevereCount = assignedCases.filter((c) => c.severity === 'Severe').length;
        const activeModerateCount = assignedCases.filter((c) => c.severity === 'Moderate').length;

        // Calculate assigned minutes across scheduled cases: X-Ray 20m, CT 35m, MRI 45m, Ultrasound 25m
        const assignedMinutes = assignedCases.reduce((total, c) => {
          const mod = extractModality(c.scanType || '');
          const duration = mod === 'MRI' ? 45 : mod === 'CT' ? 35 : mod === 'Ultrasound' ? 25 : 20;
          return total + duration;
        }, 0);

        // 3-Day Workload Utilization (3 days @ 8h/day = 1440 minutes max standard capacity)
        const total3DayCapacityMinutes = 1440;
        const utilizationPct = Math.min(
          100,
          Math.round((assignedMinutes / total3DayCapacityMinutes) * 100)
        );

        const reasons = isRecommended
          ? getRecommendationReasons(
            profile,
            requiredModality,
            existingCases,
            targetClinicId,
            caseSeverity
          )
          : [];

        return (
          <div
            key={profile.userId}
            onClick={() => onSelect(profile.userId)}
            className={`w-full rounded-xl border p-3 text-left shadow-xs transition-all duration-150 cursor-pointer ${isSelected
                ? 'border-[#0F4C42] bg-[#F1F8F6] ring-1 ring-[#0F4C42]'
                : 'border-surface-200 bg-white hover:border-[#9FC8BE] hover:shadow-sm'
              }`}
          >
            <div className="mb-2 flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E4F2EE] text-[#0F4C42] font-bold text-xs">
                  {profile.userName.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                </div>

                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-surface-900">
                      {profile.userName}
                    </p>
                    {isOnSite && (
                      <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800 border border-emerald-200">
                        Stationed On-Site
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-surface-500 flex items-center gap-1 mt-0.5">
                    <Building2 className="w-3 h-3 text-surface-400 shrink-0" />
                    <span className="truncate">{profile.deployedClinicName || 'Healthcare Facility'}</span> &middot; {profile.shift}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {isRecommended && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700">
                    <Sparkles className="h-2.5 w-2.5" />
                    AI Best Match
                  </span>
                )}

                {isSelected && (
                  <CheckCircle className="h-4 w-4 text-[#0F4C42]" />
                )}
              </div>
            </div>

            {/* 3-Day Workload Utilization & Severity in hand */}
            <div className="space-y-1.5 bg-surface-50/80 p-2.5 rounded-lg border border-surface-200/80 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-surface-600">3-Day Workload Utilization:</span>
                <span className="font-bold text-surface-900 text-[10px] tabular-nums">
                  {assignedMinutes} / 1440 min &middot; {utilizationPct}% ({liveCaseload} {liveCaseload === 1 ? 'case' : 'cases'})
                </span>
              </div>

              <div className="h-2 w-full overflow-hidden rounded-full bg-surface-200">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${utilizationPct > 80
                      ? 'bg-red-500'
                      : utilizationPct > 50
                        ? 'bg-amber-500'
                        : 'bg-[#0F4C42]'
                    }`}
                  style={{ width: `${Math.max(4, utilizationPct)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] pt-0.5">
                <span className="text-surface-500">Severity in hand:</span>
                <div className="flex items-center gap-1">
                  {activeCriticalCount > 0 ? (
                    <span className="bg-red-50 text-red-800 border border-red-200 px-1.5 py-0.2 rounded font-bold">
                      {activeCriticalCount} Critical
                    </span>
                  ) : (
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 rounded font-medium">
                      0 Critical
                    </span>
                  )}
                  {activeSevereCount > 0 && (
                    <span className="bg-orange-50 text-orange-800 border border-orange-200 px-1.5 py-0.2 rounded font-semibold">
                      {activeSevereCount} Severe
                    </span>
                  )}
                  {activeModerateCount > 0 && (
                    <span className="bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded font-medium">
                      {activeModerateCount} Mod
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Certified Modalities */}
            <div className="mt-2 flex items-center justify-between text-[10px]">
              <div className="flex items-center gap-1">
                <span className="text-surface-400">Modalities:</span>
                {profile.supportedModalities.map((modality) => (
                  <span
                    key={modality}
                    className={`rounded px-1.5 py-0.2 font-medium ${modality === requiredModality
                        ? 'border border-[#BFD8D1] bg-[#E4F2EE] text-[#0F4C42] font-semibold'
                        : 'bg-surface-100 text-surface-600'
                      }`}
                  >
                    {modality}
                  </span>
                ))}
              </div>
              <span className="text-emerald-700 font-semibold">Ready for Dispatch</span>
            </div>

            {/* Expandable 3-Day Schedule & Itinerary Toggle */}
            <div className="mt-2.5 pt-2 border-t border-surface-200/70 flex items-center justify-between">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedScheduleId(isExpanded ? null : profile.userId);
                }}
                className="text-[11px] font-semibold text-[#0F4C42] hover:text-[#0b3831] flex items-center gap-1 cursor-pointer"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>Hide 3-Day Schedule</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>View 3-Day Schedule &amp; Cases ({assignedCases.length})</span>
                  </>
                )}
              </button>
              <span className="text-[10px] text-surface-400">
                {profile.shift || 'Day (08:00–17:00)'}
              </span>
            </div>

            {/* Expanded 3-Day Schedule Inspector & Reassignment Panel */}
            {isExpanded && (
              <div
                className="mt-2.5 p-2.5 bg-surface-50 rounded-xl border border-surface-200 space-y-2.5"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Severity Filter Pills */}
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-surface-600 uppercase tracking-wider">
                    Filter Cases by Severity:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {(['all', 'Mild', 'Moderate', 'Severe', 'Critical'] as const).map((sev) => {
                      const count = sev === 'all'
                        ? assignedCases.length
                        : assignedCases.filter((c) => (c.severity || 'Moderate') === sev).length;
                      const isActive = severityFilter === sev;

                      return (
                        <button
                          key={sev}
                          type="button"
                          onClick={() => setSeverityFilter(sev)}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${isActive
                              ? 'bg-[#0F4C42] text-white'
                              : 'bg-white text-surface-600 border border-surface-200 hover:bg-surface-100'
                            }`}
                        >
                          {sev === 'all' ? 'All' : sev} ({count})
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Cases List */}
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                  {assignedCases.length === 0 ? (
                    <p className="text-[11px] text-surface-400 italic py-2 text-center">
                      No cases currently scheduled for this 3-day window.
                    </p>
                  ) : (
                    assignedCases
                      .filter((c) => severityFilter === 'all' || (c.severity || 'Moderate') === severityFilter)
                      .map((c, idx) => {
                        const mod = extractModality(c.scanType || '');
                        const duration = mod === 'MRI' ? 45 : mod === 'CT' ? 35 : mod === 'Ultrasound' ? 25 : 20;
                        const timeDisplay = c.scheduledAt ? c.scheduledAt.replace('T', ' ').slice(5, 16) : `Slot ${idx + 1}`;
                        const isReassigning = reassigningCaseId === c.id;

                        return (
                          <div
                            key={c.id}
                            className="p-2 bg-white rounded-lg border border-surface-200 shadow-2xs space-y-1 text-[11px]"
                          >
                            <div className="flex items-start justify-between gap-1.5">
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-bold text-[#0F4C42] text-[11px]">
                                    {c.caseNumber}
                                  </span>
                                  <SeverityBadge severity={c.severity || 'Moderate'} />
                                </div>
                                <p className="font-medium text-surface-800 text-[11px] mt-0.5">
                                  {c.patientName} &middot; {c.scanType}
                                </p>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="text-[10px] text-surface-500 font-semibold flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-surface-400" />
                                  {timeDisplay} ({duration}m)
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-1 border-t border-surface-100 text-[10px]">
                              <span className="text-surface-500 flex items-center gap-1 truncate max-w-[200px]">
                                <MapPin className="w-3 h-3 text-surface-400 shrink-0" />
                                {c.clinicName || profile.deployedClinicName || 'Healthcare Center'}
                              </span>

                              {onReassignCase && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReassigningCaseId(isReassigning ? null : c.id);
                                    setTargetReassignRadId('');
                                  }}
                                  className="text-[10px] font-bold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                                >
                                  {isReassigning ? 'Cancel' : 'Reassign'}
                                </button>
                              )}
                            </div>

                            {/* Inline Reassignment Dropdown */}
                            {isReassigning && onReassignCase && (
                              <div className="pt-1.5 border-t border-amber-200 bg-amber-50/60 -mx-2 -mb-2 p-2 rounded-b-lg space-y-1.5">
                                <p className="text-[10px] font-bold text-amber-900">
                                  Reallocate Case to Another Radiographer:
                                </p>
                                <div className="flex items-center gap-1.5">
                                  <select
                                    value={targetReassignRadId}
                                    onChange={(e) => setTargetReassignRadId(e.target.value)}
                                    className="select-field text-[11px] py-1 bg-white flex-1"
                                  >
                                    <option value="">-- Select Radiographer --</option>
                                    {(allProfiles || profiles)
                                      .filter((p) => p.userId !== profile.userId && p.leaveStatus !== 'On Leave')
                                      .map((p) => (
                                        <option key={p.userId} value={p.userId}>
                                          {p.userName} ({p.deployedClinicName || 'Facility'})
                                        </option>
                                      ))}
                                  </select>

                                  <button
                                    type="button"
                                    disabled={!targetReassignRadId}
                                    onClick={async () => {
                                      if (!targetReassignRadId) return;
                                      await onReassignCase(c.id, targetReassignRadId);
                                      setReassigningCaseId(null);
                                      setTargetReassignRadId('');
                                    }}
                                    className="btn-primary text-[10px] px-2.5 py-1 bg-[#0F4C42] hover:bg-[#0c3c34] font-bold disabled:opacity-40"
                                  >
                                    Confirm
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            )}

            {isRecommended && reasons.length > 0 && (
              <div className="mt-2.5 border-t border-emerald-100 bg-emerald-50/40 -mx-3 -mb-3 p-2.5 rounded-b-xl">
                <p className="mb-1 text-[9px] font-bold text-emerald-900 uppercase tracking-wider">
                  AI Recommendation Rationales:
                </p>

                <div className="space-y-0.5">
                  {reasons.map((reason) => (
                    <p
                      key={reason}
                      className="flex items-center gap-1 text-[10px] text-emerald-800 font-medium"
                    >
                      <CheckCircle className="h-2.5 w-2.5 shrink-0 text-emerald-600" />
                      {reason}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {unavailable.length > 0 && (
        <div className="mt-3 border-t border-surface-200 pt-2.5">
          <p className="mb-1 text-[10px] font-semibold text-surface-400 uppercase">
            Unavailable / On Leave ({unavailable.length})
          </p>

          {unavailable.map((profile) => (
            <div
              key={profile.userId}
              className="mb-1 flex items-center justify-between rounded-lg border border-surface-200 bg-surface-50 p-2 text-xs opacity-60"
            >
              <span className="text-surface-600 font-medium">
                {profile.userName}
              </span>

              <span className="text-[10px] text-red-600 font-semibold bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
                {profile.leaveStatus === 'On Leave'
                  ? 'On Leave'
                  : `Missing ${requiredModality} Certification`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
