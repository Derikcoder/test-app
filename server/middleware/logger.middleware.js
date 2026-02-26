/**
 * @file logger.middleware.js
 * @description Comprehensive logging system for requests, errors, and application events
 * @module Middleware/Logger
 * 
 * Provides middleware and utilities for logging HTTP requests, errors, and general info.
 * Logs are written to both console and persistent log files.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES Module equivalent of __dirname (not available in ES modules by default)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define log file paths
const logFilePath = path.join(__dirname, '..', 'logs', 'error.log');
const requestLogPath = path.join(__dirname, '..', 'logs', 'request.log');

/**
 * Initialize Logs Directory
 * Ensures the logs directory exists before writing any log files
 */
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Write Log to File
 * 
 * @function writeLog
 * @param {string} logPath - Full path to the log file
 * @param {string} message - Message to write to the log
 * 
 * @description
 * Appends timestamped log messages to specified file.
 * Uses async fs.appendFile to avoid blocking server operations.
 */
const writeLog = (logPath, message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  
  // Asynchronously append to log file
  fs.appendFile(logPath, logMessage, (err) => {
    if (err) console.error('Failed to write to log:', err);
  });
};

/**
 * Error Logging Middleware
 * 
 * @function errorLogger
 * @param {Error} err - Error object thrown by application
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @description
 * Global error handler that logs errors and sends appropriate response.
 * Must be placed last in middleware stack to catch all errors.
 * 
 * Captures:
 * - Full error details (message, stack trace, status code)
 * - Request context (method, URL, IP address)
 * - Request body (for debugging API calls)
 * 
 * Behavior:
 * - Logs to console with emoji indicator
 * - Writes detailed JSON to error.log file
 * - Returns JSON error response to client
 * - Includes stack trace only in development mode
 */
export const errorLogger = (err, req, res, next) => {
  // Compile comprehensive error details
  const errorDetails = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    ip: req.ip,
    error: {
      message: err.message,
      stack: err.stack,
      status: err.status || 500,
    },
    body: req.body,
  };

  // Log to console for immediate visibility
  console.error('❌ ERROR:', errorDetails);

  // Persist to error log file
  writeLog(logFilePath, JSON.stringify(errorDetails, null, 2));

  // Send error response to client
  res.status(errorDetails.error.status).json({
    message: err.message || 'Internal Server Error',
    // Only expose stack trace in development for security
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

/**
 * Request Logging Middleware
 * 
 * @function requestLogger
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @description
 * Logs all incoming HTTP requests for monitoring and debugging.
 * Must be placed early in middleware stack to capture all requests.
 * 
 * Captures:
 * - Timestamp of request
 * - HTTP method and URL
 * - Client IP address
 * - Request body (with password redaction for security)
 * 
 * Security:
 * - Passwords are masked as '***' before logging
 * - Only logs body for POST/PUT requests (not GET/DELETE)
 */
export const requestLogger = (req, res, next) => {
  const requestDetails = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    ip: req.ip,
    // Only include body for write operations, mask password field
    body: req.method === 'POST' || req.method === 'PUT' ? { ...req.body, password: '***' } : undefined,
  };

  // Console log with emoji for quick visual scanning
  console.log(`📝 ${req.method} ${req.url}`);
  
  // Write detailed request info to file
  writeLog(requestLogPath, JSON.stringify(requestDetails));

  // Continue to next middleware
  next();
};

/**
 * Log General Information
 * 
 * @function logInfo
 * @param {string} message - Information message to log
 * 
 * @description
 * Utility function for logging general application events.
 * Used for startup messages, configuration info, etc.
 */
export const logInfo = (message) => {
  console.log('ℹ️ ', message);
  writeLog(requestLogPath, `INFO: ${message}`);
};

/**
 * Log Error Messages
 * 
 * @function logError
 * @param {string} message - Error message to log
 * @param {Object|null} error - Optional error object with additional details
 * 
 * @description
 * Utility function for logging errors from anywhere in the application.
 * Used for connection errors, validation errors, etc.
 */
export const logError = (message, error = null) => {
  console.error('❌', message, error);
  writeLog(logFilePath, `ERROR: ${message} ${error ? JSON.stringify(error) : ''}`);
};
