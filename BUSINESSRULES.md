# Business Rules Reference

Last updated: 2026-04-13

## Purpose

This file consolidates the business rules currently distributed across models, controllers, middleware, and project documentation.

It is a human-readable reference, not an executable source of truth.
The actual enforced rules still live in code.

Primary source files used:
- `FIELD_PERMISSIONS.md`
- `AUTH_GUIDE.md`
- `SECURITY.md`
- `MVP_ROADMAP.md`
- `server/models/*.js`
- `server/controllers/*.js`
- `server/middleware/auth.middleware.js`

## Status Legend

- `[ENFORCED]` = implemented in current backend/frontend logic and/or schema validation
- `[PARTIAL]` = implemented in part, but with gaps, inconsistencies, or missing end-to-end coverage
- `[POLICY]` = desired operating rule or architectural intent, not fully enforced in code yet
- `[TESTED]` = implemented behavior that is covered by at least one automated test; this is a verification label used alongside status, not a replacement for status
- `[UNTESTED]` = no automated test evidence is currently identified for the block or rule

## Test Coverage Tags

- `[UNIT]` = directly covered by current Jest unit tests
- `[POSTMAN]` = directly covered by current Postman collection tests
- `[UNIT+POSTMAN]` = covered by both
- `[NONE]` = no current automated coverage identified for that rule block

Verification usage:
- Use `Status:` to describe implementation/enforcement state.
- Use `Verification: [TESTED]` only when the listed coverage/test files demonstrate automated proof for that block or rule.
- Use `Verification: [UNTESTED]` when no automated proof is currently identified.

## Rule ID Scheme

- Core principles: `BR-CORE-XXX`
- Authentication and identity: `BR-AUTH-XXX`
- Registration and provisioning: `BR-REG-XXX`
- User profile and field protection: `BR-UPRO-XXX`
- Field service agent: `BR-AGENT-XXX`
- Customer: `BR-CUST-XXX`
- Service call: `BR-SCALL-XXX`
- Self-dispatch: `BR-DISP-XXX`
- Quotation: `BR-QUOTE-XXX`
- Quote email lock: `BR-QLOCK-XXX`
- Pricing and costing: `BR-PRICE-XXX`
- Invoice: `BR-INV-XXX`
- Security and audit: `BR-SEC-XXX`
- Operational data quality: `BR-DATA-XXX`

## At-A-Glance Classification

- `[POLICY]` Core domain principles, future hardening recommendations, and some security hygiene rules
- `[ENFORCED]` Authentication, customer structure, prospect-first quote conversion, service-call guards, self-dispatch, quotation lifecycle, quote email locks, and most pricing logic
- `[PARTIAL]` Registration/provisioning UX completeness, some invoice lifecycle expectations, and sequential ID robustness for all entities

## 1. Core Domain Principles

Status: `[POLICY]`
Verification: `[UNTESTED]`
Coverage: `[NONE]` Test files: none identified.

Source files:
- `MVP_ROADMAP.md`
- `README.md`
- `AI_ASSISTANT_GUIDE.md`
- `PROJECT-STRUCTURE.md`

1. `BR-CORE-001` The platform models a full field-service lifecycle:
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.
   service call -> quotation -> approval/conversion -> invoice -> payment.
2. `BR-CORE-002` Not every prospect is a customer.
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.
3. `BR-CORE-003` Customer and portal user records should represent real converted business, not every inbound lead.
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.
4. `BR-CORE-004` Legal, identity, and financial identifiers are protected from casual editing.
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.
5. `BR-CORE-005` Multi-role operation is foundational:
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.
   `superAdmin`, `businessAdministrator`, `fieldServiceAgent`, `customer`.

## 2. Authentication And Identity Rules

Status: `[ENFORCED]`
Verification: `[TESTED]`
Coverage: `[UNIT]` Test files: `server/tests/unit/middleware/auth.middleware.test.js`, `server/tests/unit/controllers/auth.controller.test.js`.

Source files:
- `server/middleware/auth.middleware.js`
- `server/controllers/auth.controller.js`
- `server/models/User.model.js`
- `AUTH_GUIDE.md`

1. `BR-AUTH-001` Every protected API route requires a valid JWT bearer token.
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/middleware/auth.middleware.test.js`, `server/tests/unit/controllers/auth.controller.test.js`.
2. `BR-AUTH-002` A valid token is not sufficient if the user no longer exists in the database.
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/middleware/auth.middleware.test.js`, `server/tests/unit/controllers/auth.controller.test.js`.
   Result: `401 Not authorized, user not found`.
3. `BR-AUTH-003` Supported principal roles are:
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/middleware/auth.middleware.test.js`, `server/tests/unit/controllers/auth.controller.test.js`.
   `superAdmin`, `businessAdministrator`, `fieldServiceAgent`, `customer`.
4. `BR-AUTH-004` `fieldServiceAgent` accounts must be linked to a `fieldServiceAgentProfile`.
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/middleware/auth.middleware.test.js`, `server/tests/unit/controllers/auth.controller.test.js`.
5. `BR-AUTH-005` `customer` accounts must be linked to a `customerProfile`.
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/middleware/auth.middleware.test.js`, `server/tests/unit/controllers/auth.controller.test.js`.
6. `BR-AUTH-006` Admin roles must not be linked to operational customer or field-agent profiles.
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/middleware/auth.middleware.test.js`, `server/tests/unit/controllers/auth.controller.test.js`.
7. `BR-AUTH-007` A field agent cannot be linked to a customer profile.
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/middleware/auth.middleware.test.js`, `server/tests/unit/controllers/auth.controller.test.js`.
8. `BR-AUTH-008` A customer cannot be linked to a field-agent profile.
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/middleware/auth.middleware.test.js`, `server/tests/unit/controllers/auth.controller.test.js`.
9. `BR-AUTH-009` Passwords are always hashed before persistence.
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/middleware/auth.middleware.test.js`, `server/tests/unit/controllers/auth.controller.test.js`.
10. `BR-AUTH-010` Password reset tokens are one-time, stored hashed, and expire after 1 hour.
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/middleware/auth.middleware.test.js`, `server/tests/unit/controllers/auth.controller.test.js`.
11. `BR-AUTH-011` Customer and field-agent operational profiles are one-to-one with their linked `User` principals.
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/middleware/auth.middleware.test.js`, `server/tests/unit/controllers/auth.controller.test.js`.

## 3. Registration And Provisioning Rules

Status: `[PARTIAL]`
Verification: `[TESTED]`
Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/auth.controller.test.js`, `server/tests/unit/utils/emailService.test.js`.

Source files:
- `server/controllers/auth.controller.js`
- `server/models/User.model.js`
- `server/models/OnboardingPasskey.model.js`
- `server/utils/emailService.js`
- `AUTH_GUIDE.md`

Notes:
- Rules 1 to 8 are enforced in current auth and provisioning logic.
- Rule 9 is only partially enforced end to end because admin-provisioned customer accounts still do not have a dedicated customer welcome-email flow; they do get reset-token generation, and quote-acceptance conversion sends a password-set email.

1. `BR-REG-001` Public registration requires at least:
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/auth.controller.test.js`, `server/tests/unit/utils/emailService.test.js`.
   `userName`, `email`, `password`.
2. `BR-REG-002` `superAdmin` and `customer` roles require:
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/auth.controller.test.js`, `server/tests/unit/utils/emailService.test.js`.
   `businessName`, `phoneNumber`, `physicalAddress`.
3. `BR-REG-003` `fieldServiceAgent` registration requires a linked `fieldServiceAgentProfileId`.
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/auth.controller.test.js`, `server/tests/unit/utils/emailService.test.js`.
4. `BR-REG-004` `customer` registration requires a linked `customerProfileId`.
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/auth.controller.test.js`, `server/tests/unit/utils/emailService.test.js`.
5. `BR-REG-005` `businessAdministrator` and `fieldServiceAgent` registrations require a valid one-time passkey.
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/auth.controller.test.js`, `server/tests/unit/utils/emailService.test.js`.
6. `BR-REG-006` Passkeys are time-limited.
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/auth.controller.test.js`, `server/tests/unit/utils/emailService.test.js`.
7. `BR-REG-007` Admin provisioning is allowed for `fieldServiceAgent` and `customer` roles only.
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/auth.controller.test.js`, `server/tests/unit/utils/emailService.test.js`.
8. `BR-REG-008` Admin provisioning must not proceed if the target operational profile is already linked to a user.
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/auth.controller.test.js`, `server/tests/unit/utils/emailService.test.js`.
9. `BR-REG-009` Provisioned users receive random internal passwords and must set their own password through a reset flow.
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/auth.controller.test.js`, `server/tests/unit/utils/emailService.test.js`.

## 4. User Profile Field Protection Rules

Status: `[ENFORCED]`
Verification: `[TESTED]`
Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/auth.controller.test.js`.

Source files:
- `server/controllers/auth.controller.js`
- `server/models/User.model.js`
- `FIELD_PERMISSIONS.md`

### Immutable / Protected User Fields

Verification: `[TESTED]`
Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/auth.controller.test.js`.

Source files:
- `server/models/User.model.js`
- `server/controllers/auth.controller.js`
- `FIELD_PERMISSIONS.md`

These must not be updated through normal profile updates:
- `userName`
- `businessName`
- `businessRegistrationNumber`
- `createdAt`
- `_id`
- `isSuperUser`
- `role`
- `fieldServiceAgentProfile`
- `customerProfile`

### Editable User Fields

Verification: `[TESTED]`
Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/auth.controller.test.js`.

Source files:
- `server/models/User.model.js`
- `server/controllers/auth.controller.js`

These are allowed through profile update flows:
- `email`
- `password`
- `taxNumber`
- `vatNumber`
- `phoneNumber`
- `physicalAddress`
- `websiteAddress`
- `isActive`

### Write-Once Registration Identifier Policy

Verification: `[TESTED]`
Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/auth.controller.test.js`.

Source files:
- `server/controllers/auth.controller.js`
- `server/models/User.model.js`
- `FIELD_PERMISSIONS.md`

1. `BR-UPRO-001` `businessRegistrationNumber`, `taxNumber`, and `vatNumber` are write-once for non-superAdmin users.
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/auth.controller.test.js`.
2. `BR-UPRO-002` If empty, a non-superAdmin may capture the initial value.
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/auth.controller.test.js`.
3. `BR-UPRO-003` Once populated, non-superAdmin updates must be blocked.
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/auth.controller.test.js`.
4. `BR-UPRO-004` SuperAdmin override requires legal evidence:
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/auth.controller.test.js`.
   - `legalDocumentType`
   - `legalDocumentReference`
   - `legalDocumentUri` as valid `http(s)` URL
   - `legalChangeReason` with minimum 15 characters
5. `BR-UPRO-005` Overrides must create an audit trail.
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/auth.controller.test.js`.

## 5. Field Service Agent Rules

