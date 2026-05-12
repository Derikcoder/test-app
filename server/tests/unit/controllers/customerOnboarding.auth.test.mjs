/**
 * @file customerOnboarding.auth.test.mjs
 * @description Unit tests for customer onboarding provisioning flow
 */
import { jest } from '@jest/globals';
import { createMockRequest, createMockResponse } from '../__mocks__/factories/express.factory.js';

const User = {};
const Customer = {};
const FieldServiceAgent = {};
const OnboardingPasskey = {};
const PasskeyRenewalRequest = {};
const ProfileLinkAudit = {};
const RegistrationOverrideAudit = {};

const sendCustomerWelcomeEmail = jest.fn();
const sendAgentWelcomeEmail = jest.fn();
const sendPasswordResetEmail = jest.fn();

await jest.unstable_mockModule('../../../models/User.model.js', () => ({ __esModule: true, default: User }));
await jest.unstable_mockModule('../../../models/Customer.model.js', () => ({ __esModule: true, default: Customer }));
await jest.unstable_mockModule('../../../models/FieldServiceAgent.model.js', () => ({ __esModule: true, default: FieldServiceAgent }));
await jest.unstable_mockModule('../../../models/OnboardingPasskey.model.js', () => ({ __esModule: true, default: OnboardingPasskey }));
await jest.unstable_mockModule('../../../models/PasskeyRenewalRequest.model.js', () => ({ __esModule: true, default: PasskeyRenewalRequest }));
await jest.unstable_mockModule('../../../models/ProfileLinkAudit.model.js', () => ({ __esModule: true, default: ProfileLinkAudit }));
await jest.unstable_mockModule('../../../models/RegistrationOverrideAudit.model.js', () => ({ __esModule: true, default: RegistrationOverrideAudit }));
await jest.unstable_mockModule('../../../utils/emailService.js', () => ({
  __esModule: true,
  sendCustomerWelcomeEmail,
  sendAgentWelcomeEmail,
  sendPasswordResetEmail,
}));
await jest.unstable_mockModule('../../../middleware/logger.middleware.js', () => ({
  __esModule: true,
  logError: jest.fn(),
  logInfo: jest.fn(),
}));

const { adminProvisionUser } = await import('../../../controllers/auth.controller.js');

describe('Customer Onboarding Auth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('admin provisions customer account and sends onboarding email', async () => {
    // GIVEN
    const req = createMockRequest({
      user: { _id: 'admin-1', role: 'superAdmin' },
      body: {
        role: 'customer',
        profileId: 'cust-1',
        userName: 'acme_customer',
        email: 'customer@example.com',
      },
    });
    const res = createMockResponse();

    Customer.findById = jest.fn().mockResolvedValue({
      _id: 'cust-1',
      userAccount: null,
      businessName: 'Acme Mining',
      contactFirstName: 'Bennie',
      contactLastName: 'Henning',
      phoneNumber: '0821234567',
      physicalAddress: '123 Main Road',
    });

    User.findOne = jest.fn().mockResolvedValue(null);
    const newUser = {
      _id: 'user-1',
      userName: 'acme_customer',
      email: 'customer@example.com',
      role: 'customer',
      generatePasswordResetToken: jest.fn().mockReturnValue('reset-token-123'),
      save: jest.fn().mockResolvedValue(true),
    };
    User.create = jest.fn().mockResolvedValue(newUser);
    Customer.findByIdAndUpdate = jest.fn().mockResolvedValue(true);
    sendCustomerWelcomeEmail.mockResolvedValue({ messageId: 'msg-1' });

    // WHEN
    await adminProvisionUser(req, res);

    // THEN
    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'customer',
        customerProfile: 'cust-1',
        email: 'customer@example.com',
        userName: 'acme_customer',
      })
    );
    expect(Customer.findByIdAndUpdate).toHaveBeenCalledWith('cust-1', { userAccount: 'user-1' });
    expect(newUser.generatePasswordResetToken).toHaveBeenCalled();
    expect(sendCustomerWelcomeEmail).toHaveBeenCalledWith(
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
        userId: 'user-1',
        role: 'customer',
        temporaryAccessKey: expect.any(String),
      })
    );
  });

  test('rejects invalid onboarding payload when required fields are missing', async () => {
    // GIVEN
    const req = createMockRequest({
      user: { _id: 'admin-1', role: 'superAdmin' },
      body: {
        role: 'customer',
        email: 'customer@example.com',
      },
    });
    const res = createMockResponse();

    // WHEN
    await adminProvisionUser(req, res);

    // THEN
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'role, profileId, userName, and email are all required',
    });
    expect(User.create).not.toHaveBeenCalled();
    expect(sendCustomerWelcomeEmail).not.toHaveBeenCalled();
  });
});