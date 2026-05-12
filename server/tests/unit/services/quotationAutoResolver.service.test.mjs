/**
 * @file quotationAutoResolver.service.test.mjs
 * @description Unit tests for quotation auto resolver service
 */
import { jest } from '@jest/globals';

await jest.unstable_mockModule('../../../models/Equipment.model.js', () => ({ __esModule: true, default: {} }));

const Equipment = (await import('../../../models/Equipment.model.js')).default;
const { resolveAutoMachineDataForQuote } = await import('../../../services/quotationAutoResolver.service.js');

const buildEquipmentFindChain = (result) => {
	const chain = {
		populate: jest.fn().mockReturnThis(),
		sort: jest.fn().mockReturnThis(),
		lean: jest.fn().mockResolvedValue(result),
	};
	return chain;
};

describe('quotationAutoResolver Service', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('prefers equipment-history source when machine records exist', async () => {
		Equipment.find = jest.fn().mockReturnValue(
			buildEquipmentFindChain([
				{
					_id: 'eq-1',
					equipmentId: 'EQ-001',
					equipmentType: 'Generator',
					brand: 'Perkins',
					model: '404A',
					siteId: 'site-1',
					lastServiceDate: '2026-04-01T00:00:00.000Z',
					serviceHistory: [
						{
							callNumber: 'SC-001',
							serviceType: 'Generator Service',
							status: 'completed',
							completedDate: '2026-04-01T00:00:00.000Z',
						},
					],
				},
			])
		);

		const result = await resolveAutoMachineDataForQuote({
			customerId: 'customer-1',
			siteId: 'site-1',
			serviceType: 'Generator Service',
			createdBy: 'owner-1',
		});

		expect(result.source).toBe('equipment-history');
		expect(result.templateSeed.machineModelNumber).toBe('404A');
		expect(result.recentServiceHistory.length).toBeGreaterThan(0);
	});

	test('falls back to generic source when no equipment or booking data exists', async () => {
		Equipment.find = jest.fn().mockReturnValue(buildEquipmentFindChain([]));

		const result = await resolveAutoMachineDataForQuote({
			customerId: 'customer-1',
			serviceType: '',
			bookingRequest: null,
			createdBy: 'owner-1',
		});

		expect(result.source).toBe('generic-fallback');
		expect(result.confidence).toBe('low');
		expect(result.templateSeed.serviceType).toBe('Scheduled Maintenance');
	});
});