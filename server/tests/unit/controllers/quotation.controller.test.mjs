/**
 * @file quotation.controller.test.mjs
 * @description Unit tests for Quotation controller (Jestering pattern)
 */
import { jest } from '@jest/globals';
import { createMockRequest, createMockResponse } from '../__mocks__/factories/express.factory.js';
import { createMockQuotation } from '../__mocks__/factories/quotation.factory.js';

// Mock dependencies at module boundaries
await jest.unstable_mockModule('../../../models/Quotation.model.js', () => ({ __esModule: true, default: {} }));
await jest.unstable_mockModule('../../../middleware/logger.middleware.js', () => ({ __esModule: true, logError: jest.fn(), logInfo: jest.fn() }));

const controller = await import('../../../controllers/quotation.controller.js');
const getQuotationById = controller.getQuotationById;
const Quotation = (await import('../../../models/Quotation.model.js')).default;

describe('Quotation Controller', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('customer retrieves quotation by ID', async () => {
		// GIVEN
		const req = createMockRequest({ params: { id: 'mock_quotation_1' } });
		const res = createMockResponse();
		const mockQuotation = createMockQuotation({ _id: 'mock_quotation_1' });
		Quotation.findOne = jest.fn().mockReturnValue({
			populate: jest.fn().mockReturnValue({
				populate: jest.fn().mockReturnValue({
					populate: jest.fn().mockResolvedValue(mockQuotation),
				}),
			}),
		});

		// WHEN
		await getQuotationById(req, res);

		// THEN
		expect(Quotation.findOne).toHaveBeenCalledWith({ _id: 'mock_quotation_1', createdBy: 'test-user' });
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({ _id: 'mock_quotation_1' })
		);
	});
});