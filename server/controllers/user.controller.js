/**
 * @file user.controller.js
 * @description User management controller functions
 */

import User from '../models/User.model.js';
import { logError } from '../middleware/logger.middleware.js';

const ADMIN_ROLES = ['superAdmin', 'businessAdministrator'];

const canReadAnyUser = (role) => ADMIN_ROLES.includes(role);

// @desc    Get all users
// @route   GET /api/users
// @access  Private (superAdmin, businessAdministrator)
export const getUsers = async (req, res) => {
  try {
    if (!canReadAnyUser(req.user?.role)) {
      return res.status(403).json({ message: 'Forbidden. You do not have permission to perform this action.' });
    }

    const users = await User.find({})
      .select('-password')
      .sort({ createdAt: -1 });

    return res.json(users);
  } catch (error) {
    logError('Get users error:', error);
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Get single user by ID
// @route   GET /api/users/:id
// @access  Private (self, superAdmin, businessAdministrator)
export const getUserById = async (req, res) => {
  try {
    const requestedUserId = String(req.params.id || '');
    const requesterUserId = String(req.user?._id || '');
    const requesterRole = req.user?.role;

    if (!requestedUserId) {
      return res.status(400).json({ message: 'User id is required' });
    }

    if (!canReadAnyUser(requesterRole) && requestedUserId !== requesterUserId) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = await User.findOne({ _id: requestedUserId }).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json(user);
  } catch (error) {
    logError('Get user by id error:', error);
    return res.status(500).json({ message: error.message });
  }
};
