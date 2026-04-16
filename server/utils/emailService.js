/**
 * @file emailService.js
 * @description Email sending service using Nodemailer
 * @module Utils/EmailService
 * 
 * Provides email functionality for:
 * - Password reset emails
 * - Account verification
 * - Notifications
 */

import nodemailer from 'nodemailer';

/**
 * Create Email Transporter
 * 
 * @description
 * Creates and configures nodemailer transporter.
 * 
 * For development: Uses Ethereal (fake SMTP service)
 * For production: Uses real SMTP credentials from environment variables
 * 
 * Environment Variables (Production):
 * - SMTP_HOST: SMTP server host
 * - SMTP_PORT: SMTP server port
 * - SMTP_USER: SMTP username
 * - SMTP_PASS: SMTP password
 * - FROM_EMAIL: Sender email address
 * - FROM_NAME: Sender name
 */
const createTransporter = async () => {
  // Use real SMTP whenever credentials are provided (works in any NODE_ENV)
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Fallback: Ethereal fake SMTP — preview URL is logged to console
  // NOTE: Emails sent via Ethereal do NOT reach real inboxes.
  // To receive real emails, set SMTP_USER and SMTP_PASS in server/.env
  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
};

/**
 * Send Password Reset Email
 * 
 * @async
 * @param {Object} options - Email options
 * @param {string} options.email - Recipient email address
 * @param {string} options.resetUrl - Password reset URL with token
 * @param {string} options.userName - User's name for personalization
 * @returns {Promise<Object>} Email send result
 * 
 * @description
 * Sends HTML-formatted password reset email with:
 * - Branded Appatunid styling
 * - Secure reset link (valid for 1 hour)
 * - Security instructions
 * - Warning about not sharing the link
 * 
 * @example
 * await sendPasswordResetEmail({
 *   email: 'user@example.com',
 *   resetUrl: 'http://localhost:3000/reset-password/abc123',
 *   userName: 'John Doe'
 * });
 */
