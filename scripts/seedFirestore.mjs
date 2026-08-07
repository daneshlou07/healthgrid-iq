import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDocs, collection, deleteDoc, writeBatch } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDGEcJE9mo2kzamE98F-Fcf2ty4a1Rf9OI',
  authDomain: 'healthgrid-iq-production.firebaseapp.com',
  projectId: 'healthgrid-iq-production',
  storageBucket: 'healthgrid-iq-production.firebasestorage.app',
  messagingSenderId: '16499837818',
  appId: '1:16499837818:web:32725e254755a19513a4c3',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Helper to wipe collection
async function wipeCollection(colName) {
  const snapshot = await getDocs(collection(db, colName));
  const promises = snapshot.docs.map((d) => deleteDoc(d.ref));
  await Promise.all(promises);
}

// Data payloads
const users = [
  { id: 'rad-001', name: 'Ahmad Razak', email: 'ahmad.razak@healthgrid.my', role: 'Radiographer', status: 'active', createdAt: '2025-02-01T08:00:00Z', shift: 'Day', leaveStatus: 'Active', supportedModalities: ['X-Ray', 'CT', 'MRI', 'Ultrasound'], mobilePacsAssignment: 'van-001', deploymentLocationId: 'clinic-001' },
  { id: 'rad-002', name: 'Lim Mei Ling', email: 'meiling.lim@healthgrid.my', role: 'Radiographer', status: 'active', createdAt: '2025-03-10T08:00:00Z', shift: 'Day', leaveStatus: 'Active', supportedModalities: ['X-Ray', 'CT', 'MRI', 'Ultrasound'], deploymentLocationId: 'clinic-002' },
  { id: 'rad-003', name: 'Kumaran Pillai', email: 'kumaran.pillai@healthgrid.my', role: 'Radiographer', status: 'active', createdAt: '2025-04-05T08:00:00Z', shift: 'Day', leaveStatus: 'Active', supportedModalities: ['X-Ray', 'CT', 'MRI', 'Ultrasound'], deploymentLocationId: 'clinic-003' },
  { id: 'rad-006', name: 'Zainal Abidin', email: 'zainal.abidin@healthgrid.my', role: 'Radiographer', status: 'active', createdAt: '2025-07-01T08:00:00Z', shift: 'Day', leaveStatus: 'Active', supportedModalities: ['X-Ray', 'CT', 'MRI', 'Ultrasound'], deploymentLocationId: 'clinic-004' },
  { id: 'rad-008', name: 'Syed Farid Hassan', email: 'syed.farid@healthgrid.my', role: 'Radiographer', status: 'active', createdAt: '2025-08-01T08:00:00Z', shift: 'Day', leaveStatus: 'Active', supportedModalities: ['X-Ray', 'CT', 'MRI', 'Ultrasound'], deploymentLocationId: 'clinic-005' },
  { id: 'rologist-001', name: 'Dr. Priya Nair', email: 'priya.nair@healthgrid.my', role: 'Radiologist', specialty: 'Diagnostic Radiology', status: 'active', createdAt: '2025-01-20T08:00:00Z', shift: 'Day', leaveStatus: 'Active' },
  { id: 'dept-001', name: 'Nurul Aisyah', email: 'nurul.aisyah@healthgrid.my', role: 'Radiology Department', status: 'active', createdAt: '2025-01-10T08:00:00Z', shift: 'Day', leaveStatus: 'Active' },
  { id: 'admin-001', name: 'Tan Wei Ming', email: 'weiming.tan@healthgrid.my', role: 'Administrator', status: 'active', createdAt: '2024-12-01T08:00:00Z', shift: 'Day', leaveStatus: 'Active' },
  { id: 'admin-002', name: 'Super Admin', email: 'daneshlou05@gmail.com', role: 'Administrator', status: 'active', createdAt: '2025-01-01T08:00:00Z', shift: 'Day', leaveStatus: 'Active' },
];

