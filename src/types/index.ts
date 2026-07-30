// HealthGrid IQ — Domain Entity Types
// All timestamp fields use ISO 8601 strings (e.g. "2026-07-27T14:00:00Z").

export type UserRole = 'Radiographer' | 'Radiologist' | 'Medical Officer' | 'Radiology Department' | 'Administrator';

export type CaseStatus = 'CREATED' | 'SCHEDULED' | 'SCANNED' | 'REPORTED' | 'FINALIZED' | 'NO_SHOW' | 'CANCELLED';

export type LeaveStatus = 'Active' | 'On Leave';

export type PatientRequestType = 'Update' | 'Archive';

export type PatientRequestStatus = 'Pending' | 'Approved' | 'Rejected';

export type ReportStatus = 'draft' | 'final' | 'Verified / Signed Off';

export type EntityStatus = 'active' | 'inactive';

export type Gender = 'Male' | 'Female' | 'Other';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

// ---------------------------------------------------------------------------
// 4.1 User Entity
// ---------------------------------------------------------------------------
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  specialty?: string;
  status: EntityStatus;
  /** ISO 8601 timestamp */
  createdAt: string;
  shift?: string;
  leaveStatus?: LeaveStatus;
  deploymentLocationId?: string;
  mobilePacsAssignment?: string;
  supportedModalities?: string[];
  profilePicture?: string;
}

// ---------------------------------------------------------------------------
// 4.2 Clinic Entity
// ---------------------------------------------------------------------------
export interface Clinic {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
  email: string;
  status: EntityStatus;
  googlePlaceId?: string;
}

// ---------------------------------------------------------------------------
// 4.3 Patient Entity
// ---------------------------------------------------------------------------
export interface Patient {
  id: string;
  name: string;
  dob: string;
  gender: Gender;
  phone: string;
  email: string;
  address: string;
  latitude?: number;
  longitude?: number;
  googlePlaceId?: string;
  medicalHistory: string[];
  nric: string;
  mrn: string;
  emergencyContact?: string;
  preferredClinicId?: string;
  preferredClinicName?: string;
  clinicId?: string;
  clinicName?: string;
  /** MOH Form — Field 7 Etnik */
  ethnicity?: string;
}

// ---------------------------------------------------------------------------
// 4.4 Case Entity
// ---------------------------------------------------------------------------
export type SeverityLevel = 'Mild' | 'Moderate' | 'Severe' | 'Critical';

export type ExaminationSide = 'Left' | 'Right' | 'Bilateral' | 'N/A';

export interface ExaminationRequest {
  id: string;
  bodyPart: string;
  side?: ExaminationSide;
  viewsOrProtocol: string[];
  notes?: string;
}

// ---------------------------------------------------------------------------
// MOH Borang Permohonan Pemeriksaan Radiologi (PER.SS-RA301) — field types
// ---------------------------------------------------------------------------
export type MohYaTidak = 'Yes' | 'No' | 'Ya' | 'Tidak';
export type MohPaymentCategory = 'Government' | 'Private' | 'Self-Pay' | 'Other' | 'Kerajaan' | 'Swasta' | 'Bayar Sendiri' | 'Lain-lain';

export interface Case {
  id: string;
  caseNumber: string;
  patientId: string;
  patientName: string;
  /** Radiology Department staff member who registered the case. */
  registeredById?: string;
  registeredByName?: string;
  radiographerId?: string;
  radiographerName?: string;
  radiologistId?: string;
  radiologistName?: string;
  clinicId?: string;
  clinicName?: string;
  scanType: string;
  modality?: string;
  requestedExaminations?: ExaminationRequest[];
  /** The presenting indication or symptom; this is not a diagnosis. */
  indication?: string;
  bodyRegion?: string;
  severity?: SeverityLevel;
  incubationPeriod?: string;
  notes: string;
  status: CaseStatus;
  /** ISO 8601 */
  createdAt: string;
  scheduledAt?: string;
  scannedAt?: string;
  reportedAt?: string;
  finalizedAt?: string;
  images?: string[];

