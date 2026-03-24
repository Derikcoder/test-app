# Field Agent Self-Dispatch Implementation Plan

Last updated: 2026-03-20

## Purpose

This document translates the roadmap in `FIELD_AGENT_SELF_DISPATCH_ROADMAP.md` into:

1. Sprint-sized delivery phases
2. User stories with acceptance criteria
3. A code-impact map for this repository
4. A controlled branch execution plan before merge into `foundation`

Companion planning documents:

1. `FIELD_AGENT_SELF_DISPATCH_SPRINT1_TASKS.md`
2. `FIELD_AGENT_SELF_DISPATCH_API_DESIGN.md`

This work must be implemented in a dedicated feature branch.

Recommended branch:

`feature/field-agent-self-dispatch`

## Delivery Strategy

Recommended delivery model:

1. Sprint 1: Safe self-accept MVP with backend enforcement
2. Sprint 2: Availability and location readiness
3. Sprint 3: Geo-wave dispatch and escalation
4. Sprint 4: Fairness scoring and abuse controls

This sequence keeps the first release safe while allowing location-aware dispatch to be added incrementally.

## Sprint 1: Safe Self-Accept MVP

### Objective

Allow agents to self-accept unassigned jobs under strict server-side rules.

### Epic 1: Self-Accept Governance

#### Story 1.1: Show eligible unassigned jobs to agents

As a field service agent,
I want to see unassigned jobs that are available for self-accept,
so that I can respond quickly when I have capacity.

Acceptance criteria:

1. Agent profile shows an `Unassigned Jobs` section or tab
2. Only jobs eligible for self-accept are displayed as claimable
3. Jobs that are not eligible are either hidden or clearly marked unavailable
4. The alert styling is visually prominent and urgency-oriented

#### Story 1.2: Self-accept a job with atomic server validation

As a field service agent,
I want to accept an eligible job directly from my profile,
so that I can add it to my work queue without admin intervention.

Acceptance criteria:

1. Acceptance is validated server-side
2. First valid acceptance wins
3. Duplicate acceptance attempts are rejected cleanly
4. Accepted job is assigned to the agent and removed from the unassigned pool
5. UI updates immediately after success

#### Story 1.3: Enforce daily acceptance cap

As the business,
I want agents limited to 2 self-accepted jobs per day,
so that work remains balanced across the team.

Acceptance criteria:

1. Agents cannot self-accept more than 2 jobs in one day
2. Attempting to exceed the limit returns a backend error
3. UI displays a clear reason when the limit blocks acceptance
4. Cap logic does not depend on client-side enforcement only

#### Story 1.4: Enforce weekly participation cap

As the business,
I want self-accept participation limited to 5 days per week,
so that agents do not dominate dispatch opportunities.

Acceptance criteria:

1. Participation days are tracked server-side
2. Agents exceeding the weekly participation threshold cannot self-accept more jobs that week
3. Backend response clearly states why acceptance was denied
4. Rule scope is limited to self-dispatch participation, not general work attendance

#### Story 1.5: Audit every self-accept decision

As an administrator,
I want self-accept actions logged,
so that operational disputes and abuse can be reviewed later.

Acceptance criteria:

1. Every acceptance attempt is traceable
2. Successful claims record who accepted, when, and what job was claimed
3. Rejected claims record why they were rejected
4. Audit information is accessible for admin troubleshooting

### Sprint 1 Likely Files

Backend:

1. `server/models/ServiceCall.model.js`
2. `server/models/FieldServiceAgent.model.js`
3. `server/controllers/serviceCall.controller.js`
4. `server/routes/serviceCall.routes.js`
5. `server/middleware/logger.middleware.js`

Frontend:

1. `client/src/components/AgentProfile.jsx`
2. `client/src/components/ServiceCalls.jsx`
3. `client/src/context/AuthContext.jsx` if role or agent identity context needs extension
4. `client/src/api/axios.js` only if request helpers change

Tests:

1. `server/tests/unit/controllers/`
2. `server/tests/unit/models/`
3. `client/src/__tests__/components/`

## Sprint 2: Availability And Location Readiness

### Objective

Prepare the platform for proximity-based dispatch using location freshness and availability.

### Epic 2: Agent Readiness

#### Story 2.1: Track agent availability state

