import Quotation from '../models/Quotation.model.js';
import ServiceCall from '../models/ServiceCall.model.js';
import Customer from '../models/Customer.model.js';
import ServiceCallEmailLock from '../models/ServiceCallEmailLock.model.js';
import { resolveAutoMachineDataForQuote } from '../services/quotationAutoResolver.service.js';
import { logError, logInfo } from '../middleware/logger.middleware.js';
import PDFDocument from 'pdfkit';
import crypto from 'crypto';
import { sendQuotationEmail } from '../utils/emailService.js';

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
const CALL_OUT_FLOOR_DISTANCE_KM = 45;
const CALL_OUT_FLOOR_TIME_MINUTES = 30;
const CALL_OUT_FLOOR_AMOUNT = 650;
const INCLUDED_ASSESSMENT_MINUTES = 15;

const getDefaultValidUntilDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  return date;
};

const buildShareToken = () => crypto.randomBytes(24).toString('hex');

const getBaseUrl = (req) => {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL;
  return `${req.protocol}://${req.get('host')}`;
};

const normalizePhoneForWhatsApp = (phone) => {
  if (!phone) return '';
  const cleaned = String(phone).replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) return cleaned.slice(1);
  if (cleaned.startsWith('0') && cleaned.length === 10) return `27${cleaned.slice(1)}`;
  if (cleaned.startsWith('27')) return cleaned;
  return cleaned;
};

const buildTelegramShareUrl = ({ quotationNumber, shareUrl }) => {
  const message = `Quotation ${quotationNumber}\nView PDF: ${shareUrl}`;
  return `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(message)}`;
};

const generateQuotationPdfBuffer = (quotation) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).text('Appatunid Quotation', { align: 'left' });
    doc.moveDown(0.5);
    doc.fontSize(11).text(`Quotation Number: ${quotation.quotationNumber}`);
    doc.text(`Title: ${quotation.title || 'N/A'}`);
    doc.text(`Status: ${quotation.status}`);
    doc.text(`Valid Until: ${quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString() : 'N/A'}`);
    doc.moveDown();

    const customerName = quotation.customer?.businessName
      || `${quotation.customer?.contactFirstName || ''} ${quotation.customer?.contactLastName || ''}`.trim()
      || 'Customer';

    doc.fontSize(12).text('Customer', { underline: true });
    doc.fontSize(11).text(customerName);
    if (quotation.customer?.email) doc.text(`Email: ${quotation.customer.email}`);
    if (quotation.customer?.phoneNumber) doc.text(`Phone: ${quotation.customer.phoneNumber}`);
    doc.moveDown();

    doc.fontSize(12).text('Line Items', { underline: true });
    doc.moveDown(0.5);

    quotation.lineItems.forEach((item, idx) => {
      doc.fontSize(10).text(`${idx + 1}. ${item.description}`);
      doc.text(`   Qty: ${item.quantity} | Unit: R ${Number(item.unitPrice).toFixed(2)} | Total: R ${Number(item.total).toFixed(2)}`);
      if (item.partNumber) {
        doc.text(`   Part Number: ${item.partNumber}`);
      }
    });

    doc.moveDown();
    doc.fontSize(11).text(`Subtotal: R ${Number(quotation.subtotal || 0).toFixed(2)}`);
    doc.text(`VAT (${Number(quotation.vatRate || 0).toFixed(2)}%): R ${Number(quotation.vatAmount || 0).toFixed(2)}`);
    doc.fontSize(12).text(`Total: R ${Number(quotation.totalAmount || 0).toFixed(2)}`);

    doc.moveDown();
    doc.fontSize(10).text(quotation.terms || 'Terms available on request.');
    doc.end();
  });
};