  // ── MOH Form § Clinical Screening (Fields 12–17) ──────────────────────────
  /** Field 12 — LMP date (ISO 8601 date string) */
  lmp?: string;
  /** Field 13 — Pregnant Status — REQUIRED when patient is female */
  isPregnant?: MohYaTidak;
  /** Field 14 — Asthma / Allergy / Contrast Media Reaction */
  hasAllergy?: MohYaTidak;
  /** Free-text allergy / reaction details (shown when hasAllergy === 'Yes' or 'Ya') */
  allergyDetails?: string;
  /** Field 15 — Mobile scanning required */
  hasMobileDevice?: MohYaTidak;
  /** Field 16 — Malaysian Citizen */
  isWarganegara?: MohYaTidak;
  /** Field 16 — Civil Servant */
  isPenjawatAwam?: MohYaTidak;
  /** Field 16 — Full Patient Paying (FPP) */
  isFpp?: MohYaTidak;
  /** Field 16 — Payment Category */
  paymentCategory?: MohPaymentCategory;
  /** Field 17 — Renal Function test date (ISO 8601) */
  renalFunctionDate?: string;
  /** Field 17 — Creatinine value */
  creatinine?: string;
  /** Field 17 — eGFR value */
  egfr?: string;

  // ── MOH Form § Clinical Notes ─────────────────────────────────────────────
  /** Clinical Notes block capturing patient presentation, history, and notes */
  ringkasanKlinikal?: string;

  // ── MOH Form § Contrast Media (Section *22) ──────────────────────────────
  /** Whether contrast media is required for this examination */
  contrastMediaRequired?: boolean;
  /** Jenama (brand/name) of contrast media */
  contrastMediaName?: string;
  /** Isipadu Media Kontras in ml */
  contrastMediaVolumeMl?: number;

  // ── MOH Form § Paparan Imej (Section 19) ─────────────────────────────────
  /** Number of film images produced */
  bilanganFilem?: number;
  /** Number of CD/DVD copies produced */
  bilanganCdDvd?: number;

  // ── MOH Form § Faktor Dedahan — Radiation Dose (Section 20) ──────────────
  /** Peak kilovoltage */
  doseKvp?: number;
  /** Milliampere-seconds */
  doseMas?: number;
  /** Dose Radiasi (mSv) */
  dosRadiasi?: number;

  // ── MOH Form § Radiographer Comments ─────────────────────────────────────
  /** Komen — radiographer's operational comments */
  komen?: string;

  // ── MOH Form § Kegunaan Pejabat — Office Use (Admin fills) ───────────────
  /** ISO 8601 — Waktu Terima (time received) */
  officeWaktuTerima?: string;
  /** ISO 8601 — Waktu Selesai (time completed) */
  officeWaktuSelesai?: string;
  /** Juru X-Ray — name of X-Ray technologist */
  officeJuruXRay?: string;
  /** Tarikh Pemeriksaan — exam date (ISO 8601 date string) */
  officeTarikhPemeriksaan?: string;
  /**
   * No. Pemeriksaan — maps to caseNumber for now.
   * May be overridden by individual healthcare centres.
   */
  officeNoPemeriksaan?: string;
  /** ISO 8601 — Tarikh Pemeriksaan (appointment date stored separately) */
  officeTarikhAppointment?: string;
  /** Masa temujanji */
  officeMasaAppointment?: string;

  // ── No-Show, Cancellation & Reschedule Exception Tracking ──────────────
  /** Reason category when patient does not attend or cancels */
  noShowReason?: string;
  cancellationReason?: string;
  cancellationNotes?: string;
  /** Audit history log of reschedule events */
  rescheduleHistory?: Array<{
    previousDate?: string;
    previousTime?: string;
    newDate?: string;
    newTime?: string;
    reason?: string;
    updatedAt: string;
    updatedByName?: string;
  }>;

  /** Routing target set by Radiographer upon scan completion */
  routedToRole?: 'Medical Officer' | 'Radiologist';
  secondOpinionRequested?: boolean;
  secondOpinionNotes?: string;
  referringDoctorId?: string;
  referringDoctorName?: string;

  /** Escalation tracking from MO to Specialist Radiologist */
  isEscalated?: boolean;
  escalationReason?: string;
  escalatedBy?: string;
  escalatedAt?: string;

  /** Critical Finding Emergency Alert (Red Flag) */
  isCriticalFinding?: boolean;
  criticalFindingNote?: string;

  /** @deprecated Read-only support for cases created before the symptom workflow. */
  disease?: string;
  /** @deprecated Read-only support for cases created before radiology registration. */
  doctorId?: string;
  /** @deprecated */
  doctorName?: string;
}

// ---------------------------------------------------------------------------
// 4.5 Report Entity
// ---------------------------------------------------------------------------
export interface Report {
  id: string;
  caseId: string;
  caseNumber: string;
  patientName: string;
  radiologistId: string;
  radiologistName: string;
  signedByRole?: UserRole;
  findings: string;
  impression: string;
  suggestions?: string;
  isCriticalFinding?: boolean;
  criticalFindingNote?: string;
  status: ReportStatus;
  /** ISO 8601 */
  createdAt: string;
  signedAt?: string;
  imageKeys?: string[];
}

