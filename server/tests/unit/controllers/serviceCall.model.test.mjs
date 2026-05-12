/**
 * @file serviceCall.model.test.mjs
 * @description Unit tests for ServiceCall model metadata
 */
import ServiceCall from '../../../models/ServiceCall.model.js';

describe('ServiceCall Model', () => {
  test('defines immutable and editable field lists', () => {
    expect(Array.isArray(ServiceCall.IMMUTABLE_FIELDS)).toBe(true);
    expect(Array.isArray(ServiceCall.EDITABLE_FIELDS)).toBe(true);
    expect(ServiceCall.IMMUTABLE_FIELDS).toContain('callNumber');
    expect(ServiceCall.EDITABLE_FIELDS).toContain('status');
  });
});
