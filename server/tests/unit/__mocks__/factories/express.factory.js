import { jest } from '@jest/globals';
// __mocks__/factories/express.factory.js

export const createMockRequest = (overrides = {}) => ({
  params: {},
  query: {},
  body: {},
  user: { _id: 'test-user', role: 'customer' },
  protocol: 'https',
  get: jest.fn().mockReturnValue('example.com'),
  ...overrides
});

export const createMockResponse = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
  send: jest.fn()
});
