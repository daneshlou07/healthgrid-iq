import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { getFirestoreDb, isFirebaseConfigured } from './firebase';
import type {
  User,
  Clinic,
  HealthcareOrganization,
  Patient,
  Case,
  Report,
  PatientRequest,
  AuditLog,
  MobilePacsVan,
  RadioScheduleProfile,
  RadioScheduleSlot,
  FacilityEquipment,
  BemsIncident,
  CrossOrganizationReferral,
  CaseStatus,
  PatientRequestStatus,
  ExternalImagingRequest,
  HealthcareOrganizationType,
  UserRole,
} from '../types';

// Generates dynamic schedule time-slots for radiographer appointment booking
export function generateScheduleSlots(bookedSlots: { date: string; time: string; caseId: string }[] = []): RadioScheduleSlot[] {
  const slots: RadioScheduleSlot[] = [];
  const today = new Date();
  for (let d = 0; d < 14; d++) {
    const date = new Date(today);
    date.setDate(today.getDate() + d);
    const dateStr = date.toISOString().slice(0, 10);
    // Slots from 08:00 to 17:00, each 1 hour
    for (let h = 8; h < 17; h++) {
      const startTime = `${String(h).padStart(2, '0')}:00`;
      const endTime = `${String(h + 1).padStart(2, '0')}:00`;
      const booked = bookedSlots.find((s) => s.date === dateStr && s.time === startTime);
      slots.push({
        date: dateStr,
        startTime,
        endTime,
        booked: !!booked,
        caseId: booked?.caseId,
      });
    }
  }
  return slots;
}

/**
 * Resolves full multi-tenant healthcare center and organization type context
 * from the active user profile and known clinics collection.
 */
export function resolveUserFacilityContext(user: User | null, clinics: Clinic[] = []): {
  healthcareCenterId: string;
  healthcareCenterName: string;
  organizationType: HealthcareOrganizationType;
  organizationId: string;
} {
  if (!user) {
    return {
      healthcareCenterId: 'clinic-001',
      healthcareCenterName: 'Klinik Kesihatan Bestari Jaya',
      organizationType: 'Klinik Kesihatan',
      organizationId: 'org-moh-selangor',
    };
  }

  // 1. Resolve Center ID
  const centerId = user.healthcareCenterId || user.deploymentLocationId || 'clinic-001';

  // 2. Find matching Clinic / Healthcare Center
  const clinic =
    clinics.find((c) => c.id === centerId) ||
    clinics.find((c) => user.healthcareCenterName && c.name.toLowerCase() === user.healthcareCenterName.toLowerCase());

  // 3. Resolve Center Name
  const centerName = clinic?.name || user.healthcareCenterName || 'Klinik Kesihatan Bestari Jaya';

  // 4. Resolve Organization Type
  let orgType: HealthcareOrganizationType = user.organizationType || clinic?.organizationType || 'Klinik Kesihatan';
  if (!user.organizationType && !clinic?.organizationType) {
    const lower = centerName.toLowerCase();
    if (lower.includes('kpj') || lower.includes('sunway') || lower.includes('private') || lower.includes('specialist')) {
      orgType = 'Private Hospital';
    } else if (lower.includes('hospital') || lower.includes('hkl')) {
      orgType = 'Public Hospital';
    } else {
      orgType = 'Klinik Kesihatan';
    }
  }

  // 5. Resolve Organization ID
  const orgId =
    user.organizationId ||
    clinic?.organizationId ||
    (orgType === 'Klinik Kesihatan'
      ? 'org-moh-selangor'
      : orgType === 'Public Hospital'
      ? 'org-moh-tertiary'
      : 'org-private-group');

  return {
    healthcareCenterId: clinic?.id || centerId,
    healthcareCenterName: centerName,
    organizationType: orgType,
    organizationId: orgId,
  };
}

// Generate unique ID
function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ==================== ORGANIZATIONS ====================
export async function getOrganizations(): Promise<HealthcareOrganization[]> {
  const db = getFirestoreDb();
  if (db && isFirebaseConfigured()) {
    try {
      const snapshot = await getDocs(collection(db, 'organizations'));
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as HealthcareOrganization));
    } catch (e) {
      console.warn('Firestore getOrganizations warning:', e);
    }
  }
  return [];
}

