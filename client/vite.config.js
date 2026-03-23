import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        /**
         * Manual chunk splitting for vendor libraries
         * Separates commonly used dependencies into their own chunks
         * for improved caching and load performance
         * 
         * Chunks:
         * - react-vendor: React and ReactDOM
         * - maps-vendor: Google Maps API and utilities
         * - router-vendor: React Router and related packages
         * - http-vendor: Axios HTTP client
         */
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor';
          }
          if (id.includes('node_modules/@react-google-maps')) {
            return 'maps-vendor';
          }
          if (id.includes('node_modules/react-router-dom') || id.includes('node_modules/@remix-run/router')) {
            return 'router-vendor';
          }
          if (id.includes('node_modules/axios')) {
            return 'http-vendor';
          }
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
      ],
    },
  },
})
