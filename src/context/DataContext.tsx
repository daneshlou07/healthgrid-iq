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
  getExternalReferrals, createExternalReferral, updateExternalReferral,
} from '../services/dataService';
import {
  mockUsers, mockClinics, mockPatients, mockCases, mockReports,
  mockPatientRequests, mockMobilePacsVans,
} from '../services/mockData';
import { mockEquipmentCatalog, mockInitialQuotations } from '../services/mockMarketplaceData';
import { useAuth } from './AuthContext';
import type {
  User, Case, Patient, Clinic, Report, PatientRequest, AuditLog, MobilePacsVan, Comment,
  EquipmentItem, QuotationRequest, QuotationItem, MarketplaceCartItem, QuotationNegotiationMessage,
  RfqDraftItem, EquipmentAvailability, QuotationStatus,
  ExternalImagingRequest, MachineIssueReason, ExternalFacilityType, UserRole,
} from '../types';
import {
  RoleNavigationConfig,
  loadRoleNavConfig,
  saveRoleNavConfig,
  DEFAULT_ROLE_NAV_CONFIG,
} from '../services/permissionService';

// --- LocalStorage Persistence Layer ---
const STORAGE_KEY = 'healthgrid_data';
// Bump this version whenever seed data changes (e.g. new demo images or system roles).
// Any cached data from a previous version will be discarded and reloaded from mock.
const STORAGE_VERSION = '12'; // v12: Clinical & BEMS External Imaging Workflow
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
  externalReferrals?: ExternalImagingRequest[];
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

// --- Equipment Marketplace LocalStorage ---
const MARKETPLACE_CATALOG_KEY = 'healthgrid_equipment_catalog';
const QUOTATIONS_KEY = 'healthgrid_quotations';
const CART_KEY = 'healthgrid_marketplace_cart';

function loadMarketplaceCatalog(): EquipmentItem[] {
  try {
    const raw = localStorage.getItem(MARKETPLACE_CATALOG_KEY);
    return raw ? JSON.parse(raw) : mockEquipmentCatalog;
  } catch {
    return mockEquipmentCatalog;
  }
}

function saveMarketplaceCatalog(catalog: EquipmentItem[]) {
  try { localStorage.setItem(MARKETPLACE_CATALOG_KEY, JSON.stringify(catalog)); } catch {}
}

function loadQuotations(): QuotationRequest[] {
  try {
    const raw = localStorage.getItem(QUOTATIONS_KEY);
    return raw ? JSON.parse(raw) : mockInitialQuotations;
  } catch {
    return mockInitialQuotations;
  }
}

function saveQuotations(quotes: QuotationRequest[]) {
  try { localStorage.setItem(QUOTATIONS_KEY, JSON.stringify(quotes)); } catch {}
}

