import { jest } from '@jest/globals';
// __mocks__/factories/user.factory.js

export const createMockUser = (overrides = {}) => ({
  _id: `mock_user_${Date.now()}`,
  userName: 'alice',
  email: 'alice@acme.com',
  role: 'customer',
  businessName: 'ACME Corp',
  businessRegistrationNumber: 'BRN-123456',
  password: 'hashed-password',
  save: jest.fn().mockResolvedValue(true),
  ...overrides
});
