/**
 * Shared travel and call-out costing constants.
 */
export const TRAVEL_RATE_PER_KM = 8.5;
export const PROCUREMENT_LABOUR_RATE_PER_HOUR = 650;
export const CALL_OUT_FLOOR_DISTANCE_KM = 45;
export const CALL_OUT_FLOOR_TIME_MINUTES = 30;
export const CALL_OUT_FLOOR_AMOUNT = 650;

/**
 * Calculates in-house procurement cost from two explicit components:
 * 1) vehicle distance cost (fleet upkeep) and
 * 2) travel labour cost (time paid to people).
 *
 * @param {Object} params
 * @param {number} params.distanceTravelledKm
 * @param {number} params.travelRatePerKm
 * @param {number} params.travelTimeMinutes
 * @param {number} [params.procurementLabourRatePerHour]
 * @returns {{
 *   distanceCost: number,
 *   travelLabourHours: number,
 *   travelLabourCost: number,
 *   totalCost: number,
 * }}
 */
export const calculateProcurementCostBreakdown = ({
  distanceTravelledKm,
  travelRatePerKm,
  travelTimeMinutes,
  procurementLabourRatePerHour = PROCUREMENT_LABOUR_RATE_PER_HOUR,
}) => {
  const normalizedDistanceTravelledKm = Number(distanceTravelledKm) || 0;
  const normalizedTravelRatePerKm = Number(travelRatePerKm) || TRAVEL_RATE_PER_KM;
  const normalizedTravelTimeMinutes = Number(travelTimeMinutes) || 0;
  const normalizedLabourRatePerHour = Number(procurementLabourRatePerHour) || PROCUREMENT_LABOUR_RATE_PER_HOUR;

  const distanceCost = normalizedDistanceTravelledKm * normalizedTravelRatePerKm;
  const travelLabourHours = normalizedTravelTimeMinutes / 60;
  const travelLabourCost = travelLabourHours * normalizedLabourRatePerHour;
  const totalCost = distanceCost + travelLabourCost;

  return {
    distanceCost,
    travelLabourHours,
    travelLabourCost,
    totalCost,
  };
};

/**
 * Calculates travel cost using the same call-out rule used across quote flows.
 *
 * @param {Object} params
 * @param {number} params.distanceTravelledKm
 * @param {number} params.travelRatePerKm
 * @param {number} params.travelTimeMinutes
 * @param {number} params.timeTravelledCost
 * @returns {{
 *   distanceTravelCost: number,
 *   timeTravelCost: number,
 *   baseTravelCost: number,
 *   isCallOutFloorApplicable: boolean,
 *   travelCost: number,
 * }}
 */
export const calculateCallOutTravelCost = ({
  distanceTravelledKm,
  travelRatePerKm,
  travelTimeMinutes,
  timeTravelledCost,
}) => {
  const normalizedDistanceTravelledKm = Number(distanceTravelledKm) || 0;
  const normalizedTravelRatePerKm = Number(travelRatePerKm) || TRAVEL_RATE_PER_KM;
  const normalizedTravelTimeMinutes = Number(travelTimeMinutes) || 0;
  const normalizedTimeTravelledCost = Number(timeTravelledCost) || 0;

  const distanceTravelCost = normalizedDistanceTravelledKm * normalizedTravelRatePerKm;
  const timeTravelCost = normalizedTimeTravelledCost;
  const baseTravelCost = distanceTravelCost + timeTravelCost;
  const isCallOutFloorApplicable =
    normalizedDistanceTravelledKm < CALL_OUT_FLOOR_DISTANCE_KM
    && normalizedTravelTimeMinutes < CALL_OUT_FLOOR_TIME_MINUTES;
  const travelCost = isCallOutFloorApplicable
    ? Math.max(baseTravelCost, CALL_OUT_FLOOR_AMOUNT)
    : baseTravelCost;

  return {
    distanceTravelCost,
    timeTravelCost,
    baseTravelCost,
    isCallOutFloorApplicable,
    travelCost,
  };
};
