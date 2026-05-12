/**
 * @file agent.controller.test.mjs
 * @description Unit tests for Agent controller (Jestering pattern)
 */
import { jest } from '@jest/globals';
import { createMockRequest, createMockResponse } from '../__mocks__/factories/express.factory.js';
import { createMockAgent } from '../__mocks__/factories/agent.factory.js';

// Mock dependencies at module boundaries
await jest.unstable_mockModule('../../../models/FieldServiceAgent.model.js', () => ({ __esModule: true, default: {} }));
await jest.unstable_mockModule('../../../middleware/logger.middleware.js', () => ({ __esModule: true, logError: jest.fn(), logInfo: jest.fn() }));

const controller = await import('../../../controllers/agent.controller.js');
const getAgentById = controller.getAgentById;
const Agent = (await import('../../../models/FieldServiceAgent.model.js')).default;

describe('Agent Controller', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('user retrieves agent by ID', async () => {
		// GIVEN
		const req = createMockRequest({ params: { id: 'mock_agent_1' }, user: { _id: 'owner-1' } });
		const res = createMockResponse();
		const mockAgent = createMockAgent({ _id: 'mock_agent_1' });
		Agent.findOne = jest.fn().mockResolvedValue(mockAgent);

		// WHEN
		await getAgentById(req, res);

		// THEN
		expect(Agent.findOne).toHaveBeenCalledWith({ _id: 'mock_agent_1', createdBy: 'owner-1' });
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({ _id: 'mock_agent_1' })
		);
	});
});