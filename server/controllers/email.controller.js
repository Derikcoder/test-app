/**
 * @file email.controller.js
 * @description Email controller for generic outbound email endpoint
 */

import { sendEmail } from '../utils/emailService.js';
import { logError } from '../middleware/logger.middleware.js';

// @desc    Send a generic email
// @route   POST /api/email/send
// @access  Private (superAdmin, businessAdministrator)
export const sendGenericEmail = async (req, res) => {
  try {
    const requesterRole = req.user?.role;
    const allowedRoles = ['superAdmin', 'businessAdministrator'];

    if (!allowedRoles.includes(requesterRole)) {
      return res.status(403).json({ message: 'Forbidden. You do not have permission to perform this action.' });
    }

    const { to, subject, html, text } = req.body || {};

    if (!to || !subject || (!html && !text)) {
      return res.status(400).json({
        message: 'to, subject, and at least one of html or text are required',
      });
    }

    const info = await sendEmail({ to, subject, html, text });

    return res.status(200).json({
      message: 'Email sent successfully',
      messageId: info?.messageId || null,
    });
  } catch (error) {
    logError('Send generic email error:', error);
    return res.status(500).json({ message: error.message });
  }
};
