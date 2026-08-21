// HealthGrid IQ — Domain Entity Types
// All timestamp fields use ISO 8601 strings (e.g. "2026-07-27T14:00:00Z").

export type UserRole = 
  | 'Super Admin'
  | 'BEMS Officer'
  | 'Administrator'
  | 'Medical Officer'
  | 'Radiographer'
  | 'Radiologist'
  // Transitional legacy aliases for backward compatibility during Phase 1
  | 'BEMS'
  | 'BEMZ'
  | 'Public Hospital Admin'
  | 'Public Hospital Radiographer'
  | 'Private Hospital Admin'
  | 'Private Hospital Radiographer'
  | 'Equipment Marketplace';

export type CaseStatus = 
  // ── Normal Workflow Statuses ──────────────────────────────────────────────
  | 'CASE_CREATED'
  | 'SCHEDULING'
  | 'RADIOGRAPHER_ASSIGNED'
  | 'READY_FOR_SCAN'
  | 'SCANNING'
  | 'IMAGES_AVAILABLE'
  | 'RADIOLOGIST_REVIEW'
  | 'MO_REVIEW'
  | 'REPORT_SUBMITTED'
  | 'COMPLETED'
  // ── BEMS & External Imaging Exception Statuses ───────────────────────────
  | 'MACHINE_UNAVAILABLE'
  | 'EXTERNAL_REFERRAL_PENDING'
  | 'BEMZ_REVIEW'
  | 'FACILITY_SELECTED'
  | 'EXTERNAL_RADIOGRAPHER_ASSIGNED'
  | 'PRIVATE_HOSPITAL_ADMIN_REVIEW'
  | 'EXTERNAL_SCANNING'
  | 'EXTERNAL_IMAGES_AVAILABLE'
  // ── Legacy Aliases & Exceptions ──────────────────────────────────────────
  | 'CREATED'
  | 'SCHEDULED'
  | 'SCANNED'
  | 'REPORTED'
  | 'FINALIZED'
  | 'NO_SHOW'
  | 'CANCELLED';

export type LeaveStatus = 'Active' | 'On Leave';

export type PatientRequestType = 'Update' | 'Archive';

export type PatientRequestStatus = 'Pending' | 'Approved' | 'Rejected';

export type ReportStatus = 'draft' | 'final' | 'Verified / Signed Off';

export type EntityStatus = 'active' | 'inactive';

export type Gender = 'Male' | 'Female' | 'Other';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

// ---------------------------------------------------------------------------
// 4.0 Organization & Healthcare Center Entities
// ---------------------------------------------------------------------------
export type HealthcareOrganizationType = 
  | 'Klinik Kesihatan' 
  | 'Public Hospital' 
  | 'Private Hospital';

export interface HealthcareOrganization {
  id: string; // e.g. "org-moh-selangor", "org-kpj-group", "org-sunway-group"
  name: string; // e.g. "Kementerian Kesihatan Malaysia (Selangor)", "KPJ Healthcare Berhad"
  type: HealthcareOrganizationType;
  status: EntityStatus;
  createdAt: string;
}

export interface HealthcareCenter {
  id: string; // e.g. "clinic-001", "clinic-002", "clinic-005"
  organizationId?: string; // Links to HealthcareOrganization.id
  organizationType?: HealthcareOrganizationType; // Source of truth for facility classification
  name: string; // e.g. "Klinik Kesihatan Bestari Jaya", "KPJ Damansara Specialist Hospital"
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
  fax?: string;
  email?: string;
  operatingHours?: string;
  status: EntityStatus;
  googlePlaceId?: string;
  supportedModalities?: string[];
  maxDailyCapacity?: number;
}

/** @deprecated Transitional backward-compatibility alias for HealthcareCenter */
export type Clinic = HealthcareCenter;

