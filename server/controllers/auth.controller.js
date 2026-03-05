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
import { logError, logInfo } from '../middleware/logger.middleware.js';
import { sendPasswordResetEmail } from '../utils/emailService.js';

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
    } = req.body;

    // Validate all required fields are present
    if (
      !userName ||
      !email ||
      !password ||
      !businessName ||
      !businessRegistrationNumber ||
      !taxNumber ||
      !vatNumber ||
      !phoneNumber ||
      !physicalAddress
    ) {
      logError('Registration failed - Missing required fields', { email, userName });
      return res.status(400).json({ message: 'Please fill in all required fields' });
    }

    // Check if user already exists by email or username
    const userExists = await User.findOne({ $or: [{ email }, { userName }] });

    if (userExists) {
      logError('Registration failed - User already exists', { email, userName });
      return res.status(400).json({
        message: userExists.email === email ? 'Email already registered' : 'Username already taken',
      });
    }

    // Create new user (password will be hashed automatically)
    const user = await User.create({
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
      isSuperUser: true,
    });

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
 * Blocks attempts to modify protected fields (userName, businessRegistrationNumber, etc.).
 * 
 * Protected Fields (Cannot Update):
 * - userName
 * - businessName
 * - businessRegistrationNumber
 * - createdAt
 * - _id
 * - isSuperUser
 * 
 * Editable Fields (Can Update):
 * - email
 * - password (with validation)
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

    /**
     * Field-Level Permission Check
     * Detect if client is attempting to update any immutable fields
     * Compares requested field values against current user data
     */
    const attemptedImmutableUpdates = User.IMMUTABLE_FIELDS.filter(
      field => req.body[field] !== undefined && req.body[field] !== user[field]
    );

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

    /**
     * Update Editable Fields
     * Only apply updates if field is present in request body
     * Uses conditional checks to avoid overwriting with undefined
     */
    if (req.body.email !== undefined) user.email = req.body.email;
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
      return res.json({ message: successMessage });
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
      
      res.json({ 
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
    
    // Return success with login token
    res.json({
      message: 'Password reset successful! You are now logged in.',
      token: generateToken(user._id),
      user: {
        _id: user._id,
        userName: user.userName,
        email: user.email,
        businessName: user.businessName,
      }
    });
  } catch (error) {
    logError('Reset password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
