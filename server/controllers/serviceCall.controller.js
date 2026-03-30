import ServiceCall from '../models/ServiceCall.model.js';
import FieldServiceAgent from '../models/FieldServiceAgent.model.js';
import Customer from '../models/Customer.model.js';
import Equipment from '../models/Equipment.model.js';
import { logError, logInfo } from '../middleware/logger.middleware.js';

const TERMINAL_SERVICE_CALL_STATUSES = ['completed', 'invoiced', 'cancelled'];

const SERVICE_HISTORY_STATUSES = ['completed', 'invoiced'];

const syncEquipmentServiceHistory = async ({ serviceCall, createdBy }) => {
  if (!serviceCall?.equipment || !SERVICE_HISTORY_STATUSES.includes(serviceCall.status)) {
    return;
  }

  const completedDate = serviceCall.completedDate || new Date();

  await Equipment.updateOne(
    { _id: serviceCall.equipment, createdBy },
    {
      $addToSet: { serviceHistory: serviceCall._id },
      $set: { lastServiceDate: completedDate },
    }
  );
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

const classifyServiceCallPersistenceError = (error) => {
  if (error?.code === 11000) {
    const duplicateField = Object.keys(error.keyPattern || {})[0] || 'field';
    return {
      status: 409,
      message: `Duplicate value for ${duplicateField}`,
    };
  }

  if (error?.name === 'ValidationError' || error?.name === 'CastError') {
    return {
      status: 400,
      message: error.message,
    };
  }

  return null;
};

// @desc    Get all service calls
// @route   GET /api/service-calls
// @access  Private
export const getServiceCalls = async (req, res) => {
  try {
    const serviceCalls = await ServiceCall.find({ createdBy: req.user._id })
      .populate('customer', 'businessName contactFirstName contactLastName customerId phoneNumber alternatePhone')
      .populate('assignedAgent', 'firstName lastName employeeId')
      .populate('quotation', 'quotationNumber title status totalAmount')
      .populate('proFormaInvoice', 'invoiceNumber documentType workflowStatus totalAmount depositRequired depositAmount')
      .populate('invoice', 'invoiceNumber documentType workflowStatus totalAmount paymentStatus')
      .sort({ createdAt: -1 });
    res.json(serviceCalls);
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
    const serviceCall = await ServiceCall.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    })
      .populate('customer')
      .populate('assignedAgent')
      .populate('quotation')
      .populate('proFormaInvoice')
      .populate('invoice');

    if (!serviceCall) {
      return res.status(404).json({ message: 'Service call not found' });
    }

    res.json(serviceCall);
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
      siteId,
      equipment,
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

      // Try to find existing customer by email in same tenant.
      const existingCustomer = await Customer.findOne({
        email: normalizedEmail,
        createdBy: req.user._id,
      });

      if (existingCustomer) {
        resolvedCustomer = existingCustomer._id;
        logInfo(`✅ Linked service call to existing customer: ${existingCustomer.businessName || existingCustomer.contactFirstName}`);
      } else {
        try {
          // Split contact name safely so required last name is always present.
          const nameParts = rawContactPerson.split(' ').filter(Boolean);
          const firstName = nameParts[0] || 'Private';
          const lastName = nameParts.slice(1).join(' ') || 'Customer';

          const addressParts = [
            bookingRequest?.administrativeAddress?.streetAddress,
            bookingRequest?.administrativeAddress?.suburb,
            bookingRequest?.administrativeAddress?.cityDistrict,
            bookingRequest?.administrativeAddress?.province,
          ].filter(Boolean);

          const physicalAddress = addressParts.join(', ') || 'Address pending';
          const safePhone = rawPhone || 'Phone pending';

          const customerIdSuffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-8);
          const newCustomerRecord = await Customer.create({
            customerType: 'residential',
            contactFirstName: firstName,
            contactLastName: lastName,
            email: normalizedEmail,
            phoneNumber: safePhone,
            customerId: `RES-${customerIdSuffix}`,
            physicalAddress,
            accountStatus: 'active',
            createdBy: req.user._id,
          });

          resolvedCustomer = newCustomerRecord._id;
          logInfo(`✅ Auto-created residential customer from booking request: ${newCustomerRecord.contactFirstName} ${newCustomerRecord.contactLastName}`);
        } catch (err) {
          logError('⚠️ Failed to auto-create customer from booking request', {
            message: err?.message,
            bookingContact: bookingRequest?.contact,
          });
        }
      }
    }

    const serviceCall = await ServiceCall.create({
      callNumber: resolvedCallNumber,
      customer: resolvedCustomer,
      siteId,
      equipment,
      assignedAgent,
      title,
      description,
      priority: normalizedPriority,
      status,
      serviceType,
      scheduledDate,
      estimatedDuration,
      serviceLocation,
      notes,
      internalNotes,
      bookingRequest,
      createdBy: req.user._id
    });

    await syncEquipmentServiceHistory({
      serviceCall,
      createdBy: req.user._id,
    });

    // Populate customer and agent details
    await serviceCall.populate('customer', 'businessName contactFirstName contactLastName');
    await serviceCall.populate('assignedAgent', 'firstName lastName employeeId');

    logInfo(`✅ Service call created: ${serviceCall.callNumber}`);
    res.status(201).json({ data: serviceCall });
  } catch (error) {
    logError('Create service call error:', error);
    const classifiedError = classifyServiceCallPersistenceError(error);
    if (classifiedError) {
      return res.status(classifiedError.status).json({ message: classifiedError.message });
    }

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

    const serviceCall = await ServiceCall.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!serviceCall) {
      return res.status(404).json({ message: 'Service call not found' });
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

    const updatedServiceCall = await serviceCall.save();

    await syncEquipmentServiceHistory({
      serviceCall: updatedServiceCall,
      createdBy: req.user._id,
    });

    await updatedServiceCall.populate('customer', 'businessName contactFirstName contactLastName');
    await updatedServiceCall.populate('assignedAgent', 'firstName lastName employeeId');

    logInfo(`✅ Service call updated: ${updatedServiceCall.callNumber}`);
    res.json(updatedServiceCall);
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
    const eligibility = await getAgentSelfDispatchEligibility({
      createdBy: req.user._id,
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
      createdBy: req.user._id,
      assignedAgent: null,
      selfDispatchEnabled: { $ne: false },
      status: { $nin: TERMINAL_SERVICE_CALL_STATUSES },
    })
      .populate('customer', 'businessName contactFirstName contactLastName customerId phoneNumber alternatePhone')
      .sort({ createdAt: -1 });

    res.json({ jobs, meta: eligibility.meta });
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

    const serviceCall = await ServiceCall.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!serviceCall) {
      return res.status(404).json({ message: 'Service call not found' });
    }

    const eligibility = await getAgentSelfDispatchEligibility({
      createdBy: req.user._id,
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
        createdBy: req.user._id,
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
      serviceCall: updatedServiceCall,
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
    res.json(updatedServiceCall);
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
    res.json(updatedServiceCall);
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
    const { rating, feedback } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const serviceCall = await ServiceCall.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!serviceCall) {
      return res.status(404).json({ message: 'Service call not found' });
    }

    if (serviceCall.status !== 'completed' && serviceCall.status !== 'invoiced') {
      return res.status(409).json({ 
        message: 'Can only rate completed or invoiced service calls' 
      });
    }

    // Update service call with rating
    serviceCall.rating = rating;
    serviceCall.customerFeedback = feedback || '';
    serviceCall.ratedDate = new Date();

    const updatedServiceCall = await serviceCall.save();

    // Update agent rating if assigned
    if (updatedServiceCall.assignedAgent) {
      const FieldServiceAgent = await import('../models/FieldServiceAgent.model.js').then(m => m.default);
      const agent = await FieldServiceAgent.findById(updatedServiceCall.assignedAgent);
      
      if (agent) {
        agent.updateRating(rating);
        await agent.save();
        logInfo(`✅ Agent rating updated: ${agent.firstName} ${agent.lastName} - Average: ${agent.averageRating}`);
      }
    }

    await updatedServiceCall.populate('customer', 'businessName contactFirstName contactLastName');
    await updatedServiceCall.populate('assignedAgent', 'firstName lastName employeeId');

    logInfo(`✅ Rating submitted for service call ${updatedServiceCall.callNumber}: ${rating} stars`);
    res.json(updatedServiceCall);
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

    res.json(serviceCalls);
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

    res.json(serviceCalls);
  } catch (error) {
    logError('Get service calls by agent error:', error);
    res.status(500).json({ message: error.message });
  }
};