// ---------------------------------------------------------------------------
// 4.1 User Entity
// ---------------------------------------------------------------------------
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  password?: string;
  specialty?: string;
  status: EntityStatus;
  /** ISO 8601 timestamp */
  createdAt: string;
  
  /** 
   * Primary organization classification ('Klinik Kesihatan' | 'Public Hospital' | 'Private Hospital').
   * Undefined for platform-level roles (Super Admin, BEMS Officer).
   */
  organizationType?: HealthcareOrganizationType;
  organizationId?: string;

  /** 
   * Primary organizational affiliation (Source of Truth). 
   * Undefined for platform-level roles (Super Admin, BEMS Officer).
   */
  healthcareCenterId?: string;
  healthcareCenterName?: string;

  /** @deprecated Transitional backward-compatibility alias for healthcareCenterId. */
  deploymentLocationId?: string;

  shift?: string;
  shiftStatus?: 'ACTIVE' | 'COMPLETED' | 'STANDBY';
  shiftCompletedAt?: string;
  leaveStatus?: LeaveStatus;
  mobilePacsAssignment?: string;
  supportedModalities?: string[];
  profilePicture?: string;
  mmcNumber?: string;
  qualification?: string;
  phone?: string;
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
  /** Registration Origin & Attribution */
  registeredById?: string;
  registeredByName?: string;
  registeredByRole?: string;
  registeredAtCenterId?: string;
  registeredAtCenterName?: string;
  registeredAtOrgType?: HealthcareOrganizationType;
  registeredAtOrgId?: string;
  primaryClinicId?: string;
  primaryClinicName?: string;
  /** MOH Form — Field 7 Etnik */
  ethnicity?: string;
  /** MOH Form — Field 16 Status Bayaran (Citizenship: Malaysian / Non-Malaysian) */
  isWarganegara?: MohYaTidak;
  /** MOH Form — Field 16 Status Bayaran (Penjawat Awam: Yes / No) */
  isPenjawatAwam?: MohYaTidak;
  /** MOH Form — Field 16 Status Bayaran (Full Paying Patient: Yes / No) */
  isFpp?: MohYaTidak;
  /** MOH Form — Field 16 Payment Category (Auto-calculated) */
  paymentCategory?: MohPaymentCategory;
  /** MOH Form — Field 14 Asma */
  hasAsthma?: MohYaTidak;
  /** MOH Form — Field 14 Reaksi Media Kontras */
  previousContrastReaction?: MohYaTidak;
  previousContrastDetails?: string;
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
  /** MOH Field 10 — Wad / Klinik / A&E / RH */
  wardOrClinic?: string;
  /** MOH Field 11 — Disiplin (Requesting Specialty / Department) */
  disiplin?: string;
  /** Staff member / clinician who registered the case. */
  registeredById?: string;
  registeredByName?: string;
  registeredByRole?: string;
  radiographerId?: string;
  radiographerName?: string;
  radiologistId?: string;
  radiologistName?: string;
  /** Originating Healthcare Center ID (Source of Truth for Case Ownership). Links to HealthcareCenter.id */
  originatingCenterId?: string;
  originatingCenterName?: string;
  originatingOrganizationType?: HealthcareOrganizationType;
  originatingOrganizationId?: string;
  /** @deprecated Transitional backward-compatibility alias for originatingCenterId */
  clinicId?: string;
  /** @deprecated Transitional backward-compatibility alias for originatingCenterName */
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
  /** Field 14 — Asthma */
  hasAsthma?: MohYaTidak;
  /** Field 14 — Allergy */
  hasAllergy?: MohYaTidak;
  /** Free-text allergy / reaction details (shown when hasAllergy === 'Yes' or 'Ya') */
  allergyDetails?: string;
  /** Field 14 — Previous Contrast Reaction */
  previousContrastReaction?: MohYaTidak;
  previousContrastDetails?: string;
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

  // ── Radiographer Clinical Findings (pre-read notes) ───────────────────────
  /** Radiographer's preliminary image findings / observations */
  radiographerFindings?: string;
  /** Radiographer's preliminary impression / technical note */
  radiographerImpression?: string;


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

  /** Escalation tracking from MO to Specialist Radiologist (In-House 2nd Opinion) */
  isEscalated?: boolean;
  escalationReason?: string;
  escalatedBy?: string;
  escalatedAt?: string;
  assignedRadiologistId?: string;
  assignedRadiologistName?: string;
  preliminaryFindings?: string;
  preliminaryImpression?: string;
  preliminarySuggestions?: string;
  preliminaryAuthorId?: string;
  preliminaryAuthorName?: string;
  preliminaryAuthorRole?: string;
  preliminarySubmittedAt?: string;

  /** Critical Finding Emergency Alert (Red Flag) */
  isCriticalFinding?: boolean;
  criticalFindingNote?: string;
  criticalFindingAcknowledged?: boolean;
  criticalFindingAcknowledgedAt?: string;

  // ── Initial MO Case Ownership (Core Business Rule) ─────────────────────────
  /**
   * The INITIAL MEDICAL OFFICER remains the owner of the original patient case
   * throughout the entire process. External hospitals DO NOT create a new clinical case.
   * They provide imaging service only.
   */
  initialMoId?: string;
  initialMoName?: string;

  // ── BEMS & External Imaging Referral Tracking ──────────────────────────────
  externalReferralId?: string;
  externalReferral?: ExternalImagingRequest;
  machineIssue?: {
    reason: MachineIssueReason;
    reportedAt: string;
    notes?: string;
    reportedById?: string;
    reportedByName?: string;
  };
  externalFacilityType?: 'Public Hospital' | 'Private Hospital';
  externalFacilityId?: string;
  externalFacilityName?: string;
  /** Alias for externalFacilityId */
  assignedFacilityId?: string;
  assignedFacilityName?: string;
  externalRadiographerId?: string;
  externalRadiographerName?: string;
  externalAdminId?: string;
  externalAdminName?: string;

  /** Linked physical machine ID used or failed */
  equipmentId?: string;
  /** Linked BEMS incident ticket if equipment breakdown occurred */
  incidentId?: string;

  /** POC Milestone Timestamps (ISO 8601) */
  lifecycleTimestamps?: {
    caseCreatedAt: string;
    scheduledAt?: string;
    patientArrivedAt?: string;
    scanStartedAt?: string;
    scanCompletedAt?: string;
    radiologistReviewStartedAt?: string;
    reportSignedAt?: string;
    moReviewCompletedAt?: string;
  };

  /** @deprecated Read-only support for cases created before the symptom workflow. */
  disease?: string;
  /** @deprecated Read-only support for cases created before radiology registration. */
  doctorId?: string;
  /** @deprecated */
  doctorName?: string;
}

