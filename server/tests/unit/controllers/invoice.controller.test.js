/**
 * @file invoice.controller.test.js
 * @description Unit tests for public shared invoice controller endpoints
 */

import {
  getSharedInvoiceDetails,
  sendInvoice,
  submitSharedInvoiceDecision,
} from '../../../controllers/invoice.controller.js';
import Invoice from '../../../models/Invoice.model.js';

jest.mock('../../../models/Invoice.model.js');
jest.mock('../../../middleware/logger.middleware.js', () => ({
  logError: jest.fn(),
  logInfo: jest.fn(),
}));

const buildPopulateQuery = (result) => {
  const query = {
    populate: jest.fn(),
  };

  query.populate
    .mockReturnValueOnce(query)
    .mockReturnValueOnce(query)
    .mockReturnValueOnce(query)
    .mockReturnValueOnce(Promise.resolve(result));

  return query;
};

const buildFutureDate = (days = 1) => new Date(Date.now() + (days * 24 * 60 * 60 * 1000));
const buildPastDate = (days = 1) => new Date(Date.now() - (days * 24 * 60 * 60 * 1000));

describe('Invoice Controller - Public Share Endpoints', () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      params: { token: 'share-token-123' },
      body: {},
      protocol: 'https',
      get: jest.fn().mockReturnValue('field.example.com'),
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    jest.clearAllMocks();
  });

  describe('getSharedInvoiceDetails', () => {
    test('returns public shared invoice summary for a valid pro-forma token', async () => {
      const invoice = {
        shareToken: 'share-token-123',
        invoiceNumber: 'INV-000123',
        title: 'Generator Repair Approval',
        description: 'Approval required for on-site repair work',
        documentType: 'proForma',
        workflowStatus: 'awaitingApproval',
        serviceType: 'Emergency Repair',
        serviceDate: '2026-03-23T08:00:00.000Z',
        customer: {
          businessName: 'Acme Mining',
          contactFirstName: 'John',
          contactLastName: 'Doe',
        },
        lineItems: [{ description: 'Labour', quantity: 2, unitPrice: 650, total: 1300 }],
        partsCost: 1000,
        laborHours: 2,
        laborRate: 650,
        laborCost: 1300,
        travelCost: 650,
        consumablesCost: 100,
        subtotal: 3050,
        vatRate: 15,
        vatAmount: 457.5,
        totalAmount: 3507.5,
        depositRequired: true,
        depositAmount: 1750,
        depositReason: 'Parts procurement deposit',
        notes: 'Customer to confirm before work continues',
        terms: 'Approval required before additional work proceeds.',
        siteInstruction: {
          problemsFound: 'Radiator leak detected',
          recommendedSolution: 'Replace damaged hose and refill coolant',
        },
        shareTokenExpiresAt: buildFutureDate(7),
      };

      Invoice.findOne = jest.fn().mockReturnValue(buildPopulateQuery(invoice));

      await getSharedInvoiceDetails(req, res);

      expect(Invoice.findOne).toHaveBeenCalledWith({ shareToken: 'share-token-123' });
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          invoiceNumber: 'INV-000123',
          documentType: 'proForma',
          workflowStatus: 'awaitingApproval',
          pdfUrl: 'https://field.example.com/api/invoices/share/share-token-123/pdf',
          approvalAllowed: true,
          customer: {
            businessName: 'Acme Mining',
            contactFirstName: 'John',
            contactLastName: 'Doe',
          },
        })
      );
    });

    test('returns 404 when shared invoice token does not exist', async () => {
      Invoice.findOne = jest.fn().mockReturnValue(buildPopulateQuery(null));

      await getSharedInvoiceDetails(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invoice not found' });
    });

    test('returns 410 when the shared invoice token has expired', async () => {
      const expiredInvoice = {
        shareToken: 'share-token-123',
        shareTokenExpiresAt: buildPastDate(7),
      };

      Invoice.findOne = jest.fn().mockReturnValue(buildPopulateQuery(expiredInvoice));

      await getSharedInvoiceDetails(req, res);

      expect(res.status).toHaveBeenCalledWith(410);
      expect(res.json).toHaveBeenCalledWith({ message: 'This invoice link has expired' });
    });
  });

  describe('submitSharedInvoiceDecision', () => {
    test('approves a shared pro-forma and persists approval metadata', async () => {
      const invoice = {
        shareToken: 'share-token-123',
        invoiceNumber: 'INV-000123',
        documentType: 'proForma',
        workflowStatus: 'awaitingApproval',
        workflowTransitions: [],
        siteInstruction: {
          problemsFound: 'Radiator leak detected',
        },
        shareTokenExpiresAt: buildFutureDate(7),
        save: jest.fn().mockResolvedValue(true),
      };

      req.body = {
        decision: 'approved',
        approvalReference: 'PO-7788',
        approvalNotes: 'Proceed with urgent repair',
      };

      Invoice.findOne = jest.fn().mockResolvedValue(invoice);

      await submitSharedInvoiceDecision(req, res);

      expect(invoice.workflowStatus).toBe('approved');
      expect(invoice.siteInstruction).toEqual(
        expect.objectContaining({
          problemsFound: 'Radiator leak detected',
          approvalReference: 'PO-7788',
          approvalNotes: 'Proceed with urgent repair',
          approvedAt: expect.any(Date),
          rejectedAt: null,
        })
      );

      expect(invoice.customerDecision).toEqual(
        expect.objectContaining({
          decision: 'approved',
          reference: 'PO-7788',
          notes: 'Proceed with urgent repair',
          decidedAt: expect.any(Date),
          channel: 'publicLink',
        })
      );

      expect(invoice.workflowTransitions).toHaveLength(1);
      expect(invoice.workflowTransitions[0]).toEqual(
        expect.objectContaining({
          fromStatus: 'awaitingApproval',
          toStatus: 'approved',
          changedByRole: 'customer',
          channel: 'publicLink',
        })
      );

      expect(invoice.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        message: 'Pro-forma approved successfully.',
        workflowStatus: 'approved',
        invoiceNumber: 'INV-000123',
      });
    });

    test('returns 400 when the decision is invalid', async () => {
      const invoice = {
        shareToken: 'share-token-123',
        documentType: 'proForma',
        workflowStatus: 'awaitingApproval',
        shareTokenExpiresAt: buildFutureDate(7),
      };

      req.body = { decision: 'pending' };
      Invoice.findOne = jest.fn().mockResolvedValue(invoice);

      await submitSharedInvoiceDecision(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'decision must be either approved or rejected' });
    });

    test('returns 409 when a shared document is not a pro-forma', async () => {
      const invoice = {
        shareToken: 'share-token-123',
        documentType: 'final',
        workflowStatus: 'finalized',
        shareTokenExpiresAt: buildFutureDate(7),
      };

      req.body = { decision: 'approved' };
      Invoice.findOne = jest.fn().mockResolvedValue(invoice);

      await submitSharedInvoiceDecision(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Only pro-forma site instructions accept public approval decisions.',
      });
    });

    test('returns 409 when the pro-forma has already been decided', async () => {
      const invoice = {
        shareToken: 'share-token-123',
        documentType: 'proForma',
        workflowStatus: 'approved',
        shareTokenExpiresAt: buildFutureDate(7),
      };

      req.body = { decision: 'rejected' };
      Invoice.findOne = jest.fn().mockResolvedValue(invoice);

      await submitSharedInvoiceDecision(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ message: 'This pro-forma has already been approved.' });
    });
  });

  describe('sendInvoice strict validation', () => {
    beforeEach(() => {
      req = {
        params: { id: 'invoice-id-123' },
        body: {},
        protocol: 'https',
        get: jest.fn().mockReturnValue('field.example.com'),
        user: { _id: 'user-123' },
      };

      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
    });

    test('returns 400 for invalid channels', async () => {
      const invoice = {
        _id: 'invoice-id-123',
        documentType: 'proForma',
        workflowStatus: 'draft',
        customer: { email: 'customer@example.com', phoneNumber: '0821234567' },
      };

      req.body = { channels: ['email', 'fax'] };
      Invoice.findOne = jest.fn().mockReturnValue(buildPopulateQuery(invoice));

      await sendInvoice(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Invalid channels requested: fax. Allowed channels: email, whatsapp, telegram',
      });
    });

    test('returns 400 when email channel is selected but customer email is missing', async () => {
      const invoice = {
        _id: 'invoice-id-123',
        documentType: 'proForma',
        workflowStatus: 'draft',
        customer: { phoneNumber: '0821234567' },
      };

      req.body = { channels: ['email'] };
      Invoice.findOne = jest.fn().mockReturnValue(buildPopulateQuery(invoice));

      await sendInvoice(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Customer email is required to send via email channel.' });
    });

    test('returns 400 when email format is invalid for email channel', async () => {
      const invoice = {
        _id: 'invoice-id-123',
        documentType: 'proForma',
        workflowStatus: 'draft',
        customer: { email: 'bad-email', phoneNumber: '0821234567' },
      };

      req.body = { channels: ['email'] };
      Invoice.findOne = jest.fn().mockReturnValue(buildPopulateQuery(invoice));

      await sendInvoice(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Customer email format is invalid for email delivery.' });
    });

    test('returns 400 when WhatsApp channel is selected but customer phone is missing', async () => {
      const invoice = {
        _id: 'invoice-id-123',
        documentType: 'proForma',
        workflowStatus: 'draft',
        customer: { email: 'customer@example.com' },
      };

      req.body = { channels: ['whatsapp'] };
      Invoice.findOne = jest.fn().mockReturnValue(buildPopulateQuery(invoice));

      await sendInvoice(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Customer phone number is required to send via WhatsApp channel.' });
    });

    test('returns 400 when WhatsApp phone format is invalid', async () => {
      const invoice = {
        _id: 'invoice-id-123',
        documentType: 'proForma',
        workflowStatus: 'draft',
        customer: { email: 'customer@example.com', phoneNumber: '123' },
      };

      req.body = { channels: ['whatsapp'] };
      Invoice.findOne = jest.fn().mockReturnValue(buildPopulateQuery(invoice));

      await sendInvoice(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Customer phone number format is invalid for WhatsApp delivery.' });
    });
  });
});