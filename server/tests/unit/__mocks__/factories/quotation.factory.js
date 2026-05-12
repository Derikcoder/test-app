import { jest } from '@jest/globals';
// __mocks__/factories/quotation.factory.js

export const createMockQuotation = (overrides = {}) => ({
  _id: `mock_quotation_${Date.now()}`,
  quotationNumber: `QTN-${Math.floor(Math.random()*10000)}`,
  customer: 'customer-1',
  status: 'pending',
  total: 1000,
  createdAt: new Date().toISOString(),
  save: jest.fn().mockResolvedValue(true),
  ...overrides
});
