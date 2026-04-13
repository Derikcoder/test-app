# Session Startup Log — 2026-04-10

> Update on 2026-04-13: parts of this plan are now superseded by the prospect-first conversion policy.
> Customer and portal user creation no longer happen at quote send time. They now happen only when the quotation is accepted.

**Goal:** MVP Phase 04 — Customer Portal: Full Quote-to-In-Progress Cycle
**Branch:** `main` (work directly, or open a new feature branch per task)
**Last Commit on main:** `34ce6ca` — Merge of `feature/field-agent-profile-ui`

---

## 🎯 Session Objective

Walk the complete service transaction cycle from the **customer's point of view**:

1. SuperAdmin creates a service call → assigns to field agent
2. Agent creates a quote (simulating a completed site visit) → sends to customer via **email (PDF)**
3. Customer reviews the quote via secure share link before any platform account exists
4. Customer accepts the quote
5. Acceptance creates the `Customer` record + customer portal `User`, then sends the set-password email
6. Acceptance moves the transaction: `sent` → `approved` → service call `in-progress`
7. Agent views the **In Progress** tab in `FieldAgentSelfProfile` → clicks a job → edits or re-submits the quotation

---

## ✅ What Already Works (Do Not Rebuild)

| Feature | File/Endpoint | Status |
|---|---|---|
| Create service call as admin | `ServiceCalls.jsx` → `POST /api/service-calls` | ✅ |
| Assign service call to agent | `ServiceCalls.jsx` → PUT assign endpoint | ✅ |
| Agent sees assigned jobs in "To Attend" tab | `FieldAgentSelfProfile.jsx` | ✅ |
| Agent creates quote from job card | `CreateQuoteModal` in `FieldAgentSelfProfile.jsx` | ✅ |
| Send quote via email as PDF | `sendQuotationEmail` in `emailService.js` | ✅ |
| Quote PDF generation | `quotation.controller.js` + `pdfGeneration.js` | ✅ |
| Admin provisions customer user account | `POST /api/auth/admin/provision-user` | ✅ (no welcome email yet) |
| Quote acceptance by customer | `ResidentialCustomer.jsx` → `PATCH /quotations/share/:token/accept` | ✅ |
| Quote approval triggers service call `in-progress` | `quotation.controller.js` Phase 3.3 logic | ✅ |
| Agent "In Progress" tab shows filtered jobs | `FieldAgentSelfProfile.jsx` `in-progress` tab | ✅ |
| Agent "Create Quote" on unquoted job | `CreateQuoteModal` in job card | ✅ |
| PublicInvoiceApprovalPage | `InvoiceApprovalPage.jsx` | ✅ |

---

## 🔨 Gaps to Build Today (Priority Order)

---

### GAP 1 — Customer `ProfileRoute` (BLOCKING the demo)

**Problem:**  
`ProfileRoute` in `App.jsx` only handles `fieldServiceAgent`. When a `customer` logs in and goes to `/profile`, they see `UserProfile` (admin generic view), not their `ResidentialCustomer` profile with quote acceptance.  

The routes for `/customers/residential/:id` etc. are all wrapped in `AdminRoute`, so customers cannot access them directly.

**The auth response already includes `customerType` and `customerProfile` for customer-role logins.** We just need to wire them up.

**Implementation approach:**

**Step 1 — Add `GET /api/customers/me` endpoint (backend)**

File: `server/controllers/customer.controller.js`  
Add before `createCustomer`:
```js
export const getMyCustomerProfile = async (req, res) => {
  try {
    const customer = await Customer.findOne({ userAccount: req.user._id });
    if (!customer) return res.status(404).json({ message: 'Customer profile not found' });
    res.json(customer);
  } catch (error) {
    logError('getMyCustomerProfile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
```

File: `server/routes/customer.routes.js`  
Add BEFORE any `/:id` route:
```js
import { ..., getMyCustomerProfile } from '../controllers/customer.controller.js';
router.get('/me', protect, getMyCustomerProfile);
```