const calculateQuotationCosts = ({
  lineItems = [],
  partsFulfilmentMode,
  deliveryProvider,
  partsProcurementCost,
  thirdPartyDeliveryCost,
  labourHours,
  isFirstSiteVisit,
  labourRate,
  travellingCost,
  distanceTravelledKm,
  travelRatePerKm,
  travelTimeMinutes,
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
  const resolvedIsFirstSiteVisit = Boolean(isFirstSiteVisit);
  const includedAssessmentHours = resolvedIsFirstSiteVisit ? (INCLUDED_ASSESSMENT_MINUTES / 60) : 0;
  const requestedLabourRate = Number.isFinite(Number(labourRate)) ? Number(labourRate) : 650;
  const resolvedLabourRate = isSuperUser ? requestedLabourRate : 650;
  const resolvedDistanceTravelledKm = Number.isFinite(Number(distanceTravelledKm)) ? Number(distanceTravelledKm) : 0;
  const requestedTravelRatePerKm = Number.isFinite(Number(travelRatePerKm)) ? Number(travelRatePerKm) : DEFAULT_TRAVEL_RATE_PER_KM;
  const resolvedTravelRatePerKm = isSuperUser ? requestedTravelRatePerKm : DEFAULT_TRAVEL_RATE_PER_KM;
  const resolvedTravelTimeMinutes = Number.isFinite(Number(travelTimeMinutes)) ? Number(travelTimeMinutes) : 0;
  const resolvedTimeTravelledCost = Number.isFinite(Number(timeTravelledCost))
    ? Number(timeTravelledCost)
    : Number.isFinite(Number(travellingCost))
      ? Number(travellingCost)
      : 0;
  const baseTravellingCost = Number(
    ((resolvedDistanceTravelledKm * resolvedTravelRatePerKm) + resolvedTimeTravelledCost).toFixed(2)
  );
  const isCallOutFloorApplicable = resolvedDistanceTravelledKm < CALL_OUT_FLOOR_DISTANCE_KM
    && resolvedTravelTimeMinutes < CALL_OUT_FLOOR_TIME_MINUTES;
  const isFirstVisitCallOutPackage = isCallOutFloorApplicable && resolvedIsFirstSiteVisit;
  const resolvedTravellingCost = isCallOutFloorApplicable
    ? Number(Math.max(baseTravellingCost, CALL_OUT_FLOOR_AMOUNT).toFixed(2))
    : baseTravellingCost;
  const resolvedConsumablesRate = Number.isFinite(Number(consumablesRate)) ? Number(consumablesRate) : 2;

  // Labour is always billed at full hours. The call-out floor fee (R650) is the separate
  // assessment/dispatch charge — it does NOT replace any portion of billable labour time.
  const resolvedChargeableLabourHours = resolvedLabourHours;
  const labourCost = Number((resolvedChargeableLabourHours * resolvedLabourRate).toFixed(2));

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
    isFirstSiteVisit: resolvedIsFirstSiteVisit,
    includedAssessmentMinutes: INCLUDED_ASSESSMENT_MINUTES,
    chargeableLabourHours: resolvedChargeableLabourHours,
    labourRate: resolvedLabourRate,
    labourCost,
    consumablesRate: resolvedConsumablesRate,
    consumablesCost,
    distanceTravelledKm: resolvedDistanceTravelledKm,
    travelRatePerKm: resolvedTravelRatePerKm,
    travelTimeMinutes: resolvedTravelTimeMinutes,
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
    
    // Build filter — customer role sees only their own quotations via customerProfile link
    let filter;
    if (req.user.role === 'customer' && req.user.customerProfile) {
      filter = { customer: req.user.customerProfile };
    } else {
      filter = { createdBy: req.user._id };
      if (customer) filter.customer = customer;
    }
    if (status) filter.status = status;
    
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
      isFirstSiteVisit,
      labourRate,
      travellingCost,
      distanceTravelledKm,
      travelRatePerKm,
      travelTimeMinutes,
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
      isFirstSiteVisit,
      labourRate,
      travellingCost,
      distanceTravelledKm,
      travelRatePerKm,
      travelTimeMinutes,
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
      isFirstSiteVisit: costing.isFirstSiteVisit,
      includedAssessmentMinutes: costing.includedAssessmentMinutes,
      chargeableLabourHours: costing.chargeableLabourHours,
      labourRate: costing.labourRate,
      labourCost: costing.labourCost,
      consumablesRate: costing.consumablesRate,
      consumablesCost: costing.consumablesCost,
      distanceTravelledKm: costing.distanceTravelledKm,
      travelRatePerKm: costing.travelRatePerKm,
      travelTimeMinutes: costing.travelTimeMinutes,
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
      isFirstSiteVisit,
      labourRate,
      travellingCost,
      distanceTravelledKm,
      travelRatePerKm,
      travelTimeMinutes,
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

    const initialServiceType = serviceType || serviceCall.serviceType || 'Scheduled Maintenance';
    const autoResolution = await resolveAutoMachineDataForQuote({
      customerId: serviceCall.customer,
      siteId: serviceCall.siteId,
      serviceType: initialServiceType,
      bookingRequest: serviceCall.bookingRequest,
      createdBy: req.user._id,
    });

    const resolvedServiceType = autoResolution.templateSeed.serviceType || initialServiceType;
    const machineModelNumber = autoResolution.templateSeed.machineModelNumber || '';

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
      isFirstSiteVisit,
      labourRate,
      travellingCost,
      distanceTravelledKm,
      travelRatePerKm,
      travelTimeMinutes,
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
      isFirstSiteVisit: costing.isFirstSiteVisit,
      includedAssessmentMinutes: costing.includedAssessmentMinutes,
      chargeableLabourHours: costing.chargeableLabourHours,
      labourRate: costing.labourRate,
      labourCost: costing.labourCost,
      consumablesRate: costing.consumablesRate,
      consumablesCost: costing.consumablesCost,
      distanceTravelledKm: costing.distanceTravelledKm,
      travelRatePerKm: costing.travelRatePerKm,
      travelTimeMinutes: costing.travelTimeMinutes,
      timeTravelledCost: costing.timeTravelledCost,
      travellingCost: costing.travellingCost,
      subtotal: costing.subtotal,
      vatRate: resolvedVatRate,
      vatAmount: calculatedVatAmount,
      totalAmount: calculatedTotalAmount,
      validUntil: validUntil || getDefaultValidUntilDate(),
      terms,
      notes,
      autoResolutionSnapshot: autoResolution,
      createdBy: req.user._id,
    });

    await quotation.populate('customer', 'businessName contactFirstName contactLastName');
    if (quotation.equipment) {
      await quotation.populate('equipment', 'equipmentId equipmentType brand model');
    }

    // Site inspection implied — advance the service call to awaiting-quote-approval
    // so it surfaces correctly in the 'Attended — Quotation Submitted' queue.
    if (!['completed', 'invoiced', 'cancelled'].includes(serviceCall.status)) {
      serviceCall.status = 'awaiting-quote-approval';
      await serviceCall.save();
    }

    const responsePayload = quotation.toObject();
    responsePayload.autoResolution = autoResolution;

    logInfo(
      `Auto quote resolver source: ${autoResolution.source} (confidence: ${autoResolution.confidence}) for call ${serviceCall.callNumber}`
    );
    logInfo(`✅ Quotation created from service call: ${quotation.quotationNumber} (source: ${serviceCall.callNumber})`);
    res.status(201).json(responsePayload);
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
      'isFirstSiteVisit',
      'labourRate',
      'distanceTravelledKm',
      'travelRatePerKm',
      'travelTimeMinutes',
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
        isFirstSiteVisit: quotation.isFirstSiteVisit,
        labourRate: quotation.labourRate,
        distanceTravelledKm: quotation.distanceTravelledKm,
        travelRatePerKm: quotation.travelRatePerKm,
        travelTimeMinutes: quotation.travelTimeMinutes,
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
  quotation.isFirstSiteVisit = costing.isFirstSiteVisit;
  quotation.includedAssessmentMinutes = costing.includedAssessmentMinutes;
  quotation.chargeableLabourHours = costing.chargeableLabourHours;
      quotation.labourRate = costing.labourRate;
      quotation.labourCost = costing.labourCost;
      quotation.consumablesRate = costing.consumablesRate;
      quotation.consumablesCost = costing.consumablesCost;
      quotation.distanceTravelledKm = costing.distanceTravelledKm;
      quotation.travelRatePerKm = costing.travelRatePerKm;
      quotation.travelTimeMinutes = costing.travelTimeMinutes;
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
    const { status, assignedAgent, scheduledDate, priority } = req.body;
    
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

    let createdJobcard = null;

    // Accepted quote -> auto-create jobcard that appears in in-progress work.
    if (status === 'approved' && !quotation.convertedToServiceCall) {
      const serviceCall = await ServiceCall.create({
        customer: quotation.customer,
        siteId: quotation.siteId,
        equipment: quotation.equipment,
        quotation: quotation._id,
        assignedAgent,
        title: quotation.title,
        description: quotation.description,
        priority: priority || 'medium',
        status: 'in-progress',
        serviceType: quotation.serviceType || 'Scheduled Maintenance',
        scheduledDate: scheduledDate || new Date(),
        agentNotes: quotation.notes,
        createdByRole: 'superadmin',
        createdBy: req.user._id,
      });

      quotation.status = 'converted';
      quotation.convertedToServiceCall = serviceCall._id;
      quotation.convertedDate = new Date();
      createdJobcard = serviceCall;
    }

    const updatedQuotation = await quotation.save();

    // Release email lock when quotation resolves (rejected, expired, or auto-converted)
    if (['rejected', 'expired', 'converted'].includes(updatedQuotation.status)) {
      const custForLock = await Customer.findById(updatedQuotation.customer).select('email');
      if (custForLock?.email) {
        await ServiceCallEmailLock.deleteOne({ email: custForLock.email.toLowerCase() });
      }
    }

    await updatedQuotation.populate('customer', 'businessName contactFirstName contactLastName');

    if (createdJobcard) {
      await createdJobcard.populate('customer', 'businessName contactFirstName contactLastName');
      await createdJobcard.populate('assignedAgent', 'firstName lastName employeeId');
    }

    logInfo(`✅ Quotation status updated: ${updatedQuotation.quotationNumber} → ${status}`);
    res.json({
      quotation: updatedQuotation,
      jobcard: createdJobcard,
    });
  } catch (error) {
    logError('Update quotation status error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Send quotation PDF via Email and/or WhatsApp/Telegram
// @route   POST /api/quotations/:id/send
// @access  Private
export const sendQuotation = async (req, res) => {
  try {
    const { channels } = req.body || {};

    const quotation = await Quotation.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    }).populate('customer');

    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    const allowedChannels = ['email', 'whatsapp', 'telegram'];
    const selectedChannels = Array.isArray(channels)
      ? [...new Set(channels.map((channel) => String(channel).trim().toLowerCase()))].filter((channel) => allowedChannels.includes(channel))
      : ['email', 'whatsapp'];

    // An empty channels array means portal-only — quote is marked sent so the
    // customer can see it in their portal, but no external dispatch is triggered.
    // A non-empty channels array with only invalid entries is still rejected.
    if (Array.isArray(channels) && channels.length > 0 && selectedChannels.length === 0) {
      return res.status(400).json({
        message: 'Please select at least one valid channel: email, whatsapp, or telegram.',
      });
    }

    const baseUrl = getBaseUrl(req);
    if (!quotation.shareToken) {
      quotation.shareToken = buildShareToken();
    }
    if (!quotation.shareTokenExpiresAt) {
      quotation.shareTokenExpiresAt = quotation.validUntil || getDefaultValidUntilDate();
    }

    const shareUrl = `${baseUrl}/api/quotations/share/${quotation.shareToken}/pdf`;
    const pdfBuffer = await generateQuotationPdfBuffer(quotation);

    let emailSent = false;
    let whatsappUrl = '';
    let telegramUrl = '';

    if (selectedChannels.includes('email')) {
      await sendQuotationEmail({
        to: quotation.customer?.email,
        customerName: quotation.customer?.businessName
          || `${quotation.customer?.contactFirstName || ''} ${quotation.customer?.contactLastName || ''}`.trim(),
        quotationNumber: quotation.quotationNumber,
        shareUrl,
        pdfBuffer,
      });
      emailSent = true;
    }

    if (selectedChannels.includes('whatsapp')) {
      const phone = normalizePhoneForWhatsApp(quotation.customer?.phoneNumber || quotation.customer?.alternatePhone || '');
      if (phone) {
        const message = `Quotation ${quotation.quotationNumber}\nView PDF: ${shareUrl}`;
        whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
        quotation.lastWhatsAppLink = whatsappUrl;
      }
    }

    if (selectedChannels.includes('telegram')) {
      telegramUrl = buildTelegramShareUrl({
        quotationNumber: quotation.quotationNumber,
        shareUrl,
      });
      quotation.lastTelegramLink = telegramUrl;
    }

    quotation.status = quotation.status === 'draft' ? 'sent' : quotation.status;
    quotation.sentDate = new Date();
    quotation.lastSentChannels = selectedChannels;
    await quotation.save();

    // Upsert email lock — prevents duplicate service calls while quotation is pending
    if (quotation.customer?.email) {
      await ServiceCallEmailLock.findOneAndUpdate(
        { email: quotation.customer.email.toLowerCase() },
        {
          email: quotation.customer.email.toLowerCase(),
          customerId: quotation.customer._id ?? null,
          quotationId: quotation._id,
          quotationNumber: quotation.quotationNumber,
          lockedAt: new Date(),
        },
        { upsert: true, new: true }
      );
    }

    logInfo(`✅ Quotation sent: ${quotation.quotationNumber} via ${selectedChannels.join(', ')}`);
    res.json({
      message: 'Quotation sent successfully',
      quotationNumber: quotation.quotationNumber,
      emailSent,
      whatsappUrl,
      telegramUrl,
      shareUrl,
      channels: selectedChannels,
    });
  } catch (error) {
    logError('Send quotation error:', error);
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

    // Release email lock — quotation converted to active service call
    const custForLock = await Customer.findById(quotation.customer).select('email');
    if (custForLock?.email) {
      await ServiceCallEmailLock.deleteOne({ email: custForLock.email.toLowerCase() });
    }

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

    const pdfBuffer = await generateQuotationPdfBuffer(quotation);

    logInfo(`📄 PDF generated for quotation: ${quotation.quotationNumber}`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${quotation.quotationNumber}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    logError('Generate quotation PDF error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Public quotation PDF by share token
// @route   GET /api/quotations/share/:token/pdf
// @access  Public
export const generateSharedQuotationPDF = async (req, res) => {
  try {
    const quotation = await Quotation.findOne({
      shareToken: req.params.token,
    })
      .populate('customer')
      .populate('equipment');

    if (!quotation) {
      return res.status(404).json({ message: 'Quotation link not found' });
    }

    if (quotation.shareTokenExpiresAt && quotation.shareTokenExpiresAt < new Date()) {
      return res.status(410).json({ message: 'Quotation link expired' });
    }

    const pdfBuffer = await generateQuotationPdfBuffer(quotation);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${quotation.quotationNumber}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    logError('Generate shared quotation PDF error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Customer accepts quotation via public share token (no auth required)
// @route   PATCH /api/quotations/share/:token/accept
// @access  Public
export const acceptPublicQuotation = async (req, res) => {
  try {
    const { token } = req.params;
    const quotation = await Quotation.findOne({ shareToken: token })
      .populate('customer', 'contactFirstName contactLastName customerId');

    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found or link is invalid' });
    }

    if (quotation.shareTokenExpiresAt && quotation.shareTokenExpiresAt < new Date()) {
      return res.status(410).json({ message: 'This quotation link has expired' });
    }

    if (quotation.status !== 'sent') {
      const statusMessages = {
        approved: 'This quotation has already been accepted',
        rejected: 'This quotation has been rejected',
        converted: 'This quotation has already been processed',
        expired: 'This quotation has expired',
        draft: 'This quotation is not ready for acceptance',
      };
      return res.status(409).json({
        message: statusMessages[quotation.status] || `Quotation cannot be accepted — current status: ${quotation.status}`,
      });
    }

    quotation.status = 'approved';
    quotation.approvedDate = new Date();
    quotation.acceptedVia = 'share_token';
    await quotation.save();

    const customerName = quotation.customer
      ? `${quotation.customer.contactFirstName} ${quotation.customer.contactLastName}`.trim()
      : 'Customer';
    logInfo(`✅ Quote accepted via share token: ${quotation.quotationNumber} by ${customerName}`);

    res.json({
      message: 'Thank you! Your quotation has been accepted.',
      quotationNumber: quotation.quotationNumber,
      acceptedDate: quotation.approvedDate,
    });
  } catch (error) {
    logError('Accept public quotation error:', error);
    res.status(500).json({ message: 'Failed to process acceptance' });
  }
};

// @desc    Customer rejects quotation via public share token (no auth required)
// @route   PATCH /api/quotations/share/:token/reject
// @access  Public
export const rejectPublicQuotation = async (req, res) => {
  try {
    const { token } = req.params;
    const { reason } = req.body;
    const quotation = await Quotation.findOne({ shareToken: token })
      .populate('customer', 'contactFirstName contactLastName customerId email');

    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found or link is invalid' });
    }

    if (quotation.shareTokenExpiresAt && quotation.shareTokenExpiresAt < new Date()) {
      return res.status(410).json({ message: 'This quotation link has expired' });
    }

    if (quotation.status !== 'sent') {
      return res.status(409).json({
        message: `Quotation cannot be rejected — current status: ${quotation.status}`,
      });
    }

    quotation.status = 'rejected';
    quotation.rejectedDate = new Date();
    if (reason) quotation.rejectionReason = String(reason).trim().slice(0, 500);
    await quotation.save();

    // Release email lock — customer declined via share link
    if (quotation.customer?.email) {
      await ServiceCallEmailLock.deleteOne({ email: quotation.customer.email.toLowerCase() });
    }

    logInfo(`❌ Quote rejected via share token: ${quotation.quotationNumber}`);

    res.json({
      message: 'Quotation has been declined.',
      quotationNumber: quotation.quotationNumber,
      rejectedDate: quotation.rejectedDate,
    });
  } catch (error) {
    logError('Reject public quotation error:', error);
    res.status(500).json({ message: 'Failed to process rejection' });
  }
};
