// vite.config.js — Configuration du bundler Vite pour le frontend RESTODICI
// Gère le serveur de dev, les proxies API/WebSocket et le découpage du bundle en production.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Mapping module → nom du chunk vendor (Rolldown attend une fonction)
const VENDOR_CHUNKS = {
  'react':            'vendor-react',
  'react-dom':        'vendor-react',
  'react-router-dom': 'vendor-react',
  'lucide-react':     'vendor-lucide',
  'chart.js':         'vendor-charts',
  'react-chartjs-2':  'vendor-charts',
  '@tanstack/react-query': 'vendor-query',
  'axios':            'vendor-query',
  'leaflet':          'vendor-leaflet',
  'react-leaflet':    'vendor-leaflet',
  'jspdf':            'vendor-pdf',
  'jspdf-autotable':  'vendor-pdf',
};

export default defineConfig({
  plugins: [react()],

  // En développement : redirige /api et /socket.io vers le backend NestJS
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },

  build: {
    // Taille max avant avertissement : on tolère 800kb par chunk après le splitting
    chunkSizeWarningLimit: 800,

    rollupOptions: {
      output: {
        // Rolldown / Vite 8 : manualChunks doit être une fonction (pas un objet)
        manualChunks(id) {
          for (const [pkg, chunk] of Object.entries(VENDOR_CHUNKS)) {
            if (id.includes(`/node_modules/${pkg}/`) || id.includes(`/node_modules/${pkg}@`)) {
              return chunk;
            }
          }
        },
      },
    },
  },
});
