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
import connectDB from './config/db.js';
import authRoutes from './routes/auth.routes.js';
import agentRoutes from './routes/agent.routes.js';
import customerRoutes from './routes/customer.routes.js';
import serviceCallRoutes from './routes/serviceCall.routes.js';
import { requestLogger, errorLogger, logInfo, logError } from './middleware/logger.middleware.js';

// Load environment variables from .env file
dotenv.config();

// Initialize Express application
const app = express();
const PORT = process.env.PORT || 5000;

/**
 * Middleware Configuration
 * Order matters: Some middleware must run before others
 */

// Enable CORS for all routes (allows frontend to make requests)
app.use(cors());

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
app.listen(PORT, () => {
  logInfo(`✅ Server is running on port ${PORT}`);
  logInfo(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
