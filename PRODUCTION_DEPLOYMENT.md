# HealthGrid IQ — Production Deployment Guide

Complete guide for deploying HealthGrid IQ to Firebase Hosting with Cloud Functions backend, Firestore database, and Google Maps integration.

---

## Prerequisites

### 1. Install Required Tools

```bash
# Node.js 20+ (required for Firebase Functions)
node -v  # Should be v20 or higher

# Firebase CLI
npm install -g firebase-tools

# Verify installation
firebase --version
```

### 2. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add Project**
3. Project name: `healthgrid-iq-production`
4. Enable Google Analytics (optional)
5. Create project

### 3. Enable Firebase Services

**In Firebase Console > Project Settings:**

#### a. Firestore Database
- Navigate to **Firestore Database**
- Click **Create Database**
- Start in **Production Mode**
- Choose location: `asia-southeast1` (Singapore) or closest to Malaysia
- Rules will be deployed from `firestore.rules`

#### b. Authentication
- Navigate to **Authentication > Sign-in method**
- Enable **Email/Password** provider
- Save

#### c. Storage
- Navigate to **Storage**
- Click **Get Started**
- Use default rules (will be overridden)
- Choose same location as Firestore

#### d. Firebase Hosting
- Navigate to **Hosting**
- Click **Get Started**
- Follow setup instructions

---

## Configuration

### 1. Environment Variables

Create `.env` file in project root:

```bash
cp .env.example .env
```

Edit `.env` with your Firebase project credentials:

```bash
# Get from Firebase Console > Project Settings > General > Your apps > Web app

VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=healthgrid-iq-production.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=healthgrid-iq-production
VITE_FIREBASE_STORAGE_BUCKET=healthgrid-iq-production.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456

# Google Maps API Key (see Google Maps Setup below)
VITE_GOOGLE_MAPS_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# IAS Integration (if applicable)
VITE_IAS_API_ENDPOINT=https://api.ias-system.example.com
VITE_IAS_API_KEY=your-ias-api-key

# API Base URL (production)
VITE_API_BASE_URL=https://healthgrid-iq-production.web.app/api
```

### 2. Google Maps API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable APIs:
   - Maps JavaScript API
   - Geocoding API
   - Directions API
   - Distance Matrix API
   - Places API
4. Create API Key:
   - Navigate to **APIs & Services > Credentials**
   - Click **Create Credentials > API Key**
   - Restrict key:
     - **Application restrictions**: HTTP referrers
     - Add your domain: `healthgrid-iq-production.web.app`
     - Add localhost for development: `localhost:3000`
   - **API restrictions**: Select the 5 APIs listed above
5. Copy API key to `.env` as `VITE_GOOGLE_MAPS_API_KEY`

### 3. Firebase Functions Configuration

Set API key for webhook authentication:

```bash
firebase functions:config:set api.key="your-secure-random-api-key-here"
```

Generate secure key:
```bash
openssl rand -base64 32
```

---

## Database Setup

### 1. Initialize Firebase in Project

```bash
# Login to Firebase
firebase login

# Initialize project (if not already done)
firebase init

# Select:
# - Firestore
# - Functions
# - Hosting
# - Storage

# Or use existing firebase.json
```

### 2. Deploy Firestore Rules and Indexes

```bash
# Deploy rules
firebase deploy --only firestore:rules

# Deploy indexes (takes 5-10 minutes to build)
firebase deploy --only firestore:indexes
```

### 3. Seed Database with Demo Data

```bash
# Install dependencies
cd functions
npm install

# Build functions
npm run build

# Set service account credentials
export GOOGLE_APPLICATION_CREDENTIALS="path/to/serviceAccountKey.json"

# Run seed script
npm run seed

# To clear existing data first:
npm run seed:clear
```

**Getting Service Account Key:**
1. Firebase Console > Project Settings > Service Accounts
2. Click **Generate New Private Key**
3. Save as `serviceAccountKey.json` (keep secure, never commit)

### 4. Create Admin User

After seeding, create Firebase Auth users:

```bash
# Using Firebase Console UI:
# Authentication > Users > Add User
# Email: admin@healthgrid.my
# Password: (set secure password)

# Link to existing Firestore user:
# The user's UID should match a document ID in /users collection
# Or update /users/{uid} with the new Firebase Auth UID
```

