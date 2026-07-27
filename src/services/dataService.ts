import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { getFirestoreDb, isFirebaseConfigured } from './firebase';
import {
  mockUsers,
  mockClinics,
  mockPatients,
  mockCases,
  mockReports,
  mockPatientRequests,
  mockAuditLogs,
  mockMobilePacsVans,
  mockRadioSchedules,
} from './mockData';
import type {
  User,
  Clinic,
  Patient,
  Case,
  Report,
  PatientRequest,
  AuditLog,
  MobilePacsVan,
  RadioScheduleProfile,
  CaseStatus,
  PatientRequestStatus,
} from '../types';

// Helper to determine if we use live Firestore or mock data
function useMock(): boolean {
  return !isFirebaseConfigured();
}

// Generate unique ID
function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ==================== USERS ====================
export async function getUsers(): Promise<User[]> {
  if (useMock()) return [...mockUsers];
  const db = getFirestoreDb()!;
  const snapshot = await getDocs(collection(db, 'users'));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as User));
}

export async function getUsersByRole(role: string): Promise<User[]> {
  if (useMock()) return mockUsers.filter((u) => u.role === role);
  const db = getFirestoreDb()!;
  const q = query(collection(db, 'users'), where('role', '==', role));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as User));
}

// ==================== CLINICS ====================
export async function getClinics(): Promise<Clinic[]> {
  if (useMock()) return [...mockClinics];
  const db = getFirestoreDb()!;
  const snapshot = await getDocs(collection(db, 'clinics'));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Clinic));
}

// ==================== PATIENTS ====================
export async function getPatients(): Promise<Patient[]> {
  if (useMock()) return [...mockPatients];
  const db = getFirestoreDb()!;
  const snapshot = await getDocs(collection(db, 'patients'));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Patient));
}

export async function getPatientsByClinic(clinicId: string): Promise<Patient[]> {
  if (useMock()) return mockPatients.filter((p) => p.clinicId === clinicId);
  const db = getFirestoreDb()!;
  const q = query(collection(db, 'patients'), where('clinicId', '==', clinicId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Patient));
}

export async function createPatient(patient: Omit<Patient, 'id'>): Promise<Patient> {
  const id = generateId('patient');
  if (useMock()) {
    const newPatient = { ...patient, id };
    mockPatients.push(newPatient);
    return newPatient;
  }
  const db = getFirestoreDb()!;
  const docRef = await addDoc(collection(db, 'patients'), patient);
  return { ...patient, id: docRef.id };
}

export async function updatePatient(id: string, updates: Partial<Patient>): Promise<void> {
  if (useMock()) {
    const idx = mockPatients.findIndex((p) => p.id === id);
    if (idx !== -1) Object.assign(mockPatients[idx], updates);
    return;
  }
  const db = getFirestoreDb()!;
  await updateDoc(doc(db, 'patients', id), updates as Record<string, unknown>);
}

// ==================== CASES ====================
export async function getCases(): Promise<Case[]> {
  if (useMock()) return [...mockCases];
  const db = getFirestoreDb()!;
  const snapshot = await getDocs(collection(db, 'cases'));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Case));
}

export async function getCasesByRegistrar(registeredById: string): Promise<Case[]> {
  if (useMock()) return mockCases.filter((c) => c.registeredById === registeredById);
  const db = getFirestoreDb()!;
  const q = query(collection(db, 'cases'), where('registeredById', '==', registeredById));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Case));
}

export async function getCasesByStatus(status: CaseStatus): Promise<Case[]> {
  if (useMock()) return mockCases.filter((c) => c.status === status);
  const db = getFirestoreDb()!;
  const q = query(collection(db, 'cases'), where('status', '==', status));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Case));
}

export async function getCasesByRadiographer(radiographerId: string): Promise<Case[]> {
  if (useMock()) return mockCases.filter((c) => c.radiographerId === radiographerId);
  const db = getFirestoreDb()!;
  const q = query(collection(db, 'cases'), where('radiographerId', '==', radiographerId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Case));
}

