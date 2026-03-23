/**
 * @file invoice.routes.test.js
 * @description Route-level integration tests for public invoice share endpoints
 */

import express from 'express';
import request from 'supertest';
import invoiceRoutes from '../../../routes/invoice.routes.js';
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

describe('Invoice Routes - Public Share Endpoints', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();

    app = express();
    app.use(express.json());
    app.use('/api/invoices', invoiceRoutes);
  });

  test('GET /api/invoices/share/:token returns shared invoice summary through router', async () => {
    const invoice = {
      shareToken: 'route-share-token',
      invoiceNumber: 'INV-ROUTE-001',
      title: 'Public Route Test',
      description: 'Route-level shared document lookup',
      documentType: 'proForma',
      workflowStatus: 'awaitingApproval',
      serviceType: 'Emergency Repair',
      serviceDate: '2026-03-23T09:00:00.000Z',
      customer: {
        businessName: 'Route Test Mining',
        contactFirstName: 'Alice',
        contactLastName: 'Jones',
      },
      lineItems: [{ description: 'Repair labour', quantity: 2, unitPrice: 650, total: 1300 }],
      partsCost: 900,
      laborHours: 2,
      laborRate: 650,
      laborCost: 1300,
      travelCost: 650,
      consumablesCost: 100,
      subtotal: 2950,
      vatRate: 15,
      vatAmount: 442.5,
      totalAmount: 3392.5,
      depositRequired: false,
      depositAmount: 0,
      depositReason: '',
      notes: 'Route test notes',
      terms: 'Route test terms',
      siteInstruction: {
        problemsFound: 'Leak found',
        recommendedSolution: 'Replace damaged part',
      },
      shareTokenExpiresAt: new Date('2026-03-30T09:00:00.000Z'),
    };

    Invoice.findOne = jest.fn().mockReturnValue(buildPopulateQuery(invoice));

    const response = await request(app).get('/api/invoices/share/route-share-token');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      invoiceNumber: 'INV-ROUTE-001',
      workflowStatus: 'awaitingApproval',
      approvalAllowed: true,
    });
    expect(response.body.pdfUrl).toEqual(
      expect.stringMatching(/\/api\/invoices\/share\/route-share-token\/pdf$/)
    );
    expect(Invoice.findOne).toHaveBeenCalledWith({ shareToken: 'route-share-token' });
  });

  test('GET /api/invoices/share/:token returns 404 when token is missing', async () => {
    Invoice.findOne = jest.fn().mockReturnValue(buildPopulateQuery(null));

    const response = await request(app).get('/api/invoices/share/missing-token');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: 'Invoice not found' });
  });

  test('POST /api/invoices/share/:token/decision approves a pro-forma through router', async () => {
    const invoice = {
      shareToken: 'route-share-token',
      invoiceNumber: 'INV-ROUTE-002',
      documentType: 'proForma',
      workflowStatus: 'awaitingApproval',
      siteInstruction: {
        problemsFound: 'Bearing failure',
      },
      shareTokenExpiresAt: new Date('2026-03-30T09:00:00.000Z'),
      save: jest.fn().mockResolvedValue(true),
    };

    Invoice.findOne = jest.fn().mockResolvedValue(invoice);

    const response = await request(app)
      .post('/api/invoices/share/route-share-token/decision')
      .send({
        decision: 'approved',
        approvalReference: 'ROUTE-PO-44',
        approvalNotes: 'Approved via route test',
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: 'Pro-forma approved successfully.',
      workflowStatus: 'approved',
      invoiceNumber: 'INV-ROUTE-002',
    });
    expect(invoice.workflowStatus).toBe('approved');
    expect(invoice.siteInstruction).toEqual(
      expect.objectContaining({
        problemsFound: 'Bearing failure',
        approvalReference: 'ROUTE-PO-44',
        approvalNotes: 'Approved via route test',
        approvedAt: expect.any(Date),
        rejectedAt: null,
      })
    );
    expect(invoice.save).toHaveBeenCalled();
  });

  test('POST /api/invoices/share/:token/decision returns 400 for invalid decisions', async () => {
    const invoice = {
      shareToken: 'route-share-token',
      documentType: 'proForma',
      workflowStatus: 'awaitingApproval',
      siteInstruction: {},
      shareTokenExpiresAt: new Date('2026-03-30T09:00:00.000Z'),
    };

    Invoice.findOne = jest.fn().mockResolvedValue(invoice);

    const response = await request(app)
      .post('/api/invoices/share/route-share-token/decision')
      .send({ decision: 'pending' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'decision must be either approved or rejected' });
  });
});