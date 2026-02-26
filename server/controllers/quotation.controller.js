import Quotation from '../models/Quotation.model.js';
import ServiceCall from '../models/ServiceCall.model.js';
import Customer from '../models/Customer.model.js';
import { logError, logInfo } from '../middleware/logger.middleware.js';

/**
 * @file quotation.controller.js
 * @description Quotation/estimate management controller
 * @module Controllers/Quotation
 * 
 * Handles all quotation operations including:
 * - Quotation CRUD (Create, Read, Update, Delete)
 * - Status workflow management (draft → sent → approved/rejected)
 * - Conversion to service calls
 * - PDF generation
 */

// @desc    Get all quotations
// @route   GET /api/quotations
// @access  Private
export const getQuotations = async (req, res) => {
  try {
    const { status, customer } = req.query;
    
    // Build filter
    const filter = { createdBy: req.user._id };
    if (status) filter.status = status;
    if (customer) filter.customer = customer;
    
    const quotations = await Quotation.find(filter)
      .populate('customer', 'businessName contactFirstName contactLastName customerId customerType')
      .populate('equipment', 'equipmentId equipmentType brand model')
      .populate('convertedToServiceCall', 'callNumber status')
      .sort({ createdAt: -1 });
    
    res.json(quotations);
  } catch (error) {
    logError('Get quotations error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single quotation by ID
// @route   GET /api/quotations/:id
// @access  Private
export const getQuotationById = async (req, res) => {
  try {
    const quotation = await Quotation.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    })
      .populate('customer')
      .populate('equipment')
      .populate('convertedToServiceCall');

    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    res.json(quotation);
  } catch (error) {
    logError('Get quotation by ID error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new quotation
// @route   POST /api/quotations
// @access  Private
export const createQuotation = async (req, res) => {
  try {
    const {
      customer,
      siteId,
      equipment,
      title,
      description,
      lineItems,
      validUntil,
      terms,
      notes
    } = req.body;

    // Validate required fields
    if (!customer || !title || !lineItems || lineItems.length === 0) {
      return res.status(400).json({ 
        message: 'Customer, title, and at least one line item are required' 
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

    // Validate site if provided (for business customers)
    if (siteId && customerExists.customerType === 'business') {
      const siteExists = customerExists.sites.some(site => site._id.toString() === siteId);
      if (!siteExists) {
        return res.status(404).json({ message: 'Site not found for this customer' });
      }
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

    const quotation = await Quotation.create({
      customer,
      siteId,
      equipment,
      title,
      description,
      lineItems: calculatedLineItems,
      validUntil,
      terms,
      notes,
      createdBy: req.user._id
    });

    // Populate customer details
    await quotation.populate('customer', 'businessName contactFirstName contactLastName');
    if (equipment) {
      await quotation.populate('equipment', 'equipmentId equipmentType brand model');
    }

    logInfo(`✅ Quotation created: ${quotation.quotationNumber}`);
    res.status(201).json(quotation);
  } catch (error) {
    logError('Create quotation error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update quotation
// @route   PUT /api/quotations/:id
// @access  Private
export const updateQuotation = async (req, res) => {
  try {
    const quotation = await Quotation.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    // Prevent editing if already converted or approved
    if (quotation.status === 'converted') {
      return res.status(409).json({ 
        message: 'Cannot edit quotation that has been converted to a service call' 
      });
    }

    if (quotation.status === 'approved' && req.body.lineItems) {
      return res.status(409).json({ 
        message: 'Cannot edit line items of an approved quotation. Create a new quotation instead.' 
      });
    }

    // Check if trying to update immutable fields
    const attemptedImmutableUpdates = Quotation.IMMUTABLE_FIELDS.filter(
      field => req.body[field] !== undefined && String(req.body[field]) !== String(quotation[field])
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
    Quotation.EDITABLE_FIELDS.forEach(field => {
      if (req.body[field] !== undefined) {
        quotation[field] = req.body[field];
      }
    });

    const updatedQuotation = await quotation.save();
    await updatedQuotation.populate('customer', 'businessName contactFirstName contactLastName');
    if (updatedQuotation.equipment) {
      await updatedQuotation.populate('equipment', 'equipmentId equipmentType brand model');
    }

    logInfo(`✅ Quotation updated: ${updatedQuotation.quotationNumber}`);
    res.json(updatedQuotation);
  } catch (error) {
    logError('Update quotation error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update quotation status
// @route   PATCH /api/quotations/:id/status
// @access  Private
export const updateQuotationStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const quotation = await Quotation.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    // Validate status transition
    const validStatuses = ['draft', 'sent', 'approved', 'rejected', 'expired'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      });
    }

    // Prevent status changes if already converted
    if (quotation.status === 'converted') {
      return res.status(409).json({ 
        message: 'Cannot change status of a converted quotation' 
      });
    }

    // Update status and related date fields
    quotation.status = status;
    
    if (status === 'sent' && !quotation.sentDate) {
      quotation.sentDate = new Date();
    } else if (status === 'approved' && !quotation.approvedDate) {
      quotation.approvedDate = new Date();
    } else if (status === 'rejected' && !quotation.rejectedDate) {
      quotation.rejectedDate = new Date();
    }

    const updatedQuotation = await quotation.save();
    await updatedQuotation.populate('customer', 'businessName contactFirstName contactLastName');

    logInfo(`✅ Quotation status updated: ${updatedQuotation.quotationNumber} → ${status}`);
    res.json(updatedQuotation);
  } catch (error) {
    logError('Update quotation status error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Convert quotation to service call
// @route   POST /api/quotations/:id/convert
// @access  Private
export const convertQuotationToServiceCall = async (req, res) => {
  try {
    const { assignedAgent, scheduledDate, priority } = req.body;

    const quotation = await Quotation.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    // Validate quotation status
    if (quotation.status !== 'approved') {
      return res.status(409).json({ 
        message: 'Only approved quotations can be converted to service calls' 
      });
    }

    if (quotation.status === 'converted') {
      return res.status(409).json({ 
        message: 'This quotation has already been converted to a service call' 
      });
    }

    // Create service call from quotation
    const serviceCall = await ServiceCall.create({
      customer: quotation.customer,
      siteId: quotation.siteId,
      equipment: quotation.equipment,
      quotation: quotation._id,
      assignedAgent,
      title: quotation.title,
      description: quotation.description,
      priority: priority || 'medium',
      status: 'pending',
      serviceType: 'Scheduled Maintenance', // Default, can be customized
      scheduledDate: scheduledDate || new Date(),
      agentNotes: quotation.notes,
      createdByRole: 'superadmin',
      createdBy: req.user._id
    });

    // Update quotation status
    quotation.status = 'converted';
    quotation.convertedToServiceCall = serviceCall._id;
    quotation.convertedDate = new Date();
    await quotation.save();

    // Populate service call details
    await serviceCall.populate('customer', 'businessName contactFirstName contactLastName');
    await serviceCall.populate('assignedAgent', 'firstName lastName employeeId');

    logInfo(`✅ Quotation converted to service call: ${quotation.quotationNumber} → ${serviceCall.callNumber}`);
    res.status(201).json({
      message: 'Quotation successfully converted to service call',
      serviceCall,
      quotation
    });
  } catch (error) {
    logError('Convert quotation to service call error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete quotation
// @route   DELETE /api/quotations/:id
// @access  Private
export const deleteQuotation = async (req, res) => {
  try {
    const quotation = await Quotation.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    // Prevent deletion if already converted or approved
    if (quotation.status === 'converted') {
      return res.status(409).json({ 
        message: 'Cannot delete quotation that has been converted to a service call' 
      });
    }

    if (quotation.status === 'approved') {
      return res.status(409).json({ 
        message: 'Cannot delete approved quotation. Reject it first if needed.' 
      });
    }

    await quotation.deleteOne();
    logInfo(`✅ Quotation deleted: ${quotation.quotationNumber}`);
    res.json({ message: 'Quotation removed successfully' });
  } catch (error) {
    logError('Delete quotation error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Generate PDF for quotation (placeholder)
// @route   GET /api/quotations/:id/pdf
// @access  Private
export const generateQuotationPDF = async (req, res) => {
  try {
    const quotation = await Quotation.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    })
      .populate('customer')
      .populate('equipment');

    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    // TODO: Implement PDF generation using a library like pdfkit or puppeteer
    // For now, return the quotation data that would be used in PDF generation
    
    logInfo(`📄 PDF generation requested for quotation: ${quotation.quotationNumber}`);
    
    res.json({
      message: 'PDF generation feature coming soon',
      quotation: {
        quotationNumber: quotation.quotationNumber,
        title: quotation.title,
        customer: quotation.customer,
        lineItems: quotation.lineItems,
        subtotal: quotation.subtotal,
        vatAmount: quotation.vatAmount,
        totalAmount: quotation.totalAmount,
        validUntil: quotation.validUntil,
        terms: quotation.terms
      }
    });
  } catch (error) {
    logError('Generate quotation PDF error:', error);
    res.status(500).json({ message: error.message });
  }
};