export async function createCase(caseData: Omit<Case, 'id'>): Promise<Case> {
  const id = generateId('case');
  if (useMock()) {
    const newCase = { ...caseData, id };
    mockCases.push(newCase);
    return newCase;
  }
  const db = getFirestoreDb()!;
  const docRef = await addDoc(collection(db, 'cases'), caseData);
  return { ...caseData, id: docRef.id };
}

export async function updateCase(id: string, updates: Partial<Case>): Promise<void> {
  if (useMock()) {
    const idx = mockCases.findIndex((c) => c.id === id);
    if (idx !== -1) Object.assign(mockCases[idx], updates);
    return;
  }
  const db = getFirestoreDb()!;
  await updateDoc(doc(db, 'cases', id), updates as Record<string, unknown>);
}

// ==================== REPORTS ====================
export async function getReports(): Promise<Report[]> {
  if (useMock()) return [...mockReports];
  const db = getFirestoreDb()!;
  const snapshot = await getDocs(collection(db, 'reports'));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Report));
}

export async function getReportByCase(caseId: string): Promise<Report | null> {
  if (useMock()) return mockReports.find((r) => r.caseId === caseId) || null;
  const db = getFirestoreDb()!;
  const q = query(collection(db, 'reports'), where('caseId', '==', caseId));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const d = snapshot.docs[0];
  return { id: d.id, ...d.data() } as Report;
}

export async function createReport(report: Omit<Report, 'id'>): Promise<Report> {
  const id = generateId('report');
  if (useMock()) {
    const newReport = { ...report, id };
    mockReports.push(newReport);
    return newReport;
  }
  const db = getFirestoreDb()!;
  const docRef = await addDoc(collection(db, 'reports'), report);
  return { ...report, id: docRef.id };
}

export async function updateReport(id: string, updates: Partial<Report>): Promise<void> {
  if (useMock()) {
    const idx = mockReports.findIndex((r) => r.id === id);
    if (idx !== -1) Object.assign(mockReports[idx], updates);
    return;
  }
  const db = getFirestoreDb()!;
  await updateDoc(doc(db, 'reports', id), updates as Record<string, unknown>);
}

// ==================== PATIENT REQUESTS ====================
export async function getPatientRequests(): Promise<PatientRequest[]> {
  if (useMock()) return [...mockPatientRequests];
  const db = getFirestoreDb()!;
  const snapshot = await getDocs(collection(db, 'patient_requests'));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as PatientRequest));
}

export async function createPatientRequest(req: Omit<PatientRequest, 'id'>): Promise<PatientRequest> {
  const id = generateId('req');
  if (useMock()) {
    const newReq = { ...req, id };
    mockPatientRequests.push(newReq);
    return newReq;
  }
  const db = getFirestoreDb()!;
  const docRef = await addDoc(collection(db, 'patient_requests'), req);
  return { ...req, id: docRef.id };
}

export async function updatePatientRequest(id: string, updates: Partial<PatientRequest>): Promise<void> {
  if (useMock()) {
    const idx = mockPatientRequests.findIndex((r) => r.id === id);
    if (idx !== -1) Object.assign(mockPatientRequests[idx], updates);
    return;
  }
  const db = getFirestoreDb()!;
  await updateDoc(doc(db, 'patient_requests', id), updates as Record<string, unknown>);
}

// ==================== AUDIT LOGS ====================
export async function getAuditLogs(): Promise<AuditLog[]> {
  if (useMock()) return [...mockAuditLogs].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const db = getFirestoreDb()!;
  const q = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as AuditLog));
}

export async function createAuditLog(log: Omit<AuditLog, 'id'>): Promise<void> {
  const id = generateId('audit');
  if (useMock()) {
    mockAuditLogs.push({ ...log, id });
    return;
  }
  const db = getFirestoreDb()!;
  await addDoc(collection(db, 'audit_logs'), log);
}

// ==================== MOBILE PACS VANS ====================
export async function getMobilePacsVans(): Promise<MobilePacsVan[]> {
  if (useMock()) return [...mockMobilePacsVans];
  const db = getFirestoreDb()!;
  const snapshot = await getDocs(collection(db, 'mobile_pacs_vans'));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as MobilePacsVan));
}

