import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  doc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { getFirestoreDb, isDemoMode, isFirebaseConfigured } from '../services/firebase';
import { apiClient } from '../services/apiClient';
import {
  getUsers, getCases, getPatients, getClinics, getReports,
  getPatientRequests, getAuditLogs, getMobilePacsVans,
} from '../services/dataService';
import type { User, Case, Patient, Clinic, Report, PatientRequest, AuditLog, MobilePacsVan, Comment } from '../types';

// --- LocalStorage Persistence Layer ---
const STORAGE_KEY = 'healthgrid_data';
// Bump this version whenever seed data changes (e.g. new demo images).
// Any cached data from a previous version will be discarded and reloaded from mock.
const STORAGE_VERSION = '7'; // v7: Reset stale red flag alerts and clean up database cache
const USE_DEMO_STORAGE = isDemoMode();

interface PersistedData {
  users: User[];
  cases: Case[];
  patients: Patient[];
  clinics: Clinic[];
  reports: Report[];
  patientRequests: PatientRequest[];
  auditLogs: AuditLog[];
  equipment: MobilePacsVan[];
  lastUpdated: string;
}

function loadFromStorage(): PersistedData | null {
  if (!USE_DEMO_STORAGE) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as PersistedData & { version?: string };
    // Validate basic structure AND version — discard stale cache on version mismatch
    if (data.cases && data.patients && data.lastUpdated && data.version === STORAGE_VERSION) return data;
    return null;
  } catch { return null; }
}

function saveToStorage(data: Omit<PersistedData, 'lastUpdated'>) {
  if (!USE_DEMO_STORAGE) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, lastUpdated: new Date().toISOString(), version: STORAGE_VERSION }));
  } catch { /* Storage full or unavailable — fail silently */ }
}

// Re-export canonical Comment type for backwards-compat with components that imported CaseComment
export type CaseComment = Comment;

