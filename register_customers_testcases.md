# Register Customers Test Cases

Purpose: Validate the end-to-end customer registration flow from UI to API to MongoDB, and verify data recollection in quotation and invoice creation flows.

Last updated: 2026-03-24

## Scope

This suite covers:

- Client-side behavior on /customers/register
- Server-side behavior for customer + service call creation
- Database persistence in Customer and ServiceCall collections
- Recollection/availability of customer data in:
  - Create Quotation flow
  - Create Invoice (pro-forma from service call) flow
- Mandatory security validation for the registration form and downstream rendering surfaces

## References (Current Implementation)

- UI register flow: client/src/components/RegisterNewCustomer.jsx
- Customer API route: server/routes/customer.routes.js
- Customer controller: server/controllers/customer.controller.js
- Quote creation UI: client/src/components/CreateQuoteModal.jsx
- Invoice pro-forma UI trigger: client/src/components/SiteInstructionModal.jsx
- Invoice route for service-call-based creation: server/routes/invoice.routes.js

## Preconditions

1. Backend and frontend are running.
2. Test user is authenticated in UI.
3. MongoDB is running and reachable via MONGODB_URI.
4. Tester has access to DB inspection (mongosh or Compass).

## Mandatory Error Logging (No Shortcuts)

All test executions must be logged. Failures are mandatory to log in:

- server/logs/register_customers_test_errors.log

Failure records must include all of the following:

1. Test Case ID
2. Timestamp (UTC)
3. Test phase (UI/API/DB/Recollection/Security)
4. Exact failure point (when it failed)
5. Why it failed (root cause)
6. How it failed (repro path / payload)
7. Security impact classification
8. Required remediation action
9. Owner and severity
10. Evidence references (API response, DB evidence, UI evidence)

Recommended command (structured log writer):

```bash
bash ./scripts/log-register-customers-test-result.sh \
  --test-id RC-SEC-001 \
  --status fail \
  --phase Security \
  --title "Stored XSS in notes field" \
  --why "Input was persisted without safe output encoding in downstream UI" \
  --how "Submitted <script>alert(1)</script> in notes during registration" \
  --required-action "Implement output encoding and strict allowlist sanitization" \
  --security-impact "High - stored XSS" \
  --severity high \
  --api-status 201 \
  --api-message "Customer created" \
  --db-evidence "Customer.notes contains script tag" \
  --ui-evidence "Script executes when notes rendered" \
  --owner "Backend + Frontend"
```

## Test Data Set

Use unique values per run to avoid duplicate collisions.

- Email pattern: qa+<timestamp>@example.com
- Customer ID pattern: CUST-QA-<timestamp>
- Phone: 0711111111

Suggested sample:

- contactFirstName: Test
- contactLastName: Customer
- email: qa+20260324T1500@example.com
- customerId: CUST-QA-20260324T1500

## High-Level Flow Under Test

1. User submits customer registration form.
2. UI posts to POST /api/customers.
3. On success, UI posts service call to POST /api/service-calls using returned customer _id.
4. Customer should be visible via GET /api/customers.
5. Customer should appear in Create Quotation customer dropdown.
6. Related service call should seed invoice pro-forma flow.

## Client-Side Test Cases (UI)

### RC-UI-001 Happy Path Registration (New Customer + Service Call)

- Steps:
  1. Navigate to /customers/register.
  2. Ensure Use Existing Customer is disabled.
  3. Fill required customer and service request fields.
  4. Submit.
- Expected:
  - Success message appears: Customer and service request saved successfully.
  - Form resets.
  - New customer appears in customer-related listings.

### RC-UI-002 Required Existing Customer Selection

- Steps:
  1. Enable Use Existing Customer.
  2. Do not select a customer.
  3. Submit.
- Expected:
  - Error shown: Please select an existing customer.
  - No API write attempted for service call.

### RC-UI-003 Electrical Unsupported Path Guard

- Steps:
  1. Choose service category Electrical.
  2. Set type to building-wiring.
  3. Submit.
- Expected:
  - Error shown: We do not perform building wiring electrical services.
  - No API write attempted.

