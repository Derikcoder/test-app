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

---

*Last updated: 2026-02-26*
