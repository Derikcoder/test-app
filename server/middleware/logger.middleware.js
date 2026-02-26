import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logFilePath = path.join(__dirname, '..', 'logs', 'error.log');
const requestLogPath = path.join(__dirname, '..', 'logs', 'request.log');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Write to log file
const writeLog = (logPath, message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  
  fs.appendFile(logPath, logMessage, (err) => {
    if (err) console.error('Failed to write to log:', err);
  });
};

// Error logging middleware
export const errorLogger = (err, req, res, next) => {
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

  // Log to console
  console.error('❌ ERROR:', errorDetails);

  // Log to file
  writeLog(logFilePath, JSON.stringify(errorDetails, null, 2));

  // Send response
  res.status(errorDetails.error.status).json({
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

// Request logging middleware
export const requestLogger = (req, res, next) => {
  const requestDetails = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    ip: req.ip,
    body: req.method === 'POST' || req.method === 'PUT' ? { ...req.body, password: '***' } : undefined,
  };

  console.log(`📝 ${req.method} ${req.url}`);
  writeLog(requestLogPath, JSON.stringify(requestDetails));

  next();
};

// Log general messages
export const logInfo = (message) => {
  console.log('ℹ️ ', message);
  writeLog(requestLogPath, `INFO: ${message}`);
};

export const logError = (message, error = null) => {
  console.error('❌', message, error);
  writeLog(logFilePath, `ERROR: ${message} ${error ? JSON.stringify(error) : ''}`);
};
