export default {
  testEnvironment: 'node',
  moduleNameMapper: {
    '^(.{1,2}/.*)\\.js$': '$1',
  },
  // Ensure all .js files (including middleware) are transformed by Babel
  // ESM support: treat .js and .mjs as ESM, no Babel transform needed
  transformIgnorePatterns: ['<rootDir>/node_modules/(?!.*)'],
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
  testMatch: ['**/tests/**/*.test.js', '**/tests/**/*.test.mjs'],
  moduleFileExtensions: ['js', 'mjs'],
  testTimeout: 10000,
  collectCoverage: false,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.cjs'],
  // ESM is enabled via "type": "module" in package.json
};
