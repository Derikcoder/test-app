# UAT Sprint Plan — Pre-Phase 4 Validation

**Date Created:** 2026-02-26  
**Purpose:** Structured UAT sessions to validate Phase 0–3 end-to-end before advancing to Phase 4  
**Live Server:** Deploy-ready. Admin creates mock accounts on actual live server.

---

## Summary of Gaps Found

Before UAT can proceed, the following tooling must be built (Sprint UAT-0):

| Gap | Required Action |
|-----|----------------|
| No UI to provision FieldAgent login account | Build `adminProvisionUser` endpoint + UI button |
| No UI to provision Customer login account | Build `adminProvisionUser` endpoint + UI button |
| No delete button in Customers.jsx | Add delete with confirmation modal |
| Passkey system impractical (60s expiry) | Bypassed by direct admin provisioning approach |
| No UI for passkey generation | Bypassed by direct admin provisioning approach |

---

## Sprint UAT-0: Admin Tooling *(Build Sprint — Must Complete First)*

**Objective:** Give superAdmin the tools to create testable accounts and clean up after UAT.

### Work Items

| ID | Item | File(s) | Status |
|----|------|---------|--------|
| UAT-0.1 | **Backend**: `POST /api/auth/admin/provision-user` — direct user creation with password, links to agent/customer profile | `auth.controller.js`, `auth.routes.js` | ⬜ |
| UAT-0.2 | **Frontend**: "Provision Login Credentials" button + modal on each agent row in FieldServiceAgents.jsx | `FieldServiceAgents.jsx` | ⬜ |
| UAT-0.3 | **Frontend**: "Provision Login Credentials" button + modal on customer detail pages | Customer profile components | ⬜ |
| UAT-0.4 | **Frontend**: "Delete Customer" button in Customers.jsx with confirmation modal | `Customers.jsx` | ⬜ |

### Provision-User API Design

**Endpoint:** `POST /api/auth/admin/provision-user`  
**Access:** Private — `superAdmin`, `businessAdministrator`

```json
// Request body (fieldAgent)
{
  "role": "fieldServiceAgent",
  "profileId": "<FieldServiceAgent._id>",
  "userName": "agent_john",
  "email": "john@example.com",
  "password": "TempPass123!"
}

// Request body (customer)
{
  "role": "customer",
  "profileId": "<Customer._id>",
  "userName": "customer_acme",
  "email": "contact@acme.com",
  "password": "TempPass123!"
}

// Response (201)
{
  "message": "User account provisioned successfully",
  "userId": "...",
  "userName": "agent_john",
  "email": "john@example.com",
  "role": "fieldServiceAgent"
}
```

**Behaviour:**
- Validates `profileId` exists and has no linked `userAccount` yet
- For `customer` role: auto-maps `businessName`, `phoneNumber`, `physicalAddress` from Customer profile
- Sets `isSuperUser: false` on the new User
- Links `User.fieldServiceAgentProfile` or `User.customerProfile`
- Updates `FieldServiceAgent.userAccount` or `Customer.userAccount` with the new User._id

### Acceptance Criteria — Sprint UAT-0

- [ ] SuperAdmin can click "Provision Login Credentials" on an agent row → modal opens
- [ ] Modal shows agent's email pre-filled, asks for username + password
- [ ] On submit: User account created, success message displayed with credentials
- [ ] Same flow works for customer from their profile page
- [ ] SuperAdmin can delete agent (profile only) — transaction history preserved
- [ ] SuperAdmin can delete customer (profile only) — transaction history preserved
- [ ] Provisioning same profile twice returns a clear error ("already has a linked user account")

---

## Sprint UAT-1: FieldAgent Onboarding + First Service Call

**Objective:** Validate the full FieldAgent loop from account creation to quotation.

### Test Accounts Required (created by superAdmin before this sprint)

| Account | Type | Login Details |
|---------|------|---------------|
| `agent_uat_01` | fieldServiceAgent | Provisioned via UAT-0.2 — use real test email |

### Test Scenarios

**Scenario 1.1 — Admin creates agent profile + provisions login**
1. SuperAdmin navigates to `Field Service Agents`
2. Clicks `+ Create Agent`, fills in: First Name, Last Name, test email, phone, area
3. Clicks `Provision Login Credentials` on the new agent row
4. Fills in `userName`, `password` → submits
5. ✅ **Expected:** Success banner, agent profile shows "Login: Provisioned"

