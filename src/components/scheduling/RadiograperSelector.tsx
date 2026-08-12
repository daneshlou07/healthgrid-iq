import React from 'react';
import type { Case, RadioScheduleProfile, RadioScheduleSlot } from '../../types';
import { User, CheckCircle, AlertTriangle, Sparkles } from 'lucide-react';

interface Props {
  profiles: RadioScheduleProfile[];
  requiredModality: string;
  selectedId: string | null;
  recommendedId: string | null;
  onSelect: (userId: string) => void;
  existingCases?: Case[];
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
  // Check transient bulk assigned slots first
  const slotCleanTime = slotStartTime.replace(/\s*[AP]M$/i, '').trim();
  const slotKey = `${radiographerId}_${slotDate}_${slotCleanTime}`;
  if (transientAssignedSlots && transientAssignedSlots.has(slotKey)) {
    return { id: 'bulk-assigned', caseNumber: 'Bulk Queue' } as Case;
  }

  if (!existingCases || existingCases.length === 0) return null;

  const matchingCase = existingCases.find((c) => {
    if (c.id === ignoreCaseId) return false;
    if (c.radiographerId !== radiographerId) return false;
    if (!c.scheduledAt || (c.status !== 'SCHEDULED' && c.status !== 'CREATED' && c.status !== 'SCANNED')) return false;

    const caseDateObj = new Date(c.scheduledAt);
    if (isNaN(caseDateObj.getTime())) return false;

    const caseDayStr = caseDateObj.toISOString().split('T')[0];
    if (caseDayStr !== slotDate) return false;

    const caseHours = String(caseDateObj.getHours()).padStart(2, '0');
    const caseMins = String(caseDateObj.getMinutes()).padStart(2, '0');
    const caseTimeStr = `${caseHours}:${caseMins}`;

    return caseTimeStr === slotCleanTime;
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
  now.setHours(0, 0, 0, 0);

  for (const slot of schedule) {
    if (slot.booked) continue;
    if (
      radiographerId &&
      isSlotOccupied(slot.date, slot.startTime, radiographerId, existingCases, transientAssignedSlots, ignoreCaseId)
    ) {
      continue;
    }
    const slotDate = new Date(`${slot.date}T${slot.startTime}:00`);
    if (slotDate >= now) return slot;
  }

  // Fallback: return first unbooked and unoccupied slot
  for (const slot of schedule) {
    if (slot.booked) continue;
    if (
      radiographerId &&
      isSlotOccupied(slot.date, slot.startTime, radiographerId, existingCases, transientAssignedSlots, ignoreCaseId)
    ) {
      continue;
    }
    return slot;
  }

  return schedule[0] || null;
}

export function getAvailableSlots(
  schedule: RadioScheduleSlot[],
  count: number = 8,
  radiographerId?: string,
  existingCases?: Case[],
  ignoreCaseId?: string
): { slot: RadioScheduleSlot; isOccupied: boolean; occupiedByCase?: Case }[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const result: { slot: RadioScheduleSlot; isOccupied: boolean; occupiedByCase?: Case }[] = [];

  for (const slot of schedule) {
    const slotDate = new Date(`${slot.date}T${slot.startTime}:00`);
    if (slotDate < now) continue;

    const occupiedBy =
      radiographerId && existingCases
        ? isSlotOccupied(slot.date, slot.startTime, radiographerId, existingCases, undefined, ignoreCaseId)
        : null;

    const isBookedOrOccupied = slot.booked || Boolean(occupiedBy);

    result.push({
      slot,
      isOccupied: isBookedOrOccupied,
      occupiedByCase: occupiedBy || undefined,
    });

    if (result.length >= count) break;
  }

  if (result.length === 0) {
    return schedule.slice(0, count).map((slot) => {
      const occupiedBy =
        radiographerId && existingCases
          ? isSlotOccupied(slot.date, slot.startTime, radiographerId, existingCases, undefined, ignoreCaseId)
          : null;
      return {
        slot,
        isOccupied: slot.booked || Boolean(occupiedBy),
        occupiedByCase: occupiedBy || undefined,
      };
    });
  }

  return result;
}

export function scoreRadiographer(
  profile: RadioScheduleProfile,
  requiredModality: string,
  existingCases?: Case[]
): number {
  if (profile.leaveStatus === 'On Leave') return Infinity;
  const supports = profile.supportedModalities.includes(requiredModality);
  const earliest = getEarliestSlot(profile.schedule, profile.userId, existingCases);
  const now = new Date();
  const slotDate = earliest ? new Date(earliest.date) : now;
  const daysAway = Math.max(0, (slotDate.getTime() - now.getTime()) / 86400000);

  const liveCount = existingCases
    ? existingCases.filter((c) => c.radiographerId === profile.userId && (c.status === 'SCHEDULED' || c.status === 'SCANNED')).length
    : profile.currentCaseload;

  const workloadRatio = liveCount / profile.maxDailyCaseload;
  return (supports ? 0 : 500) + daysAway * 100 + workloadRatio * 50;
}

export function getRecommendationReasons(
  profile: RadioScheduleProfile,
  requiredModality: string,
  existingCases?: Case[]
): string[] {
  const reasons: string[] = [];
  if (profile.supportedModalities.includes(requiredModality)) reasons.push('Certified for selected imaging modality');
  const earliest = getEarliestSlot(profile.schedule, profile.userId, existingCases);
  if (earliest) reasons.push('Available during requested time');
  
  const liveCount = existingCases
    ? existingCases.filter((c) => c.radiographerId === profile.userId && (c.status === 'SCHEDULED' || c.status === 'SCANNED')).length
    : profile.currentCaseload;

  const workloadRatio = liveCount / profile.maxDailyCaseload;
  if (workloadRatio <= 0.5) reasons.push('Lowest workload');
  else if (workloadRatio <= 0.75) reasons.push('Acceptable workload');
  reasons.push('Closest to assigned healthcare centre');
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
  for (const p of profiles) {
    const score = scoreRadiographer(p, requiredModality, existingCases);
    if (score < bestScore) { bestScore = score; bestId = p.userId; }
  }
  return bestId || profiles[0]?.userId || null;
}

export default function RadiograperSelector({ profiles, requiredModality, selectedId, recommendedId, onSelect, existingCases }: Props) {
  let eligible = profiles.filter((p) => p.leaveStatus !== 'On Leave' && p.supportedModalities.includes(requiredModality));
  if (eligible.length === 0) {
    eligible = profiles.filter((p) => p.leaveStatus !== 'On Leave');
  }
  if (eligible.length === 0) {
    eligible = profiles;
  }
  const unavailable = profiles.filter((p) => !eligible.some((e) => e.userId === p.userId));

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wider">
        Radiographer Assignment
      </h3>

      {eligible.length === 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> No eligible radiographers at this clinic for {requiredModality}.
        </div>
      )}

      {eligible.map((profile) => {
        const isRecommended = profile.userId === recommendedId;
        const isSelected = profile.userId === selectedId;
        const liveCaseload = existingCases
          ? existingCases.filter((c) => c.radiographerId === profile.userId && (c.status === 'SCHEDULED' || c.status === 'SCANNED')).length
          : profile.currentCaseload;

        const workloadPct = Math.round((liveCaseload / profile.maxDailyCaseload) * 100);
        const reasons = isRecommended ? getRecommendationReasons(profile, requiredModality, existingCases) : [];

        return (
          <button
            key={profile.userId}
            onClick={() => onSelect(profile.userId)}
            className={`w-full text-left p-3 rounded-lg border transition-all duration-100 ${
              isSelected
                ? 'bg-navy-50 border-navy-300 ring-1 ring-navy-200'
                : 'bg-surface-100 border-surface-200 hover:border-surface-400'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-surface-200 rounded-full flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-surface-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-surface-800">{profile.userName}</p>
                  <p className="text-[10px] text-surface-500">{profile.shift}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {isRecommended && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                    <Sparkles className="w-2.5 h-2.5" /> Best Match
                  </span>
                )}
                {isSelected && <CheckCircle className="w-4 h-4 text-navy-600" />}
              </div>
            </div>

            {/* Operational info */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
              <div>
                <span className="text-surface-500">Modalities:</span>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {profile.supportedModalities.map((m) => (
                    <span key={m} className={`px-1 py-0.5 rounded text-[9px] font-medium ${m === requiredModality ? 'bg-navy-100 text-navy-700 border border-navy-200' : 'bg-surface-200 text-surface-600'}`}>
                      {m}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-surface-500">Workload:</span>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="flex-1 h-1.5 bg-surface-200 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${workloadPct > 80 ? 'bg-red-500' : workloadPct > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${workloadPct}%` }} />
                  </div>
                  <span className="text-surface-600">{liveCaseload}/{profile.maxDailyCaseload}</span>
                </div>
              </div>
              <div className="col-span-2">
                <span className="text-surface-500">Status:</span>
                <span className="ml-1.5 text-emerald-600 font-medium">Available</span>
              </div>
            </div>

            {/* Recommendation reasons */}
            {isRecommended && reasons.length > 0 && (
              <div className="mt-2 pt-2 border-t border-surface-200">
                <p className="text-[10px] text-surface-500 mb-1">Why this radiographer:</p>
                <div className="space-y-0.5">
                  {reasons.map((r) => (
                    <p key={r} className="text-[10px] text-emerald-700 flex items-center gap-1">
                      <CheckCircle className="w-2.5 h-2.5 flex-shrink-0" /> {r}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </button>
        );
      })}

      {unavailable.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] text-surface-400 mb-1">Unavailable ({unavailable.length})</p>
          {unavailable.map((p) => (
            <div key={p.userId} className="flex items-center justify-between p-2 bg-surface-100 rounded border border-surface-200 mb-1 opacity-50">
              <span className="text-[11px] text-surface-500">{p.userName}</span>
              <span className="text-[9px] text-red-500">{p.leaveStatus === 'On Leave' ? 'On Leave' : `No ${requiredModality}`}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
