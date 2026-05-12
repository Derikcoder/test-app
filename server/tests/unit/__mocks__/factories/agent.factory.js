import { jest } from '@jest/globals';
// __mocks__/factories/agent.factory.js

export const createMockAgent = (overrides = {}) => ({
  _id: `mock_agent_${Date.now()}`,
  firstName: 'Jane',
  lastName: 'Doe',
  employeeId: `EMP-${Math.floor(Math.random()*1000)}`,
  email: 'jane.doe@acme.com',
  phoneNumber: '0800009999',
  save: jest.fn().mockResolvedValue(true),
  ...overrides
});