Status: `[ENFORCED]`
Verification: `[TESTED]`
Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/agent.controller.test.js`.

Source files:
- `server/models/FieldServiceAgent.model.js`
- `server/controllers/agent.controller.js`
- `server/controllers/serviceCall.controller.js`

1. `BR-AGENT-001` Agent `firstName`, `lastName`, and `employeeId` are immutable after creation.
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/agent.controller.test.js`.
2. `BR-AGENT-002` Agent `employeeId` is a system-controlled identifier.
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/agent.controller.test.js`.
3. `BR-AGENT-003` Agent status is one of:
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/agent.controller.test.js`.
   `active`, `inactive`, `on-leave`.
4. `BR-AGENT-004` Agent availability is one of:
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/agent.controller.test.js`.
   `available`, `busy`, `off-duty`.
5. `BR-AGENT-005` Agent ratings are bounded between 0 and 5.
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/agent.controller.test.js`.
6. `BR-AGENT-006` Agent specializations are currently restricted to:
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/agent.controller.test.js`.
   `HVAC_REFRIGERATION`, `ELECTRICAL`, `PLUMBING`, `GENERAL_MAINTENANCE`.
7. `BR-AGENT-007` Agents may be suspended from self-dispatch.
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/agent.controller.test.js`.
8. `BR-AGENT-008` Agent category is required at registration and must be one of the supported starter categories (Mechanical, Electrical, Plumbing, General Maintenance, Fencing Solutions, CCTV and Security Solutions, HVAC and Refrigeration Solutions, Appliance Repairs), while the system may also accept legacy mapped categories for older records.
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/agent.controller.test.js`.

## 6. Customer Rules

Status: `[ENFORCED]`
Verification: `[TESTED]`
Coverage: `[UNIT+POSTMAN]` Test files: `server/tests/unit/controllers/customer.controller.test.js`, `server/tests/postman/register_customers_collection.json`.

Source files:
- `server/models/Customer.model.js`
- `server/controllers/customer.controller.js`
- `server/controllers/quotation.controller.js`

### Customer Types

Verification: `[TESTED]`
Coverage: `[UNIT+POSTMAN]` Test files: `server/tests/unit/controllers/customer.controller.test.js`, `server/tests/postman/register_customers_collection.json`.

Source files:
- `server/models/Customer.model.js`
- `server/controllers/customer.controller.js`

Supported customer profile types:
- `headOffice`
- `branch`
- `franchise`
- `singleBusiness`
- `residential`

### Structural Customer Rules

Verification: `[TESTED]`
Coverage: `[UNIT+POSTMAN]` Test files: `server/tests/unit/controllers/customer.controller.test.js`, `server/tests/postman/register_customers_collection.json`.

Source files:
- `server/models/Customer.model.js`
- `server/controllers/customer.controller.js`

1. `BR-CUST-001` `headOffice`, `branch`, `franchise`, and `singleBusiness` are treated as business account types.
   Verification: `[TESTED]`
   Coverage: `[UNIT+POSTMAN]` Test files: `server/tests/unit/controllers/customer.controller.test.js`, `server/tests/postman/register_customers_collection.json`.
2. `BR-CUST-002` Business customer types require a `businessName`.
   Verification: `[TESTED]`
   Coverage: `[UNIT+POSTMAN]` Test files: `server/tests/unit/controllers/customer.controller.test.js`, `server/tests/postman/register_customers_collection.json`.
3. `BR-CUST-003` Business customer types must have at least one site.
   Verification: `[TESTED]`
   Coverage: `[UNIT+POSTMAN]` Test files: `server/tests/unit/controllers/customer.controller.test.js`, `server/tests/postman/register_customers_collection.json`.
4. `BR-CUST-004` `residential` customers require a physical address.
   Verification: `[TESTED]`
   Coverage: `[UNIT+POSTMAN]` Test files: `server/tests/unit/controllers/customer.controller.test.js`, `server/tests/postman/register_customers_collection.json`.
5. `BR-CUST-005` `customerId` is system-generated and immutable.
   Verification: `[TESTED]`
   Coverage: `[UNIT+POSTMAN]` Test files: `server/tests/unit/controllers/customer.controller.test.js`, `server/tests/postman/register_customers_collection.json`.
6. `BR-CUST-006` `customerType` is immutable after creation.
   Verification: `[TESTED]`
   Coverage: `[UNIT+POSTMAN]` Test files: `server/tests/unit/controllers/customer.controller.test.js`, `server/tests/postman/register_customers_collection.json`.
7. `BR-CUST-007` `createdBy` is immutable after creation.
   Verification: `[TESTED]`
   Coverage: `[UNIT+POSTMAN]` Test files: `server/tests/unit/controllers/customer.controller.test.js`, `server/tests/postman/register_customers_collection.json`.
8. `BR-CUST-008` Customer email is unique.
   Verification: `[TESTED]`
   Coverage: `[UNIT+POSTMAN]` Test files: `server/tests/unit/controllers/customer.controller.test.js`, `server/tests/postman/register_customers_collection.json`.
9. `BR-CUST-009` Customer `userAccount` is one-to-one and sparse/optional.
   Verification: `[TESTED]`
   Coverage: `[UNIT+POSTMAN]` Test files: `server/tests/unit/controllers/customer.controller.test.js`, `server/tests/postman/register_customers_collection.json`.

### Prospect-First Conversion Policy

Status: `[ENFORCED]`
Verification: `[TESTED]`
Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/serviceCall.controller.test.js`, `server/tests/unit/controllers/quotation.controller.test.js`.

Source files:
- `server/controllers/serviceCall.controller.js`
- `server/controllers/quotation.controller.js`
- `server/models/Quotation.model.js`
- `server/tests/unit/controllers/serviceCall.controller.test.js`
- `server/tests/unit/controllers/quotation.controller.test.js`

1. `BR-CUST-010` A prospect is not automatically a customer.
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/serviceCall.controller.test.js`, `server/tests/unit/controllers/quotation.controller.test.js`.
2. `BR-CUST-011` Booking-request service calls may exist without a linked `Customer` record.
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/serviceCall.controller.test.js`, `server/tests/unit/controllers/quotation.controller.test.js`.
3. `BR-CUST-012` Quotations may be sent to prospects before any customer portal account exists.
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/serviceCall.controller.test.js`, `server/tests/unit/controllers/quotation.controller.test.js`.
4. `BR-CUST-013` The first true conversion point is quotation acceptance.
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/serviceCall.controller.test.js`, `server/tests/unit/controllers/quotation.controller.test.js`.
5. `BR-CUST-014` Only after quote acceptance should the system create:
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/serviceCall.controller.test.js`, `server/tests/unit/controllers/quotation.controller.test.js`.
   - the `Customer` record
   - the linked customer `User` principal
6. `BR-CUST-015` This policy exists to avoid stale customer and auth records for non-converted leads.
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/serviceCall.controller.test.js`, `server/tests/unit/controllers/quotation.controller.test.js`.

## 7. Service Call Rules

Status: `[ENFORCED]`
Verification: `[TESTED]`
Coverage: `[UNIT+POSTMAN]` Test files: `server/tests/unit/controllers/serviceCall.controller.test.js`, `server/tests/postman/register_customers_collection.json`.

Source files:
- `server/models/ServiceCall.model.js`
- `server/controllers/serviceCall.controller.js`
- `server/models/ServiceCallEmailLock.model.js`

### Creation Rules

Verification: `[TESTED]`
Coverage: `[UNIT+POSTMAN]` Test files: `server/tests/unit/controllers/serviceCall.controller.test.js`, `server/tests/postman/register_customers_collection.json`.

Source files:
- `server/models/ServiceCall.model.js`
- `server/controllers/serviceCall.controller.js`

1. `BR-SCALL-001` A service call requires:
   Verification: `[TESTED]`
   Coverage: `[UNIT+POSTMAN]` Test files: `server/tests/unit/controllers/serviceCall.controller.test.js`, `server/tests/postman/register_customers_collection.json`.
   `title`, `description`, `serviceType`.
2. `BR-SCALL-002` A service call also requires either:
   Verification: `[TESTED]`
   Coverage: `[UNIT+POSTMAN]` Test files: `server/tests/unit/controllers/serviceCall.controller.test.js`, `server/tests/postman/register_customers_collection.json`.
   - a linked `customer`, or
   - `bookingRequest` data.
3. `BR-SCALL-003` `callNumber` is immutable and system-generated if not supplied.
   Verification: `[TESTED]`
   Coverage: `[UNIT+POSTMAN]` Test files: `server/tests/unit/controllers/serviceCall.controller.test.js`, `server/tests/postman/register_customers_collection.json`.
4. `BR-SCALL-004` `priority` must be one of:
   Verification: `[TESTED]`
   Coverage: `[UNIT+POSTMAN]` Test files: `server/tests/unit/controllers/serviceCall.controller.test.js`, `server/tests/postman/register_customers_collection.json`.
   `low`, `medium`, `high`, `urgent`.
5. `BR-SCALL-005` `status` must be one of:
   Verification: `[TESTED]`
   Coverage: `[UNIT+POSTMAN]` Test files: `server/tests/unit/controllers/serviceCall.controller.test.js`, `server/tests/postman/register_customers_collection.json`.
   `pending`, `scheduled`, `assigned`, `in-progress`, `awaiting-quote-approval`, `on-hold`, `completed`, `invoiced`, `cancelled`.
6. `BR-SCALL-006` `createdByRole` must be one of:
   Verification: `[TESTED]`
   Coverage: `[UNIT+POSTMAN]` Test files: `server/tests/unit/controllers/serviceCall.controller.test.js`, `server/tests/postman/register_customers_collection.json`.
   `superadmin`, `agent`, `customer`.

### Booking Request / Prospect Rules

Verification: `[TESTED]`
Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/serviceCall.controller.test.js`.

Source files:
- `server/controllers/serviceCall.controller.js`
- `server/models/ServiceCall.model.js`
- `server/models/Customer.model.js`

1. `BR-SCALL-007` If a booking request email matches an existing customer in the same tenant, the service call should link to that customer.
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/serviceCall.controller.test.js`.
2. `BR-SCALL-008` If no matching customer exists, the service call remains prospect-only.
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/serviceCall.controller.test.js`.
3. `BR-SCALL-009` The system must not auto-create a customer profile merely because a booking request exists.
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/serviceCall.controller.test.js`.
4. `BR-SCALL-010` The booking request captures commercial context such as:
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/serviceCall.controller.test.js`.
   contact details, address, service history, quotation history, invoicing history, and preferred schedule.

### Service Call Date Selection Rules

Status: `[PARTIAL]`
Verification: `[UNTESTED]`
Coverage: `[NONE]` Test files: none identified.

Source files:
- `client/src/components/ServiceCallRegistration.jsx`
- `server/controllers/serviceCall.controller.js`

1. `BR-SCALL-016` For `first-service-call`, the form requires a preferred service-call date and must not require a date-of-last-service.
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.
2. `BR-SCALL-017` For `existing-customer`, the form requires both date-of-last-service and preferred next service-call date.
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.
3. `BR-SCALL-018` Booking users must explicitly declare whether outage window is applicable for the booking.
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.
4. `BR-SCALL-019` If outage window is declared applicable, both start and end date-time values are required.
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.
5. `BR-SCALL-020` If outage window is declared applicable, outage window end must be strictly later than outage window start.
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.
6. `BR-SCALL-021` For `existing-customer`, date-of-last-service may be auto-filled from prior records by contact email, but remains editable by the booking user.
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.

### Duplicate-Pending-Quote Guard

Status: `[ENFORCED]`
Verification: `[UNTESTED]`
Coverage: `[NONE]` Test files: none identified.

Source files:
- `server/controllers/serviceCall.controller.js`
- `server/models/ServiceCallEmailLock.model.js`
- `server/controllers/quotation.controller.js`

1. `BR-SCALL-011` If a pending quote email lock exists for a prospect/customer email, a new service call for that email should be blocked.
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.
2. `BR-SCALL-012` The error should explain that a quote is already awaiting resolution.
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.
3. `BR-SCALL-013` This applies whether the lead is linked by booking request email or by an existing customer record.
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.

### Service Call Update Rules

Verification: `[UNTESTED]`
Coverage: `[NONE]` Test files: none identified.

Source files:
- `server/models/ServiceCall.model.js`
- `server/controllers/serviceCall.controller.js`

1. `BR-SCALL-014` `callNumber`, `createdAt`, `_id`, and `createdBy` are immutable.
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.
2. `BR-SCALL-015` `agentAccepted` cannot be forced through the general update route; it must go through the dedicated self-accept flow.
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.

## 8. Self-Dispatch Rules

Status: `[ENFORCED]`
Verification: `[TESTED]`
Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/serviceCall.controller.test.js`, `server/tests/unit/controllers/agent.controller.test.js`.

