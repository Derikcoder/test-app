/**
 * @file invoice.controller.test.js
 * @description Unit tests for public shared invoice controller endpoints
 */

import {
  finalizeInvoice,
  getSharedInvoiceDetails,
  sendInvoice,
  submitSharedInvoiceDecision,
} from '../../../controllers/invoice.controller.js';
import Invoice from '../../../models/Invoice.model.js';
import ServiceCall from '../../../models/ServiceCall.model.js';
import { sendInvoiceDocumentEmail } from '../../../utils/emailService.js';

jest.mock('../../../models/Invoice.model.js');
jest.mock('../../../models/ServiceCall.model.js');
jest.mock('../../../utils/emailService.js', () => ({
  sendInvoiceDocumentEmail: jest.fn(),
}));
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
        shareTokenExpiresAt: new Date('2027-04-07T08:00:00.000Z'),
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
        shareTokenExpiresAt: new Date('2026-03-01T08:00:00.000Z'),
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
        shareTokenExpiresAt: new Date('2027-04-07T08:00:00.000Z'),
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
        shareTokenExpiresAt: new Date('2027-04-07T08:00:00.000Z'),
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
        shareTokenExpiresAt: new Date('2027-04-07T08:00:00.000Z'),
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
        shareTokenExpiresAt: new Date('2027-04-07T08:00:00.000Z'),
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

    test('moves a draft pro-forma to awaitingApproval when sent successfully', async () => {
      const invoice = {
        _id: 'invoice-id-123',
        invoiceNumber: 'INV-000555',
        documentType: 'proForma',
        workflowStatus: 'draft',
        workflowTransitions: [],
        serviceType: 'Emergency Repair',
        title: 'Generator Repair Approval',
        description: 'Approval required for on-site repair work',
        lineItems: [{ description: 'Labour', quantity: 1, unitPrice: 650, total: 650 }],
        partsCost: 650,
        laborHours: 1,
        laborRate: 650,
        laborCost: 650,
        travelCost: 0,
        consumablesCost: 0,
        subtotal: 650,
        vatRate: 15,
        vatAmount: 97.5,
        totalAmount: 747.5,
        terms: 'Approval required before work proceeds.',
        customer: {
          businessName: 'Acme Mining',
          contactFirstName: 'John',
          contactLastName: 'Doe',
          email: 'customer@example.com',
          phoneNumber: '0821234567',
        },
        siteInstruction: {},
        save: jest.fn().mockResolvedValue(true),
      };

      req.body = { channels: ['email'] };
      sendInvoiceDocumentEmail.mockResolvedValue({ messageId: 'email-123' });
      Invoice.findOne = jest.fn().mockReturnValue(buildPopulateQuery(invoice));

      await sendInvoice(req, res);

      expect(sendInvoiceDocumentEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'customer@example.com',
          documentNumber: 'INV-000555',
          approvalRequired: true,
        })
      );
      expect(invoice.workflowStatus).toBe('awaitingApproval');
      expect(invoice.siteInstruction).toEqual(
        expect.objectContaining({
          approvalRequestedAt: expect.any(Date),
        })
      );
      expect(invoice.workflowTransitions).toHaveLength(1);
      expect(invoice.workflowTransitions[0]).toEqual(
        expect.objectContaining({
          fromStatus: 'draft',
          toStatus: 'awaitingApproval',
          changedByRole: 'user',
          channel: 'internal',
        })
      );
      expect(invoice.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Pro-Forma Site Instruction sent successfully',
          documentNumber: 'INV-000555',
          channels: ['email'],
        })
      );
    });
  });

  describe('finalizeInvoice', () => {
    test('finalizes an approved pro-forma into a final invoice', async () => {
      req = {
        params: { id: 'invoice-id-123' },
        user: { _id: 'user-123' },
      };

      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      const invoice = {
        _id: 'invoice-id-123',
        invoiceNumber: 'INV-000777',
        documentType: 'proForma',
        workflowStatus: 'approved',
        workflowTransitions: [],
        serviceCall: 'service-call-123',
        save: jest.fn().mockResolvedValue(true),
      };

      const serviceCall = {
        _id: 'service-call-123',
        completedDate: new Date('2026-04-12T10:00:00.000Z'),
        status: 'completed',
        save: jest.fn().mockResolvedValue(true),
      };

      const populatedInvoice = {
        _id: 'invoice-id-123',
        invoiceNumber: 'INV-000777',
        documentType: 'final',
        workflowStatus: 'finalized',
      };

      Invoice.findOne = jest.fn()
        .mockResolvedValueOnce(invoice)
        .mockReturnValueOnce(buildPopulateQuery(populatedInvoice));
      ServiceCall.findOne = jest.fn().mockResolvedValue(serviceCall);

      await finalizeInvoice(req, res);

      expect(invoice.documentType).toBe('final');
      expect(invoice.workflowStatus).toBe('finalized');
      expect(invoice.finalizedAt).toEqual(expect.any(Date));
      expect(invoice.serviceDate).toEqual(serviceCall.completedDate);
      expect(invoice.workflowTransitions).toHaveLength(1);
      expect(invoice.workflowTransitions[0]).toEqual(
        expect.objectContaining({
          fromStatus: 'approved',
          toStatus: 'finalized',
          changedBy: 'user-123',
          changedByRole: 'user',
          channel: 'internal',
          note: 'Pro-forma finalized to final invoice',
        })
      );
      expect(invoice.save).toHaveBeenCalled();
      expect(serviceCall.status).toBe('invoiced');
      expect(serviceCall.invoice).toBe('invoice-id-123');
      expect(serviceCall.proFormaInvoice).toBe('invoice-id-123');
      expect(serviceCall.invoicedDate).toEqual(expect.any(Date));
      expect(serviceCall.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(populatedInvoice);
    });
  });
});