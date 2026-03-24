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
  forgotPassword,
  resetPassword,
  generateOnboardingPasskey,
  requestPasskeyRenewal,
  fulfillPasskeyRenewal,
  attachUserProfileLink,
  detachUserProfileLink,
  reassignUserProfileLink,
  listRegistrationOverrideAudits,
} from '../controllers/auth.controller.js';
import { protect, authorizeRoles } from '../middleware/auth.middleware.js';

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
 * @route   POST /api/auth/passkeys/generate
 * @desc    Generate one-time onboarding passkey for delegated roles
 * @access  Private (superAdmin, businessAdministrator)
 */
router.post(
  '/passkeys/generate',
  protect,
  authorizeRoles('superAdmin', 'businessAdministrator'),
  generateOnboardingPasskey
);

/**
 * @route   POST /api/auth/passkeys/request-renewal
 * @desc    Request passkey regeneration approval
 * @access  Public
 */
router.post('/passkeys/request-renewal', requestPasskeyRenewal);

/**
 * @route   POST /api/auth/passkeys/fulfill-renewal/:requestToken
 * @desc    Fulfill renewal request and generate fresh passkey
 * @access  Private (superAdmin, businessAdministrator)
 */
router.post(
  '/passkeys/fulfill-renewal/:requestToken',
  protect,
  authorizeRoles('superAdmin', 'businessAdministrator'),
  fulfillPasskeyRenewal
);

/**
 * @route   POST /api/auth/admin/profile-links/attach
 * @desc    Attach an operational profile to a user account
 * @access  Private (superAdmin, businessAdministrator)
 */
router.post(
  '/admin/profile-links/attach',
  protect,
  authorizeRoles('superAdmin', 'businessAdministrator'),
  attachUserProfileLink
);

/**
 * @route   POST /api/auth/admin/profile-links/detach
 * @desc    Detach an operational profile from a user account
 * @access  Private (superAdmin, businessAdministrator)
 */
router.post(
  '/admin/profile-links/detach',
  protect,
  authorizeRoles('superAdmin', 'businessAdministrator'),
  detachUserProfileLink
);

/**
 * @route   POST /api/auth/admin/profile-links/reassign
 * @desc    Reassign user account to another operational profile
 * @access  Private (superAdmin, businessAdministrator)
 */
router.post(
  '/admin/profile-links/reassign',
  protect,
  authorizeRoles('superAdmin', 'businessAdministrator'),
  reassignUserProfileLink
);

/**
 * @route   GET /api/auth/admin/registration-overrides/audits
 * @desc    Query legal registration override audit records
 * @access  Private (superAdmin, businessAdministrator)
 */
router.get(
  '/admin/registration-overrides/audits',
  protect,
  authorizeRoles('superAdmin', 'businessAdministrator'),
  listRegistrationOverrideAudits
);

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

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset email
 * @access  Public
 */
router.post('/forgot-password', forgotPassword);

/**
 * @route   PUT /api/auth/reset-password/:token
 * @desc    Reset password with valid token
 * @access  Public
 */
router.put('/reset-password/:token', resetPassword);

export default router;
