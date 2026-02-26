/**
 * @file auth.controller.test.js
 * @description Unit tests for auth controller
 */

import { registerUser, loginUser, getUserProfile } from '../../../controllers/auth.controller.js';
import User from '../../../models/User.model.js';
import jwt from 'jsonwebtoken';

// Mock User model and logger
jest.mock('../../../models/User.model.js');
jest.mock('../../../middleware/logger.middleware.js', () => ({
  logError: jest.fn(),
  logInfo: jest.fn(),
}));

describe('Auth Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {},
      user: null,
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  describe('registerUser', () => {
    const validUserData = {
      userName: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      businessName: 'Test Business',
      businessRegistrationNumber: 'BRN123456',
      taxNumber: 'TAX123456',
      vatNumber: 'VAT123456',
      phoneNumber: '+27123456789',
      physicalAddress: '123 Test Street',
      websiteAddress: 'https://test.com',
    };

    test('should register a new user with valid data', async () => {
      req.body = validUserData;

      const mockUser = {
        _id: '123',
        ...validUserData,
        isSuperUser: true,
        isActive: true,
      };

      User.findOne = jest.fn().mockResolvedValue(null);
      User.create = jest.fn().mockResolvedValue(mockUser);

      await registerUser(req, res);

      expect(User.findOne).toHaveBeenCalledWith({
        $or: [{ email: validUserData.email }, { userName: validUserData.userName }],
      });
      expect(User.create).toHaveBeenCalledWith({
        ...validUserData,
        isSuperUser: true,
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: '123',
          userName: validUserData.userName,
          email: validUserData.email,
          token: expect.any(String),
        })
      );
    });

    test('should return 400 when required fields are missing', async () => {
      req.body = {
        userName: 'testuser',
        email: 'test@example.com',
        // missing other required fields
      };

      await registerUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Please fill in all required fields' });
      expect(User.create).not.toHaveBeenCalled();
    });

    test('should return 400 when email already exists', async () => {
      req.body = validUserData;

      const existingUser = {
        _id: '456',
        email: validUserData.email,
        userName: 'differentuser',
      };

      User.findOne = jest.fn().mockResolvedValue(existingUser);

      await registerUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Email already registered' });
      expect(User.create).not.toHaveBeenCalled();
    });

    test('should return 400 when username already exists', async () => {
      req.body = validUserData;

      const existingUser = {
        _id: '456',
        email: 'different@example.com',
        userName: validUserData.userName,
      };

      User.findOne = jest.fn().mockResolvedValue(existingUser);

      await registerUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Username already taken' });
      expect(User.create).not.toHaveBeenCalled();
    });

    test('should handle server errors gracefully', async () => {
      req.body = validUserData;

      User.findOne = jest.fn().mockRejectedValue(new Error('Database error'));

      await registerUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server error' });
    });
  });

  describe('loginUser', () => {
    test('should login user with correct credentials', async () => {
      req.body = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockUser = {
        _id: '123',
        email: 'test@example.com',
        userName: 'testuser',
        comparePassword: jest.fn().mockResolvedValue(true),
      };

      User.findOne = jest.fn().mockResolvedValue(mockUser);

      await loginUser(req, res);

      expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(mockUser.comparePassword).toHaveBeenCalledWith('password123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: '123',
          email: 'test@example.com',
          token: expect.any(String),
        })
      );
    });

    test('should return 401 with incorrect password', async () => {
      req.body = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const mockUser = {
        _id: '123',
        email: 'test@example.com',
        comparePassword: jest.fn().mockResolvedValue(false),
      };

      User.findOne = jest.fn().mockResolvedValue(mockUser);

      await loginUser(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid email or password' });
    });

    test('should return 401 with non-existent email', async () => {
      req.body = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      User.findOne = jest.fn().mockResolvedValue(null);

      await loginUser(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid email or password' });
    });

    test('should return 400 when email is missing', async () => {
      req.body = {
        password: 'password123',
      };

      await loginUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Please provide email and password' });
      expect(User.findOne).not.toHaveBeenCalled();
    });

    test('should return 400 when password is missing', async () => {
      req.body = {
        email: 'test@example.com',
      };

      await loginUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Please provide email and password' });
      expect(User.findOne).not.toHaveBeenCalled();
    });

    test('should handle server errors gracefully', async () => {
      req.body = {
        email: 'test@example.com',
        password: 'password123',
      };

      User.findOne = jest.fn().mockRejectedValue(new Error('Database error'));

      await loginUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server error' });
    });

    test('should convert email to lowercase before searching', async () => {
      req.body = {
        email: 'TEST@EXAMPLE.COM',
        password: 'password123',
      };

      const mockUser = {
        _id: '123',
        email: 'test@example.com',
        comparePassword: jest.fn().mockResolvedValue(true),
      };

      User.findOne = jest.fn().mockResolvedValue(mockUser);

      await loginUser(req, res);

      // Email should be converted to lowercase before query
      expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
    });
  });

  describe('getUserProfile', () => {
    test('should return user profile when authenticated', async () => {
      const mockUser = {
        _id: '123',
        userName: 'testuser',
        email: 'test@example.com',
        businessName: 'Test Business',
        populate: jest.fn().mockResolvedValue({
          _id: '123',
          userName: 'testuser',
          email: 'test@example.com',
          businessName: 'Test Business',
        }),
      };

      req.user = mockUser;
      User.findById = jest.fn().mockReturnValue(mockUser);

      await getUserProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: '123',
          userName: 'testuser',
          email: 'test@example.com',
        })
      );
    });

    test('should return 404 when user not found', async () => {
      req.user = { _id: 'nonexistent' };

      User.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });

      await getUserProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
    });

    test('should handle server errors gracefully', async () => {
      req.user = { _id: '123' };

      User.findById = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      await getUserProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server error' });
    });
  });
});
