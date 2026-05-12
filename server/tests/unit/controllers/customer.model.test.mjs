/**
 * @file customer.model.test.mjs
 * @description Unit tests for Customer model metadata
 */
import Customer from '../../../models/Customer.model.js';

describe('Customer Model', () => {
  test('defines immutable and editable field lists', () => {
    expect(Array.isArray(Customer.IMMUTABLE_FIELDS)).toBe(true);
    expect(Array.isArray(Customer.EDITABLE_FIELDS)).toBe(true);
    expect(Customer.IMMUTABLE_FIELDS.length).toBeGreaterThan(0);
    expect(Customer.EDITABLE_FIELDS.length).toBeGreaterThan(0);
    expect(Customer.IMMUTABLE_FIELDS).toContain('customerId');
    expect(Customer.EDITABLE_FIELDS).toContain('email');
  });
});
