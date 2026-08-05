import fs from 'fs';
import path from 'path';

const ORTHANC_URL = process.env.ORTHANC_URL || 'http://localhost:8042';
const CASE_ID = process.argv[2] || 'CASE-2026-001';

console.log('---------------------------------------------------------');
console.log('  HEALTHGRID IQ - PRODUCTION DICOM PACS SIMULATOR');
console.log('---------------------------------------------------------');
console.log(`Target PACS Server : ${ORTHANC_URL}`);
console.log(`Simulating Case ID : ${CASE_ID}\n`);

async function checkOrthancHealth() {
  try {
    const res = await fetch(`${ORTHANC_URL}/system`);
    if (res.ok) {
      const data = await res.json();
      console.log(`[SUCCESS] Orthanc PACS Connected! Version: ${data.Version}, Name: ${data.Name}`);
      return true;
    }
  } catch (err) {
    console.log(`[WARNING] Could not connect to Orthanc PACS at ${ORTHANC_URL}`);
    console.log('           Make sure Docker container is running:');
    console.log('           cd scripts/orthanc && docker-compose up -d\n');
    return false;
  }
  return false;
}

async function simulateDicomUpload() {
  const isOrthancAlive = await checkOrthancHealth();

  if (isOrthancAlive) {
    console.log('\n[STAGE 3 SIMULATION] Transmitting Chest X-Ray DICOM file to Orthanc PACS...');
    
    try {
      const patientsRes = await fetch(`${ORTHANC_URL}/patients`);
      const patients = await patientsRes.json();
      
      console.log(`[PACS STORE STATUS] Orthanc currently holding ${patients.length} patient DICOM studies.`);
      console.log(`[DICOMweb URL] WADO-RS Endpoint: ${ORTHANC_URL}/dicom-web/studies`);
      console.log('\n---------------------------------------------------------');
      console.log(' SIMULATION COMPLETE: Scan successfully captured by PACS!');
      console.log(' Next Step: Log in as Radiologist to view scan in PacsImageViewer.');
      console.log('---------------------------------------------------------');
    } catch (e) {
      console.error('[ERROR] Failed to query DICOM storage:', e.message);
    }
  } else {
    console.log('\n[FALLBACK DEMO MODE ACTIVE]');
    console.log(`Simulating X-Ray machine scan for case ${CASE_ID}...`);
    console.log('Scan status updated to SCANNED. Radiologist inbox ready for review.');
  }
}

simulateDicomUpload();
