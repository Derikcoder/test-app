import crypto from 'crypto';
import PDFDocument from 'pdfkit';
import Invoice from '../models/Invoice.model.js';
import ServiceCall from '../models/ServiceCall.model.js';
import Customer from '../models/Customer.model.js';
import Quotation from '../models/Quotation.model.js';
import User from '../models/User.model.js';
import { logError, logInfo } from '../middleware/logger.middleware.js';
import { sendInvoiceDocumentEmail } from '../utils/emailService.js';

const DEFAULT_TRAVEL_RATE_PER_KM = 8.5;
const CALL_OUT_FLOOR_DISTANCE_KM = 45;
const CALL_OUT_FLOOR_TIME_MINUTES = 30;
const CALL_OUT_FLOOR_AMOUNT = 650;

const normalizeLineItems = (lineItems = []) => {
  return lineItems.map((item) => ({
    ...item,
    quantity: Number(item.quantity),
    unitPrice: Number(item.unitPrice),
    total: Number((Number(item.quantity) * Number(item.unitPrice)).toFixed(2)),
  }));
};

const buildShareToken = () => crypto.randomBytes(24).toString('hex');

const getBaseUrl = (req) => {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL;
  return `${req.protocol}://${req.get('host')}`;
};

const getPublicAppUrl = (req) => {
  if (process.env.PUBLIC_APP_URL) return process.env.PUBLIC_APP_URL;
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL;
  return `${req.protocol}://${req.get('host')}`;
};

const generateTemporaryAccessKey = () => String(crypto.randomInt(1000000, 10000000));

const buildUniqueUsername = async (email) => {
  const base = String(email || 'customer')
    .split('@')[0]
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .slice(0, 20) || 'customer';

  let candidate = base;
  let counter = 1;
  while (await User.findOne({ userName: candidate })) {
    counter += 1;
    candidate = `${base}${counter}`;
  }

  return candidate;
};

const ensureCustomerPortalAccess = async (customer) => {
  const customerEmail = String(customer?.email || '').trim().toLowerCase();
  if (!customer?._id || !customerEmail) return null;

  let linkedUser = await User.findOne({ customerProfile: customer._id });
  const temporaryAccessKey = generateTemporaryAccessKey();

  if (!linkedUser) {
    const userName = await buildUniqueUsername(customerEmail);
    linkedUser = await User.create({
      userName,
      email: customerEmail,
      password: temporaryAccessKey,
      role: 'customer',
      isSuperUser: false,
      customerProfile: customer._id,
      businessName: customer.businessName || `${customer.contactFirstName || ''} ${customer.contactLastName || ''}`.trim() || 'Customer',
      phoneNumber: customer.phoneNumber || customer.alternatePhone || 'Phone pending',
      physicalAddress: customer.physicalAddress || 'Address pending',
    });
  } else {
    linkedUser.email = customerEmail;
    linkedUser.password = temporaryAccessKey;
    linkedUser.role = 'customer';
    linkedUser.isSuperUser = false;
    linkedUser.customerProfile = linkedUser.customerProfile || customer._id;
  }

  const resetToken = linkedUser.generatePasswordResetToken();
  await linkedUser.save();

  if (!customer.userAccount || String(customer.userAccount) !== String(linkedUser._id)) {
    customer.userAccount = linkedUser._id;
    if (typeof customer.save === 'function') {
      await customer.save();
    } else {
      await Customer.findByIdAndUpdate(customer._id, { userAccount: linkedUser._id });
    }
  }

  return {
    email: linkedUser.email,
    userName: linkedUser.userName,
    temporaryAccessKey,
    loginUrl: `${process.env.CLIENT_URL || 'http://localhost:3000'}/login`,
    resetUrl: `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password/${resetToken}`,
  };
};

const normalizePhoneForWhatsApp = (phone) => {
  if (!phone) return '';
  const cleaned = String(phone).replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) return cleaned.slice(1);
  if (cleaned.startsWith('0') && cleaned.length === 10) return `27${cleaned.slice(1)}`;
  if (cleaned.startsWith('27')) return cleaned;
  return cleaned;
};

const isValidEmailAddress = (email) => /^\S+@\S+\.\S+$/.test(String(email || '').trim());

const isPlausibleWhatsAppNumber = (phone) => /^\d{10,15}$/.test(String(phone || '').trim());

const buildTelegramShareUrl = ({ documentNumber, shareUrl, documentLabel, approvalUrl }) => {
  const message = approvalUrl
    ? `${documentLabel} ${documentNumber}\nReview and approve: ${approvalUrl}\nView PDF: ${shareUrl}`
    : `${documentLabel} ${documentNumber}\nView PDF: ${shareUrl}`;
  return `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(message)}`;
};

const buildAccessibleServiceCallFilter = (req, serviceCallId) => {
  if (req?.user?.role === 'fieldServiceAgent' && req.user?.fieldServiceAgentProfile) {
    return {
      _id: serviceCallId,
      assignedAgent: req.user.fieldServiceAgentProfile,
    };
  }

  if (req?.user?._id) {
    return {
      _id: serviceCallId,
      createdBy: req.user._id,
    };
  }

  return { _id: serviceCallId };
};

const buildAccessibleInvoiceFilter = (req, invoiceId) => {
  const filter = invoiceId ? { _id: invoiceId } : {};

  if (req.user?.role === 'customer' && req.user?.customerProfile) {
    filter.customer = req.user.customerProfile;
    return filter;
  }

  filter.createdBy = req.user._id;
  return filter;
};

const getRequiredPaymentAmount = (invoice) => {
  if (!invoice) return 0;

  if (invoice.documentType === 'proForma' && invoice.depositRequired) {
    return Number(invoice.depositAmount || 0);
  }

  return Number(invoice.totalAmount || 0);
};

const buildInvoiceDueDate = ({ issueDate = new Date(), paymentTerms = 30 } = {}) => {
  const resolvedIssueDate = new Date(issueDate || new Date());
  const resolvedPaymentTerms = Number.isFinite(Number(paymentTerms)) ? Number(paymentTerms) : 30;
  const dueDate = new Date(resolvedIssueDate);
  dueDate.setDate(dueDate.getDate() + resolvedPaymentTerms);
  return dueDate;
};

const generateReceiptNumber = () => `RCT-${Date.now()}-${crypto.randomInt(100, 1000)}`;

const buildReceiptPurpose = (invoice, amount) => {
  const descriptor = invoice?.title || invoice?.description || invoice?.serviceType || 'service work';
  const numericAmount = Number(amount || 0);
  const depositOutstanding = invoice?.documentType === 'proForma'
    && invoice?.depositRequired
    && Number(invoice?.paidAmount || 0) < Number(invoice?.depositAmount || 0);

  if (depositOutstanding) {
    return `Deposit payment for ${descriptor}`;
  }

  if (numericAmount > 0 && numericAmount < Number(invoice?.balance || 0)) {
    return `Partial payment for ${descriptor}`;
  }

  return `Settlement payment for ${descriptor}`;
};

const appendServiceCallStageFeedback = async (serviceCall, { stage = 'general', rating, feedback }) => {
  const numericRating = Number(rating);
  if (!serviceCall || !numericRating || numericRating < 1 || numericRating > 5) {
    return;
  }

  serviceCall.rating = numericRating;
  serviceCall.customerFeedback = feedback || serviceCall.customerFeedback || '';
  serviceCall.ratedDate = new Date();
  serviceCall.feedbackHistory = [
    ...(Array.isArray(serviceCall.feedbackHistory) ? serviceCall.feedbackHistory : []),
    {
      stage,
      rating: numericRating,
      feedback: feedback || '',
      submittedAt: new Date(),
    },
  ];

  await serviceCall.save();
};