**Scenario 1.2 — Agent first login**
1. Open incognito tab, navigate to login page
2. Enter provisioned credentials
3. ✅ **Expected:** Lands on AgentProfile/Dashboard
4. ✅ **Expected:** Sees empty service call tabs (to-attend, in-progress, completed)

**Scenario 1.3 — Agent creates a Service Call**
1. Logged in as agent
2. Navigate to service calls / create call
3. Fill in customer selection, description, priority
4. Submit
5. ✅ **Expected:** Service call created with status `new` or `open`

**Scenario 1.4 — Agent creates a Quotation (triggers status change)**
1. On the service call just created, click "Create Quotation"
2. Add at least one line item (parts/labour)
3. Submit quotation
4. ✅ **Expected:** Service call status changes to `awaiting-quote-approval`
5. ✅ **Expected:** Agent's "to-attend" tab updates

### Acceptance Criteria — Sprint UAT-1

- [ ] Agent login works with provisioned credentials
- [ ] Agent can create a service call
- [ ] Agent can create a quotation on that call
- [ ] Service call status transitions to `awaiting-quote-approval` after quotation
- [ ] Agent sees the call under correct tab

---

## Sprint UAT-2: Customer Onboarding + Quotation Approval

**Objective:** Validate the full Customer loop from account creation to approving a quotation.

### Test Accounts Required

| Account | Type | Login Details |
|---------|------|---------------|
| `customer_uat_01` | customer | Provisioned via UAT-0.3 — use real test email |

### Test Scenarios

**Scenario 2.1 — Admin creates customer profile + provisions login**
1. SuperAdmin navigates to `Customers`, creates customer (or uses existing)
2. Opens customer detail page
3. Clicks `Provision Login Credentials`
4. Fills in `userName`, `password` → submits
5. ✅ **Expected:** Success message, customer profile shows "Login: Provisioned"

**Scenario 2.2 — Customer first login**
1. Open incognito tab, navigate to login page
2. Enter provisioned credentials
3. ✅ **Expected:** Lands on customer dashboard/profile
4. ✅ **Expected:** Sees their pending service calls and quotations

**Scenario 2.3 — Customer approves quotation** *(requires Scenario 1.4 completed first)*
1. Logged in as customer
2. Navigate to the open service call with `awaiting-quote-approval` status
3. Review the quotation
4. Click "Approve Quotation"
5. ✅ **Expected:** Service call status changes to `in-progress`
6. ✅ **Expected:** Agent's service call tab updates to "in-progress"

**Scenario 2.4 — Customer rejects quotation**
1. On a different test service call
2. Customer clicks "Reject Quotation"
3. ✅ **Expected:** Service call status reverts to `open` or `requires-revision`
4. ✅ **Expected:** Agent is notified (or can see rejection status)

### Acceptance Criteria — Sprint UAT-2

- [ ] Customer login works with provisioned credentials
- [ ] Customer sees their assigned service calls
- [ ] Customer can approve a quotation
- [ ] Status transitions to `in-progress` after approval
- [ ] Customer can reject a quotation

---

## Sprint UAT-3: Full Phase 0–3 End-to-End Walkthrough

**Objective:** Run the complete Phase 0–3 journey with both mock accounts on the live server.

### Pre-Conditions
- UAT-0 complete (admin tooling built)
- UAT-1 and UAT-2 environments confirmed working
- Both mock accounts exist on live server

### Walkthrough Sequence

| Step | Actor | Action | Expected Outcome |
|------|-------|--------|-----------------|
| 1 | SuperAdmin | Creates FieldAgent profile | Profile visible in agent list |
| 2 | SuperAdmin | Provisions agent login | Credentials created, no error |
| 3 | SuperAdmin | Creates Customer profile | Customer visible in customer list |
| 4 | SuperAdmin | Provisions customer login | Credentials created, no error |
| 5 | Agent | Logs in | AgentProfile dashboard loads |
| 6 | Agent | Creates Service Call (assigns to customer) | Status = `new`/`open` |
| 7 | Agent | Creates Quotation with line items | Status = `awaiting-quote-approval` |
| 8 | SuperAdmin | Views service call from admin panel | Sees correct status and customer |
| 9 | Customer | Logs in | Sees pending service call |
| 10 | Customer | Approves Quotation | Status = `in-progress` |
| 11 | Agent | Refreshes dashboard | Sees call move to "in-progress" tab |
| 12 | SuperAdmin | Reviews full transaction trail | Both quotation + service call visible |

