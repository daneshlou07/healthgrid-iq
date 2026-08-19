import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
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
  ExternalImagingRequest,
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
  const db = getFirestoreDb();
  if (db && isFirebaseConfigured()) {
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      const existingUsers = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as User));
      
      // Ensure all standard hospital role accounts exist in Firestore
      const missingUsers = mockUsers.filter((mu) => !existingUsers.some((eu) => eu.id === mu.id || eu.email === mu.email));
      if (missingUsers.length > 0) {
        for (const u of missingUsers) {
          await setDoc(doc(db, 'users', u.id), u, { merge: true });
        }
        return [...existingUsers, ...missingUsers];
      }

      if (existingUsers.length > 0) {
        return existingUsers;
      }
      return [...mockUsers];
    } catch (e) {
      console.warn('Firestore getUsers fallback to mock:', e);
    }
  }
  return [...mockUsers];
}

export async function getUsersByRole(role: string): Promise<User[]> {
  const db = getFirestoreDb();
  if (db && isFirebaseConfigured()) {
    try {
      const q = query(collection(db, 'users'), where('role', '==', role));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as User));
      }
    } catch (e) {
      console.warn('Firestore getUsersByRole fallback to mock:', e);
    }
  }
  return mockUsers.filter((u) => u.role === role);
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

// ==================== CLINICS ====================
export async function getClinics(): Promise<Clinic[]> {
  if (useMock()) return [...mockClinics];
  const db = getFirestoreDb()!;
  const snapshot = await getDocs(collection(db, 'clinics'));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Clinic));
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

  const db = getFirestoreDb();
  if (!db) throw new Error('Firestore is not initialised');
  await setDoc(doc(db, 'patients', id), newPatient);
  return newPatient;
}

export async function updatePatient(id: string, updates: Partial<Patient>): Promise<void> {
  if (useMock()) {
    const idx = mockPatients.findIndex((p) => p.id === id);
    if (idx !== -1) Object.assign(mockPatients[idx], updates);
    return;
  }

  const db = getFirestoreDb();
  if (!db) throw new Error('Firestore is not initialised');
  await updateDoc(doc(db, 'patients', id), updates as any);
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

  const db = getFirestoreDb();
  if (!db) throw new Error('Firestore is not initialised');
  await setDoc(doc(db, 'cases', id), newCase);
  return newCase;
}

export async function updateCase(id: string, updates: Partial<Case>): Promise<void> {
  if (!id) throw new Error('Update case failed: Missing document ID');

  if (useMock()) {
    const idx = mockCases.findIndex((c) => c.id === id);
    if (idx !== -1) Object.assign(mockCases[idx], updates);
    return;
  }

  const db = getFirestoreDb();
  if (!db) throw new Error('Firestore is not initialised');
  await updateDoc(doc(db, 'cases', id), updates as any);
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

  const db = getFirestoreDb();
  if (!db) throw new Error('Firestore is not initialised');
  await setDoc(doc(db, 'reports', id), newReport);
  return newReport;
}

export async function updateReport(id: string, updates: Partial<Report>): Promise<void> {
  if (!id) throw new Error('Update report failed: Missing document ID');

  if (useMock()) {
    const idx = mockReports.findIndex((r) => r.id === id);
    if (idx !== -1) Object.assign(mockReports[idx], updates);
    return;
  }

  const db = getFirestoreDb();
  if (!db) throw new Error('Firestore is not initialised');
  await updateDoc(doc(db, 'reports', id), updates as any);
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

  const db = getFirestoreDb();
  if (!db) throw new Error('Firestore is not initialised');
  await setDoc(doc(db, 'patient_requests', id), newReq);
  return newReq;
}

export async function updatePatientRequest(id: string, updates: Partial<PatientRequest>): Promise<void> {
  if (useMock()) {
    const idx = mockPatientRequests.findIndex((r) => r.id === id);
    if (idx !== -1) Object.assign(mockPatientRequests[idx], updates);
    return;
  }

  const db = getFirestoreDb();
  if (!db) throw new Error('Firestore is not initialised');
  await updateDoc(doc(db, 'patient_requests', id), updates as any);
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

  const db = getFirestoreDb();
  if (!db) throw new Error('Firestore is not initialised');
  await setDoc(doc(db, 'audit_logs', id), newLog);
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

  const db = getFirestoreDb();
  if (!db) throw new Error('Firestore is not initialised');
  await updateDoc(doc(db, 'mobile_pacs_vans', id), updates as any);
}

// ==================== RADIOGRAPHER SCHEDULES ====================
export async function getRadioSchedules(): Promise<RadioScheduleProfile[]> {
  if (useMock()) return [...mockRadioSchedules];
  const db = getFirestoreDb();
  if (!db) return [...mockRadioSchedules];
  try {
    const snapshot = await getDocs(collection(db, 'radio_schedules'));
    if (snapshot.empty) return [...mockRadioSchedules];
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as unknown as RadioScheduleProfile));
  } catch (err) {
    console.warn('Firestore getRadioSchedules failed, falling back to mock:', err);
    return [...mockRadioSchedules];
  }
}

export async function getRadioSchedulesByClinic(clinicId: string): Promise<RadioScheduleProfile[]> {
  const all = await getRadioSchedules();
  return all.filter((s) => s.deployedClinicId === clinicId);
}

export async function getRadioScheduleProfiles(): Promise<RadioScheduleProfile[]> {
  return getRadioSchedules();
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
      console.warn('Firestore getExternalReferrals fallback:', e);
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
      console.warn('Firestore getExternalReferralById fallback:', e);
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
      await setDoc(doc(db, 'external_referrals', id), newReq);
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
      await updateDoc(doc(db, 'external_referrals', id), updates as any);
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