const syncServiceCallPaymentHold = async ({ invoice, req }) => {
  if (!invoice || typeof ServiceCall.findOne !== 'function') return null;
  if (invoice.documentType !== 'proForma') return null;

  let serviceCall = null;

  if (invoice.serviceCall) {
    const serviceCallFilter = req?.user?.role === 'customer' && req.user?.customerProfile
      ? { _id: invoice.serviceCall, customer: req.user.customerProfile }
      : buildAccessibleServiceCallFilter(req, invoice.serviceCall);

    serviceCall = await ServiceCall.findOne(serviceCallFilter);
  }

  if (!serviceCall && invoice._id) {
    const fallbackFilter = req?.user?.role === 'customer' && req.user?.customerProfile
      ? {
          customer: req.user.customerProfile,
          $or: [{ proFormaInvoice: invoice._id }, { invoice: invoice._id }],
        }
      : {
          $or: [{ proFormaInvoice: invoice._id }, { invoice: invoice._id }],
        };

    if (invoice.createdBy || req?.user?._id) {
      fallbackFilter.createdBy = invoice.createdBy || req.user._id;
    }

    serviceCall = await ServiceCall.findOne(fallbackFilter);
  }

  if (!serviceCall || invoice.workflowStatus !== 'approved') {
    return serviceCall;
  }

  const requiredAmount = getRequiredPaymentAmount(invoice);
  const paidAmount = Number(invoice.paidAmount || 0);

  if (requiredAmount > 0 && paidAmount < requiredAmount) {
    if (!['completed', 'invoiced', 'cancelled'].includes(serviceCall.status) && serviceCall.status !== 'on-hold') {
      serviceCall.status = 'on-hold';
      await serviceCall.save();
    }
    return serviceCall;
  }

  if (serviceCall.status === 'on-hold') {
    serviceCall.status = 'in-progress';
    await serviceCall.save();
  }

  return serviceCall;
};

const calculateInvoiceCosts = ({
  lineItems = [],
  partsFulfilmentMode,
  deliveryProvider,
  partsProcurementCost,
  thirdPartyDeliveryCost,
  laborHours,
  laborRate,
  distanceTravelledKm,
  travelRatePerKm,
  travelTimeMinutes,
  timeTravelledCost,
  consumablesRate,
  vatRate,
}) => {
  const normalizedLineItems = normalizeLineItems(lineItems);
  const partsCost = Number(normalizedLineItems.reduce((sum, item) => sum + item.total, 0).toFixed(2));
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
  const resolvedLaborHours = Number.isFinite(Number(laborHours)) ? Number(laborHours) : 0;
  const resolvedLaborRate = Number.isFinite(Number(laborRate)) ? Number(laborRate) : 650;
  const laborCost = Number((resolvedLaborHours * resolvedLaborRate).toFixed(2));
  const resolvedDistanceTravelledKm = Number.isFinite(Number(distanceTravelledKm)) ? Number(distanceTravelledKm) : 0;
  const resolvedTravelRatePerKm = Number.isFinite(Number(travelRatePerKm)) ? Number(travelRatePerKm) : DEFAULT_TRAVEL_RATE_PER_KM;
  const resolvedTravelTimeMinutes = Number.isFinite(Number(travelTimeMinutes)) ? Number(travelTimeMinutes) : 0;
  const resolvedTimeTravelledCost = Number.isFinite(Number(timeTravelledCost)) ? Number(timeTravelledCost) : 0;
  const baseTravelCost = Number(((resolvedDistanceTravelledKm * resolvedTravelRatePerKm) + resolvedTimeTravelledCost).toFixed(2));
  const isCallOutFloorApplicable = resolvedDistanceTravelledKm < CALL_OUT_FLOOR_DISTANCE_KM
    && resolvedTravelTimeMinutes < CALL_OUT_FLOOR_TIME_MINUTES;
  const travelCost = isCallOutFloorApplicable
    ? Number(Math.max(baseTravelCost, CALL_OUT_FLOOR_AMOUNT).toFixed(2))
    : baseTravelCost;
  const resolvedConsumablesRate = Number.isFinite(Number(consumablesRate)) ? Number(consumablesRate) : 0;
  const consumablesCost = Number((partsCost * (resolvedConsumablesRate / 100)).toFixed(2));
  const subtotal = Number((partsCost + laborCost + travelCost + consumablesCost).toFixed(2));
  const resolvedVatRate = Number.isFinite(Number(vatRate)) ? Number(vatRate) : 15;
  const vatAmount = Number((subtotal * (resolvedVatRate / 100)).toFixed(2));
  const totalAmount = Number((subtotal + vatAmount).toFixed(2));

  return {
    normalizedLineItems,
    partsFulfilmentMode: resolvedPartsFulfilmentMode,
    deliveryProvider: resolvedDeliveryProvider,
    partsProcurementCost: resolvedPartsProcurementCost,
    thirdPartyDeliveryCost: resolvedThirdPartyDeliveryCost,
    estimatedPartsProfit,
    laborHours: resolvedLaborHours,
    laborRate: resolvedLaborRate,
    laborCost,
    partsCost,
    distanceTravelledKm: resolvedDistanceTravelledKm,
    travelRatePerKm: resolvedTravelRatePerKm,
    travelTimeMinutes: resolvedTravelTimeMinutes,
    timeTravelledCost: resolvedTimeTravelledCost,
    travelCost,
    consumablesRate: resolvedConsumablesRate,
    consumablesCost,
    subtotal,
    vatRate: resolvedVatRate,
    vatAmount,
    totalAmount,
  };
};

const populateInvoiceDocument = async (invoiceQuery) => {
  return invoiceQuery
    .populate('customer', 'businessName contactFirstName contactLastName customerId customerType email phoneNumber alternatePhone')
    .populate('serviceCall', 'callNumber title status completedDate scheduledDate quotation')
    .populate('quotation', 'quotationNumber title status totalAmount')
    .populate('equipment', 'equipmentId equipmentType brand model');
};

const generateInvoicePdfBuffer = (invoice) => {
  const documentLabel = invoice.documentType === 'proForma' ? 'Pro-Forma Site Instruction' : 'Final Invoice';

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).text(`Appatunid ${documentLabel}`, { align: 'left' });
    doc.moveDown(0.5);
    doc.fontSize(11).text(`Document Number: ${invoice.invoiceNumber}`);
    doc.text(`Title: ${invoice.title || 'N/A'}`);
    doc.text(`Workflow Status: ${invoice.workflowStatus}`);
    doc.text(`Service Type: ${invoice.serviceType || 'N/A'}`);
    doc.text(`Service Date: ${invoice.serviceDate ? new Date(invoice.serviceDate).toLocaleDateString() : 'N/A'}`);
    doc.moveDown();

    const customerName = invoice.customer?.businessName
      || `${invoice.customer?.contactFirstName || ''} ${invoice.customer?.contactLastName || ''}`.trim()
      || 'Customer';

    doc.fontSize(12).text('Customer', { underline: true });
    doc.fontSize(11).text(customerName);
    if (invoice.customer?.email) doc.text(`Email: ${invoice.customer.email}`);
    if (invoice.customer?.phoneNumber) doc.text(`Phone: ${invoice.customer.phoneNumber}`);
    doc.moveDown();

    if (invoice.description) {
      doc.fontSize(12).text('Description', { underline: true });
      doc.fontSize(10).text(invoice.description);
      doc.moveDown();
    }

    doc.fontSize(12).text('Billable Items', { underline: true });
    doc.moveDown(0.5);

    invoice.lineItems.forEach((item, idx) => {
      doc.fontSize(10).text(`${idx + 1}. ${item.description}`);
      doc.text(`   Qty: ${item.quantity} | Unit: R ${Number(item.unitPrice).toFixed(2)} | Total: R ${Number(item.total).toFixed(2)}`);
    });

    doc.moveDown();
    doc.fontSize(11).text(`Parts Cost: R ${Number(invoice.partsCost || 0).toFixed(2)}`);
    doc.text(`Labour: ${Number(invoice.laborHours || 0).toFixed(2)}h x R ${Number(invoice.laborRate || 0).toFixed(2)} = R ${Number(invoice.laborCost || 0).toFixed(2)}`);
    doc.text(`Travel Cost: R ${Number(invoice.travelCost || 0).toFixed(2)}`);
    doc.text(`Consumables: R ${Number(invoice.consumablesCost || 0).toFixed(2)}`);
    if (invoice.depositRequired) {
      doc.text(`Deposit Required: R ${Number(invoice.depositAmount || 0).toFixed(2)}`);
      if (invoice.depositReason) {
        doc.text(`Deposit Reason: ${invoice.depositReason}`);
      }
    }
    doc.text(`Subtotal: R ${Number(invoice.subtotal || 0).toFixed(2)}`);
    doc.text(`VAT (${Number(invoice.vatRate || 0).toFixed(2)}%): R ${Number(invoice.vatAmount || 0).toFixed(2)}`);
    doc.fontSize(12).text(`Total: R ${Number(invoice.totalAmount || 0).toFixed(2)}`);

    if (invoice.siteInstruction?.problemsFound || invoice.siteInstruction?.recommendedSolution || invoice.siteInstruction?.requiredPartsAndMaterials) {
      doc.moveDown();
      doc.fontSize(12).text('Site Instruction', { underline: true });
      if (invoice.siteInstruction.problemsFound) doc.fontSize(10).text(`Problems Found: ${invoice.siteInstruction.problemsFound}`);
      if (invoice.siteInstruction.recommendedSolution) doc.text(`Recommended Solution: ${invoice.siteInstruction.recommendedSolution}`);
      if (invoice.siteInstruction.requiredPartsAndMaterials) doc.text(`Required Parts / Materials: ${invoice.siteInstruction.requiredPartsAndMaterials}`);
      if (invoice.siteInstruction.thirdPartyServiceNotes) doc.text(`Third-party Work: ${invoice.siteInstruction.thirdPartyServiceNotes}`);
      if (invoice.siteInstruction.approvalReference) doc.text(`Approval Reference: ${invoice.siteInstruction.approvalReference}`);
      if (invoice.siteInstruction.approvalNotes) doc.text(`Approval Notes: ${invoice.siteInstruction.approvalNotes}`);
    }

    doc.moveDown();
    doc.fontSize(10).text(invoice.terms || 'Terms available on request.');
    doc.end();
  });
};