// ==================== USERS ====================
export async function getUsers(): Promise<User[]> {
  let customUsers: User[] = [];
  try {
    const raw = localStorage.getItem('healthgrid_custom_users');
    if (raw) customUsers = JSON.parse(raw);
  } catch {}

  const db = getFirestoreDb();
  if (db && isFirebaseConfigured()) {
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      const existingUsers = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as User));
      
      const map = new Map<string, User>();
      existingUsers.forEach((u) => map.set(u.id, u));
      customUsers.forEach((u) => {
        if (!map.has(u.id)) map.set(u.id, u);
      });
      return Array.from(map.values());
    } catch (e) {
      console.warn('Firestore getUsers warning:', e);
    }
  }

  return customUsers;
}

export async function getUsersByRole(role: string): Promise<User[]> {
  const db = getFirestoreDb();
  if (db && isFirebaseConfigured()) {
    try {
      const q = query(collection(db, 'users'), where('role', '==', role));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as User));
    } catch (e) {
      console.warn('Firestore getUsersByRole warning:', e);
    }
  }
  const all = await getUsers();
  return all.filter((u) => u.role === role);
}

export async function saveUser(user: User): Promise<User> {
  const cleanUser: User = {
    ...user,
  };

  // 1. Save directly to Firestore database
  if (isFirebaseConfigured()) {
    try {
      const db = getFirestoreDb();
      if (db) {
        await setDoc(doc(db, 'users', user.id), cleanUser, { merge: true });
      }
    } catch (e) {
      console.error('Failed saving user to Firestore database:', e);
    }
  }

  // 2. Save user profile & password to localStorage for offline cache
  try {
    const existingCustom: User[] = JSON.parse(localStorage.getItem('healthgrid_custom_users') || '[]');
    const idx = existingCustom.findIndex((u) => u.id === user.id);
    if (idx !== -1) {
      existingCustom[idx] = cleanUser;
    } else {
      existingCustom.push(cleanUser);
    }
    localStorage.setItem('healthgrid_custom_users', JSON.stringify(existingCustom));

    // Broadcast across tabs
    try {
      const bc = new BroadcastChannel('healthgrid_sync');
      bc.postMessage({ type: 'DATA_UPDATED', timestamp: Date.now() });
      bc.close();
    } catch {}
  } catch (e) {
    console.warn('Failed saving user locally:', e);
  }

  return cleanUser;
}

const CANONICAL_ROLES: Set<UserRole> = new Set([
  'Medical Officer',
  'Radiographer',
  'Radiologist',
  'Administrator',
  'BEMS Officer',
  'Super Admin',
]);

export function sanitizeUserRole(u: User): User {
  let role = u.role as string;
  let orgType = u.organizationType;

  if (role === 'Public Hospital Admin') {
    role = 'Administrator';
    orgType = orgType || 'Public Hospital';
  } else if (role === 'Private Hospital Admin') {
    role = 'Administrator';
    orgType = orgType || 'Private Hospital';
  } else if (role === 'Public Hospital Radiographer') {
    role = 'Radiographer';
    orgType = orgType || 'Public Hospital';
  } else if (role === 'Private Hospital Radiographer') {
    role = 'Radiographer';
    orgType = orgType || 'Private Hospital';
  } else if (role === 'BEMS' || role === 'BEMZ') {
    role = 'BEMS Officer';
  } else if (role === 'Master Admin') {
    role = 'Super Admin';
  } else if (!CANONICAL_ROLES.has(role as UserRole)) {
    if (role.includes('Radiographer')) role = 'Radiographer';
    else if (role.includes('Radiologist')) role = 'Radiologist';
    else if (role.includes('Admin') || role.includes('admin')) role = 'Administrator';
    else if (role.includes('BEMS') || role.includes('BEMZ')) role = 'BEMS Officer';
    else role = 'Medical Officer';
  }

  return {
    ...u,
    role: role as UserRole,
    organizationType: orgType,
  };
}

// ==================== CLINICS ====================
export async function getClinics(): Promise<Clinic[]> {
  const db = getFirestoreDb();
  if (db && isFirebaseConfigured()) {
    try {
      const snapshot = await getDocs(collection(db, 'clinics'));
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Clinic));
    } catch (e) {
      console.warn('Firestore getClinics warning:', e);
    }
  }
  return [];
}

