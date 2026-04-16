/**
 * @file customerOnboarding.auth.test.js
 * @description Regression tests for customer provisioning and invite onboarding flow.
 */

import { adminProvisionUser } from '../../../controllers/auth.controller.js';
import User from '../../../models/User.model.js';
import Customer from '../../../models/Customer.model.js';
import FieldServiceAgent from '../../../models/FieldServiceAgent.model.js';
import * as emailService from '../../../utils/emailService.js';

jest.mock('../../../models/User.model.js');
jest.mock('../../../models/Customer.model.js');
jest.mock('../../../models/FieldServiceAgent.model.js');
jest.mock('../../../utils/emailService.js');
jest.mock('../../../middleware/logger.middleware.js', () => ({
  logError: jest.fn(),
  logInfo: jest.fn(),
}));

describe('customer onboarding provisioning', () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      body: {},
      user: { _id: 'admin-1', role: 'superAdmin' },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    jest.clearAllMocks();
    Customer.findById = jest.fn();
    Customer.findByIdAndUpdate = jest.fn().mockResolvedValue(true);
    User.findOne = jest.fn();
    User.create = jest.fn();
    FieldServiceAgent.findById = jest.fn();
  });

  test('sends a secure welcome email when an admin provisions a customer account', async () => {
    const mockCustomer = {
      _id: 'cust-1',
      userAccount: null,
      businessName: 'Acme Mining',
      contactFirstName: 'Bennie',
      contactLastName: 'Henning',
      email: 'customer@example.com',
      phoneNumber: '0821234567',
      physicalAddress: '123 Main Road',
    };

    const mockUser = {
      _id: 'user-1',
      userName: 'acme_customer',
      email: 'customer@example.com',
      role: 'customer',
      generatePasswordResetToken: jest.fn().mockReturnValue('reset-token-123'),
      save: jest.fn().mockResolvedValue(true),
    };

    req.body = {
      role: 'customer',
      profileId: 'cust-1',
      userName: 'acme_customer',
      email: 'customer@example.com',
    };

    Customer.findById.mockResolvedValue(mockCustomer);
    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue(mockUser);
    emailService.sendCustomerWelcomeEmail = jest.fn().mockResolvedValue({ messageId: 'msg-1' });

    await adminProvisionUser(req, res);

    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'customer',
        customerProfile: 'cust-1',
        email: 'customer@example.com',
      })
    );
    expect(mockUser.generatePasswordResetToken).toHaveBeenCalled();
    expect(emailService.sendCustomerWelcomeEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'customer@example.com',
        userName: 'acme_customer',
        resetUrl: expect.stringContaining('/reset-password/reset-token-123'),
        temporaryAccessKey: expect.any(String),
      })
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        temporaryAccessKey: expect.any(String),
      })
    );
  });
});