// ---------------------------------------------------------------------------
// 4.4.1 External Imaging Request & BEMS Domain Entity
// ---------------------------------------------------------------------------
export type ExternalFacilityType = 'PUBLIC_HOSPITAL' | 'PRIVATE_HOSPITAL';
export type MachineIssueReason = 'Broken' | 'Unavailable' | 'Maintenance' | 'Calibration' | 'Power Failure' | 'Detector Fault' | 'Other';

export interface ExternalImagingRequest {
  id: string;
  caseId: string;
  caseNumber: string;
  patientId: string;
  patientName: string;
  originatingCenterId?: string;
  originatingCenterName?: string;
  /** @deprecated Transitional backward-compatibility alias for originatingCenterId */
  originatingClinicId?: string;
  /** @deprecated Transitional backward-compatibility alias for originatingCenterName */
  originatingClinicName?: string;
  requestingRadiographerId: string;
  requestingRadiographerName: string;
  machineIssueReason: MachineIssueReason;
  machineIssueDetails?: string;
  submittedAt: string;
  status: 
    | 'PENDING_BEMZ'
    | 'BEMZ_REVIEWING'
    | 'FACILITY_SELECTED'
    | 'PRIVATE_ADMIN_REVIEW'
    | 'EXTERNAL_RADIOGRAPHER_ASSIGNED'
    | 'SCANNING'
    | 'SCANNED'
    | 'COMPLETED'
    | 'REJECTED';
  facilityType?: ExternalFacilityType;
  assignedFacilityId?: string;
  assignedFacilityName?: string;
  assignedHospitalAdminId?: string;
  assignedHospitalAdminName?: string;
  assignedRadiographerId?: string;
  assignedRadiographerName?: string;
  bemzOfficerId?: string;
  bemzOfficerName?: string;
  bemzNotes?: string;
  bemzProcessedAt?: string;
  externalImages?: string[];
  externalImageKeys?: string[];
  scannedAt?: string;
  scanNotes?: string;
  modality?: string;
  urgency?: 'Routine' | 'Urgent' | 'Emergency';
}