**Step 2 — Create `CustomerSelfProfile.jsx` (frontend)**

File: `client/src/components/CustomerSelfProfile.jsx`  
Pattern: mirrors `FieldAgentSelfProfile.jsx` (fetches from `/customers/me`)  
But this component is a **thin wrapper** — it loads the customer record, determines `customerType`, then renders the appropriate profile component with the customer data.

Core logic:
```jsx
// Fetch customer profile
const res = await api.get('/customers/me', { headers: { Authorization: `Bearer ${user.token}` } });
const customer = res.data;
// Render based on customerType
if (customer.customerType === 'residential') return <ResidentialCustomer inlineProp={customer._id} />;
// etc.
```

**Simpler alternative** (recommended to start):  
Modify `ProfileRoute` to redirect the customer directly to their correct customer profile URL, and create a separate **unguarded** (ProtectedRoute only, not AdminRoute) route set for customer self-access:

In `App.jsx`:
```jsx
// ProfileRoute
const ProfileRoute = () => {
  const { user } = useAuth();
  if (user?.role === 'fieldServiceAgent') return <FieldAgentSelfProfile />;
  if (user?.role === 'customer') return <CustomerSelfProfile />;
  return <UserProfile />;
};

// Add separate unguarded routes for customer self-profile (ProtectedRoute only)
<Route path="/my-profile" element={
  <ProtectedRoute>
    <CustomerSelfProfile />
  </ProtectedRoute>
} />
```

**What to modify:**
- `server/controllers/customer.controller.js` — add `getMyCustomerProfile`
- `server/routes/customer.routes.js` — add `GET /me` route
- `client/src/components/CustomerSelfProfile.jsx` — new file (thin wrapper)
- `client/src/App.jsx` — add customer branch to `ProfileRoute` + lazy import

---

### GAP 2 — Historical Note (Superseded)

This gap has been superseded by the prospect-first policy implemented on 2026-04-13.
The quote email itself no longer needs to include a set-password link for prospects.
Instead, the set-password email is sent only after the quotation is accepted and the customer is converted.

**Implementation approach:**

**Step 1 — Modify `emailService.js`**

File: `server/utils/emailService.js`  
Function: `sendQuotationEmail`  
Add optional `resetUrl` parameter:

```js
export const sendQuotationEmail = async ({
  to, customerName, quotationNumber, shareUrl, pdfBuffer, resetUrl
}) => {
```

In the HTML body, add a conditional block after the share link:
```html
${resetUrl ? `
  <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />
  <p><strong>Action Required: Set Your Password</strong></p>
  <p>A secure account has been created for you so you can view and accept this quotation online.<br/>
  Click the button below to set your password. This link expires in <strong>1 hour</strong>.</p>
  <p>
    <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#0891b2;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">
      Set My Password
    </a>
  </p>
  <p style="font-size:12px;color:#6b7280;">Do not share this link. It is a one-time link tied to your account.</p>
` : ''}
```

**Step 2 — Generate reset token when sending quote email**

File: `server/controllers/quotation.controller.js`  
Function that calls `sendQuotationEmail` (the email share action, likely around `POST /api/quotations/:id/share-email` or similar).

When sending a quotation email:
1. Look up whether the customer has a linked User account
2. If yes, check if they have already set a password (flag or check `passwordResetExpires`)
3. If they haven't set a password, generate a `generatePasswordResetToken()` and save it
4. Pass `resetUrl` to `sendQuotationEmail`

Check exact function name:
```bash
grep -n "sendQuotationEmail\|shareEmail\|email.*share" server/controllers/quotation.controller.js | head -20
```

**Step 3 — Customer provisioning also sends welcome email**

File: `server/controllers/auth.controller.js`  
Function: `adminProvisionUser`  
Currently for `customer` role: creates account + reset token but does NOT send email.

