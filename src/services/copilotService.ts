/**
 * HealthGrid Copilot — Self-Contained AI Service
 *
 * All intelligence is built from pattern-matching against live HealthGrid IQ
 * data (cases, users, clinics, equipment). No external APIs are required.
 *
 * To connect a real backend later, replace the response generators in this
 * file — the UI layer (CopilotPanel) remains unchanged.
 */

import type { Case, User, Clinic, MobilePacsVan, Report, PatientRequest } from '../types';

// ---------------------------------------------------------------------------
// Public Types
// ---------------------------------------------------------------------------

export type CopilotMessageRole = 'user' | 'copilot';

export interface CopilotAction {
  label: string;
  route?: string;           // In-app route to navigate to
  onClick?: () => void;     // Custom callback
}

export interface CopilotMessage {
  id: string;
  role: CopilotMessageRole;
  text: string;
  actions?: CopilotAction[];
  timestamp: string;
}

export type MascotState =
  | 'idle'
  | 'processing'
  | 'speaking'
  | 'attention'
  | 'urgent'
  | 'success'
  | 'scheduling';

export interface ProactiveInsight {
  id: string;
  text: string;
  severity: 'info' | 'warning' | 'urgent';
  action: CopilotAction;
  dismissedAt?: string;
}

// ---------------------------------------------------------------------------
// Context snapshot that the copilot reasons over
// ---------------------------------------------------------------------------
export interface CopilotContext {
  cases: Case[];
  users: User[];
  clinics: Clinic[];
  equipment: MobilePacsVan[];
  reports: Report[];
  patientRequests: PatientRequest[];
  currentUserRole?: string;
  currentUserName?: string;
}

// ---------------------------------------------------------------------------
// Navigation knowledge base
// ---------------------------------------------------------------------------
interface NavEntry {
  keywords: string[];
  description: string;
  route: string;
  roles?: string[];
}