// ---------------------------------------------------------------------------
// 4.4.2 Operational Modalities & Physical Facility Equipment
// ---------------------------------------------------------------------------
export type ImagingModality = 
  | 'X-Ray' 
  | 'CT' 
  | 'MRI' 
  | 'Ultrasound' 
  | 'Mammography' 
  | 'Fluoroscopy' 
  | 'PET-CT'
  | 'Mobile PACS';

export type EquipmentOperationalStatus = 
  | 'Available' 
  | 'In Use' 
  | 'In Transit' 
  | 'Maintenance' 
  | 'Offline' 
  | 'Retired';

export interface FacilityEquipment {
  id: string; // e.g. "eq-kk-ijok-xray-01", "eq-htk-ct-01"
  healthcareCenterId: string; // Source of truth for facility location
  healthcareCenterName: string;
  name: string; // e.g. "Siemens Multix Impact Digital X-Ray"
  modality: ImagingModality;
  modelNumber: string;
  manufacturer: string;
  serialNumber: string;
  roomOrLocation: string; // e.g. "Bilik X-Ray 1", "CT Suite 1"
  status: EquipmentOperationalStatus;
  installationDate?: string;
  lastMaintenanceDate?: string;
  nextMaintenanceDue?: string;
  currentIncidentId?: string;
  operationalNotes?: string;
}

// ---------------------------------------------------------------------------
// 4.4.3 BEMS Incident Entity
// ---------------------------------------------------------------------------
export type BemsIncidentStatus = 
  | 'REPORTED' 
  | 'TRIAGED' 
  | 'WORK_ORDER_ISSUED' 
  | 'IN_MAINTENANCE' 
  | 'RESOLVED' 
  | 'CLOSED';

export type BemsIncidentSeverity = 'Routine' | 'Urgent' | 'Critical Breakdown';

export interface BemsIncident {
  id: string; // e.g. "inc-2026-001"
  incidentNumber: string; // e.g. "INC-20260821-01"
  equipmentId: string; // Links to FacilityEquipment.id
  equipmentName: string;
  modality: ImagingModality;
  healthcareCenterId: string; // Originating facility of broken machine
  healthcareCenterName: string;
  reportedByUserId: string;
  reportedByUserName: string;
  reportedByUserRole: UserRole;
  issueReason: MachineIssueReason;
  issueDetails: string;
  severity: BemsIncidentSeverity;
  status: BemsIncidentStatus;
  associatedCaseId?: string; // Case impacted if breakdown occurred during exam
  bemsOfficerId?: string;
  bemsOfficerName?: string;
  workOrderNumber?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolutionNotes?: string;
}

