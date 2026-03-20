# Field Agent Self-Dispatch API Design

Last updated: 2026-03-20

## Purpose

This document proposes the backend API design for the Field Agent Self-Dispatch feature.

The goal is to keep self-dispatch behavior explicit, auditable, and separate from generic service-call updates.

## Design Principle

Do not use the generic endpoint below as the primary self-dispatch action:

`PUT /api/service-calls/:id`

Reason:

Self-accept is a protected business workflow with eligibility rules, concurrency rules, and fairness constraints. It should have its own dedicated endpoint and controller logic.

## Recommended Endpoints

## 1. Self-Accept A Job

Endpoint:

`POST /api/service-calls/:id/self-accept`

Purpose:

Allows an authenticated agent to attempt to claim an eligible unassigned service call.

Request body:

```json
{
  "agentId": "<field-service-agent-id>"
}
```

Notes:

1. `agentId` should be validated against the authenticated user context or authorized access rules
2. The endpoint should not trust client-provided eligibility state

Success response example:

```json
{
  "message": "Service call self-accepted successfully",
  "serviceCall": {
    "_id": "...",
    "callNumber": "SC-000123",
    "assignedAgent": {
      "_id": "...",
      "firstName": "Jane",
      "lastName": "Doe",
      "employeeId": "AGT-102"
    },
    "status": "assigned",
    "agentAccepted": true,
    "selfAcceptedAt": "2026-03-20T12:00:00.000Z"
  }
}
```

Failure response examples:

```json
{
  "message": "This service call has already been claimed"
}
```

```json
{
  "message": "Daily self-accept limit reached"
}
```

```json
{
  "message": "Weekly self-dispatch participation limit reached"
}
```

```json
{
  "message": "Agent is not eligible for self-dispatch"
}
```

## 2. Get Eligible Unassigned Jobs For An Agent

Endpoint:

`GET /api/service-calls/eligible-unassigned/:agentId`

Purpose:

Returns only the unassigned service calls that the specified agent is currently allowed to self-accept.

Response example:

```json
[
  {
    "_id": "...",
    "callNumber": "SC-000123",
    "title": "Emergency Generator Service",
    "priority": "high",
    "serviceLocation": "Johannesburg North",
    "dispatchStatus": "wave-1-open",
    "dispatchWave": 1
  }
]
```

Notes:

1. This endpoint should filter server-side using eligibility rules
2. UI should not compute claimability on its own

## 3. Update Agent Availability

Endpoint:

`PATCH /api/agents/:id/availability`

Purpose:

Allows the platform or agent workflow to update availability state.

Request body:

```json
{
  "availability": "available"
}
```

Allowed values:

1. `available`
2. `busy`
3. `off-duty`

## 4. Update Agent Location

Endpoint:

`PATCH /api/agents/:id/location`

Purpose:

Stores current or last-known location for geo-wave dispatch.

Request body:

```json
{
  "lat": -26.2041,
  "lng": 28.0473,
  "updatedAt": "2026-03-20T12:00:00.000Z"
}
```

## 5. Update Self-Dispatch Access

Endpoint:

`PATCH /api/agents/:id/self-dispatch-access`

Purpose:

Allows admin to restrict or restore self-dispatch access.

Request body:

```json
{
  "selfDispatchSuspended": true,
  "reason": "Repeated accepted-but-not-started jobs"
}
```

## Server-Side Validation Rules For `POST /self-accept`

The self-accept controller must validate all of the following:

1. Service call exists
2. Service call belongs to the current business scope
3. Service call is currently unassigned
4. Service call is self-dispatch eligible
5. Agent exists
6. Agent is active
7. Agent availability is `available`
8. Agent is not suspended from self-dispatch
9. Agent has not reached the daily cap of 2 self-accepted jobs
10. Agent has not reached the weekly participation cap of 5 self-dispatch days
11. If geo-wave logic is enabled later, the agent is in the active eligible radius window

## Concurrency Requirement

The self-accept action must be atomic.

Recommended approach:

1. Use a single conditional update or transaction-style flow
2. Only assign if `assignedAgent` is still empty at write time
3. If another agent claims first, return a clean conflict response

Suggested conflict status:

`409 Conflict`

## Suggested Status Codes

1. `200 OK` or `201 Created` for successful self-accept
2. `400 Bad Request` for invalid request body
3. `403 Forbidden` for eligibility or policy violations
4. `404 Not Found` when service call or agent does not exist
5. `409 Conflict` when the job is no longer claimable

## Audit Recommendation

Every self-accept attempt should record:

1. serviceCallId
2. agentId
3. outcome
4. reason for rejection if rejected
5. timestamp
6. wave number if geo-wave dispatch is active

## Repository Impact Map

Likely files for this API design:

1. `server/routes/serviceCall.routes.js`
2. `server/controllers/serviceCall.controller.js`
3. `server/routes/agent.routes.js`
4. `server/controllers/agent.controller.js`
5. `server/models/ServiceCall.model.js`
6. `server/models/FieldServiceAgent.model.js`

## Recommendation

Implement `POST /api/service-calls/:id/self-accept` first and move the AgentProfile UI to that endpoint before adding any geo-wave logic.