import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { seedDemoXray } from './services/demoImageSeed';
import { SpeedInsights } from '@vercel/speed-insights/react';

// Seed demo X-ray image into IndexedDB on first load (non-blocking)
seedDemoXray();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <SpeedInsights />
  </React.StrictMode>
);
