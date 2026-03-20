/**
 * @file auth.controller.test.js
 * @description Unit tests for auth controller
 */

import { 
  registerUser, 
  loginUser, 
  getUserProfile,
  updateUserProfile,
  forgotPassword,
  resetPassword,
  attachUserProfileLink,
  detachUserProfileLink,
  reassignUserProfileLink,
  listRegistrationOverrideAudits,
} from '../../../controllers/auth.controller.js';
import User from '../../../models/User.model.js';
import OnboardingPasskey from '../../../models/OnboardingPasskey.model.js';
import PasskeyRenewalRequest from '../../../models/PasskeyRenewalRequest.model.js';
import FieldServiceAgent from '../../../models/FieldServiceAgent.model.js';
import Customer from '../../../models/Customer.model.js';
import ProfileLinkAudit from '../../../models/ProfileLinkAudit.model.js';
import RegistrationOverrideAudit from '../../../models/RegistrationOverrideAudit.model.js';
import jwt from 'jsonwebtoken';
import * as emailService from '../../../utils/emailService.js';

// Mock User model, emailService, and logger
jest.mock('../../../models/User.model.js');
jest.mock('../../../models/OnboardingPasskey.model.js');
jest.mock('../../../models/PasskeyRenewalRequest.model.js');
jest.mock('../../../models/FieldServiceAgent.model.js');
jest.mock('../../../models/Customer.model.js');
jest.mock('../../../models/ProfileLinkAudit.model.js');
jest.mock('../../../models/RegistrationOverrideAudit.model.js');
jest.mock('../../../utils/emailService.js');
jest.mock('../../../middleware/logger.middleware.js', () => ({
  logError: jest.fn(),
  logInfo: jest.fn(),
}));

