# HealthGrid IQ — Firebase Cloud Functions

Backend API layer for HealthGrid IQ built with Firebase Cloud Functions, Express, and TypeScript.

---

## Features

- **REST API** with Express.js
- **Role-based security** via Firestore rules
- **Input validation** with Zod schemas
- **CORS & Helmet** security headers
- **Real-time triggers** for automated workflows
- **Scheduled jobs** for cleanup tasks
- **IAS webhook** endpoint for external scheduling systems
- **Comprehensive logging** and error handling

---

## Architecture

```
functions/
├── src/
│   ├── index.ts           # Main API routes & Cloud Functions
│   └── seed.ts            # Database seeding script
├── lib/                   # Compiled JavaScript (generated)
├── package.json           # Dependencies
└── tsconfig.json          # TypeScript config
```

---

## Setup

### 1. Install Dependencies

```bash
cd functions
npm install
```

### 2. Build TypeScript

```bash
npm run build
```

Output: `lib/index.js`

### 3. Run Locally (Emulators)

```bash
# From project root
firebase emulators:start

# Functions will run on: http://localhost:5001
# API endpoint: http://localhost:5001/healthgrid-iq-demo/us-central1/api
```

### 4. Deploy to Production

```bash
# From project root
firebase deploy --only functions

# Or specific function
firebase deploy --only functions:api
```

---

## API Endpoints

Base URL: `https://<region>-<project-id>.cloudfunctions.net/api`

Or via Firebase Hosting: `https://<project-id>.web.app/api`

### Health Check

```http
GET /health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2025-07-22T10:30:00Z"
}
```

---

### Users

#### Get all users
```http
GET /api/users?role=Doctor
```

Query params:
- `role` (optional): Filter by role

Response:
```json
{
  "users": [...],
  "count": 10
}
```

#### Get user by ID
```http
GET /api/users/:userId
```

---

### Clinics

#### Get all clinics
```http
GET /api/clinics?status=active
```

Query params:
- `status` (optional): Filter by status

---

### Patients

#### Get all patients
```http
GET /api/patients?clinicId=clinic-001
```

Query params:
- `clinicId` (optional): Filter by clinic

#### Create patient
```http
POST /api/patients
Content-Type: application/json

{
  "name": "Ahmad bin Abdullah",
  "dob": "1975-03-15",
  "gender": "Male",
  "phone": "+60123456789",
  "email": "ahmad@email.com",
  "address": "Jalan Mawar, Tanjong Karang",
  "nric": "750315-10-5678",
  "mrn": "MRN-001-2025",
  "medicalHistory": ["Hypertension"]
}
```

---

### Cases

#### Get all cases
```http
GET /api/cases?status=CREATED&severity=Critical&limit=50
```

Query params:
- `status`: `CREATED`, `SCHEDULED`, `SCANNED`, `REPORTED`, `FINALIZED`
- `doctorId`: Filter by doctor
- `radiographerId`: Filter by radiographer
- `severity`: `Mild`, `Moderate`, `Severe`, `Critical`
- `limit`: Max results (default: all)

#### Get case by ID
```http
GET /api/cases/:caseId
```

#### Create case
```http
POST /api/cases
Content-Type: application/json

{
  "caseNumber": "CASE-2025-001",
  "patientId": "patient-001",
  "patientName": "Ahmad bin Abdullah",
  "doctorId": "doc-001",
  "doctorName": "Dr. Sarah Chen",
  "scanType": "Chest X-Ray",
  "notes": "Post-accident follow-up",
  "status": "CREATED",
  "severity": "Moderate",
  "clinicId": "clinic-001"
}
```

#### Update case
```http
PATCH /api/cases/:caseId
Content-Type: application/json

{
  "status": "SCHEDULED",
  "radiographerId": "rad-001",
  "radiographerName": "Ahmad Razak",
  "scheduledAt": "2025-07-22T10:00:00Z"
}
```

---

### Reports

#### Get all reports
```http
GET /api/reports?caseId=case-001&radiologistId=rologist-001
```

Query params:
- `caseId`: Filter by case
- `radiologistId`: Filter by radiologist
- `status`: `draft`, `final`, `Verified / Signed Off`

