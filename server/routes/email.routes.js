/**
 * @file email.routes.js
 * @description Email route definitions
 */

import express from 'express';
import { sendGenericEmail } from '../controllers/email.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * @route   POST /api/email/send
 * @desc    Send generic email
 * @access  Private (superAdmin, businessAdministrator)
 */
router.post('/send', protect, sendGenericEmail);

export default router;
