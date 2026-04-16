/**
 * @file serviceCall.controller.test.js
 * @description Unit tests for Sprint 1 self-dispatch controller behavior
 */

import {
  createServiceCall,
  getEligibleUnassignedServiceCalls,
  getMyAssignedServiceCalls,
  selfAcceptServiceCall,
  submitRating,
  updateServiceCall,
  getServiceCalls,
} from '../../../controllers/serviceCall.controller.js';
import ServiceCall from '../../../models/ServiceCall.model.js';
import Invoice from '../../../models/Invoice.model.js';
import FieldServiceAgent from '../../../models/FieldServiceAgent.model.js';
import Customer from '../../../models/Customer.model.js';
import ServiceCallEmailLock from '../../../models/ServiceCallEmailLock.model.js';

jest.mock('../../../models/ServiceCall.model.js');
jest.mock('../../../models/FieldServiceAgent.model.js');
jest.mock('../../../models/Customer.model.js');
jest.mock('../../../models/ServiceCallEmailLock.model.js');
jest.mock('../../../models/Invoice.model.js');
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

  describe('createServiceCall - prospect-first intake', () => {
    test('does not auto-create a customer profile from booking request when no existing customer matches', async () => {
      req.body = {
        title: 'Blocked drain at private residence',
        description: 'Customer reported drain blockage via WhatsApp',
        serviceType: 'Plumbing',
        bookingRequest: {
          contact: {
            customerType: 'private',
            contactPerson: 'Jane Prospect',
            contactEmail: 'jane@example.com',
            contactPhone: '0821234567',
          },
          administrativeAddress: {
            streetAddress: '12 Test Street',
            suburb: 'Northcliff',
            cityDistrict: 'Johannesburg',
            province: 'Gauteng',
          },
        },
      };

      Customer.findOne = jest.fn().mockResolvedValue(null);
      ServiceCallEmailLock.findOne = jest.fn().mockResolvedValue(null);
      ServiceCall.countDocuments = jest.fn().mockResolvedValue(0);

      const createdCall = {
        _id: 'call-100',
        callNumber: 'SC-000001',
        customer: undefined,
        populate: jest.fn().mockResolvedValue(null),
      };

      ServiceCall.create = jest.fn().mockResolvedValue(createdCall);

      await createServiceCall(req, res);

      expect(Customer.create).not.toHaveBeenCalled();
      expect(ServiceCall.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: undefined,
          bookingRequest: req.body.bookingRequest,
        })
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });
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

  describe('updateServiceCall - payment hold protection', () => {
    test('blocks completion when a linked pro-forma deposit is still unpaid', async () => {
      req.params.id = 'call-locked-1';
      req.body = { status: 'completed' };
      req.user = { _id: 'owner-1', role: 'businessAdministrator' };

      const serviceCall = {
        _id: 'call-locked-1',
        callNumber: 'SC-LOCK-1',
        status: 'in-progress',
        proFormaInvoice: 'invoice-locked-1',
      };

      ServiceCall.findOne = jest.fn().mockResolvedValue(serviceCall);
      Invoice.findOne = jest.fn().mockResolvedValue({
        _id: 'invoice-locked-1',
        documentType: 'proForma',
        workflowStatus: 'approved',
        depositRequired: true,
        depositAmount: 1800,
        paidAmount: 600,
      });

      await updateServiceCall(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Deposit payment is still required before this job can be completed.',
      });
    });
  });

  describe('submitRating - staged feedback', () => {
    test('allows a customer to submit quotation-stage feedback before job completion', async () => {
      req.params.id = 'call-quoted-1';
      req.body = { rating: 4, feedback: 'So far the communication is clear.', stage: 'quotation' };
      req.user = { _id: 'customer-user-1', role: 'customer', customerProfile: 'cust-123' };

      const serviceCall = {
        _id: 'call-quoted-1',
        callNumber: 'SC-QUOTED-1',
        customer: 'cust-123',
        status: 'assigned',
        feedbackHistory: [],
        save: jest.fn().mockResolvedValue(true),
        populate: jest.fn().mockResolvedValue(true),
      };

      ServiceCall.findOne = jest.fn().mockResolvedValue(serviceCall);

      await submitRating(req, res);

      expect(serviceCall.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(serviceCall);
    });
  });

  describe('getServiceCalls - customer access', () => {
    test('returns service calls linked to the logged-in customer profile', async () => {
      req.user = { _id: 'customer-user-1', role: 'customer', customerProfile: 'cust-123' };

      const serviceCalls = [{ _id: 'call-1', customer: 'cust-123', callNumber: 'SC-000001' }];
      const populateInvoice = { populate: jest.fn().mockReturnThis(), sort: jest.fn().mockResolvedValue(serviceCalls) };
      const populateProForma = { populate: jest.fn().mockReturnValue(populateInvoice) };
      const populateQuotation = { populate: jest.fn().mockReturnValue(populateProForma) };
      const populateAgent = { populate: jest.fn().mockReturnValue(populateQuotation) };
      ServiceCall.find = jest.fn().mockReturnValue(populateAgent);

      await getServiceCalls(req, res);

      expect(ServiceCall.find).toHaveBeenCalledWith({ customer: 'cust-123' });
      expect(res.json).toHaveBeenCalledWith(serviceCalls);
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