const clinics = [
  { id: 'clinic-001', name: 'Klinik Kesihatan Putrajaya', code: 'KK-PJA-01', address: 'Presint 9, 62250 Putrajaya', city: 'Putrajaya', state: 'Wilayah Persekutuan Putrajaya', district: 'Putrajaya', latitude: 2.9264, longitude: 101.6964, operatingHours: '08:00 - 17:00', phone: '+60 3-8888 1234', isMobileStation: true, status: 'active', equipmentList: ['Digital X-Ray Unit 1', 'Mobile Ultrasound'], dailyCapacity: 40 },
  { id: 'clinic-002', name: 'Klinik Kesihatan Cyberjaya', code: 'KK-CYB-02', address: 'Persiaran Semarak Oksigen, 63000 Cyberjaya', city: 'Cyberjaya', state: 'Selangor', district: 'Sepang', latitude: 2.9213, longitude: 101.6559, operatingHours: '08:00 - 17:00', phone: '+60 3-8318 5678', isMobileStation: true, status: 'active', equipmentList: ['Digital X-Ray Unit 1', 'Portable CT'], dailyCapacity: 35 },
  { id: 'clinic-003', name: 'Klinik Kesihatan Bangi', code: 'KK-BGI-03', address: 'Jalan 4/1, 43650 Bandar Baru Bangi', city: 'Bangi', state: 'Selangor', district: 'Hulu Langat', latitude: 2.9469, longitude: 101.7636, operatingHours: '08:00 - 17:00', phone: '+60 3-8925 9012', isMobileStation: false, status: 'active', equipmentList: ['Static X-Ray Unit'], dailyCapacity: 50 },
  { id: 'clinic-004', name: 'Hospital Tanjong Karang', code: 'HTK-004', address: 'Jalan Hospital, 45500 Tanjong Karang', city: 'Tanjong Karang', state: 'Selangor', district: 'Kuala Selangor', latitude: 3.4242, longitude: 101.1824, operatingHours: '24 Hours', phone: '+60 3-3269 5333', isMobileStation: true, status: 'active', equipmentList: ['Static CT Scanner', 'Static X-Ray', 'Mobile Ultrasound'], dailyCapacity: 60 },
  { id: 'clinic-005', name: 'Klinik Kesihatan Ijok', code: 'KK-IJK-05', address: 'Pekan Ijok, 45600 Bestari Jaya', city: 'Ijok', state: 'Selangor', district: 'Kuala Selangor', latitude: 3.3636, longitude: 101.3843, operatingHours: '08:00 - 17:00', phone: '+60 3-3279 1122', isMobileStation: true, status: 'active', equipmentList: ['Mobile Ultrasound'], dailyCapacity: 25 },
];

const patients = [
  { id: 'pat-001', nric: '850315-10-5231', name: 'Siti Aminah binti Hassan', dob: '1985-03-15', gender: 'Female', phone: '+60 12-345 6789', email: 'siti.aminah@gmail.com', address: 'No 12, Jalan Presint 9/3, Presint 9, 62250 Putrajaya', preferredClinicId: 'clinic-001', medicalHistory: ['Hypertension', 'No known drug allergies'], createdAt: '2025-05-01T10:00:00Z', status: 'Active', mrn: 'MRN-2025-85031501' },
  { id: 'pat-002', nric: '920722-14-6109', name: 'Tan Kah Heng', dob: '1992-07-22', gender: 'Male', phone: '+60 16-234 5678', email: 'kahheng.tan@yahoo.com', address: 'B-12-3, Eclipse Residence, Persiaran Multimedia, 63000 Cyberjaya', preferredClinicId: 'clinic-002', medicalHistory: ['Asthma'], createdAt: '2025-05-10T14:30:00Z', status: 'Active', mrn: 'MRN-2025-92072202' },
  { id: 'pat-003', nric: '781104-08-3347', name: 'Muthusamy a/l Ramasamy', dob: '1978-11-04', gender: 'Male', phone: '+60 19-876 5432', email: 'muthu.ramasamy@outlook.com', address: 'No 45, Jalan 4/12, Seksyen 4, 43650 Bandar Baru Bangi', preferredClinicId: 'clinic-003', medicalHistory: ['Type 2 Diabetes', 'Penicillin allergy'], createdAt: '2025-06-02T09:15:00Z', status: 'Active', mrn: 'MRN-2025-78110403' },
  { id: 'pat-004', nric: '951230-10-5582', name: 'Nurul Huda binti Mohd Zain', dob: '1995-12-30', gender: 'Female', phone: '+60 13-456 7890', email: 'huda.zain@gmail.com', address: 'No 8, Jalan Bestari 2/1, 45600 Bestari Jaya', preferredClinicId: 'clinic-005', medicalHistory: ['None'], createdAt: '2025-06-15T11:45:00Z', status: 'Active', mrn: 'MRN-2025-95123004' },
  { id: 'pat-005', nric: '680418-10-5123', name: 'Wong Ah Kow', dob: '1968-04-18', gender: 'Male', phone: '+60 17-654 3210', email: 'ahkow.wong@hotmail.com', address: 'No 88, Jalan Hospital, 45500 Tanjong Karang', preferredClinicId: 'clinic-004', medicalHistory: ['Hypertension', 'Hyperlipidemia'], createdAt: '2025-07-01T08:30:00Z', status: 'Active', mrn: 'MRN-2025-68041805' },
];

