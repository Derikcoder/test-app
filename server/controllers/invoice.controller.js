import Invoice from '../models/Invoice.model.js';
import ServiceCall from '../models/ServiceCall.model.js';
import Customer from '../models/Customer.model.js';
import { logError, logInfo } from '../middleware/logger.middleware.js';

/**
 * @file invoice.controller.js
 * @description Invoice management controller for billing and payment tracking
 * @module Controllers/Invoice
 * 
 * Handles all invoice operations including:
 * - Invoice CRUD (Create, Read, Update, Delete)
 * - Payment recording (multiple payments per invoice)
 * - Payment status tracking (unpaid/partial/paid/overdue)
 * - Balance calculation
 * - PDF generation
 */

// @desc    Get all invoices
// @route   GET /api/invoices
// @access  Private
export const getInvoices = async (req, res) => {
  try {
    const { status, customer, paymentStatus } = req.query;
    
    // Build filter
    const filter = { createdBy: req.user._id };
    if (status) filter.status = status;
    if (customer) filter.customer = customer;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    
    const invoices = await Invoice.find(filter)
      .populate('customer', 'businessName contactFirstName contactLastName customerId customerType')
      .populate('serviceCall', 'callNumber title status')
      .populate('quotation', 'quotationNumber title')
      .populate('equipment', 'equipmentId equipmentType brand model')
      .sort({ createdAt: -1 });
    
    res.json(invoices);
  } catch (error) {
    logError('Get invoices error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single invoice by ID
// @route   GET /api/invoices/:id
// @access  Private
export const getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    })
      .populate('customer')
      .populate('serviceCall')
      .populate('quotation')
      .populate('equipment')
      .populate('payments.recordedBy', 'userName email');

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    res.json(invoice);
  } catch (error) {
    logError('Get invoice by ID error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get invoices by payment status
// @route   GET /api/invoices/payment-status/:status
// @access  Private
export const getInvoicesByPaymentStatus = async (req, res) => {
  try {
    const { status } = req.params;
    
    const validStatuses = ['unpaid', 'partial', 'paid', 'overdue'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        message: `Invalid payment status. Must be one of: ${validStatuses.join(', ')}` 
      });
    }
    
    const invoices = await Invoice.find({
      paymentStatus: status,
      createdBy: req.user._id
    })
      .populate('customer', 'businessName contactFirstName contactLastName customerId')
      .populate('serviceCall', 'callNumber title')
      .sort({ dueDate: 1 }); // Sort by due date (oldest first)
    
    res.json(invoices);
  } catch (error) {
    logError('Get invoices by payment status error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get overdue invoices summary
// @route   GET /api/invoices/overdue/summary
// @access  Private
export const getOverdueInvoicesSummary = async (req, res) => {
  try {
    const overdueInvoices = await Invoice.find({
      paymentStatus: 'overdue',
      createdBy: req.user._id
    })
      .populate('customer', 'businessName contactFirstName contactLastName customerId contactPhone email');
    
    const totalOverdueAmount = overdueInvoices.reduce((sum, invoice) => sum + invoice.balance, 0);
    const overdueByCustomer = {};
    
    overdueInvoices.forEach(invoice => {
      const customerId = invoice.customer._id.toString();
      if (!overdueByCustomer[customerId]) {
        overdueByCustomer[customerId] = {
          customer: invoice.customer,
          invoices: [],
          totalOverdue: 0
        };
      }
      overdueByCustomer[customerId].invoices.push({
        invoiceNumber: invoice.invoiceNumber,
        totalAmount: invoice.totalAmount,
        balance: invoice.balance,
        dueDate: invoice.dueDate,
        daysOverdue: Math.floor((new Date() - new Date(invoice.dueDate)) / (1000 * 60 * 60 * 24))
      });
      overdueByCustomer[customerId].totalOverdue += invoice.balance;
    });
    
    res.json({
      summary: {
        totalOverdueInvoices: overdueInvoices.length,
        totalOverdueAmount: totalOverdueAmount.toFixed(2),
        customersWithOverdue: Object.keys(overdueByCustomer).length
      },
      overdueByCustomer: Object.values(overdueByCustomer)
    });
  } catch (error) {
    logError('Get overdue invoices summary error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new invoice from service call
// @route   POST /api/invoices
// @access  Private
export const createInvoice = async (req, res) => {
  try {
    const {
      serviceCall: serviceCallId,
      quotation,
      customer,
      siteId,
      equipment,
      title,
      description,
      lineItems,
      laborCost,
      partsCost,
      serviceDate,
      paymentTerms,
      bankDetails,
      notes
    } = req.body;

    // Validate required fields
    if (!serviceCallId || !customer || !lineItems || lineItems.length === 0) {
      return res.status(400).json({ 
        message: 'Service call, customer, and at least one line item are required' 
      });
    }

    // Validate service call exists and is completed
    const serviceCall = await ServiceCall.findOne({
      _id: serviceCallId,
      createdBy: req.user._id
    });

    if (!serviceCall) {
      return res.status(404).json({ message: 'Service call not found' });
    }

    if (serviceCall.status !== 'completed') {
      return res.status(409).json({ 
        message: 'Cannot create invoice for incomplete service call. Mark as completed first.' 
      });
    }

    // Check if invoice already exists for this service call
    const existingInvoice = await Invoice.findOne({ serviceCall: serviceCallId });
    if (existingInvoice) {
      return res.status(409).json({ 
        message: 'Invoice already exists for this service call',
        invoice: existingInvoice
      });
    }

    // Validate customer exists
    const customerExists = await Customer.findOne({
      _id: customer,
      createdBy: req.user._id
    });

    if (!customerExists) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Validate line items structure
    const invalidLineItems = lineItems.filter(
      item => !item.description || !item.quantity || !item.unitPrice
    );

    if (invalidLineItems.length > 0) {
      return res.status(400).json({ 
        message: 'Each line item must have description, quantity, and unitPrice' 
      });
    }

    // Calculate line item totals
    const calculatedLineItems = lineItems.map(item => ({
      ...item,
      total: item.quantity * item.unitPrice
    }));

    const invoice = await Invoice.create({
      serviceCall: serviceCallId,
      quotation,
      customer,
      siteId,
      equipment,
      title: title || serviceCall.title,
      description: description || serviceCall.description,
      lineItems: calculatedLineItems,
      laborCost: laborCost || 0,
      partsCost: partsCost || 0,
      serviceDate: serviceDate || serviceCall.completedDate || new Date(),
      paymentTerms: paymentTerms || 30,
      bankDetails,
      notes,
      createdBy: req.user._id
    });

    // Update service call status to invoiced and link invoice
    serviceCall.status = 'invoiced';
    serviceCall.invoice = invoice._id;
    serviceCall.invoicedDate = new Date();
    await serviceCall.save();

    // Populate invoice details
    await invoice.populate('customer', 'businessName contactFirstName contactLastName');
    await invoice.populate('serviceCall', 'callNumber title');
    if (equipment) {
      await invoice.populate('equipment', 'equipmentId equipmentType brand model');
    }

    logInfo(`✅ Invoice created: ${invoice.invoiceNumber} for service call ${serviceCall.callNumber}`);
    res.status(201).json(invoice);
  } catch (error) {
    logError('Create invoice error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Record payment for invoice
// @route   POST /api/invoices/:id/payment
// @access  Private
export const recordPayment = async (req, res) => {
  try {
    const { amount, date, method, reference, notes } = req.body;

    // Validate required fields
    if (!amount || !method) {
      return res.status(400).json({ 
        message: 'Payment amount and method are required' 
      });
    }

    const invoice = await Invoice.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Validate payment amount
    if (amount <= 0) {
      return res.status(400).json({ message: 'Payment amount must be greater than 0' });
    }

    if (amount > invoice.balance) {
      return res.status(400).json({ 
        message: `Payment amount (${amount}) exceeds invoice balance (${invoice.balance})` 
      });
    }

    // Record payment using model method
    invoice.addPayment({
      amount,
      date: date || new Date(),
      method,
      reference,
      notes,
      recordedBy: req.user._id
    });

    const updatedInvoice = await invoice.save();
    await updatedInvoice.populate('customer', 'businessName contactFirstName contactLastName');
    await updatedInvoice.populate('payments.recordedBy', 'userName email');

    logInfo(`✅ Payment recorded for invoice ${updatedInvoice.invoiceNumber}: ${amount} (${method})`);
    res.json(updatedInvoice);
  } catch (error) {
    logError('Record payment error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update invoice
// @route   PUT /api/invoices/:id
// @access  Private
export const updateInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Prevent editing if invoice is paid
    if (invoice.paymentStatus === 'paid') {
      return res.status(409).json({ 
        message: 'Cannot edit fully paid invoice' 
      });
    }

    // Check if trying to update immutable fields
    const attemptedImmutableUpdates = Invoice.IMMUTABLE_FIELDS.filter(
      field => req.body[field] !== undefined && String(req.body[field]) !== String(invoice[field])
    );

    if (attemptedImmutableUpdates.length > 0) {
      return res.status(403).json({
        message: 'Cannot update protected fields',
        protectedFields: attemptedImmutableUpdates
      });
    }

    // Recalculate line item totals if line items are being updated
    if (req.body.lineItems) {
      req.body.lineItems = req.body.lineItems.map(item => ({
        ...item,
        total: item.quantity * item.unitPrice
      }));
    }

    // Update editable fields
    Invoice.EDITABLE_FIELDS.forEach(field => {
      if (req.body[field] !== undefined) {
        invoice[field] = req.body[field];
      }
    });

    const updatedInvoice = await invoice.save();
    await updatedInvoice.populate('customer', 'businessName contactFirstName contactLastName');

    logInfo(`✅ Invoice updated: ${updatedInvoice.invoiceNumber}`);
    res.json(updatedInvoice);
  } catch (error) {
    logError('Update invoice error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete invoice
// @route   DELETE /api/invoices/:id
// @access  Private
export const deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Prevent deletion if any payments have been made
    if (invoice.payments && invoice.payments.length > 0) {
      return res.status(409).json({ 
        message: 'Cannot delete invoice with payment history',
        paymentCount: invoice.payments.length,
        paidAmount: invoice.paidAmount
      });
    }

    // Update service call to remove invoice reference
    if (invoice.serviceCall) {
      await ServiceCall.updateOne(
        { _id: invoice.serviceCall },
        { $unset: { invoice: 1, invoicedDate: 1 }, status: 'completed' }
      );
    }

    await invoice.deleteOne();
    logInfo(`✅ Invoice deleted: ${invoice.invoiceNumber}`);
    res.json({ message: 'Invoice removed successfully' });
  } catch (error) {
    logError('Delete invoice error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Generate PDF for invoice (placeholder)
// @route   GET /api/invoices/:id/pdf
// @access  Private
export const generateInvoicePDF = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    })
      .populate('customer')
      .populate('serviceCall')
      .populate('equipment');

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // TODO: Implement PDF generation using a library like pdfkit or puppeteer
    // For now, return the invoice data that would be used in PDF generation
    
    logInfo(`📄 PDF generation requested for invoice: ${invoice.invoiceNumber}`);
    
    res.json({
      message: 'PDF generation feature coming soon',
      invoice: {
        invoiceNumber: invoice.invoiceNumber,
        title: invoice.title,
        customer: invoice.customer,
        lineItems: invoice.lineItems,
        laborCost: invoice.laborCost,
        partsCost: invoice.partsCost,
        subtotal: invoice.subtotal,
        vatAmount: invoice.vatAmount,
        totalAmount: invoice.totalAmount,
        paidAmount: invoice.paidAmount,
        balance: invoice.balance,
        paymentStatus: invoice.paymentStatus,
        dueDate: invoice.dueDate,
        bankDetails: invoice.bankDetails
      }
    });
  } catch (error) {
    logError('Generate invoice PDF error:', error);
    res.status(500).json({ message: error.message });
  }
};