export async function saveClinic(clinic: Clinic): Promise<Clinic> {
  if (isFirebaseConfigured()) {
    try {
      const db = getFirestoreDb();
      if (db) {
        await setDoc(doc(db, 'clinics', clinic.id), clinic, { merge: true });
      }
    } catch (e) {
      console.error('Failed saving clinic to Firestore database:', e);
    }
  }
  return clinic;
}

export async function deleteClinicDoc(id: string): Promise<void> {
  if (isFirebaseConfigured()) {
    try {
      const db = getFirestoreDb();
      if (db) {
        await deleteDoc(doc(db, 'clinics', id));
      }
    } catch (e) {
      console.error('Failed deleting clinic from Firestore database:', e);
    }
  }
}

// ==================== PATIENTS ====================
export async function getPatients(): Promise<Patient[]> {
  const db = getFirestoreDb();
  if (db && isFirebaseConfigured()) {
    try {
      const snapshot = await getDocs(collection(db, 'patients'));
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Patient));
    } catch (e) {
      console.warn('Firestore getPatients warning:', e);
    }
  }
  return [];
}

export async function getPatient(id: string): Promise<Patient | null> {
  const db = getFirestoreDb();
  if (db && isFirebaseConfigured()) {
    try {
      const snap = await getDoc(doc(db, 'patients', id));
      return snap.exists() ? ({ id: snap.id, ...snap.data() } as Patient) : null;
    } catch (e) {
      console.warn('Firestore getPatient warning:', e);
    }
  }
  return null;
}

export async function getPatientsByClinic(clinicId: string): Promise<Patient[]> {
  const db = getFirestoreDb();
  if (db && isFirebaseConfigured()) {
    try {
      const q = query(collection(db, 'patients'), where('clinicId', '==', clinicId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Patient));
    } catch (e) {
      console.warn('Firestore getPatientsByClinic warning:', e);
    }
  }
  return [];
}

export async function createPatient(patient: Omit<Patient, 'id'>): Promise<Patient> {
  const id = generateId('patient');
  const newPatient: Patient = { ...patient, id };

  const db = getFirestoreDb();
  if (db && isFirebaseConfigured()) {
    try {
      await setDoc(doc(db, 'patients', id), newPatient, { merge: true });
    } catch (e) {
      console.warn('Firestore createPatient warning:', e);
    }
  }
  return newPatient;
}

export async function updatePatient(id: string, updates: Partial<Patient>): Promise<void> {
  const db = getFirestoreDb();
  if (db && isFirebaseConfigured()) {
    try {
      await setDoc(doc(db, 'patients', id), updates as any, { merge: true });
    } catch (e) {
      console.warn('Firestore updatePatient warning:', e);
    }
  }
}

// ==================== CASES ====================
export async function getCases(): Promise<Case[]> {
  const db = getFirestoreDb();
  if (db && isFirebaseConfigured()) {
    try {
      const snapshot = await getDocs(query(collection(db, 'cases'), orderBy('createdAt', 'desc')));
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Case));
    } catch (e) {
      console.warn('Firestore getCases warning:', e);
    }
  }
  return [];
}

export async function getCasesByRegistrar(registeredById: string): Promise<Case[]> {
  const db = getFirestoreDb();
  if (db && isFirebaseConfigured()) {
    try {
      const q = query(collection(db, 'cases'), where('registeredById', '==', registeredById));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Case));
    } catch (e) {
      console.warn('Firestore getCasesByRegistrar warning:', e);
    }
  }
  return [];
}

export async function getCasesByStatus(status: CaseStatus): Promise<Case[]> {
  const db = getFirestoreDb();
  if (db && isFirebaseConfigured()) {
    try {
      const q = query(collection(db, 'cases'), where('status', '==', status));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Case));
    } catch (e) {
      console.warn('Firestore getCasesByStatus warning:', e);
    }
  }
  return [];
}

export async function getCasesByRadiographer(radiographerId: string): Promise<Case[]> {
  const db = getFirestoreDb();
  if (db && isFirebaseConfigured()) {
    try {
      const q = query(collection(db, 'cases'), where('radiographerId', '==', radiographerId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Case));
    } catch (e) {
      console.warn('Firestore getCasesByRadiographer warning:', e);
    }
  }
  return [];
}

// Data Validation Safeguards
function validateCaseData(caseData: Omit<Case, 'id'>): void {
  if (!caseData.caseNumber || !caseData.patientId || !caseData.modality || !caseData.scanType) {
    throw new Error('Case validation failed: Missing required fields (caseNumber, patientId, modality, scanType)');
  }
}

