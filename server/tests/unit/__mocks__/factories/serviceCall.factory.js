import { jest } from '@jest/globals';
// __mocks__/factories/serviceCall.factory.js

export const createMockServiceCall = (overrides = {}) => ({
  _id: `mock_serviceCall_${Date.now()}`,
  callNumber: `SC-${Math.floor(Math.random()*10000)}`,
  customer: 'customer-1',
  agent: 'agent-1',
  status: 'open',
  description: 'Routine maintenance',
  createdAt: new Date().toISOString(),
  save: jest.fn().mockResolvedValue(true),
  ...overrides
});
