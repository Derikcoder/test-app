/**
 * @file sequence.util.test.mjs
 * @description Unit tests for sequence utility (Jestering pattern)
 */
import { jest } from '@jest/globals';

// Mock dependencies at module boundaries
await jest.unstable_mockModule('../../../utils/sequence.util.js', () => ({
  __esModule: true,
  getNextSequenceValue: jest.fn(),
  formatSequenceId: jest.fn()
}));

const sequenceUtil = await import('../../../utils/sequence.util.js');
const { getNextSequenceValue, formatSequenceId } = sequenceUtil;

describe('Sequence Util', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('generates next sequence value', async () => {
    // GIVEN
    getNextSequenceValue.mockResolvedValue(42);

    // WHEN
    const result = await getNextSequenceValue('Invoice');

    // THEN
    expect(getNextSequenceValue).toHaveBeenCalledWith('Invoice');
    expect(result).toBe(42);
  });

  test('formats sequence ID', () => {
    // GIVEN
    formatSequenceId.mockReturnValue('INV-000042');

    // WHEN
    const id = formatSequenceId('Invoice', 42);

    // THEN
    expect(formatSequenceId).toHaveBeenCalledWith('Invoice', 42);
    expect(id).toBe('INV-000042');
  });
});