Source files:
- `server/controllers/serviceCall.controller.js`
- `server/controllers/agent.controller.js`
- `server/models/FieldServiceAgent.model.js`
- `FIELD_AGENT_SELF_DISPATCH_API_DESIGN.md`

1. `BR-DISP-001` Only eligible field agents may self-accept work.
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/serviceCall.controller.test.js`, `server/tests/unit/controllers/agent.controller.test.js`.
2. `BR-DISP-002` Eligibility requires:
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/serviceCall.controller.test.js`, `server/tests/unit/controllers/agent.controller.test.js`.
   - linked agent profile exists
   - agent status is `active`
   - agent availability is `available`
   - agent is not self-dispatch suspended
3. `BR-DISP-003` Daily self-accept limit: 2 jobs.
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/serviceCall.controller.test.js`, `server/tests/unit/controllers/agent.controller.test.js`.
4. `BR-DISP-004` Weekly participation limit: 5 distinct participation days.
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/serviceCall.controller.test.js`, `server/tests/unit/controllers/agent.controller.test.js`.
5. `BR-DISP-005` Self-dispatch actions are audited inline on the service call.
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/serviceCall.controller.test.js`, `server/tests/unit/controllers/agent.controller.test.js`.
6. `BR-DISP-006` Dispatch lifecycle states are:
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/serviceCall.controller.test.js`, `server/tests/unit/controllers/agent.controller.test.js`.
   `admin-queue`, `self-dispatch-open`, `self-dispatch-claimed`, `self-dispatch-closed`.

## 9. Quotation Rules

Status: `[ENFORCED]`
Verification: `[TESTED]`
Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/quotation.controller.test.js`.

Source files:
- `server/models/Quotation.model.js`
- `server/controllers/quotation.controller.js`
- `server/utils/emailService.js`

### Quotation Structure

Verification: `[UNTESTED]`
Coverage: `[NONE]` Test files: none identified.

Source files:
- `server/models/Quotation.model.js`
- `server/controllers/quotation.controller.js`

1. `BR-QUOTE-001` `quotationNumber` is immutable and auto-generated.
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.
2. `BR-QUOTE-002` A quotation requires:
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.
   `serviceType`, `title`, and at least one line item.
3. `BR-QUOTE-003` A line item requires:
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.
   `description`, `quantity`, `unitPrice`.
4. `BR-QUOTE-004` `customer` is now optional until conversion.
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.
5. `BR-QUOTE-005` If no customer exists yet, `recipientSnapshot` stores prospect-facing delivery details.
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.

### Quotation Status Rules

Verification: `[UNTESTED]`
Coverage: `[NONE]` Test files: none identified.

Source files:
- `server/models/Quotation.model.js`
- `server/controllers/quotation.controller.js`

Allowed quotation statuses:
- `draft`
- `sent`
- `approved`
- `rejected`
- `expired`
- `converted`

### Quotation Edit Rules

Verification: `[UNTESTED]`
Coverage: `[NONE]` Test files: none identified.

Source files:
- `server/models/Quotation.model.js`
- `server/controllers/quotation.controller.js`

1. `BR-QUOTE-006` Converted quotations cannot be edited.
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.
2. `BR-QUOTE-007` Approved quotations cannot have line items edited.
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.
3. `BR-QUOTE-008` Immutable quotation fields cannot be changed.
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.

### Quotation Delivery Rules

Source files:
- `server/controllers/quotation.controller.js`
- `server/utils/emailService.js`
- `server/models/Quotation.model.js`

1. `BR-QUOTE-009` Supported delivery channels are:
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.
   `email`, `whatsapp`, `telegram`.
2. `BR-QUOTE-010` An empty `channels` array means portal-only publication with no external dispatch.
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.
3. `BR-QUOTE-011` A non-empty invalid channels array must be rejected.
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.
4. `BR-QUOTE-012` Sending a quotation generates a secure share token if one does not exist.
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.
5. `BR-QUOTE-013` Share tokens use a cryptographically random 24-byte hex string.
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.
6. `BR-QUOTE-014` Share tokens expire at `validUntil` if no explicit expiry exists.
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.
7. `BR-QUOTE-015` Sending via email requires an email address.
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.
8. `BR-QUOTE-016` Delivery may use linked customer data or `recipientSnapshot` fallback data.
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.

### Prospect Conversion On Acceptance

Status: `[ENFORCED]`
Verification: `[TESTED]`
Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/quotation.controller.test.js`.

Source files:
- `server/controllers/quotation.controller.js`
- `server/models/Quotation.model.js`
- `server/models/Customer.model.js`
- `server/models/User.model.js`
- `server/utils/emailService.js`
- `server/tests/unit/controllers/quotation.controller.test.js`

1. `BR-QUOTE-017` Public quote acceptance is allowed only when quotation status is `sent`.
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/quotation.controller.test.js`.
2. `BR-QUOTE-018` If the quote is already `approved`, `rejected`, `converted`, `expired`, or still `draft`, acceptance must be blocked.
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/quotation.controller.test.js`.
3. `BR-QUOTE-019` If a `Customer` does not yet exist at acceptance time:
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/quotation.controller.test.js`.
   - create the customer
   - link the service call to that customer
   - create the customer portal user
   - generate and email a password-set link
4. `BR-QUOTE-020` Acceptance moves the linked service call to `in-progress` unless it is already terminal.
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/quotation.controller.test.js`.
5. `BR-QUOTE-021` Rejection is allowed only while the quotation is still `sent`.
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/quotation.controller.test.js`.
6. `BR-QUOTE-022` Rejection may store a rejection reason.
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/quotation.controller.test.js`.

### Quote To Service Call Rules

Verification: `[UNTESTED]`
Coverage: `[NONE]` Test files: none identified.

Source files:
- `server/controllers/quotation.controller.js`
- `server/controllers/serviceCall.controller.js`
- `server/models/Quotation.model.js`
- `server/models/ServiceCall.model.js`

1. `BR-QUOTE-023` Creating a quotation from a service call should link the quotation back to the call.
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.
2. `BR-QUOTE-024` A linked service call moves to `awaiting-quote-approval` when the quotation is created, unless already terminal.
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.
3. `BR-QUOTE-025` Approved quotations may be converted into service-call execution state.
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.

## 10. Quote Email Lock Rules

Status: `[ENFORCED]`
Verification: `[UNTESTED]`

Source files:
- `server/models/ServiceCallEmailLock.model.js`
- `server/controllers/quotation.controller.js`
- `server/controllers/serviceCall.controller.js`

1. `BR-QLOCK-001` A `ServiceCallEmailLock` represents a prospect/customer email with an unresolved active quote.
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.
2. `BR-QLOCK-002` Locks are created or refreshed when a quotation is sent.
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.
3. `BR-QLOCK-003` Locks are removed when the quotation is resolved by:
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.
   `converted`, `rejected`, `expired`, or accepted conversion cleanup.
4. `BR-QLOCK-004` Locks auto-expire after 90 days using a TTL index.
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.
5. `BR-QLOCK-005` One email can have only one active lock at a time.
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.

## 11. Pricing And Costing Rules

Status: `[ENFORCED]`
Verification: `[UNTESTED]`
Coverage: `[NONE]` Test files: none identified.

Source files:
- `server/models/Quotation.model.js`
- `server/models/Invoice.model.js`
- `server/controllers/quotation.controller.js`
- `server/controllers/invoice.controller.js`

### Quotation Costing Rules

Verification: `[UNTESTED]`
Coverage: `[NONE]` Test files: none identified.

Source files:
- `server/models/Quotation.model.js`
- `server/controllers/quotation.controller.js`

1. `BR-PRICE-001` Default travel rate is `R8.50/km`.
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.
2. `BR-PRICE-002` Call-out floor applies when:
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.
   - distance is less than 45 km, and
   - travel time is less than 30 minutes.
3. `BR-PRICE-003` When the call-out floor applies, minimum travel charge is `R650`.
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.
4. `BR-PRICE-004` First site visit includes 15 minutes assessment allowance in the quotation model.
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.
5. `BR-PRICE-005` Labour rate defaults to `R650` for non-super users.
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.
6. `BR-PRICE-006` VAT defaults to 15%.
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.
7. `BR-PRICE-007` Parts fulfilment modes are:
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.
   `inHouseProcurement`, `thirdPartyDelivery`.

### Invoice Costing Rules

Verification: `[UNTESTED]`
Coverage: `[NONE]` Test files: none identified.

Source files:
- `server/models/Invoice.model.js`
- `server/controllers/invoice.controller.js`

1. `BR-PRICE-008` Invoice cost calculation mirrors core billing components:
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.
   parts, labour, travel, consumables, VAT.
2. `BR-PRICE-009` Invoice travel also uses:
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.
   - default `R8.50/km`
   - `R650` call-out floor under the same short-trip conditions.
3. `BR-PRICE-010` Payment terms default to 30 days.
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.
4. `BR-PRICE-011` Balance is always recalculated as `totalAmount - paidAmount`.
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.

## 12. Invoice Rules

Status: `[PARTIAL]`
Verification: `[TESTED]`
Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/invoice.controller.test.js`, `server/tests/unit/routes/invoice.routes.test.js`.

Source files:
- `server/models/Invoice.model.js`
- `server/controllers/invoice.controller.js`
- `server/utils/emailService.js`

Notes:
- Most invoice workflow, delivery, approval, and payment rules are enforced.
- The statement "A final invoice may be created from a completed service call" is currently more of a business expectation than a hard gate; the controller seeds from a service call but does not strictly block creation when the service call is not yet completed.

### Invoice Types And Workflow

Verification: `[TESTED]`
Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/invoice.controller.test.js`.

