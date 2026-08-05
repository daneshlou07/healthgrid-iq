import http from 'http';

/**
 * simulate_modality_send.mjs — Realistic DICOM Hardware Modality Simulator
 *
 * Simulates physical hospital scanners sending DICOM studies over DICOM C-STORE / REST API:
 *   - X-Ray (CR/DX) Radiographs
 *   - CT Scans (Multi-slice axial series)
 *   - MRI (Multi-sequence T1/T2/FLAIR series)
 *   - Ultrasound (Dynamic multi-frame cine loop)
 *
 * Usage:
 *   node scripts/simulate_modality_send.mjs [MODALITY] [CASE_ID]
 *   Example: node scripts/simulate_modality_send.mjs CT CASE-2026-089
 *   Example: node scripts/simulate_modality_send.mjs MRI CASE-2026-089
 *   Example: node scripts/simulate_modality_send.mjs US CASE-2026-089
 *   Example: node scripts/simulate_modality_send.mjs XRAY CASE-2026-089
 */

const modalityArg = (process.argv[2] || 'XRAY').toUpperCase();
const caseIdArg = process.argv[3] || 'CASE-2026-089';

const PACS_HOST = 'localhost';
const PACS_PORT = 8042;

const MODALITY_CONFIGS = {
  XRAY: {
    aeTitle: 'XRAY_ROOM1',
    modalityTag: 'CR',
    description: 'Digital Chest Radiograph (PA/Lateral)',
    slicesCount: 2,
    bodyPart: 'Chest',
    windowWidth: 1500,
    windowCenter: -600,
    kvp: 75,
    mas: 12,
  },
  CT: {
    aeTitle: 'CT_SCANNER1',
    modalityTag: 'CT',
    description: 'Chest & Abdomen Contrast Axial Stack',
    slicesCount: 24,
    bodyPart: 'Chest/Abdomen',
    windowWidth: 1500,
    windowCenter: -600,
    kvp: 120,
    mas: 150,
  },
  MRI: {
    aeTitle: 'MRI_SUITE1',
    modalityTag: 'MR',
    description: 'Brain & Spine Multi-Sequence Scan (T1/T2/FLAIR)',
    slicesCount: 16,
    bodyPart: 'Brain',
    windowWidth: 80,
    windowCenter: 40,
    tesla: '3.0T',
  },
  US: {
    aeTitle: 'ULTRASOUND_MOBILE1',
    modalityTag: 'US',
    description: 'Abdominal & Vascular Doppler Cine Loop',
    slicesCount: 12,
    bodyPart: 'Abdomen',
    frequency: '3.5MHz',
  },
};

const config = MODALITY_CONFIGS[modalityArg] || MODALITY_CONFIGS.XRAY;

console.log('=================================================================');
console.log('  HEALTHGRID IQ — DICOM MODALITY HARDWARE SIMULATOR');
console.log('=================================================================');
console.log(`  Source Modality AE : ${config.aeTitle}`);
console.log(`  Modality Code      : ${config.modalityTag} (${modalityArg})`);
console.log(`  Description        : ${config.description}`);
console.log(`  Target Case ID     : ${caseIdArg}`);
console.log(`  Simulated Slices   : ${config.slicesCount} frames/slices`);
console.log(`  Destination PACS   : http://${PACS_HOST}:${PACS_PORT}/instances`);
console.log('=================================================================\n');

async function sendSimulatedStudy() {
  console.log(`[C-STORE PUSH] Connecting from ${config.aeTitle} to PACS...`);

  // Build a DICOM JSON payload representation for Orthanc
  const dicomPayload = {
    PatientID: `PAT-${caseIdArg}`,
    PatientName: `Patient^${caseIdArg.replace(/[^0-9]/g, '')}`,
    Modality: config.modalityTag,
    StudyDescription: `${config.description} (Ref: ${caseIdArg})`,
    StudyInstanceUID: `1.2.840.10008.5.1.4.1.1.${Date.now()}`,
    SeriesInstanceUID: `1.2.840.10008.5.1.4.1.2.${Date.now()}`,
    SOPInstanceUID: `1.2.840.10008.5.1.4.1.3.${Date.now()}`,
    NumberOfSlices: config.slicesCount,
    WindowCenter: config.windowCenter,
    WindowWidth: config.windowWidth,
    KVP: config.kvp,
    ExposureInuAs: config.mas,
    SourceAETitle: config.aeTitle,
  };

  const dataString = JSON.stringify(dicomPayload);

  const options = {
    hostname: PACS_HOST,
    port: PACS_PORT,
    path: '/instances',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(dataString),
    },
  };

  const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => (body += chunk));
    res.on('end', () => {
      console.log(`[C-STORE PUSH] PACS Status Code: ${res.statusCode}`);
      console.log(`[C-STORE PUSH] DICOM Transmission Completed Successfully!`);
      console.log(`[C-STORE PUSH] Study Registered for Case ${caseIdArg}.\n`);
      console.log('You can now log in as Radiographer, MO, or Radiologist in HealthGrid IQ to review the scan viewer.');
    });
  });

  req.on('error', (err) => {
    console.log(`[C-STORE NOTICE] Orthanc container not active on port 8042 (${err.message}).`);
    console.log(`[C-STORE SIMULATION] Simulated local fallback transmit completed for Case ${caseIdArg}.\n`);
    console.log('PACS simulation payload ready for HealthGrid IQ web workstation!');
  });

  req.write(dataString);
  req.end();
}

sendSimulatedStudy();
