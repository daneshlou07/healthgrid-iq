#!/usr/bin/env node
/**
 * Firestore Seed Script
 * 
 * Seeds the database with demo data from mockData.ts
 * Run: npm run seed
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Firebase Admin
const serviceAccount = process.env.GOOGLE_APPLICATION_CREDENTIALS
  ? JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'))
  : undefined;

admin.initializeApp({
  credential: serviceAccount ? admin.credential.cert(serviceAccount) : admin.credential.applicationDefault(),
});

const db = admin.firestore();

// Import mock data (adjust path based on your build setup)
const mockDataPath = path.join(__dirname, '../../src/services/mockData.ts');

// Mock data definitions (copied from mockData.ts for seeding)
const mockUsers = [
  {
    id: 'rad-001',
    name: 'Ahmad Razak',
    email: 'ahmad.razak@healthgrid.my',
    role: 'Radiographer',
    status: 'active',
    createdAt: '2025-02-01T08:00:00Z',
    shift: 'Day',
    leaveStatus: 'Active',
    supportedModalities: ['X-Ray', 'CT', 'MRI'],
    mobilePacsAssignment: 'van-001',
    deploymentLocationId: 'clinic-001',
  },
  {
    id: 'rad-002',
    name: 'Lim Mei Ling',
    email: 'meiling.lim@healthgrid.my',
    role: 'Radiographer',
    status: 'active',
    createdAt: '2025-03-10T08:00:00Z',
    shift: 'Day',
    leaveStatus: 'Active',
    supportedModalities: ['X-Ray', 'MRI', 'Ultrasound'],
    deploymentLocationId: 'clinic-002',
  },
  {
    id: 'rologist-001',
    name: 'Dr. Priya Nair',
    email: 'priya.nair@healthgrid.my',
    role: 'Radiologist',
    specialty: 'Diagnostic Radiology',
    status: 'active',
    createdAt: '2025-01-20T08:00:00Z',
    shift: 'Day',
    leaveStatus: 'Active',
  },
  {
    id: 'admin-001',
    name: 'Raj Kumar',
    email: 'raj.kumar@healthgrid.my',
    role: 'Administrator',
    status: 'active',
    createdAt: '2025-01-01T08:00:00Z',
    shift: 'Day',
    leaveStatus: 'Active',
  },
];

const mockClinics = [
  {
    id: 'clinic-001',
    name: 'Klinik Kesihatan Tanjong Karang',
    address: 'Jalan Pasar, 45500 Tanjong Karang, Selangor',
    latitude: 3.4242,
    longitude: 101.1824,
    phone: '+60355052200',
    email: 'kktanjongkarang@moh.gov.my',
    status: 'active',
    googlePlaceId: 'ChIJX8Y9Z1234567890',
  },
  {
    id: 'clinic-002',
    name: 'Klinik Kesihatan Jeram',
    address: 'Jalan Sekolah, 45800 Jeram, Selangor',
    latitude: 3.2072,
    longitude: 101.4633,
    phone: '+60335671100',
    email: 'kkjeram@moh.gov.my',
    status: 'active',
    googlePlaceId: 'ChIJY9Z1234567890ABC',
  },
  {
    id: 'clinic-003',
    name: 'Klinik Kesihatan Batang Berjuntai',
    address: 'Jalan Raja Muda, 45600 Batang Berjuntai, Selangor',
    latitude: 3.3636,
    longitude: 101.3843,
    phone: '+60332891500',
    email: 'kkbatangberjuntai@moh.gov.my',
    status: 'active',
    googlePlaceId: 'ChIJZ1234567890ABCDEF',
  },
];

const mockPatients = [
  {
    id: 'patient-001',
    name: 'Ahmad bin Abdullah',
    dob: '1975-03-15',
    gender: 'Male' as const,
    phone: '+60123456789',
    email: 'ahmad.abdullah@email.com',
    address: 'No. 12, Jalan Mawar, Taman Sentosa, 45500 Tanjong Karang, Selangor',
    latitude: 3.4250,
    longitude: 101.1830,
    nric: '750315-10-5678',
    mrn: 'MRN-001-2025',
    medicalHistory: ['Hypertension', 'Type 2 Diabetes'],
    emergencyContact: '+60123456790 (Siti binti Ahmad)',
    preferredClinicId: 'clinic-001',
    preferredClinicName: 'Klinik Kesihatan Tanjong Karang',
    clinicId: 'clinic-001',
    clinicName: 'Klinik Kesihatan Tanjong Karang',
    googlePlaceId: 'ChIJPatient001',
  },
  {
    id: 'patient-002',
    name: 'Siti Nurhaliza binti Ismail',
    dob: '1988-07-22',
    gender: 'Female' as const,
    phone: '+60129876543',
    email: 'siti.nurhaliza@email.com',
    address: 'No. 45, Lorong Kenanga 3, Taman Melati, 45800 Jeram, Selangor',
    latitude: 3.2080,
    longitude: 101.4640,
    nric: '880722-10-1234',
    mrn: 'MRN-002-2025',
    medicalHistory: ['Asthma'],
    emergencyContact: '+60129876544 (Ismail bin Hassan)',
    preferredClinicId: 'clinic-002',
    preferredClinicName: 'Klinik Kesihatan Jeram',
    clinicId: 'clinic-002',
    clinicName: 'Klinik Kesihatan Jeram',
    googlePlaceId: 'ChIJPatient002',
  },
];

const mockCases = [
  {
    id: 'case-001',
    caseNumber: 'CASE-2025-001',
    patientId: 'patient-001',
    patientName: 'Ahmad bin Abdullah',
    registeredById: 'dept-001',
    registeredByName: 'Nurul Aisyah',
    radiographerId: 'rad-001',
    radiographerName: 'Ahmad Razak',
    radiologistId: 'rologist-001',
    radiologistName: 'Dr. Priya Nair',
    clinicId: 'clinic-001',
    clinicName: 'Klinik Kesihatan Tanjong Karang',
    scanType: 'Chest X-Ray',
    indication: 'Suspected rib fracture after an accident',
    bodyRegion: 'Chest',
    severity: 'Moderate' as const,
    notes: 'Post-accident follow-up, rib fracture suspected',
    status: 'FINALIZED' as const,
    createdAt: '2025-07-15T09:30:00Z',
    scheduledAt: '2025-07-16T10:00:00Z',
    scannedAt: '2025-07-16T10:15:00Z',
    reportedAt: '2025-07-16T14:30:00Z',
    finalizedAt: '2025-07-16T15:00:00Z',
    images: ['/demo-images/chest-xray-rib-fracture.png'],
  },
  {
    id: 'case-002',
    caseNumber: 'CASE-2025-002',
    patientId: 'patient-002',
    patientName: 'Siti Nurhaliza binti Ismail',
    registeredById: 'dept-001',
    registeredByName: 'Nurul Aisyah',
    clinicId: 'clinic-002',
    clinicName: 'Klinik Kesihatan Jeram',
    scanType: 'CT Scan Brain',
    indication: 'Stroke follow-up symptoms',
    bodyRegion: 'Brain',
    severity: 'Severe' as const,
    notes: 'Follow-up CT for previous stroke, check for new lesions',
    status: 'CREATED' as const,
    createdAt: '2025-07-20T11:00:00Z',
  },
];

const mockReports = [
  {
    id: 'report-001',
    caseId: 'case-001',
    caseNumber: 'CASE-2025-001',
    patientName: 'Ahmad bin Abdullah',
    radiologistId: 'rologist-001',
    radiologistName: 'Dr. Priya Nair',
    findings: `Chest X-ray demonstrates:\n\n1. Right-sided rib fractures involving ribs 6-7 at the mid-axillary line\n2. No associated pneumothorax or hemothorax\n3. Lungs are clear bilaterally with no focal consolidation\n4. Cardiac silhouette is within normal limits\n5. No pleural effusion detected`,
    impression: `Right 6th and 7th rib fractures without complications. No pneumothorax or hemothorax.`,
    suggestions: `Pain management and follow-up in 4-6 weeks. Avoid strenuous activity. Return if breathing difficulties develop.`,
    status: 'Verified / Signed Off' as const,
    createdAt: '2025-07-16T14:30:00Z',
    signedAt: '2025-07-16T15:00:00Z',
    imageKeys: ['demo-chest-xray-001'],
  },
];

const mockMobilePacsVans = [
  {
    id: 'van-001',
    name: 'Mobile PACS Unit 1',
    plateNumber: 'WBB 1234 A',
    equipment: ['X-Ray Machine', 'CT Scanner', 'PACS Workstation'],
    currentClinicId: 'clinic-001',
    currentClinicName: 'Klinik Kesihatan Tanjong Karang',
    latitude: 3.4242,
    longitude: 101.1824,
    status: 'deployed' as const,
    assignedRadiographerId: 'rad-001',
    assignedRadiographerName: 'Ahmad Razak',
  },
  {
    id: 'van-002',
    name: 'Mobile PACS Unit 2',
    plateNumber: 'WBB 5678 B',
    equipment: ['X-Ray Machine', 'Ultrasound', 'PACS Workstation'],
    currentClinicId: 'clinic-002',
    currentClinicName: 'Klinik Kesihatan Jeram',
    latitude: 3.2072,
    longitude: 101.4633,
    status: 'deployed' as const,
    assignedRadiographerId: 'rad-002',
    assignedRadiographerName: 'Lim Mei Ling',
  },
];

const mockRadioSchedules = [
  {
    id: 'sched-001',
    userId: 'rad-001',
    userName: 'Ahmad Razak',
    deployedClinicId: 'clinic-001',
    deployedClinicName: 'Klinik Kesihatan Tanjong Karang',
    supportedModalities: ['X-Ray', 'CT', 'MRI'],
    currentCaseload: 5,
    maxDailyCaseload: 12,
    leaveStatus: 'Active' as const,
    shift: 'Day',
    schedule: [
      {
        date: '2025-07-22',
        startTime: '08:00',
        endTime: '10:00',
        booked: true,
        caseId: 'case-001',
      },
      {
        date: '2025-07-22',
        startTime: '10:00',
        endTime: '12:00',
        booked: false,
      },
      {
        date: '2025-07-22',
        startTime: '14:00',
        endTime: '16:00',
        booked: false,
      },
    ],
  },
];

async function seedCollection(collectionName: string, data: any[]) {
  console.log(`Seeding ${collectionName}...`);
  const batch = db.batch();
  
  for (const item of data) {
    const { id, ...itemData } = item;
    const docRef = db.collection(collectionName).doc(id);
    batch.set(docRef, itemData);
  }
  
  await batch.commit();
  console.log(`✓ Seeded ${data.length} documents to ${collectionName}`);
}

async function clearCollection(collectionName: string) {
  console.log(`Clearing ${collectionName}...`);
  const snapshot = await db.collection(collectionName).get();
  const batch = db.batch();
  
  snapshot.docs.forEach(doc => batch.delete(doc.ref));
  
  await batch.commit();
  console.log(`✓ Cleared ${snapshot.size} documents from ${collectionName}`);
}

async function main() {
  try {
    console.log('🌱 Starting Firestore seeding...\n');
    
    // Clear existing data (optional - comment out if you want to preserve)
    if (process.argv.includes('--clear')) {
      await clearCollection('users');
      await clearCollection('clinics');
      await clearCollection('patients');
      await clearCollection('cases');
      await clearCollection('reports');
      await clearCollection('mobile_pacs_vans');
      await clearCollection('radio_schedules');
      console.log();
    }
    
    // Seed new data
    await seedCollection('users', mockUsers);
    await seedCollection('clinics', mockClinics);
    await seedCollection('patients', mockPatients);
    await seedCollection('cases', mockCases);
    await seedCollection('reports', mockReports);
    await seedCollection('mobile_pacs_vans', mockMobilePacsVans);
    await seedCollection('radio_schedules', mockRadioSchedules);
    
    console.log('\n✅ Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

main();