---

## Build and Deploy

### 1. Install Dependencies

```bash
# Root project
npm install

# Functions
cd functions
npm install
cd ..
```

### 2. Build Application

```bash
# Build frontend
npm run build

# Build functions
cd functions
npm run build
cd ..
```

### 3. Test Locally with Emulators

```bash
# Start all emulators
firebase emulators:start

# Frontend: http://localhost:5000
# Functions: http://localhost:5001
# Firestore: http://localhost:8080
# Auth: http://localhost:9099
# Emulator UI: http://localhost:4000
```

Test the application thoroughly before production deployment.

### 4. Deploy to Production

```bash
# Deploy everything
firebase deploy

# Or deploy specific services:
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only firestore
firebase deploy --only storage
```

**Deployment takes 5-10 minutes for functions.**

---

## Post-Deployment

### 1. Verify Deployment

Visit your production URL:
```
https://healthgrid-iq-production.web.app
```

Check:
- [ ] Login works with email/password
- [ ] Data loads from Firestore
- [ ] API calls to Cloud Functions succeed
- [ ] Google Maps displays correctly
- [ ] Image uploads work
- [ ] Real-time updates trigger

### 2. Monitor Logs

```bash
# Function logs
firebase functions:log

# Or in Firebase Console > Functions > Logs
```

### 3. Set Up Monitoring

**Firebase Console > Performance Monitoring:**
- Enable Performance Monitoring SDK
- Track page load times
- Monitor API latency

**Firebase Console > Crashlytics:**
- Enable error tracking
- Monitor production errors

### 4. Configure Custom Domain (Optional)

1. Firebase Console > Hosting > Add Custom Domain
2. Enter domain: `healthgrid.my`
3. Verify ownership (add TXT record to DNS)
4. Add A/CNAME records as instructed
5. SSL certificate auto-provisioned (takes 24-48 hours)

---

## API Documentation

### Public API Endpoints

Base URL: `https://healthgrid-iq-production.web.app/api`

All endpoints require authentication header:
```
Authorization: Bearer <firebase-id-token>
```

For external IAS integration, use API key:
```
X-API-Key: your-api-key
```

#### Health Check
```
GET /health
```

#### Cases
```
GET  /api/cases?status=CREATED&limit=50
POST /api/cases
PATCH /api/cases/:caseId
GET  /api/cases/:caseId
```

#### Patients
```
GET  /api/patients?clinicId=clinic-001
POST /api/patients
```

#### Schedules (IAS Integration)
```
GET  /api/schedules?userId=rad-001&date=2025-07-22
POST /api/schedules
PATCH /api/schedules/:scheduleId
```

#### IAS Webhook (External System)
```
POST /api/ias/webhook
Headers:
  X-API-Key: <api-key>
  Content-Type: application/json
Body:
{
  "event": "SCHEDULE_ASSIGNED",
  "caseId": "case-123",
  "radiographerId": "rad-001",
  "radiographerName": "Ahmad Razak",
  "scheduledAt": "2025-07-22T10:00:00Z",
  "clinicId": "clinic-001",
  "vanId": "van-001"
}
```

#### Analytics
```
GET /api/analytics/dashboard
```

Full API schema available in `functions/src/index.ts`

---

## IAS Integration Guide

HealthGrid IQ can integrate with external Intelligent Appointment Scheduling (IAS) systems.

### Integration Methods

#### 1. Webhook (Push from IAS)

IAS system calls our webhook when scheduling is complete:

```bash
POST https://healthgrid-iq-production.web.app/api/ias/webhook
X-API-Key: <api-key>
Content-Type: application/json

{
  "event": "SCHEDULE_ASSIGNED",
  "caseId": "case-001",
  "radiographerId": "rad-001",
  "radiographerName": "Ahmad Razak",
  "scheduledAt": "2025-07-22T10:00:00Z",
  "clinicId": "clinic-001"
}
```

#### 2. API Polling (Pull from IAS)

IAS polls our API for unscheduled cases:

