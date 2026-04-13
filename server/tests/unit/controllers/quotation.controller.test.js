/**
 * @file quotation.controller.test.js
 * @description Unit tests for prospect-first quotation acceptance flow.
 */

import { acceptPublicQuotation } from '../../../controllers/quotation.controller.js';
import Quotation from '../../../models/Quotation.model.js';
import ServiceCall from '../../../models/ServiceCall.model.js';
import Customer from '../../../models/Customer.model.js';
import User from '../../../models/User.model.js';
import ServiceCallEmailLock from '../../../models/ServiceCallEmailLock.model.js';

jest.mock('../../../models/Quotation.model.js');
jest.mock('../../../models/ServiceCall.model.js');
jest.mock('../../../models/Customer.model.js');
jest.mock('../../../models/User.model.js');
jest.mock('../../../models/ServiceCallEmailLock.model.js');
jest.mock('../../../middleware/logger.middleware.js', () => ({
  logError: jest.fn(),
  logInfo: jest.fn(),
}));
jest.mock('../../../utils/emailService.js', () => ({
  sendQuotationEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn().mockResolvedValue({ messageId: 'reset-1' }),
}));
jest.mock('../../../utils/sequence.util.js', () => ({
  getNextSequenceValue: jest.fn().mockResolvedValue(1),
  formatSequenceId: jest.fn().mockReturnValue('CUST-000001'),
}));

describe('Quotation Controller - Prospect Conversion', () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      params: { token: 'quote-token-1' },
      body: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    jest.clearAllMocks();
  });

  test('creates customer and customer user only when prospect quote is accepted', async () => {
    const quotation = {
      _id: 'quote-1',
      quotationNumber: 'QT-000001',
      status: 'sent',
      shareTokenExpiresAt: new Date(Date.now() + 60_000),
      recipientSnapshot: {
        name: 'Jane Prospect',
        email: 'jane@example.com',
        phoneNumber: '0821234567',
        customerType: 'residential',
      },
      customer: null,
      createdBy: 'owner-1',
      save: jest.fn().mockResolvedValue(true),
    };

    const linkedServiceCall = {
      _id: 'call-1',
      bookingRequest: {
        contact: {
          contactEmail: 'jane@example.com',
          contactPhone: '0821234567',
          contactPerson: 'Jane Prospect',
        },
        administrativeAddress: {
          streetAddress: '12 Test Street',
          suburb: 'Northcliff',
          cityDistrict: 'Johannesburg',
          province: 'Gauteng',
        },
      },
      customer: null,
      status: 'awaiting-quote-approval',
      startedDate: null,
      save: jest.fn().mockResolvedValue(true),
    };

    const createdCustomer = {
      _id: 'cust-1',
      businessName: undefined,
      contactFirstName: 'Jane',
      contactLastName: 'Prospect',
      email: 'jane@example.com',
      phoneNumber: '0821234567',
      physicalAddress: '12 Test Street, Northcliff, Johannesburg, Gauteng',
      save: jest.fn().mockResolvedValue(true),
    };

    const createdUser = {
      _id: 'user-1',
      userName: 'jane',
      email: 'jane@example.com',
      generatePasswordResetToken: jest.fn().mockReturnValue('plain-reset-token'),
      save: jest.fn().mockResolvedValue(true),
    };

    Quotation.findOne = jest.fn().mockReturnValue({
      populate: jest.fn().mockResolvedValue(quotation),
    });
    ServiceCall.findOne = jest.fn()
      .mockResolvedValueOnce(linkedServiceCall)
      .mockResolvedValueOnce(linkedServiceCall);
    Customer.findOne = jest.fn().mockResolvedValue(null);
    Customer.create = jest.fn().mockResolvedValue(createdCustomer);
    User.findOne = jest.fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    User.create = jest.fn().mockResolvedValue(createdUser);
    ServiceCallEmailLock.deleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });

    await acceptPublicQuotation(req, res);

    expect(Customer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'jane@example.com',
        customerId: 'CUST-000001',
        createdBy: 'owner-1',
      })
    );
    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'jane@example.com',
        role: 'customer',
        customerProfile: 'cust-1',
      })
    );
    expect(quotation.customer).toBe('cust-1');
    expect(linkedServiceCall.customer).toBe('cust-1');
    expect(linkedServiceCall.status).toBe('in-progress');
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        portalAccountCreated: true,
        quotationNumber: 'QT-000001',
      })
    );
  });
});
