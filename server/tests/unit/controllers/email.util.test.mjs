/**
 * @file email.util.test.mjs
 * @description Unit tests for email utility (Jestering pattern)
 */
import { jest } from '@jest/globals';

// Mock dependencies at module boundaries
await jest.unstable_mockModule('../../../utils/emailService.js', () => ({ __esModule: true, sendEmail: jest.fn() }));

const emailService = await import('../../../utils/emailService.js');

describe('Email Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('sendEmail sends email with correct data', async () => {
    // GIVEN
    const emailData = { to: 'customer@example.com', subject: 'Test', text: 'Hello' };
    emailService.sendEmail.mockResolvedValue({ success: true });

    // WHEN
    const result = await emailService.sendEmail(emailData);

    // THEN
    expect(emailService.sendEmail).toHaveBeenCalledWith(emailData);
    expect(result).toEqual({ success: true });
  });
});
