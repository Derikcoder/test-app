# MVP Roadmap — Full Service Cycle Testing & Hardening

**Created:** 2026-04-07  
**Branch:** `main`  
**Purpose:** End-to-end MVP validation roadmap covering the complete service lifecycle, all user roles, all customer models, and all service types. Drives us from first quote to final payment — thoroughly, securely, and at production quality.

---

## Architecture State Snapshot (April 7, 2026)

| Layer | Status |
|---|---|
| Quote creation + PDF + sharing (email/WhatsApp/Telegram) | ✅ Built |
| Invoice creation + calculation engine + sharing | ✅ Built |
| Public tokenized invoice approval page (`/invoice-approval/:token`) | ✅ Built |
| Service call registration + assignment | ✅ Built |
| All five customer profile views | ✅ Built (ResidentialCustomer fully complete; others partial) |
| Auto-generated IDs (AGT/CUST) | ✅ Built |
| Auth roles (`superAdmin`, `fieldServiceAgent`, `customer`) | ✅ Built |
| Customer quote acceptance from profile | ✅ Built (Phase 3.2 — a6ce0cd) |
| Customer portal-specific routing (role-gated UX) | ✅ Built (Phase 3.1 — ee3b152) |
| Convert approved quote to service call | ✅ Built (Phase 3.3 — 76c8a0c) |
| Field agent invoice UI (complete job → submit invoice) | ⚠️ Needs build |
| Payment process UI on customer profile | ⚠️ Needs build |
| Customer review / rating of field agent | ⚠️ Needs build |
| Service history on all customer profile types | ⚠️ Residential done; 4 others need wiring |
| Admin eagle-eye dashboard | ⚠️ Needs build |

---

## Phase 0 — Pre-Flight Setup & Verification

**Objective:** Confirm the environment is clean and all existing functionality is working before we add anything.

### 0.1 Environment Health Check
- [x] Start dev environment (`./start-dev.sh`) — confirm MongoDB connects (local → Atlas fallback)
- [x] Confirm backend is running on correct port with no startup errors
- [x] Confirm frontend builds without warnings (run `npm run build` in `/client`)
- [x] Run full test suite — all 310 tests must pass (83 Vitest + 227 Jest — `cd server && npm test` + `cd client && npx vitest run`)
- [x] Confirm `.env` has `JWT_SECRET`, `MONGODB_URI`, `APP_BASE_URL`, email credentials set

### 0.2 Data Verification
- [x] Confirm **Sampie van der Stel** (FieldServiceAgent, Mech, AGT-XXXXXX) exists in DB
- [x] Confirm the **service call for Alfred Raaimaar** (private, Genset, assigned to Sampie) exists and is in the correct status
- [x] Confirm no orphaned records or broken references exist