Add after the `else` for customer branch (around line 1100, after `resetUrl` is set):
```js
if (role === 'customer') {
  const customerName = profile.contactFirstName
    ? `${profile.contactFirstName} ${profile.contactLastName}`
    : profile.businessName;
  await sendCustomerWelcomeEmail({ to: normalizedEmail, customerName, userName, resetUrl });
}
```

Then add `sendCustomerWelcomeEmail` to `emailService.js` (copy `sendAgentWelcomeEmail`, adjust copy).

---

### GAP 3 — Agent "Edit Quote" on In-Progress Jobs

**Problem:**  
`CreateQuoteModal` in `FieldAgentSelfProfile.jsx` job card is hidden when `call.quotation.status` is `sent`, `approved`, or `converted`. So for an in-progress job (where quote is already approved), the agent has no way to edit the quote.

`CreateQuoteModal` already supports `editMode` prop and pre-population from an existing quotation.

**Implementation approach:**

File: `client/src/components/FieldAgentSelfProfile.jsx`  
Find the block:
```jsx
{(!call.quotation || !['sent', 'approved', 'converted'].includes(call.quotation.status)) && (
  <CreateQuoteModal ...>
```

Replace with: show `CreateQuoteModal` for new quotes **AND** show an "Edit Quote" button for in-progress jobs with an existing quotation:
```jsx
{/* Create quote if no quote yet */}
{(!call.quotation || !['sent', 'approved', 'converted'].includes(call.quotation.status)) && (
  <CreateQuoteModal ... />
)}

{/* Edit quote for in-progress jobs */}
{call.status === 'in-progress' && call.quotation && (
  <CreateQuoteModal
    token={user?.token}
    serviceCallId={call._id}
    existingQuotation={call.quotation}
    editMode={true}
    onQuoteCreated={fetchAgentData}
    triggerLabel="Edit Quote"
  />
)}
```

---

## 📋 Pre-Flight Checklist (Run at Session Start)

```bash
# 1. Start dev environment
cd "/home/derick/React Projects/test-app"
./start-dev.sh

# 2. Confirm backend alive
curl -k https://localhost:5000/api/health 2>/dev/null || echo "check manually"

# 3. Run full test suite (should be 255+)
cd server && npm test -- --no-coverage 2>&1 | tail -5
cd ..

# 4. Confirm working accounts
# SuperAdmin:  jj@wolmaranskontrakdienste.co.za (see server/.env)
# FieldAgent:  privtfa1@wolmaranskontrakdienste.co.za (mechagent001_test)
# Must look up or create customer test account during session
```

---

## 🗂️ Data Setup Steps (Manual, Do Before Coding)

These must be done in the **running app** before the code changes, to have test data ready:

1. **Log in as SuperAdmin** (`jj@wolmaranskontrakdienste.co.za`)
2. **Create a new test Customer record** (Register New Customer → Residential)
   - Name: test customer you can use repeatedly
   - Email: use an Ethereal-compatible address or real test email
3. **Create a Service Call** from booking-request / prospect data and assign it later if needed
4. Create and send a quotation without pre-provisioning any customer portal account
5. Accept the quotation through the share link to trigger customer + portal-user creation

---

## 🏗️ Implementation Order

| # | Task | File(s) | Time Est. |
|---|---|---|---|
| 1 | `GET /api/customers/me` endpoint | `customer.controller.js`, `customer.routes.js` | ~15 min |
| 2 | `CustomerSelfProfile.jsx` (thin wrapper + render right type) | new component | ~45 min |
| 3 | `ProfileRoute` update for customer role | `App.jsx` | ~5 min |
| 4 | `sendCustomerWelcomeEmail` in emailService | `emailService.js` | ~20 min |
| 5 | `adminProvisionUser` sends customer welcome email | `auth.controller.js` | ~10 min |
| 6 | `sendQuotationEmail` accepts `resetUrl` | `emailService.js` | ~15 min |
| 7 | Quotation email share generates + passes `resetUrl` | `quotation.controller.js` | ~20 min |
| 8 | "Edit Quote" button on in-progress job cards | `FieldAgentSelfProfile.jsx` | ~15 min |
| 9 | Unit tests for all new controller functions | test files | ~30 min |
| 10 | MVP Phase 04 walkthrough end-to-end test | manual | ~20 min |

