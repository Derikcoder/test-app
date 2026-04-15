/**
 * @file emailService.test.js
 * @description Unit tests for email service
 */

import { sendPasswordResetEmail, sendAgentWelcomeEmail, sendQuotationEmail, createTransporter } from '../../../utils/emailService.js';
import nodemailer from 'nodemailer';

// Mock nodemailer
jest.mock('nodemailer');

describe('Email Service', () => {
  let mockTransporter;

  beforeEach(() => {
    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({
        messageId: 'test-message-id',
      }),
    };

    nodemailer.createTransport = jest.fn().mockReturnValue(mockTransporter);
    nodemailer.createTestAccount = jest.fn().mockResolvedValue({
      user: 'test@ethereal.email',
      pass: 'testpassword',
    });
    nodemailer.getTestMessageUrl = jest.fn().mockReturnValue('https://ethereal.email/message/123');

    jest.clearAllMocks();
  });

  describe('sendPasswordResetEmail', () => {
    test('should send email with correct recipient', async () => {
      const emailData = {
        email: 'test@example.com',
        resetUrl: 'http://localhost:3002/reset-password/token123',
        userName: 'Test User',
      };

      await sendPasswordResetEmail(emailData);

      expect(mockTransporter.sendMail).toHaveBeenCalled();
      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.to).toBe('test@example.com');
    });

    test('should include reset URL in email body', async () => {
      const emailData = {
        email: 'test@example.com',
        resetUrl: 'http://localhost:3002/reset-password/token123',
        userName: 'Test User',
      };

      await sendPasswordResetEmail(emailData);

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('token123');
      expect(callArgs.html).toContain('reset-password');
    });

    test('should include user name in email', async () => {
      const emailData = {
        email: 'test@example.com',
        resetUrl: 'http://localhost:3002/reset-password/token123',
        userName: 'Test User',
      };

      await sendPasswordResetEmail(emailData);

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('Test User');
    });

    test('should have correct subject line', async () => {
      const emailData = {
        email: 'test@example.com',
        resetUrl: 'http://localhost:3002/reset-password/token123',
        userName: 'Test User',
      };

      await sendPasswordResetEmail(emailData);

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.subject).toContain('Password Reset');
    });

    test('should include plain text fallback', async () => {
      const emailData = {
        email: 'test@example.com',
        resetUrl: 'http://localhost:3002/reset-password/token123',
        userName: 'Test User',
      };

      await sendPasswordResetEmail(emailData);

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.text).toBeDefined();
      expect(callArgs.text).toContain('token123');
    });

    test('should use Appatunid branding in sender', async () => {
      const emailData = {
        email: 'test@example.com',
        resetUrl: 'http://localhost:3002/reset-password/token123',
        userName: 'Test User',
      };

      await sendPasswordResetEmail(emailData);

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.from).toContain('Appatunid');
    });

    test('should handle sending errors', async () => {
      mockTransporter.sendMail = jest.fn().mockRejectedValue(
        new Error('SMTP connection failed')
      );

      const emailData = {
        email: 'test@example.com',
        resetUrl: 'http://localhost:3002/reset-password/token123',
        userName: 'Test User',
      };

      await expect(sendPasswordResetEmail(emailData)).rejects.toThrow();
    });

    test('should validate required email field', async () => {
      const emailData = {
        resetUrl: 'http://localhost:3002/reset-password/token123',
        userName: 'Test User',
      };

      await expect(sendPasswordResetEmail(emailData)).rejects.toThrow();
    });

    test('should validate required resetUrl field', async () => {
      const emailData = {
        email: 'test@example.com',
        userName: 'Test User',
      };

      await expect(sendPasswordResetEmail(emailData)).rejects.toThrow();
    });
  });

  describe('createTransporter', () => {
    test('should create transporter with Ethereal for development', async () => {
      process.env.NODE_ENV = 'development';

      await createTransporter();

      expect(nodemailer.createTestAccount).toHaveBeenCalled();
      expect(nodemailer.createTransport).toHaveBeenCalled();
    });

    test('should use production SMTP when configured', async () => {
      process.env.NODE_ENV = 'production';
      process.env.SMTP_HOST = 'smtp.gmail.com';
      process.env.SMTP_PORT = '587';
      process.env.SMTP_USER = 'user@gmail.com';
      process.env.SMTP_PASS = 'password';

      await createTransporter();

      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'smtp.gmail.com',
          port: 587,
        })
      );

      // Cleanup
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_PORT;
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;
    });

    test('should use real SMTP when SMTP_USER and SMTP_PASS are set (any env)', async () => {
      process.env.NODE_ENV = 'development';
      process.env.SMTP_USER = 'dev@example.com';
      process.env.SMTP_PASS = 'devpassword';
      process.env.SMTP_HOST = 'smtp.example.com';
      process.env.SMTP_PORT = '465';

      await createTransporter();

      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'smtp.example.com',
          auth: expect.objectContaining({ user: 'dev@example.com' }),
        })
      );
      expect(nodemailer.createTestAccount).not.toHaveBeenCalled();

      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_PORT;
    });

    test('should fall back to Ethereal when SMTP credentials are absent', async () => {
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;

      await createTransporter();

      expect(nodemailer.createTestAccount).toHaveBeenCalled();
    });
  });

  describe('sendQuotationEmail', () => {
    test('should include the portal approval link when provided', async () => {
      await sendQuotationEmail({
        to: 'customer@example.com',
        customerName: 'Bennie Henning',
        quotationNumber: 'QT-000001',
        shareUrl: 'http://localhost:5000/api/quotations/share/share-token/pdf',
        approvalUrl: 'http://localhost:3000/quotation-approval/share-token',
        pdfBuffer: Buffer.from('pdf'),
      });

      const mail = mockTransporter.sendMail.mock.calls[0][0];
      expect(mail.html).toContain('quotation-approval/share-token');
      expect(mail.text).toContain('quotation-approval/share-token');
    });
  });

  describe('sendAgentWelcomeEmail', () => {
    const validData = {
      to: 'agent@example.com',
      agentName: 'Jane Doe',
      userName: 'jane_doe',
      resetUrl: 'http://localhost:3002/reset-password/abc123',
    };

    test('should send to the correct recipient', async () => {
      await sendAgentWelcomeEmail(validData);

      const mail = mockTransporter.sendMail.mock.calls[0][0];
      expect(mail.to).toBe('agent@example.com');
    });

    test('should include the agent username in the email body', async () => {
      await sendAgentWelcomeEmail(validData);

      const mail = mockTransporter.sendMail.mock.calls[0][0];
      expect(mail.html).toContain('jane_doe');
    });

    test('should include the reset URL in the email body', async () => {
      await sendAgentWelcomeEmail(validData);

      const mail = mockTransporter.sendMail.mock.calls[0][0];
      expect(mail.html).toContain('abc123');
    });

    test('should include the agent name in the email body', async () => {
      await sendAgentWelcomeEmail(validData);

      const mail = mockTransporter.sendMail.mock.calls[0][0];
      expect(mail.html).toContain('Jane Doe');
    });

    test('should have a welcome-related subject line', async () => {
      await sendAgentWelcomeEmail(validData);

      const mail = mockTransporter.sendMail.mock.calls[0][0];
      expect(mail.subject.toLowerCase()).toMatch(/welcome|account|invitation|password/);
    });

    test('should include plain text fallback with reset URL', async () => {
      await sendAgentWelcomeEmail(validData);

      const mail = mockTransporter.sendMail.mock.calls[0][0];
      expect(mail.text).toBeDefined();
      expect(mail.text).toContain('abc123');
    });

    test('should throw when required field "to" is missing', async () => {
      const { to: _omit, ...missingTo } = validData;
      await expect(sendAgentWelcomeEmail(missingTo)).rejects.toThrow();
    });

    test('should throw when required field "resetUrl" is missing', async () => {
      const { resetUrl: _omit, ...missingUrl } = validData;
      await expect(sendAgentWelcomeEmail(missingUrl)).rejects.toThrow();
    });

    test('should propagate SMTP errors', async () => {
      mockTransporter.sendMail = jest.fn().mockRejectedValue(new Error('SMTP timeout'));
      await expect(sendAgentWelcomeEmail(validData)).rejects.toThrow('SMTP timeout');
    });
  });
});