function validateReportData(reportData: Omit<Report, 'id'>): void {
  if (!reportData.caseId || !reportData.findings || !reportData.impression) {
    throw new Error('Report validation failed: Missing required fields (caseId, findings, impression)');
  }
}

export async function createCase(c: Omit<Case, 'id'>): Promise<Case> {
  validateCaseData(c);
  const id = generateId('case');
  const newCase: Case = { ...c, id };

  const db = getFirestoreDb();
  if (db && isFirebaseConfigured()) {
    try {
      await setDoc(doc(db, 'cases', id), newCase, { merge: true });
    } catch (e) {
      console.warn('Firestore createCase warning:', e);
    }
  }
  return newCase;
}

export async function updateCase(id: string, updates: Partial<Case>): Promise<void> {
  if (!id) throw new Error('Update case failed: Missing document ID');

  const db = getFirestoreDb();
  if (db && isFirebaseConfigured()) {
    try {
      await setDoc(doc(db, 'cases', id), updates as any, { merge: true });
    } catch (e) {
      console.warn('Firestore updateCase warning:', e);
    }
  }
}

export async function updateCaseWorksheet(
  id: string,
  worksheet: Pick<
    Case,
    | 'doseKvp' | 'doseMas' | 'dosRadiasi'
    | 'bilanganFilem' | 'bilanganCdDvd'
    | 'komen'
    | 'officeWaktuTerima' | 'officeWaktuSelesai' | 'officeJuruXRay'
    | 'officeTarikhPemeriksaan' | 'officeTarikhAppointment' | 'officeMasaAppointment'
    | 'contrastMediaName' | 'contrastMediaVolumeMl'
  >
): Promise<void> {
  return updateCase(id, worksheet);
}

// ==================== REPORTS ====================
export async function getReports(): Promise<Report[]> {
  const db = getFirestoreDb();
  if (db && isFirebaseConfigured()) {
    try {
      const snapshot = await getDocs(collection(db, 'reports'));
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Report));
    } catch (e) {
      console.warn('Firestore getReports warning:', e);
    }
  }
  return [];
}

export async function getReportByCase(caseId: string): Promise<Report | null> {
  const db = getFirestoreDb();
  if (db && isFirebaseConfigured()) {
    try {
      const q = query(collection(db, 'reports'), where('caseId', '==', caseId));
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      const d = snapshot.docs[0];
      return { id: d.id, ...d.data() } as Report;
    } catch (e) {
      console.warn('Firestore getReportByCase warning:', e);
    }
  }
  return null;
}

export async function createReport(report: Omit<Report, 'id'>): Promise<Report> {
  validateReportData(report);
  const id = generateId('report');
  const newReport: Report = { ...report, id };

  const db = getFirestoreDb();
  if (db && isFirebaseConfigured()) {
    try {
      await setDoc(doc(db, 'reports', id), newReport, { merge: true });
    } catch (e) {
      console.warn('Firestore createReport warning:', e);
    }
  }
  return newReport;
}

export async function updateReport(id: string, updates: Partial<Report>): Promise<void> {
  if (!id) throw new Error('Update report failed: Missing document ID');

  const db = getFirestoreDb();
  if (db && isFirebaseConfigured()) {
    try {
      await setDoc(doc(db, 'reports', id), updates as any, { merge: true });
    } catch (e) {
      console.warn('Firestore updateReport warning:', e);
    }
  }
}

// ==================== PATIENT REQUESTS ====================
export async function getPatientRequests(): Promise<PatientRequest[]> {
  const db = getFirestoreDb();
  if (db && isFirebaseConfigured()) {
    try {
      const snapshot = await getDocs(collection(db, 'patient_requests'));
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as PatientRequest));
    } catch (e) {
      console.warn('Firestore getPatientRequests warning:', e);
    }
  }
  return [];
}

export async function createPatientRequest(req: Omit<PatientRequest, 'id'>): Promise<PatientRequest> {
  const id = generateId('req');
  const newReq: PatientRequest = { ...req, id };

  const db = getFirestoreDb();
  if (db && isFirebaseConfigured()) {
    try {
      await setDoc(doc(db, 'patient_requests', id), newReq, { merge: true });
    } catch (e) {
      console.warn('Firestore createPatientRequest warning:', e);
    }
  }
  return newReq;
}

