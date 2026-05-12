/**
 * @file invoice.controller.test.mjs
 * @description Unit tests for public shared invoice controller endpoints (ESM, top-level await)
 */
import { jest } from '@jest/globals';
import { createMockInvoice } from '../__mocks__/factories/invoice.factory.js';

// Always mock logger.middleware.js before any controller import to avoid ESM import.meta.url errors
await jest.unstable_mockModule('../../../middleware/logger.middleware.js', () => ({ __esModule: true, logError: jest.fn(), logInfo: jest.fn() }));

// Mock all model and service dependencies before importing the controller
await jest.unstable_mockModule('../../../models/Invoice.model.js', () => ({ __esModule: true, default: {} }));
await jest.unstable_mockModule('../../../models/Quotation.model.js', () => ({ __esModule: true, default: {} }));
await jest.unstable_mockModule('../../../models/ServiceCall.model.js', () => ({ __esModule: true, default: {} }));
await jest.unstable_mockModule('../../../models/User.model.js', () => ({ __esModule: true, default: {} }));
await jest.unstable_mockModule('../../../utils/emailService.js', () => ({ __esModule: true, sendInvoiceDocumentEmail: jest.fn() }));

const controller = await import('../../../controllers/invoice.controller.js');
const createFinalInvoiceFromServiceCall = controller.createFinalInvoiceFromServiceCall;
const finalizeInvoice = controller.finalizeInvoice;
const getInvoices = controller.getInvoices;
const getSharedInvoiceDetails = controller.getSharedInvoiceDetails;
const recordPayment = controller.recordPayment;
const sendInvoice = controller.sendInvoice;
const submitSharedInvoiceDecision = controller.submitSharedInvoiceDecision;
const upsertProFormaInvoiceFromServiceCall = controller.upsertProFormaInvoiceFromServiceCall;

const Invoice = (await import('../../../models/Invoice.model.js')).default;
const Quotation = (await import('../../../models/Quotation.model.js')).default;
const ServiceCall = (await import('../../../models/ServiceCall.model.js')).default;
const User = (await import('../../../models/User.model.js')).default;
const sendInvoiceDocumentEmail = (await import('../../../utils/emailService.js')).sendInvoiceDocumentEmail;