```bash
# Get all unscheduled cases
GET https://healthgrid-iq-production.web.app/api/cases?status=CREATED

# Get radiographer schedules
GET https://healthgrid-iq-production.web.app/api/schedules

# Update case with schedule
PATCH https://healthgrid-iq-production.web.app/api/cases/:caseId
{
  "status": "SCHEDULED",
  "radiographerId": "rad-001",
  "radiographerName": "Ahmad Razak",
  "scheduledAt": "2025-07-22T10:00:00Z"
}
```

### Data Models for IAS

**Case** (for scheduling):
- `id`, `caseNumber`, `patientId`, `patientName`
- `scanType`, `severity`, `bodyRegion`
- `clinicId`, `clinicName`
- `patientLat`, `patientLon` (if available)
- `status`: `CREATED` → `SCHEDULED` → `SCANNED`

**RadioScheduleProfile**:
- `userId`, `userName`
- `deployedClinicId`, `deployedClinicName`
- `supportedModalities`: `['X-Ray', 'CT', 'MRI']`
- `currentCaseload`, `maxDailyCaseload`
- `leaveStatus`: `Active` | `On Leave`
- `schedule`: Array of time slots with booking status

**MobilePacsVan**:
- `id`, `name`, `plateNumber`
- `currentClinicId`, `latitude`, `longitude`
- `status`: `deployed` | `maintenance` | `idle`
- `assignedRadiographerId`

---

## Security

### 1. Firestore Rules

Production rules are defined in `firestore.rules`:
- Role-based access control
- Read: All authenticated users
- Write: Role-restricted (Doctor, Admin, etc.)
- Audit logs: Write-once, immutable

### 2. API Security

- All endpoints require Firebase Auth token
- Webhook endpoint requires API key
- Rate limiting enabled (60 req/min per IP)
- CORS configured for trusted domains only

### 3. Environment Variables

Never commit:
- `.env` file
- `serviceAccountKey.json`
- API keys

Use `.gitignore` to prevent accidental commits.

### 4. Storage Rules

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Scan images
    match /scans/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null 
                   && request.auth.token.role in ['Radiographer', 'Administrator'];
    }
    
    // Profile pictures
    match /profiles/{userId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Deploy:
```bash
firebase deploy --only storage
```

---

## Maintenance

### Backup Firestore Data

```bash
# Export entire database
gcloud firestore export gs://healthgrid-iq-production-backups/$(date +%Y%m%d)

# Scheduled daily backups (Cloud Scheduler + Cloud Functions)
# See: https://firebase.google.com/docs/firestore/manage-data/export-import
```

### Update Dependencies

```bash
# Check for updates
npm outdated
cd functions && npm outdated

# Update
npm update
cd functions && npm update

# Test after updates
npm run build
cd functions && npm run build
```

### Monitor Costs

Firebase Console > Usage and Billing:
- Firestore: Read/write operations
- Functions: Invocations and compute time
- Hosting: Bandwidth
- Storage: Storage size + downloads

**Cost optimization:**
- Use Firestore indexes efficiently
- Cache static assets (CDN)
- Compress images before upload
- Use Cloud Scheduler for cleanup jobs

---

## Troubleshooting

### Functions Not Deploying
```bash
# Check Node version
node -v  # Must be v20

# Clear build cache
rm -rf functions/lib
cd functions && npm run build

# Deploy with verbose logging
firebase deploy --only functions --debug
```

### CORS Errors
- Check `firebase.json` CORS headers
- Verify domain in Firebase Console > Hosting
- Update `cors()` config in `functions/src/index.ts`

### Firestore Permission Denied
- Check `firestore.rules`
- Verify user role in `/users` collection
- Test rules in Firebase Console > Firestore > Rules Playground

### Maps Not Loading
- Verify `VITE_GOOGLE_MAPS_API_KEY` in `.env`
- Check API restrictions in Google Cloud Console
- Ensure billing is enabled for Google Cloud project

---

## Support

For issues, contact:
- **Technical Lead**: raj.kumar@healthgrid.my
- **Firebase Console**: https://console.firebase.google.com/project/healthgrid-iq-production
- **Documentation**: `/DOCUMENTATION.md`

---

**Last Updated**: July 22, 2026  
**Version**: 1.0.0  
**Environment**: Production