const NAVIGATION_MAP: NavEntry[] = [
  { keywords: ['dashboard', 'home', 'overview', 'main'], description: 'The Dashboard provides an overview of your radiology department activity.', route: '/dashboard' },
  { keywords: ['patient', 'register patient', 'new patient', 'add patient'], description: 'Register a new patient through the Patient Registration page.', route: '/patients/register', roles: ['Medical Officer', 'Administrator'] },
  { keywords: ['patient list', 'patient registry', 'all patients', 'manage patient'], description: 'View and manage all registered patients.', route: '/patients', roles: ['Medical Officer', 'Administrator'] },
  { keywords: ['case', 'new case', 'register case', 'create case', 'examination'], description: 'Create a new radiology case / examination request.', route: '/cases/new', roles: ['Medical Officer', 'Administrator'] },
  { keywords: ['all cases', 'case list', 'cases overview'], description: 'View all medical cases across the department.', route: '/cases' },
  { keywords: ['scan queue', 'scan', 'pending scan'], description: 'The Scan Queue shows examinations waiting to be performed by radiographers.', route: '/scan-queue', roles: ['Radiographer'] },
  { keywords: ['upload', 'upload scan', 'upload image'], description: 'Upload completed scan images to a case.', route: '/upload', roles: ['Radiographer'] },
  { keywords: ['review queue', 'review', 'pending review'], description: 'The Review Queue shows scanned cases waiting for radiologist review.', route: '/review-queue', roles: ['Radiologist', 'Medical Officer'] },
  { keywords: ['reporting', 'report workspace', 'write report'], description: 'The Reporting Workspace is where radiologists create diagnostic reports.', route: '/reporting', roles: ['Radiologist', 'Medical Officer'] },
  { keywords: ['department report', 'all report', 'report list'], description: 'View all finalized department reports.', route: '/reports' },
  { keywords: ['schedule', 'my schedule', 'calendar'], description: 'View your personal examination schedule.', route: '/schedule', roles: ['Radiographer'] },
  { keywords: ['scheduling', 'resource scheduling', 'assign schedule'], description: 'Manage resource scheduling and staff assignments.', route: '/scheduling', roles: ['Administrator'] },
  { keywords: ['ai scheduler', 'smart scheduler', 'auto assign', 'ias', 'intelligent'], description: 'The AI Scheduler automatically optimizes radiographer assignments based on availability, workload, and proximity.', route: '/ai-scheduler', roles: ['Administrator'] },
  { keywords: ['mobile pacs', 'fleet', 'van', 'equipment', 'vehicle'], description: 'Fleet Management lets you track and manage mobile PACS vans and equipment.', route: '/fleet', roles: ['Administrator'] },
  { keywords: ['user', 'staff', 'manage user', 'user management'], description: 'User Management allows administrators to manage staff accounts and roles.', route: '/users', roles: ['Administrator'] },
  { keywords: ['clinic', 'manage clinic', 'clinic management', 'location'], description: 'Clinic Management lets you add and configure healthcare facility locations.', route: '/clinics', roles: ['Administrator'] },
  { keywords: ['audit', 'audit log', 'activity log'], description: 'Audit Logs provide a detailed history of all system actions and changes.', route: '/audit-logs', roles: ['Administrator'] },
  { keywords: ['analytics', 'statistics', 'data', 'chart'], description: 'The Analytics page provides department-wide statistics and performance metrics.', route: '/analytics', roles: ['Administrator'] },
  { keywords: ['announcement', 'broadcast', 'notice'], description: 'Manage system-wide announcements visible to all staff.', route: '/announcements', roles: ['Administrator'] },
  { keywords: ['patient request', 'update request', 'transfer', 'patient update'], description: 'Review and process patient data update requests.', route: '/requests', roles: ['Medical Officer', 'Administrator'] },
  { keywords: ['track', 'track status', 'transfer status'], description: 'Track the status of patient transfer requests.', route: '/track-status', roles: ['Medical Officer', 'Administrator'] },
  { keywords: ['recycle', 'trash', 'deleted', 'recycle bin'], description: 'The Recycle Bin stores recently deleted items that can be restored.', route: '/recycle-bin', roles: ['Administrator'] },
  { keywords: ['credential', 'onboarding', 'verification', 'registration'], description: 'View and manage your professional clinical credentials and registration details.', route: '/onboarding' },
  { keywords: ['tech stack', 'technology', 'architecture'], description: 'View the HealthGrid IQ technology stack and architecture details.', route: '/tech-stack', roles: ['Administrator'] },
];

// ---------------------------------------------------------------------------
// Suggested prompts
// ---------------------------------------------------------------------------
export const SUGGESTED_PROMPTS = [
  "Show me today's urgent cases",
  "What's happening in the radiology department?",
  "Which radiographers are available?",
  "Explain today's workload",
  "Why was this radiographer assigned?",
  "What does AI Scheduler do?",
  "Show me patients waiting the longest",
];

// ---------------------------------------------------------------------------
// Unique ID generator
// ---------------------------------------------------------------------------
let _msgCounter = 0;
export function generateMessageId(): string {
  _msgCounter += 1;
  return `copilot-msg-${Date.now()}-${_msgCounter}`;
}

// ---------------------------------------------------------------------------
// Main response generator
// ---------------------------------------------------------------------------

