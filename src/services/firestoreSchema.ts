/**
 * HealthGrid IQ — Canonical Firestore Database Architecture & Schema Documentation
 * 
 * ── CANONICAL FIRESTORE COLLECTIONS ──────────────────────────────────────────
 * 
 * 1. `users`
 *    - Purpose: User accounts & role credentials (MO, Radiographer, Radiologist, Admin).
 *    - Document ID format: `user-<role>-<id>`
 * 
 * 2. `clinics`
 *    - Purpose: Healthcare Centres & Mobile PACS locations.
 *    - Document ID format: `clinic-<id>`
 * 
 * 3. `patients`
 *    - Purpose: Patient demographic registry & MyKad NRIC records.
 *    - Document ID format: `pat-<timestamp>`
 * 
 * 4. `cases`
 *    - Purpose: Radiology referral cases (MOH Borang PER.SS-RA301 requests).
 *    - Document ID format: `case-<timestamp>`
 * 
 * 5. `reports`
 *    - Purpose: Diagnostic reports signed off by MO or Specialist Radiologist.
 *    - Document ID format: `rep-<timestamp>`
 * 
 * 6. `patient_requests`
 *    - Purpose: Patient record update & archiving intake requests.
 *    - Document ID format: `req-<timestamp>`
 * 
 * 7. `mobile_pacs_vans`
 *    - Purpose: Mobile PACS imaging fleet equipment status.
 *    - Document ID format: `van-<id>`
 * 
 * 8. `audit_logs`
 *    - Purpose: Immutable system activity audit trail logs.
 *    - Document ID format: `audit-<timestamp>`
 * 
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const FIRESTORE_COLLECTIONS = {
  USERS: 'users',
  CLINICS: 'clinics',
  PATIENTS: 'patients',
  CASES: 'cases',
  REPORTS: 'reports',
  PATIENT_REQUESTS: 'patient_requests',
  MOBILE_PACS_VANS: 'mobile_pacs_vans',
  AUDIT_LOGS: 'audit_logs',
} as const;

export interface FirestoreSchemaDoc {
  name: string;
  description: string;
  docIdPattern: string;
  fields: string[];
}

export const CANONICAL_SCHEMAS: FirestoreSchemaDoc[] = [
  {
    name: 'users',
    description: 'User accounts, roles & credentials',
    docIdPattern: 'user-<role>-<id>',
    fields: ['id', 'name', 'email', 'role', 'specialty', 'status', 'createdAt', 'leaveStatus', 'deploymentLocationId'],
  },
  {
    name: 'clinics',
    description: 'Healthcare Centres & Clinic Deployment Locations',
    docIdPattern: 'clinic-<id>',
    fields: ['id', 'name', 'address', 'latitude', 'longitude', 'phone', 'email', 'status'],
  },
  {
    name: 'patients',
    description: 'Patient Registry Demographics & MyKad NRIC',
    docIdPattern: 'pat-<timestamp>',
    fields: ['id', 'name', 'dob', 'gender', 'phone', 'email', 'address', 'nric', 'mrn', 'ethnicity', 'medicalHistory'],
  },
  {
    name: 'cases',
    description: 'MOH PER.SS-RA301 Radiology Referral Cases',
    docIdPattern: 'case-<timestamp>',
    fields: ['id', 'caseNumber', 'patientId', 'patientName', 'scanType', 'modality', 'severity', 'status', 'createdAt', 'routedToRole', 'isCriticalFinding', 'criticalFindingNote', 'criticalFindingAcknowledged'],
  },
  {
    name: 'reports',
    description: 'Finalized Diagnostic Reports',
    docIdPattern: 'rep-<timestamp>',
    fields: ['id', 'caseId', 'caseNumber', 'patientName', 'radiologistId', 'radiologistName', 'signedByRole', 'findings', 'impression', 'status', 'createdAt', 'signedAt'],
  },
  {
    name: 'patient_requests',
    description: 'Patient Record Transfer & Archive Intake',
    docIdPattern: 'req-<timestamp>',
    fields: ['id', 'patientId', 'patientName', 'mrn', 'requestType', 'requestedBy', 'requestedByRole', 'dateSubmitted', 'status', 'remarks'],
  },
  {
    name: 'mobile_pacs_vans',
    description: 'Mobile PACS Equipment & Van Fleet',
    docIdPattern: 'van-<id>',
    fields: ['id', 'vanNumber', 'driverName', 'radiographerName', 'status', 'currentLocationName', 'latitude', 'longitude'],
  },
  {
    name: 'audit_logs',
    description: 'Immutable System Activity Audit Trail',
    docIdPattern: 'audit-<timestamp>',
    fields: ['id', 'userId', 'userName', 'userRole', 'action', 'target', 'details', 'timestamp'],
  },
];
