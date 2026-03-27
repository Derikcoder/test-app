# API Collection and API Management Plan

## Purpose

This document is the project’s living API register and API integration plan.
Use it to:

- Track all active endpoints by domain
- Keep frontend/backend integration structure consistent
- Govern API changes safely (design, implementation, testing, documentation)
- Plan versioning, deprecation, and release communication

## Integration Structure

### Request Flow

1. Frontend components call the shared API client in client/src/api/axios.js
2. Frontend sends requests to relative /api paths
3. Vite proxy forwards /api requests to backend HTTPS target
4. Express routes map URL patterns to controllers
5. Controllers run business logic and model operations
6. Response returns through Axios interceptors to UI

### Source of Truth Files

- Backend entry and route mount points: server/server.js
- Route definitions: server/routes/
- Controller logic: server/controllers/
- Data models: server/models/
- Frontend API adapter: client/src/api/axios.js
- Postman QA flow: server/tests/postman/register_customers_collection.json
- JSON schema registry root: schemas/project.schema.json
- Shared schema contracts: schemas/shared/
- Domain schema contracts: schemas/domains/
- Flow logic artifacts: docs/flowchart TD, docs/flowchart LR, docs/flowchart LR non technical, docs/sequenceDiagram

## API Plumbing Standard (Mandatory)

Every new API in this project must be represented in all four layers below:

1. Implementation layer
  - Route + controller + model updates in server code
2. Contract layer
  - Update or add domain JSON schema under `schemas/domains/`
  - Reuse shared contracts from `schemas/shared/`
  - Ensure registry wiring in `schemas/project.schema.json`
3. Inventory layer
  - Update endpoint register in this `API_COLLECTION.md`
4. Flow layer
  - Add or update Mermaid data/process logic in `docs/` (technical flow and sequence; executive flow when needed)

Purpose:

- Keeps endpoint exposing and binding intuitive as the project grows
- Preserves contract-driven integration between frontend and backend
- Improves traceability of data flow and business logic across domains

## API Environment and Base URLs

### Local Development

- Frontend app: <https://localhost:3000>
- Backend API root: <https://localhost:5000/api>
- Health endpoint: <https://localhost:5000/api/health>

### Auth Pattern

- Private endpoints require JWT bearer token in Authorization header
- Public endpoints are explicitly listed below

## Current Endpoint Registry

Notes:

- Base prefix for all backend resources is /api
- Access column uses Public or Private
- Private means protect middleware is applied

### System

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | / | Public | Backend root status page or JSON payload |
| GET | /api | Public | API welcome |
| GET | /api/health | Public | Service health check |

### Auth

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| POST | /api/auth/register | Public | Register user |
| POST | /api/auth/login | Public | Login and get JWT |
| GET | /api/auth/profile | Private | Get authenticated profile |
| PUT | /api/auth/profile | Private | Update authenticated profile |
| GET | /api/auth/field-permissions | Private | Get editable and protected fields |
| POST | /api/auth/forgot-password | Public | Request password reset |
| PUT | /api/auth/reset-password/:token | Public | Reset password with token |
| POST | /api/auth/passkeys/generate | Private | Generate onboarding passkey |
| POST | /api/auth/passkeys/request-renewal | Public | Request passkey renewal |
| POST | /api/auth/passkeys/fulfill-renewal/:requestToken | Private | Fulfill passkey renewal |
| POST | /api/auth/admin/profile-links/attach | Private | Attach operational profile to user |
| POST | /api/auth/admin/profile-links/detach | Private | Detach operational profile from user |
| POST | /api/auth/admin/profile-links/reassign | Private | Reassign operational profile |
| GET | /api/auth/admin/registration-overrides/audits | Private | Query legal override audit log |

