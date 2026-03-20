/**
 * @file serviceCall.controller.test.js
 * @description Unit tests for Sprint 1 self-dispatch controller behavior
 */

import {
  getEligibleUnassignedServiceCalls,
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
});