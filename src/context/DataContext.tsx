import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import {
  getUsers, getCases, getPatients, getClinics, getReports,
  getPatientRequests, getAuditLogs, getMobilePacsVans,
  createCase as createCaseSvc, updateCase as updateCaseSvc,
  createPatient as createPatientSvc, updatePatient as updatePatientSvc,
  createReport as createReportSvc, updateReport as updateReportSvc,
  createPatientRequest as createPatientRequestSvc, updatePatientRequest as updatePatientRequestSvc,
  createAuditLog as createAuditLogSvc,
} from '../services/dataService';
import type { User, Case, Patient, Clinic, Report, PatientRequest, AuditLog, MobilePacsVan } from '../types';

// --- LocalStorage Persistence Layer ---
const STORAGE_KEY = 'healthgrid_data';
// Bump this version whenever seed data changes (e.g. new demo images).
// Any cached data from a previous version will be discarded and reloaded from mock.
const STORAGE_VERSION = '2'; // v2: real X-ray images seeded per demo report

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

// --- Case Comments (communication thread) ---
export interface CaseComment {
  id: string;
  caseId: string;
  userId: string;
  userName: string;
  userRole: string;
  message: string;
  timestamp: string;
}

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
function loadRecent(): RecentItem[] { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; } }
function saveRecent(items: RecentItem[]) { try { localStorage.setItem(RECENT_KEY, JSON.stringify(items.slice(0, 10))); } catch {} }

// --- Recycle Bin (Soft Delete) ---
export interface TrashItem {
  id: string;
  type: 'user' | 'clinic' | 'equipment' | 'patient' | 'case' | 'patientRequest';
  data: any;
  deletedAt: string;
  deletedBy: string;
}
const TRASH_KEY = 'healthgrid_trash';
function loadTrash(): TrashItem[] { try { return JSON.parse(localStorage.getItem(TRASH_KEY) || '[]'); } catch { return []; } }
function saveTrash(items: TrashItem[]) { try { localStorage.setItem(TRASH_KEY, JSON.stringify(items)); } catch {} }

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
  addComment: (comment: Omit<CaseComment, 'id' | 'timestamp'>) => void;
  getCommentsForCase: (caseId: string) => CaseComment[];
  addRecentItem: (item: Omit<RecentItem, 'viewedAt'>) => void;
  softDelete: (type: TrashItem['type'], id: string, deletedBy: string) => void;
  restoreFromTrash: (trashItemId: string) => void;
  permanentDelete: (trashItemId: string) => void;
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

  // Load from localStorage first, then fall back to mock data
  const loadAll = useCallback(async () => {
    setLoading(true);

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
    } else {
      const [u, c, p, cl, r, pr, al, eq] = await Promise.all([
        getUsers(), getCases(), getPatients(), getClinics(),
        getReports(), getPatientRequests(), getAuditLogs(), getMobilePacsVans(),
      ]);
      setUsers(u); setCases(c); setPatients(p); setClinics(cl);
      setReports(r); setPatientRequests(pr); setAuditLogs(al); setEquipment(eq);
    }

    setComments(loadComments());
    setRecentItems(loadRecent());
    setTrash(loadTrash());
    setLoading(false);
    initialized.current = true;
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

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

  // Mutations
  const addCase = async (c: Omit<Case, 'id'>): Promise<Case> => {
    const created = await createCaseSvc(c);
    setCases((prev) => [...prev, created]);
    return created;
  };

  const editCase = async (id: string, updates: Partial<Case>) => {
    await updateCaseSvc(id, updates);
    setCases((prev) => prev.map((c) => c.id === id ? { ...c, ...updates } : c));
  };

  const addPatient = async (p: Omit<Patient, 'id'>): Promise<Patient> => {
    const created = await createPatientSvc(p);
    setPatients((prev) => [...prev, created]);
    return created;
  };

  const editPatient = async (id: string, updates: Partial<Patient>) => {
    await updatePatientSvc(id, updates);
    setPatients((prev) => prev.map((p) => p.id === id ? { ...p, ...updates } : p));
  };

  const addReport = async (r: Omit<Report, 'id'>): Promise<Report> => {
    const created = await createReportSvc(r);
    setReports((prev) => [...prev, created]);
    return created;
  };

  const editReport = async (id: string, updates: Partial<Report>) => {
    await updateReportSvc(id, updates);
    setReports((prev) => prev.map((r) => r.id === id ? { ...r, ...updates } : r));
  };

  const addPatientRequest = async (r: Omit<PatientRequest, 'id'>): Promise<PatientRequest> => {
    const created = await createPatientRequestSvc(r);
    setPatientRequests((prev) => [...prev, created]);
    return created;
  };

  const editPatientRequest = async (id: string, updates: Partial<PatientRequest>) => {
    await updatePatientRequestSvc(id, updates);
    setPatientRequests((prev) => prev.map((r) => r.id === id ? { ...r, ...updates } : r));
  };

  const addAuditLog = async (log: Omit<AuditLog, 'id'>) => {
    await createAuditLogSvc(log);
    setAuditLogs((prev) => [{ ...log, id: `audit-${Date.now()}` }, ...prev]);
  };

  // Comments
  const addComment = (comment: Omit<CaseComment, 'id' | 'timestamp'>) => {
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
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(COMMENTS_KEY);
    localStorage.removeItem(RECENT_KEY);
    localStorage.removeItem(TRASH_KEY);
    loadAll();
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
  };

  // Permanent delete — removes from trash forever
  const permanentDelete = (trashItemId: string) => {
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