// ---------------------------------------------------------------------------
// 4.6 PatientRequest Entity
// ---------------------------------------------------------------------------
export interface PatientRequest {
  id: string;
  patientId: string;
  patientName: string;
  mrn: string;
  requestType: PatientRequestType;
  requestedBy: string;
  requestedById: string;
  requestedByRole: string;
  /** ISO 8601 */
  dateSubmitted: string;
  requestedChanges: Record<string, unknown>;
  reason: string;
  status: PatientRequestStatus;
  approverName?: string;
  approvedOrRejectedAt?: string;
  remarks: string;
}

// ---------------------------------------------------------------------------
// 4.7 AuditLog Entity
// ---------------------------------------------------------------------------
export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  target: string;
  details: string;
  /** ISO 8601 */
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Mobile PACS Van Entity (Fleet Management)
// ---------------------------------------------------------------------------
export interface MobilePacsVan {
  id: string;
  name: string;
  plateNumber: string;
  equipment: string[];
  currentClinicId?: string;
  currentClinicName?: string;
  latitude: number;
  longitude: number;
  status: 'deployed' | 'maintenance' | 'idle';
  assignedRadiographerId?: string;
  assignedRadiographerName?: string;
}

// ---------------------------------------------------------------------------
// Radiographer scheduling profile
// ---------------------------------------------------------------------------
export interface RadioScheduleSlot {
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  booked: boolean;
  caseId?: string;
}

export interface RadioScheduleProfile {
  userId: string;
  userName: string;
  deployedClinicId: string;
  deployedClinicName: string;
  supportedModalities: string[];
  currentCaseload: number;
  maxDailyCaseload: number;
  leaveStatus: LeaveStatus;
  shift: string;
  schedule: RadioScheduleSlot[];
}

// ---------------------------------------------------------------------------
// Route info between two points
// ---------------------------------------------------------------------------
export interface RouteInfo {
  distanceKm: number;
  durationMinutes: number;
  polylineCoords: [number, number][];
  durationInTraffic?: number;
}

// ---------------------------------------------------------------------------
// IAS Scheduling Job
// ---------------------------------------------------------------------------
export type IasJobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface IasSchedulingJob {
  id: string;
  caseId: string;
  caseNumber: string;
  patientId: string;
  patientName: string;
  patientLat?: number;
  patientLon?: number;
  scanType: string;
  severity?: SeverityLevel;
  /** ISO 8601 */
  requestedAt: string;
  status: IasJobStatus;
  assignedRadiographerId?: string;
  assignedRadiographerName?: string;
  assignedClinicId?: string;
  assignedClinicName?: string;
  assignedVanId?: string;
  scheduledAt?: string;
  distanceKm?: number;
  estimatedDriveMinutes?: number;
  routePolyline?: [number, number][];
  optimizationScore?: number;
  rejectionReason?: string;
  processedAt?: string;
}

// ---------------------------------------------------------------------------
// Announcement Entity
// ---------------------------------------------------------------------------
export interface Announcement {
  id: string;
  title: string;
  content: string;
  severity: 'info' | 'warning' | 'critical';
  targetRoles: UserRole[];
  createdBy: string;
  createdByName: string;
  /** ISO 8601 */
  createdAt: string;
  expiresAt?: string;
  pinned?: boolean;
}

// ---------------------------------------------------------------------------
// Notification Entity
// ---------------------------------------------------------------------------
export interface Notification {
  id: string;
  /** Firebase Auth UID of the recipient */
  userId: string;
  title: string;
  message: string;
  read: boolean;
  /** ISO 8601 */
  createdAt: string;
  type: NotificationType;
  /** Optional link to the case that triggered this notification */
  caseId?: string;
}

// ---------------------------------------------------------------------------
// Session Entity (used by cleanupExpiredSessions Cloud Function)
// ---------------------------------------------------------------------------
export interface Session {
  id: string;
  userId: string;
  /** ISO 8601 */
  createdAt: string;
  /** ISO 8601 — updated on every authenticated request */
  lastActivity: string;
}

// ---------------------------------------------------------------------------
// Comment Entity (case communication thread — backed by Firestore /comments)
// ---------------------------------------------------------------------------
export interface Comment {
  id: string;
  caseId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  message: string;
  /** ISO 8601 */
  timestamp: string;
}
