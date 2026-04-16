/**
 * @file quotation.controller.test.js
 * @description Unit tests for prospect-first quotation acceptance flow.
 */

import { acceptPublicQuotation, createQuotationFromServiceCall, sendQuotation } from '../../../controllers/quotation.controller.js';
import Quotation from '../../../models/Quotation.model.js';
import ServiceCall from '../../../models/ServiceCall.model.js';
import Customer from '../../../models/Customer.model.js';
import User from '../../../models/User.model.js';
import ServiceCallEmailLock from '../../../models/ServiceCallEmailLock.model.js';
import { sendQuotationEmail } from '../../../utils/emailService.js';

jest.mock('../../../models/Quotation.model.js');
jest.mock('../../../models/ServiceCall.model.js');
jest.mock('../../../models/Customer.model.js');
jest.mock('../../../models/User.model.js');
jest.mock('../../../models/ServiceCallEmailLock.model.js');
jest.mock('../../../services/quotationAutoResolver.service.js', () => ({
  resolveAutoMachineDataForQuote: jest.fn().mockResolvedValue({
    source: 'generic-fallback',
    confidence: 'medium',
    templateSeed: {
      serviceType: 'Preventive Maintenance',
      machineModelNumber: 'Test Generator',
    },
  }),
}));
jest.mock('../../../middleware/logger.middleware.js', () => ({
  logError: jest.fn(),
  logInfo: jest.fn(),
}));
jest.mock('../../../utils/emailService.js', () => ({
  sendQuotationEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn().mockResolvedValue({ messageId: 'reset-1' }),
  sendCustomerWelcomeEmail: jest.fn().mockResolvedValue({ messageId: 'welcome-1' }),
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

  test('allows an assigned field agent to create a quotation from their service call', async () => {
    req = {
      params: { serviceCallId: 'call-123' },
      body: {
        serviceType: 'Preventive Maintenance',
        title: 'Quotation for SC-000123',
        description: 'Field agent quote',
        lineItems: [{ description: 'Oil top-up', quantity: 1.5, unitPrice: 75 }],
      },
      user: {
        _id: 'user-agent-1',
        role: 'fieldServiceAgent',
        fieldServiceAgentProfile: 'agent-profile-1',
        isSuperUser: false,
      },
    };

    const serviceCall = {
      _id: 'call-123',
      callNumber: 'SC-000123',
      customer: 'cust-1',
      siteId: 'site-1',
      equipment: 'equip-1',
      serviceType: 'Preventive Maintenance',
      description: 'Generator service required',
      status: 'assigned',
      assignedAgent: 'agent-profile-1',
      createdBy: 'owner-1',
      save: jest.fn().mockResolvedValue(true),
    };

    const customer = {
      _id: 'cust-1',
      businessName: 'Bennie Henning',
    };

    const createdQuotation = {
      _id: 'quote-123',
      quotationNumber: 'QT-000123',
      customer: 'cust-1',
      equipment: 'equip-1',
      populate: jest.fn().mockResolvedValue(true),
      toObject: jest.fn().mockReturnValue({
        _id: 'quote-123',
        quotationNumber: 'QT-000123',
      }),
    };

    ServiceCall.findOne = jest.fn().mockImplementation((query) => {
      if (query?._id === 'call-123' && query?.assignedAgent === 'agent-profile-1') {
        return Promise.resolve(serviceCall);
      }

      return Promise.resolve(null);
    });

    Customer.findOne = jest.fn().mockImplementation((query) => {
      if (query?._id === 'cust-1' && query?.createdBy === 'owner-1') {
        return Promise.resolve(customer);
      }

      return Promise.resolve(null);
    });

    Quotation.create = jest.fn().mockResolvedValue(createdQuotation);

    await createQuotationFromServiceCall(req, res);

    expect(ServiceCall.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: 'call-123',
        assignedAgent: 'agent-profile-1',
      })
    );
    expect(Customer.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: 'cust-1',
        createdBy: 'owner-1',
      })
    );
    expect(Quotation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: 'cust-1',
        createdBy: 'user-agent-1',
      })
    );
    expect(serviceCall.status).toBe('awaiting-quote-approval');
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('allows a business administrator to resend a field agent quotation linked to their service call', async () => {
    req = {
      params: { id: 'quote-123' },
      body: { channels: ['email'] },
      user: {
        _id: 'owner-1',
        role: 'businessAdministrator',
      },
      protocol: 'https',
      get: jest.fn().mockReturnValue('localhost:5000'),
    };

    const quotation = {
      _id: 'quote-123',
      quotationNumber: 'QT-000123',
      status: 'sent',
      validUntil: new Date(Date.now() + 86_400_000),
      shareToken: 'share-123',
      shareTokenExpiresAt: new Date(Date.now() + 86_400_000),
      recipientSnapshot: {
        name: 'Bennie Henning',
        email: 'bennie@example.com',
        phoneNumber: '0821234567',
      },
      customer: null,
      createdBy: 'user-agent-1',
      save: jest.fn().mockResolvedValue(true),
    };

    Quotation.findOne = jest.fn().mockImplementation((query) => ({
      populate: jest.fn().mockResolvedValue(
        query?._id === 'quote-123' && !query?.createdBy ? quotation : null
      ),
    }));
    Quotation.findById = jest.fn().mockReturnValue({
      populate: jest.fn().mockResolvedValue(quotation),
    });
    ServiceCall.findOne = jest.fn().mockImplementation((query) => {
      if (query?.quotation === 'quote-123' && query?.createdBy === 'owner-1') {
        return Promise.resolve({ _id: 'call-123' });
      }

      return Promise.resolve(null);
    });
    ServiceCallEmailLock.findOneAndUpdate = jest.fn().mockResolvedValue({ _id: 'lock-1' });

    await sendQuotation(req, res);

    expect(sendQuotationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'bennie@example.com',
        quotationNumber: 'QT-000123',
      })
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Quotation sent successfully',
        quotationNumber: 'QT-000123',
      })
    );
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
        portalUser: expect.objectContaining({
          email: 'jane@example.com',
          userName: 'jane',
          temporaryAccessKey: expect.any(String),
        }),
        loginUrl: expect.stringContaining('/login'),
      })
    );
  });
});
