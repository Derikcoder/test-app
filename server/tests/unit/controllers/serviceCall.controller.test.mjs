/**
 * @file serviceCall.controller.test.mjs
 * @description Unit tests for ServiceCall controller (Jestering pattern)
 */
import { jest } from '@jest/globals';
import { createMockRequest, createMockResponse } from '../__mocks__/factories/express.factory.js';
import { createMockServiceCall } from '../__mocks__/factories/serviceCall.factory.js';

// Mock dependencies at module boundaries
await jest.unstable_mockModule('../../../models/ServiceCall.model.js', () => ({ __esModule: true, default: {} }));
await jest.unstable_mockModule('../../../middleware/logger.middleware.js', () => ({ __esModule: true, logError: jest.fn(), logInfo: jest.fn() }));

const controller = await import('../../../controllers/serviceCall.controller.js');
const getServiceCallById = controller.getServiceCallById;
const ServiceCall = (await import('../../../models/ServiceCall.model.js')).default;

describe('ServiceCall Controller', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('user retrieves service call by ID', async () => {
		// GIVEN
		const req = createMockRequest({ params: { id: 'mock_serviceCall_1' } });
		const res = createMockResponse();
		const mockServiceCall = createMockServiceCall({ _id: 'mock_serviceCall_1' });
		ServiceCall.findOne = jest.fn().mockReturnValue({
			populate: jest.fn().mockReturnValue({
				populate: jest.fn().mockReturnValue({
					populate: jest.fn().mockReturnValue({
						populate: jest.fn().mockReturnValue({
							populate: jest.fn().mockResolvedValue(mockServiceCall),
						}),
					}),
				}),
			}),
		});

		// WHEN
		await getServiceCallById(req, res);

		// THEN
		expect(ServiceCall.findOne).toHaveBeenCalledWith({ _id: 'mock_serviceCall_1', createdBy: 'test-user' });
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({ _id: 'mock_serviceCall_1' })
		);
	});
});