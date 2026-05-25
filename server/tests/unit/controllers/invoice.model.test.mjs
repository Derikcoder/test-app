/**
 * @file invoice.model.test.mjs
 * @description Unit tests for Invoice model metadata
 */
import Invoice from '../../../models/Invoice.model.js';

describe('Invoice Model', () => {
  test('defines immutable and editable field lists', () => {
    expect(Array.isArray(Invoice.IMMUTABLE_FIELDS)).toBe(true);
    expect(Array.isArray(Invoice.EDITABLE_FIELDS)).toBe(true);
    expect(Invoice.IMMUTABLE_FIELDS).toContain('invoiceNumber');
    expect(Invoice.EDITABLE_FIELDS).toContain('workflowStatus');
    expect(Invoice.schema.path('procurementDistanceTravelledKm')).toBeDefined();
    expect(Invoice.schema.path('procurementTravelTimeMinutes')).toBeDefined();
    expect(Invoice.schema.path('agent')).toBeDefined();
    expect(Invoice.EDITABLE_FIELDS).toContain('procurementDistanceTravelledKm');
    expect(Invoice.EDITABLE_FIELDS).toContain('procurementTravelTimeMinutes');
    expect(Invoice.EDITABLE_FIELDS).toContain('agent');
  });
});
