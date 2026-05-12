/**
 * @file agent.model.test.mjs
 * @description Unit tests for FieldServiceAgent model metadata
 */
import Agent from '../../../models/FieldServiceAgent.model.js';

describe('Agent Model', () => {
  test('defines immutable and editable field lists', () => {
    expect(Array.isArray(Agent.IMMUTABLE_FIELDS)).toBe(true);
    expect(Array.isArray(Agent.EDITABLE_FIELDS)).toBe(true);
    expect(Agent.IMMUTABLE_FIELDS).toContain('employeeId');
    expect(Agent.EDITABLE_FIELDS).toContain('availability');
  });
});
