import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  doc,
  setDoc,
  updateDoc,
  getDocs,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { getFirestoreDb, isDemoMode, isFirebaseConfigured, waitForAuthReady } from '../services/firebase';
import { apiClient } from '../services/apiClient';
import {
  getUsers, getCases, getPatients, getClinics, getReports,
  getPatientRequests, getAuditLogs, getMobilePacsVans,
} from '../services/dataService';
import {
  mockUsers, mockClinics, mockPatients, mockCases, mockReports,
  mockPatientRequests, mockMobilePacsVans,
} from '../services/mockData';
import type { User, Case, Patient, Clinic, Report, PatientRequest, AuditLog, MobilePacsVan, Comment } from '../types';

// --- LocalStorage Persistence Layer ---
const STORAGE_KEY = 'healthgrid_data';
// Bump this version whenever seed data changes (e.g. new demo images or system roles).
// Any cached data from a previous version will be discarded and reloaded from mock.
const STORAGE_VERSION = '9'; // v9: Super Admin role & Theta Edge Berhad account
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
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, lastUpdated: new Date().toISOString(), version: STORAGE_VERSION }));
  } catch { /* Storage full or unavailable — fail silently */ }
}

// Re-export canonical Comment type for backwards-compat with components that imported CaseComment
export type CaseComment = Comment;

