import Quotation from '../models/Quotation.model.js';
import ServiceCall from '../models/ServiceCall.model.js';
import Customer from '../models/Customer.model.js';
import { logError, logInfo } from '../middleware/logger.middleware.js';

const buildTemplateLineItems = ({ machineModelNumber = '', serviceType = '' }) => {
  const model = String(machineModelNumber).toLowerCase();
  const type = String(serviceType).toLowerCase();

  if (model.includes('perkins')) {
    return [
      { description: 'Perkins service kit and filters', quantity: 1, unitPrice: 1850 },
      { description: 'Engine oil replacement and disposal', quantity: 1, unitPrice: 1250 },
      { description: 'Load test and diagnostics report', quantity: 1, unitPrice: 1450 },
    ];
  }

  if (model.includes('cummins')) {
    return [
      { description: 'Cummins preventive service kit', quantity: 1, unitPrice: 2100 },
      { description: 'Cooling and fuel system checks', quantity: 1, unitPrice: 1350 },
      { description: 'Controller diagnostics and tuning', quantity: 1, unitPrice: 1650 },
    ];
  }

  if (type.includes('emergency')) {
    return [
      { description: 'Emergency call-out labor', quantity: 2, unitPrice: 950 },
      { description: 'Fault finding and root-cause analysis', quantity: 1, unitPrice: 1400 },
      { description: 'Temporary restoration and safety checks', quantity: 1, unitPrice: 950 },
    ];
  }

  return [
    { description: 'Generator inspection and diagnostics', quantity: 1, unitPrice: 1100 },
    { description: 'Preventive service labor', quantity: 2, unitPrice: 850 },
    { description: 'Consumables and replacement filters', quantity: 1, unitPrice: 950 },
  ];
};

const normalizePartLineItems = (lineItems = []) => {
  return lineItems.map((item) => ({
    ...item,
    partNumber: item.partNumber ? String(item.partNumber).trim() : undefined,
    quantity: Number(item.quantity),
    unitPrice: Number(item.unitPrice),
    total: Number(item.quantity) * Number(item.unitPrice),
  }));
};

const DEFAULT_TRAVEL_RATE_PER_KM = 8.5;

const getDefaultValidUntilDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  return date;
};

