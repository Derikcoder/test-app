/**
 * @file emailService.test.js
 * @description Unit tests for email service
 */

import { sendPasswordResetEmail, createTransporter } from '../../../utils/emailService.js';
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
  });
});