describe('Invoice Controller - Public Share Endpoints', () => {

  let req, res;
  // Helper for building populate query mocks
  const buildPopulateQuery = (result) => {
    const query = { populate: jest.fn() };
    query.populate
      .mockReturnValueOnce(query)
      .mockReturnValueOnce(query)
      .mockReturnValueOnce(query)
      .mockReturnValueOnce(Promise.resolve(result));
    return query;
  };

  beforeEach(() => {
    req = {
      params: { token: 'share-token-123' },
      body: {},
      protocol: 'https',
      get: jest.fn().mockReturnValue('field.example.com'),
      user: { _id: 'user-1', role: 'customer' },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    // Default Invoice model mocks
    Invoice.findOne = jest.fn().mockResolvedValue({ _id: 'invoice-123', save: jest.fn(), ...createMockInvoice({ id: 'invoice-123' }) });
    Invoice.findById = jest.fn().mockResolvedValue({ _id: 'invoice-123', save: jest.fn(), ...createMockInvoice({ id: 'invoice-123' }) });
    jest.clearAllMocks();
  });

  describe('createFinalInvoiceFromServiceCall', () => {
    it('creates a final invoice from a service call (happy path)', async () => {
      // Mock ServiceCall.findOne to return a chainable populate
      const serviceCall = { _id: 'serviceCall-1', save: jest.fn() };
      let scPopulate;
      scPopulate = jest.fn().mockImplementation(() => ({ populate: scPopulate, ...serviceCall }));
      ServiceCall.findOne = jest.fn(() => ({ populate: scPopulate }));

      // Mock Invoice.findOne to return a chainable populate with save
      const invoice = { _id: 'invoice-123', save: jest.fn(), invoiceNumber: 'INV-123', workflowStatus: 'draft', ...createMockInvoice({ id: 'invoice-123' }) };
      let invPopulate;
      invPopulate = jest.fn().mockImplementation(() => ({ populate: invPopulate, ...invoice }));
      const invChain = invPopulate();
      invChain.save = invoice.save;
      Invoice.findOne = jest.fn(() => ({ populate: () => invChain }));

      await createFinalInvoiceFromServiceCall(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        created: expect.any(Boolean),
        invoice: expect.objectContaining({ invoiceNumber: expect.any(String), workflowStatus: expect.any(String) })
      }));
    });
    // Add more edge case tests here as needed
  });

  describe('finalizeInvoice', () => {
    it('finalizes an invoice (happy path)', async () => {
      // Mock ServiceCall.findOne to return a chainable populate with save, always returning the same object
      const serviceCall = { _id: 'serviceCall-1', save: jest.fn() };
      const scPopulateChain = { populate: undefined };
      scPopulateChain.populate = jest.fn(() => scPopulateChain);
      Object.setPrototypeOf(scPopulateChain, serviceCall);
      ServiceCall.findOne = jest.fn(() => scPopulateChain);

      // Mock Invoice.findOne to return a chainable populate that always returns the SAME invoice object
      const invoice = { _id: 'invoice-123', save: jest.fn(), invoiceNumber: 'INV-123', workflowStatus: 'draft', addPayment: jest.fn(), ...createMockInvoice({ id: 'invoice-123' }) };
      const populateChain = { populate: undefined };
      populateChain.populate = jest.fn(() => populateChain);
      Invoice.findOne = jest.fn(() => populateChain);
      Object.setPrototypeOf(populateChain, invoice);

      await finalizeInvoice(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ invoiceNumber: expect.any(String), workflowStatus: expect.any(String) }));
    });
  });

  describe('getInvoices', () => {
    it('returns invoices for the user', async () => {
      req.query = {};
      // Mock Invoice.find to support .sort().populate() x4 then returns a plain array
      const invoicesArr = [{ _id: 'invoice-1', invoiceNumber: 'INV-1', workflowStatus: 'draft' }];
      const populateChain = { populate: undefined };
      populateChain.populate = jest.fn(() => invoicesArr);
      const sort = jest.fn().mockReturnValue(populateChain);
      Invoice.find = jest.fn().mockReturnValue({ sort });
      await getInvoices(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.anything());
    });
  });

  describe('getSharedInvoiceDetails', () => {
    it('returns shared invoice details for a valid token', async () => {
      // Mock Invoice.findOne to return a chainable populate (supports .populate().populate())
      const invoice = { _id: 'invoice-123', save: jest.fn(), customer: { email: 'customer@example.com', phoneNumber: '0800001234' }, ...createMockInvoice({ id: 'invoice-123' }) };
      const populate = jest.fn();
      populate.mockReturnValue({ populate: populate, ...invoice });
      Invoice.findOne = jest.fn(() => ({ populate }));
      await getSharedInvoiceDetails(req, res);
      expect(populate).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ invoiceNumber: expect.any(String), workflowStatus: expect.any(String) }));
    });
  });

  describe('recordPayment', () => {
    it('records a payment for an invoice', async () => {
      req.body.amount = 100;
      req.body.method = 'cash';
      // Add addPayment mock to invoice and support chainable populate
      const invoice = {
        _id: 'invoice-123',
        save: jest.fn(),
        addPayment: jest.fn().mockResolvedValue(true),
        customer: { email: 'customer@example.com', phoneNumber: '0800001234' },
        receipts: [],
        ...createMockInvoice({ id: 'invoice-123' })
      };
      const populateChain = { populate: undefined };
      populateChain.populate = jest.fn(() => populateChain);
      Invoice.findOne = jest.fn(() => populateChain);
      Object.setPrototypeOf(populateChain, invoice);
      await recordPayment(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ receipts: expect.any(Array) }));
    });
  });

  describe('sendInvoice', () => {
    it('sends an invoice to the customer', async () => {
      // Mock Invoice.findOne to return a chainable populate (supports .populate().populate())
      const invoice = { _id: 'invoice-123', save: jest.fn(), customer: { email: 'customer@example.com', phoneNumber: '0800001234' }, lineItems: [], ...createMockInvoice({ id: 'invoice-123' }) };
      const populate = jest.fn();
      populate.mockReturnValue({ populate: populate, ...invoice });
      Invoice.findOne = jest.fn(() => ({ populate }));
      await sendInvoice(req, res);
      expect(populate).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String), documentNumber: expect.any(String) }));
    });
  });

  describe('submitSharedInvoiceDecision', () => {
    it('submits a shared invoice decision (approve/reject)', async () => {
      // Ensure Invoice.findOne returns a valid invoice
      Invoice.findOne = jest.fn().mockResolvedValue({ _id: 'invoice-123', save: jest.fn(), ...createMockInvoice({ id: 'invoice-123' }) });
      // Mock ServiceCall.findOne as required by controller
      ServiceCall.findOne = jest.fn().mockResolvedValue({ _id: 'serviceCall-1', save: jest.fn() });
      req.body.decision = 'approved';
      await submitSharedInvoiceDecision(req, res);
      // The actual controller returns an invoice object, not just id
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ invoiceNumber: expect.any(String), message: expect.any(String), workflowStatus: expect.any(String) }));
    });
  });

  describe('upsertProFormaInvoiceFromServiceCall', () => {
    it('upserts a pro-forma invoice from a service call', async () => {
      // Mock ServiceCall and Invoice as needed
      req.params.serviceCallId = 'serviceCall-1';
      ServiceCall.findOne = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue({
              _id: 'serviceCall-1',
              callNumber: 'SC-0001',
              createdBy: 'user-1',
              customer: { _id: 'customer-1' },
              save: jest.fn(),
            }),
          }),
        }),
      });
      Invoice.create = jest.fn().mockResolvedValue({ _id: 'invoice-123', invoiceNumber: 'INV-123' });
      Invoice.findOne = jest.fn()
        .mockReturnValueOnce(buildPopulateQuery(null))
        .mockReturnValueOnce(buildPopulateQuery({ _id: 'invoice-123', save: jest.fn(), ...createMockInvoice({ id: 'invoice-123' }) }));
      await upsertProFormaInvoiceFromServiceCall(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ created: expect.any(Boolean), invoice: expect.anything() }));
    });
  });
});
