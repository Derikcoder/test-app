/**
 * @file auth.middleware.test.mjs
 * @description Minimal unit coverage for auth middleware
 */
import { jest } from '@jest/globals';
import { protect } from '../../../middleware/auth.middleware.js';

describe('Auth Middleware', () => {
	test('returns 401 when no bearer token is provided', async () => {
		const req = { headers: {} };
		const res = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};
		const next = jest.fn();

		await protect(req, res, next);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith({ message: 'Not authorized, no token' });
		expect(next).not.toHaveBeenCalled();
	});
});