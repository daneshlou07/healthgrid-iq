# IAS Integration Guide — Intelligent Appointment Scheduling

Complete technical specification for integrating HealthGrid IQ with external Intelligent Appointment Scheduling (IAS) systems.

---

## Overview

HealthGrid IQ supports **bidirectional integration** with IAS systems:

1. **Push Model (Webhook)**: IAS pushes scheduling decisions to HealthGrid
2. **Pull Model (API Polling)**: IAS fetches unscheduled cases and radiographer availability
3. **Hybrid Model**: Combination of both

---

## Architecture

```
┌─────────────────────┐          ┌──────────────────────┐
│   HealthGrid IQ     │          │   IAS System         │
│   (Firebase)        │          │   (External)         │
└─────────────────────┘          └──────────────────────┘
         │                                  │
         │  1. New Case Created             │
         │─────────────────────────────────>│
         │     POST /api/cases              │
         │                                  │
         │  2. IAS Optimizes Schedule       │
         │                                  │
         │  3. Schedule Assignment          │
         │<─────────────────────────────────│
         │     POST /api/ias/webhook        │
         │                                  │
         │  4. Update Case Status           │
         │     (Firestore trigger)          │
         │                                  │
```

---

## Authentication

All API calls require authentication:

### For HealthGrid → IAS Calls
```http
Authorization: Bearer <ias-api-key>
```

### For IAS → HealthGrid Calls
```http
X-API-Key: <healthgrid-api-key>
```

**Setup:**
```bash
# Set in Firebase Functions config
firebase functions:config:set api.key="your-secure-api-key"

# Or in .env for IAS system
HEALTHGRID_API_KEY=your-secure-api-key
HEALTHGRID_API_URL=https://healthgrid-iq-production.web.app/api
```

---

## Data Models

### Case (Scheduling Input)

```typescript
interface Case {
  id: string;
  caseNumber: string;              // e.g., "CASE-2025-001"
  
  // Patient info
  patientId: string;
  patientName: string;
  patientAddress?: string;
  patientLat?: number;             // For distance calculation
  patientLon?: number;
  
  // Clinical info
  scanType: string;                // "X-Ray", "CT Scan", "MRI"
  bodyRegion?: string;             // "Chest", "Brain", "Abdomen"
  severity?: "Mild" | "Moderate" | "Severe" | "Critical";
  disease?: string;
  notes: string;
  
  // Scheduling context
  clinicId?: string;               // Preferred clinic
  clinicName?: string;
  doctorId: string;
  doctorName: string;
  
  // Status tracking
  status: "CREATED" | "SCHEDULED" | "SCANNED" | "REPORTED" | "FINALIZED";
  createdAt: string;               // ISO 8601
  scheduledAt?: string;            // Set by IAS
  
  // Assignment (filled by IAS)
  radiographerId?: string;
  radiographerName?: string;
}
```

### RadioScheduleProfile (Availability Input)

```typescript
interface RadioScheduleProfile {
  userId: string;
  userName: string;
  
  // Deployment
  deployedClinicId: string;
  deployedClinicName: string;
  
  // Capabilities
  supportedModalities: string[];   // ["X-Ray", "CT", "MRI"]
  
  // Capacity
  currentCaseload: number;         // Current # of assigned cases
  maxDailyCaseload: number;        // Max cases per day
  
  // Availability
  leaveStatus: "Active" | "On Leave";
  shift: string;                   // "Morning", "Day", "Night"
  
  // Time slots
  schedule: RadioScheduleSlot[];
}

interface RadioScheduleSlot {
  date: string;                    // YYYY-MM-DD
  startTime: string;               // HH:mm (24-hour)
  endTime: string;
  booked: boolean;
  caseId?: string;                 // If booked, which case
}
```

### MobilePacsVan (Equipment Availability)

```typescript
interface MobilePacsVan {
  id: string;
  name: string;
  plateNumber: string;
  equipment: string[];             // ["X-Ray Machine", "CT Scanner"]
  
  // Current location
  currentClinicId?: string;
  currentClinicName?: string;
  latitude: number;
  longitude: number;
  
  // Status
  status: "deployed" | "maintenance" | "idle";
  
  // Assignment
  assignedRadiographerId?: string;
  assignedRadiographerName?: string;
}
```

### IasSchedulingJob (IAS Processing Record)

