import ServiceCall from '../models/ServiceCall.model.js';
import { logError, logInfo } from '../middleware/logger.middleware.js';

// @desc    Get all service calls
// @route   GET /api/service-calls
// @access  Private
export const getServiceCalls = async (req, res) => {
  try {
    const serviceCalls = await ServiceCall.find({ createdBy: req.user._id })
      .populate('customer', 'businessName contactFirstName contactLastName customerId')
      .populate('assignedAgent', 'firstName lastName employeeId')
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
      .populate('assignedAgent');

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
      internalNotes
    } = req.body;

    // Validate required fields
    if (!customer || !title || !description || !serviceType) {
      return res.status(400).json({ message: 'Please fill in all required fields' });
    }

    const serviceCall = await ServiceCall.create({
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
      createdBy: req.user._id
    });

    // Populate customer and agent details
    await serviceCall.populate('customer', 'businessName contactFirstName contactLastName');
    await serviceCall.populate('assignedAgent', 'firstName lastName employeeId');

    logInfo(`✅ Service call created: ${serviceCall.callNumber}`);
    res.status(201).json(serviceCall);
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

    // Auto-set completedDate if status is completed
    if (req.body.status === 'completed' && !serviceCall.completedDate) {
      serviceCall.completedDate = new Date();
    }

    const updatedServiceCall = await serviceCall.save();
    await updatedServiceCall.populate('customer', 'businessName contactFirstName contactLastName');
    await updatedServiceCall.populate('assignedAgent', 'firstName lastName employeeId');

    logInfo(`✅ Service call updated: ${updatedServiceCall.callNumber}`);
    res.json(updatedServiceCall);
  } catch (error) {
    logError('Update service call error:', error);
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
      .populate('customer', 'businessName contactFirstName contactLastName customerId')
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
      .populate('customer', 'businessName contactFirstName contactLastName customerId')
      .populate('assignedAgent', 'firstName lastName employeeId')
      .sort({ createdAt: -1 });

    res.json(serviceCalls);
  } catch (error) {
    logError('Get service calls by agent error:', error);
    res.status(500).json({ message: error.message });
  }
};
