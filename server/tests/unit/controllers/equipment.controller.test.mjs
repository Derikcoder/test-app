/**
 * @file equipment.controller.test.mjs
 * @description Unit tests for Equipment controller (Jestering pattern)
 */

import { jest } from '@jest/globals';
import { createMockRequest, createMockResponse } from '../__mocks__/factories/express.factory.js';

// Mock Equipment model with chainable methods
const Equipment = {};
await jest.unstable_mockModule('../../../models/Equipment.model.js', () => ({ __esModule: true, default: Equipment }));
await jest.unstable_mockModule('../../../middleware/logger.middleware.js', () => ({ __esModule: true, logError: jest.fn(), logInfo: jest.fn() }));

const controller = await import('../../../controllers/equipment.controller.js');
const getEquipment = controller.getEquipment;

describe('Equipment Controller', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('user retrieves equipment list', async () => {
		// GIVEN
		const req = createMockRequest();
		const res = createMockResponse();
		const mockEquipmentList = [{ _id: 'eq-1', name: 'Compressor' }];
		// Mock chain: find().populate().sort()
		const sortMock = jest.fn().mockResolvedValue(mockEquipmentList);
		const populateMock = jest.fn(() => ({ sort: sortMock }));
		Equipment.find = jest.fn(() => ({ populate: populateMock }));

		// WHEN
		await getEquipment(req, res);

		// THEN
		expect(Equipment.find).toHaveBeenCalled();
		expect(populateMock).toHaveBeenCalled();
		expect(sortMock).toHaveBeenCalled();
		expect(res.json).toHaveBeenCalledWith(
			expect.arrayContaining([expect.objectContaining({ name: 'Compressor' })])
		);
	});
});