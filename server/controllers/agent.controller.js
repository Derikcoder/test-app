import FieldServiceAgent from '../models/FieldServiceAgent.model.js';
import { logError, logInfo } from '../middleware/logger.middleware.js';

// @desc    Get all field service agents
// @route   GET /api/agents
// @access  Private
export const getAgents = async (req, res) => {
  try {
    const agents = await FieldServiceAgent.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
    res.json(agents);
  } catch (error) {
    logError('Get agents error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single field service agent
// @route   GET /api/agents/:id
// @access  Private
export const getAgentById = async (req, res) => {
  try {
    const agent = await FieldServiceAgent.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    res.json(agent);
  } catch (error) {
    logError('Get agent error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new field service agent
// @route   POST /api/agents
// @access  Private
export const createAgent = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phoneNumber,
      employeeId,
      skills,
      status,
      assignedArea,
      vehicleNumber,
      notes
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !phoneNumber || !employeeId) {
      return res.status(400).json({ message: 'Please fill in all required fields' });
    }

    // Check if employeeId or email already exists
    const agentExists = await FieldServiceAgent.findOne({
      $or: [{ employeeId }, { email }]
    });

    if (agentExists) {
      return res.status(400).json({
        message: agentExists.employeeId === employeeId
          ? 'Employee ID already exists'
          : 'Email already registered'
      });
    }

    const agent = await FieldServiceAgent.create({
      firstName,
      lastName,
      email,
      phoneNumber,
      employeeId,
      skills,
      status,
      assignedArea,
      vehicleNumber,
      notes,
      createdBy: req.user._id
    });

    logInfo(`✅ Agent created: ${agent.firstName} ${agent.lastName} (${agent.employeeId})`);
    res.status(201).json(agent);
  } catch (error) {
    logError('Create agent error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update field service agent
// @route   PUT /api/agents/:id
// @access  Private
export const updateAgent = async (req, res) => {
  try {
    const agent = await FieldServiceAgent.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    // Check if trying to update immutable fields
    const attemptedImmutableUpdates = FieldServiceAgent.IMMUTABLE_FIELDS.filter(
      field => req.body[field] !== undefined && req.body[field] !== agent[field]
    );

    if (attemptedImmutableUpdates.length > 0) {
      return res.status(403).json({
        message: 'Cannot update protected fields',
        protectedFields: attemptedImmutableUpdates
      });
    }

    // Update editable fields
    FieldServiceAgent.EDITABLE_FIELDS.forEach(field => {
      if (req.body[field] !== undefined) {
        agent[field] = req.body[field];
      }
    });

    const updatedAgent = await agent.save();
    logInfo(`✅ Agent updated: ${updatedAgent.employeeId}`);
    res.json(updatedAgent);
  } catch (error) {
    logError('Update agent error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete field service agent
// @route   DELETE /api/agents/:id
// @access  Private
export const deleteAgent = async (req, res) => {
  try {
    const agent = await FieldServiceAgent.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    await agent.deleteOne();
    logInfo(`✅ Agent deleted: ${agent.employeeId}`);
    res.json({ message: 'Agent removed successfully' });
  } catch (error) {
    logError('Delete agent error:', error);
    res.status(500).json({ message: error.message });
  }
};
