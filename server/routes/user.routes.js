/**
 * @file user.routes.js
 * @description User route definitions
 */

import express from 'express';
import { getUsers, getUserById } from '../controllers/user.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * @route   GET /api/users
 * @desc    Get all users
 * @access  Private (superAdmin, businessAdministrator)
 */
router.get('/', protect, getUsers);

/**
 * @route   GET /api/users/:id
 * @desc    Get user by id
 * @access  Private (self, superAdmin, businessAdministrator)
 */
router.get('/:id', protect, getUserById);

export default router;
