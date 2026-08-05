import http from 'http';

const PORT = 8042;

const server = http.createServer((req, res) => {
  // CORS Headers for React Frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url;

  if (url === '/system') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      Name: 'HealthGrid_PACS_Mock_Server',
      Version: '1.0.0-standalone',
      DicomAet: 'HEALTHGRID_PACS',
      StorageDirectory: 'memory'
    }));
  } else if (url === '/patients' || url === '/studies') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify([
      "patient-study-001"
    ]));
  } else if (url.includes('/dicom-web')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'SUCCESS',
      endpoint: 'WADO-RS Ready'
    }));
  } else {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'HealthGrid Mock PACS Listening', path: url }));
  }
});

server.listen(PORT, () => {
  console.log('---------------------------------------------------------');
  console.log('  HEALTHGRID PACS SERVER (NO-DOCKER STANDALONE MODE)');
  console.log('---------------------------------------------------------');
  console.log(`  Listening on : http://localhost:${PORT}`);
  console.log(`  Health Check : http://localhost:${PORT}/system`);
  console.log(`  DICOMweb API : http://localhost:${PORT}/dicom-web/studies`);
  console.log('---------------------------------------------------------');
  console.log('  PACS is ready for HealthGrid IQ Simulation!');
});
