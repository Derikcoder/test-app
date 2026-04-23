import ServiceCall from '../models/ServiceCall.model.js';
import FieldServiceAgent from '../models/FieldServiceAgent.model.js';
import Customer from '../models/Customer.model.js';
import Invoice from '../models/Invoice.model.js';
import ServiceCallEmailLock from '../models/ServiceCallEmailLock.model.js';
import { logError, logInfo } from '../middleware/logger.middleware.js';

const TERMINAL_SERVICE_CALL_STATUSES = ['completed', 'invoiced', 'cancelled'];

const formatStructuredAddress = (address) => {
  if (!address || typeof address !== 'object') {
    return '';
  }

  return [
    address.streetAddress,
    address.complexName ? `Complex/Industrial Park: ${address.complexName}` : null,
    address.siteAddressDetail ? `Unit/Site Detail: ${address.siteAddressDetail}` : null,
    address.suburb,
    address.cityDistrict,
    address.province,
    address.postalCode ? `Postal Code: ${address.postalCode}` : null,
  ]
    .filter(Boolean)
    .join(', ')
    .trim();
};

const resolveServiceLocationDetails = (serviceCallLike = {}) => {
  const directLocation = String(
    serviceCallLike?.serviceLocation
    || serviceCallLike?.location
    || ''
  ).trim();

  if (directLocation) {
    return {
      value: directLocation,
      source: 'explicit-service-location',
    };
  }

  const bookingRequest = serviceCallLike?.bookingRequest || {};
  const machineAddress = formatStructuredAddress(bookingRequest.machineAddress);
  if (machineAddress) {
    return {
      value: machineAddress,
      source: 'booking-machine-address',
    };
  }

  const administrativeAddress = formatStructuredAddress(bookingRequest.administrativeAddress);
  if (administrativeAddress) {
    return {
      value: administrativeAddress,
      source: 'booking-administrative-address',
    };
  }

  return {
    value: '',
    source: 'none',
  };
};

const withResolvedServiceLocation = (serviceCall) => {
  if (!serviceCall) {
    return serviceCall;
  }

  const value = typeof serviceCall.toObject === 'function'
    ? serviceCall.toObject()
    : serviceCall;
  const resolvedLocation = resolveServiceLocationDetails(value);

  return {
    ...value,
    resolvedServiceLocation: resolvedLocation.value,
    resolvedServiceLocationSource: resolvedLocation.source,
  };
};

const withResolvedServiceLocations = (serviceCalls = []) => serviceCalls.map((call) => withResolvedServiceLocation(call));

const buildServiceCallAccessFilter = (req, serviceCallId) => {
  if (req.user?.role === 'fieldServiceAgent' && req.user?.fieldServiceAgentProfile) {
    return {
      _id: serviceCallId,
      assignedAgent: req.user.fieldServiceAgentProfile,
    };
  }

  if (req.user?.role === 'customer' && req.user?.customerProfile) {
    return {
      _id: serviceCallId,
      customer: req.user.customerProfile,
    };
  }

  return {
    _id: serviceCallId,
    createdBy: req.user._id,
  };
};

const getOutstandingProFormaBlock = async (serviceCall) => {
  if (!serviceCall?.proFormaInvoice || typeof Invoice.findOne !== 'function') {
    return null;
  }

  const linkedProForma = await Invoice.findOne({ _id: serviceCall.proFormaInvoice });
  if (!linkedProForma || linkedProForma.documentType !== 'proForma') {
    return null;
  }

  if (linkedProForma.workflowStatus === 'awaitingApproval') {
    return 'approval';
  }

  if (linkedProForma.depositRequired) {
    const depositAmount = Number(linkedProForma.depositAmount || 0);
    const paidAmount = Number(linkedProForma.paidAmount || 0);

    if (paidAmount < depositAmount) {
      return 'deposit';
    }
  }

  return null;
};

const getStartOfDay = (date = new Date()) => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
};

const getEndOfDay = (date = new Date()) => {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
};

