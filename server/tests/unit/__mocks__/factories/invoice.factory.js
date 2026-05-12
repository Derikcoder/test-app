import { jest } from '@jest/globals';
// __mocks__/factories/invoice.factory.js

export const createMockInvoice = (overrides = {}) => ({
  _id: `mock_invoice_${Date.now()}`,
  invoiceNumber: `INV-${Math.floor(Math.random()*10000)}`,
  documentType: 'proForma',
  workflowStatus: 'draft',
  save: jest.fn().mockResolvedValue(true),
  ...overrides
});

export const mockStates = {
  awaitingApproval: () => createMockInvoice({ 
    workflowStatus: 'awaitingApproval',
    shareToken: 'share-token-123'
  }),
  approved: () => createMockInvoice({ workflowStatus: 'approved' }),
  finalized: () => createMockInvoice({ documentType: 'final', workflowStatus: 'finalized' })
};