### RC-UI-004 Generator Required Fields

- Steps:
  1. Select service category Generator.
  2. Leave generator brand/model empty.
  3. Submit.
- Expected:
  - Error indicating brand and model are required.

### RC-UI-005 Service Message Required by Category

- Steps:
  1. For Generator/Electrical/Plumbing, leave subject/message empty.
  2. Submit for each category.
- Expected:
  - Category-specific validation error shown.

## Server/API Test Cases

### RC-API-001 Create Customer Required Fields

- Trigger:
  - Submit without one of: customerType, contactFirstName, contactLastName, email, phoneNumber, customerId.
- Expected:
  - HTTP 400 from POST /api/customers.
  - Message: Please fill in all required fields.

### RC-API-002 Duplicate Customer ID

- Trigger:
  - Create customer with existing customerId.
- Expected:
  - HTTP 400.
  - Message: Customer ID already exists.

### RC-API-003 Unauthorized Request

- Trigger:
  - Remove/expire auth token and attempt registration.
- Expected:
  - HTTP 401/403 from protected routes.

### RC-API-004 Partial Write Safety Check (Important)

- Trigger:
  - Force service-call creation failure after customer create succeeds (e.g., invalid service call payload).
- Expected:
  - UI shows failed to save customer request.
  - Customer may still exist in DB because operations are sequential (no transaction rollback).
  - Record this as expected current behavior and risk.

### RC-API-005 Customer Type Contract Compatibility Check

- Trigger:
  - Submit customerType values emitted by current UI.
- Expected:
  - Verify accepted values align with backend model/controller.
  - If mismatch occurs (e.g., enum/contract drift), request fails and is logged as defect.

## DB Persistence Test Cases

### RC-DB-001 Customer Document Persisted

- Steps:
  1. Complete RC-UI-001.
  2. Query Customer collection by email or customerId.
- Expected:
  - One new customer document exists.
  - Fields populated: contact names, email, phone, customerId, createdBy, timestamps.

Mongo query example:

```javascript
// In mongosh
use <your_database_name>
db.customers.find({
  customerId: "CUST-QA-20260324T1500"
}).pretty()
```

### RC-DB-002 Service Call Linked to Customer

- Steps:
  1. Query ServiceCall by customer ObjectId from RC-DB-001.
- Expected:
  - Service call exists.
  - customer field references created customer _id.
  - Service metadata stored in notes/serviceType/title/description.

Mongo query example:

```javascript
// Replace <customerObjectId>
db.servicecalls.find({
  customer: ObjectId("<customerObjectId>")
}).pretty()
```

### RC-DB-003 CreatedBy Scoping

- Steps:
  1. Query created customer.
- Expected:
  - createdBy matches logged-in user _id.

## Recollection Test Cases (Quotation + Invoice)

### RC-REC-001 Customer Appears in Create Quotation Dropdown

- Steps:
  1. Open Create Quotation modal/page.
  2. Inspect customer dropdown options.
- Expected:
  - Newly created customer appears (from GET /api/customers).
  - Selection uses customer _id.

### RC-REC-002 Quotation Submission with New Customer

- Steps:
  1. Select newly created customer in quote form.
  2. Submit valid quotation.
- Expected:
  - Quotation created successfully.
  - Quotation document references customer _id.

### RC-REC-003 Invoice Pro-Forma Path from Service Call

- Steps:
  1. Navigate to flow that triggers pro-forma creation from service call.
  2. Use the service call created during registration.
- Expected:
  - POST /api/invoices/from-service-call/:serviceCallId/pro-forma succeeds.
  - Invoice draft/pro-forma is linked to service call and customer context.

## Negative and Regression Cases

### RC-NEG-001 Invalid Email Format

- Steps:
  1. Enter malformed email.
  2. Submit.
- Expected:
  - Rejected by API/model validation.

### RC-NEG-002 Missing Physical Address for Residential-like Flow

- Steps:
  1. Use residential/private-like flow.
  2. Omit physical address details.
- Expected:
  - Rejected where required by backend contract.

