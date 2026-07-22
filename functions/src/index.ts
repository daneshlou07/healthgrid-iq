import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { z } from 'zod';

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();
const auth = admin.auth();

// Express API app
const app = express();

// Middleware
app.use(helmet());
app.use(cors({ origin: true }));
app.use(express.json({ limit: '10mb' }));

// API Key authentication middleware (optional for external IAS access)
const validateApiKey = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;
  const validKey = functions.config().api?.key || process.env.API_KEY;
  
  if (validKey && apiKey !== validKey) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
  }
  next();
};

// ==================== HEALTH CHECK ====================
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// ==================== USERS API ====================
app.get('/api/users', async (req, res) => {
  try {
    const role = req.query.role as string | undefined;
    let query = db.collection('users');
    
    if (role) {
      query = query.where('role', '==', role) as any;
    }
    
    const snapshot = await query.get();
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    res.json({ users, count: users.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users', message: (error as Error).message });
  }
});

app.get('/api/users/:userId', async (req, res) => {
  try {
    const doc = await db.collection('users').doc(req.params.userId).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user', message: (error as Error).message });
  }
});

// ==================== CLINICS API ====================
app.get('/api/clinics', async (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    let query = db.collection('clinics');
    
    if (status) {
      query = query.where('status', '==', status) as any;
    }
    
    const snapshot = await query.get();
    const clinics = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    res.json({ clinics, count: clinics.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch clinics', message: (error as Error).message });
  }
});

app.get('/api/clinics/:clinicId', async (req, res) => {
  try {
    const doc = await db.collection('clinics').doc(req.params.clinicId).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Clinic not found' });
    }
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch clinic', message: (error as Error).message });
  }
});

// ==================== PATIENTS API ====================
app.get('/api/patients', async (req, res) => {
  try {
    const clinicId = req.query.clinicId as string | undefined;
    let query = db.collection('patients');
    
    if (clinicId) {
      query = query.where('clinicId', '==', clinicId) as any;
    }
    
    const snapshot = await query.get();
    const patients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    res.json({ patients, count: patients.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch patients', message: (error as Error).message });
  }
});

app.post('/api/patients', async (req, res) => {
  try {
    const patientSchema = z.object({
      name: z.string(),
      dob: z.string(),
      gender: z.enum(['Male', 'Female', 'Other']),
      phone: z.string(),
      email: z.string().email(),
      address: z.string(),
      nric: z.string(),
      mrn: z.string(),
      medicalHistory: z.array(z.string()).default([]),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      googlePlaceId: z.string().optional(),
      preferredClinicId: z.string().optional(),
      preferredClinicName: z.string().optional(),
      clinicId: z.string().optional(),
      clinicName: z.string().optional(),
    });
    
    const data = patientSchema.parse(req.body);
    const docRef = await db.collection('patients').add({
      ...data,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    res.status(201).json({ id: docRef.id, ...data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create patient', message: (error as Error).message });
  }
});

// ==================== CASES API (IAS Integration) ====================
app.get('/api/cases', async (req, res) => {
  try {
    const { status, registeredById, radiographerId, severity, limit } = req.query;
    let query: admin.firestore.Query = db.collection('cases');
    
    if (status) query = query.where('status', '==', status);
    if (registeredById) query = query.where('registeredById', '==', registeredById);
    if (radiographerId) query = query.where('radiographerId', '==', radiographerId);
    if (severity) query = query.where('severity', '==', severity);
    
    query = query.orderBy('createdAt', 'desc');
    
    if (limit) query = query.limit(parseInt(limit as string));
    
    const snapshot = await query.get();
    const cases = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    res.json({ cases, count: cases.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cases', message: (error as Error).message });
  }
});

app.get('/api/cases/:caseId', async (req, res) => {
  try {
    const doc = await db.collection('cases').doc(req.params.caseId).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Case not found' });
    }
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch case', message: (error as Error).message });
  }
});

app.post('/api/cases', async (req, res) => {
  try {
    const caseSchema = z.object({
      caseNumber: z.string(),
      patientId: z.string(),
      patientName: z.string(),
      registeredById: z.string(),
      registeredByName: z.string(),
      scanType: z.string(),
      notes: z.string(),
      status: z.enum(['CREATED', 'SCHEDULED', 'SCANNED', 'REPORTED', 'FINALIZED']).default('CREATED'),
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
    
    const data = caseSchema.parse(req.body);
    const docRef = await db.collection('cases').add({
      ...data,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    // Log case creation
    await db.collection('audit_logs').add({
      userId: data.registeredById,
      userName: data.registeredByName,
      userRole: 'Radiology Department',
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

app.patch('/api/cases/:caseId', async (req, res) => {
  try {
    const docRef = db.collection('cases').doc(req.params.caseId);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Case not found' });
    }
    
    await docRef.update({
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    const updated = await docRef.get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update case', message: (error as Error).message });
  }
});

// ==================== REPORTS API ====================
app.get('/api/reports', async (req, res) => {
  try {
    const { caseId, radiologistId, status } = req.query;
    let query: admin.firestore.Query = db.collection('reports');
    
    if (caseId) query = query.where('caseId', '==', caseId);
    if (radiologistId) query = query.where('radiologistId', '==', radiologistId);
    if (status) query = query.where('status', '==', status);
    
    query = query.orderBy('createdAt', 'desc');
    
    const snapshot = await query.get();
    const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    res.json({ reports, count: reports.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reports', message: (error as Error).message });
  }
});

app.post('/api/reports', async (req, res) => {
  try {
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
    
    const data = reportSchema.parse(req.body);
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

// ==================== MOBILE PACS VANS (FLEET) API ====================
app.get('/api/fleet', async (req, res) => {
  try {
    const snapshot = await db.collection('mobile_pacs_vans').get();
    const vans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    res.json({ vans, count: vans.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch fleet', message: (error as Error).message });
  }
});

app.patch('/api/fleet/:vanId', async (req, res) => {
  try {
    const docRef = db.collection('mobile_pacs_vans').doc(req.params.vanId);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Van not found' });
    }
    
    await docRef.update({
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    const updated = await docRef.get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update van', message: (error as Error).message });
  }
});

// ==================== RADIOGRAPHER SCHEDULES API (IAS Integration) ====================
app.get('/api/schedules', async (req, res) => {
  try {
    const { userId, clinicId, date } = req.query;
    let query: admin.firestore.Query = db.collection('radio_schedules');
    
    if (userId) query = query.where('userId', '==', userId);
    if (clinicId) query = query.where('deployedClinicId', '==', clinicId);
    
    const snapshot = await query.get();
    let schedules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Filter by date if provided
    if (date) {
      schedules = schedules.map(sched => ({
        ...sched,
        schedule: (sched.schedule as any[])?.filter((slot: any) => slot.date === date) || [],
      })).filter(s => (s.schedule as any[]).length > 0);
    }
    
    res.json({ schedules, count: schedules.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch schedules', message: (error as Error).message });
  }
});

app.post('/api/schedules', async (req, res) => {
  try {
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
      schedule: z.array(z.object({
        date: z.string(),
        startTime: z.string(),
        endTime: z.string(),
        booked: z.boolean().default(false),
        caseId: z.string().optional(),
      })),
    });
    
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

app.patch('/api/schedules/:scheduleId', async (req, res) => {
  try {
    const docRef = db.collection('radio_schedules').doc(req.params.scheduleId);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Schedule not found' });
    }
    
    await docRef.update({
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    const updated = await docRef.get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update schedule', message: (error as Error).message });
  }
});

// ==================== IAS WEBHOOK (External Scheduling System Integration) ====================
app.post('/api/ias/webhook', validateApiKey, async (req, res) => {
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
    
    // Update case with scheduling info
    const caseRef = db.collection('cases').doc(data.caseId);
    const caseDoc = await caseRef.get();
    
    if (!caseDoc.exists) {
      return res.status(404).json({ error: 'Case not found' });
    }
    
    await caseRef.update({
      radiographerId: data.radiographerId,
      radiographerName: data.radiographerName,
      scheduledAt: data.scheduledAt,
      status: data.event === 'SCHEDULE_CANCELLED' ? 'CREATED' : 'SCHEDULED',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    // Log the event
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
app.get('/api/audit-logs', async (req, res) => {
  try {
    const { userId, action, limit } = req.query;
    let query: admin.firestore.Query = db.collection('audit_logs');
    
    if (userId) query = query.where('userId', '==', userId);
    if (action) query = query.where('action', '==', action);
    
    query = query.orderBy('timestamp', 'desc');
    
    if (limit) query = query.limit(parseInt(limit as string));
    
    const snapshot = await query.get();
    const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    res.json({ logs, count: logs.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audit logs', message: (error as Error).message });
  }
});

app.post('/api/audit-logs', async (req, res) => {
  try {
    const logSchema = z.object({
      userId: z.string(),
      userName: z.string(),
      userRole: z.string(),
      action: z.string(),
      target: z.string(),
      details: z.string(),
    });
    
    const data = logSchema.parse(req.body);
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

// ==================== ANALYTICS API ====================
app.get('/api/analytics/dashboard', async (req, res) => {
  try {
    const [casesSnapshot, patientsSnapshot, usersSnapshot, reportsSnapshot] = await Promise.all([
      db.collection('cases').get(),
      db.collection('patients').get(),
      db.collection('users').get(),
      db.collection('reports').get(),
    ]);
    
    const cases = casesSnapshot.docs.map(d => d.data());
    const reports = reportsSnapshot.docs.map(d => d.data());
    
    const stats = {
      totalCases: cases.length,
      totalPatients: patientsSnapshot.size,
      totalUsers: usersSnapshot.size,
      totalReports: reports.length,
      casesByStatus: {
        CREATED: cases.filter(c => c.status === 'CREATED').length,
        SCHEDULED: cases.filter(c => c.status === 'SCHEDULED').length,
        SCANNED: cases.filter(c => c.status === 'SCANNED').length,
        REPORTED: cases.filter(c => c.status === 'REPORTED').length,
        FINALIZED: cases.filter(c => c.status === 'FINALIZED').length,
      },
      casesBySeverity: {
        Mild: cases.filter(c => c.severity === 'Mild').length,
        Moderate: cases.filter(c => c.severity === 'Moderate').length,
        Severe: cases.filter(c => c.severity === 'Severe').length,
        Critical: cases.filter(c => c.severity === 'Critical').length,
      },
      reportsByStatus: {
        draft: reports.filter(r => r.status === 'draft').length,
        final: reports.filter(r => r.status === 'final').length,
        signed: reports.filter(r => r.status === 'Verified / Signed Off').length,
      },
    };
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics', message: (error as Error).message });
  }
});

// Export the Express app as a Firebase Cloud Function
export const api = functions.https.onRequest(app);

// ==================== SCHEDULED FUNCTIONS ====================
// Clean up expired sessions daily
export const cleanupExpiredSessions = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async () => {
    const thirtyDaysAgo = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );
    
    const expiredSessions = await db.collection('sessions')
      .where('lastActivity', '<', thirtyDaysAgo)
      .get();
    
    const batch = db.batch();
    expiredSessions.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    
    console.log(`Cleaned up ${expiredSessions.size} expired sessions`);
  });

// ==================== FIRESTORE TRIGGERS ====================
// Auto-update case status when report is signed
export const onReportSigned = functions.firestore
  .document('reports/{reportId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    
    // If report just got signed off
    if (before.status !== 'Verified / Signed Off' && after.status === 'Verified / Signed Off') {
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

// Track user activity for audit
export const onCaseCreated = functions.firestore
  .document('cases/{caseId}')
  .onCreate(async (snapshot, context) => {
    const data = snapshot.data();
    
    await db.collection('audit_logs').add({
      userId: data.registeredById,
      userName: data.registeredByName,
      userRole: 'Radiology Department',
      action: 'CASE_CREATED',
      target: `cases/${context.params.caseId}`,
      details: `Created case ${data.caseNumber} for patient ${data.patientName}`,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