```typescript
interface IasSchedulingJob {
  id: string;
  
  // Input
  caseId: string;
  caseNumber: string;
  patientId: string;
  patientName: string;
  patientLat?: number;
  patientLon?: number;
  scanType: string;
  severity?: "Mild" | "Moderate" | "Severe" | "Critical";
  requestedAt: string;
  
  // Processing
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  processedAt?: string;
  
  // Output (assignment)
  assignedRadiographerId?: string;
  assignedRadiographerName?: string;
  assignedClinicId?: string;
  assignedClinicName?: string;
  assignedVanId?: string;
  scheduledAt?: string;            // ISO 8601
  
  // Optimization metrics
  distanceKm?: number;             // Travel distance
  estimatedDriveMinutes?: number;
  routePolyline?: [number, number][];
  optimizationScore?: number;      // 0-100, higher = better
  
  // Failure
  rejectionReason?: string;
}
```

---

## Integration Patterns

### Pattern 1: Webhook (Push Model)

**Use Case**: IAS proactively schedules cases and notifies HealthGrid.

#### Flow:
1. HealthGrid creates new case → `status: CREATED`
2. IAS polls `/api/cases?status=CREATED` periodically
3. IAS runs optimization algorithm
4. IAS calls webhook with assignment
5. HealthGrid updates case → `status: SCHEDULED`

#### Webhook Endpoint:

```http
POST /api/ias/webhook
X-API-Key: <healthgrid-api-key>
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

**Events:**
- `SCHEDULE_ASSIGNED`: Initial assignment
- `SCHEDULE_UPDATED`: Rescheduled
- `SCHEDULE_CANCELLED`: Assignment cancelled

**Response:**
```json
{
  "success": true,
  "message": "Webhook processed successfully"
}
```

**Error Responses:**
```json
// 401 Unauthorized
{
  "error": "Unauthorized: Invalid API key"
}

// 404 Not Found
{
  "error": "Case not found"
}

// 400 Bad Request
{
  "error": "Validation failed",
  "details": [
    {
      "field": "radiographerId",
      "message": "Required"
    }
  ]
}
```

---

### Pattern 2: API Polling (Pull Model)

**Use Case**: IAS fetches data on-demand and updates via REST API.

#### 1. Fetch Unscheduled Cases

```http
GET /api/cases?status=CREATED&limit=50
Authorization: Bearer <firebase-id-token>
```

**Response:**
```json
{
  "cases": [
    {
      "id": "case-001",
      "caseNumber": "CASE-2025-001",
      "patientId": "patient-001",
      "patientName": "Ahmad bin Abdullah",
      "scanType": "Chest X-Ray",
      "severity": "Moderate",
      "status": "CREATED",
      "createdAt": "2025-07-20T09:00:00Z",
      "clinicId": "clinic-001",
      "patientLat": 3.4250,
      "patientLon": 101.1830
    }
  ],
  "count": 1
}
```

#### 2. Fetch Radiographer Availability

```http
GET /api/schedules?date=2025-07-22&clinicId=clinic-001
Authorization: Bearer <firebase-id-token>
```

**Response:**
```json
{
  "schedules": [
    {
      "userId": "rad-001",
      "userName": "Ahmad Razak",
      "deployedClinicId": "clinic-001",
      "supportedModalities": ["X-Ray", "CT", "MRI"],
      "currentCaseload": 5,
      "maxDailyCaseload": 12,
      "leaveStatus": "Active",
      "schedule": [
        {
          "date": "2025-07-22",
          "startTime": "08:00",
          "endTime": "10:00",
          "booked": false
        },
        {
          "date": "2025-07-22",
          "startTime": "10:00",
          "endTime": "12:00",
          "booked": true,
          "caseId": "case-002"
        }
      ]
    }
  ],
  "count": 1
}
```

#### 3. Fetch Fleet Location

```http
GET /api/fleet
Authorization: Bearer <firebase-id-token>
```

**Response:**
```json
{
  "vans": [
    {
      "id": "van-001",
      "name": "Mobile PACS Unit 1",
      "equipment": ["X-Ray Machine", "CT Scanner"],
      "currentClinicId": "clinic-001",
      "latitude": 3.4242,
      "longitude": 101.1824,
      "status": "deployed",
      "assignedRadiographerId": "rad-001"
    }
  ],
  "count": 1
}
```

#### 4. Update Case with Assignment

```http
PATCH /api/cases/case-001
Authorization: Bearer <firebase-id-token>
Content-Type: application/json

