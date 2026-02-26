/**
 * @file User.model.test.js
 * @description Unit tests for User model
 */

import mongoose from 'mongoose';
import User from '../../../models/User.model.js';

describe('User Model', () => {
  // Setup: Connect to MongoDB before all tests
  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/test-app-test';
    await mongoose.connect(mongoUri);
  });

  // Cleanup: Clear database after each test
  afterEach(async () => {
    await User.deleteMany({});
  });

  // Teardown: Close connection after all tests
  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('Schema Validation', () => {
    test('should create a valid user with all required fields', async () => {
      const validUser = {
        userName: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        businessName: 'Test Business',
        businessRegistrationNumber: 'BRN123456',
        taxNumber: 'TAX123456',
        vatNumber: 'VAT123456',
        phoneNumber: '+27123456789',
        physicalAddress: '123 Test Street, Test City',
      };

      const user = new User(validUser);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.userName).toBe(validUser.userName);
      expect(savedUser.email).toBe(validUser.email);
      expect(savedUser.businessName).toBe(validUser.businessName);
      expect(savedUser.isSuperUser).toBe(true);
      expect(savedUser.isActive).toBe(true);
    });

    test('should fail without required userName', async () => {
      const userWithoutUserName = new User({
        email: 'test@example.com',
        password: 'password123',
        businessName: 'Test Business',
        businessRegistrationNumber: 'BRN123456',
        taxNumber: 'TAX123456',
        vatNumber: 'VAT123456',
        phoneNumber: '+27123456789',
        physicalAddress: '123 Test Street',
      });

      await expect(userWithoutUserName.save()).rejects.toThrow();
    });

    test('should fail without required email', async () => {
      const userWithoutEmail = new User({
        userName: 'testuser',
        password: 'password123',
        businessName: 'Test Business',
        businessRegistrationNumber: 'BRN123456',
        taxNumber: 'TAX123456',
        vatNumber: 'VAT123456',
        phoneNumber: '+27123456789',
        physicalAddress: '123 Test Street',
      });

      await expect(userWithoutEmail.save()).rejects.toThrow();
    });

    test('should fail with invalid email format', async () => {
      const userWithInvalidEmail = new User({
        userName: 'testuser',
        email: 'invalid-email',
        password: 'password123',
        businessName: 'Test Business',
        businessRegistrationNumber: 'BRN123456',
        taxNumber: 'TAX123456',
        vatNumber: 'VAT123456',
        phoneNumber: '+27123456789',
        physicalAddress: '123 Test Street',
      });

      await expect(userWithInvalidEmail.save()).rejects.toThrow();
    });

    test('should fail with password shorter than 6 characters', async () => {
      const userWithShortPassword = new User({
        userName: 'testuser',
        email: 'test@example.com',
        password: '12345',
        businessName: 'Test Business',
        businessRegistrationNumber: 'BRN123456',
        taxNumber: 'TAX123456',
        vatNumber: 'VAT123456',
        phoneNumber: '+27123456789',
        physicalAddress: '123 Test Street',
      });

      await expect(userWithShortPassword.save()).rejects.toThrow();
    });

    test('should convert email to lowercase', async () => {
      const user = new User({
        userName: 'testuser',
        email: 'TEST@EXAMPLE.COM',
        password: 'password123',
        businessName: 'Test Business',
        businessRegistrationNumber: 'BRN123456',
        taxNumber: 'TAX123456',
        vatNumber: 'VAT123456',
        phoneNumber: '+27123456789',
        physicalAddress: '123 Test Street',
      });

      const savedUser = await user.save();
      expect(savedUser.email).toBe('test@example.com');
    });

    test('should trim whitespace from fields', async () => {
      const user = new User({
        userName: '  testuser  ',
        email: '  test@example.com  ',
        password: 'password123',
        businessName: '  Test Business  ',
        businessRegistrationNumber: '  BRN123456  ',
        taxNumber: '  TAX123456  ',
        vatNumber: '  VAT123456  ',
        phoneNumber: '  +27123456789  ',
        physicalAddress: '  123 Test Street  ',
      });

      const savedUser = await user.save();
      expect(savedUser.userName).toBe('testuser');
      expect(savedUser.email).toBe('test@example.com');
      expect(savedUser.businessName).toBe('Test Business');
    });
  });

  describe('Password Hashing', () => {
    test('should hash password before saving', async () => {
      const plainPassword = 'password123';
      const user = new User({
        userName: 'testuser',
        email: 'test@example.com',
        password: plainPassword,
        businessName: 'Test Business',
        businessRegistrationNumber: 'BRN123456',
        taxNumber: 'TAX123456',
        vatNumber: 'VAT123456',
        phoneNumber: '+27123456789',
        physicalAddress: '123 Test Street',
      });

      const savedUser = await user.save();
      
      // Password should be hashed (not equal to plain text)
      expect(savedUser.password).not.toBe(plainPassword);
      // Hashed password should be longer than plain text
      expect(savedUser.password.length).toBeGreaterThan(plainPassword.length);
    });

    test('should not rehash password if not modified', async () => {
      const user = new User({
        userName: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        businessName: 'Test Business',
        businessRegistrationNumber: 'BRN123456',
        taxNumber: 'TAX123456',
        vatNumber: 'VAT123456',
        phoneNumber: '+27123456789',
        physicalAddress: '123 Test Street',
      });

      const savedUser = await user.save();
      const originalHash = savedUser.password;

      // Update non-password field
      savedUser.phoneNumber = '+27987654321';
      await savedUser.save();

      // Password hash should remain the same
      expect(savedUser.password).toBe(originalHash);
    });
  });

  describe('comparePassword Method', () => {
    test('should return true for correct password', async () => {
      const plainPassword = 'password123';
      const user = new User({
        userName: 'testuser',
        email: 'test@example.com',
        password: plainPassword,
        businessName: 'Test Business',
        businessRegistrationNumber: 'BRN123456',
        taxNumber: 'TAX123456',
        vatNumber: 'VAT123456',
        phoneNumber: '+27123456789',
        physicalAddress: '123 Test Street',
      });

      const savedUser = await user.save();
      const isMatch = await savedUser.comparePassword(plainPassword);

      expect(isMatch).toBe(true);
    });

    test('should return false for incorrect password', async () => {
      const plainPassword = 'password123';
      const user = new User({
        userName: 'testuser',
        email: 'test@example.com',
        password: plainPassword,
        businessName: 'Test Business',
        businessRegistrationNumber: 'BRN123456',
        taxNumber: 'TAX123456',
        vatNumber: 'VAT123456',
        phoneNumber: '+27123456789',
        physicalAddress: '123 Test Street',
      });

      const savedUser = await user.save();
      const isMatch = await savedUser.comparePassword('wrongpassword');

      expect(isMatch).toBe(false);
    });
  });

  describe('Immutable Fields', () => {
    test('should have immutable userName', async () => {
      const user = new User({
        userName: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        businessName: 'Test Business',
        businessRegistrationNumber: 'BRN123456',
        taxNumber: 'TAX123456',
        vatNumber: 'VAT123456',
        phoneNumber: '+27123456789',
        physicalAddress: '123 Test Street',
      });

      const savedUser = await user.save();
      
      // Attempt to change userName
      savedUser.userName = 'newusername';
      const updatedUser = await savedUser.save();

      // userName should not change (immutable)
      expect(updatedUser.userName).toBe('testuser');
    });

    test('should have immutable businessName', async () => {
      const user = new User({
        userName: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        businessName: 'Test Business',
        businessRegistrationNumber: 'BRN123456',
        taxNumber: 'TAX123456',
        vatNumber: 'VAT123456',
        phoneNumber: '+27123456789',
        physicalAddress: '123 Test Street',
      });

      const savedUser = await user.save();
      
      // Attempt to change businessName
      savedUser.businessName = 'New Business Name';
      const updatedUser = await savedUser.save();

      // businessName should not change (immutable)
      expect(updatedUser.businessName).toBe('Test Business');
    });

    test('should have immutable businessRegistrationNumber', async () => {
      const user = new User({
        userName: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        businessName: 'Test Business',
        businessRegistrationNumber: 'BRN123456',
        taxNumber: 'TAX123456',
        vatNumber: 'VAT123456',
        phoneNumber: '+27123456789',
        physicalAddress: '123 Test Street',
      });

      const savedUser = await user.save();
      
      // Attempt to change businessRegistrationNumber
      savedUser.businessRegistrationNumber = 'NEW123456';
      const updatedUser = await savedUser.save();

      // businessRegistrationNumber should not change (immutable)
      expect(updatedUser.businessRegistrationNumber).toBe('BRN123456');
    });
  });

  describe('Timestamps', () => {
    test('should have createdAt and updatedAt timestamps', async () => {
      const user = new User({
        userName: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        businessName: 'Test Business',
        businessRegistrationNumber: 'BRN123456',
        taxNumber: 'TAX123456',
        vatNumber: 'VAT123456',
        phoneNumber: '+27123456789',
        physicalAddress: '123 Test Street',
      });

      const savedUser = await user.save();

      expect(savedUser.createdAt).toBeDefined();
      expect(savedUser.updatedAt).toBeDefined();
      expect(savedUser.createdAt).toBeInstanceOf(Date);
      expect(savedUser.updatedAt).toBeInstanceOf(Date);
    });

    test('should update updatedAt timestamp on modification', async () => {
      const user = new User({
        userName: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        businessName: 'Test Business',
        businessRegistrationNumber: 'BRN123456',
        taxNumber: 'TAX123456',
        vatNumber: 'VAT123456',
        phoneNumber: '+27123456789',
        physicalAddress: '123 Test Street',
      });

      const savedUser = await user.save();
      const originalUpdatedAt = savedUser.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      // Update a field
      savedUser.phoneNumber = '+27987654321';
      const updatedUser = await savedUser.save();

      expect(updatedUser.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('Unique Constraints', () => {
    test('should not allow duplicate userName', async () => {
      const userData = {
        userName: 'testuser',
        email: 'test1@example.com',
        password: 'password123',
        businessName: 'Test Business 1',
        businessRegistrationNumber: 'BRN123456',
        taxNumber: 'TAX123456',
        vatNumber: 'VAT123456',
        phoneNumber: '+27123456789',
        physicalAddress: '123 Test Street',
      };

      await new User(userData).save();

      const duplicateUser = new User({
        ...userData,
        email: 'test2@example.com',
        businessName: 'Test Business 2',
        businessRegistrationNumber: 'BRN654321',
      });

      await expect(duplicateUser.save()).rejects.toThrow();
    });

    test('should not allow duplicate email', async () => {
      const userData = {
        userName: 'testuser1',
        email: 'test@example.com',
        password: 'password123',
        businessName: 'Test Business 1',
        businessRegistrationNumber: 'BRN123456',
        taxNumber: 'TAX123456',
        vatNumber: 'VAT123456',
        phoneNumber: '+27123456789',
        physicalAddress: '123 Test Street',
      };

      await new User(userData).save();

      const duplicateUser = new User({
        ...userData,
        userName: 'testuser2',
        businessName: 'Test Business 2',
        businessRegistrationNumber: 'BRN654321',
      });

      await expect(duplicateUser.save()).rejects.toThrow();
    });
  });
});
