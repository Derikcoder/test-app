/**
 * @file quotation.model.test.mjs
 * @description Unit tests for Quotation model metadata
 */
import Quotation from '../../../models/Quotation.model.js';

describe('Quotation Model', () => {
  test('defines immutable and editable field lists', () => {
    expect(Array.isArray(Quotation.IMMUTABLE_FIELDS)).toBe(true);
    expect(Array.isArray(Quotation.EDITABLE_FIELDS)).toBe(true);
    expect(Quotation.IMMUTABLE_FIELDS).toContain('quotationNumber');
    expect(Quotation.EDITABLE_FIELDS).toContain('status');
  });
});