const cases = [
  { id: 'case-001', caseNumber: 'CAS-2026-0001', patientId: 'pat-001', patientName: 'Siti Aminah binti Hassan', scanType: 'Chest X-Ray', modality: 'X-Ray', clinicId: 'clinic-001', clinicName: 'Klinik Kesihatan Putrajaya', status: 'COMPLETED', priority: 'Medium', severity: 'Moderate', indication: 'Persistent Cough & Mild Fever', bodyRegion: 'Chest', radiographerId: 'rad-001', radiographerName: 'Ahmad Razak', radiologistId: 'rologist-001', radiologistName: 'Dr. Priya Nair', registeredById: 'dept-001', createdAt: '2026-07-01T09:00:00Z', scheduledAt: '2026-07-02T10:00:00Z', uploadedAt: '2026-07-02T11:30:00Z', reviewedAt: '2026-07-02T14:00:00Z', notes: 'Patient reports cough for 2 weeks.', dicomStudyId: 'STUDY-2026-001' },
  { id: 'case-002', caseNumber: 'CAS-2026-0002', patientId: 'pat-002', patientName: 'Tan Kah Heng', scanType: 'Brain MRI', modality: 'MRI', clinicId: 'clinic-002', clinicName: 'Klinik Kesihatan Cyberjaya', status: 'IN_PROGRESS', priority: 'High', severity: 'Severe', indication: 'Chronic Headaches with Visual Disturbances', bodyRegion: 'Brain / Head', radiographerId: 'rad-002', radiographerName: 'Lim Mei Ling', registeredById: 'dept-001', createdAt: '2026-07-05T11:00:00Z', scheduledAt: '2026-07-06T09:30:00Z', notes: 'Rule out intracranial space-occupying lesion.' },
  { id: 'case-003', caseNumber: 'CAS-2026-0003', patientId: 'pat-003', patientName: 'Muthusamy a/l Ramasamy', scanType: 'Abdominal CT', modality: 'CT', clinicId: 'clinic-003', clinicName: 'Klinik Kesihatan Bangi', status: 'SCHEDULED', priority: 'Urgent', severity: 'Critical', indication: 'Acute Right Lower Quadrant Abdominal Pain', bodyRegion: 'Abdomen', radiographerId: 'rad-003', radiographerName: 'Kumaran Pillai', registeredById: 'dept-001', createdAt: '2026-07-10T14:00:00Z', scheduledAt: '2026-07-29T10:00:00Z', notes: 'Suspected acute appendicitis.' },
  { id: 'case-004', caseNumber: 'CAS-2026-0004', patientId: 'pat-004', patientName: 'Nurul Huda binti Mohd Zain', scanType: 'Knee Ultrasound', modality: 'Ultrasound', clinicId: 'clinic-005', clinicName: 'Klinik Kesihatan Ijok', status: 'CREATED', priority: 'Low', severity: 'Mild', indication: 'Right Knee Joint Swelling Post Trauma', bodyRegion: 'Knee Joint', registeredById: 'dept-001', createdAt: '2026-07-14T08:30:00Z', notes: 'Sports injury during netball match.' },
  { id: 'case-005', caseNumber: 'CAS-2026-0005', patientId: 'pat-005', patientName: 'Wong Ah Kow', scanType: 'Lumbar Spine X-Ray', modality: 'X-Ray', clinicId: 'clinic-004', clinicName: 'Hospital Tanjong Karang', status: 'CREATED', priority: 'Medium', severity: 'Moderate', indication: 'Lower Back Pain Radiating to Left Leg', bodyRegion: 'Lumbar Spine', registeredById: 'dept-001', createdAt: '2026-07-14T10:00:00Z', notes: 'History of heavy lifting.' },
];

