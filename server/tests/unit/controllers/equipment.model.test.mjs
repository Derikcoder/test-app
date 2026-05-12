/**
 * @file equipment.model.test.mjs
 * @description Unit tests for Equipment model metadata
 */
import Equipment from '../../../models/Equipment.model.js';

describe('Equipment Model', () => {
  test('defines immutable and editable field lists', () => {
    expect(Array.isArray(Equipment.IMMUTABLE_FIELDS)).toBe(true);
    expect(Array.isArray(Equipment.EDITABLE_FIELDS)).toBe(true);
    expect(Equipment.IMMUTABLE_FIELDS).toContain('equipmentId');
    expect(Equipment.EDITABLE_FIELDS).toContain('status');
  });
});