As a field service agent,
I want to mark myself available, busy, or off-duty,
so that the system can make better dispatch decisions.

Acceptance criteria:

1. Agent availability can be updated in the system
2. Availability is stored persistently
3. Only eligible availability states can receive self-dispatch offers

#### Story 2.2: Capture and store agent location

As the system,
I want to store the agent's current or last known location,
so that proximity-based dispatch can be calculated.

Acceptance criteria:

1. Agent location can be recorded with latitude, longitude, and timestamp
2. Location freshness is available for validation
3. Stale location can disqualify the agent from geo-wave eligibility

#### Story 2.3: Geocode service locations

As the system,
I want service calls to have reliable dispatch coordinates,
so that nearby-agent calculations are meaningful.

Acceptance criteria:

1. Service location can be resolved to coordinates
2. Missing coordinates fall back to admin-only assignment if required
3. Dispatch logic does not silently use invalid location data

### Sprint 2 Likely Files

Backend:

1. `server/models/FieldServiceAgent.model.js`
2. `server/models/ServiceCall.model.js`
3. `server/controllers/agent.controller.js`
4. `server/controllers/serviceCall.controller.js`
5. `server/routes/agent.routes.js`

Frontend:

1. `client/src/components/AgentProfile.jsx`
2. `client/src/components/FieldServiceAgents.jsx`
3. `client/src/components/ServiceCalls.jsx`

## Sprint 3: Geo-Wave Dispatch

### Objective

Introduce timed radius-based acceptance windows.

### Epic 3: Dispatch Escalation Waves

#### Story 3.1: Wave 1 limited alert

As the business,
I want new unassigned jobs first offered to eligible agents within 15 km for 5 minutes,
so that nearby agents can respond first.

Acceptance criteria:

1. Wave 1 opens automatically when a qualifying job becomes self-dispatch eligible
2. Only eligible agents within 15 km can claim during the first 5 minutes
3. Agents outside Wave 1 are blocked from acceptance

#### Story 3.2: Wave 2 escalation

As the business,
I want the offer expanded to 30 km if nobody accepts within 5 minutes,
so that response coverage widens without immediately exposing every job to everyone.

Acceptance criteria:

1. Wave 2 begins automatically after Wave 1 expiry
2. Response window changes to 10 minutes
3. Newly eligible agents become able to claim the job

#### Story 3.3: Admin fallback after unanswered waves

As an administrator,
I want unanswered self-dispatch offers returned to the controlled queue,
so that work never disappears unattended.

Acceptance criteria:

1. Jobs not accepted in Wave 1 or Wave 2 return to admin queue state
2. Admin queue clearly indicates escalation failure
3. Manual assignment still works after fallback

### Sprint 3 Likely Files

Backend:

1. `server/models/ServiceCall.model.js`
2. `server/controllers/serviceCall.controller.js`
3. `server/routes/serviceCall.routes.js`
4. New background job or scheduler integration point if introduced

Frontend:

1. `client/src/components/AgentProfile.jsx`
2. `client/src/components/ServiceCalls.jsx`

## Sprint 4: Fairness And Abuse Controls

### Objective

Add load balancing and operational integrity to the self-dispatch model.

### Epic 4: Fair Distribution

#### Story 4.1: Rank agents fairly

As the business,
I want eligible agents ranked by more than distance,
so that the same few agents do not repeatedly dominate the queue.

Acceptance criteria:

1. Eligibility considers availability, load, distance, and recent self-accept volume
2. Logic reduces repeated concentration of claims to the same agents
3. Ranking behavior is deterministic and explainable

#### Story 4.2: Track non-performance after claim

As an administrator,
I want to detect agents who accept but do not act,
so that abuse or unreliability can be managed.

Acceptance criteria:

1. Accepted-but-not-started jobs are measurable
2. Repeated no-start or no-show patterns can be identified
3. Admin can review reliability history

#### Story 4.3: Restrict unreliable agents from self-dispatch

As an administrator,
I want to temporarily restrict self-accept privileges when necessary,
so that the system stays fair and responsive.

Acceptance criteria:

1. Admin can suspend self-dispatch eligibility for an agent
2. Suspended agents cannot claim self-dispatch jobs
3. Restriction reason is auditable

### Sprint 4 Likely Files

