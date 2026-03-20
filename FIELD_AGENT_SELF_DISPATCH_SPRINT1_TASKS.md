# Field Agent Self-Dispatch Sprint 1 Tasks

Last updated: 2026-03-20

## Purpose

This document breaks Sprint 1 into concrete implementation tasks for the branch:

`feature/field-agent-self-dispatch`

Sprint 1 objective:

Deliver a safe self-accept MVP with backend enforcement, auditability, and no unrestricted job claiming.

## Sprint 1 Definition Of Done

Sprint 1 is complete only when:

1. Agents can only self-accept through a dedicated backend action
2. Daily cap of 2 self-accepted jobs is enforced server-side
3. Weekly participation cap of 5 self-dispatch days is enforced server-side
4. Acceptance is atomic under concurrent requests
5. Acceptance attempts are auditable
6. Existing admin assignment flow still works
7. UI only exposes claim actions for eligible jobs

## Task Group A: Service Call Data Model

### Task A1: Add self-dispatch state fields to ServiceCall

Target file:

1. `server/models/ServiceCall.model.js`

Recommended fields:

1. `dispatchStatus`
2. `selfDispatchEnabled`
3. `selfAcceptedAt`
4. `selfAcceptedBy`
5. `dispatchWave`
6. `dispatchWaveStartedAt`
7. `dispatchWaveExpiresAt`

Acceptance criteria:

1. Schema supports safe self-dispatch state tracking
2. Existing service-call creation and admin assignment still work

### Task A2: Decide whether audit lives inline or in a separate model

Target files:

1. `server/models/ServiceCall.model.js`
2. Optional new model if audit is separated

Recommendation:

Use a separate audit model if multiple acceptance attempts per call need to be retained cleanly.

## Task Group B: Agent Governance Data

### Task B1: Extend FieldServiceAgent for self-dispatch eligibility controls

Target file:

1. `server/models/FieldServiceAgent.model.js`

Recommended additions:

1. `selfDispatchSuspended`
2. `selfDispatchSuspendedReason`
3. availability usage validation if not already sufficient

Acceptance criteria:

1. Agent can be restricted from self-dispatch independently of general employment status

### Task B2: Define how daily and weekly limits are calculated

Target files:

1. `server/controllers/serviceCall.controller.js`
2. Optional helper file under `server/utils/`

Recommendation:

Use accepted service calls as source of truth, not counters stored permanently, unless profiling later proves a need for denormalized counters.

## Task Group C: Dedicated Self-Accept API

### Task C1: Add dedicated self-accept route

Target file:

1. `server/routes/serviceCall.routes.js`

Recommended endpoint:

1. `POST /api/service-calls/:id/self-accept`

Reason:

Self-accept is business workflow, not a generic update. It should not depend on unrestricted `PUT /api/service-calls/:id` behavior.

Acceptance criteria:

1. Route exists behind authentication
2. Route uses dedicated controller logic

### Task C2: Implement self-accept controller action

Target file:

1. `server/controllers/serviceCall.controller.js`

Required validations:

1. Service call exists
2. Service call is unassigned
3. Service call is self-dispatch eligible
4. Agent exists and is active
5. Agent is available
6. Agent is not suspended from self-dispatch
7. Agent has not exceeded 2 self-accepted calls today
8. Agent has not exceeded 5 self-dispatch participation days this week
9. Acceptance succeeds only if call remains claimable at write time

Acceptance criteria:

1. Valid request assigns the call to the agent
2. `agentAccepted` is set correctly
3. Race conditions are blocked
4. Rejections return meaningful messages

### Task C3: Add audit logging for accepted and rejected attempts

Target files:

1. `server/controllers/serviceCall.controller.js`
2. `server/middleware/logger.middleware.js`
3. Optional audit model file

Acceptance criteria:

1. Acceptance attempts can be investigated later

## Task Group D: Read Model For Eligible Jobs

### Task D1: Provide an endpoint for eligible unassigned jobs

Target files:

1. `server/routes/serviceCall.routes.js`
2. `server/controllers/serviceCall.controller.js`

Recommended endpoint:

1. `GET /api/service-calls/eligible-unassigned/:agentId`

Acceptance criteria:

1. Response excludes already assigned jobs
2. Response only includes jobs the current agent may claim
3. Rules are enforced on the server, not inferred on the client

## Task Group E: Agent Profile UI

### Task E1: Replace generic claim logic with dedicated self-accept action

Target file:

1. `client/src/components/AgentProfile.jsx`

Acceptance criteria:

1. UI calls the dedicated self-accept endpoint
2. UI no longer relies on a generic update route for claiming
3. UI handles success and rejection states cleanly

### Task E2: Surface acceptance limits and eligibility reasons

Target file:

1. `client/src/components/AgentProfile.jsx`

Acceptance criteria:

1. Agent can see when a job is unavailable to claim
2. Agent sees useful feedback when capped or blocked

### Task E3: Keep unassigned jobs visually prominent

Target file:

1. `client/src/components/AgentProfile.jsx`

Acceptance criteria:

1. Unassigned jobs remain attention-grabbing
2. Visual urgency does not imply unrestricted access

## Task Group F: Admin Workflow Protection

### Task F1: Ensure admin assignment flow still works

Target file:

1. `client/src/components/ServiceCalls.jsx`
2. `server/controllers/serviceCall.controller.js`

Acceptance criteria:

1. Admin can still assign calls manually
2. Self-dispatch logic does not break current assignment queue behavior

## Task Group G: Testing

### Task G1: Backend unit tests

Target paths:

1. `server/tests/unit/controllers/`
2. `server/tests/unit/models/`

Required tests:

1. Reject when call is already assigned
2. Reject when daily cap exceeded
3. Reject when weekly participation cap exceeded
4. Reject when agent unavailable or suspended
5. Accept first valid claim only under concurrent attempts

### Task G2: Frontend tests

Target paths:

1. `client/src/__tests__/components/`

Required tests:

1. Unassigned jobs render correctly
2. Accept button disables during submit
3. Error message renders when claim is rejected
4. Success state refreshes queue view

## Suggested Implementation Order

1. ServiceCall schema updates
2. FieldServiceAgent schema updates
3. Dedicated self-accept endpoint
4. Eligible-unassigned read endpoint
5. AgentProfile UI update to use dedicated endpoint
6. Admin regression validation
7. Backend tests
8. Frontend tests

## Sprint 1 Merge Gate

Do not merge Sprint 1 into `foundation` until:

1. Generic service-call update path is not the self-accept control surface
2. All limits are backend enforced
3. Concurrency protection is proven by test
4. Manual admin assignment remains intact
5. Acceptance history is reviewable