export async function updateMobilePacsVan(id: string, updates: Partial<MobilePacsVan>): Promise<void> {
  if (useMock()) {
    const idx = mockMobilePacsVans.findIndex((v) => v.id === id);
    if (idx !== -1) Object.assign(mockMobilePacsVans[idx], updates);
    return;
  }
  const db = getFirestoreDb()!;
  await updateDoc(doc(db, 'mobile_pacs_vans', id), updates as Record<string, unknown>);
}

// ==================== RADIO SCHEDULE PROFILES ====================
export async function getRadioScheduleProfiles(): Promise<RadioScheduleProfile[]> {
  if (useMock()) return [...mockRadioSchedules];
  try {
    const db = getFirestoreDb()!;
    const snapshot = await getDocs(collection(db, 'radio_schedules'));
    if (snapshot.empty) return [...mockRadioSchedules];
    return snapshot.docs.map((d) => d.data() as RadioScheduleProfile);
  } catch (err) {
    console.warn('Failed to fetch radio schedules from Firestore, using mock:', err);
    return [...mockRadioSchedules];
  }
}

export async function getRadioSchedulesByClinic(clinicId: string): Promise<RadioScheduleProfile[]> {
  if (useMock()) return mockRadioSchedules.filter((r) => r.deployedClinicId === clinicId);
  try {
    const db = getFirestoreDb()!;
    const q = query(collection(db, 'radio_schedules'), where('deployedClinicId', '==', clinicId));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return mockRadioSchedules.filter((r) => r.deployedClinicId === clinicId);
    return snapshot.docs.map((d) => d.data() as RadioScheduleProfile);
  } catch (err) {
    console.warn('Failed to fetch radio schedules by clinic, using mock:', err);
    return mockRadioSchedules.filter((r) => r.deployedClinicId === clinicId);
  }
}

export async function createRadioScheduleProfile(
  profile: RadioScheduleProfile
): Promise<RadioScheduleProfile> {
  if (useMock()) {
    mockRadioSchedules.push(profile);
    return profile;
  }
  const db = getFirestoreDb()!;
  await addDoc(collection(db, 'radio_schedules'), profile);
  return profile;
}

export async function updateRadioScheduleProfile(
  userId: string,
  updates: Partial<RadioScheduleProfile>
): Promise<void> {
  if (useMock()) {
    const idx = mockRadioSchedules.findIndex((r) => r.userId === userId);
    if (idx !== -1) Object.assign(mockRadioSchedules[idx], updates);
    return;
  }
  const db = getFirestoreDb()!;
  await updateDoc(doc(db, 'radio_schedules', userId), updates as Record<string, unknown>);
}

// ==================== IAS SCHEDULING JOBS ====================
export async function getIasSchedulingJobs(): Promise<import('../types').IasSchedulingJob[]> {
  if (useMock()) return [];
  const db = getFirestoreDb()!;
  const q = query(collection(db, 'scheduling_jobs'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as import('../types').IasSchedulingJob));
}

export async function createIasSchedulingJob(
  job: Omit<import('../types').IasSchedulingJob, 'id'>
): Promise<import('../types').IasSchedulingJob> {
  const id = generateId('job');
  if (useMock()) {
    return { ...job, id };
  }
  const db = getFirestoreDb()!;
  const docRef = await addDoc(collection(db, 'scheduling_jobs'), job);
  return { ...job, id: docRef.id };
}

// ==================== REAL-TIME SUBSCRIPTIONS (Firestore listeners) ====================
// These are used by DataContext when Firebase is configured for live updates

export function subscribeToCollection<T>(
  collectionName: string,
  onUpdate: (items: T[]) => void,
  queryConstraints?: Parameters<typeof query>[1][]
): (() => void) | null {
  const db = getFirestoreDb();
  if (!db) return null;

  const { onSnapshot } = require('firebase/firestore');

  const ref = queryConstraints
    ? query(collection(db, collectionName), ...queryConstraints)
    : collection(db, collectionName);

  const unsubscribe = onSnapshot(ref, (snapshot: any) => {
    const items = snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() } as T));
    onUpdate(items);
  });

  return unsubscribe;
}