{
  "status": "SCHEDULED",
  "radiographerId": "rad-001",
  "radiographerName": "Ahmad Razak",
  "scheduledAt": "2025-07-22T10:00:00Z"
}
```

**Response:**
```json
{
  "id": "case-001",
  "status": "SCHEDULED",
  "radiographerId": "rad-001",
  "scheduledAt": "2025-07-22T10:00:00Z",
  "updatedAt": "2025-07-20T10:30:00Z"
}
```

#### 5. Update Radiographer Schedule

```http
PATCH /api/schedules/sched-001
Authorization: Bearer <firebase-id-token>
Content-Type: application/json

{
  "currentCaseload": 6,
  "schedule": [
    {
      "date": "2025-07-22",
      "startTime": "08:00",
      "endTime": "10:00",
      "booked": true,
      "caseId": "case-001"
    }
  ]
}
```

---

## Google Maps Integration

HealthGrid IQ provides Google Maps APIs for route optimization:

### Distance Matrix (Multi-Origin/Destination)

```typescript
import { getDistanceMatrix } from './services/googleMapsService';

const origins = [
  { lat: 3.4242, lon: 101.1824 },  // Van location
];

const destinations = [
  { lat: 3.4250, lon: 101.1830 },  // Patient 1
  { lat: 3.2072, lon: 101.4633 },  // Patient 2
];

const matrix = await getDistanceMatrix(origins, destinations, {
  mode: 'driving',
  departureTime: new Date('2025-07-22T08:00:00'),
});

// Result:
// matrix.rows[0].elements[0] = { distanceKm: 1.2, durationMinutes: 5 }
// matrix.rows[0].elements[1] = { distanceKm: 24.5, durationMinutes: 38 }
```

### Directions (Single Route)

```typescript
import { getDirections } from './services/googleMapsService';

const route = await getDirections(
  3.4242, 101.1824,  // From (van)
  3.4250, 101.1830,  // To (patient)
  {
    mode: 'driving',
    departureTime: new Date('2025-07-22T08:00:00'),
  }
);

// Result:
// route.distanceKm = 1.2
// route.durationMinutes = 5
// route.durationInTraffic = 8  // With traffic
// route.polylineCoords = [[lat, lon], ...]
```

### Geocoding

```typescript
import { geocodeAddress } from './services/googleMapsService';

const coords = await geocodeAddress(
  'No. 12, Jalan Mawar, Taman Sentosa, 45500 Tanjong Karang, Selangor'
);

