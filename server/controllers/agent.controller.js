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

// @desc    Get agent performance metrics
// @route   GET /api/agents/:id/performance
// @access  Private
export const getAgentPerformance = async (req, res) => {
  try {
    const agent = await FieldServiceAgent.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    res.json({
      agent: {
        _id: agent._id,
        firstName: agent.firstName,
        lastName: agent.lastName,
        employeeId: agent.employeeId
      },
      performance: {
        totalJobsAttended: agent.totalJobsAttended,
        averageRating: agent.averageRating.toFixed(2),
        ratingsCount: agent.ratingsCount,
        hourlyRate: agent.hourlyRate,
        specializations: agent.specializations,
        availability: agent.availability
      },
      estimatedMetrics: {
        averageEarningsPerJob: agent.hourlyRate > 0 && agent.totalJobsAttended > 0 
          ? (agent.hourlyRate * 2).toFixed(2) // Assuming 2-hour average job
          : 0
      }
    });
  } catch (error) {
    logError('Get agent performance error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get agents by specialization
// @route   GET /api/agents/specialization/:specialization
// @access  Private
export const getAgentsBySpecialization = async (req, res) => {
  try {
    const { specialization } = req.params;

    const agents = await FieldServiceAgent.find({
      specializations: specialization,
      createdBy: req.user._id
    })
      .sort({ averageRating: -1, totalJobsAttended: -1 });

    res.json(agents);
  } catch (error) {
    logError('Get agents by specialization error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get top-rated agents
// @route   GET /api/agents/top-rated
// @access  Private
export const getTopRatedAgents = async (req, res) => {
  try {
    const { limit = 10, minRatings = 3 } = req.query;

    const agents = await FieldServiceAgent.find({
      createdBy: req.user._id,
      ratingsCount: { $gte: minRatings }
    })
      .sort({ averageRating: -1, totalJobsAttended: -1 })
      .limit(parseInt(limit));

    res.json(agents);
  } catch (error) {
    logError('Get top-rated agents error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update agent availability
// @route   PATCH /api/agents/:id/availability
// @access  Private
export const updateAgentAvailability = async (req, res) => {
  try {
    const { availability } = req.body;

    const validAvailability = ['available', 'busy', 'off-duty'];
    if (!availability || !validAvailability.includes(availability)) {
      return res.status(400).json({ 
        message: `Availability must be one of: ${validAvailability.join(', ')}` 
      });
    }

    const agent = await FieldServiceAgent.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    agent.availability = availability;
    if (availability !== 'off-duty' && agent.currentLocation) {
      agent.currentLocation.updatedAt = new Date();
    }

    const updatedAgent = await agent.save();
    logInfo(`✅ Agent availability updated: ${updatedAgent.employeeId} → ${availability}`);
    res.json(updatedAgent);
  } catch (error) {
    logError('Update agent availability error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update agent location
// @route   PATCH /api/agents/:id/location
// @access  Private
export const updateAgentLocation = async (req, res) => {
  try {
    const { lat, lng } = req.body;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    const agent = await FieldServiceAgent.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    agent.currentLocation = {
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      updatedAt: new Date()
    };

    const updatedAgent = await agent.save();
    logInfo(`✅ Agent location updated: ${updatedAgent.employeeId} (${lat}, ${lng})`);
    res.json(updatedAgent);
  } catch (error) {
    logError('Update agent location error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get available agents for assignment
// @route   GET /api/agents/available/list
// @access  Private
export const getAvailableAgents = async (req, res) => {
  try {
    const { specialization } = req.query;

    const filter = {
      availability: 'available',
      createdBy: req.user._id
    };

    if (specialization) {
      filter.specializations = specialization;
    }

    const agents = await FieldServiceAgent.find(filter)
      .sort({ averageRating: -1, totalJobsAttended: -1 });

    res.json(agents);
  } catch (error) {
    logError('Get available agents error:', error);
    res.status(500).json({ message: error.message });
  }
};
