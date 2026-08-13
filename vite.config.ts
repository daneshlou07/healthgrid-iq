import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      // Proxy API requests to Firebase Functions in development
      '/api': {
        target: 'http://localhost:5001/healthgrid-iq-demo/us-central1/api',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    outDir: 'dist',
    // Generate sourcemaps for error tracking but don't expose them in the browser
    sourcemap: 'hidden',
    // Suppress warnings for legitimately large vendor bundles (Firebase ~560 kB)
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          // Normalize path separators for cross-platform compatibility (Windows uses \)
          const normalizedId = id.replace(/\\/g, '/');

          // Split vendor chunks for better caching
          if (
            normalizedId.includes('node_modules/react/') ||
            normalizedId.includes('node_modules/react-dom/') ||
            normalizedId.includes('node_modules/react-router')
          ) {
            return 'react-vendor';
          }
          if (
            normalizedId.includes('node_modules/firebase/') ||
            normalizedId.includes('node_modules/@firebase/')
          ) {
            return 'firebase-vendor';
          }
          if (normalizedId.includes('node_modules/leaflet')) {
            return 'map-vendor';
          }
          if (normalizedId.includes('node_modules/jspdf')) {
            return 'pdf-vendor';
          }
          if (normalizedId.includes('node_modules/html2canvas')) {
            return 'canvas-vendor';
          }
          if (normalizedId.includes('node_modules/lucide-react')) {
            return 'icons-vendor';
          }
        },
      },
    },
  },
  optimizeDeps: {
    include: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
  },
});