#### Create report
```http
POST /api/reports
Content-Type: application/json

{
  "caseId": "case-001",
  "caseNumber": "CASE-2025-001",
  "patientName": "Ahmad bin Abdullah",
  "radiologistId": "rologist-001",
  "radiologistName": "Dr. Priya Nair",
  "findings": "Chest X-ray demonstrates...",
  "impression": "Right rib fractures without complications",
  "suggestions": "Pain management and follow-up",
  "status": "draft"
}
```

---

### Fleet (Mobile PACS Vans)

#### Get all vans
```http
GET /api/fleet
```

#### Update van
```http
PATCH /api/fleet/:vanId
Content-Type: application/json

{
  "currentClinicId": "clinic-002",
  "latitude": 3.2072,
  "longitude": 101.4633,
  "status": "deployed"
}
```

---

### Schedules (Radiographer Availability)

#### Get schedules
```http
GET /api/schedules?userId=rad-001&date=2025-07-22
```

Query params:
- `userId`: Filter by radiographer
- `clinicId`: Filter by clinic
- `date`: Filter by date (YYYY-MM-DD)

#### Create schedule
```http
POST /api/schedules
Content-Type: application/json

{
  "userId": "rad-001",
  "userName": "Ahmad Razak",
  "deployedClinicId": "clinic-001",
  "deployedClinicName": "Klinik Kesihatan Tanjong Karang",
  "supportedModalities": ["X-Ray", "CT", "MRI"],
  "maxDailyCaseload": 12,
  "leaveStatus": "Active",
  "shift": "Day",
  "schedule": [
    {
      "date": "2025-07-22",
      "startTime": "08:00",
      "endTime": "10:00",
      "booked": false
    }
  ]
}
```

#### Update schedule
```http
PATCH /api/schedules/:scheduleId
Content-Type: application/json

{
  "currentCaseload": 6,
  "schedule": [...]
}
```

---

### IAS Webhook (External System Integration)

```http
POST /api/ias/webhook
X-API-Key: <api-key>
Content-Type: application/json

{
  "event": "SCHEDULE_ASSIGNED",
  "caseId": "case-001",
  "radiographerId": "rad-001",
  "radiographerName": "Ahmad Razak",
  "scheduledAt": "2025-07-22T10:00:00Z",
  "clinicId": "clinic-001",
  "vanId": "van-001"
}
```

Events:
- `SCHEDULE_ASSIGNED`: Initial assignment
- `SCHEDULE_UPDATED`: Rescheduled
- `SCHEDULE_CANCELLED`: Assignment cancelled

---

### Audit Logs

#### Get logs
```http
GET /api/audit-logs?userId=doc-001&action=CASE_CREATED&limit=100
```

Query params:
- `userId`: Filter by user
- `action`: Filter by action
- `limit`: Max results

#### Create log
```http
POST /api/audit-logs
Content-Type: application/json

{
  "userId": "doc-001",
  "userName": "Dr. Sarah Chen",
  "userRole": "Doctor",
  "action": "CASE_CREATED",
  "target": "cases/case-001",
  "details": "Created case CASE-2025-001"
}
```

---

### Analytics

#### Dashboard stats
```http
GET /api/analytics/dashboard
```

Response:
```json
{
  "totalCases": 250,
  "totalPatients": 180,
  "totalUsers": 25,
  "totalReports": 200,
  "casesByStatus": {
    "CREATED": 15,
    "SCHEDULED": 30,
    "SCANNED": 20,
    "REPORTED": 35,
    "FINALIZED": 150
  },
  "casesBySeverity": {
    "Mild": 80,
    "Moderate": 100,
    "Severe": 50,
    "Critical": 20
  },
  "reportsByStatus": {
    "draft": 15,
    "final": 35,
    "signed": 150
  }
}
```

---

## Cloud Functions

### Firestore Triggers

#### Auto-finalize case when report is signed

```typescript
export const onReportSigned = functions.firestore
  .document('reports/{reportId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    
    // If report just got signed off
    if (before.status !== 'Verified / Signed Off' && after.status === 'Verified / Signed Off') {
      await db.collection('cases').doc(after.caseId).update({
        status: 'FINALIZED',
        finalizedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  });
```

#### Auto-create audit log on case creation

```typescript
export const onCaseCreated = functions.firestore
  .document('cases/{caseId}')
  .onCreate(async (snapshot, context) => {
    const data = snapshot.data();
    
    await db.collection('audit_logs').add({
      userId: data.doctorId,
      userName: data.doctorName,
      userRole: 'Doctor',
      action: 'CASE_CREATED',
      target: `cases/${context.params.caseId}`,
      details: `Created case ${data.caseNumber}`,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
```

