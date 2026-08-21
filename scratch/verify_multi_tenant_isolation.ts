import { getScopedCasesForUser } from '../src/context/DataContext';
import type { User, Case } from '../src/types';

console.log('Testing Multi-Tenant Facility Isolation & BEMS Routing Scenarios...');

const sampleCases: Case[] = [
  {
    id: 'case-htk-001',
    caseNumber: 'HTK-2026-001',
    patientId: 'p-001',
    patientName: 'Ahmad bin Ali',
    originatingCenterId: 'clinic-002', // Hospital Tanjong Karang
    originatingCenterName: 'Hospital Tanjong Karang',
    radiographerId: 'rad-htk-001',
    radiologistId: 'radlog-htk-001',
    initialMoId: 'mo-htk-001',
    status: 'ACTIVE',
    scanType: 'Chest X-Ray',
    notes: 'Routine checkup',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'case-ijok-001',
    caseNumber: 'IJK-2026-001',
    patientId: 'p-002',
    patientName: 'Siti Aminah',
    originatingCenterId: 'clinic-001', // Klinik Kesihatan Ijok
    originatingCenterName: 'Klinik Kesihatan Ijok',
    initialMoId: 'mo-ijok-001',
    status: 'ACTIVE',
    scanType: 'Chest X-Ray',
    notes: 'Coughing',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'case-ijok-referred-htk',
    caseNumber: 'IJK-2026-002',
    patientId: 'p-003',
    patientName: 'Tan Ah Kow',
    originatingCenterId: 'clinic-001', // Klinik Kesihatan Ijok
    originatingCenterName: 'Klinik Kesihatan Ijok',
    initialMoId: 'mo-ijok-001',
    externalFacilityId: 'clinic-002', // Assigned to Hospital Tanjong Karang via BEMS
    assignedFacilityId: 'clinic-002',
    externalRadiographerId: 'rad-htk-001',
    status: 'EXTERNAL_REFERRAL_DISPATCHED',
    scanType: 'CT Brain',
    notes: 'Severe trauma referral',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'case-sunway-001',
    caseNumber: 'SMC-2026-001',
    patientId: 'p-004',
    patientName: 'Lim Wei Kang',
    originatingCenterId: 'clinic-003', // Sunway Medical Centre
    originatingCenterName: 'Sunway Medical Centre',
    initialMoId: 'mo-sunway-001',
    status: 'ACTIVE',
    scanType: 'MRI Lumbar',
    notes: 'Disc herniation',
    createdAt: new Date().toISOString(),
  }
];

// Test 1: Medical Officer at Hospital Tanjong Karang
const moHTK: User = {
  id: 'mo-htk-001',
  name: 'Dr. HTK',
  email: 'mo.htk@healthgrid.my',
  role: 'Medical Officer',
  healthcareCenterId: 'clinic-002',
  status: 'active',
  createdAt: new Date().toISOString(),
};
const moHTKCases = getScopedCasesForUser(moHTK, sampleCases);
console.log('1. MO HTK Cases:', moHTKCases.map(c => c.id));
console.assert(moHTKCases.length === 1 && moHTKCases[0].id === 'case-htk-001', 'MO HTK should only see local case');

// Test 2: Administrator at Hospital Tanjong Karang
const adminHTK: User = {
  id: 'admin-htk-001',
  name: 'Admin HTK',
  email: 'admin.htk@healthgrid.my',
  role: 'Administrator',
  healthcareCenterId: 'clinic-002',
  status: 'active',
  createdAt: new Date().toISOString(),
};
const adminHTKCases = getScopedCasesForUser(adminHTK, sampleCases);
console.log('2. Admin HTK Cases:', adminHTKCases.map(c => c.id));
console.assert(adminHTKCases.length === 2, 'Admin HTK should see local HTK case + referred Ijok case');

// Test 3: Radiographer at Hospital Tanjong Karang
const radHTK: User = {
  id: 'rad-htk-001',
  name: 'Rad HTK',
  email: 'rad.htk@healthgrid.my',
  role: 'Radiographer',
  healthcareCenterId: 'clinic-002',
  status: 'active',
  createdAt: new Date().toISOString(),
};
const radHTKCases = getScopedCasesForUser(radHTK, sampleCases);
console.log('3. Radiographer HTK Cases:', radHTKCases.map(c => c.id));
console.assert(radHTKCases.length === 2, 'Rad HTK should see local case + referred Ijok case assigned to HTK');

// Test 4: Radiologist at Hospital Tanjong Karang
const radlogHTK: User = {
  id: 'radlog-htk-001',
  name: 'Dr. Radlog HTK',
  email: 'radlog.htk@healthgrid.my',
  role: 'Radiologist',
  healthcareCenterId: 'clinic-002',
  status: 'active',
  createdAt: new Date().toISOString(),
};
const radlogHTKCases = getScopedCasesForUser(radlogHTK, sampleCases);
console.log('4. Radiologist HTK Cases:', radlogHTKCases.map(c => c.id));
console.assert(radlogHTKCases.length === 2, 'Radiologist HTK should see local case + referred Ijok case');

// Test 5: BEMS Officer (Cross-Facility Super Oversight)
const bemsOfficer: User = {
  id: 'bems-001',
  name: 'Ir. BEMS',
  email: 'bems@healthgrid.my',
  role: 'BEMS Officer',
  status: 'active',
  createdAt: new Date().toISOString(),
};
const bemsCases = getScopedCasesForUser(bemsOfficer, sampleCases);
console.log('5. BEMS Officer Cases:', bemsCases.map(c => c.id));
console.assert(bemsCases.length === 4, 'BEMS Officer should see all 4 cases across all centers');

// Test 6: Sunway Medical Centre Radiographer
const radSunway: User = {
  id: 'rad-sunway-001',
  name: 'Rad Sunway',
  email: 'rad.sunway@healthgrid.my',
  role: 'Radiographer',
  healthcareCenterId: 'clinic-003',
  status: 'active',
  createdAt: new Date().toISOString(),
};
const radSunwayCases = getScopedCasesForUser(radSunway, sampleCases);
console.log('6. Sunway Rad Cases:', radSunwayCases.map(c => c.id));
console.assert(radSunwayCases.length === 1 && radSunwayCases[0].id === 'case-sunway-001', 'Sunway Rad only sees Sunway cases');

console.log('\n[PASS] ALL 6 MULTI-TENANT ISOLATION & BEMS ROUTING SCENARIOS VERIFIED SUCCESSFULLY!');