export function generateCopilotResponse(
  query: string,
  ctx: CopilotContext
): { text: string; actions?: CopilotAction[]; mascotState?: MascotState } {
  const q = query.toLowerCase().trim();

  // --- Healthcare safety boundary ---
  if (detectMedicalQuery(q)) {
    return {
      text: "I'm designed to assist with HealthGrid IQ workflow management — scheduling, case tracking, staff coordination, and system navigation.\n\nFor clinical interpretation of medical images or patient diagnosis, please consult with a qualified radiologist or attending physician. I am not a diagnostic tool.",
      mascotState: 'speaking',
    };
  }

  // --- Navigation queries ---
  const navResult = matchNavigation(q);
  if (navResult) {
    return {
      text: navResult.description + '\n\nI can take you there now.',
      actions: [{ label: `Open ${navResult.route.replace('/', '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Dashboard'}`, route: navResult.route }],
      mascotState: 'speaking',
    };
  }

  // --- Urgent cases ---
  if (matchesAny(q, ['urgent', 'critical', 'emergency', 'red flag', 'critical finding'])) {
    return handleUrgentCases(ctx);
  }

  // --- Department overview ---
  if (matchesAny(q, ["what's happening", 'whats happening', 'department status', 'radiology department', 'department overview', 'how is the department'])) {
    return handleDepartmentOverview(ctx);
  }

  // --- Radiographer availability ---
  if (matchesAny(q, ['radiographer', 'available radiographer', 'who is available', 'staff available', 'technologist'])) {
    return handleRadiographerAvailability(ctx);
  }

  // --- Workload ---
  if (matchesAny(q, ['workload', 'case load', 'caseload', 'work load', 'busy', 'distribution'])) {
    return handleWorkload(ctx);
  }

  // --- AI Scheduler explanation ---
  if (matchesAny(q, ['why was', 'why is', 'assigned', 'assignment reason', 'scheduler explain'])) {
    return handleAssignmentExplanation(q, ctx);
  }

  // --- AI Scheduler info ---
  if (matchesAny(q, ['ai scheduler', 'what does ai', 'smart scheduler', 'ias', 'auto schedul', 'intelligent assign'])) {
    return handleAiSchedulerInfo();
  }

  // --- Patients waiting ---
  if (matchesAny(q, ['waiting', 'longest wait', 'patient waiting', 'queue time', 'wait time'])) {
    return handleWaitingPatients(ctx);
  }

  // --- Reports ---
  if (matchesAny(q, ['report pending', 'pending report', 'unsigned report', 'draft report', 'report status'])) {
    return handlePendingReports(ctx);
  }

  // --- Equipment / Fleet ---
  if (matchesAny(q, ['equipment', 'pacs van', 'mobile pacs', 'fleet', 'vehicle'])) {
    return handleEquipmentStatus(ctx);
  }

  // --- Clinic info ---
  if (matchesAny(q, ['clinic', 'location', 'facility', 'site'])) {
    return handleClinicInfo(ctx);
  }

  // --- Greeting ---
  if (matchesAny(q, ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'])) {
    const greeting = getTimeGreeting();
    return {
      text: `${greeting}${ctx.currentUserName ? ', ' + ctx.currentUserName.split(' ')[0] : ''}! I'm the HealthGrid Copilot — your AI radiology workflow assistant.\n\nI can help you with case tracking, staff coordination, scheduling insights, system navigation, and more. Try asking me something or use one of the suggested prompts below.`,
      mascotState: 'speaking',
    };
  }

  // --- Help / what can you do ---
  if (matchesAny(q, ['help', 'what can you do', 'capabilities', 'feature', 'how do you work'])) {
    return {
      text: "Here's what I can help you with:\n\n1. Case tracking — View urgent, pending, or waiting cases\n2. Staff coordination — Check radiographer availability and workload\n3. AI Scheduler — Explain why assignments were made\n4. Navigation — Guide you to any HealthGrid IQ page\n5. Department overview — Summarize what's happening\n6. Proactive alerts — I'll notify you of important workflow events\n\nJust ask me a question or tap a suggested prompt!",
      mascotState: 'speaking',
    };
  }

  // --- Default fallback ---
  return {
    text: `I understand you're asking about "${query}". I can help with HealthGrid IQ workflow tasks such as:\n\n- Checking urgent or pending cases\n- Viewing radiographer availability and workload\n- Understanding AI Scheduler decisions\n- Navigating to any HealthGrid IQ page\n- Getting a department status overview\n\nCould you rephrase your question, or try one of the suggested prompts?`,
    mascotState: 'speaking',
  };
}

// ---------------------------------------------------------------------------
// Handler: Urgent / Critical Cases
// ---------------------------------------------------------------------------
function handleUrgentCases(ctx: CopilotContext): ReturnType<typeof generateCopilotResponse> {
  const criticalCases = ctx.cases.filter(c => c.isCriticalFinding && !c.criticalFindingAcknowledged);
  const severeCases = ctx.cases.filter(c => (c.severity === 'Critical' || c.severity === 'Severe') && c.status !== 'FINALIZED' && c.status !== 'CANCELLED');

  const lines: string[] = [];

  if (criticalCases.length > 0) {
    lines.push(`There are ${criticalCases.length} unacknowledged critical red-flag finding(s):\n`);
    criticalCases.slice(0, 5).forEach(c => {
      lines.push(`- ${c.caseNumber} (${c.patientName}) — ${c.criticalFindingNote || 'Critical pathology flagged'}`);
    });
  } else {
    lines.push('No unacknowledged critical red-flag findings at this time.');
  }

  if (severeCases.length > 0) {
    lines.push(`\n${severeCases.length} active case(s) are marked as Severe or Critical severity and have not yet been finalized.`);
  }

  return {
    text: lines.join('\n'),
    actions: [
      { label: 'View All Cases', route: '/cases' },
      ...(criticalCases.length > 0 ? [{ label: 'Review Queue', route: '/review-queue' }] : []),
    ],
    mascotState: criticalCases.length > 0 ? 'urgent' : 'speaking',
  };
}

// ---------------------------------------------------------------------------
// Handler: Department Overview
// ---------------------------------------------------------------------------
function handleDepartmentOverview(ctx: CopilotContext): ReturnType<typeof generateCopilotResponse> {
  const totalCases = ctx.cases.length;
  const activeCases = ctx.cases.filter(c => c.status !== 'FINALIZED' && c.status !== 'CANCELLED' && c.status !== 'NO_SHOW');
  const awaitingScan = ctx.cases.filter(c => c.status === 'SCHEDULED');
  const awaitingReview = ctx.cases.filter(c => c.status === 'SCANNED');
  const awaitingReport = ctx.cases.filter(c => c.status === 'REPORTED');
  const finalized = ctx.cases.filter(c => c.status === 'FINALIZED');
  const activeRadiographers = ctx.users.filter(u => u.role === 'Radiographer' && u.status === 'active' && u.leaveStatus !== 'On Leave');
  const activeRadiologists = ctx.users.filter(u => u.role === 'Radiologist' && u.status === 'active' && u.leaveStatus !== 'On Leave');

  const text = `Here's the current department snapshot:\n
Total cases: ${totalCases}
Active (in progress): ${activeCases.length}
Awaiting scan: ${awaitingScan.length}
Awaiting radiologist review: ${awaitingReview.length}
Reports in progress: ${awaitingReport.length}
Finalized: ${finalized.length}

Staff on duty:
- ${activeRadiographers.length} radiographer(s) available
- ${activeRadiologists.length} radiologist(s) available
- ${ctx.clinics.filter(c => c.status === 'active').length} active clinic(s)
- ${ctx.equipment.filter(e => e.status === 'deployed').length} deployed mobile PACS van(s)`;

  return {
    text,
    actions: [
      { label: 'Open Dashboard', route: '/dashboard' },
      { label: 'View All Cases', route: '/cases' },
    ],
    mascotState: 'speaking',
  };
}

// ---------------------------------------------------------------------------
// Handler: Radiographer Availability
// ---------------------------------------------------------------------------
function handleRadiographerAvailability(ctx: CopilotContext): ReturnType<typeof generateCopilotResponse> {
  const radiographers = ctx.users.filter(u => u.role === 'Radiographer' && u.status === 'active');
  const available = radiographers.filter(u => u.leaveStatus !== 'On Leave');
  const onLeave = radiographers.filter(u => u.leaveStatus === 'On Leave');

  const lines = [`${available.length} of ${radiographers.length} radiographer(s) are currently available:\n`];

  available.forEach(r => {
    const caseCount = ctx.cases.filter(c => c.radiographerId === r.id && c.status !== 'FINALIZED' && c.status !== 'CANCELLED').length;
    lines.push(`- ${r.name} — ${r.shift || 'N/A'} shift, ${caseCount} active case(s)${r.supportedModalities?.length ? ', modalities: ' + r.supportedModalities.join(', ') : ''}`);
  });

  if (onLeave.length > 0) {
    lines.push(`\n${onLeave.length} radiographer(s) currently on leave: ${onLeave.map(u => u.name).join(', ')}`);
  }

  return {
    text: lines.join('\n'),
    actions: [{ label: 'View Scheduling', route: '/scheduling' }],
    mascotState: 'speaking',
  };
}

// ---------------------------------------------------------------------------
// Handler: Workload
// ---------------------------------------------------------------------------
function handleWorkload(ctx: CopilotContext): ReturnType<typeof generateCopilotResponse> {
  const radiographers = ctx.users.filter(u => u.role === 'Radiographer' && u.status === 'active' && u.leaveStatus !== 'On Leave');

  if (radiographers.length === 0) {
    return { text: 'No active radiographers found in the system.', mascotState: 'speaking' };
  }

  const workloads = radiographers.map(r => {
    const activeCases = ctx.cases.filter(c => c.radiographerId === r.id && c.status !== 'FINALIZED' && c.status !== 'CANCELLED' && c.status !== 'NO_SHOW');
    return { name: r.name, count: activeCases.length };
  }).sort((a, b) => b.count - a.count);

  const max = workloads[0]?.count || 0;
  const min = workloads[workloads.length - 1]?.count || 0;
  const isBalanced = max - min <= 2;

  const lines = ["Current radiographer workload distribution:\n"];
  workloads.forEach(w => {
    const bar = '\u2588'.repeat(Math.max(1, w.count)) + ' ';
    lines.push(`${w.name}: ${bar}${w.count} case(s)`);
  });

  if (!isBalanced) {
    lines.push(`\nWorkload is currently unbalanced. ${workloads[0].name} has the highest load (${max} cases) while ${workloads[workloads.length - 1].name} has the lowest (${min} cases).`);
  } else {
    lines.push('\nWorkload is reasonably balanced across available radiographers.');
  }

  return {
    text: lines.join('\n'),
    actions: [
      { label: 'Open Scheduler', route: '/scheduling' },
      { label: 'AI Scheduler', route: '/ai-scheduler' },
    ],
    mascotState: !isBalanced ? 'attention' : 'speaking',
  };
}

// ---------------------------------------------------------------------------
// Handler: Assignment Explanation
// ---------------------------------------------------------------------------
function handleAssignmentExplanation(q: string, ctx: CopilotContext): ReturnType<typeof generateCopilotResponse> {
  // Try to extract a name from the query
  const nameMatch = q.match(/why (?:was|is) (\w+(?:\s\w+)?)\s(?:assigned|selected|chosen|picked)/i);
  let targetName = nameMatch?.[1] || '';

  // Try to find the user
  let targetUser = ctx.users.find(u =>
    u.role === 'Radiographer' &&
    u.name.toLowerCase().includes(targetName.toLowerCase())
  );

  // If no name matched, use the most recently assigned radiographer from active cases
  if (!targetUser) {
    const recentAssigned = ctx.cases
      .filter(c => c.radiographerId && c.status !== 'FINALIZED' && c.status !== 'CANCELLED')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    if (recentAssigned) {
      targetUser = ctx.users.find(u => u.id === recentAssigned.radiographerId);
    }
  }

  if (!targetUser) {
    return {
      text: "I couldn't identify the specific radiographer you're asking about. Could you mention their name? For example: \"Why was Sarah assigned to this examination?\"",
      mascotState: 'speaking',
    };
  }

  // Build explanation from available data
  const activeCases = ctx.cases.filter(c => c.radiographerId === targetUser!.id && c.status !== 'FINALIZED' && c.status !== 'CANCELLED' && c.status !== 'NO_SHOW');
  const allRadiographers = ctx.users.filter(u => u.role === 'Radiographer' && u.status === 'active' && u.leaveStatus !== 'On Leave');
  const workloads = allRadiographers.map(r => ({
    name: r.name,
    count: ctx.cases.filter(c => c.radiographerId === r.id && c.status !== 'FINALIZED' && c.status !== 'CANCELLED').length,
  }));
  const lowestWorkload = workloads.reduce((min, w) => w.count < min.count ? w : min, workloads[0]);
  const isLowest = targetUser.name === lowestWorkload?.name;

  const reasons: string[] = [];
  reasons.push(`${targetUser.name} is currently ${targetUser.leaveStatus === 'On Leave' ? 'on leave' : 'available and on duty'} (${targetUser.shift || 'standard'} shift).`);
  reasons.push(`Current active caseload: ${activeCases.length} case(s)${isLowest ? ' (lowest among available radiographers)' : ''}.`);
  if (targetUser.supportedModalities?.length) {
    reasons.push(`Certified modalities: ${targetUser.supportedModalities.join(', ')}.`);
  }
  if (targetUser.deploymentLocationId) {
    const clinic = ctx.clinics.find(c => c.id === targetUser!.deploymentLocationId);
    if (clinic) {
      reasons.push(`Currently deployed at ${clinic.name}, which may be closest to the examination location.`);
    }
  }

  return {
    text: `Here's why ${targetUser.name} was selected for this assignment:\n\n${reasons.map((r, i) => `${i + 1}. ${r}`).join('\n')}\n\nThe AI Scheduler considers availability, current workload, modality certification, and facility proximity when making assignments.`,
    actions: [{ label: 'Open AI Scheduler', route: '/ai-scheduler' }],
    mascotState: 'scheduling',
  };
}

// ---------------------------------------------------------------------------
// Handler: AI Scheduler Info
// ---------------------------------------------------------------------------
function handleAiSchedulerInfo(): ReturnType<typeof generateCopilotResponse> {
  return {
    text: `The AI Scheduler (Intelligent Assignment System) is HealthGrid IQ's automated scheduling engine. It assigns radiographers to examinations by analyzing:\n
1. Radiographer availability — Who is on duty and not on leave
2. Current workload — Distributes cases evenly across staff
3. Modality certification — Matches staff qualifications to examination type
4. Geographic proximity — Assigns the nearest available radiographer to reduce patient wait time
5. Machine availability — Ensures required equipment is accessible
6. Severity priority — Urgent and critical cases are prioritized

The scheduler runs automatically when new cases are created, but administrators can override assignments manually.`,
    actions: [{ label: 'Open AI Scheduler', route: '/ai-scheduler' }],
    mascotState: 'scheduling',
  };
}

// ---------------------------------------------------------------------------
// Handler: Waiting Patients
// ---------------------------------------------------------------------------
function handleWaitingPatients(ctx: CopilotContext): ReturnType<typeof generateCopilotResponse> {
  const waitingCases = ctx.cases
    .filter(c => c.status === 'SCHEDULED' || c.status === 'CREATED')
    .map(c => ({
      ...c,
      waitMinutes: Math.round((Date.now() - new Date(c.createdAt).getTime()) / 60000),
    }))
    .sort((a, b) => b.waitMinutes - a.waitMinutes);

  if (waitingCases.length === 0) {
    return { text: 'No patients are currently waiting for their examination. All scheduled cases have been processed or are in progress.', mascotState: 'success' };
  }

  const lines = [`${waitingCases.length} patient(s) are currently waiting:\n`];
  waitingCases.slice(0, 7).forEach(c => {
    const hrs = Math.floor(c.waitMinutes / 60);
    const mins = c.waitMinutes % 60;
    const timeStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
    lines.push(`- ${c.patientName} (${c.caseNumber}) — waiting ${timeStr}, ${c.scanType}${c.severity ? ', ' + c.severity : ''}`);
  });

  if (waitingCases.length > 7) {
    lines.push(`\n...and ${waitingCases.length - 7} more.`);
  }

  const longWait = waitingCases.filter(c => c.waitMinutes > 120);
  if (longWait.length > 0) {
    lines.push(`\n${longWait.length} patient(s) have been waiting longer than 2 hours.`);
  }

  return {
    text: lines.join('\n'),
    actions: [{ label: 'View Cases', route: '/cases' }],
    mascotState: longWait.length > 0 ? 'attention' : 'speaking',
  };
}

// ---------------------------------------------------------------------------
// Handler: Pending Reports
// ---------------------------------------------------------------------------
function handlePendingReports(ctx: CopilotContext): ReturnType<typeof generateCopilotResponse> {
  const pendingReports = ctx.reports.filter(r => r.status === 'draft');
  const scannedNoReport = ctx.cases.filter(c => c.status === 'SCANNED');

  const lines: string[] = [];
  if (scannedNoReport.length > 0) {
    lines.push(`${scannedNoReport.length} scanned case(s) are awaiting radiologist review and reporting.`);
  }
  if (pendingReports.length > 0) {
    lines.push(`${pendingReports.length} draft report(s) are in progress but not yet signed off.`);
  }
  if (lines.length === 0) {
    lines.push('All reports are up to date. No pending reviews or unsigned drafts.');
  }

  return {
    text: lines.join('\n\n'),
    actions: [
      { label: 'Review Queue', route: '/review-queue' },
      { label: 'Reporting', route: '/reporting' },
    ],
    mascotState: 'speaking',
  };
}

// ---------------------------------------------------------------------------
// Handler: Equipment / Fleet Status
// ---------------------------------------------------------------------------
function handleEquipmentStatus(ctx: CopilotContext): ReturnType<typeof generateCopilotResponse> {
  if (ctx.equipment.length === 0) {
    return { text: 'No mobile PACS vans are currently registered in the system.', mascotState: 'speaking' };
  }

  const deployed = ctx.equipment.filter(e => e.status === 'deployed');
  const idle = ctx.equipment.filter(e => e.status === 'idle');
  const maintenance = ctx.equipment.filter(e => e.status === 'maintenance');

  const lines = [`Fleet status (${ctx.equipment.length} total vehicle(s)):\n`];
  lines.push(`Deployed: ${deployed.length}`);
  lines.push(`Idle: ${idle.length}`);
  lines.push(`In maintenance: ${maintenance.length}`);

  deployed.forEach(v => {
    lines.push(`\n- ${v.name} (${v.plateNumber}) deployed at ${v.currentClinicName || 'N/A'}${v.assignedRadiographerName ? ', assigned to ' + v.assignedRadiographerName : ''}`);
  });

  return {
    text: lines.join('\n'),
    actions: [{ label: 'Fleet Management', route: '/fleet' }],
    mascotState: 'speaking',
  };
}

// ---------------------------------------------------------------------------
// Handler: Clinic Info
// ---------------------------------------------------------------------------
function handleClinicInfo(ctx: CopilotContext): ReturnType<typeof generateCopilotResponse> {
  const active = ctx.clinics.filter(c => c.status === 'active');

  if (active.length === 0) {
    return { text: 'No active clinics found in the system.', mascotState: 'speaking' };
  }

  const lines = [`${active.length} active clinic(s) registered:\n`];
  active.forEach(c => {
    lines.push(`- ${c.name} — ${c.address}`);
  });

  return {
    text: lines.join('\n'),
    actions: [{ label: 'Clinic Management', route: '/clinics' }],
    mascotState: 'speaking',
  };
}

// ---------------------------------------------------------------------------
// Proactive Insights Generator
// ---------------------------------------------------------------------------
export function getProactiveInsights(ctx: CopilotContext): ProactiveInsight[] {
  const insights: ProactiveInsight[] = [];

  // 1. Cases awaiting review
  const awaitingReview = ctx.cases.filter(c => c.status === 'SCANNED');
  if (awaitingReview.length >= 2) {
    insights.push({
      id: 'insight-review-pending',
      text: `${awaitingReview.length} examinations are waiting for radiologist review.`,
      severity: awaitingReview.length >= 5 ? 'warning' : 'info',
      action: { label: 'Review Cases', route: '/review-queue' },
    });
  }

  // 2. Long-waiting patients
  const longWaiting = ctx.cases
    .filter(c => (c.status === 'SCHEDULED' || c.status === 'CREATED'))
    .filter(c => (Date.now() - new Date(c.createdAt).getTime()) > 2 * 60 * 60 * 1000);
  if (longWaiting.length > 0) {
    insights.push({
      id: 'insight-long-wait',
      text: `${longWaiting.length} patient(s) have been waiting longer than expected.`,
      severity: 'warning',
      action: { label: 'View Cases', route: '/cases' },
    });
  }

  // 3. Unbalanced workload
  const radiographers = ctx.users.filter(u => u.role === 'Radiographer' && u.status === 'active' && u.leaveStatus !== 'On Leave');
  if (radiographers.length >= 2) {
    const workloads = radiographers.map(r =>
      ctx.cases.filter(c => c.radiographerId === r.id && c.status !== 'FINALIZED' && c.status !== 'CANCELLED').length
    );
    const maxW = Math.max(...workloads);
    const minW = Math.min(...workloads);
    if (maxW - minW > 3) {
      insights.push({
        id: 'insight-workload-unbalanced',
        text: 'Radiographer workload is currently unbalanced.',
        severity: 'info',
        action: { label: 'View Workload', route: '/scheduling' },
      });
    }
  }

  // 4. Critical findings
  const criticalUnacked = ctx.cases.filter(c => c.isCriticalFinding && !c.criticalFindingAcknowledged);
  if (criticalUnacked.length > 0) {
    insights.push({
      id: 'insight-critical-findings',
      text: `${criticalUnacked.length} critical red-flag finding(s) require urgent acknowledgement.`,
      severity: 'urgent',
      action: { label: 'Review', route: '/cases' },
    });
  }

  // 5. Unsigned reports
  const draftReports = ctx.reports.filter(r => r.status === 'draft');
  if (draftReports.length >= 3) {
    insights.push({
      id: 'insight-draft-reports',
      text: `${draftReports.length} draft reports are awaiting sign-off.`,
      severity: 'info',
      action: { label: 'View Reports', route: '/reporting' },
    });
  }

  return insights;
}

// ---------------------------------------------------------------------------
// Utility: Navigation matcher
// ---------------------------------------------------------------------------
function matchNavigation(q: string): NavEntry | null {
  // Specific navigation intent detection
  const navPhrases = ['where', 'how do i', 'navigate to', 'go to', 'take me to', 'open', 'find the', 'show me the page', 'where is', 'where can i'];
  const hasNavIntent = navPhrases.some(p => q.includes(p));
  if (!hasNavIntent) return null;

  let bestMatch: NavEntry | null = null;
  let bestScore = 0;

  for (const entry of NAVIGATION_MAP) {
    let score = 0;
    for (const kw of entry.keywords) {
      if (q.includes(kw)) {
        score += kw.split(' ').length; // Multi-word matches score higher
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = entry;
    }
  }

  return bestMatch;
}

// ---------------------------------------------------------------------------
// Utility: Medical query detection (safety boundary)
// ---------------------------------------------------------------------------
function detectMedicalQuery(q: string): boolean {
  const medicalTerms = [
    'diagnos', 'cancer', 'tumor', 'tumour', 'malignant', 'benign', 'fracture result',
    'interpret', 'what does the scan show', 'read the image', 'read the x-ray',
    'is it cancer', 'disease', 'prognosis', 'treatment plan', 'prescribe',
    'medication', 'dose for patient', 'what is wrong with', 'detect', 'pathology result',
  ];
  return medicalTerms.some(term => q.includes(term));
}

// ---------------------------------------------------------------------------
// Utility: Keyword matching
// ---------------------------------------------------------------------------
function matchesAny(q: string, keywords: string[]): boolean {
  return keywords.some(kw => q.includes(kw));
}

// ---------------------------------------------------------------------------
// Utility: Time-based greeting
// ---------------------------------------------------------------------------
function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