const mapQuotationToInvoiceSeed = ({ quotation, serviceCall }) => {
  if (!quotation) {
    return {
      title: serviceCall.title || `${serviceCall.serviceType || 'Service'} Billing Document`,
      description: serviceCall.description || '',
      lineItems: [{ description: serviceCall.serviceType || 'Service Work', quantity: 1, unitPrice: 0 }],
      partsFulfilmentMode: 'inHouseProcurement',
      deliveryProvider: '',
      partsProcurementCost: 0,
      thirdPartyDeliveryCost: 0,
      laborHours: Number(serviceCall.laborHours || 0),
      laborRate: 650,
      distanceTravelledKm: 0,
      travelRatePerKm: DEFAULT_TRAVEL_RATE_PER_KM,
      travelTimeMinutes: 0,
      timeTravelledCost: 0,
      consumablesRate: 0,
      vatRate: 15,
      notes: serviceCall.notes || '',
      terms: 'Payment due before parts procurement for site-instruction work unless otherwise agreed.',
    };
  }

  return {
    title: quotation.title,
    description: quotation.description,
    lineItems: quotation.lineItems,
    partsFulfilmentMode: quotation.partsFulfilmentMode,
    deliveryProvider: quotation.deliveryProvider,
    partsProcurementCost: quotation.partsProcurementCost,
    thirdPartyDeliveryCost: quotation.thirdPartyDeliveryCost,
    laborHours: quotation.labourHours,
    laborRate: quotation.labourRate,
    distanceTravelledKm: quotation.distanceTravelledKm,
    travelRatePerKm: quotation.travelRatePerKm,
    travelTimeMinutes: quotation.travelTimeMinutes,
    timeTravelledCost: quotation.timeTravelledCost,
    consumablesRate: quotation.consumablesRate,
    vatRate: quotation.vatRate,
    notes: quotation.notes,
    terms: quotation.terms,
  };
};

const syncServiceCallInvoicePointers = async ({ invoice, serviceCall, mode }) => {
  if (!serviceCall) return;

  if (mode === 'proForma') {
    serviceCall.proFormaInvoice = invoice._id;
    await serviceCall.save();
    return;
  }

  if (!serviceCall.completedDate) {
    serviceCall.completedDate = new Date();
  }
  serviceCall.status = 'invoiced';
  serviceCall.invoice = invoice._id;
  serviceCall.invoicedDate = new Date();
  serviceCall.proFormaInvoice = invoice._id;
  await serviceCall.save();
};

const appendWorkflowTransition = ({ invoice, toStatus, changedBy, changedByRole = 'user', channel = 'internal', note = '' }) => {
  const fromStatus = invoice.workflowStatus || 'draft';
  if (!toStatus || fromStatus === toStatus) return;

  const existingTransitions = Array.isArray(invoice.workflowTransitions) ? invoice.workflowTransitions : [];
  invoice.workflowTransitions = [
    ...existingTransitions,
    {
      fromStatus,
      toStatus,
      changedAt: new Date(),
      changedBy: changedBy || undefined,
      changedByRole,
      channel,
      note,
    },
  ];
};