Backend:

1. `server/models/FieldServiceAgent.model.js`
2. `server/models/ServiceCall.model.js`
3. `server/controllers/agent.controller.js`
4. `server/controllers/serviceCall.controller.js`

Frontend:

1. `client/src/components/AgentProfile.jsx`
2. `client/src/components/FieldServiceAgents.jsx`
3. `client/src/components/ServiceCalls.jsx`

## Suggested Data Model Additions

These fields are recommended, subject to implementation design.

### ServiceCall additions

Potential fields:

1. `dispatchStatus`
2. `selfDispatchEnabled`
3. `dispatchWave`
4. `dispatchWaveStartedAt`
5. `dispatchWaveExpiresAt`
6. `selfAcceptedAt`
7. `selfAcceptedBy`
8. `dispatchCoordinates`
9. `dispatchAudit` or external audit references

### FieldServiceAgent additions

Potential fields:

1. `availability`
2. `currentLocation.lat`
3. `currentLocation.lng`
4. `currentLocation.updatedAt`
5. `selfDispatchSuspended`
6. `selfDispatchSuspendedReason`
7. Derived counters or aggregated statistics for self-accept history

## API Impact Map

### Existing endpoints likely to change

1. `GET /api/service-calls`
2. `PUT /api/service-calls/:id`
3. `GET /api/agents/:id`
4. `GET /api/agents`

### New endpoints likely required

1. `POST /api/service-calls/:id/self-accept`
2. `GET /api/agents/:id/eligible-unassigned-jobs`
3. `PATCH /api/agents/:id/availability`
4. `PATCH /api/agents/:id/location`
5. `PATCH /api/agents/:id/self-dispatch-access`

Using a dedicated `self-accept` endpoint is recommended instead of overloading generic update behavior, because it makes business-rule enforcement clearer and safer.

## UI Impact Map

### Agent-facing

`client/src/components/AgentProfile.jsx`

Recommended additions:

1. Unassigned Jobs alert card
2. Eligibility-aware claim list
3. Countdown timer for active wave
4. Accept button with limit messaging
5. Visual explanation when claim is blocked

### Admin-facing

`client/src/components/ServiceCalls.jsx`

Recommended additions:

1. Dispatch wave visibility
2. Escalation state
3. Acceptance audit summary
4. Admin fallback queue indicators
5. Manual override when self-dispatch fails

### Agent administration

`client/src/components/FieldServiceAgents.jsx`

Recommended additions:

1. Availability visibility
2. Self-dispatch eligibility status
3. Restriction or suspension controls
4. Reliability indicators

## Testing Plan

### Backend tests

1. Reject self-accept when daily cap exceeded
2. Reject self-accept when weekly participation cap exceeded
3. Reject self-accept when job already claimed
4. Accept first valid self-accept request only once under concurrency
5. Reject self-accept when agent is unavailable or suspended

### Frontend tests

1. Unassigned jobs render correctly when eligible
2. Accept button disables during in-flight request
3. Success and error messages render correctly
4. Ineligible jobs are not incorrectly claimable

### Integration tests

1. Create call -> dispatch eligible -> accept -> assigned queue update
2. Wave 1 expiry -> Wave 2 expansion -> fallback to admin queue
3. Admin assignment still works alongside self-dispatch

## Branch Discipline

This feature should not be developed directly on `foundation` because it changes:

1. Dispatch workflow
2. Assignment authority
3. Agent operational policy
4. Potential geolocation handling
5. Fairness and abuse-prevention behavior

Required branch flow:

1. Create `feature/field-agent-self-dispatch`
2. Implement Sprint 1 safely behind strong backend rules
3. Validate with automated and manual testing
4. Merge to `foundation` only after operational review

## Merge Readiness Checklist

Before merging into `foundation`, confirm:

1. Self-accept rules are enforced in the backend
2. Claiming is atomic under concurrent requests
3. Admin fallback remains intact
4. Acceptance history is auditable
5. UI does not expose unrestricted claim actions
6. Existing assignment flows are not regressed

## Recommendation

Begin with Sprint 1 only.

Do not implement geo-wave dispatch until the guarded self-accept model is stable, tested, and accepted operationally. The business risk of releasing unrestricted self-dispatch too early is higher than the speed benefit.