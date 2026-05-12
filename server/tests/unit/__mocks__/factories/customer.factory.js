import { jest } from '@jest/globals';
// __mocks__/factories/customer.factory.js

export const createMockCustomer = (overrides = {}) => ({
  _id: `mock_customer_${Date.now()}`,
  customerType: 'headOffice',
  businessName: 'ACME Corp',
  contactFirstName: 'Alice',
  contactLastName: 'Smith',
  email: 'alice@acme.com',
  phoneNumber: '0800001234',
  customerId: `CUST-${Math.floor(Math.random()*1000).toString().padStart(3, '0')}`,
  sites: [],
  createdBy: 'user-1',
  save: jest.fn().mockResolvedValue(true),
  deleteOne: jest.fn().mockResolvedValue({}),
  ...overrides
});

export const mockCustomerStates = {
  business: () => createMockCustomer(),
  residential: () => createMockCustomer({
    customerType: 'residential',
    contactFirstName: 'Bob',
    contactLastName: 'Jones',
    email: 'bob@example.com',
    phoneNumber: '0800005678',
    physicalAddress: '45 Oak Ave, Cape Town',
    sites: [],
  })
};
