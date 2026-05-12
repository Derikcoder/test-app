/**
 * @file emailService.test.mjs
 * @description Unit tests for email service (ESM, top-level await)
 */
import { jest } from '@jest/globals';

// Always mock nodemailer before importing the email service
await jest.unstable_mockModule('nodemailer', () => {
  return {
    __esModule: true,
    default: {
      createTransport: jest.fn(),
      createTestAccount: jest.fn(),
      getTestMessageUrl: jest.fn(),
    },
  };
});

const emailService = await import('../../../utils/emailService.js');
const sendPasswordResetEmail = emailService.sendPasswordResetEmail;
const sendAgentWelcomeEmail = emailService.sendAgentWelcomeEmail;
const sendQuotationEmail = emailService.sendQuotationEmail;
const createTransporter = emailService.createTransporter;
const nodemailer = (await import('nodemailer')).default;

describe('Email Service', () => {
  let mockTransporter;

  beforeEach(() => {
    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({
        messageId: 'test-message-id',
      }),
    };
    nodemailer.createTransport.mockReturnValue(mockTransporter);
    nodemailer.createTestAccount.mockResolvedValue({
      user: 'test@ethereal.email',
      pass: 'testpassword',
    });
    nodemailer.getTestMessageUrl.mockReturnValue('https://ethereal.email/message/123');
    jest.clearAllMocks();
  });

  test('sendPasswordResetEmail', async () => {
    const result = await sendPasswordResetEmail({
      email: 'test@example.com',
      resetUrl: 'http://localhost:3000/reset-password/abc123',
      userName: 'Test User'
    });
    expect(result).toEqual({
      messageId: 'test-message-id',
    });
  });

  test('sendAgentWelcomeEmail', async () => {
    const result = await sendAgentWelcomeEmail({
      to: 'test@example.com',
      agentName: 'Agent Smith',
      userName: 'Test User',
      resetUrl: 'http://localhost:3000/reset-password/abc123'
    });
    expect(result).toEqual({
      messageId: 'test-message-id',
    });
  });

  test('sendQuotationEmail', async () => {
    const result = await sendQuotationEmail({
      to: 'test@example.com',
      customerName: 'Test Customer',
      quotationNumber: 'QTN-1001',
      shareUrl: 'https://example.com/share/qtn-1001',
      approvalUrl: 'https://example.com/quotation-approval/qtn-1001',
      pdfBuffer: Buffer.from('pdf-data'),
    });
    expect(result).toEqual({
      messageId: 'test-message-id',
    });
  });

  test('createTransporter', async () => {
    const result = await createTransporter('test@example.com');
    expect(result).toEqual(mockTransporter);
  });
});