const getStartOfWeek = (date = new Date()) => {
  const value = getStartOfDay(date);
  const weekday = (value.getDay() + 6) % 7;
  value.setDate(value.getDate() - weekday);
  return value;
};

const getEndOfWeek = (date = new Date()) => {
  const value = getStartOfWeek(date);
  value.setDate(value.getDate() + 6);
  value.setHours(23, 59, 59, 999);
  return value;
};

const getSelfDispatchParticipationDaysThisWeek = async (createdBy, agentId) => {
  const weeklyCalls = await ServiceCall.find({
    createdBy,
    selfAcceptedBy: agentId,
    selfAcceptedAt: {
      $gte: getStartOfWeek(),
      $lte: getEndOfWeek(),
    },
  }).select('selfAcceptedAt');

  return new Set(
    weeklyCalls
      .filter((call) => call.selfAcceptedAt)
      .map((call) => new Date(call.selfAcceptedAt).toISOString().slice(0, 10))
  ).size;
};

const appendSelfDispatchAudit = async (serviceCallId, entry) => {
  await ServiceCall.updateOne(
    { _id: serviceCallId },
    {
      $push: {
        selfDispatchAudit: {
          agent: entry.agent,
          action: entry.action,
          reason: entry.reason,
          timestamp: entry.timestamp || new Date(),
        },
      },
    }
  );
};

const getAgentSelfDispatchEligibility = async ({ createdBy, agentId }) => {
  const agent = await FieldServiceAgent.findOne({ _id: agentId, createdBy });

  if (!agent) {
    return { statusCode: 404, message: 'Agent not found', agent: null, meta: null };
  }

  if (agent.status !== 'active') {
    return { statusCode: 403, message: 'Agent is not active', agent, meta: null };
  }

  if (agent.availability !== 'available') {
    return { statusCode: 403, message: 'Agent is not currently available for self-dispatch', agent, meta: null };
  }

  if (agent.selfDispatchSuspended) {
    return {
      statusCode: 403,
      message: agent.selfDispatchSuspendedReason || 'Agent is currently suspended from self-dispatch',
      agent,
      meta: null,
    };
  }

  const acceptedTodayCount = await ServiceCall.countDocuments({
    createdBy,
    selfAcceptedBy: agentId,
    selfAcceptedAt: {
      $gte: getStartOfDay(),
      $lte: getEndOfDay(),
    },
  });

  const weeklyParticipationDaysUsed = await getSelfDispatchParticipationDaysThisWeek(createdBy, agentId);

  if (acceptedTodayCount >= 2) {
    return {
      statusCode: 403,
      message: 'Daily self-accept limit reached',
      agent,
      meta: {
        acceptedTodayCount,
        remainingDailySelfAccepts: 0,
        weeklyParticipationDaysUsed,
        remainingWeeklyParticipationDays: Math.max(0, 5 - weeklyParticipationDaysUsed),
      },
    };
  }

  if (weeklyParticipationDaysUsed >= 5) {
    return {
      statusCode: 403,
      message: 'Weekly self-dispatch participation limit reached',
      agent,
      meta: {
        acceptedTodayCount,
        remainingDailySelfAccepts: Math.max(0, 2 - acceptedTodayCount),
        weeklyParticipationDaysUsed,
        remainingWeeklyParticipationDays: 0,
      },
    };
  }

  return {
    statusCode: 200,
    message: '',
    agent,
    meta: {
      acceptedTodayCount,
      remainingDailySelfAccepts: Math.max(0, 2 - acceptedTodayCount),
      weeklyParticipationDaysUsed,
      remainingWeeklyParticipationDays: Math.max(0, 5 - weeklyParticipationDaysUsed),
    },
  };
};

