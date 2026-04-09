/**
 * @file auth.controller.js
 * @description Authentication controller with registration, login, and profile management
 * @module Controllers/Auth
 * 
 * Handles all authentication-related operations including:
 * - User registration with business details
 * - Login with JWT token generation
 * - Profile retrieval and updates
 * - Field-level permission enforcement
 * - Password reset functionality
 */

import User from '../models/User.model.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import OnboardingPasskey from '../models/OnboardingPasskey.model.js';
import PasskeyRenewalRequest from '../models/PasskeyRenewalRequest.model.js';
import FieldServiceAgent from '../models/FieldServiceAgent.model.js';
import Customer from '../models/Customer.model.js';
import ProfileLinkAudit from '../models/ProfileLinkAudit.model.js';
import RegistrationOverrideAudit from '../models/RegistrationOverrideAudit.model.js';
import { logError, logInfo } from '../middleware/logger.middleware.js';
import { sendPasswordResetEmail, sendAgentWelcomeEmail } from '../utils/emailService.js';

const ROLE_TYPES = ['superAdmin', 'businessAdministrator', 'fieldServiceAgent', 'customer'];
const PASSKEY_REQUIRED_ROLES = ['businessAdministrator', 'fieldServiceAgent'];
const BUSINESS_INFO_REQUIRED_ROLES = ['superAdmin', 'customer'];
const PASSKEY_EXPIRY_MS = 60 * 1000;
const RENEWAL_REQUEST_EXPIRY_MS = 15 * 60 * 1000;

const generateOneTimePasskey = () => String(crypto.randomInt(1000000, 10000000));

const LINK_CONFIG = {
  fieldServiceAgent: {
    expectedRole: 'fieldServiceAgent',
    userField: 'fieldServiceAgentProfile',
    model: FieldServiceAgent,
    modelName: 'FieldServiceAgent',
    profileLabel: 'Field service agent',
  },
  customer: {
    expectedRole: 'customer',
    userField: 'customerProfile',
    model: Customer,
    modelName: 'Customer',
    profileLabel: 'Customer',
  },
};

const ensureValidLinkType = (profileType) => LINK_CONFIG[profileType] || null;

const validateRegistrationChangeEvidence = (evidence) => {
  if (!evidence || typeof evidence !== 'object') {
    return 'Legal documentation is required to override registration identifiers';
  }

  const {
    legalDocumentType,
    legalDocumentReference,
    legalDocumentUri,
    legalChangeReason,
  } = evidence;

  if (!legalDocumentType || !legalDocumentReference || !legalDocumentUri || !legalChangeReason) {
    return 'legalDocumentType, legalDocumentReference, legalDocumentUri, and legalChangeReason are required';
  }

  const normalizedUri = String(legalDocumentUri).trim();
  if (!/^https?:\/\//i.test(normalizedUri)) {
    return 'legalDocumentUri must be a valid http(s) URL';
  }

  if (String(legalChangeReason).trim().length < 15) {
    return 'legalChangeReason must be at least 15 characters';
  }

  return null;
};

/**
 * Generate JWT Token
 * 
 * @function generateToken
 * @param {string} id - User ID to encode in token
 * @returns {string} Signed JWT token
 * 
 * @description
 * Creates a JSON Web Token for authenticated sessions.
 * Token expires in 30 days and includes the user ID as payload.
 * 
 * @example
 * const token = generateToken(user._id);
 * // Returns: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: '30d', // Token valid for 30 days
  });
};

/**
 * Register New Super User
 * 
 * @async
 * @function registerUser
 * @route POST /api/auth/register
 * @access Public
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Registration data
 * @param {string} req.body.userName - Unique username
 * @param {string} req.body.email - Email address
 * @param {string} req.body.password - Password (min 6 chars)
 * @param {string} req.body.businessName - Business name
 * @param {string} req.body.businessRegistrationNumber - Business reg number
 * @param {string} req.body.taxNumber - Tax number
 * @param {string} req.body.vatNumber - VAT number
 * @param {string} req.body.phoneNumber - Contact phone
 * @param {string} req.body.physicalAddress - Business address
 * @param {string} [req.body.websiteAddress] - Optional website URL
 * @param {Object} res - Express response object
 * 
 * @returns {Object} 201 - User object with JWT token
 * @returns {Object} 400 - Missing fields or user exists
 * @returns {Object} 500 - Server error
 * 
 * @description
 * Creates a new super user account with complete business details.
 * Validates all required fields, checks for existing users, and returns JWT token.
 * 
 * Security:
 * - Password is automatically hashed by User model pre-save hook
 * - Validates email format via model schema
 * - Checks for duplicate email or username
 * 
 * @example
 * POST /api/auth/register
 * Body: { userName: 'john', email: 'john@example.com', password: 'pass123', ... }
 * Response: { _id, userName, email, ..., token }
 */