describe('Auth Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {},
      query: {},
      user: null,
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
    OnboardingPasskey.findOne = jest.fn();
    PasskeyRenewalRequest.findOne = jest.fn();
    FieldServiceAgent.findById = jest.fn();
    Customer.findById = jest.fn();
    ProfileLinkAudit.create = jest.fn();
    RegistrationOverrideAudit.create = jest.fn();
    RegistrationOverrideAudit.find = jest.fn();
    RegistrationOverrideAudit.countDocuments = jest.fn();
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
      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...validUserData,
          role: 'superAdmin',
          isSuperUser: true,
          fieldServiceAgentProfile: null,
          customerProfile: null,
        })
      );
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
        toObject: jest.fn().mockReturnValue({
          _id: '123',
          userName: 'testuser',
          email: 'test@example.com',
          businessName: 'Test Business',
        }),
      };

      req.user = { _id: '123' };
      User.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      await getUserProfile(req, res);

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
        select: jest.fn().mockResolvedValue(null),
      });

      await getUserProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
    });

    test('should handle server errors gracefully', async () => {
      req.user = { _id: '123' };

      User.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockRejectedValue(new Error('Database error')),
      });

      await getUserProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server error' });
    });
  });

  describe('updateUserProfile', () => {
    test('should allow first-time registration identifier capture for non-superAdmin', async () => {
      req.user = { _id: '123', role: 'businessAdministrator', isSuperUser: false };
      req.body = {
        businessRegistrationNumber: 'BRN-NEW-001',
        taxNumber: 'TAX-NEW-001',
      };

      const mockUser = {
        _id: '123',
        email: 'test@example.com',
        userName: 'testuser',
        businessName: 'Test Business',
        businessRegistrationNumber: '',
        taxNumber: '',
        vatNumber: '',
        phoneNumber: '+27123456789',
        physicalAddress: '123 Test Street',
        websiteAddress: '',
        isSuperUser: false,
        role: 'businessAdministrator',
        fieldServiceAgentProfile: null,
        customerProfile: null,
        isActive: true,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        save: jest.fn().mockResolvedValue({
          _id: '123',
          email: 'test@example.com',
          userName: 'testuser',
          businessName: 'Test Business',
          businessRegistrationNumber: 'BRN-NEW-001',
          taxNumber: 'TAX-NEW-001',
          vatNumber: '',
          phoneNumber: '+27123456789',
          physicalAddress: '123 Test Street',
          websiteAddress: '',
          isSuperUser: false,
          role: 'businessAdministrator',
          fieldServiceAgentProfile: null,
          customerProfile: null,
          isActive: true,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        }),
      };

      User.IMMUTABLE_FIELDS = ['userName', 'createdAt', '_id', 'isSuperUser', 'role'];
      User.findById = jest.fn().mockResolvedValue(mockUser);

      await updateUserProfile(req, res);

      expect(mockUser.businessRegistrationNumber).toBe('BRN-NEW-001');
      expect(mockUser.taxNumber).toBe('TAX-NEW-001');
      expect(mockUser.save).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        businessRegistrationNumber: 'BRN-NEW-001',
        taxNumber: 'TAX-NEW-001',
      }));
    });

    test('should block non-superAdmin from editing an existing registration identifier', async () => {
      req.user = { _id: '123', role: 'businessAdministrator', isSuperUser: false };
      req.body = {
        businessRegistrationNumber: 'BRN-CHANGED-002',
      };

      const mockUser = {
        _id: '123',
        businessRegistrationNumber: 'BRN-LOCKED-001',
        taxNumber: '',
        vatNumber: '',
      };

      User.IMMUTABLE_FIELDS = ['userName', 'createdAt', '_id', 'isSuperUser', 'role'];
      User.findById = jest.fn().mockResolvedValue(mockUser);

      await updateUserProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Registration identifiers cannot be edited after they are first saved',
        protectedFields: ['businessRegistrationNumber'],
      }));
    });

    test('should allow superAdmin to override existing registration identifiers', async () => {
      req.user = { _id: '123', role: 'superAdmin', isSuperUser: true };
      req.body = {
        vatNumber: 'VAT-UPDATED-999',
        registrationChangeEvidence: {
          legalDocumentType: 'Court Order',
          legalDocumentReference: 'LEGAL-REF-999',
          legalDocumentUri: 'https://legal-docs.example.com/order-999.pdf',
          legalChangeReason: 'Legal correction mandated after company registry reconciliation',
        },
      };

      const mockUser = {
        _id: '123',
        email: 'admin@example.com',
        userName: 'admin',
        businessName: 'Admin Business',
        businessRegistrationNumber: 'BRN-LOCKED-001',
        taxNumber: 'TAX-LOCKED-001',
        vatNumber: 'VAT-LOCKED-001',
        phoneNumber: '+27123450000',
        physicalAddress: 'Admin Street',
        websiteAddress: '',
        isSuperUser: true,
        role: 'superAdmin',
        fieldServiceAgentProfile: null,
        customerProfile: null,
        isActive: true,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        save: jest.fn().mockResolvedValue({
          _id: '123',
          email: 'admin@example.com',
          userName: 'admin',
          businessName: 'Admin Business',
          businessRegistrationNumber: 'BRN-LOCKED-001',
          taxNumber: 'TAX-LOCKED-001',
          vatNumber: 'VAT-UPDATED-999',
          phoneNumber: '+27123450000',
          physicalAddress: 'Admin Street',
          websiteAddress: '',
          isSuperUser: true,
          role: 'superAdmin',
          fieldServiceAgentProfile: null,
          customerProfile: null,
          isActive: true,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        }),
      };

      User.IMMUTABLE_FIELDS = ['userName', 'createdAt', '_id', 'isSuperUser', 'role'];
      User.findById = jest.fn().mockResolvedValue(mockUser);

      await updateUserProfile(req, res);

      expect(mockUser.vatNumber).toBe('VAT-UPDATED-999');
      expect(mockUser.save).toHaveBeenCalled();
      expect(RegistrationOverrideAudit.create).toHaveBeenCalledWith(expect.objectContaining({
        targetUser: '123',
        actingSuperAdmin: '123',
        overriddenFields: ['vatNumber'],
        legalEvidenceSnapshot: expect.objectContaining({
          legalDocumentType: 'Court Order',
          legalDocumentReference: 'LEGAL-REF-999',
          legalDocumentUri: 'https://legal-docs.example.com/order-999.pdf',
        }),
      }));
      expect(res.status).not.toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        vatNumber: 'VAT-UPDATED-999',
      }));
    });

    test('should reject superAdmin override when legal documentation evidence is missing', async () => {
      req.user = { _id: '123', role: 'superAdmin', isSuperUser: true };
      req.body = {
        taxNumber: 'TAX-UPDATED-777',
      };

      const mockUser = {
        _id: '123',
        businessRegistrationNumber: 'BRN-LOCKED-001',
        taxNumber: 'TAX-LOCKED-001',
        vatNumber: 'VAT-LOCKED-001',
      };

      User.IMMUTABLE_FIELDS = ['userName', 'createdAt', '_id', 'isSuperUser', 'role'];
      User.findById = jest.fn().mockResolvedValue(mockUser);

      await updateUserProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(RegistrationOverrideAudit.create).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Valid legal documentation is required to update existing registration identifiers',
      }));
    });

    test('should allow superAdmin override when valid legal documentation evidence is provided', async () => {
      req.user = { _id: '123', role: 'superAdmin', isSuperUser: true };
      req.body = {
        businessRegistrationNumber: 'BRN-UPDATED-111',
        registrationChangeEvidence: {
          legalDocumentType: 'CIPC Amendment Certificate',
          legalDocumentReference: 'CIPC-REF-12345',
          legalDocumentUri: 'https://legal-docs.example.com/cipc-12345.pdf',
          legalChangeReason: 'Court-supported correction for registration identifier mismatch',
        },
      };

      const mockUser = {
        _id: '123',
        email: 'admin@example.com',
        userName: 'admin',
        businessName: 'Admin Business',
        businessRegistrationNumber: 'BRN-LOCKED-001',
        taxNumber: 'TAX-LOCKED-001',
        vatNumber: 'VAT-LOCKED-001',
        phoneNumber: '+27123450000',
        physicalAddress: 'Admin Street',
        websiteAddress: '',
        isSuperUser: true,
        role: 'superAdmin',
        fieldServiceAgentProfile: null,
        customerProfile: null,
        isActive: true,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        save: jest.fn().mockResolvedValue({
          _id: '123',
          email: 'admin@example.com',
          userName: 'admin',
          businessName: 'Admin Business',
          businessRegistrationNumber: 'BRN-UPDATED-111',
          taxNumber: 'TAX-LOCKED-001',
          vatNumber: 'VAT-LOCKED-001',
          phoneNumber: '+27123450000',
          physicalAddress: 'Admin Street',
          websiteAddress: '',
          isSuperUser: true,
          role: 'superAdmin',
          fieldServiceAgentProfile: null,
          customerProfile: null,
          isActive: true,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        }),
      };

      User.IMMUTABLE_FIELDS = ['userName', 'createdAt', '_id', 'isSuperUser', 'role'];
      User.findById = jest.fn().mockResolvedValue(mockUser);

      await updateUserProfile(req, res);

      expect(mockUser.businessRegistrationNumber).toBe('BRN-UPDATED-111');
      expect(mockUser.save).toHaveBeenCalled();
      expect(RegistrationOverrideAudit.create).toHaveBeenCalledWith(expect.objectContaining({
        targetUser: '123',
        actingSuperAdmin: '123',
        overriddenFields: ['businessRegistrationNumber'],
        legalEvidenceSnapshot: expect.objectContaining({
          legalDocumentType: 'CIPC Amendment Certificate',
          legalDocumentReference: 'CIPC-REF-12345',
          legalDocumentUri: 'https://legal-docs.example.com/cipc-12345.pdf',
        }),
      }));
      expect(res.status).not.toHaveBeenCalledWith(400);
      expect(res.status).not.toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        businessRegistrationNumber: 'BRN-UPDATED-111',
      }));
    });
  });

  describe('listRegistrationOverrideAudits', () => {
    test('should return audit records with filters and pagination', async () => {
      req.query = {
        startDate: '2026-01-01T00:00:00.000Z',
        endDate: '2026-12-31T23:59:59.000Z',
        targetUser: 'user-123',
        documentReference: 'CIPC-REF',
        page: '2',
        limit: '5',
      };

      const mockRecords = [{ _id: 'audit-1' }];

      const lean = jest.fn().mockResolvedValue(mockRecords);
      const limit = jest.fn().mockReturnValue({ lean });
      const skip = jest.fn().mockReturnValue({ limit });
      const sort = jest.fn().mockReturnValue({ skip });

      RegistrationOverrideAudit.find = jest.fn().mockReturnValue({ sort });
      RegistrationOverrideAudit.countDocuments = jest.fn().mockResolvedValue(11);

      await listRegistrationOverrideAudits(req, res);

      expect(RegistrationOverrideAudit.find).toHaveBeenCalledWith(expect.objectContaining({
        targetUser: 'user-123',
        'legalEvidenceSnapshot.legalDocumentReference': {
          $regex: 'CIPC-REF',
          $options: 'i',
        },
        createdAt: expect.objectContaining({
          $gte: expect.any(Date),
          $lte: expect.any(Date),
        }),
      }));
      expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(skip).toHaveBeenCalledWith(5);
      expect(limit).toHaveBeenCalledWith(5);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        records: mockRecords,
        pagination: expect.objectContaining({
          page: 2,
          limit: 5,
          total: 11,
          totalPages: 3,
        }),
        filtersApplied: expect.objectContaining({
          targetUser: 'user-123',
          documentReference: 'CIPC-REF',
        }),
      }));
    });

    test('should return 400 for invalid date filter', async () => {
      req.query = {
        startDate: 'not-a-date',
      };

      await listRegistrationOverrideAudits(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid startDate. Use a valid ISO date.' });
      expect(RegistrationOverrideAudit.find).not.toHaveBeenCalled();
    });

    test('should handle server errors gracefully', async () => {
      const sort = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      RegistrationOverrideAudit.find = jest.fn().mockReturnValue({ sort });
      RegistrationOverrideAudit.countDocuments = jest.fn().mockResolvedValue(0);

      await listRegistrationOverrideAudits(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server error' });
    });
  });

  describe('forgotPassword', () => {
    test('should send password reset email to existing user', async () => {
      const mockUser = {
        _id: '123',
        email: 'test@example.com',
        userName: 'testuser',
        generatePasswordResetToken: jest.fn().mockReturnValue('mock-reset-token'),
        save: jest.fn().mockResolvedValue(true),
      };

      User.findOne = jest.fn().mockResolvedValue(mockUser);
      emailService.sendPasswordResetEmail = jest.fn().mockResolvedValue(true);

      req.body = { email: 'test@example.com' };
      req.protocol = 'http';
      req.get = jest.fn().mockReturnValue('localhost:5000');

      await forgotPassword(req, res);

      expect(User.findOne).toHaveBeenCalled();
      expect(mockUser.generatePasswordResetToken).toHaveBeenCalled();
      expect(mockUser.save).toHaveBeenCalled();
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('should return same success message for non-existent email', async () => {
      User.findOne = jest.fn().mockResolvedValue(null);

      req.body = { email: 'nonexistent@example.com' };
      req.protocol = 'http';
      req.get = jest.fn().mockReturnValue('localhost:5000');

      await forgotPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('should return error if email not provided', async () => {
      req.body = {};

      await forgotPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Please provide your email address',
        })
      );
    });
  });

  describe('resetPassword', () => {
    test('should reset password with valid token', async () => {
      const mockUser = {
        _id: '123',
        email: 'test@example.com',
        userName: 'testuser',
        password: 'oldpassword',
        resetPasswordToken: null,
        resetPasswordExpire: null,
        save: jest.fn().mockResolvedValue(true),
      };

      User.findOne = jest.fn().mockResolvedValue(mockUser);

      req.params = { token: 'valid-reset-token' };
      req.body = { password: 'newpassword123' };

      await resetPassword(req, res);

      expect(mockUser.password).toBe('newpassword123');
      expect(mockUser.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('should reject invalid token', async () => {
      User.findOne = jest.fn().mockResolvedValue(null);

      req.params = { token: 'invalid-token' };
      req.body = { password: 'newpassword123' };

      await resetPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid or expired reset token. Please request a new password reset.',
        })
      );
    });

    test('should validate minimum password length', async () => {
      req.params = { token: 'valid-token' };
      req.body = { password: '12345' };

      await resetPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Password must be at least 6 characters',
        })
      );
    });

    test('should return error if password not provided', async () => {
      req.params = { token: 'some-token' };
      req.body = {};

      await resetPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Please provide a new password',
        })
      );
    });
  });

  describe('attachUserProfileLink', () => {
    test('should attach fieldServiceAgent profile successfully', async () => {
      req.user = { _id: 'admin-1' };
      req.body = {
        userId: 'user-1',
        profileType: 'fieldServiceAgent',
        profileId: 'agent-1',
        reason: 'Correction by admin',
      };

      const mockUser = {
        _id: 'user-1',
        role: 'fieldServiceAgent',
        fieldServiceAgentProfile: null,
        save: jest.fn().mockResolvedValue(true),
      };

      const mockProfile = {
        _id: 'agent-1',
        userAccount: null,
        save: jest.fn().mockResolvedValue(true),
      };

      User.findById = jest.fn().mockResolvedValue(mockUser);
      FieldServiceAgent.findById = jest.fn().mockResolvedValue(mockProfile);
      ProfileLinkAudit.create = jest.fn().mockResolvedValue({ _id: 'audit-1' });

      await attachUserProfileLink(req, res);

      expect(User.findById).toHaveBeenCalledWith('user-1');
      expect(FieldServiceAgent.findById).toHaveBeenCalledWith('agent-1');
      expect(mockUser.fieldServiceAgentProfile).toBe('agent-1');
      expect(mockProfile.userAccount).toBe('user-1');
      expect(ProfileLinkAudit.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'attach',
          profileType: 'fieldServiceAgent',
          principalUser: 'user-1',
          previousProfile: null,
          newProfile: 'agent-1',
          performedBy: 'admin-1',
        })
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('should reject attach on role mismatch', async () => {
      req.user = { _id: 'admin-1' };
      req.body = {
        userId: 'user-1',
        profileType: 'fieldServiceAgent',
        profileId: 'agent-1',
      };

      User.findById = jest.fn().mockResolvedValue({
        _id: 'user-1',
        role: 'customer',
        fieldServiceAgentProfile: null,
      });

      await attachUserProfileLink(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('require user role fieldServiceAgent'),
        })
      );
    });

    test('should return conflict when profile already linked to another user', async () => {
      req.user = { _id: 'admin-1' };
      req.body = {
        userId: 'user-1',
        profileType: 'customer',
        profileId: 'cust-1',
      };

      User.findById = jest.fn().mockResolvedValue({
        _id: 'user-1',
        role: 'customer',
        customerProfile: null,
      });

      Customer.findById = jest.fn().mockResolvedValue({
        _id: 'cust-1',
        userAccount: 'other-user',
      });

      await attachUserProfileLink(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('already linked to another user'),
        })
      );
    });
  });

  describe('detachUserProfileLink', () => {
    test('should detach customer profile successfully', async () => {
      req.user = { _id: 'admin-1' };
      req.body = {
        userId: 'user-2',
        profileType: 'customer',
        reason: 'Unlink duplicate account',
      };

      const mockUser = {
        _id: 'user-2',
        customerProfile: 'cust-2',
        save: jest.fn().mockResolvedValue(true),
      };

      const mockProfile = {
        _id: 'cust-2',
        userAccount: { toString: () => 'user-2' },
        save: jest.fn().mockResolvedValue(true),
      };

      User.findById = jest.fn().mockResolvedValue(mockUser);
      Customer.findById = jest.fn().mockResolvedValue(mockProfile);
      ProfileLinkAudit.create = jest.fn().mockResolvedValue({ _id: 'audit-2' });

      await detachUserProfileLink(req, res);

      expect(mockUser.customerProfile).toBeNull();
      expect(mockProfile.userAccount).toBeNull();
      expect(ProfileLinkAudit.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'detach',
          profileType: 'customer',
          principalUser: 'user-2',
          previousProfile: 'cust-2',
          newProfile: null,
          performedBy: 'admin-1',
        })
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('should return already-linked edge case when no profile exists to detach', async () => {
      req.user = { _id: 'admin-1' };
      req.body = {
        userId: 'user-2',
        profileType: 'customer',
      };

      User.findById = jest.fn().mockResolvedValue({
        _id: 'user-2',
        customerProfile: null,
      });

      await detachUserProfileLink(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('No customer profile is linked'),
        })
      );
    });
  });

  describe('reassignUserProfileLink', () => {
    test('should reassign fieldServiceAgent profile successfully', async () => {
      req.user = { _id: 'admin-1' };
      req.body = {
        userId: 'user-3',
        profileType: 'fieldServiceAgent',
        newProfileId: 'agent-new',
        reason: 'Corrected wrong profile mapping',
      };

      const mockUser = {
        _id: 'user-3',
        role: 'fieldServiceAgent',
        fieldServiceAgentProfile: 'agent-old',
        save: jest.fn().mockResolvedValue(true),
      };

      const oldProfile = {
        _id: 'agent-old',
        userAccount: { toString: () => 'user-3' },
        save: jest.fn().mockResolvedValue(true),
      };

      const newProfile = {
        _id: 'agent-new',
        userAccount: null,
        save: jest.fn().mockResolvedValue(true),
      };

      User.findById = jest.fn().mockResolvedValue(mockUser);
      FieldServiceAgent.findById = jest
        .fn()
        .mockResolvedValueOnce(newProfile)
        .mockResolvedValueOnce(oldProfile);
      ProfileLinkAudit.create = jest.fn().mockResolvedValue({ _id: 'audit-3' });

      await reassignUserProfileLink(req, res);

      expect(oldProfile.userAccount).toBeNull();
      expect(mockUser.fieldServiceAgentProfile).toBe('agent-new');
      expect(newProfile.userAccount).toBe('user-3');
      expect(ProfileLinkAudit.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'reassign',
          profileType: 'fieldServiceAgent',
          principalUser: 'user-3',
          previousProfile: 'agent-old',
          newProfile: 'agent-new',
          performedBy: 'admin-1',
        })
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('should return role mismatch for reassign', async () => {
      req.user = { _id: 'admin-1' };
      req.body = {
        userId: 'user-3',
        profileType: 'fieldServiceAgent',
        newProfileId: 'agent-new',
      };

      User.findById = jest.fn().mockResolvedValue({
        _id: 'user-3',
        role: 'customer',
        fieldServiceAgentProfile: { toString: () => 'agent-old' },
      });

      await reassignUserProfileLink(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('require user role fieldServiceAgent'),
        })
      );
    });

    test('should return conflict when new profile is already linked to another user', async () => {
      req.user = { _id: 'admin-1' };
      req.body = {
        userId: 'user-3',
        profileType: 'fieldServiceAgent',
        newProfileId: 'agent-new',
      };

      User.findById = jest.fn().mockResolvedValue({
        _id: 'user-3',
        role: 'fieldServiceAgent',
        fieldServiceAgentProfile: { toString: () => 'agent-old' },
      });

      FieldServiceAgent.findById = jest.fn().mockResolvedValue({
        _id: 'agent-new',
        userAccount: { toString: () => 'other-user' },
      });

      await reassignUserProfileLink(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('already linked to another user'),
        })
      );
    });

    test('should return already-linked edge case when reassign target matches current link', async () => {
      req.user = { _id: 'admin-1' };
      req.body = {
        userId: 'user-3',
        profileType: 'fieldServiceAgent',
        newProfileId: 'agent-current',
      };

      User.findById = jest.fn().mockResolvedValue({
        _id: 'user-3',
        role: 'fieldServiceAgent',
        fieldServiceAgentProfile: { toString: () => 'agent-current' },
      });

      await reassignUserProfileLink(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User is already linked to the requested profile',
        })
      );
    });
  });
});