### Agents

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | /api/agents | Private | List agents |
| POST | /api/agents | Private | Create agent |
| GET | /api/agents/:id | Private | Get agent by id |
| PUT | /api/agents/:id | Private | Update agent |
| DELETE | /api/agents/:id | Private | Delete agent |
| GET | /api/agents/available/list | Private | List available agents |
| GET | /api/agents/top-rated | Private | List top-rated agents |
| GET | /api/agents/specialization/:specialization | Private | List agents by specialization |
| GET | /api/agents/:id/performance | Private | Get agent performance metrics |
| PATCH | /api/agents/:id/availability | Private | Update availability |
| PATCH | /api/agents/:id/location | Private | Update live location |
| PATCH | /api/agents/:id/self-dispatch-access | Private | Update self-dispatch access |

### Customers

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | /api/customers | Private | List customers |
| POST | /api/customers | Private | Create customer |
| GET | /api/customers/:id | Private | Get customer by id |
| PUT | /api/customers/:id | Private | Update customer |
| DELETE | /api/customers/:id | Private | Delete customer |
| GET | /api/customers/:id/sites | Private | List customer sites |
| POST | /api/customers/:id/sites | Private | Add customer site |
| PUT | /api/customers/:id/sites/:siteId | Private | Update customer site |
| DELETE | /api/customers/:id/sites/:siteId | Private | Delete customer site |

### Service Calls

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | /api/service-calls | Private | List service calls |
| POST | /api/service-calls | Private | Create service call |
| GET | /api/service-calls/:id | Private | Get service call by id |
| PUT | /api/service-calls/:id | Private | Update service call |
| DELETE | /api/service-calls/:id | Private | Delete service call |
| GET | /api/service-calls/status/:status | Private | Filter by status |
| GET | /api/service-calls/agent/:agentId | Private | Filter by agent |
| GET | /api/service-calls/eligible-unassigned/:agentId | Private | Find eligible unassigned calls |
| POST | /api/service-calls/:id/self-accept | Private | Agent self-accept call |
| POST | /api/service-calls/:id/parts | Private | Add parts used |
| POST | /api/service-calls/:id/photos | Private | Upload job photos |
| POST | /api/service-calls/:id/rating | Private | Submit service rating |

### Equipment

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | /api/equipment | Private | List equipment |
| POST | /api/equipment | Private | Create equipment |
| GET | /api/equipment/:id | Private | Get equipment by id |
| PUT | /api/equipment/:id | Private | Update equipment |
| DELETE | /api/equipment/:id | Private | Delete equipment |
| GET | /api/equipment/warranty-status | Private | Equipment warranty summary |
| GET | /api/equipment/customer/:customerId | Private | Equipment by customer |
| GET | /api/equipment/site/:customerId/:siteId | Private | Equipment by site |
| GET | /api/equipment/:id/service-history | Private | Equipment service history |

### Quotations

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | /api/quotations | Private | List quotations |
| POST | /api/quotations | Private | Create quotation |
| GET | /api/quotations/:id | Private | Get quotation by id |
| PUT | /api/quotations/:id | Private | Update quotation |
| PATCH | /api/quotations/:id/status | Private | Update quotation status |
| DELETE | /api/quotations/:id | Private | Delete quotation |
| POST | /api/quotations/from-service-call/:serviceCallId | Private | Create quotation from service call |
| POST | /api/quotations/:id/send | Private | Send quotation to customer |
| POST | /api/quotations/:id/convert | Private | Convert quotation to service call |
| GET | /api/quotations/:id/pdf | Private | Generate private quotation PDF |
| GET | /api/quotations/share/:token/pdf | Public | Public shared quotation PDF |

### Invoices

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | /api/invoices | Private | List invoices |
| POST | /api/invoices | Private | Create invoice |
| GET | /api/invoices/:id | Private | Get invoice by id |
| PUT | /api/invoices/:id | Private | Update invoice |
| DELETE | /api/invoices/:id | Private | Delete invoice |
| PATCH | /api/invoices/:id/workflow-status | Private | Update workflow status |
| POST | /api/invoices/:id/finalize | Private | Finalize invoice |
| POST | /api/invoices/:id/send | Private | Send invoice |
| POST | /api/invoices/:id/payment | Private | Record payment |
| GET | /api/invoices/:id/pdf | Private | Generate invoice PDF |
| POST | /api/invoices/from-service-call/:serviceCallId/pro-forma | Private | Upsert pro-forma from service call |
| GET | /api/invoices/overdue/summary | Private | Overdue summary |
| GET | /api/invoices/payment-status/:status | Private | Filter by payment status |
| GET | /api/invoices/share/:token | Public | Public invoice details |
| POST | /api/invoices/share/:token/decision | Public | Submit public approval decision |
| GET | /api/invoices/share/:token/pdf | Public | Public shared invoice PDF |

