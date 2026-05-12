/**
 * @file User.model.test.mjs
 * @description Unit tests for User model behavior
 */
import User from '../../../models/User.model.js';

describe('User Model', () => {
	test('generates password reset token and expiry', () => {
		const user = new User({
			userName: 'reset-user',
			email: 'reset@example.com',
			password: 'password123',
			role: 'superAdmin',
			businessName: 'Reset Biz',
			phoneNumber: '0800000000',
			physicalAddress: 'Address 1',
		});

		const token = user.generatePasswordResetToken();

		expect(typeof token).toBe('string');
		expect(token.length).toBeGreaterThan(0);
		expect(typeof user.resetPasswordToken).toBe('string');
		expect(user.resetPasswordExpire instanceof Date || typeof user.resetPasswordExpire === 'number').toBe(true);
	});

	test('invalidates customer role when customerProfile is missing', async () => {
		const user = new User({
			userName: 'cust-user',
			email: 'cust@example.com',
			password: 'password123',
			role: 'customer',
			businessName: 'Cust Biz',
			phoneNumber: '0800000001',
			physicalAddress: 'Address 2',
		});

		await expect(user.validate()).rejects.toThrow();
	});
});