Source files:
- `server/models/Invoice.model.js`
- `server/controllers/invoice.controller.js`

Document types:
- `proForma`
- `final`

Workflow statuses:
- `draft`
- `awaitingApproval`
- `approved`
- `rejected`
- `finalized`

### Invoice Creation Rules

Verification: `[UNTESTED]`
Source files:
- `server/controllers/invoice.controller.js`
- `server/models/Invoice.model.js`
- `server/models/ServiceCall.model.js`

1. `BR-INV-001` An invoice requires:
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.
   `serviceCall`, `customer`, and at least one line item.
2. `BR-INV-002` A pro-forma invoice may be created from a service call.
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.
3. `BR-INV-003` `[PARTIAL]` A final invoice may be created from a completed service call.
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.
4. `BR-INV-004` A linked customer is mandatory before a pro-forma or final invoice may be created.
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.
5. `BR-INV-005` Final invoice creation is idempotent per service call.
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.
6. `BR-INV-006` Pro-forma invoice creation is idempotent per service call.
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.

### Invoice Editing Rules

Verification: `[UNTESTED]`
Source files:
- `server/controllers/invoice.controller.js`
- `server/models/Invoice.model.js`

1. `BR-INV-007` Fully paid invoices cannot be edited.
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.
2. `BR-INV-008` Immutable invoice fields cannot be changed.
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.
3. `BR-INV-009` Payment and billing calculations must be recalculated on edit.
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.

### Invoice Delivery Rules

Source files:
- `server/controllers/invoice.controller.js`
- `server/utils/emailService.js`
- `server/models/Invoice.model.js`

1. `BR-INV-010` Supported channels are:
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/invoice.controller.test.js`.
   `email`, `whatsapp`, `telegram`.
2. `BR-INV-011` Email channel requires a valid customer email.
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/invoice.controller.test.js`.
3. `BR-INV-012` WhatsApp requires a plausible phone number.
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/invoice.controller.test.js`.
4. `BR-INV-013` Sending a pro-forma while still in `draft` should move it to `awaitingApproval`.
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/invoice.controller.test.js`.
5. `BR-INV-014` Invoice share links are tokenized and expire after 14 days if not already set.
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/invoice.controller.test.js`.
6. `BR-INV-015` Public invoice approval is only valid for `proForma` documents.
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/invoice.controller.test.js`.

### Public Pro-Forma Approval Rules

Source files:
- `server/controllers/invoice.controller.js`
- `server/models/Invoice.model.js`

