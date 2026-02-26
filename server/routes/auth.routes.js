/**
 * @file auth.routes.js
 * @description Authentication and user management route definitions
 * @module Routes/Auth
 * 
 * Defines all authentication-related API endpoints:
 * - User registration and login
 * - Profile retrieval and updates
 * - Field permission information
 * 
 * Base path: /api/auth
 */

import express from 'express';
import {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  getFieldPermissions,
} from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register new super user account
 * @access  Public
 */
router.post('/register', registerUser);

/**
 * @route   POST /api/auth/login
 * @desc    Login user and receive JWT token
 * @access  Public
 */
router.post('/login', loginUser);

/**
 * @route   GET /api/auth/profile
 * @desc    Get authenticated user's profile
 * @access  Private (JWT required)
 */
router.get('/profile', protect, getUserProfile);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile (editable fields only)
 * @access  Private (JWT required)
 */
router.put('/profile', protect, updateUserProfile);

/**
 * @route   GET /api/auth/field-permissions
 * @desc    Get list of editable vs protected fields
 * @access  Private (JWT required)
 */
router.get('/field-permissions', protect, getFieldPermissions);

export default router;
