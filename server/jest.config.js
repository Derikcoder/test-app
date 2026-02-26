/**
 * @file jest.config.js
 * @description Jest configuration for server-side unit and integration tests
 */

export default {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'controllers/**/*.js',
    'middleware/**/*.js',
    'models/**/*.js',
    '!**/node_modules/**',
    '!**/tests/**',
  ],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },
  testMatch: ['**/tests/**/*.test.js'],
  moduleFileExtensions: ['js'],
  transform: {},
  testTimeout: 10000,
  collectCoverage: false,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
};