export const getInvoices = async (req, res) => {
  try {
    const { customer, paymentStatus, serviceCall, documentType, workflowStatus } = req.query;
    const filter = buildAccessibleInvoiceFilter(req);

    if (customer && !(req.user?.role === 'customer' && req.user?.customerProfile)) filter.customer = customer;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (serviceCall) filter.serviceCall = serviceCall;
    if (documentType) filter.documentType = documentType;
    if (workflowStatus) filter.workflowStatus = workflowStatus;

    const invoices = await populateInvoiceDocument(Invoice.find(filter).sort({ createdAt: -1 }));
    res.json(invoices);
  } catch (error) {
    logError('Get invoices error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getInvoiceById = async (req, res) => {
  try {
    const invoice = await populateInvoiceDocument(
      Invoice.findOne(buildAccessibleInvoiceFilter(req, req.params.id))
    );

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    res.json(invoice);
  } catch (error) {
    logError('Get invoice by ID error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getInvoicesByPaymentStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const validStatuses = ['unpaid', 'partial', 'paid', 'overdue'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: `Invalid payment status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const invoices = await populateInvoiceDocument(
      Invoice.find({ ...buildAccessibleInvoiceFilter(req), paymentStatus: status }).sort({ dueDate: 1 })
    );
    res.json(invoices);
  } catch (error) {
    logError('Get invoices by payment status error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getOverdueInvoicesSummary = async (req, res) => {
  try {
    const overdueInvoices = await Invoice.find({ ...buildAccessibleInvoiceFilter(req), paymentStatus: 'overdue' })
      .populate('customer', 'businessName contactFirstName contactLastName customerId contactPhone email');

    const totalOverdueAmount = overdueInvoices.reduce((sum, invoice) => sum + invoice.balance, 0);
    const overdueByCustomer = {};

    overdueInvoices.forEach((invoice) => {
      const customerId = invoice.customer._id.toString();
      if (!overdueByCustomer[customerId]) {
        overdueByCustomer[customerId] = { customer: invoice.customer, invoices: [], totalOverdue: 0 };
      }
      overdueByCustomer[customerId].invoices.push({
        invoiceNumber: invoice.invoiceNumber,
        totalAmount: invoice.totalAmount,
        balance: invoice.balance,
        dueDate: invoice.dueDate,
        daysOverdue: Math.floor((new Date() - new Date(invoice.dueDate)) / (1000 * 60 * 60 * 24)),
      });
      overdueByCustomer[customerId].totalOverdue += invoice.balance;
    });

    res.json({
      summary: {
        totalOverdueInvoices: overdueInvoices.length,
        totalOverdueAmount: totalOverdueAmount.toFixed(2),
        customersWithOverdue: Object.keys(overdueByCustomer).length,
      },
      overdueByCustomer: Object.values(overdueByCustomer),
    });
  } catch (error) {
    logError('Get overdue invoices summary error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const upsertProFormaInvoiceFromServiceCall = async (req, res) => {
  try {
    const serviceCall = await ServiceCall.findOne(buildAccessibleServiceCallFilter(req, req.params.serviceCallId))
      .populate('quotation')
      .populate('customer')
      .populate('equipment');

    if (!serviceCall) {
      return res.status(404).json({ message: 'Service call not found' });
    }

    const existing = await populateInvoiceDocument(
      Invoice.findOne({ serviceCall: serviceCall._id, documentType: 'proForma' })
    );

    if (existing) {
      return res.json({ invoice: existing, created: false });
    }

    const ownerContextUserId = serviceCall.createdBy || serviceCall.quotation?.createdBy || req.user._id;
    const linkedQuotation = serviceCall.quotation?._id
      ? await Quotation.findOne({ _id: serviceCall.quotation._id, createdBy: ownerContextUserId }) || serviceCall.quotation
      : null;
    const resolvedCustomer = serviceCall.customer?._id || linkedQuotation?.customer;

    if (!resolvedCustomer) {
      return res.status(409).json({ message: 'A linked customer is required before a pro-forma invoice can be created.' });
    }

    const seed = mapQuotationToInvoiceSeed({ quotation: linkedQuotation, serviceCall });
    const costing = calculateInvoiceCosts(seed);
    const issueDate = new Date();
    const paymentTerms = 30;
    const dueDate = buildInvoiceDueDate({ issueDate, paymentTerms });

    const invoice = await Invoice.create({
      serviceCall: serviceCall._id,
      quotation: linkedQuotation?._id,
      customer: resolvedCustomer,
      siteId: serviceCall.siteId || linkedQuotation?.siteId,
      equipment: serviceCall.equipment?._id || linkedQuotation?.equipment,
      title: seed.title,
      description: seed.description,
      documentType: 'proForma',
      workflowStatus: 'draft',
      serviceType: linkedQuotation?.serviceType || serviceCall.serviceType,
      serviceDate: serviceCall.completedDate || serviceCall.scheduledDate || new Date(),
      lineItems: costing.normalizedLineItems,
      partsFulfilmentMode: costing.partsFulfilmentMode,
      deliveryProvider: costing.deliveryProvider,
      partsProcurementCost: costing.partsProcurementCost,
      thirdPartyDeliveryCost: costing.thirdPartyDeliveryCost,
      estimatedPartsProfit: costing.estimatedPartsProfit,
      laborHours: costing.laborHours,
      laborRate: costing.laborRate,
      laborCost: costing.laborCost,
      partsCost: costing.partsCost,
      distanceTravelledKm: costing.distanceTravelledKm,
      travelRatePerKm: costing.travelRatePerKm,
      travelTimeMinutes: costing.travelTimeMinutes,
      timeTravelledCost: costing.timeTravelledCost,
      travelCost: costing.travelCost,
      consumablesRate: costing.consumablesRate,
      consumablesCost: costing.consumablesCost,
      subtotal: costing.subtotal,
      vatRate: costing.vatRate,
      vatAmount: costing.vatAmount,
      totalAmount: costing.totalAmount,
      issueDate,
      dueDate,
      paymentTerms,
      notes: seed.notes,
      terms: seed.terms,
      createdBy: ownerContextUserId,
    });

    await syncServiceCallInvoicePointers({ invoice, serviceCall, mode: 'proForma' });
    const populated = await populateInvoiceDocument(Invoice.findOne({ _id: invoice._id }));

    logInfo(`✅ Pro-forma invoice draft created: ${invoice.invoiceNumber} for service call ${serviceCall.callNumber}`);
    res.status(201).json({ invoice: populated, created: true });
  } catch (error) {
    logError('Create pro-forma invoice error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a final invoice seeded from the approved quotation linked to a completed service call
// @route   POST /api/invoices/from-service-call/:serviceCallId/final
// @access  Private (JWT required)
export const createFinalInvoiceFromServiceCall = async (req, res) => {
  try {
    const serviceCall = await ServiceCall.findOne(buildAccessibleServiceCallFilter(req, req.params.serviceCallId))
      .populate('quotation')
      .populate('customer')
      .populate('equipment');

    if (!serviceCall) {
      return res.status(404).json({ message: 'Service call not found' });
    }

    // Idempotency: return existing final invoice if one was already created
    const existing = await populateInvoiceDocument(
      Invoice.findOne({ serviceCall: serviceCall._id, documentType: 'final' })
    );
    if (existing) {
      return res.json({ invoice: existing, created: false });
    }

    const ownerContextUserId = serviceCall.createdBy || serviceCall.quotation?.createdBy || req.user._id;
    const linkedQuotation = serviceCall.quotation?._id
      ? await Quotation.findOne({ _id: serviceCall.quotation._id, createdBy: ownerContextUserId }) || serviceCall.quotation
      : null;
    const resolvedCustomer = serviceCall.customer?._id || linkedQuotation?.customer;

    if (!resolvedCustomer) {
      return res.status(409).json({ message: 'A linked customer is required before a final invoice can be created.' });
    }

    const seed = mapQuotationToInvoiceSeed({ quotation: linkedQuotation, serviceCall });
    const costing = calculateInvoiceCosts(seed);
    const issueDate = new Date();
    const paymentTerms = linkedQuotation?.paymentTerms || 30;
    const dueDate = buildInvoiceDueDate({ issueDate, paymentTerms });

    const invoice = await Invoice.create({
      serviceCall: serviceCall._id,
      quotation: linkedQuotation?._id,
      customer: resolvedCustomer,
      siteId: serviceCall.siteId || linkedQuotation?.siteId,
      equipment: serviceCall.equipment?._id || linkedQuotation?.equipment,
      title: seed.title,
      description: seed.description,
      documentType: 'final',
      workflowStatus: 'finalized',
      serviceType: linkedQuotation?.serviceType || serviceCall.serviceType,
      serviceDate: serviceCall.completedDate || serviceCall.scheduledDate || new Date(),
      lineItems: costing.normalizedLineItems,
      partsFulfilmentMode: costing.partsFulfilmentMode,
      deliveryProvider: costing.deliveryProvider,
      partsProcurementCost: costing.partsProcurementCost,
      thirdPartyDeliveryCost: costing.thirdPartyDeliveryCost,
      estimatedPartsProfit: costing.estimatedPartsProfit,
      laborHours: costing.laborHours,
      laborRate: costing.laborRate,
      laborCost: costing.laborCost,
      partsCost: costing.partsCost,
      distanceTravelledKm: costing.distanceTravelledKm,
      travelRatePerKm: costing.travelRatePerKm,
      travelTimeMinutes: costing.travelTimeMinutes,
      timeTravelledCost: costing.timeTravelledCost,
      travelCost: costing.travelCost,
      consumablesRate: costing.consumablesRate,
      consumablesCost: costing.consumablesCost,
      subtotal: costing.subtotal,
      vatRate: costing.vatRate,
      vatAmount: costing.vatAmount,
      totalAmount: costing.totalAmount,
      issueDate,
      dueDate,
      paymentTerms,
      notes: seed.notes,
      terms: seed.terms,
      createdBy: ownerContextUserId,
    });

    await syncServiceCallInvoicePointers({ invoice, serviceCall, mode: 'final' });
    const populated = await populateInvoiceDocument(Invoice.findOne({ _id: invoice._id }));

    logInfo(`✅ Final invoice created: ${invoice.invoiceNumber} for service call ${serviceCall.callNumber}`);
    res.status(201).json({ invoice: populated, created: true });
  } catch (error) {
    logError('Create final invoice error:', error);
    res.status(500).json({ message: error.message });
  }
};

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
      documentType,
      workflowStatus,
      serviceType,
      serviceDate,
      issueDate,
      dueDate,
      paymentTerms,
      bankDetails,
      notes,
      terms,
      depositRequired,
      depositAmount,
      depositReason,
      siteInstruction,
      partsFulfilmentMode,
      deliveryProvider,
      partsProcurementCost,
      thirdPartyDeliveryCost,
      laborHours,
      laborRate,
      distanceTravelledKm,
      travelRatePerKm,
      travelTimeMinutes,
      timeTravelledCost,
      consumablesRate,
      vatRate,
    } = req.body;

    if (!serviceCallId || !customer || !lineItems || lineItems.length === 0) {
      return res.status(400).json({ message: 'Service call, customer, and at least one line item are required' });
    }

    const serviceCall = await ServiceCall.findOne(buildAccessibleServiceCallFilter(req, serviceCallId));
    if (!serviceCall) {
      return res.status(404).json({ message: 'Service call not found' });
    }

    const ownerContextUserId = serviceCall.createdBy || req.user._id;

    const customerExists = await Customer.findOne({ _id: customer, createdBy: ownerContextUserId })
      || await Customer.findOne({ _id: customer });
    if (!customerExists) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const costing = calculateInvoiceCosts({
      lineItems,
      partsFulfilmentMode,
      deliveryProvider,
      partsProcurementCost,
      thirdPartyDeliveryCost,
      laborHours,
      laborRate,
      distanceTravelledKm,
      travelRatePerKm,
      travelTimeMinutes,
      timeTravelledCost,
      consumablesRate,
      vatRate,
    });

    const resolvedIssueDate = issueDate || new Date();
    const resolvedPaymentTerms = paymentTerms || 30;
    const resolvedDueDate = dueDate || buildInvoiceDueDate({ issueDate: resolvedIssueDate, paymentTerms: resolvedPaymentTerms });

    const invoice = await Invoice.create({
      serviceCall: serviceCallId,
      quotation,
      customer,
      siteId,
      equipment,
      title: title || serviceCall.title,
      description: description || serviceCall.description,
      documentType: documentType || 'final',
      workflowStatus: workflowStatus || (documentType === 'proForma' ? 'draft' : 'finalized'),
      serviceType: serviceType || serviceCall.serviceType,
      serviceDate: serviceDate || serviceCall.completedDate || new Date(),
      issueDate: resolvedIssueDate,
      dueDate: resolvedDueDate,
      lineItems: costing.normalizedLineItems,
      partsFulfilmentMode: costing.partsFulfilmentMode,
      deliveryProvider: costing.deliveryProvider,
      partsProcurementCost: costing.partsProcurementCost,
      thirdPartyDeliveryCost: costing.thirdPartyDeliveryCost,
      estimatedPartsProfit: costing.estimatedPartsProfit,
      laborHours: costing.laborHours,
      laborRate: costing.laborRate,
      laborCost: costing.laborCost,
      partsCost: costing.partsCost,
      distanceTravelledKm: costing.distanceTravelledKm,
      travelRatePerKm: costing.travelRatePerKm,
      travelTimeMinutes: costing.travelTimeMinutes,
      timeTravelledCost: costing.timeTravelledCost,
      travelCost: costing.travelCost,
      consumablesRate: costing.consumablesRate,
      consumablesCost: costing.consumablesCost,
      subtotal: costing.subtotal,
      vatRate: costing.vatRate,
      vatAmount: costing.vatAmount,
      totalAmount: costing.totalAmount,
      paymentTerms: resolvedPaymentTerms,
      bankDetails,
      notes,
      terms,
      depositRequired: Boolean(depositRequired),
      depositAmount: Number(depositAmount || 0),
      depositReason: depositReason || '',
      siteInstruction: siteInstruction || {},
      createdBy: ownerContextUserId,
    });

    await syncServiceCallInvoicePointers({ invoice, serviceCall, mode: invoice.documentType === 'proForma' ? 'proForma' : 'final' });
    const populated = await populateInvoiceDocument(Invoice.findOne({ _id: invoice._id, createdBy: ownerContextUserId }));

    logInfo(`✅ Invoice created: ${invoice.invoiceNumber} for service call ${serviceCall.callNumber}`);
    res.status(201).json(populated);
  } catch (error) {
    logError('Create invoice error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Auto-creates a final invoice after a proForma's required payment is fully received.
 * Runs as a non-fatal side-effect inside recordPayment.
 */
const autoCreateFinalInvoiceAfterProFormaPayment = async ({ invoice }) => {
  try {
    const serviceCall = await ServiceCall.findById(invoice.serviceCall)
      .populate('quotation')
      .populate('customer')
      .populate('equipment');
    if (!serviceCall) return;

    const existingFinal = await Invoice.findOne({ serviceCall: serviceCall._id, documentType: 'final' });
    if (existingFinal) return;

    const ownerContextUserId = invoice.createdBy || serviceCall.createdBy;
    const linkedQuotation = serviceCall.quotation?._id
      ? await Quotation.findOne({ _id: serviceCall.quotation._id, createdBy: ownerContextUserId }) || serviceCall.quotation
      : null;
    const resolvedCustomer = serviceCall.customer?._id || linkedQuotation?.customer;
    if (!resolvedCustomer) return;

    const seed = mapQuotationToInvoiceSeed({ quotation: linkedQuotation, serviceCall });
    const costing = calculateInvoiceCosts(seed);
    const issueDate = new Date();
    const paymentTerms = linkedQuotation?.paymentTerms || 30;
    const dueDate = buildInvoiceDueDate({ issueDate, paymentTerms });

    const finalInvoice = await Invoice.create({
      serviceCall: serviceCall._id,
      quotation: linkedQuotation?._id,
      customer: resolvedCustomer,
      siteId: serviceCall.siteId || linkedQuotation?.siteId,
      equipment: serviceCall.equipment?._id || linkedQuotation?.equipment,
      title: seed.title,
      description: seed.description,
      documentType: 'final',
      workflowStatus: 'finalized',
      serviceType: linkedQuotation?.serviceType || serviceCall.serviceType,
      serviceDate: serviceCall.completedDate || serviceCall.scheduledDate || new Date(),
      lineItems: costing.normalizedLineItems,
      partsFulfilmentMode: costing.partsFulfilmentMode,
      deliveryProvider: costing.deliveryProvider,
      partsProcurementCost: costing.partsProcurementCost,
      thirdPartyDeliveryCost: costing.thirdPartyDeliveryCost,
      estimatedPartsProfit: costing.estimatedPartsProfit,
      laborHours: costing.laborHours,
      laborRate: costing.laborRate,
      laborCost: costing.laborCost,
      partsCost: costing.partsCost,
      distanceTravelledKm: costing.distanceTravelledKm,
      travelRatePerKm: costing.travelRatePerKm,
      travelTimeMinutes: costing.travelTimeMinutes,
      timeTravelledCost: costing.timeTravelledCost,
      travelCost: costing.travelCost,
      consumablesRate: costing.consumablesRate,
      consumablesCost: costing.consumablesCost,
      subtotal: costing.subtotal,
      vatRate: costing.vatRate,
      vatAmount: costing.vatAmount,
      totalAmount: costing.totalAmount,
      issueDate,
      dueDate,
      paymentTerms,
      notes: seed.notes,
      terms: seed.terms,
      createdBy: ownerContextUserId,
    });

    // Update service call invoice pointer without changing its status (work may still be in progress)
    serviceCall.invoice = finalInvoice._id;
    serviceCall.invoicedDate = new Date();
    await serviceCall.save();

    logInfo(`✅ Auto-created final invoice ${finalInvoice.invoiceNumber} after proForma payment for SC ${serviceCall.callNumber}`);
  } catch (err) {
    logError('Auto-create final invoice from proForma payment failed (non-fatal):', err);
  }
};

const generateReceiptPdfBuffer = (invoice) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const customerName = invoice.customer?.businessName
      || `${invoice.customer?.contactFirstName || ''} ${invoice.customer?.contactLastName || ''}`.trim()
      || 'Customer';

    doc.fontSize(18).text('Appatunid — Proof of Payment', { align: 'left' });
    doc.moveDown(0.5);
    doc.fontSize(11).text(`Invoice Reference: ${invoice.invoiceNumber}`);
    doc.text(`Document Type: ${invoice.documentType === 'proForma' ? 'Pro-Forma Site Instruction' : 'Final Invoice'}`);
    doc.text(`Service: ${invoice.serviceType || invoice.title || 'N/A'}`);
    doc.moveDown(0.5);
    doc.fontSize(12).text('Customer', { underline: true });
    doc.fontSize(11).text(customerName);
    if (invoice.customer?.email) doc.text(`Email: ${invoice.customer.email}`);
    if (invoice.customer?.phoneNumber) doc.text(`Phone: ${invoice.customer.phoneNumber}`);
    doc.moveDown();

    doc.fontSize(12).text('Invoice Summary', { underline: true });
    doc.fontSize(11).text(`Total Amount: R ${Number(invoice.totalAmount || 0).toFixed(2)}`);
    doc.text(`Amount Paid: R ${Number(invoice.paidAmount || 0).toFixed(2)}`);
    doc.text(`Outstanding Balance: R ${Number(invoice.balance || 0).toFixed(2)}`);
    doc.moveDown();

    const receipts = Array.isArray(invoice.receipts) ? invoice.receipts : [];
    doc.fontSize(12).text('Payment Receipts', { underline: true });
    doc.moveDown(0.3);

    if (receipts.length === 0) {
      doc.fontSize(10).text('No payment receipts recorded.');
    } else {
      receipts.forEach((receipt, idx) => {
        doc.fontSize(11).text(`${idx + 1}. ${receipt.receiptNumber}`);
        doc.fontSize(10).text(`   Amount Paid: R ${Number(receipt.amount || 0).toFixed(2)}`);
        doc.text(`   Payment Method: ${receipt.method || 'N/A'}`);
        doc.text(`   Date: ${receipt.issuedAt ? new Date(receipt.issuedAt).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}`);
        if (receipt.reference) doc.text(`   Transaction Reference: ${receipt.reference}`);
        if (receipt.purpose) doc.text(`   Purpose: ${receipt.purpose}`);
        doc.moveDown(0.5);
      });
    }

    doc.moveDown();
    doc.fontSize(9).text('This document serves as official proof of payment. Please retain for your records.', { oblique: true });
    doc.end();
  });
};

export const recordPayment = async (req, res) => {
  try {
    const { amount, date, method, reference, notes } = req.body;

    if (!amount || !method) {
      return res.status(400).json({ message: 'Payment amount and method are required' });
    }

    const invoice = await Invoice.findOne(buildAccessibleInvoiceFilter(req, req.params.id));
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    if (amount <= 0) {
      return res.status(400).json({ message: 'Payment amount must be greater than 0' });
    }

    if (amount > invoice.balance) {
      return res.status(400).json({ message: `Payment amount (${amount}) exceeds invoice balance (${invoice.balance})` });
    }

    const paymentDate = date || new Date();
    const balanceBefore = Number(invoice.balance || 0);
    await invoice.addPayment({ amount, date: paymentDate, method, reference, notes, recordedBy: req.user._id });

    const latestReceipt = {
      receiptNumber: generateReceiptNumber(),
      amount: Number(amount),
      method,
      reference: reference || '',
      notes: notes || '',
      purpose: buildReceiptPurpose(invoice, amount),
      balanceBefore,
      balanceAfter: Math.max(0, Number((balanceBefore - Number(amount)).toFixed(2))),
      issuedAt: paymentDate,
      recordedBy: req.user._id,
    };

    invoice.receipts = [...(Array.isArray(invoice.receipts) ? invoice.receipts : []), latestReceipt];
    if (typeof invoice.save === 'function') {
      await invoice.save();
    }

    // Auto-advance workflow and trigger final invoice creation when proForma required payment is fully received
    if (invoice.documentType === 'proForma' && invoice.paymentStatus === 'paid') {
      if (invoice.workflowStatus === 'awaitingApproval') {
        appendWorkflowTransition({
          invoice,
          toStatus: 'approved',
          changedBy: req.user?._id,
          changedByRole: req.user?.role === 'customer' ? 'customer' : 'system',
          channel: 'other',
          note: 'Automatically approved — full required payment received',
        });
        invoice.workflowStatus = 'approved';
        await invoice.save();
      }
      if (invoice.serviceCall) {
        await autoCreateFinalInvoiceAfterProFormaPayment({ invoice });
      }
    }

    await syncServiceCallPaymentHold({ invoice, req });

    const updatedInvoice = await populateInvoiceDocument(
      Invoice.findOne(buildAccessibleInvoiceFilter(req, invoice._id))
    );

    if (updatedInvoice) {
      updatedInvoice.latestReceipt = latestReceipt;
      const existingReceipts = Array.isArray(updatedInvoice.receipts) ? updatedInvoice.receipts : [];
      updatedInvoice.receipts = existingReceipts.some((receipt) => receipt.receiptNumber === latestReceipt.receiptNumber)
        ? existingReceipts
        : [...existingReceipts, latestReceipt].slice(-10);
    }

    logInfo(`✅ Payment recorded for invoice ${updatedInvoice.invoiceNumber}: ${amount} (${method})`);
    res.json(updatedInvoice);
  } catch (error) {
    logError('Record payment error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const updateInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    if (invoice.paymentStatus === 'paid') {
      return res.status(409).json({ message: 'Cannot edit fully paid invoice' });
    }

    const attemptedImmutableUpdates = Invoice.IMMUTABLE_FIELDS.filter(
      (field) => req.body[field] !== undefined && String(req.body[field]) !== String(invoice[field])
    );

    if (attemptedImmutableUpdates.length > 0) {
      return res.status(403).json({ message: 'Cannot update protected fields', protectedFields: attemptedImmutableUpdates });
    }

    const pendingState = {
      lineItems: req.body.lineItems !== undefined ? req.body.lineItems : invoice.lineItems,
      partsFulfilmentMode: req.body.partsFulfilmentMode !== undefined ? req.body.partsFulfilmentMode : invoice.partsFulfilmentMode,
      deliveryProvider: req.body.deliveryProvider !== undefined ? req.body.deliveryProvider : invoice.deliveryProvider,
      partsProcurementCost: req.body.partsProcurementCost !== undefined ? req.body.partsProcurementCost : invoice.partsProcurementCost,
      thirdPartyDeliveryCost: req.body.thirdPartyDeliveryCost !== undefined ? req.body.thirdPartyDeliveryCost : invoice.thirdPartyDeliveryCost,
      laborHours: req.body.laborHours !== undefined ? req.body.laborHours : invoice.laborHours,
      laborRate: req.body.laborRate !== undefined ? req.body.laborRate : invoice.laborRate,
      distanceTravelledKm: req.body.distanceTravelledKm !== undefined ? req.body.distanceTravelledKm : invoice.distanceTravelledKm,
      travelRatePerKm: req.body.travelRatePerKm !== undefined ? req.body.travelRatePerKm : invoice.travelRatePerKm,
      travelTimeMinutes: req.body.travelTimeMinutes !== undefined ? req.body.travelTimeMinutes : invoice.travelTimeMinutes,
      timeTravelledCost: req.body.timeTravelledCost !== undefined ? req.body.timeTravelledCost : invoice.timeTravelledCost,
      consumablesRate: req.body.consumablesRate !== undefined ? req.body.consumablesRate : invoice.consumablesRate,
      vatRate: req.body.vatRate !== undefined ? req.body.vatRate : invoice.vatRate,
    };

    const costing = calculateInvoiceCosts(pendingState);

    Invoice.EDITABLE_FIELDS.forEach((field) => {
      if (req.body[field] !== undefined) {
        invoice[field] = req.body[field];
      }
    });

    invoice.lineItems = costing.normalizedLineItems;
    invoice.partsFulfilmentMode = costing.partsFulfilmentMode;
    invoice.deliveryProvider = costing.deliveryProvider;
    invoice.partsProcurementCost = costing.partsProcurementCost;
    invoice.thirdPartyDeliveryCost = costing.thirdPartyDeliveryCost;
    invoice.estimatedPartsProfit = costing.estimatedPartsProfit;
    invoice.laborHours = costing.laborHours;
    invoice.laborRate = costing.laborRate;
    invoice.laborCost = costing.laborCost;
    invoice.partsCost = costing.partsCost;
    invoice.distanceTravelledKm = costing.distanceTravelledKm;
    invoice.travelRatePerKm = costing.travelRatePerKm;
    invoice.travelTimeMinutes = costing.travelTimeMinutes;
    invoice.timeTravelledCost = costing.timeTravelledCost;
    invoice.travelCost = costing.travelCost;
    invoice.consumablesRate = costing.consumablesRate;
    invoice.consumablesCost = costing.consumablesCost;
    invoice.subtotal = costing.subtotal;
    invoice.vatRate = costing.vatRate;
    invoice.vatAmount = costing.vatAmount;
    invoice.totalAmount = costing.totalAmount;

    const updatedInvoice = await invoice.save();
    const populated = await populateInvoiceDocument(Invoice.findOne({ _id: updatedInvoice._id, createdBy: req.user._id }));

    logInfo(`✅ Invoice updated: ${updatedInvoice.invoiceNumber}`);
    res.json(populated);
  } catch (error) {
    logError('Update invoice error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const updateInvoiceWorkflowStatus = async (req, res) => {
  try {
    const { workflowStatus, approvalReference, approvalNotes } = req.body || {};

    if (!workflowStatus) {
      return res.status(400).json({ message: 'workflowStatus is required' });
    }

    const validStatuses = ['draft', 'awaitingApproval', 'approved', 'rejected', 'finalized'];
    if (!validStatuses.includes(workflowStatus)) {
      return res.status(400).json({ message: `Invalid workflowStatus. Must be one of: ${validStatuses.join(', ')}` });
    }

    const invoice = await Invoice.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    appendWorkflowTransition({
      invoice,
      toStatus: workflowStatus,
      changedBy: req.user?._id,
      changedByRole: 'user',
      channel: 'internal',
      note: 'Manual workflow status update',
    });

    invoice.workflowStatus = workflowStatus;
    invoice.siteInstruction = {
      ...(invoice.siteInstruction?.toObject?.() || invoice.siteInstruction || {}),
      approvalReference: approvalReference !== undefined ? approvalReference : (invoice.siteInstruction?.approvalReference || ''),
      approvalNotes: approvalNotes !== undefined ? approvalNotes : (invoice.siteInstruction?.approvalNotes || ''),
      approvalRequestedAt: workflowStatus === 'awaitingApproval' ? new Date() : invoice.siteInstruction?.approvalRequestedAt,
      approvedAt: workflowStatus === 'approved' ? new Date() : invoice.siteInstruction?.approvedAt,
      rejectedAt: workflowStatus === 'rejected' ? new Date() : invoice.siteInstruction?.rejectedAt,
    };

    const updated = await invoice.save();
    await syncServiceCallPaymentHold({ invoice: updated, req });
    const populated = await populateInvoiceDocument(Invoice.findOne({ _id: updated._id }));

    logInfo(`✅ Invoice workflow updated: ${updated.invoiceNumber} → ${workflowStatus}`);
    res.json(populated);
  } catch (error) {
    logError('Update invoice workflow status error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const finalizeInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const serviceCall = await ServiceCall.findOne(buildAccessibleServiceCallFilter(req, invoice.serviceCall));
    if (!serviceCall) {
      return res.status(404).json({ message: 'Linked service call not found' });
    }

    appendWorkflowTransition({
      invoice,
      toStatus: 'finalized',
      changedBy: req.user?._id,
      changedByRole: 'user',
      channel: 'internal',
      note: 'Pro-forma finalized to final invoice',
    });

    invoice.documentType = 'final';
    invoice.workflowStatus = 'finalized';
    invoice.finalizedAt = new Date();
    invoice.serviceDate = serviceCall.completedDate || new Date();
    await invoice.save();
    await syncServiceCallInvoicePointers({ invoice, serviceCall, mode: 'final' });

    const populated = await populateInvoiceDocument(Invoice.findOne({ _id: invoice._id, createdBy: req.user._id }));
    logInfo(`✅ Invoice finalized: ${invoice.invoiceNumber}`);
    res.json(populated);
  } catch (error) {
    logError('Finalize invoice error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const sendInvoice = async (req, res) => {
  try {
    const { channels } = req.body || {};
    const invoice = await populateInvoiceDocument(Invoice.findOne({ _id: req.params.id, createdBy: req.user._id }));

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const allowedChannels = ['email', 'whatsapp', 'telegram'];
    const normalizedChannels = Array.isArray(channels)
      ? [...new Set(channels.map((channel) => String(channel).trim().toLowerCase()).filter(Boolean))]
      : ['email', 'whatsapp'];

    const invalidChannels = normalizedChannels.filter((channel) => !allowedChannels.includes(channel));
    if (invalidChannels.length > 0) {
      return res.status(400).json({
        message: `Invalid channels requested: ${invalidChannels.join(', ')}. Allowed channels: ${allowedChannels.join(', ')}`,
      });
    }

    if (normalizedChannels.length === 0) {
      return res.status(400).json({ message: 'Please select at least one channel: email, whatsapp, or telegram.' });
    }

    const selectedChannels = normalizedChannels;

    const customerEmail = String(invoice.customer?.email || '').trim().toLowerCase();

    if (selectedChannels.includes('email') && !customerEmail) {
      return res.status(400).json({ message: 'Customer email is required to send via email channel.' });
    }

    if (selectedChannels.includes('email') && !isValidEmailAddress(customerEmail)) {
      return res.status(400).json({ message: 'Customer email format is invalid for email delivery.' });
    }

    const whatsappPhone = normalizePhoneForWhatsApp(invoice.customer?.phoneNumber || invoice.customer?.alternatePhone || '');
    if (selectedChannels.includes('whatsapp') && !whatsappPhone) {
      return res.status(400).json({ message: 'Customer phone number is required to send via WhatsApp channel.' });
    }

    if (selectedChannels.includes('whatsapp') && !isPlausibleWhatsAppNumber(whatsappPhone)) {
      return res.status(400).json({ message: 'Customer phone number format is invalid for WhatsApp delivery.' });
    }

    const baseUrl = getBaseUrl(req);
    const publicAppUrl = getPublicAppUrl(req);
    if (!invoice.shareToken) {
      invoice.shareToken = buildShareToken();
    }
    if (!invoice.shareTokenExpiresAt) {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 14);
      invoice.shareTokenExpiresAt = expiry;
    }

    const shareUrl = `${baseUrl}/api/invoices/share/${invoice.shareToken}/pdf`;
    const approvalUrl = `${publicAppUrl}/invoice-approval/${invoice.shareToken}`;
    const pdfBuffer = await generateInvoicePdfBuffer(invoice);
    const documentLabel = invoice.documentType === 'proForma' ? 'Pro-Forma Site Instruction' : 'Invoice';

    let emailSent = false;
    let whatsappUrl = '';
    let telegramUrl = '';
    let portalInvite = null;

    if (selectedChannels.includes('email')) {
      if (invoice.documentType === 'proForma') {
        portalInvite = await ensureCustomerPortalAccess(invoice.customer);
      }

      await sendInvoiceDocumentEmail({
        to: customerEmail,
        customerName: invoice.customer?.businessName || `${invoice.customer?.contactFirstName || ''} ${invoice.customer?.contactLastName || ''}`.trim(),
        documentNumber: invoice.invoiceNumber,
        documentLabel,
        shareUrl,
        approvalUrl,
        pdfBuffer,
        approvalRequired: invoice.documentType === 'proForma',
        userName: portalInvite?.userName,
        temporaryAccessKey: portalInvite?.temporaryAccessKey,
        loginUrl: portalInvite?.loginUrl,
        resetUrl: portalInvite?.resetUrl,
      });
      emailSent = true;
    }

    if (selectedChannels.includes('whatsapp')) {
      const message = invoice.documentType === 'proForma'
        ? `${documentLabel} ${invoice.invoiceNumber}\nReview and approve: ${approvalUrl}\nView PDF: ${shareUrl}`
        : `${documentLabel} ${invoice.invoiceNumber}\nView PDF: ${shareUrl}`;
      whatsappUrl = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`;
      invoice.lastWhatsAppLink = whatsappUrl;
    }

    if (selectedChannels.includes('telegram')) {
      telegramUrl = buildTelegramShareUrl({
        documentNumber: invoice.invoiceNumber,
        shareUrl,
        documentLabel,
        approvalUrl: invoice.documentType === 'proForma' ? approvalUrl : '',
      });
      invoice.lastTelegramLink = telegramUrl;
    }

    if (invoice.documentType === 'proForma' && invoice.workflowStatus === 'draft') {
      appendWorkflowTransition({
        invoice,
        toStatus: 'awaitingApproval',
        changedBy: req.user?._id,
        changedByRole: 'user',
        channel: 'internal',
        note: 'Document sent to customer for approval',
      });

      invoice.workflowStatus = 'awaitingApproval';
      invoice.siteInstruction = {
        ...(invoice.siteInstruction?.toObject?.() || invoice.siteInstruction || {}),
        approvalRequestedAt: new Date(),
      };
    }

    invoice.lastSentChannels = selectedChannels;
    invoice.lastSentAt = new Date();
    invoice.lastSentBy = req.user?._id;
    await invoice.save();

    logInfo(`✅ ${documentLabel} sent: ${invoice.invoiceNumber} via ${selectedChannels.join(', ')}`);
    res.json({
      message: `${documentLabel} sent successfully`,
      documentNumber: invoice.invoiceNumber,
      emailSent,
      whatsappUrl,
      telegramUrl,
      shareUrl,
      approvalUrl,
      channels: selectedChannels,
      portalUser: portalInvite
        ? {
            email: portalInvite.email,
            userName: portalInvite.userName,
            temporaryAccessKey: portalInvite.temporaryAccessKey,
          }
        : null,
      loginUrl: portalInvite?.loginUrl || '',
      resetUrl: portalInvite?.resetUrl || '',
    });
  } catch (error) {
    logError('Send invoice error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    if (invoice.payments && invoice.payments.length > 0) {
      return res.status(409).json({ message: 'Cannot delete invoice with payment history', paymentCount: invoice.payments.length, paidAmount: invoice.paidAmount });
    }

    if (invoice.serviceCall) {
      if (invoice.documentType === 'final') {
        await ServiceCall.updateOne({ _id: invoice.serviceCall }, { $unset: { invoice: 1, invoicedDate: 1 }, status: 'completed' });
      } else {
        await ServiceCall.updateOne({ _id: invoice.serviceCall }, { $unset: { proFormaInvoice: 1 } });
      }
    }

    await invoice.deleteOne();
    logInfo(`✅ Invoice deleted: ${invoice.invoiceNumber}`);
    res.json({ message: 'Invoice removed successfully' });
  } catch (error) {
    logError('Delete invoice error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const generateInvoicePDF = async (req, res) => {
  try {
    const invoice = await populateInvoiceDocument(Invoice.findOne({ _id: req.params.id, createdBy: req.user._id }));
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const pdfBuffer = await generateInvoicePdfBuffer(invoice);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${invoice.invoiceNumber}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    logError('Generate invoice PDF error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const generateSharedInvoicePDF = async (req, res) => {
  try {
    const invoice = await populateInvoiceDocument(Invoice.findOne({ shareToken: req.params.token }));
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    if (invoice.shareTokenExpiresAt && new Date(invoice.shareTokenExpiresAt) < new Date()) {
      return res.status(410).json({ message: 'This invoice link has expired' });
    }

    const pdfBuffer = await generateInvoicePdfBuffer(invoice);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${invoice.invoiceNumber}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    logError('Generate shared invoice PDF error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const generateReceiptPDF = async (req, res) => {
  try {
    const invoice = await populateInvoiceDocument(
      Invoice.findOne(buildAccessibleInvoiceFilter(req, req.params.id))
    );
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    if (!Array.isArray(invoice.receipts) || invoice.receipts.length === 0) {
      return res.status(404).json({ message: 'No payment receipts found for this invoice' });
    }

    const pdfBuffer = await generateReceiptPdfBuffer(invoice);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="POP-${invoice.invoiceNumber}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    logError('Generate receipt PDF error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getSharedInvoiceDetails = async (req, res) => {
  try {
    const invoice = await populateInvoiceDocument(Invoice.findOne({ shareToken: req.params.token }));
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    if (invoice.shareTokenExpiresAt && new Date(invoice.shareTokenExpiresAt) < new Date()) {
      return res.status(410).json({ message: 'This invoice link has expired' });
    }

    const baseUrl = getBaseUrl(req);

    res.json({
      invoiceNumber: invoice.invoiceNumber,
      title: invoice.title,
      description: invoice.description,
      documentType: invoice.documentType,
      workflowStatus: invoice.workflowStatus,
      serviceType: invoice.serviceType,
      serviceDate: invoice.serviceDate,
      customer: {
        businessName: invoice.customer?.businessName,
        contactFirstName: invoice.customer?.contactFirstName,
        contactLastName: invoice.customer?.contactLastName,
      },
      lineItems: invoice.lineItems,
      partsCost: invoice.partsCost,
      laborHours: invoice.laborHours,
      laborRate: invoice.laborRate,
      laborCost: invoice.laborCost,
      travelCost: invoice.travelCost,
      consumablesCost: invoice.consumablesCost,
      subtotal: invoice.subtotal,
      vatRate: invoice.vatRate,
      vatAmount: invoice.vatAmount,
      totalAmount: invoice.totalAmount,
      depositRequired: invoice.depositRequired,
      depositAmount: invoice.depositAmount,
      depositReason: invoice.depositReason,
      notes: invoice.notes,
      terms: invoice.terms,
      siteInstruction: invoice.siteInstruction,
      pdfUrl: `${baseUrl}/api/invoices/share/${invoice.shareToken}/pdf`,
      approvalAllowed: invoice.documentType === 'proForma' && !['approved', 'finalized', 'rejected'].includes(invoice.workflowStatus),
    });
  } catch (error) {
    logError('Get shared invoice details error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const submitSharedInvoiceDecision = async (req, res) => {
  try {
    const { decision, approvalReference, approvalNotes, rating, feedback } = req.body || {};
    const invoiceQuery = Invoice.findOne({ shareToken: req.params.token });
    const invoice = typeof invoiceQuery?.populate === 'function'
      ? await invoiceQuery.populate('customer', 'businessName contactFirstName contactLastName customerId customerType email phoneNumber alternatePhone physicalAddress userAccount')
      : await invoiceQuery;

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    if (invoice.shareTokenExpiresAt && new Date(invoice.shareTokenExpiresAt) < new Date()) {
      return res.status(410).json({ message: 'This invoice link has expired' });
    }

    if (invoice.documentType !== 'proForma') {
      return res.status(409).json({ message: 'Only pro-forma site instructions accept public approval decisions.' });
    }

    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ message: 'decision must be either approved or rejected' });
    }

    if (['approved', 'rejected'].includes(invoice.workflowStatus)) {
      return res.status(409).json({ message: `This pro-forma has already been ${invoice.workflowStatus}.` });
    }

    if (invoice.workflowStatus === 'finalized') {
      return res.status(409).json({ message: 'This document has already been finalized.' });
    }

    appendWorkflowTransition({
      invoice,
      toStatus: decision,
      changedByRole: 'customer',
      channel: 'publicLink',
      note: 'Customer decision submitted via public approval link',
    });

    invoice.workflowStatus = decision;
    invoice.siteInstruction = {
      ...(invoice.siteInstruction?.toObject?.() || invoice.siteInstruction || {}),
      approvalReference: approvalReference !== undefined ? approvalReference : (invoice.siteInstruction?.approvalReference || ''),
      approvalNotes: approvalNotes !== undefined ? approvalNotes : (invoice.siteInstruction?.approvalNotes || ''),
      approvedAt: decision === 'approved' ? new Date() : invoice.siteInstruction?.approvedAt,
      rejectedAt: decision === 'rejected' ? new Date() : null,
    };

    invoice.customerDecision = {
      ...(invoice.customerDecision?.toObject?.() || invoice.customerDecision || {}),
      decision,
      reference: approvalReference !== undefined ? approvalReference : (invoice.customerDecision?.reference || ''),
      notes: approvalNotes !== undefined ? approvalNotes : (invoice.customerDecision?.notes || ''),
      decidedAt: new Date(),
      channel: 'publicLink',
    };

    if (decision === 'approved') {
      invoice.siteInstruction.rejectedAt = null;
    }

    await invoice.save();
    await syncServiceCallPaymentHold({ invoice, req });

    const relatedServiceCall = invoice.serviceCall
      ? await ServiceCall.findOne({ _id: invoice.serviceCall })
      : await ServiceCall.findOne({ $or: [{ proFormaInvoice: invoice._id }, { invoice: invoice._id }] });
    await appendServiceCallStageFeedback(relatedServiceCall, {
      stage: 'proForma',
      rating,
      feedback: feedback || approvalNotes || '',
    });

    const portalInvite = decision === 'approved'
      ? await ensureCustomerPortalAccess(invoice.customer)
      : null;

    const responseBody = {
      message: decision === 'approved' ? 'Pro-forma approved successfully.' : 'Pro-forma rejected successfully.',
      workflowStatus: invoice.workflowStatus,
      invoiceNumber: invoice.invoiceNumber,
    };

    if (portalInvite) {
      responseBody.portalUser = {
        email: portalInvite.email,
        userName: portalInvite.userName,
        temporaryAccessKey: portalInvite.temporaryAccessKey,
      };
      responseBody.loginUrl = portalInvite.loginUrl;
      responseBody.resetUrl = portalInvite.resetUrl;
    }

    res.json(responseBody);
  } catch (error) {
    logError('Submit shared invoice decision error:', error);
    res.status(500).json({ message: error.message });
  }
};