**Total est. ~3 hrs**

---

## 🧪 End-to-End Test Script (Manual Walkthrough)

Run this at the end of the session to confirm the whole flow works:

1. [ ] Log in as **SuperAdmin**
2. [ ] Create new service call → assign to `mechagent001_test`
3. [ ] Log in as **Field Agent** (`privtfa1@wolmaranskontrakdienste.co.za`)
4. [ ] Navigate to `/profile` → see `FieldAgentSelfProfile` → see new job in "To Attend" tab
5. [ ] Click job → click "Create Quote" → fill in line items → click "Send via Email"
6. [ ] **Check Ethereal** (or real inbox) → email arrives with PDF/share link for the prospect
7. [ ] Open the share link and click **Accept**
8. [ ] Confirm acceptance triggers customer + portal-user creation and sends a follow-up set-password email
9. [ ] Set the password from that follow-up email
10. [ ] Log in as **Customer**
11. [ ] Navigate to `/profile` → see `CustomerSelfProfile` / `ResidentialCustomer` view
12. [ ] Service call status should flip to `in-progress`
13. [ ] Log back in as **Field Agent**
14. [ ] Navigate to `/profile` → In Progress tab shows the job
15. [ ] Click the job → "Edit Quote" button is present
16. [ ] Full test suite still passes (255+)

---

## 📎 Key File Reference

| File | Purpose |
|---|---|
| `client/src/App.jsx` | ProfileRoute — add customer branch |
| `client/src/components/CustomerSelfProfile.jsx` | NEW — customer self-view |
| `client/src/components/ResidentialCustomer.jsx` | Quote acceptance UI (already built) |
| `client/src/components/FieldAgentSelfProfile.jsx` | "Edit Quote" on in-progress cards |
| `server/controllers/customer.controller.js` | Add `getMyCustomerProfile` |
| `server/routes/customer.routes.js` | Add `GET /me` |
| `server/controllers/auth.controller.js` | `adminProvisionUser` → send customer welcome email |
| `server/controllers/quotation.controller.js` | Quote email send → include `resetUrl` |
| `server/utils/emailService.js` | `sendCustomerWelcomeEmail` + `sendQuotationEmail` with `resetUrl` |
| `server/tests/unit/controllers/customer.controller.test.js` | Add tests for `getMyCustomerProfile` |

---

## 🔗 MVP_ROADMAP Reference

This session completes the following from `MVP_ROADMAP.md`:

- **Phase 4.1** — Field agent job list (in-progress tab) ✅ already done
- **Phase 4.1 gap** — "Edit Quote" on in-progress job → `CreateQuoteModal` in edit mode
- **Phase 3 gap** — Customer role `/profile` routing to their actual customer profile
- **Phase 3 gap** — Customer provisioning welcome email
- **Phase 2 / Phase 4 link** — Quote acceptance converts a prospect into a portal-enabled customer account

---

## 🔐 Security Notes

- `GET /api/customers/me` must use `protect` middleware — no public access
- The `resetUrl` in the quote email is a **one-time token** — it calls the existing `/reset-password/:token` endpoint and expires in 1 hour
- Do NOT return `resetToken` raw in any API response — only ever in the email
- Customer self-access to their profile must confirm `customer.userAccount === req.user._id` server-side (already enforced in `getMyCustomerProfile` via userAccount lookup)

---

*Created: 2026-04-09 — End of session*
*Author: GitHub Copilot (Session 27 continuation)*
