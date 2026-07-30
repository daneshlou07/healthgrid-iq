import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
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

export async function getPatient(id: string): Promise<Patient | null> {
  if (useMock()) return mockPatients.find((p) => p.id === id) || null;
  const db = getFirestoreDb()!;
  const snap = await getDoc(doc(db, 'patients', id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Patient) : null;
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
  const newPatient: Patient = { ...patient, id };
  
  if (useMock()) {
    mockPatients.push(newPatient);
    return newPatient;
  }

  try {
    const db = getFirestoreDb();
    if (db) {
      await setDoc(doc(db, 'patients', id), newPatient);
    }
  } catch (err) {
    console.warn('Direct Firestore createPatient write failed, retaining local state:', err);
  }

  mockPatients.push(newPatient);
  return newPatient;
}

export async function updatePatient(id: string, updates: Partial<Patient>): Promise<void> {
  const idx = mockPatients.findIndex((p) => p.id === id);
  if (idx !== -1) Object.assign(mockPatients[idx], updates);

  if (!useMock()) {
    try {
      const db = getFirestoreDb();
      if (db) {
        await updateDoc(doc(db, 'patients', id), updates as any);
      }
    } catch (err) {
      console.warn('Direct Firestore updatePatient write failed:', err);
    }
  }
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

  if (useMock()) {
    mockCases.push(newCase);
    return newCase;
  }

  try {
    const db = getFirestoreDb();
    if (db) {
      await setDoc(doc(db, 'cases', id), newCase);
    }
  } catch (err) {
    console.warn('Direct Firestore createCase write failed, retaining local state:', err);
  }

  mockCases.push(newCase);
  return newCase;
}

export async function updateCase(id: string, updates: Partial<Case>): Promise<void> {
  if (!id) throw new Error('Update case failed: Missing document ID');

  const idx = mockCases.findIndex((c) => c.id === id);
  if (idx !== -1) Object.assign(mockCases[idx], updates);

  if (!useMock()) {
    try {
      const db = getFirestoreDb();
      if (db) {
        await updateDoc(doc(db, 'cases', id), updates as any);
      }
    } catch (err) {
      console.warn('Direct Firestore updateCase write failed:', err);
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
  validateReportData(report);
  const id = generateId('report');
  const newReport: Report = { ...report, id };

  if (useMock()) {
    mockReports.push(newReport);
    return newReport;
  }

  try {
    const db = getFirestoreDb();
    if (db) {
      await setDoc(doc(db, 'reports', id), newReport);
    }
  } catch (err) {
    console.warn('Direct Firestore createReport write failed, retaining local state:', err);
  }

  mockReports.push(newReport);
  return newReport;
}

export async function updateReport(id: string, updates: Partial<Report>): Promise<void> {
  if (!id) throw new Error('Update report failed: Missing document ID');

  const idx = mockReports.findIndex((r) => r.id === id);
  if (idx !== -1) Object.assign(mockReports[idx], updates);

  if (!useMock()) {
    try {
      const db = getFirestoreDb();
      if (db) {
        await updateDoc(doc(db, 'reports', id), updates as any);
      }
    } catch (err) {
      console.warn('Direct Firestore updateReport write failed:', err);
    }
  }
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
  const newReq: PatientRequest = { ...req, id };

  if (useMock()) {
    mockPatientRequests.push(newReq);
    return newReq;
  }

  try {
    const db = getFirestoreDb();
    if (db) {
      await setDoc(doc(db, 'patient_requests', id), newReq);
    }
  } catch (err) {
    console.warn('Direct Firestore createPatientRequest write failed:', err);
  }

  mockPatientRequests.push(newReq);
  return newReq;
}

export async function updatePatientRequest(id: string, updates: Partial<PatientRequest>): Promise<void> {
  const idx = mockPatientRequests.findIndex((r) => r.id === id);
  if (idx !== -1) Object.assign(mockPatientRequests[idx], updates);

  if (!useMock()) {
    try {
      const db = getFirestoreDb();
      if (db) {
        await updateDoc(doc(db, 'patient_requests', id), updates as any);
      }
    } catch (err) {
      console.warn('Direct Firestore updatePatientRequest write failed:', err);
    }
  }
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
  const newLog: AuditLog = { ...log, id };

  if (useMock()) {
    mockAuditLogs.push(newLog);
    return;
  }

  try {
    const db = getFirestoreDb();
    if (db) {
      await setDoc(doc(db, 'audit_logs', id), newLog);
    }
  } catch (err) {
    console.warn('Direct Firestore createAuditLog write failed:', err);
  }

  mockAuditLogs.push(newLog);
}

// ==================== MOBILE PACS VANS ====================
export async function getMobilePacsVans(): Promise<MobilePacsVan[]> {
  if (useMock()) return [...mockMobilePacsVans];
  const db = getFirestoreDb()!;
  const snapshot = await getDocs(collection(db, 'mobile_pacs_vans'));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as MobilePacsVan));
}

export async function updateMobilePacsVan(id: string, updates: Partial<MobilePacsVan>): Promise<void> {
  const idx = mockMobilePacsVans.findIndex((v) => v.id === id);
  if (idx !== -1) Object.assign(mockMobilePacsVans[idx], updates);

  if (!useMock()) {
    try {
      const db = getFirestoreDb();
      if (db) {
        await updateDoc(doc(db, 'mobile_pacs_vans', id), updates as any);
      }
    } catch (err) {
      console.warn('Direct Firestore updateMobilePacsVan write failed:', err);
    }
  }
}

// ==================== RADIOGRAPHER SCHEDULES ====================
export async function getRadioSchedules(): Promise<RadioScheduleProfile[]> {
  if (useMock()) return [...mockRadioSchedules];
  const db = getFirestoreDb()!;
  const snapshot = await getDocs(collection(db, 'radio_schedules'));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as unknown as RadioScheduleProfile));
}

export async function getRadioSchedulesByClinic(clinicId: string): Promise<RadioScheduleProfile[]> {
  const all = await getRadioSchedules();
  return all.filter((s) => s.deployedClinicId === clinicId);
}

export async function getRadioScheduleProfiles(): Promise<RadioScheduleProfile[]> {
  return getRadioSchedules();
}