// ---------------------------------------------------------------------------
// 4.4.4 First-Class Cross-Organization Referral Entity
// ---------------------------------------------------------------------------
export type CrossOrgReferralStatus = 
  | 'REQUESTED'
  | 'BEMS_REVIEW'
  | 'ALLOCATED'
  | 'DISPATCHED'
  | 'ACCEPTED'
  | 'RADIOGRAPHER_ASSIGNED'
  | 'IMAGING_COMPLETED'
  | 'RADIOLOGIST_REPORTING'
  | 'REPORT_SIGNED'
  | 'RETURNED'
  | 'CLOSED'
  | 'REJECTED'
  | 'CANCELLED';

export interface CrossOrganizationReferral {
  id: string; // e.g. "ref-2026-001"
  referralNumber: string; // e.g. "REF-20260821-001"
  caseId: string;
  caseNumber: string;
  patientId: string;
  patientName: string;
  modality: ImagingModality;
  urgency: 'Routine' | 'Urgent' | 'Emergency';
  
  // Originating Entity (Clinical Owner)
  originatingCenterId: string;
  originatingCenterName: string;
  originatingOrganizationId?: string;
  requestedByUserId: string;
  requestedByUserName: string;
  requestedByUserRole: UserRole;
  referralReason: string;
  incidentId?: string; // If triggered by equipment breakdown

  // Receiving Entity (Service Provider)
  receivingCenterId?: string;
  receivingCenterName?: string;
  receivingOrganizationId?: string;
  receivingFacilityType?: HealthcareOrganizationType;

  // BEMS Governance
  bemsOfficerId?: string;
  bemsOfficerName?: string;
  bemsAllocationNotes?: string;

  // Receiving Facility Actors
  receivingAdminId?: string;
  receivingAdminName?: string;
  assignedRadiographerId?: string;
  assignedRadiographerName?: string;
  assignedRadiologistId?: string;
  assignedRadiologistName?: string;

  // Clinical & Workflow Artifacts
  uploadedImageKeys?: string[];
  reportId?: string;
  status: CrossOrgReferralStatus;
  rejectionReason?: string;

  // POC Measurement Milestones (ISO 8601 Timestamps)
  timestamps: {
    requestedAt: string;
    bemsAllocatedAt?: string;
    dispatchedAt?: string;
    acceptedAt?: string;
    radiographerAssignedAt?: string;
    imagingStartedAt?: string;
    imagingCompletedAt?: string;
    radiologistAssignedAt?: string;
    reportStartedAt?: string;
    reportSignedAt?: string;
    returnedToOriginAt?: string;
    closedAt?: string;
  };
}

// ---------------------------------------------------------------------------
// 4.4.5 Routing Recommendation Entity (Decision Support)
// ---------------------------------------------------------------------------
export interface RoutingRecommendation {
  facilityId: string;
  facilityName: string;
  organizationType: HealthcareOrganizationType;
  distanceKm: number;
  estimatedDriveMinutes: number;
  availableEquipmentCount: number;
  equipmentNames: string[];
  activeCaseload: number;
  maxDailyCapacity: number;
  capacityUtilizationPercent: number;
  availableRadiographersCount: number;
  radiographerNames: string[];
  suitabilityScore: number; // 0 to 100
  scoreBreakdown: {
    modalityMatch: boolean;
    equipmentScore: number;
    distanceScore: number;
    capacityScore: number;
    staffScore: number;
  };
  recommendationReason: string;
}

// ---------------------------------------------------------------------------
// 4.5 Report Entity & Addendum
// ---------------------------------------------------------------------------
export interface ReportAddendum {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  content: string;
  reason?: string;
  /** ISO 8601 */
  createdAt: string;
  signedAt: string;
}

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
  /** Short alphanumeric token for patient-facing report access via QR / secure link */
  reportToken?: string;
  mmcNumber?: string;
  qualification?: string;
  /** Official clinical addendums / amendments appended after report finalization */
  addendums?: ReportAddendum[];
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

// ---------------------------------------------------------------------------
// Equipment Marketplace Domain Types
// ---------------------------------------------------------------------------
export * from './marketplace';