### Phase 4 Readiness Check
At the end of UAT-3, verify these Phase 4 prerequisites are confirmed:

- [ ] Agent can mark job as "Complete" (button visible on in-progress calls)
- [ ] `POST /invoices/from-service-call/:id/final` backend responds correctly
- [ ] `/invoice-approval/:token` page loads without error
- [ ] Invoice email/WhatsApp delivery confirmed working (with real email)

---

## Sprint UAT-4: Cleanup + Teardown

**Objective:** Clean up mock accounts without losing transaction history.

### Test Scenarios

**Scenario 4.1 — Delete agent profile**
1. SuperAdmin navigates to `Field Service Agents`
2. Clicks `Delete` on `agent_uat_01`
3. Confirms deletion in modal
4. ✅ **Expected:** Agent profile removed from list
5. ✅ **Expected:** Service calls previously created by this agent still visible in admin panel (orphaned but preserved)

**Scenario 4.2 — Delete customer profile**
1. SuperAdmin navigates to `Customers`
2. Clicks `Delete` on `customer_uat_01`
3. Confirms deletion in modal
4. ✅ **Expected:** Customer profile removed
5. ✅ **Expected:** Service calls and invoices for this customer still visible (transaction history preserved)

**Scenario 4.3 — Delete provisioned User accounts**
> Note: At this time, there is no UI for deleting User accounts directly. The User account linked to the agent/customer profile persists after profile deletion. This is acceptable for UAT — they can be archived rather than deleted.

### Acceptance Criteria — Sprint UAT-4

- [ ] Agent profile deleted, no server error
- [ ] Customer profile deleted, no server error
- [ ] Transaction history (service calls, quotations, invoices) still accessible from superAdmin panel
- [ ] No broken relationships cause 500 errors on admin pages

---

## Sprint UAT-5: Existing Customer, New Trade Category + Automatic Receipt Generation

**Objective:** Validate the repeat-service journey for an existing customer, specifically Bennie Henning, when a new service request is booked in a different trade category (`electrical`) and fulfilled by a newly created Field Service Agent in that category. Confirm that every successful payment event generates a formal receipt as proof of payment.

### Enterprise Testable Features

| ID | Feature | Why It Matters | Priority |
|----|---------|----------------|----------|
| UAT-5.1 | Existing customer can be booked again without creating a duplicate customer profile | Protects data integrity and CRM accuracy | Critical |
| UAT-5.2 | New electrical Field Service Agent profile can be created and provisioned for login | Confirms category-specific staffing workflow | Critical |
| UAT-5.3 | Newly provisioned agent can log in and see only the correct role-scoped workspace | Verifies authorization and role isolation | Critical |
| UAT-5.4 | Service call can be created for Bennie Henning under a different service category | Confirms multi-category support for repeat customers | Critical |
| UAT-5.5 | Service call can be assigned to the new electrical agent and appears in that agent's queue | Validates dispatch and assignment routing | Critical |
| UAT-5.6 | Agent can progress the job through quotation, approval, work execution, and invoicing | Confirms end-to-end operational workflow | Critical |
| UAT-5.7 | Customer payment updates invoice/pro-forma balances accurately | Validates financial correctness | Critical |
| UAT-5.8 | A receipt is generated automatically on every successful payment event (deposit, partial, or full) | Provides proof of payment and audit compliance | Critical |
| UAT-5.9 | Receipt clearly states why the payment was made | Prevents ambiguity and supports customer trust | Critical |
| UAT-5.10 | Receipt is available to both admin and customer as part of the payment trail | Supports support-team lookup and customer self-service | High |
| UAT-5.11 | Settled invoices display zero outstanding balance after final payment | Confirms ledger closure | High |
| UAT-5.12 | Historic generator-service work remains separate from new electrical-service work while staying under the same customer account | Protects cross-job traceability | High |

### Expected Result Forecast