const reports = [
  { id: 'rep-001', caseId: 'case-001', caseNumber: 'CAS-2026-0001', patientId: 'pat-001', patientName: 'Siti Aminah binti Hassan', scanType: 'Chest X-Ray', radiologistId: 'rologist-001', radiologistName: 'Dr. Priya Nair', findings: 'Clear lung fields bilaterally. Cardiac silhouette is within normal limits. No pleural effusion or pneumothorax identified. Osseous structures intact.', impression: 'Normal chest radiograph. No active cardiopulmonary disease.', aiAssisted: true, aiConfidenceScore: 0.96, aiFindingsSummary: 'No focal consolidation, effusion, or pneumothorax detected.', status: 'FINALIZED', createdAt: '2026-07-02T14:00:00Z', finalizedAt: '2026-07-02T14:15:00Z' },
];

const patientRequests = [
  { id: 'req-001', requestNumber: 'REQ-2026-0001', patientId: 'pat-001', patientName: 'Siti Aminah binti Hassan', patientIc: '850315-10-5231', requestType: 'DICOM_COPY', description: 'Request for DICOM CD copy of Chest X-Ray (CAS-2026-0001) for second opinion.', status: 'Approved', requestedBy: 'Patient', dateSubmitted: '2026-07-03T09:00:00Z', dateFulfilled: '2026-07-03T11:30:00Z', fulfilledBy: 'Nurul Aisyah' },
  { id: 'req-002', requestNumber: 'REQ-2026-0002', patientId: 'pat-003', patientName: 'Muthusamy a/l Ramasamy', patientIc: '781104-08-3347', requestType: 'REPORT_COPY', description: 'Copy of medical diagnostic report for insurance claim.', status: 'Pending', requestedBy: 'Patient', dateSubmitted: '2026-07-12T15:00:00Z' },
];

async function seed() {
  console.log('🧹 Clearing old test entries from Firestore...');
  const collectionsToClear = ['cases', 'patients', 'reports', 'patient_requests', 'comments', 'audit_logs', 'trash'];
  for (const cName of collectionsToClear) {
    await wipeCollection(cName);
  }

  console.log('🚀 Seeding Google Cloud Firestore database with clean, structured demo records...');

  const batch = writeBatch(db);

  users.forEach((item) => batch.set(doc(db, 'users', item.id), item));
  clinics.forEach((item) => batch.set(doc(db, 'clinics', item.id), item));
  patients.forEach((item) => batch.set(doc(db, 'patients', item.id), item));
  cases.forEach((item) => batch.set(doc(db, 'cases', item.id), item));
  reports.forEach((item) => batch.set(doc(db, 'reports', item.id), item));
  patientRequests.forEach((item) => batch.set(doc(db, 'patient_requests', item.id), item));

  await batch.commit();
  console.log('✅ Google Cloud Firestore successfully reset and seeded with clean Malaysian healthcare records!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seeding error:', err);
  process.exit(1);
});
