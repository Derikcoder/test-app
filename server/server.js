/**
 * @file server.js
 * @description Main Express server entry point for Field Service Management API
 * @module Server
 * 
 * This file bootstraps the Express application, configures middleware,
 * connects to MongoDB, and sets up all API routes.
 * 
 * @requires express - Web application framework
 * @requires cors - Cross-Origin Resource Sharing middleware
 * @requires dotenv - Environment variable loader
 * @requires ./config/db - MongoDB connection handler
 * @requires ./routes/* - API route handlers
 * @requires ./middleware/logger.middleware - Logging utilities
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.routes.js';
import agentRoutes from './routes/agent.routes.js';
import customerRoutes from './routes/customer.routes.js';
import serviceCallRoutes from './routes/serviceCall.routes.js';
import equipmentRoutes from './routes/equipment.routes.js';
import quotationRoutes from './routes/quotation.routes.js';
import invoiceRoutes from './routes/invoice.routes.js';
import { requestLogger, errorLogger, logInfo, logError } from './middleware/logger.middleware.js';

// Load environment variables from .env file
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express application
const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser tools (Postman/cURL) and same-origin requests.
    if (!origin) {
      return callback(null, true);
    }

    // If no allowlist is defined, allow all origins (useful for local dev).
    if (allowedOrigins.length === 0) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
};

/**
 * Middleware Configuration
 * Order matters: Some middleware must run before others
 */

// Enable CORS for all routes (allows frontend to make requests)
app.use(cors(corsOptions));

// Parse incoming JSON payloads
app.use(express.json());

// Parse URL-encoded form data
app.use(express.urlencoded({ extended: true }));

// Log all incoming requests (must be early in middleware stack)
app.use(requestLogger);

/**
 * Database Connection
 * Attempts to connect to MongoDB. Server will continue running even if connection fails.
 * This allows development without requiring MongoDB to be installed.
 */
connectDB().catch(err => {
  console.log('MongoDB connection failed:', err.message);
  console.log('Server running without MongoDB...');
});

/**
 * API Routes
 * All routes are prefixed with /api for clear API versioning
 */

/**
 * @route   GET /
 * @desc    Root endpoint for direct backend URL checks
 * @access  Public
 */
app.get('/', (req, res) => {
  const payload = {
    message: 'Field Service API is running',
    endpoints: {
      api: '/api',
      health: '/api/health',
    },
  };

  const acceptsHeader = req.get('accept') || '';

  // Render a simple browser-friendly splash page while preserving JSON for API clients.
  if (acceptsHeader.includes('text/html')) {
    return res.status(200).type('html').send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Field Service API</title>
    <style>
      :root {
        color-scheme: light;
      }
      body {
        margin: 0;
        font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        background: radial-gradient(circle at 10% 10%, #dbeafe, #eef2ff 40%, #f8fafc 70%);
        color: #0f172a;
      }
      .wrap {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
      }
      .card {
        width: min(640px, 100%);
        background: rgba(255, 255, 255, 0.9);
        border: 1px solid #cbd5e1;
        border-radius: 16px;
        box-shadow: 0 16px 50px rgba(15, 23, 42, 0.12);
        padding: 28px;
      }
      h1 {
        margin: 0 0 8px;
        font-size: 1.6rem;
      }
      p {
        margin: 0 0 18px;
        color: #334155;
      }
      .links {
        display: grid;
        gap: 10px;
      }
      a {
        display: inline-block;
        text-decoration: none;
        color: #1d4ed8;
        background: #eff6ff;
        border: 1px solid #bfdbfe;
        border-radius: 10px;
        padding: 10px 12px;
      }
      a:hover {
        background: #dbeafe;
      }
      code {
        background: #f1f5f9;
        border-radius: 6px;
        padding: 2px 6px;
      }
    </style>
  </head>
  <body>
    <main class="wrap">
      <section class="card">
        <h1>Field Service API is running</h1>
        <p>Backend is up on HTTPS. Use the links below to verify endpoints.</p>
        <div class="links">
          <a href="/api">API Root: <code>/api</code></a>
          <a href="/api/health">Health Check: <code>/api/health</code></a>
        </div>
      </section>
    </main>
  </body>
</html>`);
  }

  return res.json(payload);
});

/**
 * @route   GET /api
 * @desc    API welcome message / root endpoint
 * @access  Public
 */
app.get('/api', (req, res) => {
  res.json({ message: 'Welcome to the API' });
});

/**
 * @route   GET /api/health
 * @desc    Health check endpoint for monitoring
 * @access  Public
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

/**
 * Resource Routes
 * All protected routes require JWT authentication via the 'protect' middleware
 */

// Authentication and user management routes
app.use('/api/auth', authRoutes);

// Field agent CRUD operations
app.use('/api/agents', agentRoutes);

// Customer management and intake
app.use('/api/customers', customerRoutes);

// Service call tracking and management
app.use('/api/service-calls', serviceCallRoutes);

// Equipment registry and asset management
app.use('/api/equipment', equipmentRoutes);

// Quotation/estimate management
app.use('/api/quotations', quotationRoutes);

// Invoice and payment management
app.use('/api/invoices', invoiceRoutes);

/**
 * 404 Handler
 * Catches all undefined routes and returns 404 error
 * Must be placed after all valid route definitions
 */
app.use((req, res) => {
  logError(`404 - Route not found: ${req.method} ${req.url}`);
  res.status(404).json({ message: 'Route not found' });
});

/**
 * Global Error Handler
 * Catches all errors from routes and middleware
 * Must be the last middleware in the stack
 */
app.use(errorLogger);

/**
 * Server Initialization
 * Start the Express server on the configured port
 */
const sslEnabled = process.env.SSL_ENABLED === 'true';
const sslCertFile = process.env.SSL_CERT_FILE;
const sslKeyFile = process.env.SSL_KEY_FILE;

const startHttpServer = () => {
  app.listen(PORT, () => {
    logInfo(`✅ Server is running on http://localhost:${PORT}`);
    logInfo(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
};

if (sslEnabled && sslCertFile && sslKeyFile) {
  const certPath = path.resolve(__dirname, sslCertFile);
  const keyPath = path.resolve(__dirname, sslKeyFile);

  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    const httpsServer = https.createServer(
      {
        cert: fs.readFileSync(certPath),
        key: fs.readFileSync(keyPath),
      },
      app
    );

    httpsServer.listen(PORT, () => {
      logInfo(`✅ Server is running on https://localhost:${PORT}`);
      logInfo(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } else {
    logError('SSL is enabled but cert/key files are missing, falling back to HTTP', {
      certPath,
      keyPath,
    });
    startHttpServer();
  }
} else {
  startHttpServer();
}