### Example Routes (Utility or Template)

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | /api/example | Public | Example list |
| GET | /api/example/:id | Public | Example by id |
| POST | /api/example | Public | Example create |
| PUT | /api/example/:id | Public | Example update |
| DELETE | /api/example/:id | Public | Example delete |

## API Management Plan

## 1. Governance and Ownership

### API Owners

- Product owner: defines contract expectations and business rules
- Backend owner: route and controller implementation authority
- Frontend owner: API consumption authority and UX contract checks
- QA owner: test coverage and regression gatekeeper

### Domain Owner Matrix

This matrix is tailored to the current two-person team:

- Full-Stack Developer and Web Designer: implementation owner
- Business Analyst and Project Manager: requirements, acceptance, and release owner

| API Domain | Primary Owner | Secondary Owner | Mandatory Reviewers | Target SLA for Change Review |
| --- | --- | --- | --- | --- |
| System | Full-Stack Developer and Web Designer | Business Analyst and Project Manager | Business Analyst and Project Manager | 2 business days |
| Auth | Full-Stack Developer and Web Designer | Business Analyst and Project Manager | Business Analyst and Project Manager | 1 business day |
| Agents | Full-Stack Developer and Web Designer | Business Analyst and Project Manager | Business Analyst and Project Manager | 2 business days |
| Customers | Full-Stack Developer and Web Designer | Business Analyst and Project Manager | Business Analyst and Project Manager | 2 business days |
| Service Calls | Full-Stack Developer and Web Designer | Business Analyst and Project Manager | Business Analyst and Project Manager | 2 business days |
| Equipment | Full-Stack Developer and Web Designer | Business Analyst and Project Manager | Business Analyst and Project Manager | 2 business days |
| Quotations | Full-Stack Developer and Web Designer | Business Analyst and Project Manager | Business Analyst and Project Manager | 2 business days |
| Invoices | Full-Stack Developer and Web Designer | Business Analyst and Project Manager | Business Analyst and Project Manager | 1 business day |
| Public Share Endpoints | Full-Stack Developer and Web Designer | Business Analyst and Project Manager | Business Analyst and Project Manager | 1 business day |

### Approval Flow by Change Type

| Change Type | Required Approvals | Required Verification |
| --- | --- | --- |
| New endpoint | Full-Stack Developer plus Business Analyst and Project Manager sign-off | Postman test + unit tests + docs update |
| Contract change (request or response) | Full-Stack Developer plus Business Analyst and Project Manager sign-off | Backward compatibility check + integration tests + docs update |
| Auth or role-policy change | Full-Stack Developer plus Business Analyst and Project Manager sign-off | Negative auth tests + role matrix checks + audit/log checks |
| Public share token behavior change | Full-Stack Developer plus Business Analyst and Project Manager sign-off | Token abuse tests + expiry tests + unauthorized access tests |
| Deprecation or removal | Full-Stack Developer plus Business Analyst and Project Manager sign-off | Deprecation notice + migration notes + release note entry |

### Required Rule

Any endpoint change must update this file in the same change set.

## 2. Change Lifecycle

### Stage A: Propose

For each new or changed endpoint, define:

- Method and path
- Request schema
- Response schema
- Auth and role requirements
- Error cases and status codes

### Stage B: Implement

- Add or update route in server/routes
- Add or update controller behavior in server/controllers
- Add model validation in server/models as required
- Add or update frontend integration points

### Stage C: Verify

- Add or update Postman tests
- Add or update unit tests
- Validate auth, negative, and role-based access behavior

### Stage D: Document

- Update this API_COLLECTION.md registry
- Update README API section for user-facing changes
- Update AI_ASSISTANT_GUIDE.md recent changes log

