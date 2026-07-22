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
exports.onCaseCreated = exports.onReportSigned = exports.cleanupExpiredSessions = exports.api = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const zod_1 = require("zod");
// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();
const auth = admin.auth();
// Express API app
const app = (0, express_1.default)();
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({ origin: true }));
app.use(express_1.default.json({ limit: '10mb' }));
// API Key authentication middleware (optional for external IAS access)
const validateApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
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
        const role = req.query.role;
        let query = db.collection('users');
        if (role) {
            query = query.where('role', '==', role);
        }
        const snapshot = await query.get();
        const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json({ users, count: users.length });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch users', message: error.message });
    }
});
app.get('/api/users/:userId', async (req, res) => {
    try {
        const doc = await db.collection('users').doc(req.params.userId).get();
        if (!doc.exists) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ id: doc.id, ...doc.data() });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch user', message: error.message });
    }
});
// ==================== CLINICS API ====================
app.get('/api/clinics', async (req, res) => {
    try {
        const status = req.query.status;
        let query = db.collection('clinics');
        if (status) {
            query = query.where('status', '==', status);
        }
        const snapshot = await query.get();
        const clinics = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json({ clinics, count: clinics.length });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch clinics', message: error.message });
    }
});
app.get('/api/clinics/:clinicId', async (req, res) => {
    try {
        const doc = await db.collection('clinics').doc(req.params.clinicId).get();
        if (!doc.exists) {
            return res.status(404).json({ error: 'Clinic not found' });
        }
        res.json({ id: doc.id, ...doc.data() });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch clinic', message: error.message });
    }
});
// ==================== PATIENTS API ====================
app.get('/api/patients', async (req, res) => {
    try {
        const clinicId = req.query.clinicId;
        let query = db.collection('patients');
        if (clinicId) {
            query = query.where('clinicId', '==', clinicId);
        }
        const snapshot = await query.get();
        const patients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json({ patients, count: patients.length });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch patients', message: error.message });
    }
});
app.post('/api/patients', async (req, res) => {
    try {
        const patientSchema = zod_1.z.object({
            name: zod_1.z.string(),
            dob: zod_1.z.string(),
            gender: zod_1.z.enum(['Male', 'Female', 'Other']),
            phone: zod_1.z.string(),
            email: zod_1.z.string().email(),
            address: zod_1.z.string(),
            nric: zod_1.z.string(),
            mrn: zod_1.z.string(),
            medicalHistory: zod_1.z.array(zod_1.z.string()).default([]),
            latitude: zod_1.z.number().optional(),
            longitude: zod_1.z.number().optional(),
            googlePlaceId: zod_1.z.string().optional(),
            preferredClinicId: zod_1.z.string().optional(),
            preferredClinicName: zod_1.z.string().optional(),
            clinicId: zod_1.z.string().optional(),
            clinicName: zod_1.z.string().optional(),
        });
        const data = patientSchema.parse(req.body);
        const docRef = await db.collection('patients').add({
            ...data,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
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
// ==================== CASES API (IAS Integration) ====================
app.get('/api/cases', async (req, res) => {
    try {
        const { status, registeredById, radiographerId, severity, limit } = req.query;
        let query = db.collection('cases');
        if (status)
            query = query.where('status', '==', status);
        if (registeredById)
            query = query.where('registeredById', '==', registeredById);
        if (radiographerId)
            query = query.where('radiographerId', '==', radiographerId);
        if (severity)
            query = query.where('severity', '==', severity);
        query = query.orderBy('createdAt', 'desc');
        if (limit)
            query = query.limit(parseInt(limit));
        const snapshot = await query.get();
        const cases = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json({ cases, count: cases.length });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch cases', message: error.message });
    }
});
app.get('/api/cases/:caseId', async (req, res) => {
    try {
        const doc = await db.collection('cases').doc(req.params.caseId).get();
        if (!doc.exists) {
            return res.status(404).json({ error: 'Case not found' });
        }
        res.json({ id: doc.id, ...doc.data() });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch case', message: error.message });
    }
});
app.post('/api/cases', async (req, res) => {
    try {
        const caseSchema = zod_1.z.object({
            caseNumber: zod_1.z.string(),
            patientId: zod_1.z.string(),
            patientName: zod_1.z.string(),
            registeredById: zod_1.z.string(),
            registeredByName: zod_1.z.string(),
            scanType: zod_1.z.string(),
            notes: zod_1.z.string(),
            status: zod_1.z.enum(['CREATED', 'SCHEDULED', 'SCANNED', 'REPORTED', 'FINALIZED']).default('CREATED'),
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
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Validation failed', details: error.errors });
        }
        res.status(500).json({ error: 'Failed to create case', message: error.message });
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
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update case', message: error.message });
    }
});
// ==================== REPORTS API ====================
app.get('/api/reports', async (req, res) => {
    try {
        const { caseId, radiologistId, status } = req.query;
        let query = db.collection('reports');
        if (caseId)
            query = query.where('caseId', '==', caseId);
        if (radiologistId)
            query = query.where('radiologistId', '==', radiologistId);
        if (status)
            query = query.where('status', '==', status);
        query = query.orderBy('createdAt', 'desc');
        const snapshot = await query.get();
        const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json({ reports, count: reports.length });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch reports', message: error.message });
    }
});
app.post('/api/reports', async (req, res) => {
    try {
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
        const data = reportSchema.parse(req.body);
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
// ==================== MOBILE PACS VANS (FLEET) API ====================
app.get('/api/fleet', async (req, res) => {
    try {
        const snapshot = await db.collection('mobile_pacs_vans').get();
        const vans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json({ vans, count: vans.length });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch fleet', message: error.message });
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
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update van', message: error.message });
    }
});
// ==================== RADIOGRAPHER SCHEDULES API (IAS Integration) ====================
app.get('/api/schedules', async (req, res) => {
    try {
        const { userId, clinicId, date } = req.query;
        let query = db.collection('radio_schedules');
        if (userId)
            query = query.where('userId', '==', userId);
        if (clinicId)
            query = query.where('deployedClinicId', '==', clinicId);
        const snapshot = await query.get();
        let schedules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Filter by date if provided
        if (date) {
            schedules = schedules.map(sched => ({
                ...sched,
                schedule: sched.schedule?.filter((slot) => slot.date === date) || [],
            })).filter(s => s.schedule.length > 0);
        }
        res.json({ schedules, count: schedules.length });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch schedules', message: error.message });
    }
});
app.post('/api/schedules', async (req, res) => {
    try {
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
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update schedule', message: error.message });
    }
});
// ==================== IAS WEBHOOK (External Scheduling System Integration) ====================
app.post('/api/ias/webhook', validateApiKey, async (req, res) => {
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
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Validation failed', details: error.errors });
        }
        res.status(500).json({ error: 'Webhook processing failed', message: error.message });
    }
});
// ==================== AUDIT LOGS API ====================
app.get('/api/audit-logs', async (req, res) => {
    try {
        const { userId, action, limit } = req.query;
        let query = db.collection('audit_logs');
        if (userId)
            query = query.where('userId', '==', userId);
        if (action)
            query = query.where('action', '==', action);
        query = query.orderBy('timestamp', 'desc');
        if (limit)
            query = query.limit(parseInt(limit));
        const snapshot = await query.get();
        const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json({ logs, count: logs.length });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch audit logs', message: error.message });
    }
});
app.post('/api/audit-logs', async (req, res) => {
    try {
        const logSchema = zod_1.z.object({
            userId: zod_1.z.string(),
            userName: zod_1.z.string(),
            userRole: zod_1.z.string(),
            action: zod_1.z.string(),
            target: zod_1.z.string(),
            details: zod_1.z.string(),
        });
        const data = logSchema.parse(req.body);
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
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch analytics', message: error.message });
    }
});
// Export the Express app as a Firebase Cloud Function
exports.api = functions.https.onRequest(app);
// ==================== SCHEDULED FUNCTIONS ====================
// Clean up expired sessions daily
exports.cleanupExpiredSessions = functions.pubsub
    .schedule('every 24 hours')
    .onRun(async () => {
    const thirtyDaysAgo = admin.firestore.Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
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
exports.onReportSigned = functions.firestore
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
exports.onCaseCreated = functions.firestore
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
//# sourceMappingURL=index.js.map