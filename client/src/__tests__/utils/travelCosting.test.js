import { describe, it, expect } from 'vitest';
import {
  calculateCallOutTravelCost,
  calculateProcurementCostBreakdown,
  CALL_OUT_FLOOR_AMOUNT,
} from '../../utils/travelCosting';

describe('travelCosting utils', () => {
  it('calculates procurement cost using distance and travel labour only', () => {
    const result = calculateProcurementCostBreakdown({
      distanceTravelledKm: 120,
      travelRatePerKm: 8.5,
      travelTimeMinutes: 240,
      procurementLabourRatePerHour: 650,
    });

    expect(result.distanceCost).toBe(1020);
    expect(result.travelLabourHours).toBe(4);
    expect(result.travelLabourCost).toBe(2600);
    expect(result.totalCost).toBe(3620);
  });

  it('applies call-out floor to job travel when under floor thresholds', () => {
    const result = calculateCallOutTravelCost({
      distanceTravelledKm: 5,
      travelRatePerKm: 8.5,
      travelTimeMinutes: 15,
      timeTravelledCost: 0,
    });

    expect(result.baseTravelCost).toBe(42.5);
    expect(result.isCallOutFloorApplicable).toBe(true);
    expect(result.travelCost).toBe(CALL_OUT_FLOOR_AMOUNT);
  });

  it('does not apply floor when threshold is exceeded', () => {
    const result = calculateCallOutTravelCost({
      distanceTravelledKm: 50,
      travelRatePerKm: 8.5,
      travelTimeMinutes: 60,
      timeTravelledCost: 25,
    });

    expect(result.isCallOutFloorApplicable).toBe(false);
    expect(result.baseTravelCost).toBe(450);
    expect(result.travelCost).toBe(450);
  });
});
