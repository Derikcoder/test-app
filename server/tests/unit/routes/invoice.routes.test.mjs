/**
 * @file invoice.routes.test.mjs
 * @description Unit tests for invoice routes behavior
 */
import { jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';

const handlers = {
	getInvoices: jest.fn((req, res) => res.status(200).json({ ok: true })),
	getInvoiceById: jest.fn((req, res) => res.status(200).json({ ok: true })),
	getInvoicesByPaymentStatus: jest.fn((req, res) => res.status(200).json({ ok: true })),
	getOverdueInvoicesSummary: jest.fn((req, res) => res.status(200).json({ ok: true })),
	createInvoice: jest.fn((req, res) => res.status(201).json({ ok: true })),
	upsertProFormaInvoiceFromServiceCall: jest.fn((req, res) => res.status(201).json({ ok: true })),
	createFinalInvoiceFromServiceCall: jest.fn((req, res) => res.status(201).json({ ok: true })),
	recordPayment: jest.fn((req, res) => res.status(200).json({ ok: true })),
	updateInvoice: jest.fn((req, res) => res.status(200).json({ ok: true })),
	updateInvoiceWorkflowStatus: jest.fn((req, res) => res.status(200).json({ ok: true })),
	finalizeInvoice: jest.fn((req, res) => res.status(200).json({ ok: true })),
	sendInvoice: jest.fn((req, res) => res.status(200).json({ ok: true })),
	deleteInvoice: jest.fn((req, res) => res.status(200).json({ ok: true })),
	generateInvoicePDF: jest.fn((req, res) => res.status(200).send('pdf')),
	generateSharedInvoicePDF: jest.fn((req, res) => res.status(200).send('shared-pdf')),
	generateReceiptPDF: jest.fn((req, res) => res.status(200).send('receipt')),
	getSharedInvoiceDetails: jest.fn((req, res) => res.status(200).json({ public: true })),
	submitSharedInvoiceDecision: jest.fn((req, res) => res.status(200).json({ decision: 'ok' })),
};

await jest.unstable_mockModule('../../../controllers/invoice.controller.js', () => ({
	__esModule: true,
	...handlers,
}));

const protect = jest.fn((req, res, next) => next());
await jest.unstable_mockModule('../../../middleware/auth.middleware.js', () => ({
	__esModule: true,
	protect,
}));

const invoiceRoutes = (await import('../../../routes/invoice.routes.js')).default;

const app = express();
app.use(express.json());
app.use('/api/invoices', invoiceRoutes);

describe('Invoice Routes', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('public share route does not require auth middleware', async () => {
		const response = await request(app).get('/api/invoices/share/token-1');

		expect(response.status).toBe(200);
		expect(handlers.getSharedInvoiceDetails).toHaveBeenCalled();
		expect(protect).not.toHaveBeenCalled();
	});

	test('private route uses auth middleware and controller handler', async () => {
		const response = await request(app).get('/api/invoices');

		expect(response.status).toBe(200);
		expect(protect).toHaveBeenCalled();
		expect(handlers.getInvoices).toHaveBeenCalled();
	});
});