export const registerUser = async (req, res) => {
  try {
    logInfo(`Registration attempt for email: ${req.body.email}`);
    
    // Destructure all required fields from request body
    const {
      userName,
      email,
      password,
      businessName,
      businessRegistrationNumber,
      taxNumber,
      vatNumber,
      phoneNumber,
      physicalAddress,
      websiteAddress,
      role,
      passkey,
      fieldServiceAgentProfileId,
      customerProfileId,
    } = req.body;

    const requestedRole = role || 'superAdmin';
    const normalizedEmail = email ? email.toLowerCase() : '';

    // Validate required fields common to all role registrations
    if (!userName || !email || !password) {
      logError('Registration failed - Missing required fields', { email, userName });
      return res.status(400).json({ message: 'Please fill in all required fields' });
    }

    if (!ROLE_TYPES.includes(requestedRole)) {
      logError('Registration failed - Invalid role', { email, role: requestedRole });
      return res.status(400).json({ message: 'Invalid role specified' });
    }

    if (requestedRole === 'fieldServiceAgent' && !fieldServiceAgentProfileId) {
      return res.status(400).json({
        message: 'fieldServiceAgentProfileId is required for fieldServiceAgent registration',
      });
    }

    if (requestedRole === 'customer' && !customerProfileId) {
      return res.status(400).json({
        message: 'customerProfileId is required for customer registration',
      });
    }

    if (
      ['superAdmin', 'businessAdministrator'].includes(requestedRole) &&
      (fieldServiceAgentProfileId || customerProfileId)
    ) {
      return res.status(400).json({
        message: 'Admin roles cannot be linked to field service agent or customer profiles',
      });
    }

    if (requestedRole === 'fieldServiceAgent' && customerProfileId) {
      return res.status(400).json({
        message: 'fieldServiceAgent role cannot include customerProfileId',
      });
    }

    if (requestedRole === 'customer' && fieldServiceAgentProfileId) {
      return res.status(400).json({
        message: 'customer role cannot include fieldServiceAgentProfileId',
      });
    }

    if (
      BUSINESS_INFO_REQUIRED_ROLES.includes(requestedRole) &&
      (!businessName || !phoneNumber || !physicalAddress)
    ) {
      logError('Registration failed - Missing role-required business fields', {
        email,
        role: requestedRole,
      });
      return res.status(400).json({
        message: 'Business name, phone number, and physical address are required for this account role',
      });
    }

    if (PASSKEY_REQUIRED_ROLES.includes(requestedRole) && !passkey) {
      return res.status(400).json({
        message: 'A valid one-time passkey is required for this role',
      });
    }

    // Check if user already exists by email or username
    const userExists = await User.findOne({ $or: [{ email: normalizedEmail }, { userName }] });

    if (userExists) {
      logError('Registration failed - User already exists', { email, userName });
      return res.status(400).json({
        message: userExists.email === normalizedEmail ? 'Email already registered' : 'Username already taken',
      });
    }

    let matchingPasskeyRecord = null;
    if (PASSKEY_REQUIRED_ROLES.includes(requestedRole)) {
      matchingPasskeyRecord = await OnboardingPasskey.findOne({
        targetEmail: normalizedEmail,
        targetRole: requestedRole,
        status: 'active',
      }).sort({ createdAt: -1 });

      if (!matchingPasskeyRecord) {
        return res.status(403).json({
          message: 'No active onboarding passkey found. Request a new key from a business administrator.',
          renewalRequired: true,
        });
      }

      if (matchingPasskeyRecord.expiresAt.getTime() <= Date.now()) {
        matchingPasskeyRecord.status = 'expired';
        await matchingPasskeyRecord.save();

        return res.status(403).json({
          message: 'Passkey expired. Request a new passkey.',
          renewalRequired: true,
        });
      }

      const isPasskeyValid = await matchingPasskeyRecord.comparePasskey(passkey);
      if (!isPasskeyValid) {
        matchingPasskeyRecord.attempts += 1;
        if (matchingPasskeyRecord.attempts >= matchingPasskeyRecord.maxAttempts) {
          matchingPasskeyRecord.status = 'revoked';
        }
        await matchingPasskeyRecord.save();

        return res.status(401).json({ message: 'Invalid passkey' });
      }
    }

    let fieldServiceAgentProfile = null;
    if (requestedRole === 'fieldServiceAgent') {
      fieldServiceAgentProfile = await FieldServiceAgent.findById(fieldServiceAgentProfileId);

      if (!fieldServiceAgentProfile) {
        return res.status(404).json({ message: 'Field service agent profile not found' });
      }

      if (fieldServiceAgentProfile.userAccount) {
        return res.status(409).json({ message: 'Field service agent profile already linked to a user account' });
      }

      if (fieldServiceAgentProfile.email.toLowerCase() !== normalizedEmail) {
        return res.status(400).json({
          message: 'Email must match the linked field service agent profile email',
        });
      }
    }

    let customerProfile = null;
    if (requestedRole === 'customer') {
      customerProfile = await Customer.findById(customerProfileId);

      if (!customerProfile) {
        return res.status(404).json({ message: 'Customer profile not found' });
      }

      if (customerProfile.userAccount) {
        return res.status(409).json({ message: 'Customer profile already linked to a user account' });
      }

      if (customerProfile.email.toLowerCase() !== normalizedEmail) {
        return res.status(400).json({
          message: 'Email must match the linked customer profile email',
        });
      }
    }

    // Create new user (password will be hashed automatically)
    const user = await User.create({
      userName,
      email: normalizedEmail,
      password,
      businessName,
      businessRegistrationNumber,
      taxNumber,
      vatNumber,
      phoneNumber,
      physicalAddress,
      websiteAddress,
      role: requestedRole,
      isSuperUser: ['superAdmin', 'businessAdministrator'].includes(requestedRole),
      fieldServiceAgentProfile: fieldServiceAgentProfile ? fieldServiceAgentProfile._id : null,
      customerProfile: customerProfile ? customerProfile._id : null,
    });

    if (fieldServiceAgentProfile) {
      fieldServiceAgentProfile.userAccount = user._id;
      await fieldServiceAgentProfile.save();
    }

    if (customerProfile) {
      customerProfile.userAccount = user._id;
      await customerProfile.save();
    }

    if (matchingPasskeyRecord) {
      matchingPasskeyRecord.status = 'consumed';
      matchingPasskeyRecord.consumedAt = new Date();
      await matchingPasskeyRecord.save();
    }

    if (user) {
      logInfo(`✅ User registered successfully: ${user.email}`);
      
      // Return user data with JWT token (exclude password)
      res.status(201).json({
        _id: user._id,
        userName: user.userName,
        email: user.email,
        businessName: user.businessName,
        businessRegistrationNumber: user.businessRegistrationNumber,
        taxNumber: user.taxNumber,
        vatNumber: user.vatNumber,
        phoneNumber: user.phoneNumber,
        physicalAddress: user.physicalAddress,
        websiteAddress: user.websiteAddress,
        isSuperUser: user.isSuperUser,
        role: user.role,
        fieldServiceAgentProfile: user.fieldServiceAgentProfile || null,
        customerProfile: user.customerProfile || null,
        customerType: customerProfile ? customerProfile.customerType : null,
        token: generateToken(user._id),
      });
    } else {
      logError('Registration failed - Invalid user data');
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    logError('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Login User
 * 
 * @async
 * @function loginUser
 * @route POST /api/auth/login
 * @access Public
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Login credentials
 * @param {string} req.body.email - User's email
 * @param {string} req.body.password - User's password
 * @param {Object} res - Express response object
 * 
 * @returns {Object} 200 - User object with JWT token
 * @returns {Object} 400 - Missing credentials
 * @returns {Object} 401 - Invalid credentials
 * @returns {Object} 500 - Server error
 * 
 * @description
 * Authenticates user credentials and returns JWT token.
 * Verifies email and password, then generates session token.
 * 
 * Security:
 * - Uses bcrypt comparison for password verification
 * - Logs failed login attempts for security monitoring
 * - Returns same error for both invalid email and password (prevents user enumeration)
 * 
 * @example
 * POST /api/auth/login
 * Body: { email: 'john@example.com', password: 'pass123' }
 * Response: { _id, userName, email, ..., token }
 */
export const loginUser = async (req, res) => {
  try {
    logInfo(`Login attempt for email: ${req.body.email}`);
    
    const { email, password } = req.body;

    // Validate credentials are provided
    if (!email || !password) {
      logError('Login failed - Missing credentials');
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // Convert email to lowercase for case-insensitive lookup
    const normalizedEmail = email.toLowerCase();

    // Find user by email
    const user = await User.findOne({ email: normalizedEmail });

    // Verify user exists and password matches
    if (user && (await user.comparePassword(password))) {
      logInfo(`✅ User logged in successfully: ${user.email}`);

      // Look up customerType from the linked Customer record for customer-role users
      let customerType = null;
      if (user.role === 'customer' && user.customerProfile) {
        const customerDoc = await Customer.findById(user.customerProfile).select('customerType');
        customerType = customerDoc?.customerType ?? null;
      }
      
      // Return user data with JWT token
      res.json({
        _id: user._id,
        userName: user.userName,
        email: user.email,
        businessName: user.businessName,
        businessRegistrationNumber: user.businessRegistrationNumber,
        taxNumber: user.taxNumber,
        vatNumber: user.vatNumber,
        phoneNumber: user.phoneNumber,
        physicalAddress: user.physicalAddress,
        websiteAddress: user.websiteAddress,
        isSuperUser: user.isSuperUser,
        role: user.role,
        fieldServiceAgentProfile: user.fieldServiceAgentProfile || null,
        customerProfile: user.customerProfile || null,
        customerType: customerType,
        token: generateToken(user._id),
      });
    } else {
      // Generic error message to prevent user enumeration
      logError('Login failed - Invalid credentials', { email });
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    logError('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get User Profile
 * 
 * @async
 * @function getUserProfile
 * @route GET /api/auth/profile
 * @access Private (requires JWT token)
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.user - User object attached by protect middleware
 * @param {Object} res - Express response object
 * 
 * @returns {Object} 200 - User profile with field permissions
 * @returns {Object} 404 - User not found
 * @returns {Object} 500 - Server error
 * 
 * @description
 * Retrieves authenticated user's profile information.
 * Includes lists of editable and protected fields for frontend reference.
 * 
 * @example
 * GET /api/auth/profile
 * Headers: { Authorization: 'Bearer <token>' }
 * Response: { _id, userName, email, ..., editableFields: [...], protectedFields: [...] }
 */
export const getUserProfile = async (req, res) => {
  try {
    // Fetch user from database, exclude password field
    const user = await User.findById(req.user._id).select('-password');

    if (user) {
      // Return user data with field permission metadata
      res.json({
        ...user.toObject(),
        editableFields: User.EDITABLE_FIELDS,
        protectedFields: User.IMMUTABLE_FIELDS,
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get Field Permissions
 * 
 * @async
 * @function getFieldPermissions
 * @route GET /api/auth/field-permissions
 * @access Private (requires JWT token)
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * 
 * @returns {Object} 200 - Field permission information
 * @returns {Object} 500 - Server error
 * 
 * @description
 * Returns metadata about which user fields can be edited vs protected.
 * Useful for frontend form validation and UI state management.
 * 
 * @example
 * GET /api/auth/field-permissions
 * Response: { editable: [...], protected: [...], info: {...} }
 */
export const getFieldPermissions = async (req, res) => {
  try {
    res.json({
      editable: User.EDITABLE_FIELDS,
      protected: User.IMMUTABLE_FIELDS,
      info: {
        editable: 'These fields can be updated by the user',
        protected: 'These fields are immutable and cannot be changed after account creation'
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Update User Profile
 * 
 * @async
 * @function updateUserProfile
 * @route PUT /api/auth/profile
 * @access Private (requires JWT token)
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.user - User object attached by protect middleware
 * @param {Object} req.body - Updated profile data
 * @param {Object} res - Express response object
 * 
 * @returns {Object} 200 - Updated user object with JWT token
 * @returns {Object} 400 - Validation error (e.g., password too short)
 * @returns {Object} 403 - Attempted to update protected field
 * @returns {Object} 404 - User not found
 * @returns {Object} 500 - Server error
 * 
 * @description
 * Updates editable fields in user profile with field-level permission enforcement.
 * Blocks attempts to modify protected fields (userName, role bindings, etc.) and
 * enforces write-once rules for registration identifiers unless requester is superAdmin.
 * 
 * Protected Fields (Cannot Update):
 * - userName
 * - createdAt
 * - _id
 * - isSuperUser
 * 
 * Editable Fields (Can Update):
 * - email
 * - password (with validation)
 * - businessName
 * - businessRegistrationNumber (write-once unless superAdmin)
 * - taxNumber
 * - vatNumber
 * - phoneNumber
 * - physicalAddress
 * - websiteAddress
 * - isActive
 * 
 * @example
 * PUT /api/auth/profile
 * Headers: { Authorization: 'Bearer <token>' }
 * Body: { phoneNumber: '+27123456789', websiteAddress: 'https://example.com' }
 * Response: { ...updatedUserData, token, message: 'Profile updated successfully' }
 */
export const updateUserProfile = async (req, res) => {
  try {
    logInfo(`Profile update attempt for user: ${req.user._id}`);
    
    // Fetch current user data
    const user = await User.findById(req.user._id);

    if (!user) {
      logError('Profile update failed - User not found', { userId: req.user._id });
      return res.status(404).json({ message: 'User not found' });
    }

    const isSuperAdmin = req.user?.role === 'superAdmin' || req.user?.isSuperUser === true;
    const writeOnceRegistrationFields = ['businessRegistrationNumber', 'taxNumber', 'vatNumber'];
    const hasValue = (value) => {
      if (typeof value === 'string') return value.trim().length > 0;
      return value !== null && value !== undefined && value !== '';
    };
    const previousRegistrationValues = writeOnceRegistrationFields.reduce((acc, field) => {
      acc[field] = user[field];
      return acc;
    }, {});

    /**
     * Field-Level Permission Check
     * Detect if client is attempting to update any immutable fields
     * Compares requested field values against current user data
     */
    const attemptedImmutableUpdates = User.IMMUTABLE_FIELDS.filter(
      field => req.body[field] !== undefined && req.body[field] !== user[field]
    );

    const attemptedLockedRegistrationUpdates = isSuperAdmin
      ? []
      : writeOnceRegistrationFields.filter((field) => (
        req.body[field] !== undefined &&
        hasValue(user[field]) &&
        req.body[field] !== user[field]
      ));

    const attemptedSuperAdminRegistrationOverrides = isSuperAdmin
      ? writeOnceRegistrationFields.filter((field) => (
        req.body[field] !== undefined &&
        hasValue(user[field]) &&
        req.body[field] !== user[field]
      ))
      : [];

    // Block update if protected fields are being modified
    if (attemptedImmutableUpdates.length > 0) {
      logError('Profile update blocked - Attempted to modify immutable fields', { 
        fields: attemptedImmutableUpdates,
        userId: user._id 
      });
      return res.status(403).json({ 
        message: 'Cannot update protected fields',
        protectedFields: attemptedImmutableUpdates,
        info: 'Names, registration numbers, and dates cannot be changed'
      });
    }

    if (attemptedLockedRegistrationUpdates.length > 0) {
      logError('Profile update blocked - Attempted to modify write-once registration identifiers', {
        fields: attemptedLockedRegistrationUpdates,
        userId: user._id,
      });
      return res.status(403).json({
        message: 'Registration identifiers cannot be edited after they are first saved',
        protectedFields: attemptedLockedRegistrationUpdates,
        info: 'Only superAdmin can update registration identifiers after initial capture',
      });
    }

    if (attemptedSuperAdminRegistrationOverrides.length > 0) {
      const evidenceValidationError = validateRegistrationChangeEvidence(req.body.registrationChangeEvidence);
      if (evidenceValidationError) {
        logError('Profile update blocked - Missing/invalid legal evidence for superAdmin override', {
          fields: attemptedSuperAdminRegistrationOverrides,
          userId: user._id,
          reason: evidenceValidationError,
        });
        return res.status(400).json({
          message: 'Valid legal documentation is required to update existing registration identifiers',
          requiredFields: [
            'registrationChangeEvidence.legalDocumentType',
            'registrationChangeEvidence.legalDocumentReference',
            'registrationChangeEvidence.legalDocumentUri',
            'registrationChangeEvidence.legalChangeReason',
          ],
          info: evidenceValidationError,
        });
      }

      logInfo('SuperAdmin override approved with legal documentation', {
        userId: user._id,
        fields: attemptedSuperAdminRegistrationOverrides,
        legalDocumentType: req.body.registrationChangeEvidence.legalDocumentType,
        legalDocumentReference: req.body.registrationChangeEvidence.legalDocumentReference,
        legalDocumentUri: req.body.registrationChangeEvidence.legalDocumentUri,
      });
    }

    /**
     * Update Editable Fields
     * Only apply updates if field is present in request body
     * Uses conditional checks to avoid overwriting with undefined
     */
    if (req.body.email !== undefined) user.email = req.body.email;
    if (req.body.businessName !== undefined) user.businessName = req.body.businessName;
    if (req.body.businessRegistrationNumber !== undefined) user.businessRegistrationNumber = req.body.businessRegistrationNumber;
    if (req.body.taxNumber !== undefined) user.taxNumber = req.body.taxNumber;
    if (req.body.vatNumber !== undefined) user.vatNumber = req.body.vatNumber;
    if (req.body.phoneNumber !== undefined) user.phoneNumber = req.body.phoneNumber;
    if (req.body.physicalAddress !== undefined) user.physicalAddress = req.body.physicalAddress;
    if (req.body.websiteAddress !== undefined) user.websiteAddress = req.body.websiteAddress;
    if (req.body.isActive !== undefined) user.isActive = req.body.isActive;
    
    /**
     * Password Update (Special Handling)
     * Password requires validation and will be auto-hashed by pre-save hook
     */
    if (req.body.password) {
      // Validate minimum password length
      if (req.body.password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
      }
      user.password = req.body.password; // Will be hashed automatically
    }

    // Save updated user (triggers validation and pre-save hooks)
    const updatedUser = await user.save();

    if (attemptedSuperAdminRegistrationOverrides.length > 0) {
      const newRegistrationValues = writeOnceRegistrationFields.reduce((acc, field) => {
        acc[field] = updatedUser[field];
        return acc;
      }, {});

      await RegistrationOverrideAudit.create({
        targetUser: updatedUser._id,
        actingSuperAdmin: req.user._id,
        overriddenFields: attemptedSuperAdminRegistrationOverrides,
        previousValues: previousRegistrationValues,
        newValues: newRegistrationValues,
        legalEvidenceSnapshot: {
          legalDocumentType: req.body.registrationChangeEvidence.legalDocumentType,
          legalDocumentReference: req.body.registrationChangeEvidence.legalDocumentReference,
          legalDocumentUri: req.body.registrationChangeEvidence.legalDocumentUri,
          legalChangeReason: req.body.registrationChangeEvidence.legalChangeReason,
        },
      });
    }
    
    logInfo(`✅ Profile updated successfully for user: ${updatedUser.email}`);

    // Return complete updated profile with new token
    res.json({
      _id: updatedUser._id,
      userName: updatedUser.userName,
      email: updatedUser.email,
      businessName: updatedUser.businessName,
      businessRegistrationNumber: updatedUser.businessRegistrationNumber,
      taxNumber: updatedUser.taxNumber,
      vatNumber: updatedUser.vatNumber,
      phoneNumber: updatedUser.phoneNumber,
      physicalAddress: updatedUser.physicalAddress,
      websiteAddress: updatedUser.websiteAddress,
      isSuperUser: updatedUser.isSuperUser,
      role: updatedUser.role,
      fieldServiceAgentProfile: updatedUser.fieldServiceAgentProfile || null,
      customerProfile: updatedUser.customerProfile || null,
      isActive: updatedUser.isActive,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
      token: generateToken(updatedUser._id), // Generate fresh token
      message: 'Profile updated successfully'
    });
  } catch (error) {
    logError('Profile update error:', error);
    res.status(500).json({ 
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * Generate One-Time Onboarding Passkey
 *
 * @async
 * @function generateOnboardingPasskey
 * @route POST /api/auth/passkeys/generate
 * @access Private (superAdmin, businessAdministrator)
 */
export const generateOnboardingPasskey = async (req, res) => {
  try {
    const { targetEmail, targetRole } = req.body;

    if (!targetEmail || !targetRole) {
      return res.status(400).json({ message: 'targetEmail and targetRole are required' });
    }

    if (!PASSKEY_REQUIRED_ROLES.includes(targetRole)) {
      return res.status(400).json({
        message: 'Passkeys can only be generated for businessAdministrator and fieldServiceAgent roles',
      });
    }

    const normalizedTargetEmail = targetEmail.toLowerCase();
    const plainPasskey = generateOneTimePasskey();
    const passkeyHash = await bcrypt.hash(plainPasskey, 10);
    const expiresAt = new Date(Date.now() + PASSKEY_EXPIRY_MS);

    await OnboardingPasskey.updateMany(
      {
        targetEmail: normalizedTargetEmail,
        targetRole,
        status: 'active',
      },
      {
        $set: {
          status: 'revoked',
        },
      }
    );

    const onboardingPasskey = await OnboardingPasskey.create({
      targetEmail: normalizedTargetEmail,
      targetRole,
      passkeyHash,
      issuedByUser: req.user._id,
      expiresAt,
    });

    logInfo('Onboarding passkey generated', {
      generatedBy: req.user._id,
      targetEmail: normalizedTargetEmail,
      targetRole,
      passkeyId: onboardingPasskey._id,
      expiresAt,
    });

    return res.status(201).json({
      message: 'Onboarding passkey generated successfully',
      passkey: plainPasskey,
      expiresAt,
      targetEmail: normalizedTargetEmail,
      targetRole,
    });
  } catch (error) {
    logError('Generate onboarding passkey error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Request Passkey Renewal
 *
 * @async
 * @function requestPasskeyRenewal
 * @route POST /api/auth/passkeys/request-renewal
 * @access Public
 */
export const requestPasskeyRenewal = async (req, res) => {
  try {
    const { targetEmail, targetRole } = req.body;

    if (!targetEmail || !targetRole) {
      return res.status(400).json({ message: 'targetEmail and targetRole are required' });
    }

    if (!PASSKEY_REQUIRED_ROLES.includes(targetRole)) {
      return res.status(400).json({
        message: 'Renewal requests are only supported for businessAdministrator and fieldServiceAgent roles',
      });
    }

    const normalizedTargetEmail = targetEmail.toLowerCase();
    const rawRequestToken = crypto.randomBytes(24).toString('hex');
    const requestTokenHash = crypto.createHash('sha256').update(rawRequestToken).digest('hex');
    const expiresAt = new Date(Date.now() + RENEWAL_REQUEST_EXPIRY_MS);

    await PasskeyRenewalRequest.updateMany(
      {
        targetEmail: normalizedTargetEmail,
        targetRole,
        status: 'pending',
      },
      {
        $set: {
          status: 'expired',
          processedAt: new Date(),
        },
      }
    );

    const renewalRequest = await PasskeyRenewalRequest.create({
      requestTokenHash,
      targetEmail: normalizedTargetEmail,
      targetRole,
      requestedByIp: req.ip || '',
      expiresAt,
    });

    // Placeholder for notification integration (email/SMS/in-app queue)
    logInfo('Passkey renewal request created', {
      requestId: renewalRequest._id,
      targetEmail: normalizedTargetEmail,
      targetRole,
      expiresAt,
      renewalActionToken: rawRequestToken,
    });

    return res.status(201).json({
      message: 'Renewal request submitted. A business administrator must approve a new passkey.',
      requestSubmitted: true,
      ...(process.env.NODE_ENV === 'development' && {
        renewalActionToken: rawRequestToken,
      }),
    });
  } catch (error) {
    logError('Request passkey renewal error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Fulfill Passkey Renewal Request
 *
 * @async
 * @function fulfillPasskeyRenewal
 * @route POST /api/auth/passkeys/fulfill-renewal/:requestToken
 * @access Private (superAdmin, businessAdministrator)
 */
export const fulfillPasskeyRenewal = async (req, res) => {
  try {
    const { requestToken } = req.params;

    if (!requestToken) {
      return res.status(400).json({ message: 'requestToken is required' });
    }

    const requestTokenHash = crypto.createHash('sha256').update(requestToken).digest('hex');

    const renewalRequest = await PasskeyRenewalRequest.findOne({
      requestTokenHash,
      status: 'pending',
    });

    if (!renewalRequest) {
      return res.status(404).json({ message: 'Renewal request not found or already processed' });
    }

    if (renewalRequest.expiresAt.getTime() <= Date.now()) {
      renewalRequest.status = 'expired';
      renewalRequest.processedAt = new Date();
      await renewalRequest.save();

      return res.status(400).json({ message: 'Renewal request has expired' });
    }

    const plainPasskey = generateOneTimePasskey();
    const passkeyHash = await bcrypt.hash(plainPasskey, 10);
    const expiresAt = new Date(Date.now() + PASSKEY_EXPIRY_MS);

    await OnboardingPasskey.updateMany(
      {
        targetEmail: renewalRequest.targetEmail,
        targetRole: renewalRequest.targetRole,
        status: 'active',
      },
      {
        $set: {
          status: 'revoked',
        },
      }
    );

    await OnboardingPasskey.create({
      targetEmail: renewalRequest.targetEmail,
      targetRole: renewalRequest.targetRole,
      passkeyHash,
      issuedByUser: req.user._id,
      expiresAt,
    });

    renewalRequest.status = 'fulfilled';
    renewalRequest.processedByUser = req.user._id;
    renewalRequest.processedAt = new Date();
    await renewalRequest.save();

    return res.status(201).json({
      message: 'Renewal request fulfilled and new passkey generated',
      passkey: plainPasskey,
      expiresAt,
      targetEmail: renewalRequest.targetEmail,
      targetRole: renewalRequest.targetRole,
    });
  } catch (error) {
    logError('Fulfill passkey renewal error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Admin Provision User
 *
 * @async
 * @function adminProvisionUser
 * @description Directly creates a User account for an existing FieldServiceAgent or Customer
 *              profile, bypassing the passkey self-registration flow. Intended for admin-driven
 *              onboarding (e.g. UAT, staff setup). Sets isSuperUser=false and links the User
 *              back to the operational profile.
 * @route POST /api/auth/admin/provision-user
 * @access Private (superAdmin, businessAdministrator)
 */
export const adminProvisionUser = async (req, res) => {
  try {
    const { role, profileId, userName, email } = req.body;

    if (!role || !profileId || !userName || !email) {
      return res.status(400).json({ message: 'role, profileId, userName, and email are all required' });
    }

    const PROVISIONABLE_ROLES = ['fieldServiceAgent', 'customer'];
    if (!PROVISIONABLE_ROLES.includes(role)) {
      return res.status(400).json({ message: 'Only fieldServiceAgent and customer accounts can be provisioned via this endpoint' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Verify profile exists and has no linked account yet
    let profile = null;
    let profileLink = {};
    let businessData = {};

    if (role === 'fieldServiceAgent') {
      profile = await FieldServiceAgent.findById(profileId);
      if (!profile) {
        return res.status(404).json({ message: 'FieldServiceAgent profile not found' });
      }
      if (profile.userAccount) {
        return res.status(400).json({ message: 'This agent profile already has a linked user account' });
      }
      profileLink.fieldServiceAgentProfile = profileId;
    } else {
      profile = await Customer.findById(profileId);
      if (!profile) {
        return res.status(404).json({ message: 'Customer profile not found' });
      }
      if (profile.userAccount) {
        return res.status(400).json({ message: 'This customer profile already has a linked user account' });
      }
      profileLink.customerProfile = profileId;
      // Customer role requires businessName, phoneNumber, physicalAddress on User — derive from profile
      businessData.businessName = profile.businessName
        || `${profile.contactFirstName} ${profile.contactLastName}`;
      businessData.phoneNumber = profile.phoneNumber || '';
      businessData.physicalAddress = profile.physicalAddress
        || (profile.physicalAddressDetails?.streetAddress)
        || 'Not provided';
    }

    // Check uniqueness before creation
    const conflict = await User.findOne({ $or: [{ email: normalizedEmail }, { userName }] });
    if (conflict) {
      const field = conflict.email === normalizedEmail ? 'email' : 'userName';
      return res.status(400).json({ message: `A user with this ${field} already exists` });
    }

    const newUser = await User.create({
      userName,
      email: normalizedEmail,
      password: crypto.randomBytes(32).toString('hex'), // random unguessable — agent sets own password via welcome email
      role,
      isSuperUser: false,
      ...profileLink,
      ...businessData,
    });

    // Link the profile back to the new User
    if (role === 'fieldServiceAgent') {
      await FieldServiceAgent.findByIdAndUpdate(profileId, { userAccount: newUser._id });
    } else {
      await Customer.findByIdAndUpdate(profileId, { userAccount: newUser._id });
    }

    // Generate a one-time set-password token and email it to the agent
    const resetToken = newUser.generatePasswordResetToken();
    await newUser.save();

    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;

    if (role === 'fieldServiceAgent') {
      const agentName = profile.firstName && profile.lastName
        ? `${profile.firstName} ${profile.lastName}`
        : undefined;
      await sendAgentWelcomeEmail({ to: normalizedEmail, agentName, userName, resetUrl });
    }

    logInfo('Admin provisioned user account', {
      provisionedBy: req.user._id,
      newUserId: newUser._id,
      role,
      profileId,
      email: normalizedEmail,
    });

    return res.status(201).json({
      message: `User account provisioned. Welcome email sent to ${normalizedEmail}.`,
      userId: newUser._id,
      userName: newUser.userName,
      email: newUser.email,
      role: newUser.role,
    });
  } catch (error) {
    logError('Admin provision user error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Attach User to Operational Profile
 *
 * @async
 * @function attachUserProfileLink
 * @route POST /api/auth/admin/profile-links/attach
 * @access Private (superAdmin, businessAdministrator)
 */
export const attachUserProfileLink = async (req, res) => {
  try {
    const { userId, profileType, profileId, reason } = req.body;

    if (!userId || !profileType || !profileId) {
      return res.status(400).json({ message: 'userId, profileType, and profileId are required' });
    }

    const linkConfig = ensureValidLinkType(profileType);
    if (!linkConfig) {
      return res.status(400).json({ message: 'Invalid profileType. Use fieldServiceAgent or customer.' });
    }

    const principalUser = await User.findById(userId);
    if (!principalUser) {
      return res.status(404).json({ message: 'User account not found' });
    }

    if (principalUser.role !== linkConfig.expectedRole) {
      return res.status(400).json({
        message: `${linkConfig.profileLabel} profile links require user role ${linkConfig.expectedRole}`,
      });
    }

    if (principalUser[linkConfig.userField]) {
      return res.status(409).json({
        message: `User already has a linked ${linkConfig.profileLabel.toLowerCase()} profile. Use reassign endpoint instead.`,
      });
    }

    const targetProfile = await linkConfig.model.findById(profileId);
    if (!targetProfile) {
      return res.status(404).json({ message: `${linkConfig.profileLabel} profile not found` });
    }

    if (targetProfile.userAccount) {
      return res.status(409).json({ message: `${linkConfig.profileLabel} profile is already linked to another user` });
    }

    principalUser[linkConfig.userField] = targetProfile._id;
    targetProfile.userAccount = principalUser._id;

    await principalUser.save();
    await targetProfile.save();

    await ProfileLinkAudit.create({
      action: 'attach',
      profileType,
      principalUser: principalUser._id,
      previousProfile: null,
      newProfile: targetProfile._id,
      profileRefModel: linkConfig.modelName,
      performedBy: req.user._id,
      reason: reason || '',
      metadata: {
        endpoint: 'attachUserProfileLink',
      },
    });

    return res.status(200).json({
      message: `${linkConfig.profileLabel} profile attached successfully`,
      userId: principalUser._id,
      profileType,
      profileId: targetProfile._id,
    });
  } catch (error) {
    logError('Attach user profile link error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Detach User from Operational Profile
 *
 * @async
 * @function detachUserProfileLink
 * @route POST /api/auth/admin/profile-links/detach
 * @access Private (superAdmin, businessAdministrator)
 */
export const detachUserProfileLink = async (req, res) => {
  try {
    const { userId, profileType, reason } = req.body;

    if (!userId || !profileType) {
      return res.status(400).json({ message: 'userId and profileType are required' });
    }

    const linkConfig = ensureValidLinkType(profileType);
    if (!linkConfig) {
      return res.status(400).json({ message: 'Invalid profileType. Use fieldServiceAgent or customer.' });
    }

    const principalUser = await User.findById(userId);
    if (!principalUser) {
      return res.status(404).json({ message: 'User account not found' });
    }

    const linkedProfileId = principalUser[linkConfig.userField];
    if (!linkedProfileId) {
      return res.status(404).json({
        message: `No ${linkConfig.profileLabel.toLowerCase()} profile is linked to this user`,
      });
    }

    const linkedProfile = await linkConfig.model.findById(linkedProfileId);
    if (linkedProfile && linkedProfile.userAccount?.toString() === principalUser._id.toString()) {
      linkedProfile.userAccount = null;
      await linkedProfile.save();
    }

    principalUser[linkConfig.userField] = null;
    await principalUser.save();

    await ProfileLinkAudit.create({
      action: 'detach',
      profileType,
      principalUser: principalUser._id,
      previousProfile: linkedProfileId,
      newProfile: null,
      profileRefModel: linkConfig.modelName,
      performedBy: req.user._id,
      reason: reason || '',
      metadata: {
        endpoint: 'detachUserProfileLink',
      },
    });

    return res.status(200).json({
      message: `${linkConfig.profileLabel} profile detached successfully`,
      userId: principalUser._id,
      profileType,
      previousProfileId: linkedProfileId,
    });
  } catch (error) {
    logError('Detach user profile link error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Reassign User to Another Operational Profile
 *
 * @async
 * @function reassignUserProfileLink
 * @route POST /api/auth/admin/profile-links/reassign
 * @access Private (superAdmin, businessAdministrator)
 */
export const reassignUserProfileLink = async (req, res) => {
  try {
    const { userId, profileType, newProfileId, reason } = req.body;

    if (!userId || !profileType || !newProfileId) {
      return res.status(400).json({ message: 'userId, profileType, and newProfileId are required' });
    }

    const linkConfig = ensureValidLinkType(profileType);
    if (!linkConfig) {
      return res.status(400).json({ message: 'Invalid profileType. Use fieldServiceAgent or customer.' });
    }

    const principalUser = await User.findById(userId);
    if (!principalUser) {
      return res.status(404).json({ message: 'User account not found' });
    }

    if (principalUser.role !== linkConfig.expectedRole) {
      return res.status(400).json({
        message: `${linkConfig.profileLabel} profile links require user role ${linkConfig.expectedRole}`,
      });
    }

    const previousProfileId = principalUser[linkConfig.userField];
    if (!previousProfileId) {
      return res.status(404).json({
        message: `No ${linkConfig.profileLabel.toLowerCase()} profile is currently linked to this user`,
      });
    }

    if (previousProfileId.toString() === newProfileId) {
      return res.status(200).json({
        message: 'User is already linked to the requested profile',
        userId: principalUser._id,
        profileType,
        profileId: previousProfileId,
      });
    }

    const nextProfile = await linkConfig.model.findById(newProfileId);
    if (!nextProfile) {
      return res.status(404).json({ message: `${linkConfig.profileLabel} profile not found` });
    }

    if (nextProfile.userAccount && nextProfile.userAccount.toString() !== principalUser._id.toString()) {
      return res.status(409).json({
        message: `${linkConfig.profileLabel} profile is already linked to another user`,
      });
    }

    const previousProfile = await linkConfig.model.findById(previousProfileId);
    if (previousProfile && previousProfile.userAccount?.toString() === principalUser._id.toString()) {
      previousProfile.userAccount = null;
      await previousProfile.save();
    }

    principalUser[linkConfig.userField] = nextProfile._id;
    nextProfile.userAccount = principalUser._id;

    await principalUser.save();
    await nextProfile.save();

    await ProfileLinkAudit.create({
      action: 'reassign',
      profileType,
      principalUser: principalUser._id,
      previousProfile: previousProfileId,
      newProfile: nextProfile._id,
      profileRefModel: linkConfig.modelName,
      performedBy: req.user._id,
      reason: reason || '',
      metadata: {
        endpoint: 'reassignUserProfileLink',
      },
    });

    return res.status(200).json({
      message: `${linkConfig.profileLabel} profile reassigned successfully`,
      userId: principalUser._id,
      profileType,
      previousProfileId,
      newProfileId: nextProfile._id,
    });
  } catch (error) {
    logError('Reassign user profile link error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * List Legal Registration Override Audits
 *
 * @async
 * @function listRegistrationOverrideAudits
 * @route GET /api/auth/admin/registration-overrides/audits
 * @access Private (superAdmin, businessAdministrator)
 */
export const listRegistrationOverrideAudits = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      targetUser,
      documentReference,
      page = '1',
      limit = '20',
    } = req.query;

    const queryFilter = {};

    if (targetUser) {
      queryFilter.targetUser = targetUser;
    }

    if (documentReference) {
      queryFilter['legalEvidenceSnapshot.legalDocumentReference'] = {
        $regex: String(documentReference).trim(),
        $options: 'i',
      };
    }

    if (startDate || endDate) {
      const createdAtFilter = {};

      if (startDate) {
        const parsedStartDate = new Date(startDate);
        if (Number.isNaN(parsedStartDate.getTime())) {
          return res.status(400).json({ message: 'Invalid startDate. Use a valid ISO date.' });
        }
        createdAtFilter.$gte = parsedStartDate;
      }

      if (endDate) {
        const parsedEndDate = new Date(endDate);
        if (Number.isNaN(parsedEndDate.getTime())) {
          return res.status(400).json({ message: 'Invalid endDate. Use a valid ISO date.' });
        }
        createdAtFilter.$lte = parsedEndDate;
      }

      queryFilter.createdAt = createdAtFilter;
    }

    const parsedPage = Number.parseInt(page, 10);
    const parsedLimit = Number.parseInt(limit, 10);
    const pageNumber = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
    const limitNumber = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 100) : 20;
    const skip = (pageNumber - 1) * limitNumber;

    const [records, total] = await Promise.all([
      RegistrationOverrideAudit.find(queryFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber)
        .lean(),
      RegistrationOverrideAudit.countDocuments(queryFilter),
    ]);

    return res.status(200).json({
      records,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages: Math.ceil(total / limitNumber) || 1,
      },
      filtersApplied: {
        startDate: startDate || null,
        endDate: endDate || null,
        targetUser: targetUser || null,
        documentReference: documentReference || null,
      },
    });
  } catch (error) {
    logError('List registration override audits error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Resend Agent Welcome / Set-Password Email
 *
 * @async
 * @function resendAgentWelcomeEmail
 * @description Regenerates a password reset token and resends the welcome email to an already-provisioned
 *              field service agent. Used when the original email was not received or has expired.
 * @route POST /api/auth/admin/resend-agent-welcome/:agentProfileId
 * @access Private (superAdmin, businessAdministrator)
 */
export const resendAgentWelcomeEmail = async (req, res) => {
  try {
    const { agentProfileId } = req.params;

    const profile = await FieldServiceAgent.findById(agentProfileId);
    if (!profile) {
      return res.status(404).json({ message: 'Agent profile not found' });
    }
    if (!profile.userAccount) {
      return res.status(400).json({ message: 'No user account is linked to this agent. Provision one first.' });
    }

    const agentUser = await User.findById(profile.userAccount);
    if (!agentUser) {
      return res.status(404).json({ message: 'Linked user account not found' });
    }

    const resetToken = agentUser.generatePasswordResetToken();
    await agentUser.save();

    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;
    const agentName = `${profile.firstName} ${profile.lastName}`;

    await sendAgentWelcomeEmail({ to: agentUser.email, agentName, userName: agentUser.userName, resetUrl });

    logInfo('Admin resent agent welcome email', {
      sentBy: req.user._id,
      agentProfileId,
      userId: agentUser._id,
      email: agentUser.email,
    });

    return res.status(200).json({ message: `Welcome email resent to ${agentUser.email}` });
  } catch (error) {
    logError('Resend agent welcome email error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Request Password Reset
 * 
 * @async
 * @function forgotPassword
 * @route POST /api/auth/forgot-password
 * @access Public
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request data
 * @param {string} req.body.email - User's email address
 * @param {Object} res - Express response object
 * 
 * @description
 * Initiates password reset process:
 * 1. Validates email exists in database
 * 2. Generates secure reset token (valid for 1 hour)
 * 3. Sends reset email with token link
 * 4. Returns success message (same message even if email not found - security)
 * 
 * Security Note: Always returns success to prevent email enumeration attacks
 * 
 * @example
 * POST /api/auth/forgot-password
 * Body: { email: "user@example.com" }
 * Response: { message: "If that email exists, a reset link has been sent" }
 */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Validate email provided
    if (!email) {
      return res.status(400).json({ message: 'Please provide your email address' });
    }
    
    // Find user by email (case-insensitive)
    const user = await User.findOne({ email: email.toLowerCase() });
    
    // Security: Always return same message to prevent email enumeration
    const successMessage = 'If that email exists in our system, a password reset link has been sent';
    
    if (!user) {
      logInfo(`Password reset requested for non-existent email: ${email}`);
      return res.status(200).json({ message: successMessage });
    }
    
    // Generate password reset token
    const resetToken = user.generatePasswordResetToken();
    await user.save({ validateBeforeSave: false }); // Save without validation
    
    // Create reset URL
    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;
    
    // Send password reset email
    try {
      await sendPasswordResetEmail({
        email: user.email,
        resetUrl,
        userName: user.userName,
      });
      
      logInfo(`✅ Password reset email sent to: ${user.email}`);
      
      res.status(200).json({ 
        message: successMessage,
        // In development, return token for testing (remove in production)
        ...(process.env.NODE_ENV === 'development' && { resetToken, resetUrl })
      });
    } catch (emailError) {
      // If email fails, clear the reset token
      user.resetPasswordToken = null;
      user.resetPasswordExpire = null;
      await user.save({ validateBeforeSave: false });
      
      logError('Error sending password reset email:', emailError);
      return res.status(500).json({ 
        message: 'Error sending password reset email. Please try again later.' 
      });
    }
  } catch (error) {
    logError('Forgot password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Reset Password with Token
 * 
 * @async
 * @function resetPassword
 * @route PUT /api/auth/reset-password/:token
 * @access Public
 * 
 * @param {Object} req - Express request object
 * @param {string} req.params.token - Reset token from email link
 * @param {Object} req.body - Request data
 * @param {string} req.body.password - New password
 * @param {Object} res - Express response object
 * 
 * @description
 * Resets user password using valid token:
 * 1. Validates token exists and hasn't expired
 * 2. Updates user password (automatically hashed)
 * 3. Clears reset token fields
 * 4. Logs user in with new JWT token
 * 
 * @example
 * PUT /api/auth/reset-password/abc123def456
 * Body: { password: "newPassword123" }
 * Response: { message: "Password reset successful", token: "jwt..." }
 */
export const resetPassword = async (req, res) => {
  try {
    const { password } = req.body;
    
    // Validate password provided
    if (!password) {
      return res.status(400).json({ message: 'Please provide a new password' });
    }
    
    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    
    // Hash the token from URL to compare with database
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');
    
    // Find user with valid token that hasn't expired
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }, // Token must be in the future
    });
    
    if (!user) {
      return res.status(400).json({ 
        message: 'Invalid or expired reset token. Please request a new password reset.' 
      });
    }
    
    // Update password (will be hashed by pre-save hook)
    user.password = password;
    
    // Clear reset token fields
    user.resetPasswordToken = null;
    user.resetPasswordExpire = null;
    
    // Save user
    await user.save();
    
    logInfo(`✅ Password reset successful for user: ${user.email}`);

    // Look up customerType for customer-role users
    let customerType = null;
    if (user.role === 'customer' && user.customerProfile) {
      const customerDoc = await Customer.findById(user.customerProfile).select('customerType');
      customerType = customerDoc?.customerType ?? null;
    }
    
    // Return success with login token — token is included inside user object so
    // login(response.data.user) in the frontend stores a fully-formed auth session
    res.status(200).json({
      message: 'Password reset successful! You are now logged in.',
      user: {
        _id: user._id,
        userName: user.userName,
        email: user.email,
        businessName: user.businessName,
        businessRegistrationNumber: user.businessRegistrationNumber,
        taxNumber: user.taxNumber,
        vatNumber: user.vatNumber,
        phoneNumber: user.phoneNumber,
        physicalAddress: user.physicalAddress,
        websiteAddress: user.websiteAddress,
        isSuperUser: user.isSuperUser,
        role: user.role,
        fieldServiceAgentProfile: user.fieldServiceAgentProfile || null,
        customerProfile: user.customerProfile || null,
        customerType: customerType,
        token: generateToken(user._id),
      },
    });
  } catch (error) {
    logError('Reset password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