const calculateQuotationCosts = ({
  lineItems = [],
  partsFulfilmentMode,
  deliveryProvider,
  partsProcurementCost,
  thirdPartyDeliveryCost,
  labourHours,
  labourRate,
  travellingCost,
  distanceTravelledKm,
  travelRatePerKm,
  timeTravelledCost,
  consumablesRate,
  isSuperUser = false,
}) => {
  const normalizedLineItems = normalizePartLineItems(lineItems);

  const partsCost = normalizedLineItems.reduce((sum, item) => sum + item.total, 0);
  const resolvedPartsFulfilmentMode = partsFulfilmentMode === 'thirdPartyDelivery'
    ? 'thirdPartyDelivery'
    : 'inHouseProcurement';
  const resolvedDeliveryProvider = resolvedPartsFulfilmentMode === 'thirdPartyDelivery'
    ? String(deliveryProvider || '').trim()
    : '';
  const resolvedPartsProcurementCost = Number.isFinite(Number(partsProcurementCost)) ? Number(partsProcurementCost) : 0;
  const resolvedThirdPartyDeliveryCost = resolvedPartsFulfilmentMode === 'thirdPartyDelivery'
    ? (Number.isFinite(Number(thirdPartyDeliveryCost)) ? Number(thirdPartyDeliveryCost) : 0)
    : 0;
  const estimatedPartsProfit = Number((partsCost - resolvedPartsProcurementCost - resolvedThirdPartyDeliveryCost).toFixed(2));

  const resolvedLabourHours = Number.isFinite(Number(labourHours)) ? Number(labourHours) : 0;
  const requestedLabourRate = Number.isFinite(Number(labourRate)) ? Number(labourRate) : 650;
  const resolvedLabourRate = isSuperUser ? requestedLabourRate : 650;
  const resolvedDistanceTravelledKm = Number.isFinite(Number(distanceTravelledKm)) ? Number(distanceTravelledKm) : 0;
  const requestedTravelRatePerKm = Number.isFinite(Number(travelRatePerKm)) ? Number(travelRatePerKm) : DEFAULT_TRAVEL_RATE_PER_KM;
  const resolvedTravelRatePerKm = isSuperUser ? requestedTravelRatePerKm : DEFAULT_TRAVEL_RATE_PER_KM;
  const resolvedTimeTravelledCost = Number.isFinite(Number(timeTravelledCost))
    ? Number(timeTravelledCost)
    : Number.isFinite(Number(travellingCost))
      ? Number(travellingCost)
      : 0;
  const resolvedTravellingCost = Number(
    ((resolvedDistanceTravelledKm * resolvedTravelRatePerKm) + resolvedTimeTravelledCost).toFixed(2)
  );
  const resolvedConsumablesRate = Number.isFinite(Number(consumablesRate)) ? Number(consumablesRate) : 2;

  const labourCost = Number((resolvedLabourHours * resolvedLabourRate).toFixed(2));

  // Pricing rule (kept explicit for policy visibility):
  // if parts cost > 50% of labour cost => consumables = rate% of parts cost
  // if parts cost < 50% of labour cost => consumables = rate% of parts cost
  const partsVsLabourThreshold = labourCost * 0.5;
  const consumablesCost = partsCost > partsVsLabourThreshold
    ? Number((partsCost * (resolvedConsumablesRate / 100)).toFixed(2))
    : Number((partsCost * (resolvedConsumablesRate / 100)).toFixed(2));

  const subtotal = Number((partsCost + labourCost + consumablesCost + resolvedTravellingCost).toFixed(2));

  return {
    normalizedLineItems,
    partsFulfilmentMode: resolvedPartsFulfilmentMode,
    deliveryProvider: resolvedDeliveryProvider,
    partsProcurementCost: resolvedPartsProcurementCost,
    thirdPartyDeliveryCost: resolvedThirdPartyDeliveryCost,
    estimatedPartsProfit,
    partsCost,
    labourHours: resolvedLabourHours,
    labourRate: resolvedLabourRate,
    labourCost,
    consumablesRate: resolvedConsumablesRate,
    consumablesCost,
    distanceTravelledKm: resolvedDistanceTravelledKm,
    travelRatePerKm: resolvedTravelRatePerKm,
    timeTravelledCost: resolvedTimeTravelledCost,
    travellingCost: resolvedTravellingCost,
    subtotal,
  };
};

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
      serviceType,
      title,
      description,
      lineItems,
      partsFulfilmentMode,
      deliveryProvider,
      partsProcurementCost,
      thirdPartyDeliveryCost,
      labourHours,
      labourRate,
      travellingCost,
      distanceTravelledKm,
      travelRatePerKm,
      timeTravelledCost,
      consumablesRate,
      vatRate,
      validUntil,
      terms,
      notes
    } = req.body;

    // Validate required fields
    if (!customer || !serviceType || !title || !lineItems || lineItems.length === 0) {
      return res.status(400).json({ 
        message: 'Customer, serviceType, title, and at least one line item are required' 
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

    const costing = calculateQuotationCosts({
      lineItems,
      partsFulfilmentMode,
      deliveryProvider,
      partsProcurementCost,
      thirdPartyDeliveryCost,
      labourHours,
      labourRate,
      travellingCost,
      distanceTravelledKm,
      travelRatePerKm,
      timeTravelledCost,
      consumablesRate,
      isSuperUser: Boolean(req.user?.isSuperUser),
    });

    const resolvedVatRate = Number.isFinite(Number(vatRate)) ? Number(vatRate) : 15;
    const calculatedVatAmount = Number((costing.subtotal * (resolvedVatRate / 100)).toFixed(2));
    const calculatedTotalAmount = Number((costing.subtotal + calculatedVatAmount).toFixed(2));

    const quotation = await Quotation.create({
      customer,
      siteId,
      equipment,
      serviceType,
      title,
      description,
      lineItems: costing.normalizedLineItems,
      partsFulfilmentMode: costing.partsFulfilmentMode,
      deliveryProvider: costing.deliveryProvider,
      partsProcurementCost: costing.partsProcurementCost,
      thirdPartyDeliveryCost: costing.thirdPartyDeliveryCost,
      estimatedPartsProfit: costing.estimatedPartsProfit,
      partsCost: costing.partsCost,
      labourHours: costing.labourHours,
      labourRate: costing.labourRate,
      labourCost: costing.labourCost,
      consumablesRate: costing.consumablesRate,
      consumablesCost: costing.consumablesCost,
      distanceTravelledKm: costing.distanceTravelledKm,
      travelRatePerKm: costing.travelRatePerKm,
      timeTravelledCost: costing.timeTravelledCost,
      travellingCost: costing.travellingCost,
      subtotal: costing.subtotal,
      vatRate: resolvedVatRate,
      vatAmount: calculatedVatAmount,
      totalAmount: calculatedTotalAmount,
      validUntil: validUntil || getDefaultValidUntilDate(),
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

// @desc    Create quotation from a service call
// @route   POST /api/quotations/from-service-call/:serviceCallId
// @access  Private
export const createQuotationFromServiceCall = async (req, res) => {
  try {
    const { serviceCallId } = req.params;
    const {
      title,
      description,
      serviceType,
      lineItems,
      partsFulfilmentMode,
      deliveryProvider,
      partsProcurementCost,
      thirdPartyDeliveryCost,
      labourHours,
      labourRate,
      travellingCost,
      distanceTravelledKm,
      travelRatePerKm,
      timeTravelledCost,
      consumablesRate,
      vatRate,
      validUntil,
      terms,
      notes,
    } = req.body;

    const serviceCall = await ServiceCall.findOne({
      _id: serviceCallId,
      createdBy: req.user._id,
    });

    if (!serviceCall) {
      return res.status(404).json({ message: 'Service call not found' });
    }

    if (!serviceCall.customer) {
      return res.status(400).json({
        message: 'Service call is not linked to a customer. Select a customer and use standard quote creation.',
      });
    }

    const customerExists = await Customer.findOne({
      _id: serviceCall.customer,
      createdBy: req.user._id,
    });

    if (!customerExists) {
      return res.status(404).json({ message: 'Customer not found for this service call' });
    }

    const resolvedServiceType = serviceType || serviceCall.serviceType || 'Scheduled Maintenance';
    const machineModelNumber = serviceCall.bookingRequest?.generatorDetails?.machineModelNumber
      || serviceCall.bookingRequest?.generatorDetails?.generatorMakeModel
      || '';

    const requestedLineItems = Array.isArray(lineItems) && lineItems.length > 0
      ? lineItems
      : buildTemplateLineItems({ machineModelNumber, serviceType: resolvedServiceType });

    const invalidLineItems = requestedLineItems.filter(
      (item) => !item.description || !item.quantity || item.unitPrice === undefined || item.unitPrice === null
    );

    if (invalidLineItems.length > 0) {
      return res.status(400).json({
        message: 'Each line item must have description, quantity, and unitPrice',
      });
    }

    const costing = calculateQuotationCosts({
      lineItems: requestedLineItems,
      partsFulfilmentMode,
      deliveryProvider,
      partsProcurementCost,
      thirdPartyDeliveryCost,
      labourHours,
      labourRate,
      travellingCost,
      distanceTravelledKm,
      travelRatePerKm,
      timeTravelledCost,
      consumablesRate,
      isSuperUser: Boolean(req.user?.isSuperUser),
    });

    const resolvedVatRate = Number.isFinite(Number(vatRate)) ? Number(vatRate) : 15;
    const calculatedVatAmount = Number((costing.subtotal * (resolvedVatRate / 100)).toFixed(2));
    const calculatedTotalAmount = Number((costing.subtotal + calculatedVatAmount).toFixed(2));

    const quotation = await Quotation.create({
      customer: serviceCall.customer,
      siteId: serviceCall.siteId,
      equipment: serviceCall.equipment,
      serviceType: resolvedServiceType,
      title: title || `Quotation for ${serviceCall.callNumber || 'Service Call'}`,
      description: description || serviceCall.description || '',
      lineItems: costing.normalizedLineItems,
      partsFulfilmentMode: costing.partsFulfilmentMode,
      deliveryProvider: costing.deliveryProvider,
      partsProcurementCost: costing.partsProcurementCost,
      thirdPartyDeliveryCost: costing.thirdPartyDeliveryCost,
      estimatedPartsProfit: costing.estimatedPartsProfit,
      partsCost: costing.partsCost,
      labourHours: costing.labourHours,
      labourRate: costing.labourRate,
      labourCost: costing.labourCost,
      consumablesRate: costing.consumablesRate,
      consumablesCost: costing.consumablesCost,
      distanceTravelledKm: costing.distanceTravelledKm,
      travelRatePerKm: costing.travelRatePerKm,
      timeTravelledCost: costing.timeTravelledCost,
      travellingCost: costing.travellingCost,
      subtotal: costing.subtotal,
      vatRate: resolvedVatRate,
      vatAmount: calculatedVatAmount,
      totalAmount: calculatedTotalAmount,
      validUntil: validUntil || getDefaultValidUntilDate(),
      terms,
      notes,
      createdBy: req.user._id,
    });

    await quotation.populate('customer', 'businessName contactFirstName contactLastName');
    if (quotation.equipment) {
      await quotation.populate('equipment', 'equipmentId equipmentType brand model');
    }

    logInfo(`✅ Quotation created from service call: ${quotation.quotationNumber} (source: ${serviceCall.callNumber})`);
    res.status(201).json(quotation);
  } catch (error) {
    logError('Create quotation from service call error:', error);
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

    // Update editable fields
    Quotation.EDITABLE_FIELDS.forEach(field => {
      if (req.body[field] !== undefined) {
        quotation[field] = req.body[field];
      }
    });

    const shouldRecalculateFinancials = [
      'lineItems',
      'partsFulfilmentMode',
      'deliveryProvider',
      'partsProcurementCost',
      'thirdPartyDeliveryCost',
      'labourHours',
      'labourRate',
      'distanceTravelledKm',
      'travelRatePerKm',
      'timeTravelledCost',
      'travellingCost',
      'consumablesRate',
      'vatRate',
    ].some((field) => req.body[field] !== undefined);

    if (shouldRecalculateFinancials) {
      const costing = calculateQuotationCosts({
        lineItems: quotation.lineItems,
        partsFulfilmentMode: quotation.partsFulfilmentMode,
        deliveryProvider: quotation.deliveryProvider,
        partsProcurementCost: quotation.partsProcurementCost,
        thirdPartyDeliveryCost: quotation.thirdPartyDeliveryCost,
        labourHours: quotation.labourHours,
        labourRate: quotation.labourRate,
        distanceTravelledKm: quotation.distanceTravelledKm,
        travelRatePerKm: quotation.travelRatePerKm,
        timeTravelledCost: quotation.timeTravelledCost,
        travellingCost: quotation.travellingCost,
        consumablesRate: quotation.consumablesRate,
        isSuperUser: Boolean(req.user?.isSuperUser),
      });

      quotation.lineItems = costing.normalizedLineItems;
  quotation.partsFulfilmentMode = costing.partsFulfilmentMode;
  quotation.deliveryProvider = costing.deliveryProvider;
  quotation.partsProcurementCost = costing.partsProcurementCost;
  quotation.thirdPartyDeliveryCost = costing.thirdPartyDeliveryCost;
  quotation.estimatedPartsProfit = costing.estimatedPartsProfit;
      quotation.partsCost = costing.partsCost;
      quotation.labourHours = costing.labourHours;
      quotation.labourRate = costing.labourRate;
      quotation.labourCost = costing.labourCost;
      quotation.consumablesRate = costing.consumablesRate;
      quotation.consumablesCost = costing.consumablesCost;
      quotation.distanceTravelledKm = costing.distanceTravelledKm;
      quotation.travelRatePerKm = costing.travelRatePerKm;
      quotation.timeTravelledCost = costing.timeTravelledCost;
      quotation.travellingCost = costing.travellingCost;
      quotation.subtotal = costing.subtotal;

      const resolvedVatRate = Number.isFinite(Number(quotation.vatRate)) ? Number(quotation.vatRate) : 15;
      quotation.vatRate = resolvedVatRate;
      quotation.vatAmount = Number((quotation.subtotal * (resolvedVatRate / 100)).toFixed(2));
      quotation.totalAmount = Number((quotation.subtotal + quotation.vatAmount).toFixed(2));
    }

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
