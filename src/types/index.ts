// HealthGrid IQ - Domain Entity Types

export type UserRole = 'Doctor' | 'Radiographer' | 'Radiologist' | 'Radiology Department' | 'Administrator';

export type CaseStatus = 'CREATED' | 'SCHEDULED' | 'SCANNED' | 'REPORTED' | 'FINALIZED';

export type LeaveStatus = 'Active' | 'On Leave';

export type PatientRequestType = 'Update' | 'Archive';

export type PatientRequestStatus = 'Pending' | 'Approved' | 'Rejected';

export type ReportStatus = 'draft' | 'final' | 'Verified / Signed Off';

export type EntityStatus = 'active' | 'inactive';

export type Gender = 'Male' | 'Female' | 'Other';

// 4.1 User Entity
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  specialty?: string;
  status: EntityStatus;
  createdAt: string;
  shift?: string;
  leaveStatus?: LeaveStatus;
  deploymentLocationId?: string;
  mobilePacsAssignment?: string;
  supportedModalities?: string[];
  profilePicture?: string;
}

// 4.2 Clinic Entity
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

// 4.3 Patient Entity
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
}

// 4.4 Case Entity
export type SeverityLevel = 'Mild' | 'Moderate' | 'Severe' | 'Critical';

export interface Case {
  id: string;
  caseNumber: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  radiographerId?: string;
  radiographerName?: string;
  radiologistId?: string;
  radiologistName?: string;
  clinicId?: string;
  clinicName?: string;
  scanType: string;
  disease?: string;
  bodyRegion?: string;
  severity?: SeverityLevel;
  incubationPeriod?: string;
  notes: string;
  status: CaseStatus;
  createdAt: string;
  scheduledAt?: string;
  scannedAt?: string;
  reportedAt?: string;
  finalizedAt?: string;
  images?: string[];
}

// 4.5 Report Entity
export interface Report {
  id: string;
  caseId: string;
  caseNumber: string;
  patientName: string;
  radiologistId: string;
  radiologistName: string;
  findings: string;
  impression: string;
  suggestions?: string;
  status: ReportStatus;
  createdAt: string;
  signedAt?: string;
  imageKeys?: string[]; // IndexedDB keys for persisted images
}

// 4.6 PatientRequest Entity
export interface PatientRequest {
  id: string;
  patientId: string;
  patientName: string;
  mrn: string;
  requestType: PatientRequestType;
  requestedBy: string;
  requestedById: string;
  requestedByRole: string;
  dateSubmitted: string;
  requestedChanges: Record<string, unknown>;
  reason: string;
  status: PatientRequestStatus;
  approverName?: string;
  approvedOrRejectedAt?: string;
  remarks: string;
}

// 4.7 AuditLog Entity
export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  target: string;
  details: string;
  timestamp: string;
}

// Mobile PACS Van Entity (Fleet Management)
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

// Radiographer scheduling profile (extends User with scheduling metadata)
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

// Route info between two points
export interface RouteInfo {
  distanceKm: number;
  durationMinutes: number;
  polylineCoords: [number, number][];
}

// Notification type
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  type: 'info' | 'success' | 'warning' | 'error';
}
