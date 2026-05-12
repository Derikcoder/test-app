/**
 * @file auth.controller.test.mjs
 * @description Unit tests for Auth controller (Jestering pattern)
 */

import { jest } from '@jest/globals';
import { createMockRequest, createMockResponse } from '../__mocks__/factories/express.factory.js';
import { createMockUser } from '../__mocks__/factories/user.factory.js';

// Mock User model as a function (constructor)
const User = {};
await jest.unstable_mockModule('../../../models/User.model.js', () => ({ __esModule: true, default: User }));
await jest.unstable_mockModule('../../../middleware/logger.middleware.js', () => ({ __esModule: true, logError: jest.fn(), logInfo: jest.fn() }));

const controller = await import('../../../controllers/auth.controller.js');
const loginUser = controller.loginUser;

describe('Auth Controller', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('user logs in with valid credentials', async () => {
		// GIVEN
		const req = createMockRequest({ body: { email: 'alice@acme.com', password: 'password123' } });
		const res = createMockResponse();
		const mockUser = createMockUser({ email: 'alice@acme.com' });
		User.findOne = jest.fn().mockResolvedValue(mockUser);
		mockUser.comparePassword = jest.fn().mockResolvedValue(true);

		// WHEN
		await loginUser(req, res);

		// THEN
		expect(User.findOne).toHaveBeenCalledWith({ email: 'alice@acme.com' });
		expect(mockUser.comparePassword).toHaveBeenCalledWith('password123');
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({ token: expect.any(String) })
		);
	});
});