const COMMENTS_KEY = 'healthgrid_comments';
function loadComments(): CaseComment[] {
  if (!USE_DEMO_STORAGE) return [];
  try { const raw = localStorage.getItem(COMMENTS_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function saveComments(comments: CaseComment[]) {
  if (!USE_DEMO_STORAGE) return;
  try { localStorage.setItem(COMMENTS_KEY, JSON.stringify(comments)); } catch {}
}

// --- Recently Viewed ---
export interface RecentItem { id: string; type: 'case' | 'patient' | 'report'; title: string; subtitle?: string; path: string; viewedAt: string; }
const RECENT_KEY = 'healthgrid_recent';
function loadRecent(): RecentItem[] { if (!USE_DEMO_STORAGE) return []; try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; } }
function saveRecent(items: RecentItem[]) { if (!USE_DEMO_STORAGE) return; try { localStorage.setItem(RECENT_KEY, JSON.stringify(items.slice(0, 10))); } catch {} }

// --- Recycle Bin (Soft Delete) ---
export interface TrashItem {
  id: string;
  type: 'user' | 'clinic' | 'equipment' | 'patient' | 'case' | 'patientRequest';
  data: any;
  deletedAt: string;
  deletedBy: string;
}
const TRASH_KEY = 'healthgrid_trash';
function loadTrash(): TrashItem[] { if (!USE_DEMO_STORAGE) return []; try { return JSON.parse(localStorage.getItem(TRASH_KEY) || '[]'); } catch { return []; } }
function saveTrash(items: TrashItem[]) { if (!USE_DEMO_STORAGE) return; try { localStorage.setItem(TRASH_KEY, JSON.stringify(items)); } catch {} }

// --- Context Interface ---
interface DataContextValue {
  users: User[];
  cases: Case[];
  patients: Patient[];
  clinics: Clinic[];
  reports: Report[];
  patientRequests: PatientRequest[];
  auditLogs: AuditLog[];
  equipment: MobilePacsVan[];
  loading: boolean;
  comments: CaseComment[];
  recentItems: RecentItem[];
  trash: TrashItem[];

  addCase: (c: Omit<Case, 'id'>) => Promise<Case>;
  editCase: (id: string, updates: Partial<Case>) => Promise<void>;
  addPatient: (p: Omit<Patient, 'id'>) => Promise<Patient>;
  editPatient: (id: string, updates: Partial<Patient>) => Promise<void>;
  addReport: (r: Omit<Report, 'id'>) => Promise<Report>;
  editReport: (id: string, updates: Partial<Report>) => Promise<void>;
  addPatientRequest: (r: Omit<PatientRequest, 'id'>) => Promise<PatientRequest>;
  editPatientRequest: (id: string, updates: Partial<PatientRequest>) => Promise<void>;
  addAuditLog: (log: Omit<AuditLog, 'id'>) => Promise<void>;
  addComment: (comment: Omit<CaseComment, 'id' | 'timestamp'>) => Promise<void>;
  getCommentsForCase: (caseId: string) => CaseComment[];
  addRecentItem: (item: Omit<RecentItem, 'viewedAt'>) => void;
  softDelete: (type: TrashItem['type'], id: string, deletedBy: string) => void;
  restoreFromTrash: (trashItemId: string) => void;
  permanentDelete: (trashItemId: string) => void;
  // Exposed for admin pages that do optimistic local state updates
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  setEquipment: React.Dispatch<React.SetStateAction<MobilePacsVan[]>>;
  setClinics: React.Dispatch<React.SetStateAction<Clinic[]>>;
  setPatients: React.Dispatch<React.SetStateAction<Patient[]>>;
  setPatientRequests: React.Dispatch<React.SetStateAction<PatientRequest[]>>;
  refresh: () => void;
  clearStorage: () => void;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [patientRequests, setPatientRequests] = useState<PatientRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [equipment, setEquipment] = useState<MobilePacsVan[]>([]);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<CaseComment[]>([]);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [trash, setTrash] = useState<TrashItem[]>([]);
  const initialized = useRef(false);

  // Helper to merge live items with current state by ID
  const mergeItems = <T extends { id: string }>(current: T[], incoming: T[]): T[] => {
    if (!incoming || incoming.length === 0) return current;
    const map = new Map<string, T>();
    current.forEach((item) => map.set(item.id, item));
    incoming.forEach((item) => map.set(item.id, item));
    return Array.from(map.values());
  };

  // Load from localStorage first, then merge with Firestore or mock data
  const loadAll = useCallback(async () => {
    setLoading(true);

    const persisted = loadFromStorage();
    let initUsers = persisted?.users || [];
    let initCases = persisted?.cases || [];
    let initPatients = persisted?.patients || [];
    let initClinics = persisted?.clinics || [];
    let initReports = persisted?.reports || [];
    let initRequests = persisted?.patientRequests || [];
    let initLogs = persisted?.auditLogs || [];
    let initEquipment = persisted?.equipment || [];

    // Fall back to mock data if empty
    if (!persisted) {
      try {
        const [u, c, p, cl, r, pr, eq] = await Promise.all([
          getUsers(), getCases(), getPatients(), getClinics(),
          getReports(), getPatientRequests(), getMobilePacsVans(),
        ]);
        initUsers = u; initCases = c; initPatients = p; initClinics = cl;
        initReports = r; initRequests = pr; initEquipment = eq;
        // Audit logs are administrator-only and are loaded by the dedicated
        // audit page. Avoid making all clinical data unavailable to non-admin
        // users just because that protected query is denied.
        if (USE_DEMO_STORAGE) initLogs = await getAuditLogs();
      } catch (e) {
        console.warn('Mock loading error:', e);
      }
    }

    setUsers(initUsers);
    setCases(initCases);
    setPatients(initPatients);
    setClinics(initClinics);
    setReports(initReports);
    setPatientRequests(initRequests);
    setAuditLogs(initLogs);
    setEquipment(initEquipment);

    setComments(loadComments());
    setRecentItems(loadRecent());
    setTrash(loadTrash());
    setLoading(false);
    initialized.current = true;
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Real-time Firestore listeners (merges live docs without replacing local state if empty)
  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    const db = getFirestoreDb();
    if (!db) return;

    const unsubscribers: (() => void)[] = [];

    unsubscribers.push(
      onSnapshot(
        query(collection(db, 'cases'), orderBy('createdAt', 'desc')),
        (snapshot) => {
          if (!snapshot.empty) {
            const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Case));
            setCases((prev) => mergeItems(prev, items));
          }
        },
        (error) => console.warn('Cases listener warning:', error)
      )
    );

    unsubscribers.push(
      onSnapshot(
        query(collection(db, 'reports'), orderBy('createdAt', 'desc')),
        (snapshot) => {
          if (!snapshot.empty) {
            const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Report));
            setReports((prev) => mergeItems(prev, items));
          }
        },
        (error) => console.warn('Reports listener warning:', error)
      )
    );

    unsubscribers.push(
      onSnapshot(
        collection(db, 'mobile_pacs_vans'),
        (snapshot) => {
          if (!snapshot.empty) {
            const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as MobilePacsVan));
            setEquipment((prev) => mergeItems(prev, items));
          }
        },
        (error) => console.warn('Equipment listener warning:', error)
      )
    );

    unsubscribers.push(
      onSnapshot(
        query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc')),
        (snapshot) => {
          if (!snapshot.empty) {
            const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as AuditLog));
            setAuditLogs((prev) => mergeItems(prev, items));
          }
        },
        (error) => console.warn('Audit logs listener warning:', error)
      )
    );

    unsubscribers.push(
      onSnapshot(
        collection(db, 'users'),
        (snapshot) => {
          if (!snapshot.empty) {
            const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as User));
            setUsers((prev) => mergeItems(prev, items));
          }
        },
        (error) => console.warn('Users listener warning:', error)
      )
    );

    // Missing real-time listeners — patients, clinics, and patient_requests were
    // only loaded once on startup. Without these, changes from other users/devices
    // never reach modules that rely on these collections.
    unsubscribers.push(
      onSnapshot(
        collection(db, 'patients'),
        (snapshot) => {
          if (!snapshot.empty) {
            const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Patient));
            setPatients((prev) => mergeItems(prev, items));
          }
        },
        (error) => console.warn('Patients listener warning:', error)
      )
    );

    unsubscribers.push(
      onSnapshot(
        collection(db, 'clinics'),
        (snapshot) => {
          if (!snapshot.empty) {
            const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Clinic));
            setClinics((prev) => mergeItems(prev, items));
          }
        },
        (error) => console.warn('Clinics listener warning:', error)
      )
    );

    unsubscribers.push(
      onSnapshot(
        query(collection(db, 'patient_requests'), orderBy('dateSubmitted', 'desc')),
        (snapshot) => {
          if (!snapshot.empty) {
            const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as PatientRequest));
            setPatientRequests((prev) => mergeItems(prev, items));
          }
        },
        (error) => console.warn('PatientRequests listener warning:', error)
      )
    );

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, []);

  // Persist to localStorage whenever state changes (debounced)
  useEffect(() => {
    if (!USE_DEMO_STORAGE || !initialized.current) return;
    const timer = setTimeout(() => {
      saveToStorage({ users, cases, patients, clinics, reports, patientRequests, auditLogs, equipment });
      // Broadcast to other tabs
      try {
        const bc = new BroadcastChannel('healthgrid_sync');
        bc.postMessage({ type: 'DATA_UPDATED', timestamp: Date.now() });
        bc.close();
      } catch {}
    }, 300);
    return () => clearTimeout(timer);
  }, [users, cases, patients, clinics, reports, patientRequests, auditLogs, equipment]);

  // Listen for updates from other tabs
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('healthgrid_sync');
      bc.onmessage = (event) => {
        if (event.data?.type === 'DATA_UPDATED') {
          const persisted = loadFromStorage();
          if (persisted) {
            setUsers(persisted.users);
            setCases(persisted.cases);
            setPatients(persisted.patients);
            setClinics(persisted.clinics);
            setReports(persisted.reports);
            setPatientRequests(persisted.patientRequests);
            setAuditLogs(persisted.auditLogs);
            setEquipment(persisted.equipment);
          }
        }
      };
    } catch {}
    return () => { bc?.close(); };
  }, []);

  // -------------------------------------------------------------------------
  // Mutations — tries apiClient first, falls back to direct Firestore/local
  // -------------------------------------------------------------------------
  const addCase = async (c: Omit<Case, 'id'>): Promise<Case> => {
    if (!USE_DEMO_STORAGE) {
      const created = await apiClient.createCase(c);
      setCases((prev) => mergeItems(prev, [created]));
      return created;
    }
    const id = `case-${Date.now()}`;
    const newCase: Case = { ...c, id, createdAt: new Date().toISOString() };
    setCases((prev) => [...prev, newCase]);

    try {
      await apiClient.createCase(c);
    } catch (err) {
      console.warn('apiClient.createCase failed, attempting Firestore:', err);
      try {
        const db = getFirestoreDb();
        if (db) await setDoc(doc(db, 'cases', id), newCase);
      } catch (fErr) { console.warn('Firestore setDoc failed:', fErr); }
    }
    return newCase;
  };

  const editCase = async (id: string, updates: Partial<Case>) => {
    if (!USE_DEMO_STORAGE) {
      const updated = await apiClient.updateCase(id, updates);
      setCases((prev) => prev.map((c) => (c.id === id ? updated : c)));
      return;
    }
    setCases((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));

    try {
      await apiClient.updateCase(id, updates);
    } catch (err) {
      console.warn('apiClient.updateCase failed, attempting Firestore:', err);
      try {
        const db = getFirestoreDb();
        if (db) await updateDoc(doc(db, 'cases', id), updates);
      } catch (fErr) { console.warn('Firestore updateDoc failed:', fErr); }
    }
  };

  const addPatient = async (p: Omit<Patient, 'id'>): Promise<Patient> => {
    if (!USE_DEMO_STORAGE) {
      const created = await apiClient.createPatient(p);
      setPatients((prev) => mergeItems(prev, [created]));
      return created;
    }
    const id = `patient-${Date.now()}`;
    const newPatient: Patient = { ...p, id };
    setPatients((prev) => [...prev, newPatient]);

    try {
      await apiClient.createPatient(p);
    } catch (err) {
      console.warn('apiClient.createPatient failed, attempting Firestore:', err);
      try {
        const db = getFirestoreDb();
        if (db) await setDoc(doc(db, 'patients', id), newPatient);
      } catch (fErr) { console.warn('Firestore setDoc failed:', fErr); }
    }
    return newPatient;
  };

  const editPatient = async (id: string, updates: Partial<Patient>) => {
    if (!USE_DEMO_STORAGE) {
      const updated = await apiClient.updatePatient(id, updates);
      setPatients((prev) => prev.map((p) => (p.id === id ? updated : p)));
      return;
    }
    setPatients((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));

    try {
      await apiClient.updatePatient(id, updates);
    } catch (err) {
      console.warn('apiClient.updatePatient failed, attempting Firestore:', err);
      try {
        const db = getFirestoreDb();
        if (db) await updateDoc(doc(db, 'patients', id), updates);
      } catch (fErr) { console.warn('Firestore updateDoc failed:', fErr); }
    }
  };

  const addReport = async (r: Omit<Report, 'id'>): Promise<Report> => {
    if (!USE_DEMO_STORAGE) {
      const created = await apiClient.createReport(r);
      setReports((prev) => mergeItems(prev, [created]));
      return created;
    }
    const id = `report-${Date.now()}`;
    const newReport: Report = { ...r, id, createdAt: new Date().toISOString() };
    setReports((prev) => [...prev, newReport]);

    try {
      await apiClient.createReport(r);
    } catch (err) {
      console.warn('apiClient.createReport failed, attempting Firestore:', err);
      try {
        const db = getFirestoreDb();
        if (db) await setDoc(doc(db, 'reports', id), newReport);
      } catch (fErr) { console.warn('Firestore setDoc failed:', fErr); }
    }
    return newReport;
  };

  const editReport = async (id: string, updates: Partial<Report>) => {
    if (!USE_DEMO_STORAGE) {
      const updated = await apiClient.updateReport(id, updates);
      setReports((prev) => prev.map((r) => (r.id === id ? updated : r)));
      return;
    }
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));

    try {
      await apiClient.updateReport(id, updates);
    } catch (err) {
      console.warn('apiClient.updateReport failed, attempting Firestore:', err);
      try {
        const db = getFirestoreDb();
        if (db) await updateDoc(doc(db, 'reports', id), updates);
      } catch (fErr) { console.warn('Firestore updateDoc failed:', fErr); }
    }
  };

  const addPatientRequest = async (r: Omit<PatientRequest, 'id'>): Promise<PatientRequest> => {
    if (!USE_DEMO_STORAGE) {
      const created = await apiClient.createPatientRequest(r);
      setPatientRequests((prev) => mergeItems(prev, [created]));
      return created;
    }
    const id = `req-${Date.now()}`;
    const newReq: PatientRequest = { ...r, id, dateSubmitted: (r as any).dateSubmitted || new Date().toISOString() };
    setPatientRequests((prev) => [...prev, newReq]);

    try {
      await apiClient.createPatientRequest(r);
    } catch (err) {
      console.warn('apiClient.createPatientRequest failed, attempting Firestore:', err);
      try {
        const db = getFirestoreDb();
        // Use 'patient_requests' to match dataService.ts and the live listener above
        if (db) await setDoc(doc(db, 'patient_requests', id), newReq);
      } catch (fErr) { console.warn('Firestore setDoc failed:', fErr); }
    }
    return newReq;
  };

  const editPatientRequest = async (id: string, updates: Partial<PatientRequest>) => {
    if (!USE_DEMO_STORAGE) {
      const updated = await apiClient.updatePatientRequest(id, updates);
      setPatientRequests((prev) => prev.map((r) => (r.id === id ? updated : r)));
      return;
    }
    setPatientRequests((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));

    try {
      await apiClient.updatePatientRequest(id, updates);
    } catch (err) {
      console.warn('apiClient.updatePatientRequest failed, attempting Firestore:', err);
      try {
        const db = getFirestoreDb();
        // Use 'patient_requests' to match dataService.ts and the live listener above
        if (db) await updateDoc(doc(db, 'patient_requests', id), updates);
      } catch (fErr) { console.warn('Firestore updateDoc failed:', fErr); }
    }
  };

  const addAuditLog = async (log: Omit<AuditLog, 'id'>) => {
    if (!USE_DEMO_STORAGE) {
      const created = await apiClient.createAuditLog(log as Omit<AuditLog, 'id' | 'timestamp'>);
      setAuditLogs((prev) => mergeItems(prev, [created]));
      return;
    }
    const id = `audit-${Date.now()}`;
    const newLog: AuditLog = { ...log, id, timestamp: (log as any).timestamp || new Date().toISOString() };
    setAuditLogs((prev) => [newLog, ...prev]);

    try {
      await apiClient.createAuditLog(log as Omit<AuditLog, 'id' | 'timestamp'>);
    } catch (err) {
      console.warn('apiClient.createAuditLog failed, attempting Firestore:', err);
      try {
        const db = getFirestoreDb();
        if (db) await setDoc(doc(db, 'audit_logs', id), newLog);
      } catch (fErr) { console.warn('Firestore setDoc failed:', fErr); }
    }
  };

  // Comments
  const addComment = async (comment: Omit<CaseComment, 'id' | 'timestamp'>) => {
    if (!USE_DEMO_STORAGE) {
      const created = await apiClient.addComment(comment.caseId, { message: comment.message });
      setComments((prev) => mergeItems(prev, [created]));
      return;
    }
    const newComment: CaseComment = { ...comment, id: `comment-${Date.now()}`, timestamp: new Date().toISOString() };
    setComments((prev) => { const next = [...prev, newComment]; saveComments(next); return next; });
  };

  const getCommentsForCase = (caseId: string) => comments.filter((c) => c.caseId === caseId);

  // Recently Viewed
  const addRecentItem = (item: Omit<RecentItem, 'viewedAt'>) => {
    setRecentItems((prev) => {
      const filtered = prev.filter((r) => r.id !== item.id);
      const next = [{ ...item, viewedAt: new Date().toISOString() }, ...filtered].slice(0, 10);
      saveRecent(next);
      return next;
    });
  };

  const clearStorage = () => {
    if (!USE_DEMO_STORAGE) return;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(COMMENTS_KEY);
    localStorage.removeItem(RECENT_KEY);
    localStorage.removeItem(TRASH_KEY);
    loadAll();
  };

  // Soft Delete — moves item to trash
  const softDelete = (type: TrashItem['type'], id: string, deletedBy: string) => {
    if (!USE_DEMO_STORAGE) {
      throw new Error('Local soft delete is available only in demo mode. Use the server-backed archive workflow.');
    }
    let data: any = null;
    switch (type) {
      case 'user': data = users.find((u) => u.id === id); setUsers((prev) => prev.filter((u) => u.id !== id)); break;
      case 'clinic': data = clinics.find((c) => c.id === id); setClinics((prev) => prev.filter((c) => c.id !== id)); break;
      case 'equipment': data = equipment.find((e) => e.id === id); setEquipment((prev) => prev.filter((e) => e.id !== id)); break;
      case 'patient': data = patients.find((p) => p.id === id); setPatients((prev) => prev.filter((p) => p.id !== id)); break;
      case 'case': data = cases.find((c) => c.id === id); setCases((prev) => prev.filter((c) => c.id !== id)); break;
      case 'patientRequest': data = patientRequests.find((r) => r.id === id); setPatientRequests((prev) => prev.filter((r) => r.id !== id)); break;
    }
    if (data) {
      const trashItem: TrashItem = { id: `trash-${Date.now()}`, type, data, deletedAt: new Date().toISOString(), deletedBy };
      setTrash((prev) => { const next = [trashItem, ...prev]; saveTrash(next); return next; });
    }
  };

  // Restore from trash
  const restoreFromTrash = (trashItemId: string) => {
    if (!USE_DEMO_STORAGE) {
      throw new Error('Local restore is available only in demo mode. Use the server-backed archive workflow.');
    }
    const item = trash.find((t) => t.id === trashItemId);
    if (!item) return;
    switch (item.type) {
      case 'user': setUsers((prev) => [...prev, item.data]); break;
      case 'clinic': setClinics((prev) => [...prev, item.data]); break;
      case 'equipment': setEquipment((prev) => [...prev, item.data]); break;
      case 'patient': setPatients((prev) => [...prev, item.data]); break;
      case 'case': setCases((prev) => [...prev, item.data]); break;
      case 'patientRequest': setPatientRequests((prev) => [...prev, item.data]); break;
    }
    setTrash((prev) => { const next = prev.filter((t) => t.id !== trashItemId); saveTrash(next); return next; });
  };

  // Permanent delete — removes from trash forever
  const permanentDelete = (trashItemId: string) => {
    if (!USE_DEMO_STORAGE) {
      throw new Error('Local deletion is available only in demo mode. Use the server-backed archive workflow.');
    }
    setTrash((prev) => { const next = prev.filter((t) => t.id !== trashItemId); saveTrash(next); return next; });
  };

  return (
    <DataContext.Provider value={{
      users, cases, patients, clinics, reports, patientRequests, auditLogs, equipment, loading,
      comments, recentItems, trash,
      addCase, editCase, addPatient, editPatient, addReport, editReport,
      addPatientRequest, editPatientRequest, addAuditLog,
      addComment, getCommentsForCase, addRecentItem,
      softDelete, restoreFromTrash, permanentDelete,
      setUsers, setEquipment, setClinics, setPatients, setPatientRequests,
      refresh: loadAll, clearStorage,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be within DataProvider');
  return ctx;
}
