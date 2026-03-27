import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const SSL_ENABLED = env.VITE_SSL_ENABLED !== 'false';
  const SSL_CERT_FILE = env.VITE_SSL_CERT_FILE || '../certs/localhost+1.pem';
  const SSL_KEY_FILE = env.VITE_SSL_KEY_FILE || '../certs/localhost+1-key.pem';
  const API_TARGET = env.VITE_API_PROXY_TARGET || 'https://localhost:5000';

  const certPath = path.isAbsolute(SSL_CERT_FILE)
    ? SSL_CERT_FILE
    : path.resolve(__dirname, SSL_CERT_FILE);
  const keyPath = path.isAbsolute(SSL_KEY_FILE)
    ? SSL_KEY_FILE
    : path.resolve(__dirname, SSL_KEY_FILE);
  const hasHttpsFiles = fs.existsSync(certPath) && fs.existsSync(keyPath);

  return {
    plugins: [react()],
    server: {
      port: 3000,
      strictPort: true,
      https:
        SSL_ENABLED && hasHttpsFiles
          ? {
              cert: fs.readFileSync(certPath),
              key: fs.readFileSync(keyPath),
            }
          : false,
      proxy: {
        '/api': {
          target: API_TARGET,
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
        exclude: ['node_modules/', 'src/__tests__/'],
      },
    },
  };
})
