import { jest } from '@jest/globals';
// __mocks__/factories/site.factory.js

export const createMockSite = (overrides = {}) => ({
  _id: `mock_site_${Date.now()}`,
  siteName: 'Main Branch',
  address: '123 Main St, Johannesburg',
  addressDetails: { streetAddress: '123 Main St', suburb: 'Johannesburg' },
  contactPerson: 'Bob',
  contactPhone: '0800001111',
  contactEmail: 'bob@example.com',
  serviceTypes: ['HVAC'],
  status: 'active',
  notes: '',
  deleteOne: jest.fn(),
  ...overrides
});