// Result:
// { lat: 3.4250, lon: 101.1830, placeId: 'ChIJ...' }
```

**Fallback**: If Google Maps API key is not configured, falls back to:
- OSRM (Open Source Routing Machine) for directions
- Nominatim (OpenStreetMap) for geocoding
- Haversine distance as last resort

---

## Optimization Constraints

### Hard Constraints (Must Satisfy)

1. **Modality Match**: Radiographer must support scan type
   ```typescript
   radiographer.supportedModalities.includes(case.scanType)
   ```

2. **Availability**: Time slot must be free
   ```typescript
   slot.booked === false
   ```

3. **Capacity**: Not exceed max caseload
   ```typescript
   radiographer.currentCaseload < radiographer.maxDailyCaseload
   ```

4. **Leave Status**: Radiographer must be active
   ```typescript
   radiographer.leaveStatus === 'Active'
   ```

5. **Equipment**: Van must have required equipment
   ```typescript
   van.equipment.includes(requiredEquipment)
   van.status === 'deployed'
   ```

### Soft Constraints (Optimize)

1. **Travel Distance**: Minimize distance from van to patient
   ```typescript
   score += (1 / distanceKm) * 30  // Closer = higher score
   ```

2. **Severity Priority**: Prioritize critical cases
   ```typescript
   severityWeights = { Critical: 100, Severe: 70, Moderate: 40, Mild: 20 }
   score += severityWeights[case.severity]
   ```

3. **Wait Time**: Prioritize older cases
   ```typescript
   ageInHours = (now - case.createdAt) / 3600000
   score += ageInHours * 2
   ```

4. **Workload Balance**: Distribute evenly
   ```typescript
   score += (maxCaseload - currentCaseload) * 5
   ```

5. **Preferred Clinic**: Patient preference
   ```typescript
   if (radiographer.deployedClinicId === patient.preferredClinicId) {
     score += 15
   }
   ```

### Example Optimization Algorithm

```typescript
function optimizeScheduling(
  cases: Case[],
  radiographers: RadioScheduleProfile[],
  vans: MobilePacsVan[]
): IasSchedulingJob[] {
  const jobs: IasSchedulingJob[] = [];
  
  // Sort cases by priority (severity + age)
  const sortedCases = cases.sort((a, b) => {
    const scoreA = getSeverityWeight(a.severity) + getAgeScore(a.createdAt);
    const scoreB = getSeverityWeight(b.severity) + getAgeScore(b.createdAt);
    return scoreB - scoreA;
  });
  
  for (const case of sortedCases) {
    let bestMatch = null;
    let bestScore = 0;
    
    for (const radiographer of radiographers) {
      // Hard constraints
      if (!canAssign(case, radiographer)) continue;
      
      // Calculate score
      const score = calculateScore(case, radiographer, vans);
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = radiographer;
      }
    }
    
    if (bestMatch) {
      jobs.push(createSchedulingJob(case, bestMatch, bestScore));
    } else {
      jobs.push(createFailedJob(case, 'No available radiographer'));
    }
  }
  
  return jobs;
}
```

---

## Error Handling

### Retry Strategy

```typescript
async function callHealthGridWebhook(data: any, retries = 3): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(HEALTHGRID_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'X-API-Key': HEALTHGRID_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (response.ok) {
        return; // Success
      }
      
      if (response.status === 401) {
        throw new Error('Invalid API key');
      }
      
      if (response.status === 404) {
        throw new Error('Case not found');
      }
      
      // Retry on 5xx errors
      if (response.status >= 500 && attempt < retries) {
        await sleep(1000 * attempt); // Exponential backoff
        continue;
      }
      
      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
      await sleep(1000 * attempt);
    }
  }
}
```

### Handling Failed Assignments

```typescript
// Store failed job for manual review
await createIasSchedulingJob({
  caseId: case.id,
  status: 'FAILED',
  rejectionReason: 'No radiographer available within 50km',
  requestedAt: new Date().toISOString(),
});

// Notify admin
await sendNotification({
  userId: 'admin-001',
  title: 'Scheduling Failed',
  message: `Unable to schedule ${case.caseNumber}: No radiographer available`,
  type: 'warning',
});
```

---

## Testing

### Mock IAS Webhook Call

```bash
curl -X POST https://healthgrid-iq-production.web.app/api/ias/webhook \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "SCHEDULE_ASSIGNED",
    "caseId": "case-001",
    "radiographerId": "rad-001",
    "radiographerName": "Ahmad Razak",
    "scheduledAt": "2025-07-22T10:00:00Z",
    "clinicId": "clinic-001"
  }'
```

### Mock Fetch Cases

```bash
curl -X GET "https://healthgrid-iq-production.web.app/api/cases?status=CREATED" \
  -H "Authorization: Bearer <firebase-id-token>"
```

### Firebase Emulator Testing

```bash
# Start emulators
firebase emulators:start

# Test against local endpoints
curl -X POST http://localhost:5001/healthgrid-iq-demo/us-central1/api/ias/webhook \
  -H "X-API-Key: test-key" \
  -H "Content-Type: application/json" \
  -d '{ "event": "SCHEDULE_ASSIGNED", ... }'
```

---

## Monitoring

### Metrics to Track

1. **Assignment Success Rate**: `COMPLETED / (COMPLETED + FAILED)`
2. **Average Processing Time**: Time from case creation to assignment
3. **Distance Efficiency**: Average travel distance per assignment
4. **Workload Balance**: Std deviation of radiographer caseloads
5. **API Latency**: Response time for webhook/API calls

### Firebase Performance Monitoring

```typescript
import { trace } from 'firebase/performance';

const t = trace(performance, 'ias_scheduling');
t.start();

// ... scheduling logic ...

t.putMetric('cases_processed', cases.length);
t.putMetric('avg_distance_km', avgDistance);
t.stop();
```

---

## Contact

For IAS integration support:

**Technical Contact**: raj.kumar@healthgrid.my  
**API Documentation**: https://healthgrid-iq-production.web.app/api-docs  
**Status Page**: https://status.healthgrid.my

---

**Version**: 1.0.0  
**Last Updated**: July 22, 2026