export async function updatePatientRequest(id: string, updates: Partial<PatientRequest>): Promise<void> {
  const db = getFirestoreDb();
  if (db && isFirebaseConfigured()) {
    try {
      await setDoc(doc(db, 'patient_requests', id), updates as any, { merge: true });
    } catch (e) {
      console.warn('Firestore updatePatientRequest warning:', e);
    }
  }
}

// ==================== AUDIT LOGS ====================
export async function getAuditLogs(): Promise<AuditLog[]> {
  const db = getFirestoreDb();
  if (db && isFirebaseConfigured()) {
    try {
      const q = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as AuditLog));
    } catch (e) {
      console.warn('Firestore getAuditLogs warning:', e);
    }
  }
  return [];
}

export async function createAuditLog(log: Omit<AuditLog, 'id'>): Promise<void> {
  const id = generateId('audit');
  const newLog: AuditLog = { ...log, id };

  const db = getFirestoreDb();
  if (db && isFirebaseConfigured()) {
    try {
      await setDoc(doc(db, 'audit_logs', id), newLog, { merge: true });
    } catch (e) {
      console.warn('Firestore createAuditLog warning:', e);
    }
  }
}

// ==================== MOBILE PACS VANS ====================
export async function getMobilePacsVans(): Promise<MobilePacsVan[]> {
  const db = getFirestoreDb();
  if (db && isFirebaseConfigured()) {
    try {
      const snapshot = await getDocs(collection(db, 'mobile_pacs_vans'));
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as MobilePacsVan));
    } catch (e) {
      console.warn('Firestore getMobilePacsVans warning:', e);
    }
  }
  return [];
}

export async function updateMobilePacsVan(id: string, updates: Partial<MobilePacsVan>): Promise<void> {
  const db = getFirestoreDb();
  if (db && isFirebaseConfigured()) {
    try {
      await setDoc(doc(db, 'mobile_pacs_vans', id), updates as any, { merge: true });
    } catch (e) {
      console.warn('Firestore updateMobilePacsVan warning:', e);
    }
  }
}

// ==================== RADIOGRAPHER SCHEDULES ====================
export function buildLiveRadioSchedules(
  usersList: User[],
  clinicsList: Clinic[],
  deletedUserIds: Set<string> = new Set()
): RadioScheduleProfile[] {
  const activeRadiographers = (usersList || []).filter(
    (u) =>
      u.role === 'Radiographer' &&
      u.status === 'active' &&
      !deletedUserIds.has(u.id)
  );

  return activeRadiographers.map((rad) => {
    const assignedClinic = clinicsList.find(
      (c) => c.id === rad.deploymentLocationId
    ) || clinicsList[0];

    return {
      userId: rad.id,
      userName: rad.name,
      deployedClinicId: rad.deploymentLocationId || assignedClinic?.id || 'clinic-001',
      deployedClinicName: assignedClinic?.name || 'Primary Care Healthcare Clinic',
      supportedModalities: rad.supportedModalities && rad.supportedModalities.length > 0
        ? rad.supportedModalities
        : ['X-Ray', 'CT', 'MRI', 'Ultrasound'],
      currentCaseload: 0,
      maxDailyCaseload: 8,
      leaveStatus: 'Active',
      shift: rad.shift ? `${rad.shift} (08:00–17:00)` : 'Day (08:00–17:00)',
      schedule: generateScheduleSlots(),
    };
  });
}

export async function getRadioSchedules(
  customUsers?: User[],
  customClinics?: Clinic[],
  deletedIds?: Set<string>
): Promise<RadioScheduleProfile[]> {
  if (customUsers && customClinics) {
    return buildLiveRadioSchedules(customUsers, customClinics, deletedIds);
  }
  const db = getFirestoreDb();
  if (db && isFirebaseConfigured()) {
    try {
      const snapshot = await getDocs(collection(db, 'radio_schedules'));
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as unknown as RadioScheduleProfile));
    } catch (err) {
      console.warn('Firestore getRadioSchedules warning:', err);
    }
  }
  return [];
}

export async function getRadioSchedulesByClinic(
  clinicId: string,
  customUsers?: User[],
  customClinics?: Clinic[],
  deletedIds?: Set<string>
): Promise<RadioScheduleProfile[]> {
  const all = await getRadioSchedules(customUsers, customClinics, deletedIds);
  return all.filter((s) => s.deployedClinicId === clinicId);
}