### Scheduled Functions

#### Clean up expired sessions daily

```typescript
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
  });
```

---

## Database Seeding

Seed Firestore with demo data:

```bash
# Build first
npm run build

# Set service account credentials
export GOOGLE_APPLICATION_CREDENTIALS="path/to/serviceAccountKey.json"

# Run seed
npm run seed

# Clear existing data first
npm run seed:clear
```

Seed script location: `src/seed.ts`

---

## Configuration

### Environment Variables

Set via Firebase Functions config:

```bash
# API key for webhook authentication
firebase functions:config:set api.key="your-secure-api-key"

# View config
firebase functions:config:get

# Access in code
const apiKey = functions.config().api?.key;
```

Or via `.env` for local emulator:

```bash
# functions/.env
API_KEY=your-local-api-key
```

---

## Security

### API Key Authentication

Webhook endpoints require API key:

```typescript
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const validKey = functions.config().api?.key;
  
  if (apiKey !== validKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};
```

### CORS Configuration

```typescript
app.use(cors({ origin: true }));  // Production: restrict to specific domains
```

### Input Validation

All POST/PATCH endpoints use Zod validation:

```typescript
const patientSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  phone: z.string(),
  // ...
});

const data = patientSchema.parse(req.body);  // Throws on invalid input
```

---

## Error Handling

All endpoints return structured errors:

```json
{
  "error": "Validation failed",
  "details": [
    {
      "path": ["email"],
      "message": "Invalid email"
    }
  ]
}
```

Status codes:
- `200`: Success
- `201`: Created
- `400`: Bad request (validation error)
- `401`: Unauthorized (invalid API key)
- `404`: Not found
- `500`: Server error

---

## Logging

### Function Logs

```bash
# View live logs
firebase functions:log

# Filter by function
firebase functions:log --only api

# Or in Firebase Console > Functions > Logs
```

### Custom Logging

```typescript
console.log('Info message');
console.warn('Warning message');
console.error('Error message');
```

---

## Testing

### Local Emulator

```bash
# From project root
firebase emulators:start

# Test endpoints
curl http://localhost:5001/healthgrid-iq-demo/us-central1/api/health
```

### Unit Tests (TODO)

```bash
# Install test dependencies
npm install --save-dev @types/jest jest ts-jest

# Run tests
npm test
```

---

## Deployment

### Production Deploy

```bash
# From project root
firebase deploy --only functions

# Deploy takes 5-10 minutes
```

### CI/CD Pipeline (GitHub Actions)

```yaml
name: Deploy Functions
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - run: cd functions && npm ci && npm run build
      - run: firebase deploy --only functions --token ${{ secrets.FIREBASE_TOKEN }}
```

---

## Monitoring

### Performance Metrics

Firebase Console > Functions > Dashboard:
- Invocation count
- Execution time
- Memory usage
- Error rate

### Alerts

Set up alerts for:
- Error rate > 5%
- Execution time > 10s
- Memory usage > 512MB

---

## Troubleshooting

### Function Timeout

Default: 60 seconds. Increase:

```typescript
export const api = functions
  .runWith({ timeoutSeconds: 300 })  // 5 minutes
  .https.onRequest(app);
```

### Memory Limit

Default: 256MB. Increase:

```typescript
export const api = functions
  .runWith({ memory: '512MB' })
  .https.onRequest(app);
```

### CORS Errors

Update `firebase.json` hosting headers:

```json
{
  "headers": [
    {
      "source": "/api/**",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" }
      ]
    }
  ]
}
```

---

## Dependencies

### Production

- `firebase-admin` — Firestore, Auth, Storage
- `firebase-functions` — Cloud Functions runtime
- `express` — HTTP routing
- `cors` — CORS middleware
- `helmet` — Security headers
- `zod` — Input validation

### Development

- `typescript` — Type safety
- `@types/*` — Type definitions

---

## Resources

- [Firebase Functions Docs](https://firebase.google.com/docs/functions)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Zod Documentation](https://zod.dev/)
- [Production Deployment Guide](../PRODUCTION_DEPLOYMENT.md)
- [IAS Integration Guide](../IAS_INTEGRATION.md)

---

**Version**: 1.0.0  
**Last Updated**: July 22, 2026  
**Maintainer**: HealthGrid Technical Team
