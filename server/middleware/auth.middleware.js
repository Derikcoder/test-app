/**
 * @file auth.middleware.js
 * @description JWT authentication middleware for protecting API routes
 * @module Middleware/Auth
 * 
 * Provides middleware to verify JWT tokens and protect routes from unauthorized access.
 * Extracts user information from valid tokens and attaches it to the request object.
 */

import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';

/**
 * Protect Route Middleware
 * 
 * @async
 * @function protect
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @description
 * Validates JWT token from Authorization header and authenticates user.
 * Expected header format: "Authorization: Bearer <token>"
 * 
 * Flow:
 * 1. Check for Authorization header with Bearer token
 * 2. Extract and verify JWT token
 * 3. Decode token to get user ID
 * 4. Fetch user from database (excluding password)
 * 5. Attach user to req.user for downstream use
 * 6. Call next() to continue to protected route
 * 
 * @throws {401} If no token provided
 * @throws {401} If token is invalid or expired
 * 
 * @example
 * // In route file
 * import { protect } from './middleware/auth.middleware.js';
 * router.get('/profile', protect, getUserProfile);
 */
export const protect = async (req, res, next) => {
  let token;

  // Check if Authorization header exists and starts with 'Bearer'
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Extract token from "Bearer <token>" format
      token = req.headers.authorization.split(' ')[1];

      if (!token) {
        return res.status(401).json({ message: 'Not authorized, token failed' });
      }

      // Verify token signature and decode payload
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', {
        algorithms: ['HS256'],
      });

      if (!decoded?.id) {
        return res.status(401).json({ message: 'Not authorized, token failed' });
      }

      // Fetch user from database using decoded ID, exclude password field
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, token failed' });
      }

      // Continue to next middleware or route handler
      return next();
    } catch (error) {
      // Token verification failed (invalid, expired, or malformed)
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  // No token provided in request
  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

/**
 * Role Authorization Middleware
 *
 * @function authorizeRoles
 * @param {...string} allowedRoles - Roles allowed to access the route
 * @returns {Function} Express middleware
 */
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized, no authenticated user' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: 'Forbidden. You do not have permission to perform this action.',
      });
    }

    next();
  };
};
