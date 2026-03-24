# Field Agent Self-Dispatch Roadmap

Last updated: 2026-03-20

## Purpose

This document defines the product roadmap for the Field Agent Self-Dispatch feature.

Implementation detail, sprint planning, and repository impact mapping are documented in:

`FIELD_AGENT_SELF_DISPATCH_IMPLEMENTATION_PLAN.md`

This feature must be developed in a separate feature branch and tested thoroughly before any merge into `foundation`.

Recommended branch name:

`feature/field-agent-self-dispatch`

Recommended promotion flow:

1. Build and test in `feature/field-agent-self-dispatch`
2. Merge into `foundation` only after feature validation and regression testing
3. Promote onward through normal integration and QA workflow

## Feature Summary

The goal of this feature is to allow field service agents to accept unassigned jobs directly when they have capacity, while preventing systemic abuse, job hoarding, and unfair workload distribution.

This is not only a UI enhancement. It is a dispatch control feature with business rules, fairness constraints, proximity logic, and audit requirements.

## Product Goals

1. Improve response speed for urgent customer-facing service calls
2. Allow eligible nearby agents to accept work quickly
3. Prevent agents from monopolizing available work
4. Support fair load balancing across the field team
5. Preserve administrator oversight and fallback control

## Core Business Rules

### Dispatch Visibility

1. Unassigned jobs must be visually prominent on the agent side
2. The alert state should communicate urgency clearly
3. Red or red-orange styling is acceptable due to customer communication criticality

### Controlled Acceptance

1. Not all agents should see or accept an unassigned job immediately
2. Initial access should be restricted to eligible agents nearest to the job location
3. Eligibility must depend on active status, availability, location freshness, and load limits

### Timed Expansion Waves

Wave 1:

1. Offer to eligible agents within 15 km
2. Response window: 5 minutes

Wave 2:

1. If no acceptance occurs in Wave 1, expand to eligible agents within 30 km
2. Response window: 10 minutes

Fallback:

1. If still unaccepted, return the call to the administrator-controlled dispatch queue

### Fairness And Abuse Prevention

1. Agents may self-accept a maximum of 2 calls per day
2. Agents may participate in self-accept dispatch on a maximum of 5 days per week
3. Agents must not be allowed to silently hoard jobs while other agents remain idle
4. Acceptance eligibility should consider current active workload, not just distance
5. Repeated failure to attend accepted jobs must be tracked and reviewable

## Product Risks

1. Agents may accept jobs they cannot realistically attend
2. System-reported availability may not reflect real-world availability
3. Closest-agent logic may still produce poor distribution without fairness weighting
4. Stale or missing geolocation data may distort eligibility
5. Overly aggressive self-accept can reduce admin control and operational predictability

## Roadmap

## Phase 0: Policy Definition

Goal:

Define the rules clearly enough for backend enforcement and operational sign-off.

Deliverables:

1. Eligibility policy
2. Acceptance cap policy
3. Weekly participation rule definition
4. Admin override policy
5. Escalation and fallback policy

Exit criteria:

1. No ambiguity remains around who can accept, when, and under what constraints

## Phase 1: Guardrailed Self-Accept MVP

Goal:

Ship a safe first version without geofence expansion logic.

Scope:

1. Add unassigned jobs view on the field service agent profile
2. Allow acceptance only through backend-validated rules
3. Enforce daily and weekly acceptance limits server-side
4. Add audit records for acceptance attempts and outcomes
5. Prevent duplicate or race-condition job claims

Exit criteria:

1. Agents can only accept jobs they are permitted to claim
2. Job acceptance is atomic and traceable

## Phase 2: Availability And Location Readiness

Goal:

Prepare the system for proximity-based dispatch.

Scope:

1. Capture agent live or last-known coordinates
2. Store location freshness timestamp
3. Require explicit agent availability state
4. Geocode customer or service-call location reliably

Exit criteria:

1. Distance-based eligibility can be calculated with acceptable confidence

## Phase 3: Multi-Wave Geo Dispatch

Goal:

Implement timed acceptance waves based on proximity.

Scope:

1. Wave 1 at 15 km for 5 minutes
2. Wave 2 at 30 km for 10 minutes
3. Automatic fallback to admin queue if unanswered
4. Agent-facing countdown and claimability messaging
5. Admin-facing wave status visibility

Exit criteria:

1. Offer waves progress automatically and predictably
2. Only eligible agents can accept during the relevant wave

## Phase 4: Fairness Engine

Goal:

Move from simple caps to balanced workload distribution.

Scope:

1. Rank eligible agents by distance, availability, specialization, and current workload
2. Prefer agents with lower recent self-accept counts
3. Reduce repeated concentration of work to the same agents

Exit criteria:

1. Distribution is measurably more balanced across the field team

## Phase 5: Reliability And Abuse Monitoring

Goal:

Detect and limit harmful acceptance behavior.

Scope:

1. Track accepted-but-not-started jobs
2. Track repeated late starts or no-shows
3. Score agent self-accept reliability
4. Add admin review and temporary restriction controls

Exit criteria:

1. Abuse patterns can be identified and acted on with evidence

## Recommended Technical Scope

### Backend

Recommended additions:

1. Service call dispatch state fields
2. Agent self-accept counters and participation metrics
3. Acceptance audit log
4. Eligibility evaluation service
5. Timed escalation worker or scheduler

### Frontend

Recommended additions:

1. Prominent Unassigned Jobs alert surface
2. Claim eligibility state and countdown timer
3. Acceptance-cap visibility for agents
4. Admin queue status and escalation visibility

## Suggested Delivery Order

1. Policy definition
2. Self-accept MVP with hard limits
3. Availability and location readiness
4. Geo-wave dispatch
5. Fairness scoring
6. Abuse monitoring and admin controls

## Testing Requirement

This feature must not be developed directly on `foundation`.

It must be implemented and validated in a dedicated feature branch because it introduces changes to:

1. Agent workflow
2. Dispatch behavior
3. Service call assignment logic
4. Fairness and operational governance
5. Potentially geolocation-based decision logic

Minimum test expectations before merge to `foundation`:

1. Backend validation tests for self-accept eligibility
2. Concurrency tests for first-accept-wins behavior
3. UI tests for unassigned-job visibility and acceptance state
4. Rule enforcement tests for daily and weekly caps
5. Regression tests for existing admin assignment workflow

## Merge Gate

The feature may only be considered for merge into `foundation` when all of the following are true:

1. Business rules are implemented server-side, not only in the UI
2. Admin fallback flow remains functional
3. Acceptance is auditable
4. Load-balancing rules are enforced or clearly staged behind controlled rollout
5. QA confirms that the feature does not allow uncontrolled job hoarding

## Recommendation

Proceed with this feature as a controlled product initiative, not as an isolated interface improvement.

Start with a guarded MVP in a dedicated feature branch, then progressively add location-based dispatch, fairness ranking, and abuse controls before final merge into `foundation`.