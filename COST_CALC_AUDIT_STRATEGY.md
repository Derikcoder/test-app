# Cost Calculation Audit Strategy

Last updated: 2026-05-25
Owner: Product + Engineering
Scope: Quotation, pro-forma, and final invoice costing where travel-to-job and travel-to-procure-parts must remain separated.

## Why This Exists

The platform has two different travel cost concerns that must never be blended:

- Job Travel Cost: travel to reach and service the customer site.
- Procurement Travel Cost: travel to source parts from suppliers and return.

This separation protects margin accuracy, makes delivery-service integration safe, and keeps investor-facing unit economics credible.

## Cost Rules (Locked)

### 1) Job Travel Cost (Customer Billing Travel)

- Inputs:
  - distanceTravelledKm
  - travelRatePerKm
  - travelTimeMinutes
  - timeTravelledCost
- Formula:
  - baseTravelCost = (distanceTravelledKm x travelRatePerKm) + timeTravelledCost
- Call-out floor rule:
  - If distanceTravelledKm < 45 and travelTimeMinutes < 30, travel charge floor applies (R650).

### 2) Procurement Travel Cost (Internal Parts Fulfilment)

- Inputs:
  - procurementDistanceTravelledKm
  - procurementTravelTimeMinutes
- Constants (MVP):
  - procurement distance rate = R8.50/km
  - procurement labour rate = R650/hour
- Formula:
  - procurementDistanceCost = procurementDistanceTravelledKm x 8.50
  - procurementTimeCost = (procurementTravelTimeMinutes / 60) x 650
  - partsProcurementCost = procurementDistanceCost + procurementTimeCost
- Explicit rule:
  - No call-out floor behavior is applied to procurement cost.

## Data Contract Lock

Required payload fields for quotation and invoice create/update flows:

- Job travel fields:
  - distanceTravelledKm
  - travelRatePerKm
  - travelTimeMinutes
  - timeTravelledCost
- Procurement travel fields:
  - procurementDistanceTravelledKm
  - procurementTravelTimeMinutes
- Derived internal fulfilment field:
  - partsProcurementCost (server-calculated for in-house procurement mode)

## UI Audit Checklist

For each release candidate:

1. Quotation UI shows separate input controls for job travel and procurement travel.
2. Procurement formula text is visible under Parts Fulfilment Costing.
3. Procurement cost updates when procurement inputs change, even if job travel inputs do not.
4. Job travel floor message only affects travel cost display, not procurement formula.
5. Third-party delivery mode does not require procurement travel inputs.

## API/Backend Audit Checklist

1. Server accepts and persists procurementDistanceTravelledKm and procurementTravelTimeMinutes.
2. In-house procurement cost is calculated from procurement inputs only.
3. Job travel call-out floor remains isolated to travel charge logic.
4. Update recalculation paths include both procurement fields.
5. Fallback logic for legacy records is deterministic and documented.

## Automated Regression Pack

### Client Tests

- CreateQuoteModal payload separation test:
  - Confirms procurement and call-out travel values submit independently.
- travelCosting utility tests:
  - Procurement formula test (distance + labour-time only).
  - Job travel call-out floor behavior tests.

### Server Tests

- Quotation model metadata lock:
  - procurementDistanceTravelledKm and procurementTravelTimeMinutes exist on schema.
  - Both fields remain in editable fields list.
- Invoice model metadata lock:
  - procurementDistanceTravelledKm and procurementTravelTimeMinutes exist on schema.
  - Both fields remain in editable fields list.

## Targeted Commands

Client:

- cd client && npm run test -- src/__tests__/components/CreateQuoteModal.test.jsx src/__tests__/utils/travelCosting.test.js

Server:

- cd server && NODE_OPTIONS=--experimental-vm-modules npx jest tests/unit/controllers/quotation.model.test.mjs
- cd server && NODE_OPTIONS=--experimental-vm-modules npx jest tests/unit/controllers/invoice.model.test.mjs

## Release Gate (Costing)

A release cannot pass costing gate unless:

1. All tests in the automated regression pack pass.
2. UI checklist and API checklist are manually signed off.
3. Spot-check scenarios pass:
  - Short call-out + long procurement run
  - Long call-out + short procurement run
  - Third-party delivery mode
4. Any costing defect is linked to a blocking ticket with owner and due date.

## Spot-Check Scenarios

1. Scenario A (supplier far, customer close)
- Job travel: 5 km, 15 min
- Procurement travel: 120 km, 240 min
- Expected:
  - Job travel floor may apply.
  - Procurement reflects large supplier run independently.

2. Scenario B (customer far, supplier near)
- Job travel: 60 km, 90 min
- Procurement travel: 8 km, 20 min
- Expected:
  - Job travel high.
  - Procurement modest.

3. Scenario C (third-party delivery)
- partsFulfilmentMode = thirdPartyDelivery
- Expected:
  - delivery quote path used.
  - procurement travel inputs not required for costing.

## Ownership and Cadence

- Product owner validates business-rule intent each sprint.
- Engineering lead runs automated regression pack before merge to main.
- QA/UAT lead executes spot-check scenarios during release candidate review.
