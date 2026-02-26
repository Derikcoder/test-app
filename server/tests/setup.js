/**
 * @file setup.js
 * @description Test setup file for server unit tests
 */

// Mock console methods to reduce test output noise
global.console.log = jest.fn();
global.console.error = jest.fn();
global.console.warn = jest.fn();

// Set test environment variable
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test-app-test';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.PORT = 5001;
