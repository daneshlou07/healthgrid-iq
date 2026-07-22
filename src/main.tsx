import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { seedDemoXray } from './services/demoImageSeed';

// Seed demo X-ray image into IndexedDB on first load (non-blocking)
seedDemoXray();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
