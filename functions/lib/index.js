"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.onCaseStatusChanged = exports.onReportSigned = exports.cleanupExpiredSessions = exports.api = exports.setCustomClaims = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const zod_1 = require("zod");
// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();
const auth = admin.auth();
// Express API app
const app = (0, express_1.default)();
// ---------------------------------------------------------------------------
// CORS — restrict to known origins; allow localhost for dev/emulator
// ---------------------------------------------------------------------------
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
// Always allow localhost for Firebase emulator / local dev
const ALWAYS_ALLOWED = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:4000',
];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g. curl, Postman, server-to-server)
        if (!origin)
            return callback(null, true);
        if (ALWAYS_ALLOWED.includes(origin) ||
            ALLOWED_ORIGINS.includes(origin)) {
            return callback(null, true);
        }
        callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    credentials: true,
}));
app.use((0, helmet_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
// ---------------------------------------------------------------------------
// Rate limiting — 200 req / 15 min per IP (public API guard)
// ---------------------------------------------------------------------------
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
});
app.use(limiter);
const ALL_STAFF_ROLES = [
    'Radiographer',
    'Radiologist',
    'Medical Officer',
    'Radiology Department',
    'Administrator',
];
const CASE_MANAGEMENT_ROLES = ['Radiology Department', 'Medical Officer', 'Administrator'];
// ---------------------------------------------------------------------------
// Authentication middleware
// ---------------------------------------------------------------------------
/**
 * Verify Firebase ID token on every request.
 * Attaches decoded token to req.user.
 * Skips /v1/health and the IAS webhook (which uses an API key instead).
 */
const verifyFirebaseToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing Bearer token' });
    }
    const idToken = authHeader.split('Bearer ')[1];
    try {
        const decoded = await auth.verifyIdToken(idToken);
        // Attach the decoded token to the request object for downstream handlers
        req.user = decoded;
        next();
    }
    catch (error) {
        return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    }
};
/** Require one of the given roles (read from custom claims). */
const requireRole = (...roles) => {
    return (req, res, next) => {
        const user = req.user;
        if (!user)
            return res.status(401).json({ error: 'Unauthorized' });
        const role = user.role || '';
        if (!roles.includes(role)) {
            return res.status(403).json({ error: `Forbidden: requires role ${roles.join(' or ')}` });
        }
        next();
    };
};
/** Permit an account to read its own record, or an authorised role to read another. */
const requireSelfOrRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user)
            return res.status(401).json({ error: 'Unauthorized' });
        if (req.user.uid === req.params.userId || roles.includes(String(req.user.role || ''))) {
            return next();
        }
        return res.status(403).json({ error: 'Forbidden' });
    };
};
/** Return the authenticated actor without trusting user data supplied by a client. */
async function getActor(req) {
    const uid = req.user?.uid;
    if (!uid)
        throw new Error('Authenticated user is required');
    const profile = await db.collection('users').doc(uid).get();
    const data = profile.data();
    return {
        id: uid,
        role: String(req.user?.role || ''),
        name: String(data?.name || req.user?.name || req.user?.email || uid),
    };
}
/** API Key middleware — for external IAS webhook only. */
const validateApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    const validKey = functions.config().api?.key || process.env.API_KEY;
    if (!validKey) {
        console.error('IAS webhook rejected because API_KEY is not configured');
        return res.status(503).json({ error: 'IAS webhook is not configured' });
    }
    if (!apiKey || apiKey !== validKey) {
        return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
    }
    next();
};
// ---------------------------------------------------------------------------
// ALLOWED_ORIGINS startup warning — misconfiguration guard
// ---------------------------------------------------------------------------
if (ALLOWED_ORIGINS.length === 0) {
    console.warn('[CORS] WARNING: ALLOWED_ORIGINS environment variable is not set. ' +
        'Only localhost origins are permitted. Set ALLOWED_ORIGINS to your ' +
        'production domain (e.g. https://your-app.vercel.app) in Firebase ' +
        'Functions config or environment variables.');
}
// ---------------------------------------------------------------------------
// Case state machine — enforce valid status transitions
// ---------------------------------------------------------------------------
// NO_SHOW and CANCELLED are terminal exception states that can be reached
// from SCHEDULED (patient did not attend or appointment was cancelled).
// They match the CaseStatus type defined in src/types/index.ts.
const VALID_TRANSITIONS = {
    CREATED: ['SCHEDULED', 'CANCELLED'],
    SCHEDULED: ['SCANNED', 'CREATED', 'NO_SHOW', 'CANCELLED'],
    SCANNED: ['REPORTED', 'CANCELLED'],
    REPORTED: ['FINALIZED'],
    FINALIZED: [], // terminal state
    NO_SHOW: [], // terminal exception state
    CANCELLED: [], // terminal exception state
};
function isValidTransition(from, to) {
    if (from === to)
        return true; // no-op is always fine
    return (VALID_TRANSITIONS[from] || []).includes(to);
}
// ==================== HEALTH CHECK (no auth required) ====================
app.get('/v1/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});
// The public client calls /api/v1/*, where /api is the Firebase function
// prefix. Preserve the existing internal routes while normalising those
// requests to /v1/api/* before Express dispatches them. The IAS integration
// retains its dedicated API-key authentication.
app.use('/v1', (req, _res, next) => {
    if (req.path !== '/health' && req.path !== '/ias/webhook' && !req.path.startsWith('/api/')) {
        req.url = `/api${req.url}`;
    }
    next();
});
// Apply Firebase token auth to all application endpoints. The IAS webhook
// above is explicitly excluded and has its own fail-closed key check.
app.use('/v1/api', verifyFirebaseToken);
// ==================== USERS API ====================
app.get('/v1/api/users', requireRole('Administrator'), async (req, res) => {
    try {
        const role = req.query.role;
        let query = db.collection('users');
        if (role) {
            query = query.where('role', '==', role);
        }
        const snapshot = await query.get();
        const users = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        res.json({ users, count: users.length });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch users', message: error.message });
    }
});
app.get('/v1/api/users/:userId', requireSelfOrRole('Administrator'), async (req, res) => {
    try {
        const docSnap = await db.collection('users').doc(req.params.userId).get();
        if (!docSnap.exists) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ id: docSnap.id, ...docSnap.data() });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch user', message: error.message });
    }
});
// ==================== CLINICS API ====================
app.get('/v1/api/clinics', requireRole(...ALL_STAFF_ROLES), async (req, res) => {
    try {
        const status = req.query.status;
        let query = db.collection('clinics');
        if (status) {
            query = query.where('status', '==', status);
        }
        const snapshot = await query.get();
        const clinics = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        res.json({ clinics, count: clinics.length });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch clinics', message: error.message });
    }
});
app.get('/v1/api/clinics/:clinicId', requireRole(...ALL_STAFF_ROLES), async (req, res) => {
    try {
        const docSnap = await db.collection('clinics').doc(req.params.clinicId).get();
        if (!docSnap.exists) {
            return res.status(404).json({ error: 'Clinic not found' });
        }
        res.json({ id: docSnap.id, ...docSnap.data() });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch clinic', message: error.message });
    }
});
// ==================== PATIENTS API ====================
app.get('/v1/api/patients', requireRole(...ALL_STAFF_ROLES), async (req, res) => {
    try {
        const { clinicId, after, limit } = req.query;
        let query = db.collection('patients').orderBy('name');
        if (clinicId)
            query = query.where('clinicId', '==', clinicId);
        // Cursor-based pagination
        if (after) {
            const afterDoc = await db.collection('patients').doc(after).get();
            if (afterDoc.exists)
                query = query.startAfter(afterDoc);
        }
        const pageLimit = Math.min(parseInt(limit || '50'), 200);
        query = query.limit(pageLimit);
        const snapshot = await query.get();
        const patients = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        const nextCursor = patients.length === pageLimit ? patients[patients.length - 1].id : undefined;
        res.json({ patients, count: patients.length, nextCursor });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch patients', message: error.message });
    }
});
const patientSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    dob: zod_1.z.string().min(1),
    gender: zod_1.z.enum(['Male', 'Female', 'Other']),
    phone: zod_1.z.string().min(1),
    // Email is optional — not all patients provide one
    email: zod_1.z.string().email().optional().or(zod_1.z.literal('')),
    address: zod_1.z.string().min(1),
    nric: zod_1.z.string().min(1),
    mrn: zod_1.z.string().min(1),
    medicalHistory: zod_1.z.array(zod_1.z.string()).default([]),
    latitude: zod_1.z.number().optional(),
    longitude: zod_1.z.number().optional(),
    googlePlaceId: zod_1.z.string().optional(),
    preferredClinicId: zod_1.z.string().optional(),
    preferredClinicName: zod_1.z.string().optional(),
    clinicId: zod_1.z.string().optional(),
    clinicName: zod_1.z.string().optional(),
    ethnicity: zod_1.z.string().optional(),
    emergencyContact: zod_1.z.string().optional(),
});
app.post('/v1/api/patients', requireRole(...CASE_MANAGEMENT_ROLES), async (req, res) => {
    try {
        const data = patientSchema.parse(req.body);
        const actor = await getActor(req);
        const docRef = await db.collection('patients').add({
            ...data,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // Server-side audit log — written here so it cannot be skipped or faked client-side
        await db.collection('audit_logs').add({
            userId: actor.id,
            userName: actor.name,
            userRole: actor.role,
            action: 'PATIENT_REGISTER',
            target: `patients/${docRef.id}`,
            details: `Registered new patient: ${data.name} (MRN: ${data.mrn})`,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        res.status(201).json({ id: docRef.id, ...data });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Validation failed', details: error.errors });
        }
        res.status(500).json({ error: 'Failed to create patient', message: error.message });
    }
});
const patientUpdateSchema = patientSchema.partial();
app.patch('/v1/api/patients/:patientId', requireRole(...CASE_MANAGEMENT_ROLES), async (req, res) => {
    try {
        const updates = patientUpdateSchema.parse(req.body);
        const patientRef = db.collection('patients').doc(req.params.patientId);
        const patient = await patientRef.get();
        if (!patient.exists)
            return res.status(404).json({ error: 'Patient not found' });
        await patientRef.update({
            ...updates,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        const updated = await patientRef.get();
        return res.json({ id: updated.id, ...updated.data() });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Validation failed', details: error.errors });
        }
        return res.status(500).json({ error: 'Failed to update patient', message: error.message });
    }
});
// ==================== CASES API ====================
const caseSchema = zod_1.z.object({
    caseNumber: zod_1.z.string(),
    patientId: zod_1.z.string(),
    patientName: zod_1.z.string(),
    registeredById: zod_1.z.string(),
    registeredByName: zod_1.z.string(),
    scanType: zod_1.z.string(),
    notes: zod_1.z.string(),
    status: zod_1.z.enum(['CREATED', 'SCHEDULED', 'SCANNED', 'REPORTED', 'FINALIZED', 'NO_SHOW', 'CANCELLED']).default('CREATED'),
    clinicId: zod_1.z.string().optional(),
    clinicName: zod_1.z.string().optional(),
    indication: zod_1.z.string().optional(),
    bodyRegion: zod_1.z.string().optional(),
    severity: zod_1.z.enum(['Mild', 'Moderate', 'Severe', 'Critical']).optional(),
    incubationPeriod: zod_1.z.string().optional(),
    radiographerId: zod_1.z.string().optional(),
    radiographerName: zod_1.z.string().optional(),
    radiologistId: zod_1.z.string().optional(),
    radiologistName: zod_1.z.string().optional(),
    scheduledAt: zod_1.z.string().optional(),
    images: zod_1.z.array(zod_1.z.string()).optional(),
});
const caseUpdateSchema = zod_1.z.object({
    status: zod_1.z.enum(['CREATED', 'SCHEDULED', 'SCANNED', 'REPORTED', 'FINALIZED', 'NO_SHOW', 'CANCELLED']).optional(),
    severity: zod_1.z.enum(['Mild', 'Moderate', 'Severe', 'Critical']).optional(),
    notes: zod_1.z.string().optional(),
    indication: zod_1.z.string().optional(),
    bodyRegion: zod_1.z.string().optional(),
    incubationPeriod: zod_1.z.string().optional(),
    radiographerId: zod_1.z.string().optional(),
    radiographerName: zod_1.z.string().optional(),
    radiologistId: zod_1.z.string().optional(),
    radiologistName: zod_1.z.string().optional(),
    scheduledAt: zod_1.z.string().optional(),
    scannedAt: zod_1.z.string().optional(),
    reportedAt: zod_1.z.string().optional(),
    finalizedAt: zod_1.z.string().optional(),
    images: zod_1.z.array(zod_1.z.string()).optional(),
    clinicId: zod_1.z.string().optional(),
    clinicName: zod_1.z.string().optional(),
    // Exception state fields — set alongside NO_SHOW or CANCELLED status
    noShowReason: zod_1.z.string().optional(),
    cancellationReason: zod_1.z.string().optional(),
    cancellationNotes: zod_1.z.string().optional(),
});
app.get('/v1/api/cases', requireRole(...ALL_STAFF_ROLES), async (req, res) => {
    try {
        const { status, registeredById, radiographerId, severity, after, limit } = req.query;
        let query = db.collection('cases').orderBy('createdAt', 'desc');
        // Compound filters — Firestore requires matching composite indexes
        if (status)
            query = query.where('status', '==', status);
        if (registeredById)
            query = query.where('registeredById', '==', registeredById);
        if (radiographerId)
            query = query.where('radiographerId', '==', radiographerId);
        if (severity)
            query = query.where('severity', '==', severity);
        // Cursor-based pagination
        if (after) {
            const afterDoc = await db.collection('cases').doc(after).get();
            if (afterDoc.exists)
                query = query.startAfter(afterDoc);
        }
        const pageLimit = Math.min(parseInt(limit || '50'), 200);
        query = query.limit(pageLimit);
        const snapshot = await query.get();
        const cases = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        const nextCursor = cases.length === pageLimit ? cases[cases.length - 1].id : undefined;
        res.json({ cases, count: cases.length, nextCursor });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch cases', message: error.message });
    }
});
app.get('/v1/api/cases/:caseId', requireRole(...ALL_STAFF_ROLES), async (req, res) => {
    try {
        const docSnap = await db.collection('cases').doc(req.params.caseId).get();
        if (!docSnap.exists) {
            return res.status(404).json({ error: 'Case not found' });
        }
        res.json({ id: docSnap.id, ...docSnap.data() });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch case', message: error.message });
    }
});
app.post('/v1/api/cases', requireRole(...CASE_MANAGEMENT_ROLES), async (req, res) => {
    try {
        const requested = caseSchema.parse(req.body);
        const actor = await getActor(req);
        const data = {
            ...requested,
            registeredById: actor.id,
            registeredByName: actor.name,
        };
        const docRef = await db.collection('cases').add({
            ...data,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // Audit log — written here by the API handler (NOT duplicated by trigger)
        await db.collection('audit_logs').add({
            userId: data.registeredById,
            userName: data.registeredByName,
            userRole: actor.role,
            action: 'CASE_CREATED',
            target: `cases/${docRef.id}`,
            details: `Created case ${data.caseNumber} for patient ${data.patientName}`,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        res.status(201).json({ id: docRef.id, ...data });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Validation failed', details: error.errors });
        }
        res.status(500).json({ error: 'Failed to create case', message: error.message });
    }
});
app.patch('/v1/api/cases/:caseId', requireRole(...ALL_STAFF_ROLES), async (req, res) => {
    try {
        // Validate the update body against the allowed fields
        const updates = caseUpdateSchema.parse(req.body);
        const docRef = db.collection('cases').doc(req.params.caseId);
        const docSnap = await docRef.get();
        if (!docSnap.exists) {
            return res.status(404).json({ error: 'Case not found' });
        }
        const actor = await getActor(req);
        const currentCase = docSnap.data();
        const changedFields = Object.keys(updates);
        if (actor.role === 'Radiographer') {
            if (currentCase.radiographerId !== actor.id) {
                return res.status(403).json({ error: 'Forbidden: case is not assigned to this radiographer' });
            }
            const allowed = new Set(['status', 'scannedAt', 'images']);
            if (changedFields.some((field) => !allowed.has(field))) {
                return res.status(403).json({ error: 'Forbidden: radiographers may only record scan completion and images' });
            }
            if (updates.status && updates.status !== 'SCANNED' && updates.status !== currentCase.status) {
                return res.status(403).json({ error: 'Forbidden: radiographers may only transition a case to SCANNED' });
            }
        }
        if (actor.role === 'Radiologist') {
            if (currentCase.radiologistId !== actor.id) {
                return res.status(403).json({ error: 'Forbidden: case is not assigned to this radiologist' });
            }
            const allowed = new Set(['status', 'reportedAt']);
            if (changedFields.some((field) => !allowed.has(field))) {
                return res.status(403).json({ error: 'Forbidden: radiologists may only record report completion' });
            }
            if (updates.status && updates.status !== 'REPORTED' && updates.status !== currentCase.status) {
                return res.status(403).json({ error: 'Forbidden: radiologists may only transition a case to REPORTED' });
            }
        }
        if (!CASE_MANAGEMENT_ROLES.includes(actor.role)) {
            if ('radiographerId' in updates || 'radiographerName' in updates || 'radiologistId' in updates || 'radiologistName' in updates) {
                return res.status(403).json({ error: 'Forbidden: only case managers may change assignments' });
            }
        }
        // Enforce status state machine
        if (updates.status && docSnap.data()?.status) {
            const currentStatus = docSnap.data().status;
            if (!isValidTransition(currentStatus, updates.status)) {
                return res.status(422).json({
                    error: `Invalid status transition: ${currentStatus} → ${updates.status}`,
                });
            }
        }
        await docRef.update({
            ...updates,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        const updated = await docRef.get();
        res.json({ id: updated.id, ...updated.data() });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Validation failed', details: error.errors });
        }
        res.status(500).json({ error: 'Failed to update case', message: error.message });
    }
});
// ==================== CASE COMMENTS ====================
const commentSchema = zod_1.z.object({
    message: zod_1.z.string().min(1).max(5000),
});
app.get('/v1/api/cases/:caseId/comments', requireRole(...ALL_STAFF_ROLES), async (req, res) => {
    try {
        const snapshot = await db
            .collection('comments')
            .where('caseId', '==', req.params.caseId)
            .orderBy('timestamp', 'asc')
            .get();
        const comments = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        res.json({ comments, count: comments.length });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch comments', message: error.message });
    }
});
app.post('/v1/api/cases/:caseId/comments', requireRole(...ALL_STAFF_ROLES), async (req, res) => {
    try {
        const requested = commentSchema.parse(req.body);
        const actor = await getActor(req);
        const data = {
            ...requested,
            userId: actor.id,
            userName: actor.name,
            userRole: actor.role,
        };
        const docRef = await db.collection('comments').add({
            ...data,
            caseId: req.params.caseId,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        res.status(201).json({ id: docRef.id, ...data, caseId: req.params.caseId });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Validation failed', details: error.errors });
        }
        res.status(500).json({ error: 'Failed to add comment', message: error.message });
    }
});
// ==================== REPORTS API ====================
const reportSchema = zod_1.z.object({
    caseId: zod_1.z.string(),
    caseNumber: zod_1.z.string(),
    patientName: zod_1.z.string(),
    radiologistId: zod_1.z.string(),
    radiologistName: zod_1.z.string(),
    findings: zod_1.z.string(),
    impression: zod_1.z.string(),
    suggestions: zod_1.z.string().optional(),
    status: zod_1.z.enum(['draft', 'final', 'Verified / Signed Off']).default('draft'),
    imageKeys: zod_1.z.array(zod_1.z.string()).optional(),
});
const reportUpdateSchema = zod_1.z.object({
    findings: zod_1.z.string().optional(),
    impression: zod_1.z.string().optional(),
    suggestions: zod_1.z.string().optional(),
    status: zod_1.z.enum(['draft', 'final', 'Verified / Signed Off']).optional(),
    signedAt: zod_1.z.string().optional(),
    imageKeys: zod_1.z.array(zod_1.z.string()).optional(),
});
app.get('/v1/api/reports', requireRole(...ALL_STAFF_ROLES), async (req, res) => {
    try {
        const { caseId, radiologistId, status, after, limit } = req.query;
        let query = db.collection('reports').orderBy('createdAt', 'desc');
        if (caseId)
            query = query.where('caseId', '==', caseId);
        if (radiologistId)
            query = query.where('radiologistId', '==', radiologistId);
        if (status)
            query = query.where('status', '==', status);
        if (after) {
            const afterDoc = await db.collection('reports').doc(after).get();
            if (afterDoc.exists)
                query = query.startAfter(afterDoc);
        }
        const pageLimit = Math.min(parseInt(limit || '50'), 200);
        query = query.limit(pageLimit);
        const snapshot = await query.get();
        const reports = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        const nextCursor = reports.length === pageLimit ? reports[reports.length - 1].id : undefined;
        res.json({ reports, count: reports.length, nextCursor });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch reports', message: error.message });
    }
});
app.post('/v1/api/reports', requireRole('Radiologist', 'Administrator'), async (req, res) => {
    try {
        const requested = reportSchema.parse(req.body);
        const actor = await getActor(req);
        const data = {
            ...requested,
            radiologistId: actor.id,
            radiologistName: actor.name,
        };
        const docRef = await db.collection('reports').add({
            ...data,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        res.status(201).json({ id: docRef.id, ...data });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Validation failed', details: error.errors });
        }
        res.status(500).json({ error: 'Failed to create report', message: error.message });
    }
});
app.patch('/v1/api/reports/:reportId', requireRole('Radiologist', 'Administrator'), async (req, res) => {
    try {
        const updates = reportUpdateSchema.parse(req.body);
        const docRef = db.collection('reports').doc(req.params.reportId);
        const docSnap = await docRef.get();
        if (!docSnap.exists) {
            return res.status(404).json({ error: 'Report not found' });
        }
        if (req.user?.role === 'Radiologist' && docSnap.data()?.radiologistId !== req.user.uid) {
            return res.status(403).json({ error: 'Forbidden: report is not assigned to this radiologist' });
        }
        // Lock signed-off reports — only admins can modify them
        if (docSnap.data()?.status === 'Verified / Signed Off' &&
            req.user?.role !== 'Administrator') {
            return res.status(403).json({ error: 'Signed reports are locked. Only Administrators can modify.' });
        }
        await docRef.update({
            ...updates,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        const updated = await docRef.get();
        res.json({ id: updated.id, ...updated.data() });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Validation failed', details: error.errors });
        }
        res.status(500).json({ error: 'Failed to update report', message: error.message });
    }
});
// ==================== MOBILE PACS VANS (FLEET) API ====================
const vanUpdateSchema = zod_1.z.object({
    status: zod_1.z.enum(['deployed', 'maintenance', 'idle']).optional(),
    currentClinicId: zod_1.z.string().optional(),
    currentClinicName: zod_1.z.string().optional(),
    assignedRadiographerId: zod_1.z.string().optional(),
    assignedRadiographerName: zod_1.z.string().optional(),
    latitude: zod_1.z.number().optional(),
    longitude: zod_1.z.number().optional(),
});
app.get('/v1/api/fleet', requireRole(...ALL_STAFF_ROLES), async (req, res) => {
    try {
        const snapshot = await db.collection('mobile_pacs_vans').get();
        const vans = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        res.json({ vans, count: vans.length });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch fleet', message: error.message });
    }
});
app.patch('/v1/api/fleet/:vanId', requireRole('Radiology Department', 'Administrator'), async (req, res) => {
    try {
        const updates = vanUpdateSchema.parse(req.body);
        const docRef = db.collection('mobile_pacs_vans').doc(req.params.vanId);
        const docSnap = await docRef.get();
        if (!docSnap.exists) {
            return res.status(404).json({ error: 'Van not found' });
        }
        await docRef.update({
            ...updates,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        const updated = await docRef.get();
        res.json({ id: updated.id, ...updated.data() });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Validation failed', details: error.errors });
        }
        res.status(500).json({ error: 'Failed to update van', message: error.message });
    }
});
// ==================== RADIOGRAPHER SCHEDULES API ====================
const scheduleSchema = zod_1.z.object({
    userId: zod_1.z.string(),
    userName: zod_1.z.string(),
    deployedClinicId: zod_1.z.string(),
    deployedClinicName: zod_1.z.string(),
    supportedModalities: zod_1.z.array(zod_1.z.string()),
    currentCaseload: zod_1.z.number().default(0),
    maxDailyCaseload: zod_1.z.number(),
    leaveStatus: zod_1.z.enum(['Active', 'On Leave']),
    shift: zod_1.z.string(),
    schedule: zod_1.z.array(zod_1.z.object({
        date: zod_1.z.string(),
        startTime: zod_1.z.string(),
        endTime: zod_1.z.string(),
        booked: zod_1.z.boolean().default(false),
        caseId: zod_1.z.string().optional(),
    })),
});
const scheduleUpdateSchema = zod_1.z.object({
    currentCaseload: zod_1.z.number().optional(),
    leaveStatus: zod_1.z.enum(['Active', 'On Leave']).optional(),
    schedule: zod_1.z
        .array(zod_1.z.object({
        date: zod_1.z.string(),
        startTime: zod_1.z.string(),
        endTime: zod_1.z.string(),
        booked: zod_1.z.boolean(),
        caseId: zod_1.z.string().optional(),
    }))
        .optional(),
    deployedClinicId: zod_1.z.string().optional(),
    deployedClinicName: zod_1.z.string().optional(),
});
app.get('/v1/api/schedules', requireRole(...ALL_STAFF_ROLES), async (req, res) => {
    try {
        const { userId, clinicId, date } = req.query;
        let query = db.collection('radio_schedules');
        if (userId)
            query = query.where('userId', '==', userId);
        if (clinicId)
            query = query.where('deployedClinicId', '==', clinicId);
        const snapshot = await query.get();
        let schedules = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        // Filter schedule slots by date (done in-memory as it's a nested array)
        if (date) {
            schedules = schedules
                .map((sched) => ({
                ...sched,
                schedule: (sched.schedule || []).filter((slot) => slot.date === date),
            }))
                .filter((s) => s.schedule.length > 0);
        }
        res.json({ schedules, count: schedules.length });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch schedules', message: error.message });
    }
});
app.post('/v1/api/schedules', requireRole('Radiology Department', 'Administrator'), async (req, res) => {
    try {
        const data = scheduleSchema.parse(req.body);
        const docRef = await db.collection('radio_schedules').add({
            ...data,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        res.status(201).json({ id: docRef.id, ...data });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Validation failed', details: error.errors });
        }
        res.status(500).json({ error: 'Failed to create schedule', message: error.message });
    }
});
app.patch('/v1/api/schedules/:scheduleId', requireRole('Radiology Department', 'Administrator'), async (req, res) => {
    try {
        const updates = scheduleUpdateSchema.parse(req.body);
        const docRef = db.collection('radio_schedules').doc(req.params.scheduleId);
        const docSnap = await docRef.get();
        if (!docSnap.exists) {
            return res.status(404).json({ error: 'Schedule not found' });
        }
        await docRef.update({
            ...updates,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        const updated = await docRef.get();
        res.json({ id: updated.id, ...updated.data() });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Validation failed', details: error.errors });
        }
        res.status(500).json({ error: 'Failed to update schedule', message: error.message });
    }
});
// ==================== PATIENT REQUESTS API ====================
const patientRequestUpdateSchema = zod_1.z.object({
    status: zod_1.z.enum(['Pending', 'Approved', 'Rejected']).optional(),
    approverName: zod_1.z.string().optional(),
    approvedOrRejectedAt: zod_1.z.string().optional(),
    remarks: zod_1.z.string().optional(),
});
app.get('/v1/api/patient-requests', requireRole('Radiology Department', 'Medical Officer', 'Administrator'), async (req, res) => {
    try {
        const { status } = req.query;
        let query = db
            .collection('patient_requests')
            .orderBy('dateSubmitted', 'desc');
        if (status)
            query = query.where('status', '==', status);
        const snapshot = await query.get();
        const requests = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        res.json({ requests, count: requests.length });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch patient requests', message: error.message });
    }
});
app.post('/v1/api/patient-requests', requireRole('Radiology Department', 'Medical Officer', 'Administrator'), async (req, res) => {
    try {
        const patientRequestSchema = zod_1.z.object({
            patientId: zod_1.z.string(),
            patientName: zod_1.z.string(),
            mrn: zod_1.z.string(),
            requestType: zod_1.z.enum(['Update', 'Archive']),
            requestedBy: zod_1.z.string(),
            requestedById: zod_1.z.string(),
            requestedByRole: zod_1.z.string(),
            dateSubmitted: zod_1.z.string(),
            requestedChanges: zod_1.z.record(zod_1.z.unknown()),
            reason: zod_1.z.string(),
            status: zod_1.z.enum(['Pending', 'Approved', 'Rejected']).default('Pending'),
            remarks: zod_1.z.string().default(''),
        });
        const requested = patientRequestSchema.parse(req.body);
        const actor = await getActor(req);
        const data = {
            ...requested,
            requestedBy: actor.name,
            requestedById: actor.id,
            requestedByRole: actor.role,
        };
        const docRef = await db.collection('patient_requests').add({
            ...data,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        res.status(201).json({ id: docRef.id, ...data });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Validation failed', details: error.errors });
        }
        res.status(500).json({ error: 'Failed to create patient request', message: error.message });
    }
});
app.patch('/v1/api/patient-requests/:requestId', requireRole('Radiology Department', 'Administrator'), async (req, res) => {
    try {
        const updates = patientRequestUpdateSchema.parse(req.body);
        const docRef = db.collection('patient_requests').doc(req.params.requestId);
        const docSnap = await docRef.get();
        if (!docSnap.exists) {
            return res.status(404).json({ error: 'Patient request not found' });
        }
        await docRef.update({
            ...updates,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        const updated = await docRef.get();
        res.json({ id: updated.id, ...updated.data() });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Validation failed', details: error.errors });
        }
        res.status(500).json({ error: 'Failed to update patient request', message: error.message });
    }
});
// ==================== IAS WEBHOOK (External Scheduling — API key auth) ====================
app.post('/v1/ias/webhook', validateApiKey, async (req, res) => {
    try {
        const webhookSchema = zod_1.z.object({
            event: zod_1.z.enum(['SCHEDULE_ASSIGNED', 'SCHEDULE_UPDATED', 'SCHEDULE_CANCELLED']),
            caseId: zod_1.z.string(),
            radiographerId: zod_1.z.string(),
            radiographerName: zod_1.z.string(),
            scheduledAt: zod_1.z.string(),
            clinicId: zod_1.z.string().optional(),
            vanId: zod_1.z.string().optional(),
        });
        const data = webhookSchema.parse(req.body);
        const caseRef = db.collection('cases').doc(data.caseId);
        const caseDoc = await caseRef.get();
        if (!caseDoc.exists) {
            return res.status(404).json({ error: 'Case not found' });
        }
        const newStatus = data.event === 'SCHEDULE_CANCELLED' ? 'CREATED' : 'SCHEDULED';
        const currentStatus = caseDoc.data().status;
        if (!isValidTransition(currentStatus, newStatus)) {
            return res.status(422).json({
                error: `Invalid status transition: ${currentStatus} → ${newStatus}`,
            });
        }
        await caseRef.update({
            radiographerId: data.radiographerId,
            radiographerName: data.radiographerName,
            scheduledAt: data.scheduledAt,
            status: newStatus,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        await db.collection('audit_logs').add({
            userId: 'IAS_SYSTEM',
            userName: 'Intelligent Appointment System',
            userRole: 'Administrator',
            action: data.event,
            target: `cases/${data.caseId}`,
            details: `IAS ${data.event} for case ${caseDoc.data()?.caseNumber}`,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        res.json({ success: true, message: 'Webhook processed successfully' });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Validation failed', details: error.errors });
        }
        res.status(500).json({ error: 'Webhook processing failed', message: error.message });
    }
});
// ==================== AUDIT LOGS API ====================
app.get('/v1/api/audit-logs', requireRole('Administrator'), async (req, res) => {
    try {
        const { userId, action, after, limit } = req.query;
        let query = db
            .collection('audit_logs')
            .orderBy('timestamp', 'desc');
        if (userId)
            query = query.where('userId', '==', userId);
        if (action)
            query = query.where('action', '==', action);
        if (after) {
            const afterDoc = await db.collection('audit_logs').doc(after).get();
            if (afterDoc.exists)
                query = query.startAfter(afterDoc);
        }
        const pageLimit = Math.min(parseInt(limit || '50'), 200);
        query = query.limit(pageLimit);
        const snapshot = await query.get();
        const logs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        const nextCursor = logs.length === pageLimit ? logs[logs.length - 1].id : undefined;
        res.json({ logs, count: logs.length, nextCursor });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch audit logs', message: error.message });
    }
});
app.post('/v1/api/audit-logs', requireRole(...ALL_STAFF_ROLES), async (req, res) => {
    try {
        const logSchema = zod_1.z.object({
            action: zod_1.z.string(),
            target: zod_1.z.string(),
            details: zod_1.z.string(),
        });
        const requested = logSchema.parse(req.body);
        const actor = await getActor(req);
        const data = {
            ...requested,
            userId: actor.id,
            userName: actor.name,
            userRole: actor.role,
        };
        const docRef = await db.collection('audit_logs').add({
            ...data,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        res.status(201).json({ id: docRef.id, ...data });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Validation failed', details: error.errors });
        }
        res.status(500).json({ error: 'Failed to create audit log', message: error.message });
    }
});
// ==================== NOTIFICATIONS API ====================
app.get('/v1/api/notifications/:userId', async (req, res) => {
    try {
        // Users can only fetch their own notifications; admins can fetch anyone's
        const callerUid = req.user?.uid;
        const callerRole = req.user?.role;
        if (callerUid !== req.params.userId && callerRole !== 'Administrator') {
            return res.status(403).json({ error: 'Forbidden: you can only view your own notifications' });
        }
        const snapshot = await db
            .collection('notifications')
            .where('userId', '==', req.params.userId)
            .orderBy('createdAt', 'desc')
            .limit(100)
            .get();
        const notifications = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        res.json({ notifications, count: notifications.length });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch notifications', message: error.message });
    }
});
app.patch('/v1/api/notifications/:notificationId/read', async (req, res) => {
    try {
        const docRef = db.collection('notifications').doc(req.params.notificationId);
        const docSnap = await docRef.get();
        if (!docSnap.exists)
            return res.status(404).json({ error: 'Notification not found' });
        // Only the owner may mark as read
        if (docSnap.data()?.userId !== req.user?.uid && req.user?.role !== 'Administrator') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        await docRef.update({ read: true });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to mark notification read', message: error.message });
    }
});
app.patch('/v1/api/notifications/:userId/read-all', async (req, res) => {
    try {
        if (req.user?.uid !== req.params.userId && req.user?.role !== 'Administrator') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const snapshot = await db
            .collection('notifications')
            .where('userId', '==', req.params.userId)
            .where('read', '==', false)
            .get();
        const batch = db.batch();
        snapshot.docs.forEach((doc) => batch.update(doc.ref, { read: true }));
        await batch.commit();
        res.json({ success: true, updated: snapshot.size });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to mark all notifications read', message: error.message });
    }
});
// ==================== ANALYTICS API ====================
app.get('/v1/api/analytics/dashboard', requireRole('Administrator'), async (req, res) => {
    try {
        // Use Firestore aggregation queries (count only — no full document scans)
        const [totalCasesSnap, totalPatientsSnap, totalUsersSnap, totalReportsSnap, caseCreatedSnap, caseScheduledSnap, caseScannedSnap, caseReportedSnap, caseFinalizedSnap, caseMildSnap, caseModerateSnap, caseSevereSnap, caseCriticalSnap, reportDraftSnap, reportFinalSnap, reportSignedSnap,] = await Promise.all([
            db.collection('cases').count().get(),
            db.collection('patients').count().get(),
            db.collection('users').count().get(),
            db.collection('reports').count().get(),
            db.collection('cases').where('status', '==', 'CREATED').count().get(),
            db.collection('cases').where('status', '==', 'SCHEDULED').count().get(),
            db.collection('cases').where('status', '==', 'SCANNED').count().get(),
            db.collection('cases').where('status', '==', 'REPORTED').count().get(),
            db.collection('cases').where('status', '==', 'FINALIZED').count().get(),
            db.collection('cases').where('severity', '==', 'Mild').count().get(),
            db.collection('cases').where('severity', '==', 'Moderate').count().get(),
            db.collection('cases').where('severity', '==', 'Severe').count().get(),
            db.collection('cases').where('severity', '==', 'Critical').count().get(),
            db.collection('reports').where('status', '==', 'draft').count().get(),
            db.collection('reports').where('status', '==', 'final').count().get(),
            db.collection('reports').where('status', '==', 'Verified / Signed Off').count().get(),
        ]);
        res.json({
            totalCases: totalCasesSnap.data().count,
            totalPatients: totalPatientsSnap.data().count,
            totalUsers: totalUsersSnap.data().count,
            totalReports: totalReportsSnap.data().count,
            casesByStatus: {
                CREATED: caseCreatedSnap.data().count,
                SCHEDULED: caseScheduledSnap.data().count,
                SCANNED: caseScannedSnap.data().count,
                REPORTED: caseReportedSnap.data().count,
                FINALIZED: caseFinalizedSnap.data().count,
            },
            casesBySeverity: {
                Mild: caseMildSnap.data().count,
                Moderate: caseModerateSnap.data().count,
                Severe: caseSevereSnap.data().count,
                Critical: caseCriticalSnap.data().count,
            },
            reportsByStatus: {
                draft: reportDraftSnap.data().count,
                final: reportFinalSnap.data().count,
                signed: reportSignedSnap.data().count,
            },
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch analytics', message: error.message });
    }
});
// ==================== ADMIN: USER MANAGEMENT ====================
app.post('/v1/api/admin/users', requireRole('Administrator'), async (req, res) => {
    try {
        const createUserSchema = zod_1.z.object({
            email: zod_1.z.string().email(),
            password: zod_1.z.string().min(8),
            name: zod_1.z.string(),
            role: zod_1.z.enum(['Radiographer', 'Radiologist', 'Radiology Department', 'Administrator']),
            specialty: zod_1.z.string().optional(),
            shift: zod_1.z.string().optional(),
        });
        const data = createUserSchema.parse(req.body);
        // Create Firebase Auth account
        const userRecord = await auth.createUser({
            email: data.email,
            password: data.password,
            displayName: data.name,
        });
        // Set custom claims for role (tamper-proof RBAC)
        await auth.setCustomUserClaims(userRecord.uid, { role: data.role });
        // Create Firestore user document
        const firestoreData = {
            name: data.name,
            email: data.email,
            role: data.role,
            specialty: data.specialty || null,
            shift: data.shift || null,
            status: 'active',
            createdAt: new Date().toISOString(),
        };
        await db.collection('users').doc(userRecord.uid).set(firestoreData);
        res.status(201).json({ id: userRecord.uid, ...firestoreData });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Validation failed', details: error.errors });
        }
        res.status(500).json({ error: 'Failed to create user', message: error.message });
    }
});
app.delete('/v1/api/admin/users/:userId', requireRole('Administrator'), async (req, res) => {
    try {
        // Delete from Firebase Auth
        await auth.deleteUser(req.params.userId);
        // Delete from Firestore
        await db.collection('users').doc(req.params.userId).delete();
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete user', message: error.message });
    }
});
app.put('/v1/api/admin/users/:userId/role', requireRole('Administrator'), async (req, res) => {
    try {
        const { role } = zod_1.z
            .object({
            role: zod_1.z.enum(['Radiographer', 'Radiologist', 'Radiology Department', 'Administrator']),
        })
            .parse(req.body);
        // Update custom claim
        await auth.setCustomUserClaims(req.params.userId, { role });
        // Update Firestore document
        await db.collection('users').doc(req.params.userId).update({ role });
        res.json({ success: true, userId: req.params.userId, role });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Validation failed', details: error.errors });
        }
        res.status(500).json({ error: 'Failed to set user role', message: error.message });
    }
});
// ==================== CALLABLE: setCustomClaims ====================
/**
 * Admin-only callable that sets role custom claims on a Firebase Auth user.
 * Called from the Admin dashboard when changing a user's role.
 */
exports.setCustomClaims = functions.https.onCall(async (data, context) => {
    // Must be authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }
    // Must be an admin
    if (context.auth.token.role !== 'Administrator') {
        throw new functions.https.HttpsError('permission-denied', 'Only Administrators can set claims');
    }
    const { uid, role } = data;
    const validRoles = ['Radiographer', 'Radiologist', 'Radiology Department', 'Administrator'];
    if (!uid || !validRoles.includes(role)) {
        throw new functions.https.HttpsError('invalid-argument', 'uid and a valid role are required');
    }
    await auth.setCustomUserClaims(uid, { role });
    await db.collection('users').doc(uid).update({ role });
    return { success: true };
});
// Export the Express app as a Firebase Cloud Function
exports.api = functions.https.onRequest(app);
// ==================== SCHEDULED FUNCTIONS ====================
/** Clean up expired sessions daily. */
exports.cleanupExpiredSessions = functions.pubsub
    .schedule('every 24 hours')
    .onRun(async () => {
    try {
        const thirtyDaysAgo = admin.firestore.Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
        const expiredSessions = await db
            .collection('sessions')
            .where('lastActivity', '<', thirtyDaysAgo)
            .get();
        if (expiredSessions.empty) {
            console.log('No expired sessions to clean up');
            return null;
        }
        const batch = db.batch();
        expiredSessions.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        console.log(`Cleaned up ${expiredSessions.size} expired sessions`);
    }
    catch (error) {
        // Log error but don't rethrow — this is a background maintenance task
        console.error('cleanupExpiredSessions failed:', error);
    }
    return null;
});
// ==================== FIRESTORE TRIGGERS ====================
/**
 * Auto-update case status when report is signed off.
 * This is the only place audit logs are written for this event to avoid double-logging.
 */
exports.onReportSigned = functions.firestore
    .document('reports/{reportId}')
    .onUpdate(async (change) => {
    const before = change.before.data();
    const after = change.after.data();
    if (before.status !== 'Verified / Signed Off' &&
        after.status === 'Verified / Signed Off') {
        const caseId = after.caseId;
        if (caseId) {
            await db.collection('cases').doc(caseId).update({
                status: 'FINALIZED',
                finalizedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log(`Auto-finalized case ${caseId} after report sign-off`);
        }
    }
});
/**
 * Case status change trigger — creates in-app notifications when
 * a case moves between key workflow states.
 *
 * NOTE: `onCaseCreated` has been REMOVED to prevent double audit logging
 * (the POST /api/cases handler already writes the audit log).
 */
exports.onCaseStatusChanged = functions.firestore
    .document('cases/{caseId}')
    .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    if (before.status === after.status)
        return null; // no status change
    const caseId = context.params.caseId;
    const caseNumber = after.caseNumber || caseId;
    const notificationsToCreate = [];
    switch (after.status) {
        case 'SCHEDULED':
            // Notify the assigned radiographer
            if (after.radiographerId) {
                notificationsToCreate.push({
                    userId: after.radiographerId,
                    title: 'New Case Assigned',
                    message: `Case ${caseNumber} has been scheduled for patient ${after.patientName}.`,
                    type: 'info',
                    read: false,
                    link: `/cases/${caseId}`,
                });
            }
            break;
        case 'SCANNED':
            // Notify the assigned radiologist
            if (after.radiologistId) {
                notificationsToCreate.push({
                    userId: after.radiologistId,
                    title: 'Scan Ready for Reporting',
                    message: `Case ${caseNumber} has been scanned and is ready for your report.`,
                    type: 'success',
                    read: false,
                    link: `/cases/${caseId}`,
                });
            }
            break;
        case 'FINALIZED':
            // Notify the registering Radiology Department staff
            if (after.registeredById) {
                notificationsToCreate.push({
                    userId: after.registeredById,
                    title: 'Report Finalized',
                    message: `The diagnostic report for case ${caseNumber} has been finalized.`,
                    type: 'success',
                    read: false,
                    link: `/cases/${caseId}`,
                });
            }
            break;
        default:
            break;
    }
    if (notificationsToCreate.length === 0)
        return null;
    const batch = db.batch();
    notificationsToCreate.forEach((notif) => {
        const ref = db.collection('notifications').doc();
        batch.set(ref, {
            ...notif,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    });
    await batch.commit();
    return null;
});
//# sourceMappingURL=index.js.map