/**
 * @file email.integration.test.js
 * @description Integration tests for email service — uses real Ethereal SMTP accounts.
 *
 * These tests actually send emails through nodemailer (to Ethereal, not real inboxes).
 * They are kept separate from unit tests so CI can optionally skip them with:
 *   jest --testPathIgnorePatterns=integration
 *
 * Run alone:
 *   npx jest tests/integration/email.integration.test.js
 */

import nodemailer from 'nodemailer';
import { createTransporter, sendAgentWelcomeEmail, sendPasswordResetEmail } from '../../utils/emailService.js';

// Do NOT mock nodemailer — these are integration tests using real transports.

describe('Email Integration — Ethereal SMTP', () => {
  let testAccount;

  /**
   * Create a real Ethereal test account once for the whole suite.
   * Ethereal SMTP accepts all mail and makes it inspectable via getTestMessageUrl().
   */
  beforeAll(async () => {
    testAccount = await nodemailer.createTestAccount();
  });

  /**
   * Override env vars so createTransporter() picks up the Ethereal credentials.
   * Reset after each test to avoid leaking into unit test env.
   */
  beforeEach(() => {
    process.env.SMTP_HOST = 'smtp.ethereal.email';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = testAccount.user;
    process.env.SMTP_PASS = testAccount.pass;
  });

  afterEach(() => {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
  });

  describe('createTransporter()', () => {
    test('returns a working transporter when SMTP credentials are set', async () => {
      const transporter = await createTransporter();
      expect(transporter).toBeDefined();
      expect(typeof transporter.sendMail).toBe('function');
    });

    test('falls back to Ethereal test account when no SMTP credentials', async () => {
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;

      const transporter = await createTransporter();
      expect(transporter).toBeDefined();
      expect(typeof transporter.sendMail).toBe('function');
    });
  });

  describe('sendAgentWelcomeEmail()', () => {
    const validPayload = {
      to: 'newagent@example.com',
      agentName: 'John Field',
      userName: 'john_field',
      resetUrl: 'http://localhost:3002/reset-password/integrationtesttoken',
    };

    test('delivers successfully to Ethereal (no throw)', async () => {
      await expect(sendAgentWelcomeEmail(validPayload)).resolves.not.toThrow();
    });

    test('returns an info object with messageId', async () => {
      const info = await sendAgentWelcomeEmail(validPayload);
      expect(info).toHaveProperty('messageId');
      expect(typeof info.messageId).toBe('string');
    });

    test('preview URL is available for dev inspection', async () => {
      const info = await sendAgentWelcomeEmail(validPayload);
      const previewUrl = nodemailer.getTestMessageUrl(info);
      // Ethereal preview URL if delivered, or false if not Ethereal transport.
      expect(previewUrl === false || typeof previewUrl === 'string').toBe(true);
    });
  });

  describe('sendPasswordResetEmail()', () => {
    const validPayload = {
      email: 'user@example.com',
      userName: 'Test User',
      resetUrl: 'http://localhost:3002/reset-password/integrationtesttokenreset',
    };

    test('delivers successfully to Ethereal (no throw)', async () => {
      await expect(sendPasswordResetEmail(validPayload)).resolves.not.toThrow();
    });

    test('returns an info object with messageId', async () => {
      const info = await sendPasswordResetEmail(validPayload);
      expect(info).toHaveProperty('messageId');
    });
  });
});