| Step | Actor | Action | Expected System Result | Pass Metric |
|------|-------|--------|------------------------|-------------|
| 1 | SuperAdmin | Create a new Field Service Agent in the `electrical` category | Agent profile saves successfully with correct category/skills | Agent appears in directory with `electrical` classification |
| 2 | SuperAdmin | Provision the new agent's login | Secure access credentials are generated and linked to the new agent profile | Success banner appears; linked login status visible |
| 3 | SuperAdmin | Book a new service call for Bennie Henning | Existing customer record is reused; no duplicate customer profile created | One new service call, zero duplicate customer records |
| 4 | SuperAdmin or dispatcher | Assign the new electrical service call to the new electrical agent | Assigned agent field updates correctly | Service call visible in agent's queue |
| 5 | Electrical agent | Log in and open assigned work | Agent sees only authorized workload for their role | Assigned job visible under the expected tab |
| 6 | Electrical agent | Create and send a quotation or pro-forma for the electrical work | Document is created with the new service context and linked to the same customer | Quote or pro-forma shows correct job reason, customer, and category |
| 7 | Customer | Approve the quotation or settle the required deposit/outstanding balance | Workflow advances and payment status updates correctly | Status changes match the workflow rules |
| 8 | System | Record the payment | Paid amount, balance, and settlement state update immediately | Payment totals and remaining balance are mathematically correct |
| 9 | System | Generate a receipt automatically after successful payment | Receipt record is created with a unique receipt number and proof-of-payment details | Receipt is visible/downloadable and linked to the payment |
| 10 | Customer/Admin | Review the receipt | Receipt clearly explains why payment was made and what it covers | Document includes service reason, invoice/pro-forma number, payment method, amount, and balance state |
| 11 | System | Mark invoice as settled after full balance is paid | Outstanding balance drops to zero and settled state is shown consistently | Portal and admin view both display `settled` or `paid` |
| 12 | Admin | Audit the customer history | Previous generator work and new electrical work remain distinct but both belong to Bennie Henning | Full traceability preserved across categories |

### Receipt Minimum Acceptance Criteria

Every receipt generated from a successful payment should include:

- A unique, immutable receipt number
- Payment date and time
- Customer name and contact identity
- Service reason / payment purpose (for example: deposit for electrical repair, final payment for generator maintenance, outstanding balance for site instruction work)
- Service call reference
- Invoice or pro-forma number
- Payment amount, payment method, and transaction/reference number
- Balance before payment and balance after payment
- Settlement state (`partial`, `paid`, or `settled`)
- Issuing business identity and support contact information
- Linked audit metadata showing who recorded or triggered the payment

### Failure Conditions to Test

- No receipt should be created for failed, cancelled, or invalid payment attempts
- Duplicate receipt generation must not occur for the same payment transaction
- A receipt must not omit the payment reason or linked document reference
- A customer must not be able to view another customer's receipt
- A new electrical service booking must not overwrite or corrupt Bennie Henning's prior service history

### TDD-First Validation Targets

Before implementation is considered complete, these tests should exist and pass:

- Backend unit test: successful payment returns receipt metadata
- Backend unit test: receipt payload includes payment reason and linked document references
- Backend unit test: full payment changes invoice to settled and receipt reflects zero balance outstanding
- Backend unit test: partial payment generates receipt while preserving remaining balance
- Frontend test: customer can see or download the receipt after payment is recorded
- Frontend test: admin can review receipt details from the billing history trail
- Negative test: invalid or declined payment does not create a receipt

### UAT-5 Acceptance Criteria

- [ ] Existing customer reuse is confirmed — no duplicate customer profile created for Bennie Henning
- [ ] New electrical agent is created, provisioned, and can log in successfully
- [ ] Electrical service call is assigned and visible to the correct agent only
- [ ] Quote/pro-forma/invoice flow works for the new job category
- [ ] Every successful payment generates one receipt automatically
- [ ] Receipt explicitly states why the payment was made
- [ ] Receipt contains enough detail to serve as valid proof of payment for customer support and audit review
- [ ] Fully paid documents display the correct settled state across customer and admin views

## Build Order

```
Sprint UAT-0 (build)  →  Sprint UAT-1 (test)  →  Sprint UAT-2 (test)
                                                          ↓
                                                  Sprint UAT-3 (integration)
                                                          ↓
                                                  Sprint UAT-4 (cleanup)
                                                          ↓
                                                    Phase 4 begins
```

---

## Current Sprint Status

| Sprint | Status | Blocker |
|--------|--------|---------|
| UAT-0 | 🔨 Building | — |
| UAT-1 | ⏸ Blocked | UAT-0 must complete first |
| UAT-2 | ⏸ Blocked | UAT-0 must complete first |
| UAT-3 | ⏸ Blocked | UAT-1 + UAT-2 must pass |
| UAT-4 | ⏸ Blocked | UAT-3 must complete |
| UAT-5 | 📝 Planned | Receipt generation + cross-category repeat-service validation |

---

*Last updated: 2026-04-16*