### 0.3 Baseline Security Scan
- [x] Confirm no JWT tokens or passwords appear in server logs (`server/logs/`)
- [x] Confirm `protect` middleware is applied to all non-public routes
- [x] Confirm auth null-user guard is active (deleted user's token returns 401)
- [x] Confirm immutable fields cannot be updated via direct API calls (test with Postman or curl)

---

## Phase 1 — Quote Creation & Sharing

**Entry point:** Logged in as Admin/BusinessAdministrator. Service call for Alfred Raaimaar is open and assigned.

### 1.1 Create Quote
- [x] Open service call → click **"Create Quote"**
- [x] Confirm `CreateQuoteModal` loads with correct service call context pre-filled (customer name, service type, equipment data)
- [x] Confirm auto-resolution selects correct line-item template based on service category (Genset → generic fallback or Cummins/Perkins if model detected)
- [x] Review auto-generated line items, adjust quantities/prices, add custom lines
- [x] Set `validUntil` date (default is +14 days — confirm default is set)
- [x] Confirm live total + VAT calculations are correct
- [x] Confirm profit margin warning triggers if below 20%
- [x] Submit quote → confirm `QT-XXXXXX` number is auto-generated
- [x] Confirm status is `draft` after creation

### 1.2 Quote Sharing
- [x] **Email share:** Send to `alfred@example.com` — confirm email is dispatched (check server logs if SMTP not live)
- [x] **WhatsApp share:** Confirm phone number normalises to `27XXXXXXXXX` format; confirm share URL opens correct chat
- [x] **Telegram share:** Confirm Telegram share link encodes quotation number and URL correctly
- [x] **Direct share link:** Copy share token URL → open in incognito (unauthenticated) → confirm PDF renders
- [x] Confirm share token is cryptographically random (24-byte hex)
- [x] Confirm PDF contains: quotation number, customer name, line items, subtotal, VAT, total, valid-until date
- [x] Confirm status updates to `sent` after share action

### 1.3 Quote Edge Cases
- [x] Attempt to access a share link with a tampered/invalid token → must return clear error, not a crash
- [x] Submit a quote with a missing line item description → must return validation error
- [x] Attempt to update `quotationNumber` via API → must be rejected (immutable field)

---

## Phase 2 — Customer Registration

**Principle:** "Book Service Call" intentionally does NOT auto-register a customer. We only collect and store data of people we do business with — explicitly: after they accept a quote.

### 2.1 Register Alfred Raaimaar as a Customer
- [x] Navigate to **Register New Customer** (`/customers/register`)
- [x] Select `customerType: residential`
- [x] Fill in: First Name, Last Name, contact email, phone, address
- [x] Submit → confirm `CUST-XXXXXX` auto-generated ID assigned
- [x] Confirm customer record appears in Customers list (`/customers`)
- [x] Confirm customer profile page (`/customers/:id`) renders correctly via `ResidentialCustomer.jsx`

### 2.2 Link Customer to Service Call
- [x] Navigate to the open service call for Alfred Raaimaar
- [x] Confirm the quotation can be linked to the newly registered customer record
- [x] Confirm service call and quotation both reference the same `customer._id`

### 2.3 Registration Security Checks
- [x] Confirm `customerId`, `createdBy` are not accepted from the request body (system-set only)
- [x] Confirm duplicate email registration is rejected with meaningful error
- [x] Confirm `customerType` enum is enforced — invalid type returns 400

---

## Phase 3 — Customer Portal: Quote Acceptance

**Objective:** Customer logs in, navigates to their profile, and accepts the quote.

### 3.1 Customer Login
- [x] Register Alfred Raaimaar as a **User** account (role: `customer`) — confirm this is possible via `/register`
- [x] Log in as `alfred` — confirm `role: customer` routes to the correct customer-facing experience
- [x] Confirm customer role does NOT see admin tabs (Agents, Service Calls management, etc.)
- [x] Confirm `ProtectedRoute` blocks unauthenticated access to profile pages

> **Gap to build:** If the current auth flow does not route `customer` role to a customer-specific dashboard, this routing gate needs to be wired in `App.jsx` and `AuthContext`.

### 3.2 Quote Acceptance from Customer Profile
- [x] Navigate to **ResidentialCustomer** profile page as Alfred
- [x] Confirm pending quotation is displayed in the profile (linked quotes section)
- [x] Click **Accept Quote** → confirm status updates from `sent` → `approved`
- [x] Confirm acceptance is recorded with timestamp and reference
- [x] Confirm rejection flow: click **Reject** → status → `rejected`, optional rejection note

> **Gap to build:** `ResidentialCustomer.jsx` currently shows service call history. A **Pending Quotations** section needs to be added that fetches `/api/quotations?customerId=X&status=sent` and renders accept/reject actions.

### 3.3 Post-Acceptance
- [x] Confirm admin/business view reflects quote status as `approved`
- [x] Confirm approved quote can be converted to an active work order / service call update
- [x] Confirm customer cannot accept an expired quote (`validUntil` date enforced server-side)

---

## ✅ Phase 0–3 Audit — PASSED (2026-04-08)

**All code requirements for Phases 0–3 verified against codebase.**

| Phase | Items | Status | Evidence |
|---|---|---|---|
| 0.1 Environment | Dev server, build, tests | ✅ | 310 tests passing (83 Vitest + 227 Jest) |
| 0.2 Data Verification | DB records (Sampie, Alfred, service call) | ✅ | Operational — records confirmed prior sessions |
| 0.3 Security Baseline | `protect` middleware, null-user guard, immutable fields, no token/password logging | ✅ | Code verified: auth.middleware.js, all route files, model IMMUTABLE_FIELDS, logger.middleware.js |
| 1.1 Create Quote | Modal, line items, VAT calc, profit warning, `draft` status, QT-XXXXXX | ✅ | Built: CreateQuoteModal.jsx, quotation.controller.js |
| 1.2 Quote Sharing | Email, WhatsApp, Telegram, direct link, PDF, crypto token, status→`sent` | ✅ | Built: `crypto.randomBytes(24)`, sendQuotation controller, emailService.js |
| 1.3 Quote Edge Cases | Invalid token, missing description, immutable quotationNumber | ✅ | Built: 400/410 responses, IMMUTABLE_FIELDS enforcement |
| 2.1 Register Customer | CUST-XXXXXX, all 5 profile types routed, form validation | ✅ | Built: RegisterNewCustomer.jsx, customer.controller.js, App.jsx routes |
| 2.2 Link to Service Call | customer._id on both quotation and service call | ✅ | Built: model references |
| 2.3 Registration Security | No customerId from body, duplicate email→409, customerType enum→400 | ✅ | Built: customer.controller.js lines 128–131, IMMUTABLE_FIELDS |
| 3.1 Customer Login | `customer` role routes to portal, admin tabs hidden, ProtectedRoute enforced | ✅ | Commit `ee3b152`: AdminRoute, Sidebar.jsx role gates |
| 3.2 Quote Acceptance | All 5 profile types: accept→`approved`, reject→`rejected`, reason stored | ✅ | Commit `a6ce0cd`: all 5 customer profile components |
| 3.3 Post-Acceptance | Admin `approved` badge, convert→job button, `validUntil` expiry UX | ✅ | Commit `76c8a0c`: Quotations.jsx + 5 profile pages |

**Next phase:** Phase 4 — Field Agent Invoice Completion & Sharing.

---

## Phase 4 — Field Agent: Invoice Completion & Sharing

**Entry point:** Logged in as Sampie van der Stel (role: `fieldServiceAgent`). Job is complete or ready for invoicing.

> **Audit update (2026-04-17):** Phase 4 is **substantially implemented** in the live codebase. The checklist below has been corrected to reflect verified current status.
>
> **Verification evidence:**
> - Targeted backend invoice workflow tests: **18/18 passing**
> - Targeted field-agent profile tests: **2/2 passing**
> - Implemented components/controllers: `FieldAgentSelfProfile.jsx`, `AgentProfile.jsx`, `SiteInstructionModal.jsx`, `InvoiceApprovalPage.jsx`, `invoice.controller.js`

### 4.1 Field Agent Job Completion Flow
- [x] Log in as Sampie → confirm agent-specific view with assigned jobs, pending quote actions, and self-dispatch support
- [x] Navigate to an assigned service call from the agent work queue
- [x] Update service call status using the **Mark Job Complete** action
- [ ] Confirm status transitions are fully guarded server-side so an agent cannot skip invalid workflow steps without the correct prior state

> **Status update:** The earlier “My Jobs view needs to be built” gap is now closed. The current agent workflow is exposed through `FieldAgentSelfProfile.jsx` and `AgentProfile.jsx`.

### 4.2 Invoice Creation
- [x] From the service call workflow, open **Create Invoice** / **Create Site Instruction**
- [x] Confirm line items pre-populate from the approved quotation when a linked quotation exists
- [x] Add actual labor hours, travel distance, consumables, deposit requirement, and notes
- [x] Confirm automatic cost calculation:
  - Parts cost = Σ(line items)
  - Labor cost = hours × rate
  - Travel cost = km × R8.50/km (or call-out floor R650 if <45km/<30min)
  - Consumables = % of parts cost
  - Subtotal → VAT (15%) → Total
- [x] Submit invoice → confirm `INV-XXXXXX` number generated
- [x] Confirm workflow advances from `draft` → `awaitingApproval` when the document is sent for approval

> **Status update:** The earlier “invoice creation UI still needs to be built” gap is no longer accurate. `SiteInstructionModal.jsx` now serves as the working invoice/pro-forma creation flow.

### 4.3 Invoice Sharing
- [x] **Email share:** Pro-forma invoice can be sent to the customer email address
- [x] **WhatsApp share:** Phone normalization and share URL generation are implemented
- [x] **Telegram share:** Generated message includes the invoice number, approval link, and PDF URL
- [x] **Public approval link:** `/invoice-approval/:token` (tokenized, no login required) is implemented and renders the review page
- [x] Confirm share token is **time-limited** via `shareTokenExpiresAt`
- [x] Confirm PDF contains invoice number, customer details, cost line items, totals, VAT, and due date

### 4.4 Invoice Edge Cases
- [x] Attempt to submit invoice with no line items → validation requires at least one billable item
- [x] Confirm `invoiceNumber` is immutable after creation
- [ ] Confirm or tighten the rule preventing a field agent from self-approving their own invoice outside the intended customer/admin approval path
---

## Phase 5 — Customer: Payment & Agent Review

**Entry point:** Re-logged in as Alfred Raaimaar (role: `customer`).

> **Audit update (2026-04-17):** Phase 5 is **partially to substantially implemented**. The authenticated customer portal already exposes billing documents, payment submission, and staged service review prompts. The remaining work is mostly UX polish rather than missing core backend capability.
>
> **Verification evidence:**
> - Targeted residential customer portal tests: **8/8 passing**
> - Targeted backend invoice workflow tests: **18/18 passing**
> - Implemented components/controllers: `ResidentialCustomer.jsx`, `CustomerBillingPanel.jsx`, `InvoiceApprovalPage.jsx`, `serviceCall.controller.js`, `invoice.controller.js`

### 5.1 Invoice Approval from Customer Profile
- [x] Navigate to `ResidentialCustomer` profile
- [x] Confirm pending invoice appears in the **Pending Billing & Payments** section (backed by `/api/invoices?customer=:id`)
- [x] Alternatively, open the tokenized `/invoice-approval/:token` link
- [x] Review invoice status, due date, outstanding balance, and deposit requirement inside the authenticated portal
- [x] Submit **Approve** with reference number via the tokenized approval page → confirm status → `approved`
- [x] Optionally test **Reject** with rejection note via the tokenized approval page → status → `rejected`

> **Status update:** The earlier gap stating that the authenticated customer invoice review section still needed to be built is no longer accurate. The portal already contains a billing section on the customer profile, and the public approval page handles formal approve/reject actions. A richer in-portal line-item approval experience would now be an enhancement, not a missing foundation.

### 5.2 Payment Process
- [x] Confirm payment methods available: `cash`, `eft`, `card`, `credit`, `other`
- [x] Submit a payment record against the invoice from the customer portal
- [x] Confirm payment is recorded with: amount, date, method, reference, and receipt number
- [x] Confirm invoice `amountPaid` and `balance` fields update correctly
- [x] Confirm invoice status → `paid` when `amountPaid >= totalAmount` (or the required deposit threshold is satisfied)
- [ ] Add or verify arbitrary customer-entered partial payment amounts in the portal UI; the current flow pays the required deposit or outstanding balance in one action

> **Status update:** The earlier payment-UI gap is closed. `CustomerBillingPanel.jsx` already submits payments in-app through `POST /api/invoices/:id/payment`.

### 5.3 Agent Review / Rating
- [x] Customer is prompted for a review during the pro-forma / invoice journey
- [x] Submit rating (1–5 stars) and optional text review
- [x] Confirm review is stored against the `ServiceCall` feedback history and latest rating snapshot
- [x] Confirm the field agent’s aggregate rating is updated server-side from invoice/completed-service feedback
- [ ] Add a dedicated review-history surface on `AgentProfile.jsx` if a richer testimonial view is still desired

> **Status update:** The earlier review/rating gap is largely closed. Rating capture, persistence, and aggregate scoring are implemented; the main remaining enhancement is a richer agent-facing history view for those reviews.

---

## Phase 6 — Customer Profile: Service History & Experience

**Objective:** The customer profile is the customer's long-term record of all business transacted.

> **Audit update (2026-04-17):** Phase 6 is **largely implemented**. All five customer profile variants now use the same self-service and billing patterns, service history renders with status badges and empty states, and profile editing is protected by immutable-field enforcement.
>
> **Verification evidence:**
> - Targeted residential customer portal tests: **8/8 passing**
> - Targeted customer controller tests: **43/43 passing**
> - Shared implementation across profile views: `CustomerSelfServicePanel.jsx` and `CustomerBillingPanel.jsx` are wired into all customer profile components

### 6.1 Service History Rendering
- [x] `ResidentialCustomer.jsx` — service call history is already wired
- [x] Wire identical service history section to:
  - `SingleBusinessCustomer.jsx`
  - `BranchCustomer.jsx`
  - `FranchiseCustomer.jsx`
  - `HeadOfficeCustomer.jsx`
- [x] Status badges render correctly for all major service call statuses
- [x] Empty state renders when no service calls exist (no crash, no blank)
- [ ] Clicking a service call row navigates to the service call detail (or expands inline)

> **Status update:** The shared customer portal now also includes grouped service insights, machine history access, and latest review context via the self-service panel.

### 6.2 Customer Experience Section
- [x] Display list of invoices with status, balances, payment due dates, and receipt context
- [x] Surface pending quotation actions and current quotation state on the customer profile
- [x] Display the latest customer review / staged service feedback context
- [x] Show outstanding balance context within the billing panel for unpaid work
- [x] "Book New Service" CTA is prominent and accessible from each customer profile

> **Status update:** The remaining enhancement here is not the absence of the experience section, but deeper historical views such as a full quotation archive and richer all-reviews browsing.

### 6.3 Profile Edit Security
- [x] Confirm `customerId` cannot be modified after creation (immutable field)
- [x] Confirm `customerType` change is blocked after registration (write-once boundary)
- [x] Confirm customer can update: contact details, address, service locations, notes
- [x] Confirm field-level permission checks in `customer.controller.js` are enforced
---

## Phase 7 — Admin Eagle-Eye Dashboard

**Objective:** Business owner / superAdmin sees the full operational picture at a glance.

> **Audit update (2026-04-17):** Phase 7 is **partially implemented**. The current admin experience is operational, but it is spread across the existing Service Calls, Customers, Field Service Agents, and Quotations screens instead of a single consolidated dashboard route.
>
> **Verification evidence:**
> - Admin-only route gating exists in `App.jsx` via `AdminRoute`
> - Sidebar and route visibility restrict admin pages away from customer and field-agent users
> - Live ops data already surfaces across `ServiceCalls.jsx`, `Customers.jsx`, `FieldServiceAgents.jsx`, and `Quotations.jsx`

### 7.1 Dashboard Views
- [x] **Live service calls:** Active calls, statuses, assigned agents, and customer names are visible in the Service Calls status dashboard
- [ ] **Quotations pipeline:** Counts by status at a single glance still need a dedicated summary widget, although filtering and review already exist in the Quotations page
- [ ] **Invoices receivable:** Backend summary endpoints exist, but a dedicated admin receivables widget is not yet surfaced in the UI
- [x] **Agent activity:** Agent listing already shows jobs completed, jobs in progress, quotes awaiting approval, and average rating
- [x] **Customer accounts:** Customer listing already shows registered accounts and type breakdown counts

### 7.2 Drill-Down Access
- [ ] Click a service call row → navigate to full service call detail
- [x] Click an agent → navigate to the agent profile view
- [x] Click a customer → navigate to the appropriate customer profile view based on customer type
- [ ] Click a quotation → navigate to a richer quotation detail panel or dedicated detail route
- [ ] Click an invoice → navigate to invoice detail with full cost breakdown

### 7.3 Admin Security
- [x] Confirm `superAdmin` and `businessAdministrator` roles can access the admin-facing pages and protected admin flows
- [x] Confirm `fieldServiceAgent` role cannot access admin pages through the frontend route gate
- [x] Confirm `customer` role cannot access admin pages through the frontend route gate
- [x] Confirm role checks are also present server-side via authorization middleware and role-aware access filters for protected resources

> **Status update:** The main gap is no longer “admin visibility is missing”; it is that the app still lacks one unified executive dashboard screen with combined widgets and drill-downs.
---

## Phase 8 — Full Cycle Repetition Matrix

After Phase 7 passes cleanly for the **first scenario** (Sampie + Alfred + Genset + Service Call), repeat the complete cycle for each combination below.

### 8.1 Service Type Matrix

| # | Service Category | Service Type | Notes |
|---|---|---|---|
| 1 | Genset | Service Call | ✅ First complete cycle |
| 2 | Genset | Emergency Repair | Different template, call-out floor pricing |
| 3 | Genset | Installation | New line item structure |
| 4 | Electrical | Service Call | New service category |
| 5 | Mechanical | Maintenance | Sampie's primary skill |
| 6 | Electronic | Fault Finding | Different diagnostic flow |

### 8.2 Customer Type Matrix

| # | Customer Type | Profile Component |
|---|---|---|
| 1 | Residential (private) | `ResidentialCustomer.jsx` ✅ |
| 2 | Single Business (SME) | `SingleBusinessCustomer.jsx` |
| 3 | Head Office | `HeadOfficeCustomer.jsx` |
| 4 | Branch | `BranchCustomer.jsx` |
| 5 | Franchise | `FranchiseCustomer.jsx` |

### 8.3 Agent Role Matrix

| # | Service Category | Skills |
|---|---|---|
| 1 | Mech | Mechanical, Electrical, Electronic | ✅ Sampie van der Stel |
| 2 | Electrical only | Electrical |
| 3 | Electronic only | Electronic |
| 4 | Multi-skilled senior | All three |

---

## Phase 9 — Performance, Optimization & Security Hardening

### 9.1 Frontend Performance
- [ ] All route components are `lazy()`-loaded ✅ (already in place)
- [ ] No component re-renders unnecessarily — profile components use `useCallback`/`useMemo` where appropriate
- [ ] No memory leaks — all `useEffect` hooks with async fetches use `isCancelled` guard ✅ (pattern established)
- [ ] Bundle analysis: run `npm run build -- --report` in `/client` → identify chunks >50kB that can be split further
- [ ] Images/icons are SVG or optimised — no uncompressed PNGs
- [ ] CSS: Tailwind purge is enabled in production build → no unused utility classes shipped

### 9.2 Backend Performance
- [ ] MongoDB indexes are present on all frequently-queried fields:
  - `ServiceCall`: `assignedAgent`, `createdBy`, `status`, `customer`
  - `Quotation`: `customer`, `status`, `shareToken`
  - `Invoice`: `customer`, `status`, `shareToken`
  - `Customer`: `customerId` (unique), `createdBy`, `customerType`
  - `FieldServiceAgent`: `employeeId` (unique), `createdBy`
- [ ] All list endpoints support pagination (`?page=&limit=`) — confirm no endpoint returns unbounded results
- [ ] PDF generation is synchronous and blocking — evaluate moving to a background job or stream-to-response for large invoices
- [ ] `emailService.js` failures do not crash the main request — confirm email errors are caught and logged, not thrown

### 9.3 Security Hardening (OWASP Top 10 Focus)

| # | Risk | Check |
|---|---|---|
| A01 | Broken Access Control | All routes behind `protect` middleware; role checks server-side not just frontend |
| A02 | Cryptographic Failures | JWT secret in `.env`, not hardcoded; share tokens are `crypto.randomBytes(24)` |
| A03 | Injection | Mongoose ODM parameterises all queries; no raw query string interpolation |
| A04 | Insecure Design | Immutable fields enforced; customer data only stored post-acceptance |
| A05 | Security Misconfiguration | No `MONGODB_URI` or secrets in committed files; `.env` in `.gitignore` |
| A06 | Vulnerable Components | Run `npm audit` in both `/server` and `/client` → fix all `high`/`critical` |
| A07 | Auth Failures | Null-user guard active; JWT expiry enforced; bcrypt for passwords |
| A08 | Software Integrity | No `eval()`, no dynamic `require()`; package-lock.json committed |
| A09 | Logging Failures | Request + error logs in `server/logs/`; no passwords/tokens logged |
| A10 | SSRF | No user-controlled URL fetching in backend |

- [ ] Run `npm audit --audit-level=high` in `/server` — zero high/critical vulnerabilities
- [ ] Run `npm audit --audit-level=high` in `/client` — zero high/critical vulnerabilities
- [ ] Confirm `shareToken` cannot be enumerated (token is random, not sequential)
- [ ] Confirm invoice public approval endpoint (`/invoice-approval/:token`) does not expose other customers' data
- [ ] Confirm rate limiting or brute-force protection is in place on `/auth/login`
- [ ] Confirm error responses never leak stack traces to the client in production mode

### 9.4 Data Integrity
- [ ] `SequenceCounter` uses `findOneAndUpdate` with `$inc` and `upsert: true` — confirm atomic (no race condition on concurrent agent/customer creation)
- [ ] All `ObjectId` references are validated before DB operations (malformed ID returns 400, not 500)
- [ ] Orphan prevention: deleting a service call → confirm linked quotations and invoices are handled (cascade or block)

---

## Build Queue (Gaps to Close Before MVP is Complete)

The following are concrete build tasks identified during roadmap analysis. These are sequenced by dependency.

| Priority | Task | Depends On |
|---|---|---|
| 1 | Customer-role routing gate in `App.jsx` (redirect `customer` to profile, not admin panels) | Phase 3 |
| 2 | Pending Quotations section on all customer profile pages | Phase 3 |
| 3 | Quote accept/reject actions from customer profile (authenticated) | Phase 3 |
| 4 | Field agent "My Jobs" view — list assigned service calls, mark complete | Phase 4 |
| 5 | `InvoiceCreateModal.jsx` — frontend invoice creation from completed service call | Phase 4 |
| 6 | Authenticated invoice review section on customer profile | Phase 5 |
| 7 | Payment submission UI on customer profile | Phase 5 |
| 8 | Agent rating schema + POST endpoint + customer review UI | Phase 5 |
| 9 | Service history wired to all 4 remaining customer profile types | Phase 6 |
| 10 | Admin `/dashboard` route + widgets | Phase 7 |

---

## Definition of MVP Complete

The MVP is considered complete when:

1. **One full cycle** passes cleanly from Service Call → Quote → Prospect Acceptance/Conversion → Customer Portal → Invoice → Payment → Review for **at least one combination** of each: service type, customer type, and agent type.
2. **All 38+ unit tests pass** with no regressions.
3. **Zero high/critical npm audit vulnerabilities** in server and client.
4. **All five customer profile types** render service history correctly.
5. **Admin dashboard** displays the full operational picture.
6. **No console errors** in the browser during any step of the cycle.
7. **No stack traces** returned to the client in any error response.

---

*This roadmap is a living document. Update the Build Queue and phase checkboxes as work progresses.*
