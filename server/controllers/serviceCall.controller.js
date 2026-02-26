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
