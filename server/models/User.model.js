/**
 * @file User.model.js
 * @description Mongoose schema for SuperUser (business owner) accounts
 * @module Models/User
 * 
 * Defines the data structure and validation rules for business owners/super users.
 * Implements field-level permissions to protect critical business identifiers.
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

/**
 * User Schema Definition
 * 
 * @description
 * Represents a business owner/super user account with complete business details.
 * Includes authentication, validation, and field protection.
 * 
 * Key Features:
 * - Password hashing with bcrypt
 * - Email validation with regex
 * - Immutable fields (userName, businessName, registrationNumber)
 * - Timestamp tracking (createdAt, updatedAt)
 */
const userSchema = new mongoose.Schema(
  {
    /** Unique username - Cannot be changed after registration */
    userName: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      immutable: true, // Prevents updates after creation
    },
    /** Email address - Used for login and communication */
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true, // Automatically convert to lowercase
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'], // Regex validation
    },
    /** Password - Automatically hashed before saving */
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
    },
    /** Business name - Cannot be changed after registration */
    businessName: {
      type: String,
      required: [true, 'Business name is required'],
      trim: true,
      immutable: true,
    },
    /** Business registration number - Legal identifier, cannot be changed */
    businessRegistrationNumber: {
      type: String,
      required: [true, 'Business registration number is required'],
      trim: true,
      immutable: true,
    },
    /** Tax number - Required for tax compliance */
    taxNumber: {
      type: String,
      required: [true, 'Tax number is required'],
      trim: true,
    },
    /** VAT number - Required for VAT compliance */
    vatNumber: {
      type: String,
      required: [true, 'VAT number is required'],
      trim: true,
    },
    /** Primary contact phone number */
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    /** Physical business address */
    physicalAddress: {
      type: String,
      required: [true, 'Physical address is required'],
      trim: true,
    },
    /** Optional business website URL */
    websiteAddress: {
      type: String,
      trim: true,
      default: '',
    },
    /** Flag indicating super user privileges */
    isSuperUser: {
      type: Boolean,
      default: true,
    },
    /** User role for admin functionality - Determines access level and permissions */
    role: {
      type: String,
      enum: ['superAdmin', 'businessAdministrator'],
      default: 'businessAdministrator',
      required: [true, 'Role is required'],
    },
    /** Account active status */
    isActive: {
      type: Boolean,
      default: true,
    },
    /** Password reset token - Generated when user requests password reset */
    resetPasswordToken: {
      type: String,
      default: null,
    },
    /** Password reset token expiry - Token valid for 1 hour */
    resetPasswordExpire: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

/**
 * Pre-save Middleware: Password Hashing
 * 
 * @description
 * Automatically hashes the password before saving to database.
 * Only runs if password field has been modified.
 * Uses bcrypt with 10 salt rounds for strong security.
 * 
 * @fires userSchema#pre('save')
 */
userSchema.pre('save', async function (next) {
  // Skip hashing if password wasn't modified (e.g., updating other fields)
  if (!this.isModified('password')) {
    return next();
  }
  
  // Generate salt and hash password
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

/**
 * Instance Method: Compare Password
 * 
 * @method comparePassword
 * @param {string} enteredPassword - Plain text password to compare
 * @returns {Promise<boolean>} True if password matches, false otherwise
 * 
 * @description
 * Compares a plain text password with the hashed password in database.
 * Used during login to verify user credentials.
 * 
 * @example
 * const isMatch = await user.comparePassword('password123');
 * if (isMatch) { // Login successful }
 */
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

/**
 * Instance Method: Generate Password Reset Token
 * 
 * @method generatePasswordResetToken
 * @returns {string} Plain text reset token (to be sent via email)
 * 
 * @description
 * Generates a secure random token for password reset.
 * Stores hashed version in database with 1-hour expiry.
 * Returns plain text token to be sent via email.
 * 
 * @example
 * const resetToken = user.generatePasswordResetToken();
 * await user.save();
 * // Send resetToken via email
 */
userSchema.methods.generatePasswordResetToken = function () {
  // Generate random token (32 bytes = 64 hex characters)
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  // Hash token and store in database
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  // Set expiry to 1 hour from now
  this.resetPasswordExpire = Date.now() + 60 * 60 * 1000; // 1 hour
  
  // Return unhashed token to be sent via email
  return resetToken;
};

/**
 * Static Property: Immutable Fields
 * 
 * @description
 * Array of field names that cannot be updated after user creation.
 * Used by controllers to enforce field-level permissions.
 * Protects critical business identifiers from accidental modification.
 */
userSchema.statics.IMMUTABLE_FIELDS = [
  'userName',
  'businessName',
  'businessRegistrationNumber',
  'createdAt',
  '_id',
  'isSuperUser', // Protect super user status from manipulation
  'role', // Protect user role from modification (only admin can change)
];

/**
 * Static Property: Editable Fields
 * 
 * @description
 * Array of field names that can be safely updated by users.
 * Used by controllers to whitelist allowed update operations.
 */
userSchema.statics.EDITABLE_FIELDS = [
  'email',
  'password',
  'taxNumber',
  'vatNumber',
  'phoneNumber',
  'physicalAddress',
  'websiteAddress',
  'isActive'
];

// Create and export the User model
const User = mongoose.model('User', userSchema);

export default User;