// @desc    Get service calls assigned to the calling field agent
// @route   GET /api/service-calls/my-assigned
// @access  Private (fieldServiceAgent)
export const getMyAssignedServiceCalls = async (req, res) => {
  try {
    const agentProfileId = req.user.fieldServiceAgentProfile;
    if (!agentProfileId) {
      return res.status(400).json({ message: 'No agent profile linked to your account' });
    }
    const serviceCalls = await ServiceCall.find({ assignedAgent: agentProfileId })
      .populate('customer', 'businessName contactFirstName contactLastName customerId phoneNumber alternatePhone')
      .populate('assignedAgent', 'firstName lastName employeeId')
      .populate({ path: 'quotation', select: 'quotationNumber title status totalAmount shareToken shareTokenExpiresAt createdBy', populate: { path: 'createdBy', select: 'userName role' } })
      .populate('proFormaInvoice', 'invoiceNumber documentType workflowStatus totalAmount depositRequired depositAmount')
      .populate('invoice', 'invoiceNumber documentType workflowStatus totalAmount paymentStatus')
      .sort({ createdAt: -1 });
    res.json(withResolvedServiceLocations(serviceCalls));
  } catch (error) {
    logError('Get my assigned service calls error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all service calls
// @route   GET /api/service-calls
// @access  Private
export const getServiceCalls = async (req, res) => {
  try {
    const filter = req.user?.role === 'customer' && req.user?.customerProfile
      ? { customer: req.user.customerProfile }
      : { createdBy: req.user._id };

    const serviceCalls = await ServiceCall.find(filter)
      .populate('customer', 'businessName contactFirstName contactLastName customerId phoneNumber alternatePhone')
      .populate('assignedAgent', 'firstName lastName employeeId')
      .populate({ path: 'quotation', select: 'quotationNumber title status totalAmount createdBy', populate: { path: 'createdBy', select: 'userName role' } })
      .populate('proFormaInvoice', 'invoiceNumber documentType workflowStatus totalAmount depositRequired depositAmount')
      .populate('invoice', 'invoiceNumber documentType workflowStatus totalAmount paymentStatus')
      .sort({ createdAt: -1 });

    // Self-heal: any in-progress call that has a fully-paid final invoice should be invoiced.
    // Catches cases where recordPayment ran before the status-sync logic was deployed.
    const reconcilePromises = serviceCalls
      .filter((sc) => sc.status === 'in-progress' && sc.invoice?.paymentStatus === 'paid' && sc.invoice?.documentType === 'final')
      .map((sc) => {
        sc.status = 'invoiced';
        sc.invoicedDate = sc.invoicedDate || new Date();
        sc.completedDate = sc.completedDate || new Date();
        logInfo(`♻️  Reconciled service call ${sc.callNumber} → invoiced (paid final invoice detected on fetch)`);
        return sc.save();
      });
    if (reconcilePromises.length > 0) await Promise.all(reconcilePromises);

    res.json(withResolvedServiceLocations(serviceCalls));
  } catch (error) {
    logError('Get service calls error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single service call
// @route   GET /api/service-calls/:id
// @access  Private
export const getServiceCallById = async (req, res) => {
  try {
    const serviceCall = await ServiceCall.findOne(buildServiceCallAccessFilter(req, req.params.id))
      .populate('customer')
      .populate('assignedAgent')
      .populate('quotation')
      .populate('proFormaInvoice')
      .populate('invoice');

    if (!serviceCall) {
      return res.status(404).json({ message: 'Service call not found' });
    }

    res.json(withResolvedServiceLocation(serviceCall));
  } catch (error) {
    logError('Get service call error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new service call
// @route   POST /api/service-calls
// @access  Private
export const createServiceCall = async (req, res) => {
  try {
    const {
      callNumber,
      customer,
      assignedAgent,
      title,
      description,
      priority,
      status,
      serviceType,
      scheduledDate,
      estimatedDuration,
      serviceLocation,
      notes,
      internalNotes,
      bookingRequest
    } = req.body;

    const normalizedPriority = priority ? String(priority).toLowerCase() : undefined;

    // Validation runs before pre-save hooks, so ensure a call number is always present.
    // If not provided by client, generate the next sequence number here.
    let resolvedCallNumber = callNumber;
    if (!resolvedCallNumber) {
      const count = await ServiceCall.countDocuments();
      resolvedCallNumber = `SC-${String(count + 1).padStart(6, '0')}`;
    }

    // Validate required fields
    if (!title || !description || !serviceType) {
      return res.status(400).json({ message: 'Please fill in all required fields' });
    }

    if (!customer && !bookingRequest) {
      return res.status(400).json({ message: 'A linked customer or booking request details are required' });
    }

    // Auto-link or auto-create customer from booking request
    let resolvedCustomer = customer;
    if (!resolvedCustomer && bookingRequest?.contact) {
      const rawEmail = String(bookingRequest.contact.contactEmail || '').trim().toLowerCase();
      const rawContactPerson = String(bookingRequest.contact.contactPerson || '').trim();
      const rawPhone = String(bookingRequest.contact.contactPhone || '').trim();

      // Build a required-email fallback for private booking flows where email is optional.
      const generatedEmail = `autogen-${Date.now()}@customer.local`;
      const normalizedEmail = rawEmail || generatedEmail;

      // Duplicate-booking guard: block if a pending quotation lock exists for this email
      if (rawEmail) {
        const existingLock = await ServiceCallEmailLock.findOne({ email: rawEmail });
        if (existingLock) {
          return res.status(409).json({
            message: `Quotation ${existingLock.quotationNumber} is already awaiting acceptance for this customer. No new service call is needed until the current quotation is resolved.`,
            quotationNumber: existingLock.quotationNumber,
            email: rawEmail,
            canRegister: true,
          });
        }
      }

      // Try to find existing customer by email in same tenant.
      const existingCustomer = await Customer.findOne({
        email: normalizedEmail,
        createdBy: req.user._id,
      });

      if (existingCustomer) {
        resolvedCustomer = existingCustomer._id;
        logInfo(`✅ Linked service call to existing customer: ${existingCustomer.businessName || existingCustomer.contactFirstName}`);
      } else {
        // Prospect-first intake: keep booking-request calls unlinked until a quote is accepted.
        // This prevents stale customer profiles when prospects never convert.
        logInfo('ℹ️ Service call captured as prospect (no customer profile created yet)', {
          contactEmail: normalizedEmail,
          contactPerson: rawContactPerson || null,
          hasPhone: Boolean(rawPhone),
          createdBy: req.user._id,
        });
      }
    }

    // Path B guard: customer provided by ObjectId — check for active quotation lock via stored email
    if (customer) {
      const linkedCust = await Customer.findById(customer).select('email');
      if (linkedCust?.email) {
        const existingLock = await ServiceCallEmailLock.findOne({ email: linkedCust.email.toLowerCase() });
        if (existingLock) {
          return res.status(409).json({
            message: `Quotation ${existingLock.quotationNumber} is already awaiting acceptance for this customer.`,
            quotationNumber: existingLock.quotationNumber,
            email: linkedCust.email.toLowerCase(),
            canRegister: true,
          });
        }
      }
    }

    const resolvedLocation = resolveServiceLocationDetails({ serviceLocation, bookingRequest });

    const serviceCall = await ServiceCall.create({
      callNumber: resolvedCallNumber,
      customer: resolvedCustomer,
      assignedAgent,
      title,
      description,
      priority: normalizedPriority,
      status,
      serviceType,
      scheduledDate,
      estimatedDuration,
      serviceLocation: resolvedLocation.value,
      notes,
      internalNotes,
      bookingRequest,
      createdBy: req.user._id
    });

    // Populate customer and agent details
    await serviceCall.populate('customer', 'businessName contactFirstName contactLastName');
    await serviceCall.populate('assignedAgent', 'firstName lastName employeeId');

    logInfo(`✅ Service call created: ${serviceCall.callNumber}`);
    res.status(201).json(withResolvedServiceLocation(serviceCall));
  } catch (error) {
    logError('Create service call error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update service call
// @route   PUT /api/service-calls/:id
// @access  Private
export const updateServiceCall = async (req, res) => {
  try {
    if (req.body.agentAccepted === true) {
      return res.status(403).json({ message: 'Use the dedicated self-accept workflow for agent confirmation' });
    }

    const serviceCall = await ServiceCall.findOne(buildServiceCallAccessFilter(req, req.params.id));

    if (!serviceCall) {
      return res.status(404).json({ message: 'Service call not found' });
    }

    if (req.body.status === 'completed') {
      const outstandingBlock = await getOutstandingProFormaBlock(serviceCall);

      if (outstandingBlock === 'approval') {
        return res.status(409).json({
          message: 'Customer approval is still required before this job can be completed.',
        });
      }

      if (outstandingBlock === 'deposit') {
        return res.status(409).json({
          message: 'Deposit payment is still required before this job can be completed.',
        });
      }
    }

    // Check if trying to update immutable fields
    const attemptedImmutableUpdates = ServiceCall.IMMUTABLE_FIELDS.filter(
      field => req.body[field] !== undefined && String(req.body[field]) !== String(serviceCall[field])
    );

    if (attemptedImmutableUpdates.length > 0) {
      return res.status(403).json({
        message: 'Cannot update protected fields',
        protectedFields: attemptedImmutableUpdates
      });
    }

    // Update editable fields
    ServiceCall.EDITABLE_FIELDS.forEach(field => {
      if (req.body[field] !== undefined) {
        serviceCall[field] = req.body[field];
      }
    });

    // Assignment workflow support: when assigning an agent, mark assignment metadata
    if (req.body.assignedAgent !== undefined) {
      const incomingAssignedAgent = req.body.assignedAgent ? String(req.body.assignedAgent) : '';
      const existingAssignedAgent = serviceCall.assignedAgent ? String(serviceCall.assignedAgent) : '';

      if (incomingAssignedAgent && incomingAssignedAgent !== existingAssignedAgent) {
        serviceCall.assignedDate = new Date();
        serviceCall.assignmentNotifiedAt = new Date();

        if (req.body.agentAccepted === undefined) {
          serviceCall.agentAccepted = false;
        }

        if (req.body.status === undefined || serviceCall.status === 'pending' || serviceCall.status === 'scheduled') {
          serviceCall.status = 'assigned';
        }
      }
    }

    // Auto-set completedDate if status is completed
    if (req.body.status === 'completed' && !serviceCall.completedDate) {
      serviceCall.completedDate = new Date();
    }

    // Keep service location aligned with booking addresses when no explicit location is provided.
    if (!String(serviceCall.serviceLocation || '').trim()) {
      serviceCall.serviceLocation = resolveServiceLocationDetails(serviceCall).value;
    }

    const updatedServiceCall = await serviceCall.save();
    await updatedServiceCall.populate('customer', 'businessName contactFirstName contactLastName');
    await updatedServiceCall.populate('assignedAgent', 'firstName lastName employeeId');

    logInfo(`✅ Service call updated: ${updatedServiceCall.callNumber}`);
    res.json(withResolvedServiceLocation(updatedServiceCall));
  } catch (error) {
    logError('Update service call error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get self-dispatch eligible unassigned service calls for an agent
// @route   GET /api/service-calls/eligible-unassigned/:agentId
// @access  Private
export const getEligibleUnassignedServiceCalls = async (req, res) => {
  try {
    const { agentId } = req.params;

    // When called by a fieldServiceAgent, resolve the business owner from the agent record
    let businessCreatedBy = req.user._id;
    if (req.user.role === 'fieldServiceAgent') {
      const agent = await FieldServiceAgent.findOne({ _id: agentId, userAccount: req.user._id });
      if (!agent) {
        return res.status(403).json({ message: 'Access denied', jobs: [], meta: null });
      }
      businessCreatedBy = agent.createdBy;
    }

    const eligibility = await getAgentSelfDispatchEligibility({
      createdBy: businessCreatedBy,
      agentId,
    });

    if (eligibility.statusCode !== 200) {
      return res.status(eligibility.statusCode).json({
        message: eligibility.message,
        jobs: [],
        meta: eligibility.meta,
      });
    }

    const jobs = await ServiceCall.find({
      createdBy: businessCreatedBy,
      assignedAgent: null,
      selfDispatchEnabled: { $ne: false },
      status: { $nin: TERMINAL_SERVICE_CALL_STATUSES },
    })
      .populate('customer', 'businessName contactFirstName contactLastName customerId phoneNumber alternatePhone')
      .sort({ createdAt: -1 });

    res.json({ jobs: withResolvedServiceLocations(jobs), meta: eligibility.meta });
  } catch (error) {
    logError('Get eligible unassigned service calls error:', error);
    res.status(500).json({ message: error.message, jobs: [] });
  }
};

// @desc    Self-accept a service call for an eligible agent
// @route   POST /api/service-calls/:id/self-accept
// @access  Private
export const selfAcceptServiceCall = async (req, res) => {
  try {
    const { agentId } = req.body;

    if (!agentId) {
      return res.status(400).json({ message: 'agentId is required' });
    }

    // When called by a fieldServiceAgent, resolve the business owner from the agent record
    let businessCreatedBy = req.user._id;
    if (req.user.role === 'fieldServiceAgent') {
      const agent = await FieldServiceAgent.findOne({ _id: agentId, userAccount: req.user._id });
      if (!agent) {
        return res.status(403).json({ message: 'Access denied' });
      }
      businessCreatedBy = agent.createdBy;
    }

    const serviceCall = await ServiceCall.findOne({
      _id: req.params.id,
      createdBy: businessCreatedBy,
    });

    if (!serviceCall) {
      return res.status(404).json({ message: 'Service call not found' });
    }

    const eligibility = await getAgentSelfDispatchEligibility({
      createdBy: businessCreatedBy,
      agentId,
    });

    if (eligibility.statusCode !== 200) {
      await appendSelfDispatchAudit(serviceCall._id, {
        agent: agentId,
        action: 'rejected',
        reason: eligibility.message,
      });

      return res.status(eligibility.statusCode).json({
        message: eligibility.message,
        meta: eligibility.meta,
      });
    }

    if (serviceCall.assignedAgent) {
      await appendSelfDispatchAudit(serviceCall._id, {
        agent: agentId,
        action: 'rejected',
        reason: 'This service call has already been claimed',
      });

      return res.status(409).json({ message: 'This service call has already been claimed' });
    }

    if (serviceCall.selfDispatchEnabled === false) {
      await appendSelfDispatchAudit(serviceCall._id, {
        agent: agentId,
        action: 'rejected',
        reason: 'Agent is not eligible for self-dispatch',
      });

      return res.status(403).json({ message: 'Agent is not eligible for self-dispatch' });
    }

    if (TERMINAL_SERVICE_CALL_STATUSES.includes(serviceCall.status)) {
      await appendSelfDispatchAudit(serviceCall._id, {
        agent: agentId,
        action: 'rejected',
        reason: 'This service call is no longer claimable',
      });

      return res.status(409).json({ message: 'This service call is no longer claimable' });
    }

    const acceptedAt = new Date();
    const updatedServiceCall = await ServiceCall.findOneAndUpdate(
      {
        _id: req.params.id,
        createdBy: businessCreatedBy,
        assignedAgent: null,
        selfDispatchEnabled: { $ne: false },
        status: { $nin: TERMINAL_SERVICE_CALL_STATUSES },
      },
      {
        $set: {
          assignedAgent: agentId,
          assignedDate: acceptedAt,
          assignmentNotifiedAt: acceptedAt,
          agentAccepted: true,
          status: 'assigned',
          selfAcceptedBy: agentId,
          selfAcceptedAt: acceptedAt,
          dispatchStatus: 'self-dispatch-claimed',
        },
        $push: {
          selfDispatchAudit: {
            agent: agentId,
            action: 'accepted',
            reason: 'Self-accepted by eligible agent',
            timestamp: acceptedAt,
          },
        },
      },
      { new: true }
    )
      .populate('customer', 'businessName contactFirstName contactLastName customerId phoneNumber alternatePhone')
      .populate('assignedAgent', 'firstName lastName employeeId');

    if (!updatedServiceCall) {
      await appendSelfDispatchAudit(serviceCall._id, {
        agent: agentId,
        action: 'rejected',
        reason: 'This service call has already been claimed',
      });

      return res.status(409).json({ message: 'This service call has already been claimed' });
    }

    logInfo(`✅ Service call self-accepted: ${updatedServiceCall.callNumber} by ${eligibility.agent.employeeId}`);
    res.json({
      message: 'Service call self-accepted successfully',
      serviceCall: withResolvedServiceLocation(updatedServiceCall),
      meta: eligibility.meta,
    });
  } catch (error) {
    logError('Self-accept service call error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete service call
// @route   DELETE /api/service-calls/:id
// @access  Private
export const deleteServiceCall = async (req, res) => {
  try {
    const serviceCall = await ServiceCall.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!serviceCall) {
      return res.status(404).json({ message: 'Service call not found' });
    }

    await serviceCall.deleteOne();
    logInfo(`✅ Service call deleted: ${serviceCall.callNumber}`);
    res.json({ message: 'Service call removed successfully' });
  } catch (error) {
    logError('Delete service call error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add parts used to service call
// @route   POST /api/service-calls/:id/parts
// @access  Private
export const addParts = async (req, res) => {
  try {
    const { partsUsed } = req.body;

    if (!partsUsed || !Array.isArray(partsUsed) || partsUsed.length === 0) {
      return res.status(400).json({ message: 'Parts used is required' });
    }

    const serviceCall = await ServiceCall.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!serviceCall) {
      return res.status(404).json({ message: 'Service call not found' });
    }

    // Validate parts structure and calculate totals
    const validatedParts = partsUsed.map(part => {
      if (!part.description || !part.quantity || !part.unitPrice) {
        throw new Error('Each part must have description, quantity, and unitPrice');
      }
      return {
        description: part.description,
        quantity: part.quantity,
        unitPrice: part.unitPrice,
        total: part.quantity * part.unitPrice
      };
    });

    // Add parts to service call
    serviceCall.partsUsed = [...(serviceCall.partsUsed || []), ...validatedParts];

    // Recalculate total parts cost
    serviceCall.partsCost = serviceCall.partsUsed.reduce((sum, part) => sum + part.total, 0);

    const updatedServiceCall = await serviceCall.save();
    await updatedServiceCall.populate('customer', 'businessName contactFirstName contactLastName');
    await updatedServiceCall.populate('assignedAgent', 'firstName lastName employeeId');

    logInfo(`✅ Parts added to service call ${updatedServiceCall.callNumber}`);
    res.json(withResolvedServiceLocation(updatedServiceCall));
  } catch (error) {
    logError('Add parts error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Upload before/after photos
// @route   POST /api/service-calls/:id/photos
// @access  Private
export const uploadPhotos = async (req, res) => {
  try {
    const { photoType, photoUrls } = req.body;

    if (!photoType || !['before', 'after'].includes(photoType)) {
      return res.status(400).json({ message: 'Photo type must be "before" or "after"' });
    }

    if (!photoUrls || !Array.isArray(photoUrls) || photoUrls.length === 0) {
      return res.status(400).json({ message: 'At least one photo URL is required' });
    }

    const serviceCall = await ServiceCall.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!serviceCall) {
      return res.status(404).json({ message: 'Service call not found' });
    }

    // Add photos to appropriate array
    if (photoType === 'before') {
      serviceCall.beforePhotos = [...(serviceCall.beforePhotos || []), ...photoUrls];
    } else {
      serviceCall.afterPhotos = [...(serviceCall.afterPhotos || []), ...photoUrls];
    }

    const updatedServiceCall = await serviceCall.save();
    await updatedServiceCall.populate('customer', 'businessName contactFirstName contactLastName');
    await updatedServiceCall.populate('assignedAgent', 'firstName lastName employeeId');

    logInfo(`✅ ${photoType} photos uploaded for service call ${updatedServiceCall.callNumber}`);
    res.json(withResolvedServiceLocation(updatedServiceCall));
  } catch (error) {
    logError('Upload photos error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Submit rating for completed service call
// @route   POST /api/service-calls/:id/rating
// @access  Private
export const submitRating = async (req, res) => {
  try {
    const { rating, feedback, stage = 'completedService' } = req.body;
    const numericRating = Number(rating);

    if (!numericRating || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const serviceCall = await ServiceCall.findOne(buildServiceCallAccessFilter(req, req.params.id));

    if (!serviceCall) {
      return res.status(404).json({ message: 'Service call not found' });
    }

    const stagedFeedbackAllowed = ['quotation', 'proForma', 'invoice', 'general'].includes(stage);
    if (!stagedFeedbackAllowed && serviceCall.status !== 'completed' && serviceCall.status !== 'invoiced') {
      return res.status(409).json({
        message: 'Can only rate completed or invoiced service calls',
      });
    }

    // Update service call with latest rating snapshot
    serviceCall.rating = numericRating;
    serviceCall.customerFeedback = feedback || '';
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

    const savedServiceCall = await serviceCall.save();
    const updatedServiceCall = savedServiceCall && typeof savedServiceCall === 'object'
      ? savedServiceCall
      : serviceCall;

    // Update agent rating only once actual service delivery or invoice-stage feedback is captured
    if (updatedServiceCall.assignedAgent && ['invoice', 'completedService'].includes(stage)) {
      const FieldServiceAgent = await import('../models/FieldServiceAgent.model.js').then((m) => m.default);
      const agent = await FieldServiceAgent.findById(updatedServiceCall.assignedAgent);

      if (agent) {
        agent.updateRating(numericRating);
        await agent.save();
        logInfo(`✅ Agent rating updated: ${agent.firstName} ${agent.lastName} - Average: ${agent.averageRating}`);
      }
    }

    if (typeof updatedServiceCall.populate === 'function') {
      await updatedServiceCall.populate('customer', 'businessName contactFirstName contactLastName');
      await updatedServiceCall.populate('assignedAgent', 'firstName lastName employeeId');
    }

    logInfo(`✅ Rating submitted for service call ${updatedServiceCall.callNumber}: ${numericRating} stars (${stage})`);
    res.json(withResolvedServiceLocation(updatedServiceCall));
  } catch (error) {
    logError('Submit rating error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get service call by status
// @route   GET /api/service-calls/status/:status
// @access  Private
export const getServiceCallsByStatus = async (req, res) => {
  try {
    const { status } = req.params;

    const serviceCalls = await ServiceCall.find({
      status: status,
      createdBy: req.user._id
    })
      .populate('customer', 'businessName contactFirstName contactLastName customerId phoneNumber alternatePhone')
      .populate('assignedAgent', 'firstName lastName employeeId')
      .sort({ createdAt: -1 });

    res.json(withResolvedServiceLocations(serviceCalls));
  } catch (error) {
    logError('Get service calls by status error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get service calls by agent
// @route   GET /api/service-calls/agent/:agentId
// @access  Private
export const getServiceCallsByAgent = async (req, res) => {
  try {
    const { agentId } = req.params;

    const serviceCalls = await ServiceCall.find({
      assignedAgent: agentId,
      createdBy: req.user._id
    })
      .populate('customer', 'businessName contactFirstName contactLastName customerId phoneNumber alternatePhone')
      .populate('assignedAgent', 'firstName lastName employeeId')
      .sort({ createdAt: -1 });

    res.json(withResolvedServiceLocations(serviceCalls));
  } catch (error) {
    logError('Get service calls by agent error:', error);
    res.status(500).json({ message: error.message });
  }
};
