import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();
const auth = admin.auth();

// Express API app
const app = express();

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

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. curl, Postman, server-to-server)
      if (!origin) return callback(null, true);
      if (
        ALWAYS_ALLOWED.includes(origin) ||
        ALLOWED_ORIGINS.includes(origin)
      ) {
        return callback(null, true);
      }
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    credentials: true,
  })
);

app.use(helmet());
app.use(express.json({ limit: '10mb' }));

// ---------------------------------------------------------------------------
// Rate limiting — 200 req / 15 min per IP (public API guard)
// ---------------------------------------------------------------------------
const limiter = rateLimit({
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
] as const;

const CASE_MANAGEMENT_ROLES = ['Radiology Department', 'Medical Officer', 'Administrator'] as const;

// ---------------------------------------------------------------------------
// Authentication middleware
// ---------------------------------------------------------------------------

/**
 * Verify Firebase ID token on every request.
 * Attaches decoded token to req.user.
 * Skips /v1/health and the IAS webhook (which uses an API key instead).
 */
const verifyFirebaseToken = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing Bearer token' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decoded = await auth.verifyIdToken(idToken);
    // Attach the decoded token to the request object for downstream handlers
    (req as any).user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
};

/** Require one of the given roles (read from custom claims). */
const requireRole = (...roles: string[]) => {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const role: string = user.role || '';
    if (!roles.includes(role)) {
      return res.status(403).json({ error: `Forbidden: requires role ${roles.join(' or ')}` });
    }
    next();
  };
};

/** Permit an account to read its own record, or an authorised role to read another. */
const requireSelfOrRole = (...roles: string[]) => {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (req.user.uid === req.params.userId || roles.includes(String(req.user.role || ''))) {
      return next();
    }
    return res.status(403).json({ error: 'Forbidden' });
  };
};

/** Return the authenticated actor without trusting user data supplied by a client. */
async function getActor(req: express.Request) {
  const uid = req.user?.uid;
  if (!uid) throw new Error('Authenticated user is required');

  const profile = await db.collection('users').doc(uid).get();
  const data = profile.data();
  return {
    id: uid,
    role: String(req.user?.role || ''),
    name: String(data?.name || req.user?.name || req.user?.email || uid),
  };
}

/** API Key middleware — for external IAS webhook only. */
const validateApiKey = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const apiKey = req.headers['x-api-key'] as string;
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

// Extend Express Request type with user payload
declare global {
  namespace Express {
    interface Request {
      user?: admin.auth.DecodedIdToken;
    }
  }
}

// ---------------------------------------------------------------------------
// ALLOWED_ORIGINS startup warning — misconfiguration guard
// ---------------------------------------------------------------------------
if (ALLOWED_ORIGINS.length === 0) {
  console.warn(
    '[CORS] WARNING: ALLOWED_ORIGINS environment variable is not set. ' +
    'Only localhost origins are permitted. Set ALLOWED_ORIGINS to your ' +
    'production domain (e.g. https://your-app.vercel.app) in Firebase ' +
    'Functions config or environment variables.'
  );
}

// ---------------------------------------------------------------------------
// Case state machine — enforce valid status transitions
// ---------------------------------------------------------------------------
// NO_SHOW and CANCELLED are terminal exception states that can be reached
// from SCHEDULED (patient did not attend or appointment was cancelled).
// They match the CaseStatus type defined in src/types/index.ts.
const VALID_TRANSITIONS: Record<string, string[]> = {
  CREATED: ['SCHEDULED', 'CANCELLED'],
  SCHEDULED: ['SCANNED', 'CREATED', 'NO_SHOW', 'CANCELLED'],
  SCANNED: ['REPORTED', 'CANCELLED'],
  REPORTED: ['FINALIZED'],
  FINALIZED: [], // terminal state
  NO_SHOW: [],   // terminal exception state
  CANCELLED: [], // terminal exception state
};

function isValidTransition(from: string, to: string): boolean {
  if (from === to) return true; // no-op is always fine
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
    const role = req.query.role as string | undefined;
    let query: admin.firestore.Query = db.collection('users');

    if (role) {
      query = query.where('role', '==', role);
    }

    const snapshot = await query.get();
    const users = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    res.json({ users, count: users.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users', message: (error as Error).message });
  }
});

