/**
 * @file agent.controller.test.js
 * @description Unit tests for Field Service Agent controller
 */

import {
  getAgents,
  getAgentById,
  getMyAgentProfile,
  createAgent,
  updateAgent,
  deleteAgent,
  getAgentPerformance,
  getAgentsBySpecialization,
  getTopRatedAgents,
  updateAgentAvailability,
  updateAgentLocation,
  updateAgentSelfDispatchAccess,
  getAvailableAgents,
} from '../../../controllers/agent.controller.js';
import FieldServiceAgent from '../../../models/FieldServiceAgent.model.js';

jest.mock('../../../models/FieldServiceAgent.model.js');
jest.mock('../../../utils/sequence.util.js', () => ({
  getNextSequenceValue: jest.fn().mockResolvedValue(1),
  formatSequenceId: jest.fn().mockReturnValue('AGT-000001'),
}));
jest.mock('../../../middleware/logger.middleware.js', () => ({
  logError: jest.fn(),
  logInfo: jest.fn(),
}));

describe('Agent Controller', () => {
  let req;
  let res;

  const mockAgent = {
    _id: 'agent-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phoneNumber: '0800001234',
    employeeId: 'EMP-001',
    skills: ['HVAC'],
    specializations: ['HVAC_REFRIGERATION'],
    totalJobsAttended: 10,
    averageRating: 4.5,
    ratingsCount: 8,
    hourlyRate: 150,
    availability: 'available',
    status: 'active',
    selfDispatchSuspended: false,
    currentLocation: null,
    createdBy: 'user-1',
    save: jest.fn().mockResolvedValue(this),
    deleteOne: jest.fn().mockResolvedValue({}),
  };

  beforeEach(() => {
    req = {
      params: {},
      body: {},
      query: {},
      user: { _id: 'user-1' },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    jest.clearAllMocks();

    // Reset static properties
    FieldServiceAgent.IMMUTABLE_FIELDS = ['firstName', 'lastName', 'employeeId', 'createdAt', '_id', 'createdBy'];
    FieldServiceAgent.EDITABLE_FIELDS = [
      'email', 'phoneNumber', 'skills', 'specializations', 'totalJobsAttended',
      'averageRating', 'ratingsCount', 'hourlyRate', 'status', 'availability',
      'currentLocation', 'assignedArea', 'selfDispatchSuspended',
      'selfDispatchSuspendedReason', 'vehicleNumber', 'notes',
    ];
  });

  // ─── getAgents ───────────────────────────────────────────────────────────────

  describe('getAgents', () => {
    test('returns list of agents for the authenticated user', async () => {
      const agents = [mockAgent];
      FieldServiceAgent.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue(agents),
      });

      await getAgents(req, res);

      expect(FieldServiceAgent.find).toHaveBeenCalledWith({ createdBy: 'user-1' });
      expect(res.json).toHaveBeenCalledWith(agents);
    });

    test('returns 500 on database error', async () => {
      FieldServiceAgent.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockRejectedValue(new Error('DB error')),
      });

      await getAgents(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'DB error' });
    });
  });

  // ─── getAgentById ─────────────────────────────────────────────────────────────

  describe('getAgentById', () => {
    test('returns agent when found', async () => {
      req.params.id = 'agent-1';
      FieldServiceAgent.findOne = jest.fn().mockResolvedValue(mockAgent);

      await getAgentById(req, res);

      expect(FieldServiceAgent.findOne).toHaveBeenCalledWith({ _id: 'agent-1', createdBy: 'user-1' });
      expect(res.json).toHaveBeenCalledWith(mockAgent);
    });

    test('returns 404 when agent not found', async () => {
      req.params.id = 'nonexistent';
      FieldServiceAgent.findOne = jest.fn().mockResolvedValue(null);

      await getAgentById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Agent not found' });
    });

    test('returns 500 on database error', async () => {
      req.params.id = 'agent-1';
      FieldServiceAgent.findOne = jest.fn().mockRejectedValue(new Error('DB error'));

      await getAgentById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── createAgent ─────────────────────────────────────────────────────────────

  describe('createAgent', () => {
    const validBody = {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
      phoneNumber: '0800009999',
      employeeId: 'EMP-002',
      skills: ['Plumbing'],
    };

    test('creates agent with valid data', async () => {
      req.body = validBody;
      FieldServiceAgent.findOne = jest.fn().mockResolvedValue(null);
      FieldServiceAgent.create = jest.fn().mockResolvedValue({
        ...validBody,
        _id: 'agent-new',
        firstName: 'Jane',
        lastName: 'Smith',
        employeeId: 'EMP-002',
      });

      await createAgent(req, res);

      expect(FieldServiceAgent.create).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });

    test('returns 400 when required fields are missing', async () => {
      req.body = { firstName: 'Jane' };

      await createAgent(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Please fill in all required fields' });
    });

    test('returns 500 when ID generation cannot produce a unique employee ID', async () => {
      req.body = validBody;
      // Email check passes (null), all subsequent ID-collision checks return an existing agent
      FieldServiceAgent.findOne = jest.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValue({ ...mockAgent });

      await createAgent(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Failed to generate a unique employee ID' });
    });

    test('returns 400 when email already registered', async () => {
      req.body = validBody;
      FieldServiceAgent.findOne = jest.fn().mockResolvedValue({
        ...mockAgent,
        employeeId: 'DIFFERENT-ID',
        email: validBody.email,
      });

      await createAgent(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Email already registered' });
    });

    test('returns 500 on database error', async () => {
      req.body = validBody;
      FieldServiceAgent.findOne = jest.fn().mockResolvedValue(null);
      FieldServiceAgent.create = jest.fn().mockRejectedValue(new Error('DB error'));

      await createAgent(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── updateAgent ─────────────────────────────────────────────────────────────

  describe('updateAgent', () => {
    test('updates editable fields successfully', async () => {
      req.params.id = 'agent-1';
      req.body = { phoneNumber: '0800005678' };

      const agentInstance = {
        ...mockAgent,
        save: jest.fn().mockResolvedValue({ ...mockAgent, phoneNumber: '0800005678' }),
      };
      FieldServiceAgent.findOne = jest.fn().mockResolvedValue(agentInstance);

      await updateAgent(req, res);

      expect(agentInstance.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalled();
    });

    test('returns 404 when agent not found', async () => {
      req.params.id = 'nonexistent';
      req.body = { phoneNumber: '0800005678' };
      FieldServiceAgent.findOne = jest.fn().mockResolvedValue(null);

      await updateAgent(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Agent not found' });
    });

    test('returns 403 when trying to update immutable fields', async () => {
      req.params.id = 'agent-1';
      req.body = { firstName: 'NewName' };

      const agentInstance = { ...mockAgent, firstName: 'John' };
      FieldServiceAgent.findOne = jest.fn().mockResolvedValue(agentInstance);

      await updateAgent(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Cannot update protected fields' })
      );
    });

    test('allows setting immutable field to same value (no-op)', async () => {
      req.params.id = 'agent-1';
      req.body = { firstName: 'John', phoneNumber: '0800005678' }; // firstName same as existing

      const agentInstance = {
        ...mockAgent,
        firstName: 'John',
        save: jest.fn().mockResolvedValue({ ...mockAgent, phoneNumber: '0800005678' }),
      };
      FieldServiceAgent.findOne = jest.fn().mockResolvedValue(agentInstance);

      await updateAgent(req, res);

      expect(agentInstance.save).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalledWith(403);
    });

    test('returns 500 on database error', async () => {
      req.params.id = 'agent-1';
      req.body = { phoneNumber: '0800005678' };
      FieldServiceAgent.findOne = jest.fn().mockRejectedValue(new Error('DB error'));

      await updateAgent(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── deleteAgent ─────────────────────────────────────────────────────────────

  describe('deleteAgent', () => {
    test('deletes agent successfully', async () => {
      req.params.id = 'agent-1';
      const agentInstance = { ...mockAgent, deleteOne: jest.fn().mockResolvedValue({}) };
      FieldServiceAgent.findOne = jest.fn().mockResolvedValue(agentInstance);

      await deleteAgent(req, res);

      expect(agentInstance.deleteOne).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ message: 'Agent removed successfully' });
    });

    test('returns 404 when agent not found', async () => {
      req.params.id = 'nonexistent';
      FieldServiceAgent.findOne = jest.fn().mockResolvedValue(null);

      await deleteAgent(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Agent not found' });
    });

    test('returns 500 on database error', async () => {
      req.params.id = 'agent-1';
      FieldServiceAgent.findOne = jest.fn().mockRejectedValue(new Error('DB error'));

      await deleteAgent(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── getAgentPerformance ─────────────────────────────────────────────────────

  describe('getAgentPerformance', () => {
    test('returns performance metrics for found agent', async () => {
      req.params.id = 'agent-1';
      FieldServiceAgent.findOne = jest.fn().mockResolvedValue(mockAgent);

      await getAgentPerformance(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          agent: expect.objectContaining({ employeeId: 'EMP-001' }),
          performance: expect.objectContaining({
            totalJobsAttended: 10,
            averageRating: '4.50',
          }),
        })
      );
    });

    test('calculates estimated earnings per job when hourlyRate > 0', async () => {
      req.params.id = 'agent-1';
      FieldServiceAgent.findOne = jest.fn().mockResolvedValue({
        ...mockAgent,
        hourlyRate: 100,
        totalJobsAttended: 5,
      });

      await getAgentPerformance(req, res);

      const call = res.json.mock.calls[0][0];
      expect(call.estimatedMetrics.averageEarningsPerJob).toBe('200.00');
    });

    test('returns 0 estimated earnings when hourlyRate is 0', async () => {
      req.params.id = 'agent-1';
      FieldServiceAgent.findOne = jest.fn().mockResolvedValue({
        ...mockAgent,
        hourlyRate: 0,
        totalJobsAttended: 5,
      });

      await getAgentPerformance(req, res);

      const call = res.json.mock.calls[0][0];
      expect(call.estimatedMetrics.averageEarningsPerJob).toBe(0);
    });

    test('returns 404 when agent not found', async () => {
      req.params.id = 'nonexistent';
      FieldServiceAgent.findOne = jest.fn().mockResolvedValue(null);

      await getAgentPerformance(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('returns 500 on database error', async () => {
      req.params.id = 'agent-1';
      FieldServiceAgent.findOne = jest.fn().mockRejectedValue(new Error('DB error'));

      await getAgentPerformance(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── getAgentsBySpecialization ────────────────────────────────────────────────

  describe('getAgentsBySpecialization', () => {
    test('returns agents matching the specialization', async () => {
      req.params.specialization = 'HVAC_REFRIGERATION';
      const agents = [mockAgent];
      FieldServiceAgent.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue(agents),
      });

      await getAgentsBySpecialization(req, res);

      expect(FieldServiceAgent.find).toHaveBeenCalledWith({
        specializations: 'HVAC_REFRIGERATION',
        createdBy: 'user-1',
      });
      expect(res.json).toHaveBeenCalledWith(agents);
    });

    test('returns empty array when no agents match', async () => {
      req.params.specialization = 'PLUMBING';
      FieldServiceAgent.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue([]),
      });

      await getAgentsBySpecialization(req, res);

      expect(res.json).toHaveBeenCalledWith([]);
    });

    test('returns 500 on database error', async () => {
      req.params.specialization = 'HVAC_REFRIGERATION';
      FieldServiceAgent.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockRejectedValue(new Error('DB error')),
      });

      await getAgentsBySpecialization(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── getTopRatedAgents ────────────────────────────────────────────────────────

  describe('getTopRatedAgents', () => {
    test('returns top-rated agents with default limit and minRatings', async () => {
      const agents = [mockAgent];
      FieldServiceAgent.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(agents),
        }),
      });

      await getTopRatedAgents(req, res);

      expect(FieldServiceAgent.find).toHaveBeenCalledWith({
        createdBy: 'user-1',
        ratingsCount: { $gte: 3 },
      });
      expect(res.json).toHaveBeenCalledWith(agents);
    });

    test('uses custom limit and minRatings from query params', async () => {
      req.query = { limit: '5', minRatings: '10' };
      FieldServiceAgent.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([]),
        }),
      });

      await getTopRatedAgents(req, res);

      // Express query params arrive as strings; the controller passes them directly to MongoDB
      expect(FieldServiceAgent.find).toHaveBeenCalledWith({
        createdBy: 'user-1',
        ratingsCount: { $gte: '10' },
      });
    });

    test('returns 500 on database error', async () => {
      FieldServiceAgent.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockRejectedValue(new Error('DB error')),
        }),
      });

      await getTopRatedAgents(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── updateAgentAvailability ──────────────────────────────────────────────────

  describe('updateAgentAvailability', () => {
    test('updates availability to "available"', async () => {
      req.params.id = 'agent-1';
      req.body = { availability: 'available' };

      const agentInstance = {
        ...mockAgent,
        availability: 'busy',
        currentLocation: null,
        save: jest.fn().mockResolvedValue({ ...mockAgent, availability: 'available' }),
      };
      FieldServiceAgent.findOne = jest.fn().mockResolvedValue(agentInstance);

      await updateAgentAvailability(req, res);

      expect(agentInstance.availability).toBe('available');
      expect(agentInstance.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalled();
    });

    test('updates location timestamp when availability is not off-duty and location exists', async () => {
      req.params.id = 'agent-1';
      req.body = { availability: 'busy' };

      const agentInstance = {
        ...mockAgent,
        availability: 'available',
        currentLocation: { lat: 1.0, lng: 2.0, updatedAt: new Date() },
        save: jest.fn().mockResolvedValue({}),
      };
      FieldServiceAgent.findOne = jest.fn().mockResolvedValue(agentInstance);

      await updateAgentAvailability(req, res);

      expect(agentInstance.currentLocation.updatedAt).toBeInstanceOf(Date);
    });

    test('returns 400 for invalid availability value', async () => {
      req.params.id = 'agent-1';
      req.body = { availability: 'vacation' };

      await updateAgentAvailability(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('Availability must be one of') })
      );
    });

    test('returns 400 when availability is missing', async () => {
      req.params.id = 'agent-1';
      req.body = {};

      await updateAgentAvailability(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('returns 404 when agent not found', async () => {
      req.params.id = 'nonexistent';
      req.body = { availability: 'available' };
      FieldServiceAgent.findOne = jest.fn().mockResolvedValue(null);

      await updateAgentAvailability(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('returns 500 on database error', async () => {
      req.params.id = 'agent-1';
      req.body = { availability: 'available' };
      FieldServiceAgent.findOne = jest.fn().mockRejectedValue(new Error('DB error'));

      await updateAgentAvailability(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── updateAgentLocation ──────────────────────────────────────────────────────

  describe('updateAgentLocation', () => {
    test('updates location successfully', async () => {
      req.params.id = 'agent-1';
      req.body = { lat: -26.2041, lng: 28.0473 };

      const savedAgent = { ...mockAgent, currentLocation: { lat: -26.2041, lng: 28.0473, updatedAt: new Date() } };
      const agentInstance = {
        ...mockAgent,
        save: jest.fn().mockResolvedValue(savedAgent),
      };
      FieldServiceAgent.findOne = jest.fn().mockResolvedValue(agentInstance);

      await updateAgentLocation(req, res);

      expect(agentInstance.currentLocation).toMatchObject({ lat: -26.2041, lng: 28.0473 });
      expect(agentInstance.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalled();
    });

    test('returns 400 when lat is missing', async () => {
      req.params.id = 'agent-1';
      req.body = { lng: 28.0473 };

      await updateAgentLocation(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Latitude and longitude are required' });
    });

    test('returns 400 when lng is missing', async () => {
      req.params.id = 'agent-1';
      req.body = { lat: -26.2041 };

      await updateAgentLocation(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('returns 404 when agent not found', async () => {
      req.params.id = 'nonexistent';
      req.body = { lat: -26.2041, lng: 28.0473 };
      FieldServiceAgent.findOne = jest.fn().mockResolvedValue(null);

      await updateAgentLocation(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('parses string coordinates to floats', async () => {
      req.params.id = 'agent-1';
      req.body = { lat: '-26.2041', lng: '28.0473' };

      const agentInstance = {
        ...mockAgent,
        save: jest.fn().mockResolvedValue({}),
      };
      FieldServiceAgent.findOne = jest.fn().mockResolvedValue(agentInstance);

      await updateAgentLocation(req, res);

      expect(agentInstance.currentLocation.lat).toBe(-26.2041);
      expect(agentInstance.currentLocation.lng).toBe(28.0473);
    });
  });

  // ─── updateAgentSelfDispatchAccess ────────────────────────────────────────────

  describe('updateAgentSelfDispatchAccess', () => {
    test('suspends self-dispatch with a reason', async () => {
      req.params.id = 'agent-1';
      req.body = { selfDispatchSuspended: true, reason: 'Policy violation' };

      const agentInstance = {
        ...mockAgent,
        save: jest.fn().mockResolvedValue({ ...mockAgent, selfDispatchSuspended: true, selfDispatchSuspendedReason: 'Policy violation' }),
      };
      FieldServiceAgent.findOne = jest.fn().mockResolvedValue(agentInstance);

      await updateAgentSelfDispatchAccess(req, res);

      expect(agentInstance.selfDispatchSuspended).toBe(true);
      expect(agentInstance.selfDispatchSuspendedReason).toBe('Policy violation');
      expect(agentInstance.save).toHaveBeenCalled();
    });

    test('re-enables self-dispatch and clears reason', async () => {
      req.params.id = 'agent-1';
      req.body = { selfDispatchSuspended: false };

      const agentInstance = {
        ...mockAgent,
        selfDispatchSuspended: true,
        selfDispatchSuspendedReason: 'Policy violation',
        save: jest.fn().mockResolvedValue({}),
      };
      FieldServiceAgent.findOne = jest.fn().mockResolvedValue(agentInstance);

      await updateAgentSelfDispatchAccess(req, res);

      expect(agentInstance.selfDispatchSuspendedReason).toBe('');
    });

    test('returns 400 when selfDispatchSuspended is not a boolean', async () => {
      req.params.id = 'agent-1';
      req.body = { selfDispatchSuspended: 'yes' };

      await updateAgentSelfDispatchAccess(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'selfDispatchSuspended must be a boolean value' });
    });

    test('returns 404 when agent not found', async () => {
      req.params.id = 'nonexistent';
      req.body = { selfDispatchSuspended: true };
      FieldServiceAgent.findOne = jest.fn().mockResolvedValue(null);

      await updateAgentSelfDispatchAccess(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('returns 500 on database error', async () => {
      req.params.id = 'agent-1';
      req.body = { selfDispatchSuspended: true };
      FieldServiceAgent.findOne = jest.fn().mockRejectedValue(new Error('DB error'));

      await updateAgentSelfDispatchAccess(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── getAvailableAgents ───────────────────────────────────────────────────────

  describe('getAvailableAgents', () => {
    test('returns available agents without specialization filter', async () => {
      const agents = [mockAgent];
      FieldServiceAgent.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue(agents),
      });

      await getAvailableAgents(req, res);

      expect(FieldServiceAgent.find).toHaveBeenCalledWith({
        availability: 'available',
        createdBy: 'user-1',
      });
      expect(res.json).toHaveBeenCalledWith(agents);
    });

    test('filters available agents by specialization when provided', async () => {
      req.query = { specialization: 'ELECTRICAL' };
      FieldServiceAgent.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue([]),
      });

      await getAvailableAgents(req, res);

      expect(FieldServiceAgent.find).toHaveBeenCalledWith({
        availability: 'available',
        createdBy: 'user-1',
        specializations: 'ELECTRICAL',
      });
    });

    test('returns 500 on database error', async () => {
      FieldServiceAgent.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockRejectedValue(new Error('DB error')),
      });

      await getAvailableAgents(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── getMyAgentProfile ───────────────────────────────────────────────────────

  describe('getMyAgentProfile', () => {
    test('returns agent profile linked to the calling user account', async () => {
      req.user = { _id: 'user-agent-1' };
      FieldServiceAgent.findOne = jest.fn().mockResolvedValue(mockAgent);

      await getMyAgentProfile(req, res);

      expect(FieldServiceAgent.findOne).toHaveBeenCalledWith({ userAccount: 'user-agent-1' });
      expect(res.json).toHaveBeenCalledWith(mockAgent);
    });

    test('returns 404 when no linked agent profile exists', async () => {
      req.user = { _id: 'user-no-agent' };
      FieldServiceAgent.findOne = jest.fn().mockResolvedValue(null);

      await getMyAgentProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Agent profile not found' });
    });

    test('returns 500 on database error', async () => {
      req.user = { _id: 'user-agent-1' };
      FieldServiceAgent.findOne = jest.fn().mockRejectedValue(new Error('DB error'));

      await getMyAgentProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