1. `BR-INV-016` Public decisions may only be `approved` or `rejected`.
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/invoice.controller.test.js`.
2. `BR-INV-017` Public approval must be blocked if the document is already `approved`, `rejected`, or `finalized`.
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/invoice.controller.test.js`.
3. `BR-INV-018` Public approval updates workflow audit history.
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/invoice.controller.test.js`.
4. `BR-INV-019` Approved pro-forma may later be finalized into a final invoice.
   Verification: `[TESTED]`
   Coverage: `[UNIT]` Test files: `server/tests/unit/controllers/invoice.controller.test.js`.

### Payment Rules

Verification: `[UNTESTED]`
Source files:
- `server/controllers/invoice.controller.js`
- `server/models/Invoice.model.js`

1. `BR-INV-020` Recording a payment requires:
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.
   `amount`, `method`.
2. `BR-INV-021` Payment amount must be greater than zero.
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.
3. `BR-INV-022` Payment amount must not exceed the current outstanding balance.
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.
4. `BR-INV-023` Payment methods are:
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.
   `cash`, `eft`, `card`, `credit`, `other`.
5. `BR-INV-024` Payment status rules:
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.
   - `unpaid` when `paidAmount = 0`
   - `partial` when `0 < paidAmount < totalAmount`
   - `paid` when `paidAmount >= totalAmount`
   - `overdue` when unpaid/partial and due date has passed

## 13. Security And Audit Rules

Status: `[PARTIAL]`
Verification: `[TESTED]`
Coverage: `[UNIT+POSTMAN]` Test files: `server/tests/unit/middleware/auth.middleware.test.js`, `server/tests/unit/controllers/auth.controller.test.js`, `server/tests/postman/register_customers_collection.json`.

Source files:
- `server/middleware/logger.middleware.js`
- `server/controllers/auth.controller.js`
- `server/models/User.model.js`
- `SECURITY.md`

Notes:
- Rules about secrets in source code and environment-variable-only secret handling are policy and discipline rules, not runtime-enforced application rules.
- Logging, audit trails, and protected-field rejection behavior are enforced.

1. `BR-SEC-001` `[POLICY]` Secrets must not be hardcoded in tracked source files.
   Verification: `[TESTED]`
   Coverage: `[UNIT+POSTMAN]` Test files: `server/tests/unit/middleware/auth.middleware.test.js`, `server/tests/unit/controllers/auth.controller.test.js`, `server/tests/postman/register_customers_collection.json`.
2. `BR-SEC-002` `[POLICY]` Environment variables are the approved secret source.
   Verification: `[TESTED]`
   Coverage: `[UNIT+POSTMAN]` Test files: `server/tests/unit/middleware/auth.middleware.test.js`, `server/tests/unit/controllers/auth.controller.test.js`, `server/tests/postman/register_customers_collection.json`.
3. `BR-SEC-003` `[ENFORCED]` Request logging must mask passwords.
   Verification: `[TESTED]`
   Coverage: `[UNIT+POSTMAN]` Test files: `server/tests/unit/middleware/auth.middleware.test.js`, `server/tests/unit/controllers/auth.controller.test.js`, `server/tests/postman/register_customers_collection.json`.
4. `BR-SEC-004` `[ENFORCED]` Stack traces should only be exposed in development.
   Verification: `[TESTED]`
   Coverage: `[UNIT+POSTMAN]` Test files: `server/tests/unit/middleware/auth.middleware.test.js`, `server/tests/unit/controllers/auth.controller.test.js`, `server/tests/postman/register_customers_collection.json`.
5. `BR-SEC-005` `[ENFORCED]` Profile-link changes must be auditable.
   Verification: `[TESTED]`
   Coverage: `[UNIT+POSTMAN]` Test files: `server/tests/unit/middleware/auth.middleware.test.js`, `server/tests/unit/controllers/auth.controller.test.js`, `server/tests/postman/register_customers_collection.json`.
6. `BR-SEC-006` `[ENFORCED]` Registration identifier overrides must be auditable.
   Verification: `[TESTED]`
   Coverage: `[UNIT+POSTMAN]` Test files: `server/tests/unit/middleware/auth.middleware.test.js`, `server/tests/unit/controllers/auth.controller.test.js`, `server/tests/postman/register_customers_collection.json`.
7. `BR-SEC-007` `[ENFORCED]` Financial and identity fields should fail closed when a protected update is attempted.
   Verification: `[TESTED]`
   Coverage: `[UNIT+POSTMAN]` Test files: `server/tests/unit/middleware/auth.middleware.test.js`, `server/tests/unit/controllers/auth.controller.test.js`, `server/tests/postman/register_customers_collection.json`.

## 14. Operational Data Quality Rules

Status: `[PARTIAL]`
Verification: `[TESTED]`
Coverage: `[UNIT+POSTMAN]` Test files: `server/tests/unit/controllers/agent.controller.test.js`, `server/tests/unit/controllers/customer.controller.test.js`, `server/tests/postman/register_customers_collection.json`.

Source files:
- `server/models/User.model.js`
- `server/models/Customer.model.js`
- `server/models/FieldServiceAgent.model.js`
- `server/models/ServiceCall.model.js`
- `server/models/Quotation.model.js`
- `server/models/Invoice.model.js`
- `server/models/ServiceCallEmailLock.model.js`
- `server/utils/sequence.util.js`

Notes:
- Duplicate prevention rules are enforced.
- Sequential identifier policy is fully enforced for agents and customers, but only partially robust for service calls, quotations, and invoices because those still use document-count generation rather than an atomic sequence counter.

1. `BR-DATA-001` Duplicate customer emails are not allowed.
   Verification: `[TESTED]`
   Coverage: `[UNIT+POSTMAN]` Test files: `server/tests/unit/controllers/agent.controller.test.js`, `server/tests/unit/controllers/customer.controller.test.js`, `server/tests/postman/register_customers_collection.json`.
2. `BR-DATA-002` Duplicate usernames are not allowed.
   Verification: `[TESTED]`
   Coverage: `[UNIT+POSTMAN]` Test files: `server/tests/unit/controllers/agent.controller.test.js`, `server/tests/unit/controllers/customer.controller.test.js`, `server/tests/postman/register_customers_collection.json`.
3. `BR-DATA-003` Duplicate operational profile links are not allowed.
   Verification: `[TESTED]`
   Coverage: `[UNIT+POSTMAN]` Test files: `server/tests/unit/controllers/agent.controller.test.js`, `server/tests/unit/controllers/customer.controller.test.js`, `server/tests/postman/register_customers_collection.json`.
4. `BR-DATA-004` Duplicate unresolved quotation emails are prevented through email locks.
   Verification: `[TESTED]`
   Coverage: `[UNIT+POSTMAN]` Test files: `server/tests/unit/controllers/agent.controller.test.js`, `server/tests/unit/controllers/customer.controller.test.js`, `server/tests/postman/register_customers_collection.json`.
5. `BR-DATA-005` `[PARTIAL]` System identifiers should be sequentially generated for:
   Verification: `[TESTED]`
   Coverage: `[UNIT+POSTMAN]` Test files: `server/tests/unit/controllers/agent.controller.test.js`, `server/tests/unit/controllers/customer.controller.test.js`, `server/tests/postman/register_customers_collection.json`.
   - agents: `AGT-XXXXXX`
   - customers: `CUST-XXXXXX`
   - service calls: `SC-XXXXXX`
   - quotations: `QT-XXXXXX`
   - invoices: `INV-XXXXXX`

## 15. Known Gaps / Rules Not Yet Fully Centralized

Status: `[POLICY]`
Verification: `[UNTESTED]`
Coverage: `[NONE]` Test files: none identified.

Source files:
- `MVP_ROADMAP.md`
- `PROJECT-STRUCTURE.md`
- `continuity/CURRENT_STATUS.md`
- `continuity/SESSION_2026-04-10_STARTUP.md`

1. `BR-CORE-006` Service category and skill taxonomy is not yet modeled as a dedicated data-driven master table.
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.
2. `BR-CORE-007` Some business rules still live only in UI behavior or planned roadmap notes.
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.
3. `BR-CORE-008` Customer self-profile routing and some customer-portal UX rules are still being completed.
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.
4. `BR-CORE-009` Agent review/rating workflow exists in schema direction but is not fully delivered end to end.
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.

## 16. Recommendation For Future Hardening

Status: `[POLICY]`
Verification: `[UNTESTED]`
Coverage: `[NONE]` Test files: none identified.

Source files:
- `BUSINESSRULES.md`
- `server/models/*.js`
- `server/controllers/*.js`
- `server/tests/unit/**/*.test.js`

To reduce drift between docs and code, future rules should ideally be maintained in three layers:

1. `BR-CORE-010` This file as the business-readable reference.
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.
2. `BR-CORE-011` Schema/controller enforcement in code.
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.
3. `BR-CORE-012` Targeted tests for every non-trivial rule.
   Verification: `[UNTESTED]`
   Coverage: `[NONE]` Test files: none identified.

## 17. Rule Traceability Matrix

This appendix maps each rule ID to the current enforcing files and identified automated coverage.

| Rule ID | Rule Group | Enforcing Files | Coverage | Test Evidence |
| --- | --- | --- | --- | --- |
| BR-CORE-001 | Core Domain Principles | MVP_ROADMAP.md, README.md, AI_ASSISTANT_GUIDE.md, PROJECT-STRUCTURE.md | [NONE] | none identified. |
| BR-CORE-002 | Core Domain Principles | MVP_ROADMAP.md, README.md, AI_ASSISTANT_GUIDE.md, PROJECT-STRUCTURE.md | [NONE] | none identified. |
| BR-CORE-003 | Core Domain Principles | MVP_ROADMAP.md, README.md, AI_ASSISTANT_GUIDE.md, PROJECT-STRUCTURE.md | [NONE] | none identified. |
| BR-CORE-004 | Core Domain Principles | MVP_ROADMAP.md, README.md, AI_ASSISTANT_GUIDE.md, PROJECT-STRUCTURE.md | [NONE] | none identified. |
| BR-CORE-005 | Core Domain Principles | MVP_ROADMAP.md, README.md, AI_ASSISTANT_GUIDE.md, PROJECT-STRUCTURE.md | [NONE] | none identified. |
| BR-AUTH-001 | Authentication And Identity Rules | server/middleware/auth.middleware.js, server/controllers/auth.controller.js, server/models/User.model.js, AUTH_GUIDE.md | [UNIT] | `server/tests/unit/middleware/auth.middleware.test.js`, `server/tests/unit/controllers/auth.controller.test.js`. |
| BR-AUTH-002 | Authentication And Identity Rules | server/middleware/auth.middleware.js, server/controllers/auth.controller.js, server/models/User.model.js, AUTH_GUIDE.md | [UNIT] | `server/tests/unit/middleware/auth.middleware.test.js`, `server/tests/unit/controllers/auth.controller.test.js`. |
| BR-AUTH-003 | Authentication And Identity Rules | server/middleware/auth.middleware.js, server/controllers/auth.controller.js, server/models/User.model.js, AUTH_GUIDE.md | [UNIT] | `server/tests/unit/middleware/auth.middleware.test.js`, `server/tests/unit/controllers/auth.controller.test.js`. |
| BR-AUTH-004 | Authentication And Identity Rules | server/middleware/auth.middleware.js, server/controllers/auth.controller.js, server/models/User.model.js, AUTH_GUIDE.md | [UNIT] | `server/tests/unit/middleware/auth.middleware.test.js`, `server/tests/unit/controllers/auth.controller.test.js`. |
| BR-AUTH-005 | Authentication And Identity Rules | server/middleware/auth.middleware.js, server/controllers/auth.controller.js, server/models/User.model.js, AUTH_GUIDE.md | [UNIT] | `server/tests/unit/middleware/auth.middleware.test.js`, `server/tests/unit/controllers/auth.controller.test.js`. |
| BR-AUTH-006 | Authentication And Identity Rules | server/middleware/auth.middleware.js, server/controllers/auth.controller.js, server/models/User.model.js, AUTH_GUIDE.md | [UNIT] | `server/tests/unit/middleware/auth.middleware.test.js`, `server/tests/unit/controllers/auth.controller.test.js`. |
| BR-AUTH-007 | Authentication And Identity Rules | server/middleware/auth.middleware.js, server/controllers/auth.controller.js, server/models/User.model.js, AUTH_GUIDE.md | [UNIT] | `server/tests/unit/middleware/auth.middleware.test.js`, `server/tests/unit/controllers/auth.controller.test.js`. |
| BR-AUTH-008 | Authentication And Identity Rules | server/middleware/auth.middleware.js, server/controllers/auth.controller.js, server/models/User.model.js, AUTH_GUIDE.md | [UNIT] | `server/tests/unit/middleware/auth.middleware.test.js`, `server/tests/unit/controllers/auth.controller.test.js`. |
| BR-AUTH-009 | Authentication And Identity Rules | server/middleware/auth.middleware.js, server/controllers/auth.controller.js, server/models/User.model.js, AUTH_GUIDE.md | [UNIT] | `server/tests/unit/middleware/auth.middleware.test.js`, `server/tests/unit/controllers/auth.controller.test.js`. |
| BR-AUTH-010 | Authentication And Identity Rules | server/middleware/auth.middleware.js, server/controllers/auth.controller.js, server/models/User.model.js, AUTH_GUIDE.md | [UNIT] | `server/tests/unit/middleware/auth.middleware.test.js`, `server/tests/unit/controllers/auth.controller.test.js`. |
| BR-AUTH-011 | Authentication And Identity Rules | server/middleware/auth.middleware.js, server/controllers/auth.controller.js, server/models/User.model.js, AUTH_GUIDE.md | [UNIT] | `server/tests/unit/middleware/auth.middleware.test.js`, `server/tests/unit/controllers/auth.controller.test.js`. |
| BR-REG-001 | Registration And Provisioning Rules | server/controllers/auth.controller.js, server/models/User.model.js, server/models/OnboardingPasskey.model.js, server/utils/emailService.js, AUTH_GUIDE.md | [UNIT] | `server/tests/unit/controllers/auth.controller.test.js`, `server/tests/unit/utils/emailService.test.js`. |
| BR-REG-002 | Registration And Provisioning Rules | server/controllers/auth.controller.js, server/models/User.model.js, server/models/OnboardingPasskey.model.js, server/utils/emailService.js, AUTH_GUIDE.md | [UNIT] | `server/tests/unit/controllers/auth.controller.test.js`, `server/tests/unit/utils/emailService.test.js`. |
| BR-REG-003 | Registration And Provisioning Rules | server/controllers/auth.controller.js, server/models/User.model.js, server/models/OnboardingPasskey.model.js, server/utils/emailService.js, AUTH_GUIDE.md | [UNIT] | `server/tests/unit/controllers/auth.controller.test.js`, `server/tests/unit/utils/emailService.test.js`. |
| BR-REG-004 | Registration And Provisioning Rules | server/controllers/auth.controller.js, server/models/User.model.js, server/models/OnboardingPasskey.model.js, server/utils/emailService.js, AUTH_GUIDE.md | [UNIT] | `server/tests/unit/controllers/auth.controller.test.js`, `server/tests/unit/utils/emailService.test.js`. |
| BR-REG-005 | Registration And Provisioning Rules | server/controllers/auth.controller.js, server/models/User.model.js, server/models/OnboardingPasskey.model.js, server/utils/emailService.js, AUTH_GUIDE.md | [UNIT] | `server/tests/unit/controllers/auth.controller.test.js`, `server/tests/unit/utils/emailService.test.js`. |
| BR-REG-006 | Registration And Provisioning Rules | server/controllers/auth.controller.js, server/models/User.model.js, server/models/OnboardingPasskey.model.js, server/utils/emailService.js, AUTH_GUIDE.md | [UNIT] | `server/tests/unit/controllers/auth.controller.test.js`, `server/tests/unit/utils/emailService.test.js`. |
| BR-REG-007 | Registration And Provisioning Rules | server/controllers/auth.controller.js, server/models/User.model.js, server/models/OnboardingPasskey.model.js, server/utils/emailService.js, AUTH_GUIDE.md | [UNIT] | `server/tests/unit/controllers/auth.controller.test.js`, `server/tests/unit/utils/emailService.test.js`. |
| BR-REG-008 | Registration And Provisioning Rules | server/controllers/auth.controller.js, server/models/User.model.js, server/models/OnboardingPasskey.model.js, server/utils/emailService.js, AUTH_GUIDE.md | [UNIT] | `server/tests/unit/controllers/auth.controller.test.js`, `server/tests/unit/utils/emailService.test.js`. |
| BR-REG-009 | Registration And Provisioning Rules | server/controllers/auth.controller.js, server/models/User.model.js, server/models/OnboardingPasskey.model.js, server/utils/emailService.js, AUTH_GUIDE.md | [UNIT] | `server/tests/unit/controllers/auth.controller.test.js`, `server/tests/unit/utils/emailService.test.js`. |
| BR-UPRO-001 | Write-Once Registration Identifier Policy | server/controllers/auth.controller.js, server/models/User.model.js, FIELD_PERMISSIONS.md | [UNIT] | `server/tests/unit/controllers/auth.controller.test.js`. |
| BR-UPRO-002 | Write-Once Registration Identifier Policy | server/controllers/auth.controller.js, server/models/User.model.js, FIELD_PERMISSIONS.md | [UNIT] | `server/tests/unit/controllers/auth.controller.test.js`. |
| BR-UPRO-003 | Write-Once Registration Identifier Policy | server/controllers/auth.controller.js, server/models/User.model.js, FIELD_PERMISSIONS.md | [UNIT] | `server/tests/unit/controllers/auth.controller.test.js`. |
| BR-UPRO-004 | Write-Once Registration Identifier Policy | server/controllers/auth.controller.js, server/models/User.model.js, FIELD_PERMISSIONS.md | [UNIT] | `server/tests/unit/controllers/auth.controller.test.js`. |
| BR-UPRO-005 | Write-Once Registration Identifier Policy | server/controllers/auth.controller.js, server/models/User.model.js, FIELD_PERMISSIONS.md | [UNIT] | `server/tests/unit/controllers/auth.controller.test.js`. |
| BR-AGENT-001 | Field Service Agent Rules | server/models/FieldServiceAgent.model.js, server/controllers/agent.controller.js, server/controllers/serviceCall.controller.js | [UNIT] | `server/tests/unit/controllers/agent.controller.test.js`. |
| BR-AGENT-002 | Field Service Agent Rules | server/models/FieldServiceAgent.model.js, server/controllers/agent.controller.js, server/controllers/serviceCall.controller.js | [UNIT] | `server/tests/unit/controllers/agent.controller.test.js`. |
| BR-AGENT-003 | Field Service Agent Rules | server/models/FieldServiceAgent.model.js, server/controllers/agent.controller.js, server/controllers/serviceCall.controller.js | [UNIT] | `server/tests/unit/controllers/agent.controller.test.js`. |
| BR-AGENT-008 | Field Service Agent Rules | server/models/FieldServiceAgent.model.js, server/controllers/agent.controller.js, client/src/components/FieldServiceAgents.jsx | [UNIT] | `server/tests/unit/controllers/agent.controller.test.js`. |
| BR-AGENT-004 | Field Service Agent Rules | server/models/FieldServiceAgent.model.js, server/controllers/agent.controller.js, server/controllers/serviceCall.controller.js | [UNIT] | `server/tests/unit/controllers/agent.controller.test.js`. |
| BR-AGENT-005 | Field Service Agent Rules | server/models/FieldServiceAgent.model.js, server/controllers/agent.controller.js, server/controllers/serviceCall.controller.js | [UNIT] | `server/tests/unit/controllers/agent.controller.test.js`. |
| BR-AGENT-006 | Field Service Agent Rules | server/models/FieldServiceAgent.model.js, server/controllers/agent.controller.js, server/controllers/serviceCall.controller.js | [UNIT] | `server/tests/unit/controllers/agent.controller.test.js`. |
| BR-AGENT-007 | Field Service Agent Rules | server/models/FieldServiceAgent.model.js, server/controllers/agent.controller.js, server/controllers/serviceCall.controller.js | [UNIT] | `server/tests/unit/controllers/agent.controller.test.js`. |
| BR-CUST-001 | Structural Customer Rules | server/models/Customer.model.js, server/controllers/customer.controller.js | [UNIT+POSTMAN] | `server/tests/unit/controllers/customer.controller.test.js`, `server/tests/postman/register_customers_collection.json`. |
| BR-CUST-002 | Structural Customer Rules | server/models/Customer.model.js, server/controllers/customer.controller.js | [UNIT+POSTMAN] | `server/tests/unit/controllers/customer.controller.test.js`, `server/tests/postman/register_customers_collection.json`. |
| BR-CUST-003 | Structural Customer Rules | server/models/Customer.model.js, server/controllers/customer.controller.js | [UNIT+POSTMAN] | `server/tests/unit/controllers/customer.controller.test.js`, `server/tests/postman/register_customers_collection.json`. |
| BR-CUST-004 | Structural Customer Rules | server/models/Customer.model.js, server/controllers/customer.controller.js | [UNIT+POSTMAN] | `server/tests/unit/controllers/customer.controller.test.js`, `server/tests/postman/register_customers_collection.json`. |
| BR-CUST-005 | Structural Customer Rules | server/models/Customer.model.js, server/controllers/customer.controller.js | [UNIT+POSTMAN] | `server/tests/unit/controllers/customer.controller.test.js`, `server/tests/postman/register_customers_collection.json`. |
| BR-CUST-006 | Structural Customer Rules | server/models/Customer.model.js, server/controllers/customer.controller.js | [UNIT+POSTMAN] | `server/tests/unit/controllers/customer.controller.test.js`, `server/tests/postman/register_customers_collection.json`. |
| BR-CUST-007 | Structural Customer Rules | server/models/Customer.model.js, server/controllers/customer.controller.js | [UNIT+POSTMAN] | `server/tests/unit/controllers/customer.controller.test.js`, `server/tests/postman/register_customers_collection.json`. |
| BR-CUST-008 | Structural Customer Rules | server/models/Customer.model.js, server/controllers/customer.controller.js | [UNIT+POSTMAN] | `server/tests/unit/controllers/customer.controller.test.js`, `server/tests/postman/register_customers_collection.json`. |
| BR-CUST-009 | Structural Customer Rules | server/models/Customer.model.js, server/controllers/customer.controller.js | [UNIT+POSTMAN] | `server/tests/unit/controllers/customer.controller.test.js`, `server/tests/postman/register_customers_collection.json`. |
| BR-CUST-010 | Prospect-First Conversion Policy | server/controllers/serviceCall.controller.js, server/controllers/quotation.controller.js, server/models/Quotation.model.js, server/tests/unit/controllers/serviceCall.controller.test.js, server/tests/unit/controllers/quotation.controller.test.js | [UNIT] | `server/tests/unit/controllers/serviceCall.controller.test.js`, `server/tests/unit/controllers/quotation.controller.test.js`. |
| BR-CUST-011 | Prospect-First Conversion Policy | server/controllers/serviceCall.controller.js, server/controllers/quotation.controller.js, server/models/Quotation.model.js, server/tests/unit/controllers/serviceCall.controller.test.js, server/tests/unit/controllers/quotation.controller.test.js | [UNIT] | `server/tests/unit/controllers/serviceCall.controller.test.js`, `server/tests/unit/controllers/quotation.controller.test.js`. |
| BR-CUST-012 | Prospect-First Conversion Policy | server/controllers/serviceCall.controller.js, server/controllers/quotation.controller.js, server/models/Quotation.model.js, server/tests/unit/controllers/serviceCall.controller.test.js, server/tests/unit/controllers/quotation.controller.test.js | [UNIT] | `server/tests/unit/controllers/serviceCall.controller.test.js`, `server/tests/unit/controllers/quotation.controller.test.js`. |
| BR-CUST-013 | Prospect-First Conversion Policy | server/controllers/serviceCall.controller.js, server/controllers/quotation.controller.js, server/models/Quotation.model.js, server/tests/unit/controllers/serviceCall.controller.test.js, server/tests/unit/controllers/quotation.controller.test.js | [UNIT] | `server/tests/unit/controllers/serviceCall.controller.test.js`, `server/tests/unit/controllers/quotation.controller.test.js`. |
| BR-CUST-014 | Prospect-First Conversion Policy | server/controllers/serviceCall.controller.js, server/controllers/quotation.controller.js, server/models/Quotation.model.js, server/tests/unit/controllers/serviceCall.controller.test.js, server/tests/unit/controllers/quotation.controller.test.js | [UNIT] | `server/tests/unit/controllers/serviceCall.controller.test.js`, `server/tests/unit/controllers/quotation.controller.test.js`. |
| BR-CUST-015 | Prospect-First Conversion Policy | server/controllers/serviceCall.controller.js, server/controllers/quotation.controller.js, server/models/Quotation.model.js, server/tests/unit/controllers/serviceCall.controller.test.js, server/tests/unit/controllers/quotation.controller.test.js | [UNIT] | `server/tests/unit/controllers/serviceCall.controller.test.js`, `server/tests/unit/controllers/quotation.controller.test.js`. |
| BR-SCALL-001 | Creation Rules | server/models/ServiceCall.model.js, server/controllers/serviceCall.controller.js | [UNIT+POSTMAN] | `server/tests/unit/controllers/serviceCall.controller.test.js`, `server/tests/postman/register_customers_collection.json`. |
| BR-SCALL-002 | Creation Rules | server/models/ServiceCall.model.js, server/controllers/serviceCall.controller.js | [UNIT+POSTMAN] | `server/tests/unit/controllers/serviceCall.controller.test.js`, `server/tests/postman/register_customers_collection.json`. |
| BR-SCALL-003 | Creation Rules | server/models/ServiceCall.model.js, server/controllers/serviceCall.controller.js | [UNIT+POSTMAN] | `server/tests/unit/controllers/serviceCall.controller.test.js`, `server/tests/postman/register_customers_collection.json`. |
| BR-SCALL-004 | Creation Rules | server/models/ServiceCall.model.js, server/controllers/serviceCall.controller.js | [UNIT+POSTMAN] | `server/tests/unit/controllers/serviceCall.controller.test.js`, `server/tests/postman/register_customers_collection.json`. |
| BR-SCALL-005 | Creation Rules | server/models/ServiceCall.model.js, server/controllers/serviceCall.controller.js | [UNIT+POSTMAN] | `server/tests/unit/controllers/serviceCall.controller.test.js`, `server/tests/postman/register_customers_collection.json`. |
| BR-SCALL-006 | Creation Rules | server/models/ServiceCall.model.js, server/controllers/serviceCall.controller.js | [UNIT+POSTMAN] | `server/tests/unit/controllers/serviceCall.controller.test.js`, `server/tests/postman/register_customers_collection.json`. |
| BR-SCALL-007 | Booking Request / Prospect Rules | server/controllers/serviceCall.controller.js, server/models/ServiceCall.model.js, server/models/Customer.model.js | [UNIT] | `server/tests/unit/controllers/serviceCall.controller.test.js`. |
| BR-SCALL-008 | Booking Request / Prospect Rules | server/controllers/serviceCall.controller.js, server/models/ServiceCall.model.js, server/models/Customer.model.js | [UNIT] | `server/tests/unit/controllers/serviceCall.controller.test.js`. |
| BR-SCALL-009 | Booking Request / Prospect Rules | server/controllers/serviceCall.controller.js, server/models/ServiceCall.model.js, server/models/Customer.model.js | [UNIT] | `server/tests/unit/controllers/serviceCall.controller.test.js`. |
| BR-SCALL-010 | Booking Request / Prospect Rules | server/controllers/serviceCall.controller.js, server/models/ServiceCall.model.js, server/models/Customer.model.js | [UNIT] | `server/tests/unit/controllers/serviceCall.controller.test.js`. |
| BR-SCALL-011 | Duplicate-Pending-Quote Guard | server/controllers/serviceCall.controller.js, server/models/ServiceCallEmailLock.model.js, server/controllers/quotation.controller.js | [NONE] | none identified. |
| BR-SCALL-012 | Duplicate-Pending-Quote Guard | server/controllers/serviceCall.controller.js, server/models/ServiceCallEmailLock.model.js, server/controllers/quotation.controller.js | [NONE] | none identified. |
| BR-SCALL-013 | Duplicate-Pending-Quote Guard | server/controllers/serviceCall.controller.js, server/models/ServiceCallEmailLock.model.js, server/controllers/quotation.controller.js | [NONE] | none identified. |
| BR-SCALL-014 | Service Call Update Rules | server/models/ServiceCall.model.js, server/controllers/serviceCall.controller.js | [NONE] | none identified. |
| BR-SCALL-015 | Service Call Update Rules | server/models/ServiceCall.model.js, server/controllers/serviceCall.controller.js | [NONE] | none identified. |
| BR-SCALL-016 | Service Call Date Selection Rules | client/src/components/ServiceCallRegistration.jsx, server/controllers/serviceCall.controller.js | [NONE] | none identified. |
| BR-SCALL-017 | Service Call Date Selection Rules | client/src/components/ServiceCallRegistration.jsx, server/controllers/serviceCall.controller.js | [NONE] | none identified. |
| BR-SCALL-018 | Service Call Date Selection Rules | client/src/components/ServiceCallRegistration.jsx, server/controllers/serviceCall.controller.js | [NONE] | none identified. |
| BR-SCALL-019 | Service Call Date Selection Rules | client/src/components/ServiceCallRegistration.jsx, server/controllers/serviceCall.controller.js | [NONE] | none identified. |
| BR-SCALL-020 | Service Call Date Selection Rules | client/src/components/ServiceCallRegistration.jsx, server/controllers/serviceCall.controller.js | [NONE] | none identified. |
| BR-SCALL-021 | Service Call Date Selection Rules | client/src/components/ServiceCallRegistration.jsx, server/controllers/serviceCall.controller.js | [NONE] | none identified. |
| BR-DISP-001 | Self-Dispatch Rules | server/controllers/serviceCall.controller.js, server/controllers/agent.controller.js, server/models/FieldServiceAgent.model.js, FIELD_AGENT_SELF_DISPATCH_API_DESIGN.md | [UNIT] | `server/tests/unit/controllers/serviceCall.controller.test.js`, `server/tests/unit/controllers/agent.controller.test.js`. |
| BR-DISP-002 | Self-Dispatch Rules | server/controllers/serviceCall.controller.js, server/controllers/agent.controller.js, server/models/FieldServiceAgent.model.js, FIELD_AGENT_SELF_DISPATCH_API_DESIGN.md | [UNIT] | `server/tests/unit/controllers/serviceCall.controller.test.js`, `server/tests/unit/controllers/agent.controller.test.js`. |
| BR-DISP-003 | Self-Dispatch Rules | server/controllers/serviceCall.controller.js, server/controllers/agent.controller.js, server/models/FieldServiceAgent.model.js, FIELD_AGENT_SELF_DISPATCH_API_DESIGN.md | [UNIT] | `server/tests/unit/controllers/serviceCall.controller.test.js`, `server/tests/unit/controllers/agent.controller.test.js`. |
| BR-DISP-004 | Self-Dispatch Rules | server/controllers/serviceCall.controller.js, server/controllers/agent.controller.js, server/models/FieldServiceAgent.model.js, FIELD_AGENT_SELF_DISPATCH_API_DESIGN.md | [UNIT] | `server/tests/unit/controllers/serviceCall.controller.test.js`, `server/tests/unit/controllers/agent.controller.test.js`. |
| BR-DISP-005 | Self-Dispatch Rules | server/controllers/serviceCall.controller.js, server/controllers/agent.controller.js, server/models/FieldServiceAgent.model.js, FIELD_AGENT_SELF_DISPATCH_API_DESIGN.md | [UNIT] | `server/tests/unit/controllers/serviceCall.controller.test.js`, `server/tests/unit/controllers/agent.controller.test.js`. |
| BR-DISP-006 | Self-Dispatch Rules | server/controllers/serviceCall.controller.js, server/controllers/agent.controller.js, server/models/FieldServiceAgent.model.js, FIELD_AGENT_SELF_DISPATCH_API_DESIGN.md | [UNIT] | `server/tests/unit/controllers/serviceCall.controller.test.js`, `server/tests/unit/controllers/agent.controller.test.js`. |
| BR-QUOTE-001 | Quotation Structure | server/models/Quotation.model.js, server/controllers/quotation.controller.js | [NONE] | none identified. |
| BR-QUOTE-002 | Quotation Structure | server/models/Quotation.model.js, server/controllers/quotation.controller.js | [NONE] | none identified. |
| BR-QUOTE-003 | Quotation Structure | server/models/Quotation.model.js, server/controllers/quotation.controller.js | [NONE] | none identified. |
| BR-QUOTE-004 | Quotation Structure | server/models/Quotation.model.js, server/controllers/quotation.controller.js | [NONE] | none identified. |
| BR-QUOTE-005 | Quotation Structure | server/models/Quotation.model.js, server/controllers/quotation.controller.js | [NONE] | none identified. |
| BR-QUOTE-006 | Quotation Edit Rules | server/models/Quotation.model.js, server/controllers/quotation.controller.js | [NONE] | none identified. |
| BR-QUOTE-007 | Quotation Edit Rules | server/models/Quotation.model.js, server/controllers/quotation.controller.js | [NONE] | none identified. |
| BR-QUOTE-008 | Quotation Edit Rules | server/models/Quotation.model.js, server/controllers/quotation.controller.js | [NONE] | none identified. |
| BR-QUOTE-009 | Quotation Delivery Rules | server/controllers/quotation.controller.js, server/utils/emailService.js, server/models/Quotation.model.js | [NONE] | none identified. |
| BR-QUOTE-010 | Quotation Delivery Rules | server/controllers/quotation.controller.js, server/utils/emailService.js, server/models/Quotation.model.js | [NONE] | none identified. |
| BR-QUOTE-011 | Quotation Delivery Rules | server/controllers/quotation.controller.js, server/utils/emailService.js, server/models/Quotation.model.js | [NONE] | none identified. |
| BR-QUOTE-012 | Quotation Delivery Rules | server/controllers/quotation.controller.js, server/utils/emailService.js, server/models/Quotation.model.js | [NONE] | none identified. |
| BR-QUOTE-013 | Quotation Delivery Rules | server/controllers/quotation.controller.js, server/utils/emailService.js, server/models/Quotation.model.js | [NONE] | none identified. |
| BR-QUOTE-014 | Quotation Delivery Rules | server/controllers/quotation.controller.js, server/utils/emailService.js, server/models/Quotation.model.js | [NONE] | none identified. |
| BR-QUOTE-015 | Quotation Delivery Rules | server/controllers/quotation.controller.js, server/utils/emailService.js, server/models/Quotation.model.js | [NONE] | none identified. |
| BR-QUOTE-016 | Quotation Delivery Rules | server/controllers/quotation.controller.js, server/utils/emailService.js, server/models/Quotation.model.js | [NONE] | none identified. |
| BR-QUOTE-017 | Prospect Conversion On Acceptance | server/controllers/quotation.controller.js, server/models/Quotation.model.js, server/models/Customer.model.js, server/models/User.model.js, server/utils/emailService.js, server/tests/unit/controllers/quotation.controller.test.js | [UNIT] | `server/tests/unit/controllers/quotation.controller.test.js`. |
| BR-QUOTE-018 | Prospect Conversion On Acceptance | server/controllers/quotation.controller.js, server/models/Quotation.model.js, server/models/Customer.model.js, server/models/User.model.js, server/utils/emailService.js, server/tests/unit/controllers/quotation.controller.test.js | [UNIT] | `server/tests/unit/controllers/quotation.controller.test.js`. |
| BR-QUOTE-019 | Prospect Conversion On Acceptance | server/controllers/quotation.controller.js, server/models/Quotation.model.js, server/models/Customer.model.js, server/models/User.model.js, server/utils/emailService.js, server/tests/unit/controllers/quotation.controller.test.js | [UNIT] | `server/tests/unit/controllers/quotation.controller.test.js`. |
| BR-QUOTE-020 | Prospect Conversion On Acceptance | server/controllers/quotation.controller.js, server/models/Quotation.model.js, server/models/Customer.model.js, server/models/User.model.js, server/utils/emailService.js, server/tests/unit/controllers/quotation.controller.test.js | [UNIT] | `server/tests/unit/controllers/quotation.controller.test.js`. |
| BR-QUOTE-021 | Prospect Conversion On Acceptance | server/controllers/quotation.controller.js, server/models/Quotation.model.js, server/models/Customer.model.js, server/models/User.model.js, server/utils/emailService.js, server/tests/unit/controllers/quotation.controller.test.js | [UNIT] | `server/tests/unit/controllers/quotation.controller.test.js`. |
| BR-QUOTE-022 | Prospect Conversion On Acceptance | server/controllers/quotation.controller.js, server/models/Quotation.model.js, server/models/Customer.model.js, server/models/User.model.js, server/utils/emailService.js, server/tests/unit/controllers/quotation.controller.test.js | [UNIT] | `server/tests/unit/controllers/quotation.controller.test.js`. |
| BR-QUOTE-023 | Quote To Service Call Rules | server/controllers/quotation.controller.js, server/controllers/serviceCall.controller.js, server/models/Quotation.model.js, server/models/ServiceCall.model.js | [NONE] | none identified. |
| BR-QUOTE-024 | Quote To Service Call Rules | server/controllers/quotation.controller.js, server/controllers/serviceCall.controller.js, server/models/Quotation.model.js, server/models/ServiceCall.model.js | [NONE] | none identified. |
| BR-QUOTE-025 | Quote To Service Call Rules | server/controllers/quotation.controller.js, server/controllers/serviceCall.controller.js, server/models/Quotation.model.js, server/models/ServiceCall.model.js | [NONE] | none identified. |
| BR-QLOCK-001 | Quote Email Lock Rules | server/models/ServiceCallEmailLock.model.js, server/controllers/quotation.controller.js, server/controllers/serviceCall.controller.js | [NONE] | none identified. |
| BR-QLOCK-002 | Quote Email Lock Rules | server/models/ServiceCallEmailLock.model.js, server/controllers/quotation.controller.js, server/controllers/serviceCall.controller.js | [NONE] | none identified. |
| BR-QLOCK-003 | Quote Email Lock Rules | server/models/ServiceCallEmailLock.model.js, server/controllers/quotation.controller.js, server/controllers/serviceCall.controller.js | [NONE] | none identified. |
| BR-QLOCK-004 | Quote Email Lock Rules | server/models/ServiceCallEmailLock.model.js, server/controllers/quotation.controller.js, server/controllers/serviceCall.controller.js | [NONE] | none identified. |
| BR-QLOCK-005 | Quote Email Lock Rules | server/models/ServiceCallEmailLock.model.js, server/controllers/quotation.controller.js, server/controllers/serviceCall.controller.js | [NONE] | none identified. |
| BR-PRICE-001 | Quotation Costing Rules | server/models/Quotation.model.js, server/controllers/quotation.controller.js | [NONE] | none identified. |
| BR-PRICE-002 | Quotation Costing Rules | server/models/Quotation.model.js, server/controllers/quotation.controller.js | [NONE] | none identified. |
| BR-PRICE-003 | Quotation Costing Rules | server/models/Quotation.model.js, server/controllers/quotation.controller.js | [NONE] | none identified. |
| BR-PRICE-004 | Quotation Costing Rules | server/models/Quotation.model.js, server/controllers/quotation.controller.js | [NONE] | none identified. |
| BR-PRICE-005 | Quotation Costing Rules | server/models/Quotation.model.js, server/controllers/quotation.controller.js | [NONE] | none identified. |
| BR-PRICE-006 | Quotation Costing Rules | server/models/Quotation.model.js, server/controllers/quotation.controller.js | [NONE] | none identified. |
| BR-PRICE-007 | Quotation Costing Rules | server/models/Quotation.model.js, server/controllers/quotation.controller.js | [NONE] | none identified. |
| BR-PRICE-008 | Invoice Costing Rules | server/models/Invoice.model.js, server/controllers/invoice.controller.js | [NONE] | none identified. |
| BR-PRICE-009 | Invoice Costing Rules | server/models/Invoice.model.js, server/controllers/invoice.controller.js | [NONE] | none identified. |
| BR-PRICE-010 | Invoice Costing Rules | server/models/Invoice.model.js, server/controllers/invoice.controller.js | [NONE] | none identified. |
| BR-PRICE-011 | Invoice Costing Rules | server/models/Invoice.model.js, server/controllers/invoice.controller.js | [NONE] | none identified. |
| BR-INV-001 | Invoice Creation Rules | server/controllers/invoice.controller.js, server/models/Invoice.model.js, server/models/ServiceCall.model.js | [NONE] | none identified. |
| BR-INV-002 | Invoice Creation Rules | server/controllers/invoice.controller.js, server/models/Invoice.model.js, server/models/ServiceCall.model.js | [NONE] | none identified. |
| BR-INV-003 | Invoice Creation Rules | server/controllers/invoice.controller.js, server/models/Invoice.model.js, server/models/ServiceCall.model.js | [NONE] | none identified. |
| BR-INV-004 | Invoice Creation Rules | server/controllers/invoice.controller.js, server/models/Invoice.model.js, server/models/ServiceCall.model.js | [NONE] | none identified. |
| BR-INV-005 | Invoice Creation Rules | server/controllers/invoice.controller.js, server/models/Invoice.model.js, server/models/ServiceCall.model.js | [NONE] | none identified. |
| BR-INV-006 | Invoice Creation Rules | server/controllers/invoice.controller.js, server/models/Invoice.model.js, server/models/ServiceCall.model.js | [NONE] | none identified. |
| BR-INV-007 | Invoice Editing Rules | server/controllers/invoice.controller.js, server/models/Invoice.model.js | [NONE] | none identified. |
| BR-INV-008 | Invoice Editing Rules | server/controllers/invoice.controller.js, server/models/Invoice.model.js | [NONE] | none identified. |
| BR-INV-009 | Invoice Editing Rules | server/controllers/invoice.controller.js, server/models/Invoice.model.js | [NONE] | none identified. |
| BR-INV-010 | Invoice Delivery Rules | server/controllers/invoice.controller.js, server/utils/emailService.js, server/models/Invoice.model.js | [UNIT] | `server/tests/unit/controllers/invoice.controller.test.js`. |
| BR-INV-011 | Invoice Delivery Rules | server/controllers/invoice.controller.js, server/utils/emailService.js, server/models/Invoice.model.js | [UNIT] | `server/tests/unit/controllers/invoice.controller.test.js`. |
| BR-INV-012 | Invoice Delivery Rules | server/controllers/invoice.controller.js, server/utils/emailService.js, server/models/Invoice.model.js | [UNIT] | `server/tests/unit/controllers/invoice.controller.test.js`. |
| BR-INV-013 | Invoice Delivery Rules | server/controllers/invoice.controller.js, server/utils/emailService.js, server/models/Invoice.model.js | [UNIT] | `server/tests/unit/controllers/invoice.controller.test.js`. |
| BR-INV-014 | Invoice Delivery Rules | server/controllers/invoice.controller.js, server/utils/emailService.js, server/models/Invoice.model.js | [UNIT] | `server/tests/unit/controllers/invoice.controller.test.js`. |
| BR-INV-015 | Invoice Delivery Rules | server/controllers/invoice.controller.js, server/utils/emailService.js, server/models/Invoice.model.js | [UNIT] | `server/tests/unit/controllers/invoice.controller.test.js`. |
| BR-INV-016 | Public Pro-Forma Approval Rules | server/controllers/invoice.controller.js, server/models/Invoice.model.js | [UNIT] | `server/tests/unit/controllers/invoice.controller.test.js`. |
| BR-INV-017 | Public Pro-Forma Approval Rules | server/controllers/invoice.controller.js, server/models/Invoice.model.js | [UNIT] | `server/tests/unit/controllers/invoice.controller.test.js`. |
| BR-INV-018 | Public Pro-Forma Approval Rules | server/controllers/invoice.controller.js, server/models/Invoice.model.js | [UNIT] | `server/tests/unit/controllers/invoice.controller.test.js`. |
| BR-INV-019 | Public Pro-Forma Approval Rules | server/controllers/invoice.controller.js, server/models/Invoice.model.js | [UNIT] | `server/tests/unit/controllers/invoice.controller.test.js`. |
| BR-INV-020 | Payment Rules | server/controllers/invoice.controller.js, server/models/Invoice.model.js | [NONE] | none identified. |
| BR-INV-021 | Payment Rules | server/controllers/invoice.controller.js, server/models/Invoice.model.js | [NONE] | none identified. |
| BR-INV-022 | Payment Rules | server/controllers/invoice.controller.js, server/models/Invoice.model.js | [NONE] | none identified. |
| BR-INV-023 | Payment Rules | server/controllers/invoice.controller.js, server/models/Invoice.model.js | [NONE] | none identified. |
| BR-INV-024 | Payment Rules | server/controllers/invoice.controller.js, server/models/Invoice.model.js | [NONE] | none identified. |
| BR-SEC-001 | Security And Audit Rules | server/middleware/logger.middleware.js, server/controllers/auth.controller.js, server/models/User.model.js, SECURITY.md | [UNIT+POSTMAN] | `server/tests/unit/middleware/auth.middleware.test.js`, `server/tests/unit/controllers/auth.controller.test.js`, `server/tests/postman/register_customers_collection.json`. |
| BR-SEC-002 | Security And Audit Rules | server/middleware/logger.middleware.js, server/controllers/auth.controller.js, server/models/User.model.js, SECURITY.md | [UNIT+POSTMAN] | `server/tests/unit/middleware/auth.middleware.test.js`, `server/tests/unit/controllers/auth.controller.test.js`, `server/tests/postman/register_customers_collection.json`. |
| BR-SEC-003 | Security And Audit Rules | server/middleware/logger.middleware.js, server/controllers/auth.controller.js, server/models/User.model.js, SECURITY.md | [UNIT+POSTMAN] | `server/tests/unit/middleware/auth.middleware.test.js`, `server/tests/unit/controllers/auth.controller.test.js`, `server/tests/postman/register_customers_collection.json`. |
| BR-SEC-004 | Security And Audit Rules | server/middleware/logger.middleware.js, server/controllers/auth.controller.js, server/models/User.model.js, SECURITY.md | [UNIT+POSTMAN] | `server/tests/unit/middleware/auth.middleware.test.js`, `server/tests/unit/controllers/auth.controller.test.js`, `server/tests/postman/register_customers_collection.json`. |
| BR-SEC-005 | Security And Audit Rules | server/middleware/logger.middleware.js, server/controllers/auth.controller.js, server/models/User.model.js, SECURITY.md | [UNIT+POSTMAN] | `server/tests/unit/middleware/auth.middleware.test.js`, `server/tests/unit/controllers/auth.controller.test.js`, `server/tests/postman/register_customers_collection.json`. |
| BR-SEC-006 | Security And Audit Rules | server/middleware/logger.middleware.js, server/controllers/auth.controller.js, server/models/User.model.js, SECURITY.md | [UNIT+POSTMAN] | `server/tests/unit/middleware/auth.middleware.test.js`, `server/tests/unit/controllers/auth.controller.test.js`, `server/tests/postman/register_customers_collection.json`. |
| BR-SEC-007 | Security And Audit Rules | server/middleware/logger.middleware.js, server/controllers/auth.controller.js, server/models/User.model.js, SECURITY.md | [UNIT+POSTMAN] | `server/tests/unit/middleware/auth.middleware.test.js`, `server/tests/unit/controllers/auth.controller.test.js`, `server/tests/postman/register_customers_collection.json`. |
| BR-DATA-001 | Operational Data Quality Rules | server/models/User.model.js, server/models/Customer.model.js, server/models/FieldServiceAgent.model.js, server/models/ServiceCall.model.js, server/models/Quotation.model.js, server/models/Invoice.model.js, server/models/ServiceCallEmailLock.model.js, server/utils/sequence.util.js | [UNIT+POSTMAN] | `server/tests/unit/controllers/agent.controller.test.js`, `server/tests/unit/controllers/customer.controller.test.js`, `server/tests/postman/register_customers_collection.json`. |
| BR-DATA-002 | Operational Data Quality Rules | server/models/User.model.js, server/models/Customer.model.js, server/models/FieldServiceAgent.model.js, server/models/ServiceCall.model.js, server/models/Quotation.model.js, server/models/Invoice.model.js, server/models/ServiceCallEmailLock.model.js, server/utils/sequence.util.js | [UNIT+POSTMAN] | `server/tests/unit/controllers/agent.controller.test.js`, `server/tests/unit/controllers/customer.controller.test.js`, `server/tests/postman/register_customers_collection.json`. |
| BR-DATA-003 | Operational Data Quality Rules | server/models/User.model.js, server/models/Customer.model.js, server/models/FieldServiceAgent.model.js, server/models/ServiceCall.model.js, server/models/Quotation.model.js, server/models/Invoice.model.js, server/models/ServiceCallEmailLock.model.js, server/utils/sequence.util.js | [UNIT+POSTMAN] | `server/tests/unit/controllers/agent.controller.test.js`, `server/tests/unit/controllers/customer.controller.test.js`, `server/tests/postman/register_customers_collection.json`. |
| BR-DATA-004 | Operational Data Quality Rules | server/models/User.model.js, server/models/Customer.model.js, server/models/FieldServiceAgent.model.js, server/models/ServiceCall.model.js, server/models/Quotation.model.js, server/models/Invoice.model.js, server/models/ServiceCallEmailLock.model.js, server/utils/sequence.util.js | [UNIT+POSTMAN] | `server/tests/unit/controllers/agent.controller.test.js`, `server/tests/unit/controllers/customer.controller.test.js`, `server/tests/postman/register_customers_collection.json`. |
| BR-DATA-005 | Operational Data Quality Rules | server/models/User.model.js, server/models/Customer.model.js, server/models/FieldServiceAgent.model.js, server/models/ServiceCall.model.js, server/models/Quotation.model.js, server/models/Invoice.model.js, server/models/ServiceCallEmailLock.model.js, server/utils/sequence.util.js | [UNIT+POSTMAN] | `server/tests/unit/controllers/agent.controller.test.js`, `server/tests/unit/controllers/customer.controller.test.js`, `server/tests/postman/register_customers_collection.json`. |
| BR-CORE-006 | Known Gaps / Rules Not Yet Fully Centralized | MVP_ROADMAP.md, PROJECT-STRUCTURE.md, continuity/CURRENT_STATUS.md, continuity/SESSION_2026-04-10_STARTUP.md | [NONE] | none identified. |
| BR-CORE-007 | Known Gaps / Rules Not Yet Fully Centralized | MVP_ROADMAP.md, PROJECT-STRUCTURE.md, continuity/CURRENT_STATUS.md, continuity/SESSION_2026-04-10_STARTUP.md | [NONE] | none identified. |
| BR-CORE-008 | Known Gaps / Rules Not Yet Fully Centralized | MVP_ROADMAP.md, PROJECT-STRUCTURE.md, continuity/CURRENT_STATUS.md, continuity/SESSION_2026-04-10_STARTUP.md | [NONE] | none identified. |
| BR-CORE-009 | Known Gaps / Rules Not Yet Fully Centralized | MVP_ROADMAP.md, PROJECT-STRUCTURE.md, continuity/CURRENT_STATUS.md, continuity/SESSION_2026-04-10_STARTUP.md | [NONE] | none identified. |
| BR-CORE-010 | Recommendation For Future Hardening | BUSINESSRULES.md, server/models/*.js, server/controllers/*.js, server/tests/unit/**/*.test.js | [NONE] | none identified. |
| BR-CORE-011 | Recommendation For Future Hardening | BUSINESSRULES.md, server/models/*.js, server/controllers/*.js, server/tests/unit/**/*.test.js | [NONE] | none identified. |
| BR-CORE-012 | Recommendation For Future Hardening | BUSINESSRULES.md, server/models/*.js, server/controllers/*.js, server/tests/unit/**/*.test.js | [NONE] | none identified. |