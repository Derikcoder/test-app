/**
 * @file auth.middleware.test.js
 * @description Unit tests for JWT authentication middleware
 */

import jwt from 'jsonwebtoken';
import { protect } from '../../../middleware/auth.middleware.js';
import User from '../../../models/User.model.js';

// Mock User model
jest.mock('../../../models/User.model.js');

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    // Reset mocks before each test
    req = {
      headers: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('protect middleware', () => {
    test('should call next() with valid token', async () => {
      const mockUser = {
        _id: '123',
        userName: 'testuser',
        email: 'test@example.com',
      };

      // Mock token
      const token = jwt.sign({ id: '123' }, process.env.JWT_SECRET || 'test-jwt-secret-key');
      req.headers.authorization = `Bearer ${token}`;

      // Mock User.findById to return mock user
      User.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      await protect(req, res, next);

      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should return 401 when no token provided', async () => {
      // No Authorization header
      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Not authorized, no token' });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 401 when Authorization header does not start with Bearer', async () => {
      req.headers.authorization = 'InvalidFormat token123';

      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Not authorized, no token' });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 401 with invalid token', async () => {
      req.headers.authorization = 'Bearer invalid-token';

      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Not authorized, token failed' });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 401 with expired token', async () => {
      // Create an expired token (exp in the past)
      const expiredToken = jwt.sign(
        { id: '123', exp: Math.floor(Date.now() / 1000) - 3600 },
        process.env.JWT_SECRET || 'test-jwt-secret-key'
      );
      req.headers.authorization = `Bearer ${expiredToken}`;

      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Not authorized, token failed' });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 401 when user not found in database', async () => {
      const token = jwt.sign({ id: 'nonexistent' }, process.env.JWT_SECRET || 'test-jwt-secret-key');
      req.headers.authorization = `Bearer ${token}`;

      // Mock User.findById to return null (user not found)
      User.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      await protect(req, res, next);

      expect(req.user).toBeNull();
      expect(next).toHaveBeenCalled();
    });

    test('should exclude password field from user object', async () => {
      const mockUserWithPassword = {
        _id: '123',
        userName: 'testuser',
        email: 'test@example.com',
        password: 'hashed-password',
      };

      const mockUserWithoutPassword = {
        _id: '123',
        userName: 'testuser',
        email: 'test@example.com',
      };

      const token = jwt.sign({ id: '123' }, process.env.JWT_SECRET || 'test-jwt-secret-key');
      req.headers.authorization = `Bearer ${token}`;

      // Mock User.findById with .select to exclude password
      const selectMock = jest.fn().mockResolvedValue(mockUserWithoutPassword);
      User.findById = jest.fn().mockReturnValue({
        select: selectMock,
      });

      await protect(req, res, next);

      expect(selectMock).toHaveBeenCalledWith('-password');
      expect(req.user).toEqual(mockUserWithoutPassword);
      expect(req.user.password).toBeUndefined();
    });

    test('should handle malformed Authorization header', async () => {
      req.headers.authorization = 'Bearer';

      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    test('should handle token with wrong secret', async () => {
      // Create token with different secret
      const token = jwt.sign({ id: '123' }, 'wrong-secret-key');
      req.headers.authorization = `Bearer ${token}`;

      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Not authorized, token failed' });
      expect(next).not.toHaveBeenCalled();
    });
  });
});