export const sendPasswordResetEmail = async ({ email, resetUrl, userName }) => {
  // Validate required fields
  if (!email) {
    throw new Error('Email address is required');
  }
  
  if (!resetUrl) {
    throw new Error('Reset URL is required');
  }
  
  try {
    const transporter = await createTransporter();
    
    const mailOptions = {
      from: `${process.env.FROM_NAME || 'Appatunid Support'} <${process.env.FROM_EMAIL || 'noreply@appatunid.com'}>`,
      to: email,
      subject: 'Password Reset Request - Appatunid WKD Field Service',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              background-color: #f4f4f4;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 20px auto;
              background: white;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }
            .header {
              background: linear-gradient(135deg, #05198C 0%, #1a3ba8 100%);
              color: white;
              padding: 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              font-weight: 700;
            }
            .header p {
              margin: 10px 0 0;
              opacity: 0.9;
              font-size: 14px;
            }
            .content {
              padding: 40px 30px;
            }
            .content p {
              margin: 0 0 20px;
              color: #555;
            }
            .button-container {
              text-align: center;
              margin: 35px 0;
            }
            .reset-button {
              display: inline-block;
              padding: 16px 36px;
              background: linear-gradient(135deg, #05198C 0%, #1a3ba8 100%);
              color: white;
              text-decoration: none;
              border-radius: 8px;
              font-weight: 700;
              font-size: 16px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              box-shadow: 0 4px 12px rgba(5, 25, 140, 0.3);
              transition: all 0.3s ease;
            }
            .reset-button:hover {
              background: linear-gradient(135deg, #1a3ba8 0%, #2a5bcc 100%);
              box-shadow: 0 6px 16px rgba(5, 25, 140, 0.4);
            }
            .warning-box {
              background: #fff9e6;
              border-left: 4px solid #FFFB28;
              padding: 15px;
              margin: 25px 0;
              border-radius: 4px;
            }
            .warning-box p {
              margin: 0;
              color: #666;
              font-size: 14px;
            }
            .footer {
              background: #f8f8f8;
              padding: 25px 30px;
              text-align: center;
              border-top: 1px solid #e0e0e0;
            }
            .footer p {
              margin: 5px 0;
              color: #999;
              font-size: 13px;
            }
            .link-text {
              color: #05198C;
              word-break: break-all;
              font-size: 14px;
              background: #f0f4ff;
              padding: 12px;
              border-radius: 6px;
              margin: 20px 0;
              display: block;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Password Reset Request</h1>
              <p>Appatunid WKD Field Service Management</p>
            </div>
            <div class="content">
              <p>Hello <strong>${userName || 'User'}</strong>,</p>
              <p>We received a request to reset your password for your Appatunid account. If you made this request, click the button below to reset your password:</p>
              
              <div class="button-container">
                <a href="${resetUrl}" class="reset-button">Reset My Password</a>
              </div>
              
              <p style="text-align: center; color: #999; font-size: 13px;">Or copy and paste this link into your browser:</p>
              <div class="link-text">${resetUrl}</div>
              
              <div class="warning-box">
                <p><strong>⚠️ Security Notice:</strong></p>
                <p>• This link will expire in <strong>1 hour</strong></p>
                <p>• Do not share this link with anyone</p>
                <p>• If you didn't request this reset, please ignore this email</p>
                <p>• Your password will not change unless you click the link above</p>
              </div>
              
              <p>If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
              <p>For security reasons, this link will expire in 1 hour.</p>
              
              <p style="margin-top: 30px;">
                Best regards,<br/>
                <strong>Appatunid Support Team</strong>
              </p>
            </div>
            <div class="footer">
              <p><strong>Appatunid WKD Field Service Management</strong></p>
              <p>This is an automated message, please do not reply to this email.</p>
              <p>© ${new Date().getFullYear()} Appatunid. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Password Reset Request

Hello ${userName || 'User'},

We received a request to reset your password for your Appatunid account.

To reset your password, please visit this link:
${resetUrl}

This link will expire in 1 hour.

Security Notice:
- Do not share this link with anyone
- If you didn't request this reset, please ignore this email
- Your password will not change unless you visit the link above

Best regards,
Appatunid Support Team

---
This is an automated message, please do not reply to this email.
© ${new Date().getFullYear()} Appatunid. All rights reserved.
      `,
    };
    
    const info = await transporter.sendMail(mailOptions);
    
    // For development: Log preview URL
    if (process.env.NODE_ENV !== 'production') {
      console.log('📧 Password reset email sent!');
      console.log('📬 Preview URL:', nodemailer.getTestMessageUrl(info));
    }
    
    return info;
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
};

/**
 * Send Email (Generic)
 * 
 * @async
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {string} options.text - Plain text content
 * @returns {Promise<Object>} Email send result
 * 
 * @description
 * Generic email sending function for custom emails.
 * Can be used for notifications, alerts, etc.
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const transporter = await createTransporter();
    
    const mailOptions = {
      from: `${process.env.FROM_NAME || 'Appatunid'} <${process.env.FROM_EMAIL || 'noreply@appatunid.com'}>`,
      to,
      subject,
      html,
      text,
    };
    
    const info = await transporter.sendMail(mailOptions);
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('📧 Email sent!');
      console.log('📬 Preview URL:', nodemailer.getTestMessageUrl(info));
    }
    
    return info;
  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw new Error('Failed to send email');
  }
};

/**
 * Send Quotation Email with PDF attachment
 *
 * @async
 * @param {Object} options - Quotation email payload
 * @param {string} options.to - Recipient email
 * @param {string} options.customerName - Recipient display name
 * @param {string} options.quotationNumber - Quotation number
 * @param {string} options.shareUrl - Public share URL for PDF
 * @param {string} [options.approvalUrl] - Public portal approval URL
 * @param {Buffer} options.pdfBuffer - Generated PDF bytes
 * @returns {Promise<Object>} Email send result
 */
export const sendQuotationEmail = async ({ to, customerName, quotationNumber, shareUrl, approvalUrl, pdfBuffer }) => {
  if (!to) {
    throw new Error('Customer email is required to send quotation');
  }

  const transporter = await createTransporter();
  const approvalHtml = approvalUrl
    ? `
      <p>You can review and respond to this quotation in the customer portal here:</p>
      <p><a href="${approvalUrl}">${approvalUrl}</a></p>
    `
    : '';
  const approvalText = approvalUrl
    ? `\nPortal approval link: ${approvalUrl}\n`
    : '';

  const mailOptions = {
    from: `${process.env.FROM_NAME || 'Appatunid'} <${process.env.FROM_EMAIL || 'noreply@appatunid.com'}>`,
    to,
    subject: `Quotation ${quotationNumber} - Appatunid`,
    html: `
      <p>Hello ${customerName || 'Customer'},</p>
      <p>Please find your quotation <strong>${quotationNumber}</strong> attached as a PDF.</p>
      <p>You can also view/download it from this secure link:</p>
      <p><a href="${shareUrl}">${shareUrl}</a></p>
      ${approvalHtml}
      <p>Kind regards,<br/>Appatunid Team</p>
    `,
    text: `Hello ${customerName || 'Customer'},\n\nYour quotation ${quotationNumber} is attached as a PDF.\nSecure link: ${shareUrl}${approvalText}\nKind regards,\nAppatunid Team`,
    attachments: [
      {
        filename: `${quotationNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  };

  const info = await transporter.sendMail(mailOptions);

  if (process.env.NODE_ENV !== 'production') {
    console.log('📧 Quotation email sent!');
    console.log('📬 Preview URL:', nodemailer.getTestMessageUrl(info));
  }

  return info;
};

/**
 * Send Invoice / Pro-Forma Email with PDF attachment
 *
 * @async
 * @param {Object} options - Billing document email payload
 * @param {string} options.to - Recipient email
 * @param {string} options.customerName - Recipient display name
 * @param {string} options.documentNumber - Invoice / pro-forma number
 * @param {string} options.documentLabel - Human-readable document label
 * @param {string} options.shareUrl - Public share URL for PDF
 * @param {string} [options.approvalUrl] - Public approval page URL for customer action
 * @param {Buffer} options.pdfBuffer - Generated PDF bytes
 * @param {boolean} options.approvalRequired - Whether customer approval is being requested
 * @param {string} [options.userName] - Optional linked portal username
 * @param {string} [options.temporaryAccessKey] - Temporary secret access key for first login
 * @param {string} [options.loginUrl] - Customer login page URL
 * @param {string} [options.resetUrl] - Optional set-password/reset URL
 * @returns {Promise<Object>} Email send result
 */
export const sendInvoiceDocumentEmail = async ({
  to,
  customerName,
  documentNumber,
  documentLabel,
  shareUrl,
  approvalUrl,
  pdfBuffer,
  approvalRequired = false,
  userName,
  temporaryAccessKey,
  loginUrl,
  resetUrl,
}) => {
  if (!to) {
    throw new Error('Customer email is required to send billing document');
  }

  const transporter = await createTransporter();
  const actionText = approvalRequired
    ? 'Please review the attached pro-forma site instruction and approve it before additional work commences.'
    : 'Please find your final invoice attached.';
  const approvalHtml = approvalRequired && approvalUrl
    ? `<p>Approve or reject the pro-forma here:</p><p><a href="${approvalUrl}">${approvalUrl}</a></p>`
    : '';
  const approvalText = approvalRequired && approvalUrl
    ? `\nApproval page: ${approvalUrl}\n`
    : '';
  const resolvedLoginUrl = loginUrl || `${process.env.CLIENT_URL || 'http://localhost:3000'}/login`;
  const onboardingHtml = temporaryAccessKey || resetUrl
    ? `
      <div style="margin: 22px 0; padding: 16px; border-left: 4px solid #05198C; background: #f0f4ff; border-radius: 6px;">
        <p style="margin: 0 0 10px;"><strong>Customer Portal Access</strong></p>
        ${userName ? `<p style="margin: 0 0 8px;">Username: <strong>${userName}</strong></p>` : ''}
        ${temporaryAccessKey ? `<p style="margin: 0 0 8px;">Temporary Secret Access Key: <strong style="letter-spacing:0.18em; color:#05198C;">${temporaryAccessKey}</strong></p>` : ''}
        <p style="margin: 0 0 8px;">Use this key as your temporary password on the login screen, then update it from your customer profile after signing in.</p>
        <p style="margin: 0 0 8px;">Login screen: <a href="${resolvedLoginUrl}">${resolvedLoginUrl}</a></p>
        ${resetUrl ? `<p style="margin: 0;">Set a new password here: <a href="${resetUrl}">${resetUrl}</a></p>` : ''}
      </div>
    `
    : '';
  const onboardingText = temporaryAccessKey || resetUrl
    ? `\nCustomer Portal Access\n${userName ? `Username: ${userName}\n` : ''}${temporaryAccessKey ? `Temporary Secret Access Key: ${temporaryAccessKey}\nUse this as your temporary password on the login screen, then update it from your customer profile after signing in.\n` : ''}Login screen: ${resolvedLoginUrl}\n${resetUrl ? `Set a new password here: ${resetUrl}\n` : ''}`
    : '';

  const mailOptions = {
    from: `${process.env.FROM_NAME || 'Appatunid'} <${process.env.FROM_EMAIL || 'noreply@appatunid.com'}>`,
    to,
    subject: `${documentLabel} ${documentNumber} - Appatunid`,
    html: `
      <p>Hello ${customerName || 'Customer'},</p>
      <p>${actionText}</p>
      <p>Document: <strong>${documentNumber}</strong></p>
      <p>You can also view/download it from this secure link:</p>
      <p><a href="${shareUrl}">${shareUrl}</a></p>
      ${approvalHtml}
      ${onboardingHtml}
      <p>Kind regards,<br/>Appatunid Team</p>
    `,
    text: `Hello ${customerName || 'Customer'},\n\n${actionText}\nDocument: ${documentNumber}\nSecure link: ${shareUrl}${approvalText}${onboardingText}\nKind regards,\nAppatunid Team`,
    attachments: [
      {
        filename: `${documentNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  };

  const info = await transporter.sendMail(mailOptions);

  if (process.env.NODE_ENV !== 'production') {
    console.log('📧 Billing document email sent!');
    console.log('📬 Preview URL:', nodemailer.getTestMessageUrl(info));
  }

  return info;
};

// Export createTransporter for testing
export { createTransporter };

/**
 * Send Agent Welcome / Set-Password Email
 *
 * @async
 * @param {Object} options
 * @param {string} options.to - Agent email address
 * @param {string} options.agentName - Agent full name
 * @param {string} options.userName - Pre-assigned username
 * @param {string} options.resetUrl - Secure one-time set-password URL (expires in 1 hour)
 * @returns {Promise<Object>} Email send result
 */
/**
 * Send Customer Welcome / Set-Password Email
 *
 * @async
 * @param {Object} options
 * @param {string} options.to - Customer email address
 * @param {string} options.customerName - Customer contact or business name
 * @param {string} options.userName - Pre-assigned username
 * @param {string} options.resetUrl - Secure one-time set-password URL (expires in 1 hour)
 * @returns {Promise<Object>} Email send result
 */
export const sendCustomerWelcomeEmail = async ({ to, customerName, userName, resetUrl, temporaryAccessKey, loginUrl }) => {
  if (!to) throw new Error('Customer email is required');
  if (!resetUrl) throw new Error('Reset URL is required');

  const transporter = await createTransporter();
  const resolvedLoginUrl = loginUrl || `${process.env.CLIENT_URL || 'http://localhost:3000'}/login`;
  const accessKeyHtml = temporaryAccessKey
    ? `
      <div class="info-box" style="margin-top: 18px;">
        <p><strong>Temporary Secret Access Key:</strong></p>
        <p style="margin-top:8px;font-size:24px;font-weight:700;letter-spacing:0.2em;color:#05198C;">${temporaryAccessKey}</p>
        <p style="margin-top:10px;">Use this key as your temporary password on the login screen, then change it from your customer profile after signing in.</p>
      </div>
    `
    : '';
  const accessKeyText = temporaryAccessKey
    ? `\nTemporary Secret Access Key: ${temporaryAccessKey}\nUse this as your temporary password on the login screen, then change it from your customer profile after signing in.\n`
    : '';

  const mailOptions = {
    from: `${process.env.FROM_NAME || 'Appatunid'} <${process.env.FROM_EMAIL || 'noreply@appatunid.com'}>`,
    to,
    subject: 'Welcome to Appatunid — Activate Your Customer Portal',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #05198C 0%, #1a3ba8 100%); color: white; padding: 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 26px; font-weight: 700; }
          .header p { margin: 10px 0 0; opacity: 0.9; font-size: 14px; }
          .content { padding: 40px 30px; }
          .content p { margin: 0 0 20px; color: #555; }
          .button-container { text-align: center; margin: 35px 0; }
          .cta-button { display: inline-block; padding: 16px 36px; background: linear-gradient(135deg, #05198C 0%, #1a3ba8 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px; letter-spacing: 0.5px; box-shadow: 0 4px 12px rgba(5,25,140,0.3); }
          .info-box { background: #f0f4ff; border-left: 4px solid #05198C; padding: 15px; margin: 25px 0; border-radius: 4px; }
          .info-box p { margin: 0; color: #444; font-size: 14px; }
          .warning-box { background: #fff9e6; border-left: 4px solid #FFFB28; padding: 15px; margin: 25px 0; border-radius: 4px; }
          .warning-box p { margin: 0; color: #666; font-size: 14px; }
          .link-text { color: #05198C; word-break: break-all; font-size: 13px; background: #f0f4ff; padding: 12px; border-radius: 6px; margin: 20px 0; display: block; }
          .footer { background: #f8f8f8; padding: 25px 30px; text-align: center; border-top: 1px solid #e0e0e0; }
          .footer p { margin: 5px 0; color: #999; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to Appatunid</h1>
            <p>Customer Portal Access</p>
          </div>
          <div class="content">
            <p>Hello <strong>${customerName || 'Customer'}</strong>,</p>
            <p>Your customer portal account has been prepared. Use the login screen below together with your temporary secret access key, or set a fresh password directly using the secure link.</p>
            <div class="info-box">
              <p><strong>Your login details:</strong></p>
              <p>Email: <strong>${to}</strong></p>
              <p>Username: <strong>${userName}</strong></p>
            </div>
            <div class="button-container">
              <a href="${resolvedLoginUrl}" class="cta-button">Open Login Screen</a>
            </div>
            ${accessKeyHtml}
            <p style="text-align:center;color:#999;font-size:13px;">You can also set a new password directly using this secure link:</p>
            <div class="link-text">${resetUrl}</div>
            <div class="warning-box">
              <p><strong>⚠️ Important:</strong></p>
              <p>• This link expires in <strong>1 hour</strong></p>
              <p>• Do not share this link with anyone</p>
              <p>• If you did not expect this email, contact your administrator</p>
            </div>
            <p>Once your password is set, you can log in and review your quotations and service activity.</p>
            <p style="margin-top:30px;">Kind regards,<br/><strong>Appatunid Team</strong></p>
          </div>
          <div class="footer">
            <p><strong>Appatunid WKD Field Service Management</strong></p>
            <p>This is an automated message, please do not reply to this email.</p>
            <p>© ${new Date().getFullYear()} Appatunid. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Welcome to Appatunid\n\nHello ${customerName || 'Customer'},\n\nYour customer portal account has been created.\n\nLogin details:\nEmail: ${to}\nUsername: ${userName}${accessKeyText}\nLogin here: ${resolvedLoginUrl}\n\nSet your password here (expires in 1 hour):\n${resetUrl}\n\nDo not share this link with anyone.\n\nKind regards,\nAppatunid Team`,
  };

  const info = await transporter.sendMail(mailOptions);

  if (process.env.NODE_ENV !== 'production') {
    console.log('📧 Customer welcome email sent!');
    console.log('📬 Preview URL:', nodemailer.getTestMessageUrl(info));
  }

  return info;
};

/**
 * Send Agent Welcome / Set-Password Email
 *
 * @async
 * @param {Object} options
 * @param {string} options.to - Agent email address
 * @param {string} options.agentName - Agent full name
 * @param {string} options.userName - Pre-assigned username
 * @param {string} options.resetUrl - Secure one-time set-password URL (expires in 1 hour)
 * @returns {Promise<Object>} Email send result
 */
export const sendAgentWelcomeEmail = async ({ to, agentName, userName, resetUrl }) => {
  if (!to) throw new Error('Agent email is required');
  if (!resetUrl) throw new Error('Reset URL is required');

  const transporter = await createTransporter();

  const mailOptions = {
    from: `${process.env.FROM_NAME || 'Appatunid'} <${process.env.FROM_EMAIL || 'noreply@appatunid.com'}>`,
    to,
    subject: 'Welcome to Appatunid — Set Up Your Password',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #05198C 0%, #1a3ba8 100%); color: white; padding: 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 26px; font-weight: 700; }
          .header p { margin: 10px 0 0; opacity: 0.9; font-size: 14px; }
          .content { padding: 40px 30px; }
          .content p { margin: 0 0 20px; color: #555; }
          .button-container { text-align: center; margin: 35px 0; }
          .cta-button { display: inline-block; padding: 16px 36px; background: linear-gradient(135deg, #05198C 0%, #1a3ba8 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px; letter-spacing: 0.5px; box-shadow: 0 4px 12px rgba(5,25,140,0.3); }
          .info-box { background: #f0f4ff; border-left: 4px solid #05198C; padding: 15px; margin: 25px 0; border-radius: 4px; }
          .info-box p { margin: 0; color: #444; font-size: 14px; }
          .warning-box { background: #fff9e6; border-left: 4px solid #FFFB28; padding: 15px; margin: 25px 0; border-radius: 4px; }
          .warning-box p { margin: 0; color: #666; font-size: 14px; }
          .link-text { color: #05198C; word-break: break-all; font-size: 13px; background: #f0f4ff; padding: 12px; border-radius: 6px; margin: 20px 0; display: block; }
          .footer { background: #f8f8f8; padding: 25px 30px; text-align: center; border-top: 1px solid #e0e0e0; }
          .footer p { margin: 5px 0; color: #999; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>👋 Welcome to Appatunid</h1>
            <p>WKD Field Service Management Portal</p>
          </div>
          <div class="content">
            <p>Hello <strong>${agentName || 'Agent'}</strong>,</p>
            <p>Your field service agent account has been created. Before you can log in, you need to set your password using the secure link below.</p>
            <div class="info-box">
              <p><strong>Your login details:</strong></p>
              <p>Email: <strong>${to}</strong></p>
              <p>Username: <strong>${userName}</strong></p>
            </div>
            <div class="button-container">
              <a href="${resetUrl}" class="cta-button">Set My Password</a>
            </div>
            <p style="text-align:center;color:#999;font-size:13px;">Or copy and paste this link into your browser:</p>
            <div class="link-text">${resetUrl}</div>
            <div class="warning-box">
              <p><strong>⚠️ Important:</strong></p>
              <p>• This link expires in <strong>1 hour</strong></p>
              <p>• Do not share this link with anyone</p>
              <p>• If you did not expect this email, contact your administrator</p>
            </div>
            <p>Once your password is set, you will be directed to your agent dashboard.</p>
            <p style="margin-top:30px;">Welcome aboard,<br/><strong>Appatunid Team</strong></p>
          </div>
          <div class="footer">
            <p><strong>Appatunid WKD Field Service Management</strong></p>
            <p>This is an automated message, please do not reply to this email.</p>
            <p>© ${new Date().getFullYear()} Appatunid. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Welcome to Appatunid\n\nHello ${agentName || 'Agent'},\n\nYour field service agent account has been created.\n\nLogin details:\nEmail: ${to}\nUsername: ${userName}\n\nSet your password here (expires in 1 hour):\n${resetUrl}\n\nDo not share this link with anyone.\n\nWelcome aboard,\nAppatunid Team`,
  };

  const info = await transporter.sendMail(mailOptions);

  if (process.env.NODE_ENV !== 'production') {
    console.log('📧 Agent welcome email sent!');
    console.log('📬 Preview URL:', nodemailer.getTestMessageUrl(info));
  }

  return info;
};

export default {
  sendPasswordResetEmail,
  sendEmail,
  sendQuotationEmail,
  sendInvoiceDocumentEmail,
  sendCustomerWelcomeEmail,
  sendAgentWelcomeEmail,
  createTransporter,
};
