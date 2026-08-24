import React from 'react';
import type { Case, RadioScheduleProfile, RadioScheduleSlot } from '../../types';
import { User, CheckCircle, AlertTriangle, Sparkles, Building2 } from 'lucide-react';

interface Props {
  profiles: RadioScheduleProfile[];
  requiredModality: string;
  selectedId: string | null;
  recommendedId: string | null;
  onSelect: (userId: string) => void;
  existingCases?: Case[];
  targetClinicId?: string | null;
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

export function scoreRadiographer(
  profile: RadioScheduleProfile,
  requiredModality: string,
  existingCases?: Case[]
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

  const liveCount = existingCases
    ? existingCases.filter(
      (c) =>
        c.radiographerId === profile.userId &&
        (c.status === 'SCHEDULED' || c.status === 'SCANNED')
    ).length
    : profile.currentCaseload;

  const workloadRatio =
    profile.maxDailyCaseload > 0
      ? liveCount / profile.maxDailyCaseload
      : 1;

  return (
    (supports ? 0 : 500) +
    daysAway * 100 +
    workloadRatio * 50
  );
}

export function getRecommendationReasons(
  profile: RadioScheduleProfile,
  requiredModality: string,
  existingCases?: Case[]
): string[] {
  const reasons: string[] = [];

  if (profile.supportedModalities.includes(requiredModality)) {
    reasons.push('Certified for selected imaging modality');
  }

  const earliest = getEarliestSlot(
    profile.schedule,
    profile.userId,
    existingCases
  );

  if (earliest) {
    reasons.push('Next available slot is in the future');
  }

  const liveCount = existingCases
    ? existingCases.filter(
      (c) =>
        c.radiographerId === profile.userId &&
        (c.status === 'SCHEDULED' || c.status === 'SCANNED')
    ).length
    : profile.currentCaseload;

  const workloadRatio =
    profile.maxDailyCaseload > 0
      ? liveCount / profile.maxDailyCaseload
      : 1;

  if (workloadRatio <= 0.5) reasons.push('Low workload');
  else if (workloadRatio <= 0.75) reasons.push('Acceptable workload');

  reasons.push('Meets scheduling constraints');

  return reasons;
}

export function recommendBestRadiographer(
  profiles: RadioScheduleProfile[],
  requiredModality: string,
  existingCases?: Case[]
): string | null {
  let bestId: string | null = null;
  let bestScore = Infinity;

  for (const profile of profiles) {
    const score = scoreRadiographer(
      profile,
      requiredModality,
      existingCases
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
  requiredModality,
  selectedId,
  recommendedId,
  onSelect,
  existingCases,
  targetClinicId,
}: Props) {
  let eligible = profiles.filter(
    (p) =>
      p.leaveStatus !== 'On Leave' &&
      p.supportedModalities.includes(requiredModality)
  );

  if (eligible.length === 0) {
    eligible = profiles.filter((p) => p.leaveStatus !== 'On Leave');
  }

  const unavailable = profiles.filter(
    (p) => !eligible.some((e) => e.userId === p.userId)
  );

  // Sort eligible profiles:
  // 1. Recommended (Best Match)
  // 2. On-Site at target clinic
  // 3. Alphabetical
  const sortedEligible = [...eligible].sort((a, b) => {
    if (a.userId === recommendedId) return -1;
    if (b.userId === recommendedId) return 1;

    const aOnSite = targetClinicId && a.deployedClinicId === targetClinicId ? 1 : 0;
    const bOnSite = targetClinicId && b.deployedClinicId === targetClinicId ? 1 : 0;
    if (bOnSite !== aOnSite) return bOnSite - aOnSite;

    return a.userName.localeCompare(b.userName);
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-surface-500">
          Radiographer Assignment ({sortedEligible.length} Available)
        </h3>
      </div>

      {eligible.length === 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-700">
          <AlertTriangle className="h-4 w-4" />
          No eligible radiographers available for {requiredModality}.
        </div>
      )}

      {sortedEligible.map((profile) => {
        const isRecommended = profile.userId === recommendedId;
        const isSelected = profile.userId === selectedId;
        const isOnSite = Boolean(targetClinicId && profile.deployedClinicId === targetClinicId);

        const liveCaseload = existingCases
          ? existingCases.filter(
            (c) =>
              c.radiographerId === profile.userId &&
              (c.status === 'SCHEDULED' || c.status === 'SCANNED')
          ).length
          : profile.currentCaseload;

        const workloadPct = Math.min(
          100,
          Math.round(
            (liveCaseload / Math.max(1, profile.maxDailyCaseload)) * 100
          )
        );

        const reasons = isRecommended
          ? getRecommendationReasons(
            profile,
            requiredModality,
            existingCases
          )
          : [];

        return (
          <button
            key={profile.userId}
            type="button"
            onClick={() => onSelect(profile.userId)}
            className={`w-full rounded-xl border p-3.5 text-left shadow-sm transition-all duration-150 ${isSelected
                ? 'border-[#0F4C42] bg-[#F1F8F6] ring-1 ring-[#0F4C42]'
                : 'border-surface-200 bg-white hover:border-[#9FC8BE] hover:shadow-md'
              }`}
          >
            <div className="mb-2 flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E4F2EE]">
                  <User className="h-3.5 w-3.5 text-[#0F4C42]" />
                </div>

                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold text-surface-900">
                      {profile.userName}
                    </p>
                    {isOnSite && (
                      <span className="rounded bg-emerald-50 px-1.5 py-0.2 text-[9px] font-bold text-emerald-800 border border-emerald-200">
                        On-Site
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-surface-500 flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-surface-400" />
                    {profile.deployedClinicName || 'Healthcare Facility'} &middot; {profile.shift}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {isRecommended && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700">
                    <Sparkles className="h-2.5 w-2.5" />
                    Best Match
                  </span>
                )}

                {isSelected && (
                  <CheckCircle className="h-4 w-4 text-[#0F4C42]" />
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
              <div>
                <span className="text-surface-500">Modalities:</span>
                <div className="mt-0.5 flex flex-wrap gap-1">
                  {profile.supportedModalities.map((modality) => (
                    <span
                      key={modality}
                      className={`rounded px-1 py-0.5 text-[9px] font-medium ${modality === requiredModality
                          ? 'border border-[#BFD8D1] bg-[#E4F2EE] text-[#0F4C42]'
                          : 'bg-surface-200 text-surface-600'
                        }`}
                    >
                      {modality}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-surface-500">Workload:</span>
                <div className="mt-1 flex items-center gap-1.5">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-200">
                    <div
                      className={`h-full rounded-full ${workloadPct > 80
                          ? 'bg-red-500'
                          : workloadPct > 50
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                      style={{ width: `${workloadPct}%` }}
                    />
                  </div>
                  <span className="text-surface-600">
                    {liveCaseload}/{profile.maxDailyCaseload}
                  </span>
                </div>
              </div>

              <div className="col-span-2">
                <span className="text-surface-500">Status:</span>
                <span className="ml-1.5 font-medium text-emerald-600">
                  Available
                </span>
              </div>
            </div>

            {isRecommended && reasons.length > 0 && (
              <div className="mt-2 border-t border-surface-200 pt-2">
                <p className="mb-1 text-[10px] text-surface-500">
                  Why this radiographer:
                </p>

                <div className="space-y-0.5">
                  {reasons.map((reason) => (
                    <p
                      key={reason}
                      className="flex items-center gap-1 text-[10px] text-emerald-700"
                    >
                      <CheckCircle className="h-2.5 w-2.5 shrink-0" />
                      {reason}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </button>
        );
      })}

      {unavailable.length > 0 && (
        <div className="mt-4 border-t border-surface-200 pt-3">
          <p className="mb-1 text-[10px] text-surface-400">
            Unavailable ({unavailable.length})
          </p>

          {unavailable.map((profile) => (
            <div
              key={profile.userId}
              className="mb-1 flex items-center justify-between rounded border border-surface-200 bg-surface-100 p-2 opacity-50"
            >
              <span className="text-[11px] text-surface-500">
                {profile.userName}
              </span>

              <span className="text-[9px] text-red-500">
                {profile.leaveStatus === 'On Leave'
                  ? 'On Leave'
                  : `No ${requiredModality}`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
