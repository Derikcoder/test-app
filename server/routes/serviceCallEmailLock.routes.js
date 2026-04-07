/**
 * @file serviceCallEmailLock.routes.js
 * @description Admin endpoints for inspecting and flushing the ServiceCallEmailLock collection.
 *
 * Routes:
 *   GET    /api/service-call-locks         — list all active email locks (admin)
 *   DELETE /api/service-call-locks/flush   — remove all locks (emergency admin flush)
 */

import express from 'express';
import ServiceCallEmailLock from '../models/ServiceCallEmailLock.model.js';
import { protect } from '../middleware/auth.middleware.js';
import { logInfo } from '../middleware/logger.middleware.js';

const router = express.Router();

// @desc    List all active email locks
// @route   GET /api/service-call-locks
// @access  Private (admin)
router.get('/', protect, async (req, res) => {
  try {
    const locks = await ServiceCallEmailLock.find().sort({ lockedAt: -1 });
    res.json(locks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Flush all email locks
// @route   DELETE /api/service-call-locks/flush
// @access  Private (admin)
router.delete('/flush', protect, async (req, res) => {
  try {
    const result = await ServiceCallEmailLock.deleteMany({});
    logInfo(`🧹 ServiceCallEmailLock flushed: ${result.deletedCount} lock(s) removed`);
    res.json({ message: `Flushed ${result.deletedCount} email lock(s)` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
