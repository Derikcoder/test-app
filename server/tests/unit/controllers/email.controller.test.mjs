/**
 * @file email.controller.test.mjs
 * @description Unit tests for Email controller (Jestering pattern)
 */
import { jest } from '@jest/globals';
import { createMockRequest, createMockResponse } from '../__mocks__/factories/express.factory.js';

const sendEmail = jest.fn();
await jest.unstable_mockModule('../../../utils/emailService.js', () => ({
  __esModule: true,
  sendEmail,
}));

const logError = jest.fn();
await jest.unstable_mockModule('../../../middleware/logger.middleware.js', () => ({
  __esModule: true,
  logError,
}));

const controller = await import('../../../controllers/email.controller.js');
const { sendGenericEmail } = controller;

describe('Email Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('administrator sends email successfully', async () => {
    // GIVEN
    const req = createMockRequest({
      user: { _id: 'admin-1', role: 'superAdmin' },
      body: {
        to: 'customer@example.com',
        subject: 'Service update',
        text: 'Your service call is scheduled.',
      },
    });
    const res = createMockResponse();
    sendEmail.mockResolvedValue({ messageId: 'msg-1' });

    // WHEN
    await sendGenericEmail(req, res);

    // THEN
    expect(sendEmail).toHaveBeenCalledWith({
      to: 'customer@example.com',
      subject: 'Service update',
      html: undefined,
      text: 'Your service call is scheduled.',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Email sent successfully',
      messageId: 'msg-1',
    });
  });

  test('returns validation error for missing recipient payload', async () => {
    // GIVEN
    const req = createMockRequest({
      user: { _id: 'admin-1', role: 'businessAdministrator' },
      body: { subject: 'Missing recipient', text: 'Hello' },
    });
    const res = createMockResponse();

    // WHEN
    await sendGenericEmail(req, res);

    // THEN
    expect(sendEmail).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'to, subject, and at least one of html or text are required',
    });
  });

  test('rejects non-admin role from sending email', async () => {
    // GIVEN
    const req = createMockRequest({
      user: { _id: 'user-1', role: 'customer' },
      body: { to: 'x@example.com', subject: 'Hello', text: 'Body' },
    });
    const res = createMockResponse();

    // WHEN
    await sendGenericEmail(req, res);

    // THEN
    expect(sendEmail).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Forbidden. You do not have permission to perform this action.',
    });
  });
});
