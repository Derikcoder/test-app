import User from '../models/User.model.js';
import jwt from 'jsonwebtoken';
import { logError, logInfo } from '../middleware/logger.middleware.js';

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: '30d',
  });
};

// @desc    Register a new super user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res) => {
  try {
    logInfo(`Registration attempt for email: ${req.body.email}`);
    
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

    // Validate required fields
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

    // Check if user already exists
    const userExists = await User.findOne({ $or: [{ email }, { userName }] });

    if (userExists) {
      logError('Registration failed - User already exists', { email, userName });
      return res.status(400).json({
        message: userExists.email === email ? 'Email already registered' : 'Username already taken',
      });
    }

    // Create user
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
    res.status(500).json({ 
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res) => {
  try {
    logInfo(`Login attempt for email: ${req.body.email}`);
    
    const { email, password } = req.body;

    if (!email || !password) {
      logError('Login failed - Missing credentials');
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // Find user by email
    const user = await User.findOne({ email });

    if (user && (await user.comparePassword(password))) {
      logInfo(`✅ User logged in successfully: ${user.email}`);
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
      logError('Login failed - Invalid credentials', { email });
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    logError('Login error:', error);
    res.status(500).json({ 
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');

    if (user) {
      res.json({
        ...user.toObject(),
        editableFields: User.EDITABLE_FIELDS,
        protectedFields: User.IMMUTABLE_FIELDS,
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get field permissions info
// @route   GET /api/auth/field-permissions
// @access  Private
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

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
// @note    Cannot update: userName, businessName, businessRegistrationNumber, createdAt
export const updateUserProfile = async (req, res) => {
  try {
    logInfo(`Profile update attempt for user: ${req.user._id}`);
    
    const user = await User.findById(req.user._id);

    if (!user) {
      logError('Profile update failed - User not found', { userId: req.user._id });
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if trying to update immutable fields
    const attemptedImmutableUpdates = User.IMMUTABLE_FIELDS.filter(
      field => req.body[field] !== undefined && req.body[field] !== user[field]
    );

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

    // Update only editable fields
    if (req.body.email !== undefined) user.email = req.body.email;
    if (req.body.taxNumber !== undefined) user.taxNumber = req.body.taxNumber;
    if (req.body.vatNumber !== undefined) user.vatNumber = req.body.vatNumber;
    if (req.body.phoneNumber !== undefined) user.phoneNumber = req.body.phoneNumber;
    if (req.body.physicalAddress !== undefined) user.physicalAddress = req.body.physicalAddress;
    if (req.body.websiteAddress !== undefined) user.websiteAddress = req.body.websiteAddress;
    if (req.body.isActive !== undefined) user.isActive = req.body.isActive;
    
    // Password requires special handling
    if (req.body.password) {
      if (req.body.password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
      }
      user.password = req.body.password;
    }

    const updatedUser = await user.save();
    
    logInfo(`✅ Profile updated successfully for user: ${updatedUser.email}`);

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
      token: generateToken(updatedUser._id),
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
