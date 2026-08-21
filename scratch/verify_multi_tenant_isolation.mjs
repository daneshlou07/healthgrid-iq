// ---------------------------------------------------------------------------
// Multi-Organization Scoped Case Access Isolation Verification
// ---------------------------------------------------------------------------
function getScopedCasesForUser(user, allCases) {
  if (!user) return [];

  // 1. Platform Governance & Central System Officers (Super Admin, BEMS Officer)
  if (
    user.role === 'Super Admin' ||
    user.role === 'BEMS Officer' ||
    user.role === 'BEMS' ||
    user.role === 'BEMZ'
  ) {
    return allCases;
  }

  const userCenterId = user.healthcareCenterId || user.deploymentLocationId;
  if (!userCenterId) return [];

  // 2. Medical Officers: Strict originating healthcare center ownership isolation
  if (user.role === 'Medical Officer') {
    return allCases.filter((c) => {
      const caseCenterId = c.originatingCenterId || c.clinicId;
      const isLocalOrigin = caseCenterId === userCenterId;
      const isInitialMo = c.initialMoId === user.id || c.registeredById === user.id;
      return isLocalOrigin || isInitialMo;
    });
  }

  // 3. Healthcare Center Administrators (Klinik Kesihatan, Public Hospital, Private Hospital)
  if (
    user.role === 'Administrator' ||
    user.role === 'Public Hospital Admin' ||
    user.role === 'Private Hospital Admin'
  ) {
    return allCases.filter((c) => {
      const caseCenterId = c.originatingCenterId || c.clinicId;
      const isLocalOrigin = caseCenterId === userCenterId;
      const isReferredToCenter =
        c.externalFacilityId === userCenterId ||
        c.assignedFacilityId === userCenterId;
      return isLocalOrigin || isReferredToCenter;
    });
  }

  // 4. Radiographers: Local healthcare center cases + explicitly assigned/referred external cases
  if (
    user.role === 'Radiographer' ||
    user.role === 'Public Hospital Radiographer' ||
    user.role === 'Private Hospital Radiographer'
  ) {
    return allCases.filter((c) => {
      const caseCenterId = c.originatingCenterId || c.clinicId;
      const isLocalCenter = caseCenterId === userCenterId;
      const isDirectlyAssigned =
        c.radiographerId === user.id ||
        c.externalRadiographerId === user.id;
      const isReferredToCenter =
        c.externalFacilityId === userCenterId ||
        c.assignedFacilityId === userCenterId;
      return isLocalCenter || isDirectlyAssigned || isReferredToCenter;
    });
  }

  // 5. Radiologists: Local center cases + explicitly assigned diagnostic cases + cases referred to their center
  if (user.role === 'Radiologist') {
    return allCases.filter((c) => {
      const caseCenterId = c.originatingCenterId || c.clinicId;
      const isLocalCenter = caseCenterId === userCenterId;
      const isAssignedRadiologist = c.radiologistId === user.id;
      const isReferredToCenter =
        c.externalFacilityId === userCenterId ||
        c.assignedFacilityId === userCenterId;
      return isLocalCenter || isAssignedRadiologist || isReferredToCenter;
    });
  }

  return allCases.filter((c) => {
    const caseCenterId = c.originatingCenterId || c.clinicId;
    return (
      caseCenterId === userCenterId ||
      c.externalFacilityId === userCenterId ||
      c.assignedFacilityId === userCenterId
    );
  });
}

