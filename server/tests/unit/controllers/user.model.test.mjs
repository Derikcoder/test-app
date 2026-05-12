/**
 * @file user.model.test.mjs
 * @description Unit tests for User model metadata
 */
import User from '../../../models/User.model.js';

describe('User Model', () => {
  test('defines immutable and editable field lists', () => {
    expect(Array.isArray(User.IMMUTABLE_FIELDS)).toBe(true);
    expect(Array.isArray(User.EDITABLE_FIELDS)).toBe(true);
    expect(User.IMMUTABLE_FIELDS).toContain('userName');
    expect(User.EDITABLE_FIELDS).toContain('email');
  });
});
