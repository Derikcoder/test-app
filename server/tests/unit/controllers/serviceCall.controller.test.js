/**
 * @file serviceCall.controller.test.js
 * @description Unit tests for Sprint 1 self-dispatch controller behavior
 */

import {
  getEligibleUnassignedServiceCalls,
  getMyAssignedServiceCalls,
  selfAcceptServiceCall,
} from '../../../controllers/serviceCall.controller.js';
import ServiceCall from '../../../models/ServiceCall.model.js';
import FieldServiceAgent from '../../../models/FieldServiceAgent.model.js';

jest.mock('../../../models/ServiceCall.model.js');
jest.mock('../../../models/FieldServiceAgent.model.js');
jest.mock('../../../middleware/logger.middleware.js', () => ({
  logError: jest.fn(),
  logInfo: jest.fn(),
}));

describe('Service Call Controller - Self Dispatch', () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      params: {},
      body: {},
      user: { _id: 'user-1' },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    jest.clearAllMocks();
  });

  test('returns eligible unassigned jobs for an available active agent', async () => {
    req.params.agentId = 'agent-1';

    FieldServiceAgent.findOne = jest.fn().mockResolvedValue({
      _id: 'agent-1',
      status: 'active',
      availability: 'available',
      selfDispatchSuspended: false,
    });

    ServiceCall.countDocuments = jest.fn().mockResolvedValue(0);
    ServiceCall.find = jest
      .fn()
      .mockReturnValueOnce({
        select: jest.fn().mockResolvedValue([]),
      })
      .mockReturnValueOnce({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue([
            { _id: 'call-1', callNumber: 'SC-000001', assignedAgent: null },
          ]),
        }),
      });

    await getEligibleUnassignedServiceCalls(req, res);

    expect(res.json).toHaveBeenCalledWith({
      jobs: [{ _id: 'call-1', callNumber: 'SC-000001', assignedAgent: null }],
      meta: {
        acceptedTodayCount: 0,
        remainingDailySelfAccepts: 2,
        weeklyParticipationDaysUsed: 0,
        remainingWeeklyParticipationDays: 5,
      },
    });
  });

  test('rejects eligible jobs request when agent is not available', async () => {
    req.params.agentId = 'agent-1';

    FieldServiceAgent.findOne = jest.fn().mockResolvedValue({
      _id: 'agent-1',
      status: 'active',
      availability: 'busy',
      selfDispatchSuspended: false,
    });

    await getEligibleUnassignedServiceCalls(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Agent is not currently available for self-dispatch',
      jobs: [],
      meta: null,
    });
  });

  test('self-accepts a service call successfully for an eligible agent', async () => {
    req.params.id = 'call-1';
    req.body.agentId = 'agent-1';

    FieldServiceAgent.findOne = jest.fn().mockResolvedValue({
      _id: 'agent-1',
      employeeId: 'AGT-100',
      status: 'active',
      availability: 'available',
      selfDispatchSuspended: false,
    });

    ServiceCall.findOne = jest.fn().mockResolvedValue({
      _id: 'call-1',
      callNumber: 'SC-000010',
      assignedAgent: null,
      selfDispatchEnabled: true,
      status: 'pending',
    });

    ServiceCall.countDocuments = jest.fn().mockResolvedValue(0);
    ServiceCall.find = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue([]),
    });

    const populatedCall = {
      _id: 'call-1',
      callNumber: 'SC-000010',
      assignedAgent: { _id: 'agent-1', firstName: 'Jane', lastName: 'Doe', employeeId: 'AGT-100' },
      status: 'assigned',
      agentAccepted: true,
    };

    ServiceCall.findOneAndUpdate = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(populatedCall),
      }),
    });

    await selfAcceptServiceCall(req, res);

    expect(ServiceCall.findOneAndUpdate).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      message: 'Service call self-accepted successfully',
      serviceCall: populatedCall,
      meta: {
        acceptedTodayCount: 0,
        remainingDailySelfAccepts: 2,
        weeklyParticipationDaysUsed: 0,
        remainingWeeklyParticipationDays: 5,
      },
    });
  });

  test('rejects self-accept when daily limit has been reached', async () => {
    req.params.id = 'call-1';
    req.body.agentId = 'agent-1';

    FieldServiceAgent.findOne = jest.fn().mockResolvedValue({
      _id: 'agent-1',
      status: 'active',
      availability: 'available',
      selfDispatchSuspended: false,
    });

    ServiceCall.findOne = jest.fn().mockResolvedValue({
      _id: 'call-1',
      callNumber: 'SC-000010',
      assignedAgent: null,
      selfDispatchEnabled: true,
      status: 'pending',
    });

    ServiceCall.countDocuments = jest.fn().mockResolvedValue(2);
    ServiceCall.find = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue([]),
    });
    ServiceCall.updateOne = jest.fn().mockResolvedValue({ acknowledged: true });

    await selfAcceptServiceCall(req, res);

    expect(ServiceCall.updateOne).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Daily self-accept limit reached',
      meta: {
        acceptedTodayCount: 2,
        remainingDailySelfAccepts: 0,
        weeklyParticipationDaysUsed: 0,
        remainingWeeklyParticipationDays: 5,
      },
    });
  });

  // ─── getMyAssignedServiceCalls ────────────────────────────────────────────────

  describe('getMyAssignedServiceCalls', () => {
    const mockCall = {
      _id: 'call-1',
      callNumber: 'SC-000001',
      assignedAgent: { _id: 'agent-1', firstName: 'John', lastName: 'Doe', employeeId: 'AGT-001' },
      status: 'assigned',
    };

    test('returns service calls assigned to the calling field agent', async () => {
      req.user = { _id: 'user-fa-1', fieldServiceAgentProfile: 'agent-profile-1', role: 'fieldServiceAgent' };
      ServiceCall.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue([mockCall]),
      });

      await getMyAssignedServiceCalls(req, res);

      expect(ServiceCall.find).toHaveBeenCalledWith({ assignedAgent: 'agent-profile-1' });
      expect(res.json).toHaveBeenCalledWith([mockCall]);
    });

    test('returns 400 when user has no linked agent profile', async () => {
      req.user = { _id: 'user-fa-1', fieldServiceAgentProfile: null, role: 'fieldServiceAgent' };

      await getMyAssignedServiceCalls(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'No agent profile linked to your account' });
    });

    test('returns 500 on database error', async () => {
      req.user = { _id: 'user-fa-1', fieldServiceAgentProfile: 'agent-profile-1', role: 'fieldServiceAgent' };
      ServiceCall.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockRejectedValue(new Error('DB error')),
      });

      await getMyAssignedServiceCalls(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── getEligibleUnassignedServiceCalls (fieldServiceAgent role) ───────────────

  describe('getEligibleUnassignedServiceCalls - fieldServiceAgent caller', () => {
    test('resolves business owner from agent createdBy and returns eligible jobs', async () => {
      req.params.agentId = 'agent-1';
      req.user = { _id: 'user-fa-1', role: 'fieldServiceAgent' };

      // First findOne: agent ownership check (userAccount === req.user._id)
      // Second findOne: getAgentSelfDispatchEligibility check (createdBy === businessCreatedBy)
      FieldServiceAgent.findOne = jest.fn()
        .mockResolvedValueOnce({ _id: 'agent-1', userAccount: 'user-fa-1', createdBy: 'owner-1', status: 'active', availability: 'available', selfDispatchSuspended: false })
        .mockResolvedValueOnce({ _id: 'agent-1', status: 'active', availability: 'available', selfDispatchSuspended: false });

      ServiceCall.countDocuments = jest.fn().mockResolvedValue(0);
      ServiceCall.find = jest.fn()
        .mockReturnValueOnce({ select: jest.fn().mockResolvedValue([]) })
        .mockReturnValueOnce({ populate: jest.fn().mockReturnValue({ sort: jest.fn().mockResolvedValue([{ _id: 'call-1', assignedAgent: null }]) }) });

      await getEligibleUnassignedServiceCalls(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ jobs: [{ _id: 'call-1', assignedAgent: null }] })
      );
    });

    test('returns 403 when agent userAccount does not match caller', async () => {
      req.params.agentId = 'agent-1';
      req.user = { _id: 'user-other', role: 'fieldServiceAgent' };

      FieldServiceAgent.findOne = jest.fn().mockResolvedValue(null);

      await getEligibleUnassignedServiceCalls(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Access denied', jobs: [], meta: null });
    });
  });

  // ─── selfAcceptServiceCall (fieldServiceAgent role) ──────────────────────────

  describe('selfAcceptServiceCall - fieldServiceAgent caller', () => {
    test('resolves business owner from agent createdBy and self-accepts successfully', async () => {
      req.params.id = 'call-1';
      req.body.agentId = 'agent-1';
      req.user = { _id: 'user-fa-1', role: 'fieldServiceAgent' };

      // First findOne: agent ownership check
      // Second findOne: getAgentSelfDispatchEligibility
      FieldServiceAgent.findOne = jest.fn()
        .mockResolvedValueOnce({ _id: 'agent-1', employeeId: 'AGT-001', userAccount: 'user-fa-1', createdBy: 'owner-1', status: 'active', availability: 'available', selfDispatchSuspended: false })
        .mockResolvedValueOnce({ _id: 'agent-1', employeeId: 'AGT-001', status: 'active', availability: 'available', selfDispatchSuspended: false });

      ServiceCall.findOne = jest.fn().mockResolvedValue({
        _id: 'call-1',
        callNumber: 'SC-000010',
        assignedAgent: null,
        selfDispatchEnabled: true,
        status: 'pending',
      });
      ServiceCall.countDocuments = jest.fn().mockResolvedValue(0);
      ServiceCall.find = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue([]) });

      const populated = { _id: 'call-1', assignedAgent: { _id: 'agent-1', firstName: 'John', lastName: 'Doe', employeeId: 'AGT-001' }, status: 'assigned' };
      ServiceCall.findOneAndUpdate = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(populated) }),
      });

      await selfAcceptServiceCall(req, res);

      expect(ServiceCall.findOneAndUpdate).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Service call self-accepted successfully', serviceCall: populated })
      );
    });

    test('returns 403 when agent userAccount does not match caller', async () => {
      req.params.id = 'call-1';
      req.body.agentId = 'agent-99';
      req.user = { _id: 'user-fa-1', role: 'fieldServiceAgent' };

      FieldServiceAgent.findOne = jest.fn().mockResolvedValue(null);

      await selfAcceptServiceCall(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Access denied' });
    });
  });
});