const COMMENTS_KEY = 'healthgrid_comments';
function loadComments(): CaseComment[] {
  try { const raw = localStorage.getItem(COMMENTS_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function saveComments(comments: CaseComment[]) {
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
  // Scoped local-state helpers — preferred over raw setters for individual item changes
  updateUserLocally: (id: string, updates: Partial<User>) => void;
  updateEquipmentLocally: (id: string, updates: Partial<MobilePacsVan>) => void;
  updateClinicLocally: (id: string, updates: Partial<Clinic>) => void;
  updatePatientLocally: (id: string, updates: Partial<Patient>) => void;
  addUserLocally: (user: User) => void;
  addEquipmentLocally: (van: MobilePacsVan) => void;
  addClinicLocally: (clinic: Clinic) => void;
  // Raw setters retained for admin pages that need to batch-replace full lists
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  setEquipment: React.Dispatch<React.SetStateAction<MobilePacsVan[]>>;
  setClinics: React.Dispatch<React.SetStateAction<Clinic[]>>;
  setPatients: React.Dispatch<React.SetStateAction<Patient[]>>;
  setPatientRequests: React.Dispatch<React.SetStateAction<PatientRequest[]>>;
  refresh: () => void;
  clearStorage: () => void;
  resetFirestoreData: () => Promise<void>;
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

    const isConfigured = isFirebaseConfigured();
    const persisted = !isConfigured ? loadFromStorage() : null;

    let initUsers: User[] = [];
    let initCases: Case[] = [];
    let initPatients: Patient[] = [];
    let initClinics: Clinic[] = [];
    let initReports: Report[] = [];
    let initRequests: PatientRequest[] = [];
    let initLogs: AuditLog[] = [];
    let initEquipment: MobilePacsVan[] = [];

    if (isConfigured || !persisted) {
      try {
        const [u, c, p, cl, r, pr, eq, al] = await Promise.all([
          getUsers(), getCases(), getPatients(), getClinics(),
          getReports(), getPatientRequests(), getMobilePacsVans(),
          getAuditLogs().catch(() => []),
        ]);
        initUsers = u; initCases = c; initPatients = p; initClinics = cl;
        initReports = r; initRequests = pr; initEquipment = eq; initLogs = al;
      } catch (e) {
        console.warn('Firestore initial loading error:', e);
      }
    } else if (persisted) {
      initUsers = persisted.users || [];
      initCases = persisted.cases || [];
      initPatients = persisted.patients || [];
      initClinics = persisted.clinics || [];
      initReports = persisted.reports || [];
      initRequests = persisted.patientRequests || [];
      initLogs = persisted.auditLogs || [];
      initEquipment = persisted.equipment || [];
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

  // Real-time Firestore listeners — one subscription per collection, no duplicates
  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    const db = getFirestoreDb();
    if (!db) return;

    const unsubscribers: (() => void)[] = [];

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

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, []);

  // Persist to localStorage whenever state changes (debounced)
  useEffect(() => {
    if (!initialized.current) return;
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

  // Listen for updates from other tabs — trigger a full reload instead of re-reading
  // potentially stale localStorage, since the Firestore listeners are the source of truth.
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('healthgrid_sync');
      bc.onmessage = (event) => {
        if (event.data?.type === 'DATA_UPDATED') {
          // Only reload from localStorage when Firebase is not configured (demo mode).
          // In live mode the onSnapshot listeners already deliver the latest data.
          if (!isFirebaseConfigured()) {
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
        }
      };
    } catch {}
    return () => { bc?.close(); };
  }, []);

  // Clear clinical data from localStorage when the tab/window is closed.
  // This protects shared workstations — a closed session leaves no cached
  // patient records readable by the next user of that browser.
  // Note: 'pagehide' fires more reliably than 'beforeunload' on mobile/Safari.
  useEffect(() => {
    const clearOnClose = () => {
      // Only clear in demo/local mode. In live Firebase mode the Firestore
      // listeners are the source of truth and localStorage is just a warm cache.
      if (!isFirebaseConfigured()) {
        localStorage.removeItem(STORAGE_KEY);
      }
    };
    window.addEventListener('pagehide', clearOnClose);
    return () => window.removeEventListener('pagehide', clearOnClose);
  }, []);
  // Tries apiClient first (Cloud Functions), falls back to direct Firestore.
  // If both fail the optimistic state update is reverted and the error rethrown.
  // -------------------------------------------------------------------------
  // Utility: recursively strip undefined values so Firestore never receives them anywhere in nested objects/arrays
  const clean = <T extends unknown>(val: T): T => {
    if (val === null || val === undefined) return val;
    if (Array.isArray(val)) {
      return val.map((item) => clean(item)).filter((item) => item !== undefined) as unknown as T;
    }
    if (typeof val === 'object' && val.constructor === Object) {
      const res: Record<string, any> = {};
      for (const [k, v] of Object.entries(val)) {
        if (v !== undefined) {
          res[k] = clean(v);
        }
      }
      return res as T;
    }
    return val;
  };

  const addCase = async (c: Omit<Case, 'id'>): Promise<Case> => {
    const id = `case-${Date.now()}`;
    const data = clean({ ...c, id, createdAt: new Date().toISOString() }) as Case;
    setCases((prev) => [...prev, data]);
    const db = getFirestoreDb();
    if (db) {
      try {
        await setDoc(doc(db, 'cases', id), data);
      } catch (e) {
        console.warn('[addCase] Firestore write warning:', e);
      }
    }
    return data;
  };

  const editCase = async (id: string, updates: Partial<Case>) => {
    const data = clean(updates);
    setCases((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)));
    const db = getFirestoreDb();
    if (db) {
      try {
        await updateDoc(doc(db, 'cases', id), data as any);
      } catch (e) {
        console.warn('[editCase] Firestore write warning:', e);
      }
    }
  };

  const addPatient = async (p: Omit<Patient, 'id'>): Promise<Patient> => {
    const id = `patient-${Date.now()}`;
    const data = clean({ ...p, id }) as Patient;
    setPatients((prev) => [...prev, data]);
    const db = getFirestoreDb();
    if (db) {
      try {
        await setDoc(doc(db, 'patients', id), data);
      } catch (e) {
        console.warn('[addPatient] Firestore write warning:', e);
      }
    }
    return data;
  };

  const editPatient = async (id: string, updates: Partial<Patient>) => {
    const data = clean(updates);
    setPatients((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
    const db = getFirestoreDb();
    if (db) {
      try {
        await updateDoc(doc(db, 'patients', id), data as any);
      } catch (e) {
        console.warn('[editPatient] Firestore write warning:', e);
      }
    }
  };

  const addReport = async (r: Omit<Report, 'id'>): Promise<Report> => {
    const id = `report-${Date.now()}`;
    const data = clean({ ...r, id, createdAt: new Date().toISOString() }) as Report;
    setReports((prev) => [...prev, data]);
    const db = getFirestoreDb();
    if (db) {
      try {
        await setDoc(doc(db, 'reports', id), data);
      } catch (e) {
        console.warn('[addReport] Firestore write warning:', e);
      }
    }
    return data;
  };

  const editReport = async (id: string, updates: Partial<Report>) => {
    const data = clean(updates);
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, ...data } : r)));
    const db = getFirestoreDb();
    if (db) {
      try {
        await updateDoc(doc(db, 'reports', id), data as any);
      } catch (e) {
        console.warn('[editReport] Firestore write warning:', e);
      }
    }
  };

  const addPatientRequest = async (r: Omit<PatientRequest, 'id'>): Promise<PatientRequest> => {
    const id = `req-${Date.now()}`;
    const data = clean({ ...r, id, dateSubmitted: (r as any).dateSubmitted || new Date().toISOString() }) as PatientRequest;
    setPatientRequests((prev) => [...prev, data]);
    const db = getFirestoreDb();
    if (db) {
      try {
        await setDoc(doc(db, 'patient_requests', id), data);
      } catch (e) {
        console.warn('[addPatientRequest] Firestore write warning:', e);
      }
    }
    return data;
  };

  const editPatientRequest = async (id: string, updates: Partial<PatientRequest>) => {
    const data = clean(updates);
    setPatientRequests((prev) => prev.map((r) => (r.id === id ? { ...r, ...data } : r)));
    const db = getFirestoreDb();
    if (db) {
      try {
        await updateDoc(doc(db, 'patient_requests', id), data as any);
      } catch (e) {
        console.warn('[editPatientRequest] Firestore write warning:', e);
      }
    }
  };

  const addAuditLog = async (log: Omit<AuditLog, 'id'>) => {
    const id = `audit-${Date.now()}`;
    const newLog: AuditLog = clean({ ...log, id, timestamp: (log as any).timestamp || new Date().toISOString() });
    setAuditLogs((prev) => [newLog, ...prev]);
    const db = getFirestoreDb();
    if (db) {
      try {
        await setDoc(doc(db, 'audit_logs', id), newLog);
      } catch (fErr) {
        console.warn('Audit log write failed (non-fatal):', fErr);
      }
    }
  };

  // Comments
  const addComment = async (comment: Omit<CaseComment, 'id' | 'timestamp'>) => {
    const id = `comment-${Date.now()}`;
    const newComment: CaseComment = clean({ ...comment, id, timestamp: new Date().toISOString() });
    setComments((prev) => { const next = [...prev, newComment]; saveComments(next); return next; });
    const db = getFirestoreDb();
    if (db) {
      try {
        await setDoc(doc(db, 'comments', id), newComment);
      } catch (fErr) {
        console.warn('Comment write failed (non-fatal):', fErr);
      }
    }
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

  const resetFirestoreData = async (): Promise<void> => {
    const db = getFirestoreDb();
    if (!db) {
      clearStorage();
      return;
    }
    setLoading(true);
    try {
      const collectionsToClear = ['cases', 'patients', 'reports', 'patient_requests', 'comments', 'audit_logs', 'trash'];
      for (const colName of collectionsToClear) {
        const snap = await getDocs(collection(db, colName));
        await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
      }

      const batch = writeBatch(db);
      mockUsers.forEach((u) => batch.set(doc(db, 'users', u.id), clean(u)));
      mockClinics.forEach((c) => batch.set(doc(db, 'clinics', c.id), clean(c)));
      mockPatients.forEach((p) => batch.set(doc(db, 'patients', p.id), clean(p)));
      mockCases.forEach((c) => batch.set(doc(db, 'cases', c.id), clean(c)));
      mockReports.forEach((r) => batch.set(doc(db, 'reports', r.id), clean(r)));
      mockPatientRequests.forEach((pr) => batch.set(doc(db, 'patient_requests', pr.id), clean(pr)));
      mockMobilePacsVans.forEach((v) => batch.set(doc(db, 'mobile_pacs_vans', v.id), clean(v)));

      await batch.commit();

      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(COMMENTS_KEY);
      localStorage.removeItem(RECENT_KEY);
      localStorage.removeItem(TRASH_KEY);

      await loadAll();
    } catch (err) {
      console.error('Reset Firestore data failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Soft Delete — moves item to trash
  const softDelete = (type: TrashItem['type'], id: string, deletedBy: string) => {
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
      if (isFirebaseConfigured()) {
        const db = getFirestoreDb();
        if (db) {
          const colName = type === 'clinic' ? 'clinics' : type === 'user' ? 'users' : type === 'equipment' ? 'equipment' : type === 'patient' ? 'patients' : type === 'case' ? 'cases' : 'patientRequests';
          deleteDoc(doc(db, colName, id)).catch((err) => console.warn(`Failed deleting ${colName}/${id} from Firestore:`, err));
        }
      }
    }
  };

  // Restore from trash
  const restoreFromTrash = (trashItemId: string) => {
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
    if (isFirebaseConfigured() && item.data && item.data.id) {
      const db = getFirestoreDb();
      if (db) {
        const colName = item.type === 'clinic' ? 'clinics' : item.type === 'user' ? 'users' : item.type === 'equipment' ? 'equipment' : item.type === 'patient' ? 'patients' : item.type === 'case' ? 'cases' : 'patientRequests';
        setDoc(doc(db, colName, item.data.id), item.data, { merge: true }).catch((err) => console.warn(`Failed restoring ${colName}/${item.data.id} to Firestore:`, err));
      }
    }
  };

  // Permanent delete — removes from trash forever
  const permanentDelete = (trashItemId: string) => {
    setTrash((prev) => { const next = prev.filter((t) => t.id !== trashItemId); saveTrash(next); return next; });
  };

  // ---------------------------------------------------------------------------
  // Scoped local-state helpers — update a single item without exposing raw setters
  // ---------------------------------------------------------------------------
  const updateUserLocally = (id: string, updates: Partial<User>) =>
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...updates } : u)));

  const updateEquipmentLocally = (id: string, updates: Partial<MobilePacsVan>) =>
    setEquipment((prev) => prev.map((v) => (v.id === id ? { ...v, ...updates } : v)));

  const updateClinicLocally = (id: string, updates: Partial<Clinic>) =>
    setClinics((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));

  const updatePatientLocally = (id: string, updates: Partial<Patient>) =>
    setPatients((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));

  const addUserLocally = (user: User) =>
    setUsers((prev) => [...prev.filter((u) => u.id !== user.id), user]);

  const addEquipmentLocally = (van: MobilePacsVan) =>
    setEquipment((prev) => [...prev.filter((v) => v.id !== van.id), van]);

  const addClinicLocally = (clinic: Clinic) =>
    setClinics((prev) => [...prev.filter((c) => c.id !== clinic.id), clinic]);

  return (
    <DataContext.Provider value={{
      users, cases, patients, clinics, reports, patientRequests, auditLogs, equipment, loading,
      comments, recentItems, trash,
      addCase, editCase, addPatient, editPatient, addReport, editReport,
      addPatientRequest, editPatientRequest, addAuditLog,
      addComment, getCommentsForCase, addRecentItem,
      softDelete, restoreFromTrash, permanentDelete,
      updateUserLocally, updateEquipmentLocally, updateClinicLocally,
      updatePatientLocally, addUserLocally, addEquipmentLocally, addClinicLocally,
      setUsers, setEquipment, setClinics, setPatients, setPatientRequests,
      refresh: loadAll, clearStorage, resetFirestoreData,
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
