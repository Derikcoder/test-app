import { defineConfig } from 'vite'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const sslEnabled = env.VITE_SSL_ENABLED === 'true'
  const certPath = env.VITE_SSL_CERT_FILE ? path.resolve(process.cwd(), env.VITE_SSL_CERT_FILE) : ''
  const keyPath = env.VITE_SSL_KEY_FILE ? path.resolve(process.cwd(), env.VITE_SSL_KEY_FILE) : ''
  const hasCerts = Boolean(certPath && keyPath && fs.existsSync(certPath) && fs.existsSync(keyPath))
  const backendTarget = env.VITE_API_PROXY_TARGET || (sslEnabled ? 'https://localhost:5000' : 'http://localhost:5000')

  const httpsOptions = sslEnabled && hasCerts
    ? {
        cert: fs.readFileSync(certPath),
        key: fs.readFileSync(keyPath),
      }
    : false

  return {
    plugins: [react()],
    server: {
      port: 3000,
      strictPort: true,
      https: httpsOptions,
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) {
              return undefined;
            }

            if (id.includes('/node_modules/@react-google-maps/api/')) {
              return 'maps-vendor';
            }

            if (
              id.includes('/node_modules/react-router-dom/') ||
              id.includes('/node_modules/@remix-run/router/')
            ) {
              return 'router-vendor';
            }

            if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/')) {
              return 'react-vendor';
            }

            if (id.includes('/node_modules/axios/')) {
              return 'http-vendor';
            }

            return undefined;
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
  }
})