export async function getRadioScheduleProfiles(
  customUsers?: User[],
  customClinics?: Clinic[],
  deletedIds?: Set<string>
): Promise<RadioScheduleProfile[]> {
  return getRadioSchedules(customUsers, customClinics, deletedIds);
}

// ==================== BEMS & EXTERNAL IMAGING REFERRALS ====================
export async function getExternalReferrals(): Promise<ExternalImagingRequest[]> {
  const db = getFirestoreDb();
  if (db && isFirebaseConfigured()) {
    try {
      const q = query(collection(db, 'external_referrals'), orderBy('submittedAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ExternalImagingRequest));
    } catch (e) {
      console.warn('Firestore getExternalReferrals warning:', e);
    }
  }
  const raw = localStorage.getItem('healthgrid_external_referrals');
  return raw ? JSON.parse(raw) : [];
}

export async function getExternalReferralById(id: string): Promise<ExternalImagingRequest | null> {
  const db = getFirestoreDb();
  if (db && isFirebaseConfigured()) {
    try {
      const docSnap = await getDoc(doc(db, 'external_referrals', id));
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as ExternalImagingRequest;
      }
    } catch (e) {
      console.warn('Firestore getExternalReferralById warning:', e);
    }
  }
  const all = await getExternalReferrals();
  return all.find((r) => r.id === id) || null;
}

export async function createExternalReferral(req: Omit<ExternalImagingRequest, 'id'>): Promise<ExternalImagingRequest> {
  const id = generateId('bems-ref');
  const newReq: ExternalImagingRequest = { ...req, id };

  const db = getFirestoreDb();
  if (db && isFirebaseConfigured()) {
    try {
      await setDoc(doc(db, 'external_referrals', id), newReq, { merge: true });
    } catch (e) {
      console.warn('Firestore createExternalReferral failed:', e);
    }
  }

  // Local storage persistence fallback
  const raw = localStorage.getItem('healthgrid_external_referrals');
  const existing: ExternalImagingRequest[] = raw ? JSON.parse(raw) : [];
  existing.unshift(newReq);
  localStorage.setItem('healthgrid_external_referrals', JSON.stringify(existing));

  return newReq;
}

export async function updateExternalReferral(id: string, updates: Partial<ExternalImagingRequest>): Promise<void> {
  if (!id) throw new Error('Update referral failed: Missing document ID');

  const db = getFirestoreDb();
  if (db && isFirebaseConfigured()) {
    try {
      await setDoc(doc(db, 'external_referrals', id), updates as any, { merge: true });
    } catch (e) {
      console.warn('Firestore updateExternalReferral fallback:', e);
    }
  }

  const raw = localStorage.getItem('healthgrid_external_referrals');
  const existing: ExternalImagingRequest[] = raw ? JSON.parse(raw) : [];
  const idx = existing.findIndex((r) => r.id === id);
  if (idx !== -1) {
    existing[idx] = { ...existing[idx], ...updates };
    localStorage.setItem('healthgrid_external_referrals', JSON.stringify(existing));
  }
}

export async function getFacilityEquipment(): Promise<FacilityEquipment[]> {
  const db = getFirestoreDb();
  if (db && isFirebaseConfigured()) {
    try {
      const snap = await getDocs(collection(db, 'facility_equipment'));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FacilityEquipment));
    } catch (e) {
      console.warn('Firestore getFacilityEquipment warning:', e);
    }
  }
  return [];
}

export async function getBemsIncidents(): Promise<BemsIncident[]> {
  const db = getFirestoreDb();
  if (db && isFirebaseConfigured()) {
    try {
      const snap = await getDocs(collection(db, 'bems_incidents'));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as BemsIncident));
    } catch (e) {
      console.warn('Firestore getBemsIncidents warning:', e);
    }
  }
  return [];
}

export async function getCrossOrgReferrals(): Promise<CrossOrganizationReferral[]> {
  const db = getFirestoreDb();
  if (db && isFirebaseConfigured()) {
    try {
      const snap = await getDocs(collection(db, 'cross_org_referrals'));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as CrossOrganizationReferral));
    } catch (e) {
      console.warn('Firestore getCrossOrgReferrals warning:', e);
    }
  }
  return [];
}