function loadCart(): MarketplaceCartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCart(cart: MarketplaceCartItem[]) {
  try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch {}
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

  // Marketplace State & Methods
  equipmentCatalog: EquipmentItem[];
  quotationRequests: QuotationRequest[];
  marketplaceCart: MarketplaceCartItem[];
  rfqDraft: RfqDraftItem[];
  addEquipmentItem: (item: Omit<EquipmentItem, 'id'>) => EquipmentItem;
  updateEquipmentItem: (id: string, updates: Partial<EquipmentItem>) => void;
  deleteEquipmentItem: (id: string) => void;
  updateEquipmentAvailability: (equipmentId: string, availability: EquipmentAvailability) => void;
  updateQuotationStatus: (id: string, status: QuotationStatus, adminRemarks?: string) => void;
  deleteQuotationRequest: (id: string) => void;
  addToRfqDraft: (item: Omit<RfqDraftItem, 'id'>) => void;
  updateRfqDraftItem: (id: string, updates: Partial<RfqDraftItem>) => void;
  removeFromRfqDraft: (id: string) => void;
  clearRfqDraft: () => void;
  addToCart: (item: Omit<MarketplaceCartItem, 'id'>) => void;
  updateCartItem: (id: string, updates: Partial<MarketplaceCartItem>) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  submitQuotationRequest: (
    rfqData: Omit<QuotationRequest, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'negotiationHistory'>
  ) => Promise<QuotationRequest>;
  issueAdminQuotation: (
    quotationId: string,
    pricingData: {
      validUntil?: string;
      items: QuotationItem[];
      subtotalAmount: number;
      discountAmount: number;
      sstTaxAmount: number;
      totalAmount: number;
      paymentTerms?: string;
      warrantyTerms?: string;
      deliveryLeadTimeWeeks?: number;
      adminRemarks?: string;
      reviewedByAdminId: string;
      reviewedByAdminName: string;
      initialMessage?: string;
    }
  ) => Promise<void>;
  submitQuotationNegotiation: (
    quotationId: string,
    message: string,
    requestedDiscountPercent?: number,
    senderUser?: { id: string; name: string; role: string }
  ) => Promise<void>;
  respondToQuotation: (
    quotationId: string,
    decision: 'ACCEPTED' | 'DECLINED',
    remarks?: string
  ) => Promise<void>;
  addCustomEquipmentRequest: (
    customItem: Omit<MarketplaceCartItem, 'id' | 'isCustom'>
  ) => void;

  addCase: (c: Omit<Case, 'id'>) => Promise<Case>;
  editCase: (id: string, updates: Partial<Case>) => Promise<void>;
  addPatient: (p: Omit<Patient, 'id'>) => Promise<Patient>;
  editPatient: (id: string, updates: Partial<Patient>) => Promise<void>;
  addReport: (r: Omit<Report, 'id'>) => Promise<Report>;
  editReport: (id: string, updates: Partial<Report>) => Promise<void>;
  addPatientRequest: (r: Omit<PatientRequest, 'id'>) => Promise<PatientRequest>;
  editPatientRequest: (id: string, updates: Partial<PatientRequest>) => Promise<void>;
  deletePatientRequest: (id: string) => Promise<void>;
  addAuditLog: (log: Omit<AuditLog, 'id'>) => Promise<void>;
  addComment: (comment: Omit<CaseComment, 'id' | 'timestamp'>) => Promise<void>;
  getCommentsForCase: (caseId: string) => CaseComment[];
  addRecentItem: (item: Omit<RecentItem, 'viewedAt'>) => void;
  softDelete: (type: TrashItem['type'], id: string, deletedBy: string) => void;
  restoreFromTrash: (trashItemId: string) => void;
  permanentDelete: (trashItemId: string) => void;

  // BEMS & External Imaging Workflow Methods
  externalReferrals: ExternalImagingRequest[];
  addExternalReferral: (req: Omit<ExternalImagingRequest, 'id'>) => Promise<ExternalImagingRequest>;
  editExternalReferral: (id: string, updates: Partial<ExternalImagingRequest>) => Promise<void>;
  reportMachineUnavailable: (caseId: string, payload: { reason: MachineIssueReason; notes?: string; user: User }) => Promise<ExternalImagingRequest>;
  bemsAssignFacility: (referralId: string, payload: { facilityType: ExternalFacilityType; facilityId: string; facilityName: string; radiographerId?: string; radiographerName?: string; hospitalAdminId?: string; hospitalAdminName?: string; bemsOfficer: User; bemsNotes?: string }) => Promise<void>;
  hospitalAdminAssignRadiographer: (referralId: string, payload: { radiographerId: string; radiographerName: string; adminUser: User; notes?: string }) => Promise<void>;
  externalUploadScans: (referralId: string, payload: { imageKeys: string[]; technicalFactors?: any; radiographerFindings?: string; radiographerImpression?: string; routedToRole?: 'Medical Officer' | 'Radiologist'; uploadedBy: User }) => Promise<void>;
  submitFinalMoReport: (caseId: string, reportPayload: { findings: string; impression: string; suggestions?: string; isCriticalFinding?: boolean; criticalFindingNote?: string; moUser: User }) => Promise<void>;

  // Dynamic RBAC Navigation Permissions
  roleNavigationConfig: RoleNavigationConfig;
  updateRoleNavigation: (role: UserRole, enabledKeys: string[]) => void;
  resetRoleNavigation: (role?: UserRole) => void;

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
  const [externalReferrals, setExternalReferrals] = useState<ExternalImagingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<CaseComment[]>([]);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [trash, setTrash] = useState<TrashItem[]>([]);

  // Marketplace State
  const { currentUser } = useAuth();
  const [equipmentCatalog, setEquipmentCatalog] = useState<EquipmentItem[]>(() => loadMarketplaceCatalog());
  const [quotationRequests, setQuotationRequests] = useState<QuotationRequest[]>(() => loadQuotations());
  const [marketplaceCart, setMarketplaceCart] = useState<MarketplaceCartItem[]>(() => loadCart());

  // Scoped RFQ Draft storage per authenticated Healthcare Center Admin / User
  const getRfqDraftStorageKey = useCallback((user: User | null) => {
    if (!user) return 'healthgrid_rfq_draft_guest';
    const scopeId = user.deploymentLocationId || user.id;
    return `healthgrid_rfq_draft_${scopeId}`;
  }, []);

  const loadScopedRfqDraft = useCallback((user: User | null): RfqDraftItem[] => {
    try {
      const raw = localStorage.getItem(getRfqDraftStorageKey(user));
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }, [getRfqDraftStorageKey]);

  const saveScopedRfqDraft = useCallback((draft: RfqDraftItem[], user: User | null) => {
    try {
      localStorage.setItem(getRfqDraftStorageKey(user), JSON.stringify(draft));
    } catch {}
  }, [getRfqDraftStorageKey]);

  const [rfqDraft, setRfqDraft] = useState<RfqDraftItem[]>(() => loadScopedRfqDraft(currentUser));

  const [roleNavigationConfig, setRoleNavigationConfig] = useState<RoleNavigationConfig>(() => loadRoleNavConfig());

  const updateRoleNavigation = useCallback((role: UserRole, enabledKeys: string[]) => {
    setRoleNavigationConfig((prev) => {
      const updated = {
        ...prev,
        [role]: enabledKeys,
      };
      saveRoleNavConfig(updated);
      try {
        const bc = new BroadcastChannel('healthgrid_sync');
        bc.postMessage({ type: 'DATA_UPDATED', timestamp: Date.now() });
        bc.close();
      } catch {}
      return updated;
    });
  }, []);

  const resetRoleNavigation = useCallback((role?: UserRole) => {
    setRoleNavigationConfig((prev) => {
      let updated: RoleNavigationConfig;
      if (role) {
        updated = {
          ...prev,
          [role]: DEFAULT_ROLE_NAV_CONFIG[role],
        };
      } else {
        updated = { ...DEFAULT_ROLE_NAV_CONFIG };
      }
      saveRoleNavConfig(updated);
      try {
        const bc = new BroadcastChannel('healthgrid_sync');
        bc.postMessage({ type: 'DATA_UPDATED', timestamp: Date.now() });
        bc.close();
      } catch {}
      return updated;
    });
  }, []);

  const initialized = useRef(false);

  // Helper to merge live items with current state by ID (preserving deep properties)
  const mergeItems = <T extends { id: string }>(current: T[], incoming: T[]): T[] => {
    if (!incoming || incoming.length === 0) return current;
    const map = new Map<string, T>();
    current.forEach((item) => map.set(item.id, item));
    incoming.forEach((item) => {
      const existing = map.get(item.id);
      map.set(item.id, existing ? { ...existing, ...item } : item);
    });
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
    let initReferrals: ExternalImagingRequest[] = [];

    if (isConfigured) {
      try {
        const [u, c, p, cl, r, pr, eq, al, ref] = await Promise.all([
          getUsers(), getCases(), getPatients(), getClinics(),
          getReports(), getPatientRequests(), getMobilePacsVans(),
          getAuditLogs().catch(() => []),
          getExternalReferrals().catch(() => []),
        ]);
        initUsers = u; initCases = c; initPatients = p; initClinics = cl;
        initReports = r; initRequests = pr; initEquipment = eq; initLogs = al;
        initReferrals = ref;
      } catch (e) {
        console.warn('Firestore initial loading error:', e);
      }
    }

    const localPersisted = loadFromStorage();
    if (localPersisted) {
      if (localPersisted.users?.length) initUsers = mergeItems(initUsers, localPersisted.users);
      if (localPersisted.cases?.length) initCases = mergeItems(initCases, localPersisted.cases);
      if (localPersisted.patients?.length) initPatients = mergeItems(initPatients, localPersisted.patients);
      if (localPersisted.clinics?.length) initClinics = mergeItems(initClinics, localPersisted.clinics);
      if (localPersisted.reports?.length) initReports = mergeItems(initReports, localPersisted.reports);
      if (localPersisted.patientRequests?.length) initRequests = mergeItems(initRequests, localPersisted.patientRequests);
      if (localPersisted.auditLogs?.length) initLogs = mergeItems(initLogs, localPersisted.auditLogs);
      if (localPersisted.equipment?.length) initEquipment = mergeItems(initEquipment, localPersisted.equipment);
      if (localPersisted.externalReferrals?.length) initReferrals = mergeItems(initReferrals, localPersisted.externalReferrals);
    }

    const loadedTrash = loadTrash();
    const deletedUserIds = new Set(
      loadedTrash.filter((t) => t.type === 'user' && t.data).map((t) => t.data.id)
    );

    setUsers(initUsers.filter((u) => !deletedUserIds.has(u.id)));
    setCases(initCases);
    setPatients(initPatients);
    setClinics(initClinics);
    setReports(initReports);
    setPatientRequests(initRequests);
    setAuditLogs(initLogs);
    setEquipment(initEquipment);
    setExternalReferrals(initReferrals);

    setComments(loadComments());
    setRecentItems(loadRecent());
    setTrash(loadedTrash);
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

    unsubscribers.push(
      onSnapshot(
        query(collection(db, 'external_referrals'), orderBy('submittedAt', 'desc')),
        (snapshot) => {
          if (!snapshot.empty) {
            const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ExternalImagingRequest));
            setExternalReferrals((prev) => mergeItems(prev, items));
          }
        },
        (error) => console.warn('External referrals listener warning:', error)
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
      saveToStorage({ users, cases, patients, clinics, reports, patientRequests, auditLogs, equipment, externalReferrals });
      // Broadcast to other tabs
      try {
        const bc = new BroadcastChannel('healthgrid_sync');
        bc.postMessage({ type: 'DATA_UPDATED', timestamp: Date.now() });
        bc.close();
      } catch {}
    }, 300);
    return () => clearTimeout(timer);
  }, [users, cases, patients, clinics, reports, patientRequests, auditLogs, equipment, externalReferrals]);

  // Listen for updates from other tabs — trigger a full reload instead of re-reading
  // potentially stale localStorage, since the Firestore listeners are the source of truth.
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('healthgrid_sync');
      bc.onmessage = (event) => {
        if (event.data?.type === 'DATA_UPDATED') {
          setRoleNavigationConfig(loadRoleNavConfig());
          const persisted = loadFromStorage();
          if (persisted) {
            if (persisted.users?.length) setUsers(persisted.users);
            if (persisted.cases?.length) setCases(persisted.cases);
            if (persisted.patients?.length) setPatients(persisted.patients);
            if (persisted.clinics?.length) setClinics(persisted.clinics);
            if (persisted.reports?.length) setReports(persisted.reports);
            if (persisted.patientRequests?.length) setPatientRequests(persisted.patientRequests);
            if (persisted.auditLogs?.length) setAuditLogs(persisted.auditLogs);
            if (persisted.equipment?.length) setEquipment(persisted.equipment);
            if (persisted.externalReferrals?.length) {
              setExternalReferrals(persisted.externalReferrals);
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

  const deletePatientRequest = async (id: string) => {
    setPatientRequests((prev) => prev.filter((r) => r.id !== id));
    const db = getFirestoreDb();
    if (db) {
      try {
        await deleteDoc(doc(db, 'patient_requests', id));
      } catch (e) {
        console.warn('[deletePatientRequest] Firestore delete warning:', e);
      }
    }
  };

  // ── BEMS & External Imaging Referral Methods ─────────────────────────────
  const addExternalReferral = async (req: Omit<ExternalImagingRequest, 'id'>): Promise<ExternalImagingRequest> => {
    const id = `bems-ref-${Date.now()}`;
    const data = clean({ ...req, id, submittedAt: req.submittedAt || new Date().toISOString() }) as ExternalImagingRequest;
    setExternalReferrals((prev) => [data, ...prev]);
    const db = getFirestoreDb();
    if (db) {
      try {
        await setDoc(doc(db, 'external_referrals', id), data);
      } catch (e) {
        console.warn('[addExternalReferral] Firestore write warning:', e);
      }
    }
    return data;
  };

  const editExternalReferral = async (id: string, updates: Partial<ExternalImagingRequest>) => {
    const data = clean(updates);
    setExternalReferrals((prev) => prev.map((r) => (r.id === id ? { ...r, ...data } : r)));
    const db = getFirestoreDb();
    if (db) {
      try {
        await updateDoc(doc(db, 'external_referrals', id), data as any);
      } catch (e) {
        console.warn('[editExternalReferral] Firestore write warning:', e);
      }
    }
  };

  const reportMachineUnavailable = async (
    caseId: string,
    payload: { reason: MachineIssueReason; notes?: string; user: User }
  ): Promise<ExternalImagingRequest> => {
    const targetCase = cases.find((c) => c.id === caseId);
    if (!targetCase) throw new Error('Case not found');

    const nowIso = new Date().toISOString();
    const refData: Omit<ExternalImagingRequest, 'id'> = {
      caseId: targetCase.id,
      caseNumber: targetCase.caseNumber,
      patientId: targetCase.patientId,
      patientName: targetCase.patientName,
      originatingClinicId: targetCase.clinicId,
      originatingClinicName: targetCase.clinicName,
      requestingRadiographerId: payload.user.id,
      requestingRadiographerName: payload.user.name,
      machineIssueReason: payload.reason,
      machineIssueDetails: payload.notes,
      submittedAt: nowIso,
      status: 'PENDING_BEMZ',
      modality: targetCase.modality || targetCase.scanType,
      urgency: targetCase.severity === 'Critical' ? 'Emergency' : targetCase.severity === 'Severe' ? 'Urgent' : 'Routine',
    };

    const createdReferral = await addExternalReferral(refData);

    await editCase(targetCase.id, {
      status: 'EXTERNAL_REFERRAL_PENDING',
      externalReferralId: createdReferral.id,
      externalReferral: createdReferral,
      machineIssue: {
        reason: payload.reason,
        reportedAt: nowIso,
        notes: payload.notes,
        reportedById: payload.user.id,
        reportedByName: payload.user.name,
      },
    });

    await addAuditLog({
      userId: payload.user.id,
      userName: payload.user.name,
      userRole: payload.user.role,
      action: 'MACHINE_UNAVAILABLE_REPORTED',
      target: `cases/${targetCase.id}`,
      details: `Machine reported unavailable (${payload.reason}). External referral dispatched to BEMS (Ref: ${createdReferral.id}).`,
      timestamp: nowIso,
    });

    return createdReferral;
  };

  const bemsAssignFacility = async (
    referralId: string,
    payload: {
      facilityType: ExternalFacilityType;
      facilityId: string;
      facilityName: string;
      radiographerId?: string;
      radiographerName?: string;
      hospitalAdminId?: string;
      hospitalAdminName?: string;
      bemsOfficer: User;
      bemsNotes?: string;
    }
  ): Promise<void> => {
    const nowIso = new Date().toISOString();
    const isPublic = payload.facilityType === 'PUBLIC_HOSPITAL';
    const hasRadiographer = Boolean(payload.radiographerId);

    const updates: Partial<ExternalImagingRequest> = {
      facilityType: payload.facilityType,
      assignedFacilityId: payload.facilityId,
      assignedFacilityName: payload.facilityName,
      assignedRadiographerId: payload.radiographerId,
      assignedRadiographerName: payload.radiographerName,
      assignedHospitalAdminId: payload.hospitalAdminId,
      assignedHospitalAdminName: payload.hospitalAdminName,
      bemzOfficerId: payload.bemsOfficer.id,
      bemzOfficerName: payload.bemsOfficer.name,
      bemzNotes: payload.bemsNotes,
      bemzProcessedAt: nowIso,
      status: hasRadiographer ? 'EXTERNAL_RADIOGRAPHER_ASSIGNED' : 'PRIVATE_ADMIN_REVIEW',
    };

    await editExternalReferral(referralId, updates);

    const ref = externalReferrals.find((r) => r.id === referralId);
    const targetCaseId = ref?.caseId;

    if (targetCaseId) {
      await editCase(targetCaseId, {
        status: hasRadiographer ? 'EXTERNAL_RADIOGRAPHER_ASSIGNED' : 'PRIVATE_HOSPITAL_ADMIN_REVIEW',
        externalFacilityType: isPublic ? 'Public Hospital' : 'Private Hospital',
        externalFacilityName: payload.facilityName,
        externalRadiographerId: payload.radiographerId,
        externalRadiographerName: payload.radiographerName,
        externalAdminId: payload.hospitalAdminId,
        externalAdminName: payload.hospitalAdminName,
      });

      await addAuditLog({
        userId: payload.bemsOfficer.id,
        userName: payload.bemsOfficer.name,
        userRole: payload.bemsOfficer.role,
        action: isPublic ? 'BEMS_ROUTED_PUBLIC_HOSPITAL' : 'BEMS_ROUTED_PRIVATE_HOSPITAL',
        target: `cases/${targetCaseId}`,
        details: `BEMS assigned external facility: ${payload.facilityName} (${hasRadiographer ? `Direct Radiographer: ${payload.radiographerName}` : `Hospital Admin: ${payload.hospitalAdminName}`}).`,
        timestamp: nowIso,
      });
    }
  };

  const hospitalAdminAssignRadiographer = async (
    referralId: string,
    payload: {
      radiographerId: string;
      radiographerName: string;
      adminUser: User;
      notes?: string;
    }
  ): Promise<void> => {
    const nowIso = new Date().toISOString();
    await editExternalReferral(referralId, {
      assignedRadiographerId: payload.radiographerId,
      assignedRadiographerName: payload.radiographerName,
      status: 'EXTERNAL_RADIOGRAPHER_ASSIGNED',
    });

    const ref = externalReferrals.find((r) => r.id === referralId);
    if (ref?.caseId) {
      await editCase(ref.caseId, {
        status: 'EXTERNAL_RADIOGRAPHER_ASSIGNED',
        externalRadiographerId: payload.radiographerId,
        externalRadiographerName: payload.radiographerName,
      });

      await addAuditLog({
        userId: payload.adminUser.id,
        userName: payload.adminUser.name,
        userRole: payload.adminUser.role,
        action: payload.adminUser.role === 'Public Hospital Admin' ? 'PUBLIC_HOSPITAL_RADIOGRAPHER_ASSIGNED' : 'PRIVATE_HOSPITAL_RADIOGRAPHER_ASSIGNED',
        target: `cases/${ref.caseId}`,
        details: `${payload.adminUser.role} ${payload.adminUser.name} assigned Radiographer ${payload.radiographerName}.`,
        timestamp: nowIso,
      });
    }
  };

  const externalUploadScans = async (
    referralId: string,
    payload: {
      imageKeys: string[];
      technicalFactors?: any;
      radiographerFindings?: string;
      radiographerImpression?: string;
      routedToRole?: 'Medical Officer' | 'Radiologist';
      uploadedBy: User;
    }
  ): Promise<void> => {
    const nowIso = new Date().toISOString();
    await editExternalReferral(referralId, {
      externalImageKeys: payload.imageKeys,
      status: 'SCANNED',
      scannedAt: nowIso,
      scanNotes: payload.technicalFactors?.komen || '',
    });

    const ref = externalReferrals.find((r) => r.id === referralId);
    if (ref?.caseId) {
      const existingCase = cases.find((c) => c.id === ref.caseId);
      const existingImages = existingCase?.images || [];
      const combinedImages = [...existingImages, ...payload.imageKeys];

      await editCase(ref.caseId, {
        status: 'IMAGES_AVAILABLE',
        images: combinedImages,
        scannedAt: nowIso,
        radiographerFindings: payload.radiographerFindings,
        radiographerImpression: payload.radiographerImpression,
        routedToRole: payload.routedToRole || 'Medical Officer',
        ...(payload.technicalFactors || {}),
      });

      await addAuditLog({
        userId: payload.uploadedBy.id,
        userName: payload.uploadedBy.name,
        userRole: payload.uploadedBy.role,
        action: 'EXTERNAL_IMAGES_UPLOADED',
        target: `cases/${ref.caseId}`,
        details: `External Radiographer ${payload.uploadedBy.name} uploaded ${payload.imageKeys.length} imaging scan(s). Case returned to Initial MO clinical review.`,
        timestamp: nowIso,
      });
    }
  };

  const submitFinalMoReport = async (
    caseId: string,
    payload: {
      findings: string;
      impression: string;
      suggestions?: string;
      isCriticalFinding?: boolean;
      criticalFindingNote?: string;
      moUser: User;
    }
  ): Promise<void> => {
    const nowIso = new Date().toISOString();
    const targetCase = cases.find((c) => c.id === caseId);
    if (!targetCase) throw new Error('Case not found');

    // Create or update finalized report
    const existingReport = reports.find((r) => r.caseId === caseId);
    if (existingReport) {
      await editReport(existingReport.id, {
        findings: payload.findings,
        impression: payload.impression,
        suggestions: payload.suggestions,
        isCriticalFinding: payload.isCriticalFinding,
        criticalFindingNote: payload.criticalFindingNote,
        status: 'Verified / Signed Off',
        signedAt: nowIso,
        signedByRole: 'Medical Officer',
      });
    } else {
      await addReport({
        caseId: targetCase.id,
        caseNumber: targetCase.caseNumber,
        patientName: targetCase.patientName,
        radiologistId: payload.moUser.id,
        radiologistName: payload.moUser.name,
        signedByRole: 'Medical Officer',
        findings: payload.findings,
        impression: payload.impression,
        suggestions: payload.suggestions,
        isCriticalFinding: payload.isCriticalFinding,
        criticalFindingNote: payload.criticalFindingNote,
        status: 'Verified / Signed Off',
        createdAt: nowIso,
        signedAt: nowIso,
        imageKeys: targetCase.images || [],
      });
    }

    await editCase(targetCase.id, {
      status: 'COMPLETED',
      finalizedAt: nowIso,
      reportedAt: targetCase.reportedAt || nowIso,
    });

    await addAuditLog({
      userId: payload.moUser.id,
      userName: payload.moUser.name,
      userRole: payload.moUser.role,
      action: 'FINAL_REPORT_APPROVED_BY_INITIAL_MO',
      target: `cases/${targetCase.id}`,
      details: `Initial Medical Officer Dr. ${payload.moUser.name} finalized and approved clinical report. Case marked COMPLETED.`,
      timestamp: nowIso,
    });
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
      case 'user':
        data = users.find((u) => u.id === id) || mockUsers.find((u) => u.id === id);
        setUsers((prev) => prev.filter((u) => u.id !== id));
        break;
      case 'clinic':
        data = clinics.find((c) => c.id === id) || mockClinics.find((c) => c.id === id);
        setClinics((prev) => prev.filter((c) => c.id !== id));
        break;
      case 'equipment':
        data = equipment.find((e) => e.id === id) || mockMobilePacsVans.find((e) => e.id === id);
        setEquipment((prev) => prev.filter((e) => e.id !== id));
        break;
      case 'patient':
        data = patients.find((p) => p.id === id) || mockPatients.find((p) => p.id === id);
        setPatients((prev) => prev.filter((p) => p.id !== id));
        break;
      case 'case':
        data = cases.find((c) => c.id === id) || mockCases.find((c) => c.id === id);
        setCases((prev) => prev.filter((c) => c.id !== id));
        break;
      case 'patientRequest':
        data = patientRequests.find((r) => r.id === id) || mockPatientRequests.find((r) => r.id === id);
        setPatientRequests((prev) => prev.filter((r) => r.id !== id));
        break;
    }
    if (data) {
      const trashItem: TrashItem = { id: `trash-${Date.now()}`, type, data, deletedAt: new Date().toISOString(), deletedBy };
      setTrash((prev) => {
        const next = [trashItem, ...prev.filter((t) => !(t.type === type && t.data?.id === id))];
        saveTrash(next);
        return next;
      });
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

  // ---------------------------------------------------------------------------
  // Equipment Marketplace Handlers (Phase 1 RFQ Draft & Availability)
  // ---------------------------------------------------------------------------
  const addToRfqDraft = (item: Omit<RfqDraftItem, 'id'>) => {
    setRfqDraft((prev) => {
      const existingIndex = prev.findIndex(
        (d) => d.equipmentId === item.equipmentId && d.procurementMode === item.procurementMode
      );
      let next: RfqDraftItem[];
      if (existingIndex >= 0) {
        next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: next[existingIndex].quantity + (item.quantity || 1),
          rentalDurationMonths: item.rentalDurationMonths || next[existingIndex].rentalDurationMonths,
        };
      } else {
        const newItem: RfqDraftItem = {
          id: `draft-item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          ...item,
        };
        next = [...prev, newItem];
      }
      saveScopedRfqDraft(next, currentUser);
      return next;
    });
  };

  const updateRfqDraftItem = (id: string, updates: Partial<RfqDraftItem>) => {
    setRfqDraft((prev) => {
      const next = prev.map((item) => (item.id === id ? { ...item, ...updates } : item));
      saveScopedRfqDraft(next, currentUser);
      return next;
    });
  };

  const removeFromRfqDraft = (id: string) => {
    setRfqDraft((prev) => {
      const next = prev.filter((item) => item.id !== id);
      saveScopedRfqDraft(next, currentUser);
      return next;
    });
  };

  const clearRfqDraft = () => {
    setRfqDraft([]);
    saveScopedRfqDraft([], currentUser);
  };

  const addEquipmentItem = (itemData: Omit<EquipmentItem, 'id'>): EquipmentItem => {
    const newId = `EQ-${itemData.category === 'MEDICAL' ? 'MED' : 'NON'}-${Date.now().toString().slice(-4)}`;
    const newItem: EquipmentItem = {
      ...itemData,
      id: newId,
    };
    setEquipmentCatalog((prev) => {
      const next = [newItem, ...prev];
      saveMarketplaceCatalog(next);
      return next;
    });
    return newItem;
  };

  const updateEquipmentItem = (id: string, updates: Partial<EquipmentItem>) => {
    setEquipmentCatalog((prev) => {
      const next = prev.map((item) => (item.id === id ? { ...item, ...updates } : item));
      saveMarketplaceCatalog(next);
      return next;
    });
  };

  const deleteEquipmentItem = (id: string) => {
    setEquipmentCatalog((prev) => {
      const next = prev.filter((item) => item.id !== id);
      saveMarketplaceCatalog(next);
      return next;
    });
  };

  const updateEquipmentAvailability = (equipmentId: string, availability: EquipmentAvailability) => {
    setEquipmentCatalog((prev) => {
      const next = prev.map((eq) => (eq.id === equipmentId ? { ...eq, availability } : eq));
      saveMarketplaceCatalog(next);
      return next;
    });
  };

  const updateQuotationStatus = (id: string, status: QuotationStatus, adminRemarks?: string) => {
    const now = new Date().toISOString();
    setQuotationRequests((prev) => {
      const next = prev.map((q) => {
        if (q.id !== id) return q;
        return {
          ...q,
          status,
          ...(adminRemarks ? { adminRemarks } : {}),
          updatedAt: now,
        };
      });
      saveQuotations(next);
      return next;
    });
  };

  const deleteQuotationRequest = (id: string) => {
    setQuotationRequests((prev) => {
      const next = prev.filter((q) => q.id !== id);
      saveQuotations(next);
      return next;
    });
  };

  const addToCart = (item: Omit<MarketplaceCartItem, 'id'>) => {
    addToRfqDraft({
      equipmentId: item.equipmentId || '',
      itemName: item.itemName,
      modelNumber: item.modelNumber || '',
      category: item.category,
      subcategory: item.subcategory || '',
      manufacturer: item.manufacturer || '',
      quantity: item.quantity,
      procurementMode: item.procurementMode || 'PURCHASE',
      rentalDurationMonths: item.rentalDurationMonths,
    });
  };

  const updateCartItem = (id: string, updates: Partial<MarketplaceCartItem>) => {
    updateRfqDraftItem(id, updates);
  };

  const removeFromCart = (id: string) => {
    removeFromRfqDraft(id);
  };

  const clearCart = () => {
    clearRfqDraft();
  };

  const addCustomEquipmentRequest = (customItem: Omit<MarketplaceCartItem, 'id' | 'isCustom'>) => {
    addToCart({
      ...customItem,
      isCustom: true,
    });
  };

  const submitQuotationRequest = async (
    rfqData: Omit<QuotationRequest, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'negotiationHistory'>
  ): Promise<QuotationRequest> => {
    const rfqCount = quotationRequests.length + 1;
    const newRfqId = `RFQ-2026-${String(rfqCount).padStart(4, '0')}`;
    const now = new Date().toISOString();

    const newQuotation: QuotationRequest = {
      ...rfqData,
      id: newRfqId,
      status: 'SUBMITTED',
      createdAt: now,
      updatedAt: now,
      negotiationHistory: [],
    };

    setQuotationRequests((prev) => {
      const next = [newQuotation, ...prev];
      saveQuotations(next);
      return next;
    });

    clearCart();
    return newQuotation;
  };

  const issueAdminQuotation = async (
    quotationId: string,
    pricingData: {
      validUntil?: string;
      items: QuotationItem[];
      subtotalAmount: number;
      discountAmount: number;
      sstTaxAmount: number;
      totalAmount: number;
      paymentTerms?: string;
      warrantyTerms?: string;
      deliveryLeadTimeWeeks?: number;
      adminRemarks?: string;
      reviewedByAdminId: string;
      reviewedByAdminName: string;
      initialMessage?: string;
    }
  ): Promise<void> => {
    const now = new Date().toISOString();
    setQuotationRequests((prev) => {
      const next = prev.map((q) => {
        if (q.id !== quotationId) return q;
        const quoNumber = q.quotationNumber || `QUO-2026-${String(Math.floor(1000 + Math.random() * 9000))}`;
        const updatedHistory = [...q.negotiationHistory];
        if (pricingData.initialMessage) {
          updatedHistory.push({
            id: `neg-${Date.now()}`,
            senderId: pricingData.reviewedByAdminId,
            senderName: pricingData.reviewedByAdminName,
            senderRole: 'Super Admin',
            timestamp: now,
            message: pricingData.initialMessage,
            adminRevisedDiscountPercent:
              pricingData.discountAmount > 0
                ? Math.round((pricingData.discountAmount / pricingData.subtotalAmount) * 100)
                : 0,
          });
        }
        return {
          ...q,
          quotationNumber: quoNumber,
          ...pricingData,
          status: 'QUOTATION_ISSUED' as const,
          updatedAt: now,
          negotiationHistory: updatedHistory,
        };
      });
      saveQuotations(next);
      return next;
    });
  };

  const submitQuotationNegotiation = async (
    quotationId: string,
    message: string,
    requestedDiscountPercent?: number,
    senderUser?: { id: string; name: string; role: string }
  ): Promise<void> => {
    const now = new Date().toISOString();
    setQuotationRequests((prev) => {
      const next = prev.map((q) => {
        if (q.id !== quotationId) return q;
        const isSuperAdmin =
          senderUser?.role === 'Super Admin' || senderUser?.role === 'Administrator';
        const newMessage: QuotationNegotiationMessage = {
          id: `neg-${Date.now()}`,
          senderId: senderUser?.id || 'u_sender',
          senderName: senderUser?.name || 'User',
          senderRole: senderUser?.role || 'User',
          timestamp: now,
          message,
          ...(isSuperAdmin
            ? { adminRevisedDiscountPercent: requestedDiscountPercent }
            : { requestedDiscountPercent }),
        };

        return {
          ...q,
          status: isSuperAdmin ? ('QUOTATION_ISSUED' as const) : ('NEGOTIATION_IN_PROGRESS' as const),
          updatedAt: now,
          negotiationHistory: [...q.negotiationHistory, newMessage],
        };
      });
      saveQuotations(next);
      return next;
    });
  };

  const respondToQuotation = async (
    quotationId: string,
    decision: 'ACCEPTED' | 'DECLINED',
    remarks?: string
  ): Promise<void> => {
    const now = new Date().toISOString();
    setQuotationRequests((prev) => {
      const next = prev.map((q) => {
        if (q.id !== quotationId) return q;
        return {
          ...q,
          status: decision,
          userDecisionRemarks: remarks,
          decidedAt: now,
          updatedAt: now,
        };
      });
      saveQuotations(next);
      return next;
    });
  };

  return (
    <DataContext.Provider value={{
      users, cases, patients, clinics, reports, patientRequests, auditLogs, equipment, externalReferrals, loading,
      comments, recentItems, trash,
      equipmentCatalog, quotationRequests, marketplaceCart,
      addEquipmentItem, updateEquipmentItem, deleteEquipmentItem,
      updateQuotationStatus, deleteQuotationRequest,
      rfqDraft, addToRfqDraft, updateRfqDraftItem, removeFromRfqDraft, clearRfqDraft, updateEquipmentAvailability,
      addToCart, updateCartItem, removeFromCart, clearCart,
      submitQuotationRequest, issueAdminQuotation, submitQuotationNegotiation,
      respondToQuotation, addCustomEquipmentRequest,
      addCase, editCase, addPatient, editPatient, addReport, editReport,
      addPatientRequest, editPatientRequest, deletePatientRequest, addAuditLog,
      addExternalReferral, editExternalReferral, reportMachineUnavailable,
      bemsAssignFacility, hospitalAdminAssignRadiographer, externalUploadScans, submitFinalMoReport,
      roleNavigationConfig, updateRoleNavigation, resetRoleNavigation,
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