## 3. API Design Standards

- Use plural resource naming for collection routes
- Use nouns for resources and action suffix only where domain actions are required
- Keep response shape stable where possible
- Use explicit HTTP status codes
- Validate request payloads before persistence
- Avoid silent coercion of business-critical enum values

## 4. Security Standards

- Private endpoints must use protect middleware
- Role-restricted endpoints must use explicit authorizeRoles checks
- Never log secrets, passwords, or raw tokens
- Keep public tokenized share endpoints scoped, minimal, and auditable

## 5. Versioning and Deprecation

### Current Strategy

- Single active version under /api
- Backward compatibility preferred for non-breaking additions

### Planned Strategy

- Introduce /api/v2 when incompatible payload or behavior changes are required
- Mark deprecated endpoints in this document with:
  - Deprecation date
  - Planned removal date
  - Replacement endpoint

## 6. Integration Testing Plan

### Contract and Regression Coverage

- Postman collection for end-to-end flow validation
- Security negative tests are mandatory and blocking on failure
- Unit tests for controller and middleware behavior

### Required Test Types per Changed Endpoint

- Happy path
- Validation errors
- Authorization failures
- Role mismatch
- Edge-case business rules

## 7. Operational Review Cadence

- Weekly API review: endpoint drift, auth drift, and docs alignment
- Release review: verify all changed endpoints documented and tested
- Quarterly cleanup: remove dead routes and stale docs

### Weekly API Review Ritual

Run this as a 30-minute standing session once per week.

#### Participants

- Full-Stack Developer and Web Designer
- Business Analyst and Project Manager

#### Agenda (30 Minutes)

1. 5 min: Review API changes merged since last review
2. 5 min: Confirm endpoint inventory is still accurate in this file
3. 5 min: Check auth and role-policy changes for regression risk
4. 5 min: Check Postman and unit-test coverage for changed endpoints
5. 5 min: Validate current open API risks and blockers
6. 5 min: Assign action items and due dates

#### Weekly Outputs

- Updated API_COLLECTION.md if any endpoint or policy changed
- Updated Open Tracking Items with statuses and owners
- Go or no-go note for any release-impacting API risk
- Action list for the next sprint week

#### Done Criteria for the Ritual (Clear Pass or Fail)

- Pass only if endpoint inventory has zero undocumented changes
- Pass only if critical auth or security test failures are zero
- Pass only if every new API action item has owner, due date, and verification method
- Pass only if weekly outputs are published in this document before the session closes

## 8. API Change Checklist Template

Use this checklist for every API change:

- [ ] Route updated
- [ ] Controller logic updated
- [ ] Model validation aligned
- [ ] Frontend integration updated
- [ ] Postman tests added or updated
- [ ] Unit tests added or updated
- [ ] API_COLLECTION.md updated
- [ ] README updated if user-facing behavior changed
- [ ] AI_ASSISTANT_GUIDE.md updated in Recent Changes

## 9. Definition of Done for API Changes

An API change is done only when every item below is satisfied:

- Contract approved: method, path, request shape, response shape, and status codes are confirmed
- Implementation aligned: route, controller, and model behavior match the approved contract
- Auth enforced: required protect and role-policy checks are in place and tested
- Validation complete: required fields, invalid payloads, and edge cases return expected errors
- Integration verified: frontend consumer paths are updated and validated where applicable
- Test coverage complete: Postman and unit tests cover happy path, validation failures, and authorization failures
- Documentation updated: API_COLLECTION.md updated in the same change set
- User-facing docs updated: README updated if external behavior changed
- Change log updated: AI_ASSISTANT_GUIDE.md Recent Changes updated when architecture, policy, or workflow changed
- Risk state clean: zero open critical auth, security, or data-integrity defects

### Merge Gate Rule

If any Definition of Done item is incomplete, the API change is not merge-ready.

## 10. Open Tracking Items

Use this section to track pending API architecture work.

### Suggested Initial Items

- Align customerType contract across UI and backend enum values
- Define canonical error response envelope for all controllers
- Add endpoint-level ownership map per domain
- Add request and response JSON schema references per endpoint
