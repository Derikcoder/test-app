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

**Entry point:** Logged in as Sampie van der Stel (role: `fieldServiceAgent`). Job is complete.

### 4.1 Field Agent Job Completion Flow
- [ ] Log in as Sampie → confirm agent-specific view (currently: limited to profile + assigned service calls)
- [ ] Navigate to assigned service call for Alfred Raaimaar
- [ ] Update service call status to `inProgress` → `completed`
- [ ] Confirm status transitions are sequential (cannot skip from `pending` to `completed`)

> **Gap to build:** `AgentProfile.jsx` or a dedicated **MyJobs** view needs to list service calls assigned to the logged-in agent (filter `/api/service-calls?assignedAgent=:agentId`) with a "Complete Job" action.

### 4.2 Invoice Creation
- [ ] From completed service call, click **"Create Invoice"** (or navigate to Invoice creation UI)
- [ ] Confirm line items pre-populate from the approved quotation (if linked)
- [ ] Add actual labor hours, travel distance, consumables
- [ ] Confirm automatic cost calculation:
  - Parts cost = Σ(line items)
  - Labor cost = hours × rate
  - Travel cost = km × R8.50/km (or call-out floor R650 if <45km/<30min)
  - Consumables = % of parts cost
  - Subtotal → VAT (15%) → Total
- [ ] Submit invoice → confirm `INV-XXXXXX` number generated
- [ ] Confirm status is `draft` → update to `awaitingApproval`

> **Gap to build:** Invoice creation UI. The backend invoice controller is complete. The frontend needs an **InvoiceCreateModal** analogous to `CreateQuoteModal.jsx`.

### 4.3 Invoice Sharing
- [ ] **Email share:** Send pro-forma invoice to Alfred's email
- [ ] **WhatsApp share:** Confirm phone normalisation and share URL
- [ ] **Telegram share:** Confirm message encodes invoice number, approval link, and PDF URL
- [ ] **Public approval link:** `/invoice-approval/:token` (tokenized, no login required) — confirm page renders
- [ ] Confirm share token is single-use OR time-limited (review `shareToken` expiry policy in `Invoice.model.js`)
- [ ] Confirm PDF contains: invoice number, customer details, all cost line items, totals, VAT, due date

### 4.4 Invoice Edge Cases
- [ ] Attempt to submit invoice with `laborHours: 0` and no line items → must require at least one billable item
- [ ] Confirm `invoiceNumber` is immutable after creation
- [ ] Attempt to approve own invoice as agent (should require admin or customer approval role)

---

## Phase 5 — Customer: Payment & Agent Review

**Entry point:** Re-logged in as Alfred Raaimaar (role: `customer`).

### 5.1 Invoice Approval from Customer Profile
- [ ] Navigate to `ResidentialCustomer` profile
- [ ] Confirm pending invoice appears (fetch `/api/invoices?customerId=X&status=awaitingApproval`)
- [ ] Alternatively, open the tokenized `/invoice-approval/:token` link
- [ ] Review invoice line items, totals, and VAT
- [ ] Submit **Approve** with reference number → confirm status → `approved` / `finalized`
- [ ] Optionally test **Reject** with rejection note → status → `rejected`

> **Gap to build:** Authenticated customer invoice review section on `ResidentialCustomer.jsx` (separate from the public tokenized page — logged-in customer gets richer view).

### 5.2 Payment Process
- [ ] Confirm payment methods available: `cash`, `eft`, `card`, `credit`, `other`
- [ ] Submit a payment record against the invoice
- [ ] Confirm payment is recorded with: amount, date, method, reference
- [ ] Confirm invoice `amountPaid` and `balance` fields update correctly
- [ ] Confirm invoice status → `paid` when `amountPaid >= totalAmount`
- [ ] Test partial payment: invoice remains `partiallyPaid` with correct balance shown

> **Gap to build:** Payment submission UI on the customer profile page that calls `POST /api/invoices/:id/payments`.

### 5.3 Agent Review / Rating
- [ ] After invoice is paid, customer is prompted to review Sampie van der Stel
- [ ] Submit rating (1–5 stars) and optional text review
- [ ] Confirm review is stored against the `FieldServiceAgent` record
- [ ] Confirm review is visible on `AgentProfile.jsx`

> **Gap to build:** Rating schema on `FieldServiceAgent.model.js`, review submission endpoint, and review UI on customer profile.

---

## Phase 6 — Customer Profile: Service History & Experience

**Objective:** The customer profile is the customer's long-term record of all business transacted.

### 6.1 Service History Rendering
- [ ] `ResidentialCustomer.jsx` — service call history is already wired ✅
- [ ] Wire identical service history section to:
  - `SingleBusinessCustomer.jsx`
  - `BranchCustomer.jsx`
  - `FranchiseCustomer.jsx`
  - `HeadOfficeCustomer.jsx`
- [ ] Status badges render correctly for all 8 service call statuses
- [ ] Empty state renders when no service calls exist (no crash, no blank)
- [ ] Clicking a service call row navigates to the service call detail (or expands inline)

### 6.2 Customer Experience Section
- [ ] Display list of all invoices with status, totals, payment due dates
- [ ] Display list of accepted/rejected quotations
- [ ] Display all filed agent reviews by this customer
- [ ] Outstanding balance banner if any invoice is unpaid
- [ ] "Book New Service" CTA is prominent and always accessible

### 6.3 Profile Edit Security
- [ ] Confirm `customerId` cannot be modified after creation (immutable field)
- [ ] Confirm `customerType` change is blocked after registration (write-once boundary)
- [ ] Confirm customer can update: contact details, address, service locations, notes
- [ ] Confirm field-level permission checks in `customer.controller.js` are enforced

---

## Phase 7 — Admin Eagle-Eye Dashboard

**Objective:** Business owner / superAdmin sees the full operational picture at a glance.

### 7.1 Dashboard Views
- [ ] **Live service calls:** All active calls, statuses, assigned agents, customer names
- [ ] **Quotations pipeline:** Counts by status (draft, sent, approved, rejected, expired, converted)
- [ ] **Invoices receivable:** Total outstanding, overdue, paid this month
- [ ] **Agent activity:** Each agent's active calls, completion rate, average rating
- [ ] **Customer accounts:** Total registered, new this month, type breakdown

### 7.2 Drill-Down Access
- [ ] Click a service call row → navigate to full service call detail
- [ ] Click an agent → navigate to `AgentProfile.jsx`
- [ ] Click a customer → navigate to appropriate customer profile view based on `customerType`
- [ ] Click a quotation → navigate to `Quotations.jsx` detail panel
- [ ] Click an invoice → navigate to invoice detail with full cost breakdown

### 7.3 Admin Security
- [ ] Confirm `superAdmin` and `businessAdministrator` roles can access all records (their own `createdBy` scope)
- [ ] Confirm `fieldServiceAgent` role cannot access admin dashboard
- [ ] Confirm `customer` role cannot access admin dashboard
- [ ] Confirm role checks are enforced server-side (not just frontend-gated)

> **Gap to build:** Admin dashboard component with the above widgets. Can be built as a new route `/dashboard` protected by role check.

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