### RC-NEG-003 Stale Token During Submit

- Steps:
  1. Expire token/session.
  2. Submit registration.
- Expected:
  - Auth error returned.
  - No new DB writes.

## Security Test Cases (Mandatory)

### RC-SEC-001 Stored XSS Payload in Notes

- Steps:
  1. Enter <script>alert('xss')</script> in notes.
  2. Submit registration.
  3. Load customer in UI contexts where notes may render.
- Expected:
  - Payload must not execute.
  - If stored, it must be safely encoded at render time.

### RC-SEC-002 Reflected XSS-like Payload in Name Fields

- Steps:
  1. Enter payload such as <img src=x onerror=alert(1)> in contact fields.
  2. Submit and navigate to any profile/list displaying those values.
- Expected:
  - No script execution.
  - Output is encoded/sanitized.

### RC-SEC-003 SQL/NoSQL Injection Probe in Email Field

- Steps:
  1. Submit email values such as test@example.com' OR '1'='1 and { "$ne": null }.
  2. Observe API response and DB writes.
- Expected:
  - Input rejected by validation, or stored as inert literal text.
  - No unauthorized query behavior.

### RC-SEC-004 Oversized Input Handling

- Steps:
  1. Submit extremely large strings in notes, business name, and address fields.
  2. Observe API stability and response time.
- Expected:
  - Request handled safely (validation/rejection if needed).
  - No server crash, timeout cascade, or log flooding.

### RC-SEC-005 Duplicate Customer ID Race Condition

- Steps:
  1. Attempt near-simultaneous submissions using same customerId.
- Expected:
  - Exactly one record created.
  - Other request rejected with duplicate constraint behavior.

### RC-SEC-006 Auth Bypass Attempt

- Steps:
  1. Call POST /api/customers without token.
  2. Call with expired token.
  3. Call with malformed token.
- Expected:
  - All rejected with proper auth error.
  - No data written.

### RC-SEC-007 Tenant Isolation / Ownership Check

- Steps:
  1. User A creates customer.
  2. User B tries to GET/PUT/DELETE User A's customer ID.
- Expected:
  - Access denied or not found due to createdBy scoping.

### RC-SEC-008 Address/HTML Injection in Recollection Flows

- Steps:
  1. Inject HTML tags in address fields.
  2. Verify Create Quotation dropdown and invoice-seeding screens.
- Expected:
  - Rendered as text only.
  - No DOM/script execution.

### RC-SEC-009 Sensitive Data Exposure in Logs

- Steps:
  1. Trigger a controlled validation failure.
  2. Inspect server logs.
- Expected:
  - No JWT secrets, auth tokens, or sensitive PII leaked unnecessarily.

### RC-SEC-010 Sequential-Write Integrity Risk Validation

- Steps:
  1. Force service call creation to fail after customer creation succeeds.
  2. Verify resulting state.
- Expected:
  - Failure is logged with remediation plan.
  - Risk acknowledged: partial persistence can occur without transaction rollback.

## Defect Logging Template

Use this format for failed tests:

- Test Case ID:
- Environment:
- Input Data:
- Actual Result:
- Expected Result:
- API Response (status/body):
- DB Evidence:
- Screenshot/Console Evidence:
- Severity:

Mandatory additions for security defects:

- Security category (XSS, injection, auth bypass, data exposure, etc.)
- Impact level (low/medium/high/critical)
- Exploitability notes
- Remediation owner and target date

## Exit Criteria

Pass when:

1. All happy path tests pass (UI, API, DB, recollection).
2. All validation tests return expected errors.
3. No unexplained partial-write records appear.
4. New customer is selectable in quotation flow.
5. Invoice pro-forma path resolves correctly from service call.
6. All failed tests are captured in server/logs/register_customers_test_errors.log with complete failure metadata.
7. All RC-SEC-* tests pass or are documented with approved mitigation plan.

## Notes

- The registration flow currently performs two sequential writes (customer first, service call second). If service call creation fails, customer may remain saved.
- Treat contract mismatch findings (customerType or required field drift between UI and backend) as high-priority integration defects.