app.get('/v1/api/users/:userId', requireSelfOrRole('Administrator'), async (req, res) => {
  try {
    const docSnap = await db.collection('users').doc(req.params.userId).get();
    if (!docSnap.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ id: docSnap.id, ...docSnap.data() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user', message: (error as Error).message });
  }
});

// ==================== CLINICS API ====================
app.get('/v1/api/clinics', requireRole(...ALL_STAFF_ROLES), async (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    let query: admin.firestore.Query = db.collection('clinics');

    if (status) {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.get();
    const clinics = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    res.json({ clinics, count: clinics.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch clinics', message: (error as Error).message });
  }
});

app.get('/v1/api/clinics/:clinicId', requireRole(...ALL_STAFF_ROLES), async (req, res) => {
  try {
    const docSnap = await db.collection('clinics').doc(req.params.clinicId).get();
    if (!docSnap.exists) {
      return res.status(404).json({ error: 'Clinic not found' });
    }
    res.json({ id: docSnap.id, ...docSnap.data() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch clinic', message: (error as Error).message });
  }
});

// ==================== PATIENTS API ====================
app.get('/v1/api/patients', requireRole(...ALL_STAFF_ROLES), async (req, res) => {
  try {
    const { clinicId, after, limit } = req.query;
    let query: admin.firestore.Query = db.collection('patients').orderBy('name');

    if (clinicId) query = query.where('clinicId', '==', clinicId);

    // Cursor-based pagination
    if (after) {
      const afterDoc = await db.collection('patients').doc(after as string).get();
      if (afterDoc.exists) query = query.startAfter(afterDoc);
    }
    const pageLimit = Math.min(parseInt(limit as string || '50'), 200);
    query = query.limit(pageLimit);

    const snapshot = await query.get();
    const patients = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const nextCursor = patients.length === pageLimit ? patients[patients.length - 1].id : undefined;

    res.json({ patients, count: patients.length, nextCursor });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch patients', message: (error as Error).message });
  }
});

const patientSchema = z.object({
  name: z.string().min(1),
  dob: z.string().min(1),
  gender: z.enum(['Male', 'Female', 'Other']),
  phone: z.string().min(1),
  // Email is optional — not all patients provide one
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().min(1),
  nric: z.string().min(1),
  mrn: z.string().min(1),
  medicalHistory: z.array(z.string()).default([]),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  googlePlaceId: z.string().optional(),
  preferredClinicId: z.string().optional(),
  preferredClinicName: z.string().optional(),
  clinicId: z.string().optional(),
  clinicName: z.string().optional(),
  ethnicity: z.string().optional(),
  emergencyContact: z.string().optional(),
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
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create patient', message: (error as Error).message });
  }
});

const patientUpdateSchema = patientSchema.partial();

app.patch('/v1/api/patients/:patientId', requireRole(...CASE_MANAGEMENT_ROLES), async (req, res) => {
  try {
    const updates = patientUpdateSchema.parse(req.body);
    const patientRef = db.collection('patients').doc(req.params.patientId);
    const patient = await patientRef.get();
    if (!patient.exists) return res.status(404).json({ error: 'Patient not found' });

    await patientRef.update({
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    const updated = await patientRef.get();
    return res.json({ id: updated.id, ...updated.data() });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    return res.status(500).json({ error: 'Failed to update patient', message: (error as Error).message });
  }
});

// ==================== CASES API ====================
const caseSchema = z.object({
  caseNumber: z.string(),
  patientId: z.string(),
  patientName: z.string(),
  registeredById: z.string(),
  registeredByName: z.string(),
  scanType: z.string(),
  notes: z.string(),
  status: z.enum(['CREATED', 'SCHEDULED', 'SCANNED', 'REPORTED', 'FINALIZED', 'NO_SHOW', 'CANCELLED']).default('CREATED'),
  clinicId: z.string().optional(),
  clinicName: z.string().optional(),
  indication: z.string().optional(),
  bodyRegion: z.string().optional(),
  severity: z.enum(['Mild', 'Moderate', 'Severe', 'Critical']).optional(),
  incubationPeriod: z.string().optional(),
  radiographerId: z.string().optional(),
  radiographerName: z.string().optional(),
  radiologistId: z.string().optional(),
  radiologistName: z.string().optional(),
  scheduledAt: z.string().optional(),
  images: z.array(z.string()).optional(),
});

const caseUpdateSchema = z.object({
  status: z.enum(['CREATED', 'SCHEDULED', 'SCANNED', 'REPORTED', 'FINALIZED', 'NO_SHOW', 'CANCELLED']).optional(),
  severity: z.enum(['Mild', 'Moderate', 'Severe', 'Critical']).optional(),
  notes: z.string().optional(),
  indication: z.string().optional(),
  bodyRegion: z.string().optional(),
  incubationPeriod: z.string().optional(),
  radiographerId: z.string().optional(),
  radiographerName: z.string().optional(),
  radiologistId: z.string().optional(),
  radiologistName: z.string().optional(),
  scheduledAt: z.string().optional(),
  scannedAt: z.string().optional(),
  reportedAt: z.string().optional(),
  finalizedAt: z.string().optional(),
  images: z.array(z.string()).optional(),
  clinicId: z.string().optional(),
  clinicName: z.string().optional(),
  // Exception state fields — set alongside NO_SHOW or CANCELLED status
  noShowReason: z.string().optional(),
  cancellationReason: z.string().optional(),
  cancellationNotes: z.string().optional(),
});

app.get('/v1/api/cases', requireRole(...ALL_STAFF_ROLES), async (req, res) => {
  try {
    const { status, registeredById, radiographerId, severity, after, limit } = req.query;
    let query: admin.firestore.Query = db.collection('cases').orderBy('createdAt', 'desc');

    // Compound filters — Firestore requires matching composite indexes
    if (status) query = query.where('status', '==', status);
    if (registeredById) query = query.where('registeredById', '==', registeredById);
    if (radiographerId) query = query.where('radiographerId', '==', radiographerId);
    if (severity) query = query.where('severity', '==', severity);

    // Cursor-based pagination
    if (after) {
      const afterDoc = await db.collection('cases').doc(after as string).get();
      if (afterDoc.exists) query = query.startAfter(afterDoc);
    }
    const pageLimit = Math.min(parseInt(limit as string || '50'), 200);
    query = query.limit(pageLimit);

    const snapshot = await query.get();
    const cases = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const nextCursor = cases.length === pageLimit ? cases[cases.length - 1].id : undefined;

    res.json({ cases, count: cases.length, nextCursor });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cases', message: (error as Error).message });
  }
});

app.get('/v1/api/cases/:caseId', requireRole(...ALL_STAFF_ROLES), async (req, res) => {
  try {
    const docSnap = await db.collection('cases').doc(req.params.caseId).get();
    if (!docSnap.exists) {
      return res.status(404).json({ error: 'Case not found' });
    }
    res.json({ id: docSnap.id, ...docSnap.data() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch case', message: (error as Error).message });
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
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create case', message: (error as Error).message });
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
    const currentCase = docSnap.data()!;
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

    if (!CASE_MANAGEMENT_ROLES.includes(actor.role as typeof CASE_MANAGEMENT_ROLES[number])) {
      if ('radiographerId' in updates || 'radiographerName' in updates || 'radiologistId' in updates || 'radiologistName' in updates) {
        return res.status(403).json({ error: 'Forbidden: only case managers may change assignments' });
      }
    }

    // Enforce status state machine
    if (updates.status && docSnap.data()?.status) {
      const currentStatus: string = docSnap.data()!.status;
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
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update case', message: (error as Error).message });
  }
});

// ==================== CASE COMMENTS ====================
const commentSchema = z.object({
  message: z.string().min(1).max(5000),
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
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch comments', message: (error as Error).message });
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
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to add comment', message: (error as Error).message });
  }
});

// ==================== REPORTS API ====================
const reportSchema = z.object({
  caseId: z.string(),
  caseNumber: z.string(),
  patientName: z.string(),
  radiologistId: z.string(),
  radiologistName: z.string(),
  findings: z.string(),
  impression: z.string(),
  suggestions: z.string().optional(),
  status: z.enum(['draft', 'final', 'Verified / Signed Off']).default('draft'),
  imageKeys: z.array(z.string()).optional(),
});

const reportUpdateSchema = z.object({
  findings: z.string().optional(),
  impression: z.string().optional(),
  suggestions: z.string().optional(),
  status: z.enum(['draft', 'final', 'Verified / Signed Off']).optional(),
  signedAt: z.string().optional(),
  imageKeys: z.array(z.string()).optional(),
});

app.get('/v1/api/reports', requireRole(...ALL_STAFF_ROLES), async (req, res) => {
  try {
    const { caseId, radiologistId, status, after, limit } = req.query;
    let query: admin.firestore.Query = db.collection('reports').orderBy('createdAt', 'desc');

    if (caseId) query = query.where('caseId', '==', caseId);
    if (radiologistId) query = query.where('radiologistId', '==', radiologistId);
    if (status) query = query.where('status', '==', status);

    if (after) {
      const afterDoc = await db.collection('reports').doc(after as string).get();
      if (afterDoc.exists) query = query.startAfter(afterDoc);
    }
    const pageLimit = Math.min(parseInt(limit as string || '50'), 200);
    query = query.limit(pageLimit);

    const snapshot = await query.get();
    const reports = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const nextCursor = reports.length === pageLimit ? reports[reports.length - 1].id : undefined;

    res.json({ reports, count: reports.length, nextCursor });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reports', message: (error as Error).message });
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
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create report', message: (error as Error).message });
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
    if (
      docSnap.data()?.status === 'Verified / Signed Off' &&
      req.user?.role !== 'Administrator'
    ) {
      return res.status(403).json({ error: 'Signed reports are locked. Only Administrators can modify.' });
    }

    await docRef.update({
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const updated = await docRef.get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update report', message: (error as Error).message });
  }
});

// ==================== MOBILE PACS VANS (FLEET) API ====================
const vanUpdateSchema = z.object({
  status: z.enum(['deployed', 'maintenance', 'idle']).optional(),
  currentClinicId: z.string().optional(),
  currentClinicName: z.string().optional(),
  assignedRadiographerId: z.string().optional(),
  assignedRadiographerName: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

app.get('/v1/api/fleet', requireRole(...ALL_STAFF_ROLES), async (req, res) => {
  try {
    const snapshot = await db.collection('mobile_pacs_vans').get();
    const vans = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json({ vans, count: vans.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch fleet', message: (error as Error).message });
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
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update van', message: (error as Error).message });
  }
});

// ==================== RADIOGRAPHER SCHEDULES API ====================
const scheduleSchema = z.object({
  userId: z.string(),
  userName: z.string(),
  deployedClinicId: z.string(),
  deployedClinicName: z.string(),
  supportedModalities: z.array(z.string()),
  currentCaseload: z.number().default(0),
  maxDailyCaseload: z.number(),
  leaveStatus: z.enum(['Active', 'On Leave']),
  shift: z.string(),
  schedule: z.array(
    z.object({
      date: z.string(),
      startTime: z.string(),
      endTime: z.string(),
      booked: z.boolean().default(false),
      caseId: z.string().optional(),
    })
  ),
});

const scheduleUpdateSchema = z.object({
  currentCaseload: z.number().optional(),
  leaveStatus: z.enum(['Active', 'On Leave']).optional(),
  schedule: z
    .array(
      z.object({
        date: z.string(),
        startTime: z.string(),
        endTime: z.string(),
        booked: z.boolean(),
        caseId: z.string().optional(),
      })
    )
    .optional(),
  deployedClinicId: z.string().optional(),
  deployedClinicName: z.string().optional(),
});

app.get('/v1/api/schedules', requireRole(...ALL_STAFF_ROLES), async (req, res) => {
  try {
    const { userId, clinicId, date } = req.query;
    let query: admin.firestore.Query = db.collection('radio_schedules');

    if (userId) query = query.where('userId', '==', userId);
    if (clinicId) query = query.where('deployedClinicId', '==', clinicId);

    const snapshot = await query.get();
    let schedules: any[] = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    // Filter schedule slots by date (done in-memory as it's a nested array)
    if (date) {
      schedules = schedules
        .map((sched: any) => ({
          ...sched,
          schedule: ((sched.schedule as any[]) || []).filter(
            (slot: any) => slot.date === date
          ),
        }))
        .filter((s: any) => (s.schedule as any[]).length > 0);
    }

    res.json({ schedules, count: schedules.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch schedules', message: (error as Error).message });
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
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create schedule', message: (error as Error).message });
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
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update schedule', message: (error as Error).message });
  }
});

// ==================== PATIENT REQUESTS API ====================
const patientRequestUpdateSchema = z.object({
  status: z.enum(['Pending', 'Approved', 'Rejected']).optional(),
  approverName: z.string().optional(),
  approvedOrRejectedAt: z.string().optional(),
  remarks: z.string().optional(),
});

app.get('/v1/api/patient-requests', requireRole('Radiology Department', 'Medical Officer', 'Administrator'), async (req, res) => {
  try {
    const { status } = req.query;
    let query: admin.firestore.Query = db
      .collection('patient_requests')
      .orderBy('dateSubmitted', 'desc');
    if (status) query = query.where('status', '==', status);
    const snapshot = await query.get();
    const requests = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json({ requests, count: requests.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch patient requests', message: (error as Error).message });
  }
});

app.post('/v1/api/patient-requests', requireRole('Radiology Department', 'Medical Officer', 'Administrator'), async (req, res) => {
  try {
    const patientRequestSchema = z.object({
      patientId: z.string(),
      patientName: z.string(),
      mrn: z.string(),
      requestType: z.enum(['Update', 'Archive']),
      requestedBy: z.string(),
      requestedById: z.string(),
      requestedByRole: z.string(),
      dateSubmitted: z.string(),
      requestedChanges: z.record(z.unknown()),
      reason: z.string(),
      status: z.enum(['Pending', 'Approved', 'Rejected']).default('Pending'),
      remarks: z.string().default(''),
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
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create patient request', message: (error as Error).message });
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
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update patient request', message: (error as Error).message });
  }
});

// ==================== IAS WEBHOOK (External Scheduling — API key auth) ====================
app.post('/v1/ias/webhook', validateApiKey, async (req, res) => {
  try {
    const webhookSchema = z.object({
      event: z.enum(['SCHEDULE_ASSIGNED', 'SCHEDULE_UPDATED', 'SCHEDULE_CANCELLED']),
      caseId: z.string(),
      radiographerId: z.string(),
      radiographerName: z.string(),
      scheduledAt: z.string(),
      clinicId: z.string().optional(),
      vanId: z.string().optional(),
    });

    const data = webhookSchema.parse(req.body);

    const caseRef = db.collection('cases').doc(data.caseId);
    const caseDoc = await caseRef.get();

    if (!caseDoc.exists) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const newStatus = data.event === 'SCHEDULE_CANCELLED' ? 'CREATED' : 'SCHEDULED';
    const currentStatus: string = caseDoc.data()!.status;

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
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'Webhook processing failed', message: (error as Error).message });
  }
});

// ==================== AUDIT LOGS API ====================
app.get('/v1/api/audit-logs', requireRole('Administrator'), async (req, res) => {
  try {
    const { userId, action, after, limit } = req.query;
    let query: admin.firestore.Query = db
      .collection('audit_logs')
      .orderBy('timestamp', 'desc');

    if (userId) query = query.where('userId', '==', userId);
    if (action) query = query.where('action', '==', action);

    if (after) {
      const afterDoc = await db.collection('audit_logs').doc(after as string).get();
      if (afterDoc.exists) query = query.startAfter(afterDoc);
    }
    const pageLimit = Math.min(parseInt(limit as string || '50'), 200);
    query = query.limit(pageLimit);

    const snapshot = await query.get();
    const logs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const nextCursor = logs.length === pageLimit ? logs[logs.length - 1].id : undefined;

    res.json({ logs, count: logs.length, nextCursor });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audit logs', message: (error as Error).message });
  }
});

app.post('/v1/api/audit-logs', requireRole(...ALL_STAFF_ROLES), async (req, res) => {
  try {
    const logSchema = z.object({
      action: z.string(),
      target: z.string(),
      details: z.string(),
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
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create audit log', message: (error as Error).message });
  }
});

// ==================== NOTIFICATIONS API ====================
app.get('/v1/api/notifications/:userId', async (req, res) => {
  try {
    // Users can only fetch their own notifications; admins can fetch anyone's
    const callerUid = req.user?.uid;
    const callerRole = req.user?.role as string;
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
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications', message: (error as Error).message });
  }
});

app.patch('/v1/api/notifications/:notificationId/read', async (req, res) => {
  try {
    const docRef = db.collection('notifications').doc(req.params.notificationId);
    const docSnap = await docRef.get();
    if (!docSnap.exists) return res.status(404).json({ error: 'Notification not found' });

    // Only the owner may mark as read
    if (docSnap.data()?.userId !== req.user?.uid && req.user?.role !== 'Administrator') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await docRef.update({ read: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark notification read', message: (error as Error).message });
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
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark all notifications read', message: (error as Error).message });
  }
});

// ==================== ANALYTICS API ====================
app.get('/v1/api/analytics/dashboard', requireRole('Administrator'), async (req, res) => {
  try {
    // Use Firestore aggregation queries (count only — no full document scans)
    const [
      totalCasesSnap,
      totalPatientsSnap,
      totalUsersSnap,
      totalReportsSnap,
      caseCreatedSnap,
      caseScheduledSnap,
      caseScannedSnap,
      caseReportedSnap,
      caseFinalizedSnap,
      caseMildSnap,
      caseModerateSnap,
      caseSevereSnap,
      caseCriticalSnap,
      reportDraftSnap,
      reportFinalSnap,
      reportSignedSnap,
    ] = await Promise.all([
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
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics', message: (error as Error).message });
  }
});

// ==================== ADMIN: USER MANAGEMENT ====================
app.post(
  '/v1/api/admin/users',
  requireRole('Administrator'),
  async (req, res) => {
    try {
      const createUserSchema = z.object({
        email: z.string().email(),
        password: z.string().min(8),
        name: z.string(),
        role: z.enum(['Radiographer', 'Radiologist', 'Radiology Department', 'Administrator']),
        specialty: z.string().optional(),
        shift: z.string().optional(),
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
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation failed', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to create user', message: (error as Error).message });
    }
  }
);

app.delete(
  '/v1/api/admin/users/:userId',
  requireRole('Administrator'),
  async (req, res) => {
    try {
      // Delete from Firebase Auth
      await auth.deleteUser(req.params.userId);
      // Delete from Firestore
      await db.collection('users').doc(req.params.userId).delete();

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete user', message: (error as Error).message });
    }
  }
);

app.put(
  '/v1/api/admin/users/:userId/role',
  requireRole('Administrator'),
  async (req, res) => {
    try {
      const { role } = z
        .object({
          role: z.enum(['Radiographer', 'Radiologist', 'Radiology Department', 'Administrator']),
        })
        .parse(req.body);

      // Update custom claim
      await auth.setCustomUserClaims(req.params.userId, { role });
      // Update Firestore document
      await db.collection('users').doc(req.params.userId).update({ role });

      res.json({ success: true, userId: req.params.userId, role });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation failed', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to set user role', message: (error as Error).message });
    }
  }
);

// ==================== CALLABLE: setCustomClaims ====================
/**
 * Admin-only callable that sets role custom claims on a Firebase Auth user.
 * Called from the Admin dashboard when changing a user's role.
 */
export const setCustomClaims = functions.https.onCall(async (data, context) => {
  // Must be authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }
  // Must be an admin
  if (context.auth.token.role !== 'Administrator') {
    throw new functions.https.HttpsError('permission-denied', 'Only Administrators can set claims');
  }

  const { uid, role } = data as { uid: string; role: string };
  const validRoles = ['Radiographer', 'Radiologist', 'Radiology Department', 'Administrator'];
  if (!uid || !validRoles.includes(role)) {
    throw new functions.https.HttpsError('invalid-argument', 'uid and a valid role are required');
  }

  await auth.setCustomUserClaims(uid, { role });
  await db.collection('users').doc(uid).update({ role });
  return { success: true };
});

// Export the Express app as a Firebase Cloud Function
export const api = functions.https.onRequest(app);

// ==================== SCHEDULED FUNCTIONS ====================

/** Clean up expired sessions daily. */
export const cleanupExpiredSessions = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async () => {
    try {
      const thirtyDaysAgo = admin.firestore.Timestamp.fromDate(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      );

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
    } catch (error) {
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
export const onReportSigned = functions.firestore
  .document('reports/{reportId}')
  .onUpdate(async (change) => {
    const before = change.before.data();
    const after = change.after.data();

    if (
      before.status !== 'Verified / Signed Off' &&
      after.status === 'Verified / Signed Off'
    ) {
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
export const onCaseStatusChanged = functions.firestore
  .document('cases/{caseId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    if (before.status === after.status) return null; // no status change

    const caseId = context.params.caseId;
    const caseNumber = after.caseNumber || caseId;

    const notificationsToCreate: Array<{
      userId: string;
      title: string;
      message: string;
      type: string;
      read: boolean;
      link: string;
    }> = [];

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

    if (notificationsToCreate.length === 0) return null;

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