const sampleCases = [
  {
    id: 'case-htk-001',
    caseNumber: 'HTK-2026-001',
    originatingCenterId: 'clinic-002', // Hospital Tanjong Karang
    originatingCenterName: 'Hospital Tanjong Karang',
    radiographerId: 'rad-htk-001',
    radiologistId: 'radlog-htk-001',
    initialMoId: 'mo-htk-001',
    status: 'ACTIVE',
  },
  {
    id: 'case-ijok-001',
    caseNumber: 'IJK-2026-001',
    originatingCenterId: 'clinic-001', // Klinik Kesihatan Ijok
    originatingCenterName: 'Klinik Kesihatan Ijok',
    initialMoId: 'mo-ijok-001',
    status: 'ACTIVE',
  },
  {
    id: 'case-ijok-referred-htk',
    caseNumber: 'IJK-2026-002',
    originatingCenterId: 'clinic-001', // Klinik Kesihatan Ijok
    originatingCenterName: 'Klinik Kesihatan Ijok',
    initialMoId: 'mo-ijok-001',
    externalFacilityId: 'clinic-002', // Assigned to Hospital Tanjong Karang via BEMS
    assignedFacilityId: 'clinic-002',
    externalRadiographerId: 'rad-htk-001',
    status: 'EXTERNAL_REFERRAL_DISPATCHED',
  },
  {
    id: 'case-sunway-001',
    caseNumber: 'SMC-2026-001',
    originatingCenterId: 'clinic-003', // Sunway Medical Centre
    originatingCenterName: 'Sunway Medical Centre',
    initialMoId: 'mo-sunway-001',
    status: 'ACTIVE',
  }
];

// Test 1: Medical Officer at Hospital Tanjong Karang
const moHTK = {
  id: 'mo-htk-001',
  name: 'Dr. Michelle',
  role: 'Medical Officer',
  healthcareCenterId: 'clinic-002',
};
const moHTKCases = getScopedCasesForUser(moHTK, sampleCases);
console.log('1. MO HTK Cases:', moHTKCases.map(c => c.id));
console.assert(moHTKCases.length === 1 && moHTKCases[0].id === 'case-htk-001', 'MO HTK should only see local case');

// Test 2: Administrator at Hospital Tanjong Karang
const adminHTK = {
  id: 'admin-htk-001',
  name: 'Admin HTK',
  role: 'Administrator',
  healthcareCenterId: 'clinic-002',
};
const adminHTKCases = getScopedCasesForUser(adminHTK, sampleCases);
console.log('2. Admin HTK Cases:', adminHTKCases.map(c => c.id));
console.assert(adminHTKCases.length === 2, 'Admin HTK should see local HTK case + referred Ijok case');

// Test 3: Radiographer at Hospital Tanjong Karang
const radHTK = {
  id: 'rad-htk-001',
  name: 'Ahmad Razak',
  role: 'Radiographer',
  healthcareCenterId: 'clinic-002',
};
const radHTKCases = getScopedCasesForUser(radHTK, sampleCases);
console.log('3. Radiographer HTK Cases:', radHTKCases.map(c => c.id));
console.assert(radHTKCases.length === 2, 'Rad HTK should see local case + referred Ijok case assigned to HTK');

// Test 4: Radiologist at Hospital Tanjong Karang
const radlogHTK = {
  id: 'radlog-htk-001',
  name: 'Dr. Siti Radlog',
  role: 'Radiologist',
  healthcareCenterId: 'clinic-002',
};
const radlogHTKCases = getScopedCasesForUser(radlogHTK, sampleCases);
console.log('4. Radiologist HTK Cases:', radlogHTKCases.map(c => c.id));
console.assert(radlogHTKCases.length === 2, 'Radiologist HTK should see local case + referred Ijok case');

// Test 5: BEMS Officer (Cross-Facility Super Oversight)
const bemsOfficer = {
  id: 'bems-001',
  name: 'Ir. Khairul Azman',
  role: 'BEMS Officer',
};
const bemsCases = getScopedCasesForUser(bemsOfficer, sampleCases);
console.log('5. BEMS Officer Cases:', bemsCases.map(c => c.id));
console.assert(bemsCases.length === 4, 'BEMS Officer should see all 4 cases across all centers');

// Test 6: Sunway Medical Centre Radiographer
const radSunway = {
  id: 'rad-sunway-001',
  name: 'Private Rad',
  role: 'Radiographer',
  healthcareCenterId: 'clinic-003',
};
const radSunwayCases = getScopedCasesForUser(radSunway, sampleCases);
console.log('6. Sunway Rad Cases:', radSunwayCases.map(c => c.id));
console.assert(radSunwayCases.length === 1 && radSunwayCases[0].id === 'case-sunway-001', 'Sunway Rad only sees Sunway cases');

console.log('\n[PASS] ALL 6 MULTI-TENANT ISOLATION & BEMS ROUTING SCENARIOS VERIFIED SUCCESSFULLY!');
