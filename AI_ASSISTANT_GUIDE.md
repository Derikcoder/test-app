# AI Assistant Guide - Field Service Management System

**Last Updated:** April 8, 2026  
**Project Version:** 1.0.0  
**Target Audience:** AI Code Assistants (GitHub Copilot, Cursor, etc.)

---

## 🚨 CRITICAL: Pre-Exit Protocol

**BEFORE allowing the user to quit/close the code editor, you MUST:**

1. **Display Alert**: Prompt user with:
   ```
   ⚠️ WAIT! Before closing, should I update the project documentation?
   - AI_ASSISTANT_GUIDE.md (this file)
   - PROJECT-STRUCTURE.md
   - README.md
   
   Changes may have been made that aren't reflected in docs.
   Update documentation now? (Recommended: Yes)
   ```

2. **If User Confirms**: Scan for significant changes in the last session:
   - New files created
   - Modified routes or API endpoints
   - Changed authentication logic
   - Updated database schemas
   - New components added
   - Modified environment variables

3. **Update These Files**:
   - `AI_ASSISTANT_GUIDE.md` - Update "Recent Changes" section
   - `PROJECT-STRUCTURE.md` - Reflect any structural changes
   - `README.md` - Update if new features or setup steps were added
   - Add timestamp and change summary

4. **Only Then**: Allow editor to close

**This ensures project documentation stays synchronized with codebase changes.**

---

## 📋 Quick Context

### Recent Changes

#### Session: April 15, 2026 — Field Agent Category-First Registration
**Focus:** Align field agent creation with a category-first workflow and starter skill taxonomy for cleaner dispatch data

- ✅ `FieldServiceAgents.jsx` now renders `Category` immediately before `Skills` in the create-agent form, matching the intended registration flow after vehicle details
- ✅ Added shared taxonomy files on both frontend and backend so the same starter categories and skills are enforced consistently during registration and filtering
- ✅ New starter categories now include: Mechanical, Electrical, Plumbing, General Maintenance, Fencing Solutions, CCTV and Security Solutions, HVAC and Refrigeration Solutions, and Appliance Repairs
- ✅ Backend validation rejects mismatched skills for the selected category, keeping dispatch and reporting data clean
- ✅ Agent controller test suite updated and verified green after the taxonomy alignment

**Primary Files Updated:**
- `client/src/components/FieldServiceAgents.jsx`
- `client/src/constants/agentTaxonomy.js` (NEW)
- `server/config/agentTaxonomy.js` (NEW)
- `server/models/FieldServiceAgent.model.js`
- `server/controllers/agent.controller.js`
- `server/tests/unit/controllers/agent.controller.test.js`

#### Session: April 13, 2026 — Prospect-First Quote Conversion Policy
**Focus:** Prevent stale customer accounts by delaying customer/profile creation until a quotation is actually accepted

- ✅ `serviceCall.controller.js` no longer auto-creates `Customer` records from booking requests when a WhatsApp/phone prospect is captured; service calls can remain prospect-only until conversion
- ✅ `Quotation.model.js` now supports `recipientSnapshot` so quotations can be sent to prospects before a customer profile exists
- ✅ `createQuotationFromServiceCall` now allows quotation creation from service calls that only have booking request contact details, provided a prospect email exists
- ✅ `sendQuotation` now dispatches using either linked customer data or `recipientSnapshot` fallback data
- ✅ `acceptPublicQuotation` now performs the first true conversion step:
   - creates a `Customer` record if none exists
   - links the existing service call to that customer
   - creates the `customer` portal `User` account only at acceptance time
   - sends the new customer a set-password email after acceptance
- ✅ `rejectPublicQuotation` and quotation resolution cleanup now release email locks for both linked customers and prospect-only quotations
- ✅ New unit coverage added for prospect-first intake and quote acceptance conversion

**Policy Clarification:**
- Quotes may be sent to prospects without creating platform accounts
- Only accepted quotations produce real `Customer` + `User` records in MongoDB
- This keeps the CRM/auth store limited to converted sales customers, while still preserving pre-sale quotation workflow

#### Session: April 9, 2026 — FieldAgentSelfProfile + Role-Scoped API Endpoints
**Focus:** Built field agent's own workspace view; fixed `createdBy` filter bug blocking all agent data fetches

**New Component `FieldAgentSelfProfile.jsx`:**
- ✅ Renders at `/profile` when `user.role === 'fieldServiceAgent'` (via `ProfileRoute` in `App.jsx`)
- ✅ Reads `user.fieldServiceAgentProfile` (ObjectId string from auth) — no `useParams`
- ✅ Uses new role-scoped endpoints: `GET /api/agents/me`, `GET /api/service-calls/my-assigned`, `GET /api/service-calls/eligible-unassigned/:id`
- ✅ Same display/actions as `AgentProfile.jsx` but self-scoped: stats, tabbed calls, modals, accept/complete/invoice actions

**Bug Fix — `createdBy` filter:**
- ✅ `GET /api/agents/me` → `findOne({ userAccount: req.user._id })` (no `createdBy`)
- ✅ `GET /api/service-calls/my-assigned` → `find({ assignedAgent: req.user.fieldServiceAgentProfile })`
- ✅ `getEligibleUnassignedServiceCalls` + `selfAcceptServiceCall`: when caller is `fieldServiceAgent`, resolves `businessCreatedBy` from `agent.createdBy`; ownership guard on `userAccount`

**Tests:** 255/255 pass (+10 new unit tests covering all new functions and fieldServiceAgent role paths)
- ✅ `POST /api/auth/admin/resend-agent-welcome/:agentProfileId` registered in `auth.routes.js` (protect + authorizeRoles superAdmin/businessAdministrator)
- ✅ `FieldServiceAgents.jsx`: "Resend Invite" button added beside "Login ✓" for already-provisioned agents; `resendLoadingId` + `resendMessage` state; 5-second auto-clear feedback banner

**Email Test Suite:**
- ✅ `server/tests/unit/utils/emailService.test.js`: expanded from 9 → 22 tests; new suites for `createTransporter` (SMTP-first, Ethereal fallback) and `sendAgentWelcomeEmail` (recipient, username, reset URL, subject, text fallback, missing field throws, SMTP error propagation)
- ✅ `server/tests/integration/email.integration.test.js` (NEW): 7 integration tests using real Ethereal SMTP; covers `createTransporter()`, `sendAgentWelcomeEmail()`, `sendPasswordResetEmail()` end-to-end; all green in ~20 s

**UAT-0 Milestone:**
- ✅ Field agent `mechagent001_test` provisioned via secure invite flow
- ✅ Email delivered via Ethereal (preview URL: https://ethereal.email/message/adetCM1XWISjMMIIadetDEI3YJ8VjvU5AAAAAdzdm6FYk5KU55z7LzL.W2Q)
- ✅ Agent completed set-password flow and logged in successfully
- ✅ Dual-login confirmed: `jj@wolmaranskontrakdienste.co.za` (SuperAdmin) + `mechagent001_test` (fieldServiceAgent) simultaneously active
- ✅ 22 unit tests + 7 integration email tests all green

**Primary Files Updated:**
- `server/utils/emailService.js`
- `server/controllers/auth.controller.js`
- `server/routes/auth.routes.js`
- `client/src/components/FieldServiceAgents.jsx`
- `server/tests/unit/utils/emailService.test.js`
- `server/tests/integration/email.integration.test.js` (NEW)

---

#### Session: April 8, 2026 — CSS Refactoring + Design Principles
**Focus:** Token efficiency — extract repeated inline Tailwind strings into named CSS classes; fix `@layer components` syntax error; add CSS regression test suite; establish enterprise design principles

**CSS Refactoring:**
- ✅ Added second `@layer components {}` block to `client/src/index.css` containing 19 new named classes (details in `APPATUNID_UI_QUICKREF.md` and `GLASSMORPHISM_DESIGN_GUIDE.md`)
- ✅ Fixed PostCSS syntax error: new classes were written outside the `@layer components` closing brace — added the missing opening brace, file is now balanced
- ✅ Ran three `find . -name "*.jsx" -exec sed -i` batch passes across all 14 component files to replace raw inline Tailwind strings with named classes
- ✅ Manually fixed `AgentProfile.jsx` `!hasPhone` branch — three template-literal buttons updated to use `btn-action` base class + color variants
- ✅ Replaced two `md:w-1/2` half-width inputs in `ServiceCallRegistration.jsx` with `dark-field-input md:w-1/2` (responsive override preserved)
- ✅ Applied missed `page-center` and `collapsible-hd` sed passes that did not run in prior batch
- ✅ Zero raw inline patterns remain across all components (verified by `grep`)

**CSS Test Suite:**
- ✅ Created `client/src/__tests__/css/index.css.test.js` — 45 Vitest tests across 4 suites:
  - **Syntax**: brace balance, `@layer` count, `@apply` scope, `@apply` semicolons
  - **Class inventory**: asserts each of 24 expected classes is defined in `index.css`
  - **No raw inline patterns**: asserts 12 banned Tailwind strings do not appear in any component
  - **Usage sanity**: minimum usage counts for key classes to catch mass-reversion
- ✅ 45/45 passing

**New Classes Added (all in `client/src/index.css` second `@layer components` block):**

| Class | Replaces | Count |
|---|---|---|
| `.dark-field-input` | `w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3` | 68× |
| `.dark-label` | `mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-300` | 9× |
| `.field-kicker` | `text-xs font-bold uppercase tracking-[0.16em] text-white/55` | 14× |
| `.col-label` | `text-xs uppercase tracking-wider text-white/70` | 10× |
| `.page-center` | full-screen gradient + flex center | 12× |
| `.page-body` | full-screen gradient + py-12 px-4 | 8× |
| `.sub-card` | `rounded-2xl border border-white/15 bg-slate-950/25 p-4` | 6× |
| `.collapsible-hd` | collapsible row header pattern | 5× |
| `.form-checkbox-dark` | `h-4 w-4 rounded border-white/30 bg-white/10` | 6× |
| `.spinner-lg` | `animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto` | 6× |
| `.spinner-sm` | `animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-400` | 3× |
| `.btn-action` | `inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition` | base |
| `.btn-action-amber/cyan/emerald/blue/green/orange` | per-color button variants | 17× total |
| `.th-yellow` | `px-6 py-3 text-left text-xs font-medium text-yellow-300 uppercase tracking-wider` | 5× |
| `.th-cyan` | `px-6 py-3 text-left text-xs font-medium text-cyan-300 uppercase tracking-wide` | 5× |

**Documentation:**
- ✅ `AI_ASSISTANT_GUIDE.md` — this entry
- ✅ `PROJECT-STRUCTURE.md` — CSS architecture section updated
- ✅ `DESIGN_PRINCIPLES.md` — new file; enterprise-grade design guidelines

**Primary Files Updated:**
- `client/src/index.css`
- `client/src/components/AgentProfile.jsx`
- `client/src/components/ServiceCallRegistration.jsx`
- `client/src/components/*.jsx` (14 files via sed batch)
- `client/src/__tests__/css/index.css.test.js` (NEW)
- `DESIGN_PRINCIPLES.md` (NEW)

---

#### Session: April 7, 2026 — Portal-Publish on Submit, `awaiting-quote-approval` Status, Quotation Delete + Purge
**Commits:** `cfcbed5` (feat: auto portal-publish), `e2906f5` (feat: awaiting-quote-approval status), `e070c6f` (feat: delete + purge quotations)  
**Focus:** Quotation lifecycle — instant portal visibility, new service-call status, bulk stale-data purge

- ✅ `POST /api/quotations/:id/send` now accepts `channels: []` for portal-only publish (no external dispatch); non-empty array with all-invalid channel names still returns 400
- ✅ `CreateQuoteModal.jsx` `handleSubmit` auto-calls `/send` with `channels: []` after creation — customer sees quote immediately in their portal
- ✅ "Share Channels" UI section renamed to "Share PDF Externally" with clarifying description: portal-first, external channels are for non-account holders
- ✅ New `ServiceCall` status enum value: `awaiting-quote-approval` (sits between `in-progress` and `on-hold`)
- ✅ `createQuotationFromServiceCall` controller now auto-sets `serviceCall.status = 'awaiting-quote-approval'` after quote creation (unless terminal status)
- ✅ `ServiceCalls.jsx` filter + amber badge updated to use `awaiting-quote-approval`
- ✅ `DELETE /api/quotations/purge` — new endpoint (superAdmin only); deletes `expired`/`rejected` + overdue `draft`/`sent` (past `validUntil`); scoped to `createdBy`
- ✅ Route registered before `DELETE /api/quotations/:id` to prevent conflict
- ✅ Per-card two-step delete in `Quotations.jsx` (superAdmin + businessAdministrator; blocked for `converted`/`approved`)
- ✅ "Purge Stale" button in `Quotations.jsx` filter bar (superAdmin only)
- ✅ All 227 tests green across all three commits

#### Session: April 6, 2026 — Auto-ID System, DB Resilience, Auth Hardening + Residential Customer Profile UI
**Commits:** `589108b` (feat: auto-IDs, DB resilience, auth hardening), `c2d7cf6` (feature/customer-profile-ui), `801b5b2` (merge to main)  
**Focus:** Backend infrastructure improvements + full residential customer profile page

**Backend — Auto-Generated Sequential IDs:**
- ✅ Created `server/models/SequenceCounter.model.js` — atomic Mongoose counter model for sequential ID generation
- ✅ Created `server/utils/sequence.util.js` — `getNextSequenceValue()` + `formatSequenceId()` helpers
- ✅ `agent.controller.js` — `employeeId` is now auto-generated (`AGT-000001` format); removed from manual input requirement
- ✅ `customer.controller.js` — `customerId` is now auto-generated (`CUST-000001` format); removed from manual input requirement
- ✅ `FieldServiceAgents.jsx` — Employee ID input field removed (system-generated now)

**Backend — DB Connection Resilience:**
- ✅ `server/config/db.js` — dev-first connection strategy: in `development`, tries local MongoDB first, falls back to Atlas if local fails; in `production`, uses `MONGODB_URI` only

**Backend — Auth Hardening:**
- ✅ `server/middleware/auth.middleware.js` — added null-user guard after `User.findById(decoded.id)`: returns 401 if user no longer exists in DB

**Dev Tooling:**
- ✅ `start-dev.sh` — added `start_user_mode_mongodb()` function that forks `mongod` into `.mongodb/data/`; named `cleanup()` trap stops user-mode mongod on exit
- ✅ `.gitignore` — added `.mongodb/` exclusion (WiredTiger binary data was previously untracked)

**Frontend — Residential Customer Profile:**
- ✅ `client/src/components/ResidentialCustomer.jsx` — complete rewrite from 30-line JSON shell to ~340-line bespoke profile page
  - `safeParseNotes()` — safely parses JSON-stringified customer notes field
  - Hero header with initials avatar, account status badge, customer ID, member-since, "+Book Service" CTA
  - Sections: Contact Info, Residential Address, Service Locations, Account Details, Additional Notes (conditional), Service Call History
  - Service call history fetched via `/api/service-calls` filtered to this customer's `_id`
  - Status badges for all 8 service call statuses; empty state + booking link
  - Fully responsive 2-column grid (`sm:grid-cols-2`)
  - Built on `feature/customer-profile-ui` branch, merged `--no-ff` to main
- ✅ Build clean: `ResidentialCustomer-CZVYmhdC.js` 10.26 kB
- ✅ 38/38 tests pass

**Primary Files Updated in This Session:**
- `server/models/SequenceCounter.model.js` (NEW)
- `server/utils/sequence.util.js` (NEW)
- `server/controllers/agent.controller.js`
- `server/controllers/customer.controller.js`
- `server/middleware/auth.middleware.js`
- `server/config/db.js`
- `client/src/components/ResidentialCustomer.jsx`
- `client/src/components/FieldServiceAgents.jsx`
- `start-dev.sh`
- `.gitignore`

#### Session: April 2, 2026 — Remote-Test Readiness + Customer Onboarding Stabilization
**Commit(s):** `889ba34` (feature branch), `408d599` (cherry-picked to `main`), plus branch-tracking/documentation updates on `main`  
**Focus:** Keep local and remote repositories synchronized for production-test builds from `main`

**Remote Build Readiness (Branch + Repo Operations):**
- ✅ Completed branch remediation queue across long-lived branches and synchronized key branches with `main`.
- ✅ Performed stale worktree archival for clean worktrees and preserved dirty worktrees for manual follow-up.
- ✅ Established explicit branch governance artifacts for sequencing and risk tracking.

**Onboarding Flow Stabilization (Feature Branch):**
- ✅ Fixed customer onboarding payload mismatch by including required `customerType` in customer create payload.
- ✅ Reduced form friction in customer registration by making branch/site name conditionally required for `branch` and `franchise` only.
- ✅ Updated field label to "Branch / Site Name" for clearer onboarding intent.
- ✅ Frontend build validated after fix.
- ✅ Onboarding fix was promoted to `main` to ensure remote production-test builds include it.

**Primary Files Updated in This Session:**
- `client/src/components/RegisterNewCustomer.jsx`
- `BRANCH_SECURITY_TRACKER.md`
- `PROJECT_TRACKING_SYSTEM.md`
- `AGENT_OPERATING_MODEL.md`
- `CLEANUP_SEQUENCE_AGENT_PLAN.md`
- `DATA_CLEANUP_POLICY.md`

#### Session: March 23, 2026 — Pro-forma Workflow Hardening + Role-Aware UI System
**Commit:** `79c4424`  
**Focus:** Backend pro-forma payment workflow validation + comprehensive frontend role-aware visual cues

**Backend (Pro-forma Invoice Workflow):**
- ✅ Hardened invoice workflow state transitions with strict validation:
  - `draft` → `sent` (requires email recipient validation)
  - `sent` → `approved`/`rejected` (customer decision required)
  - `approved` → `finalized` (with deposit & payment tracking)
- ✅ Extended invoice schema for lifecycle management: `sentAt`, `approvedAt`, `rejectedAt`, `rejectedReason`, `finalizedAt`, `depositRequired`, `depositAmount`, `paymentReceived`
- ✅ Implemented strict send validation requiring valid recipient email before customer approval step
- ✅ Service call auto-customer resolution improved: falls back to booking email, then cached customer, then manual selection
- ✅ Expanded unit test coverage for controller workflows and customer resolution logic

**Frontend (Role-Aware Visual System):**
- ✅ Created global sidebar entity legend with standardized color language:
  - **Cyan**: Field Agents
  - **Indigo**: Customers
  - **Amber**: Service Calls
  - **Orange**: Quotations
  - **Emerald**: Invoices / Pro-Forma
  - **Fuchsia**: Super Admin role indicator
  - **Cyan**: Non-admin role indicator
- ✅ Added role-aware header context chips to all operational pages:
  - AgentProfile.jsx — with role badge + access mode
  - FieldServiceAgents.jsx — with admin/ops view indicators
  - Customers.jsx — with indigo entity chip
  - ServiceCalls.jsx — with amber entity chip
  - Quotations.jsx — with orange entity chip
- ✅ Extended pro-forma editing modal (SiteInstructionModal) with:
  - Dynamic role-aware chips (Super Admin vs. Operational)
  - Emerald entity chip for invoice context
  - Props: `roleLabel`, `isSuperAdmin` from parent AgentProfile
- ✅ Added public invoice approval screen (InvoiceApprovalPage) visual context:
  - Emerald entity chip "Entity: Invoices / Pro-Forma"
  - Cyan access chip "Access: Public Customer Approval"
- ✅ Fixed axios auth header fallback logic to support `userInfo?.token` for agent/customer data loading paths

**Previous Session Changes:**
- Multi-principal authentication now supports `superAdmin`, `businessAdministrator`, `fieldServiceAgent`, and `customer`.
- Passkey onboarding and renewal workflows added for delegated role onboarding.
- User-to-operational-profile linking lifecycle added with admin attach/detach/reassign endpoints and audit logging.
- Registration identifiers now follow write-once policy for non-superAdmin users.
- SuperAdmin registration-identifier overrides now require legal documentation evidence.
- Dedicated legal override audit collection and read-only admin query endpoint added.
- Quote creation from service-call views now pre-fills customer dropdown labels from booking/service-call context when `/customers` does not include the selected customer id.
- Added `CreateQuoteModal` unit tests covering customer dropdown fallback, fetched-customer override behavior, and service-call shortcut quote submission endpoint.

### What Is This Project?
A full-stack MERN (MongoDB, Express, React, Node.js) application for managing field service operations. It handles customer intake, field agent management, service call tracking, and includes Google Maps integration for location services.

### Business Context
- **Primary Users**: Service companies with field technicians (plumbers, HVAC, electricians, etc.)
- **Key Value**: Centralized management of agents, customers, and service requests
- **Critical Features**: Authentication, field-level permissions, job tracking, agent statistics

### Development Status
- ✅ Authentication system complete
- ✅ User/Agent/Customer/Service Call CRUD operations
- ✅ Field-level permissions implemented
- ✅ Google Maps integration setup
- ⚠️ Service Calls UI is partially implemented and still evolving
- ✅ Comprehensive logging system
- ✅ Industry-standard code comments throughout

---

## 🏗️ Architecture Overview

### Tech Stack

**Backend:**
- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js 4.18.2
- **Database**: MongoDB 8.0+ (Mongoose ODM 8.0.3)
- **Authentication**: JWT (jsonwebtoken 9.0.3)
- **Security**: bcryptjs for password hashing
- **Dev Tools**: nodemon for hot-reload

**Frontend:**
- **Library**: React 18.2.0
- **Build Tool**: Vite 5.0.8
- **Routing**: React Router 6.30.3
- **HTTP Client**: Axios 1.6.2
- **Styling**: Tailwind CSS 3.4.0
- **Maps**: @react-google-maps/api 2.20.6

**Database:**
- **Type**: NoSQL (MongoDB)
- **Connection**: Local development (mongodb://localhost:27017)
- **Production**: MongoDB Atlas ready

### Project Structure

```
test-app/
├── server/                  # Backend API (Express + MongoDB)
│   ├── server.js           # Entry point, middleware setup
│   ├── config/
│   │   └── db.js           # MongoDB connection
│   ├── middleware/
│   │   ├── auth.middleware.js      # JWT verification
│   │   └── logger.middleware.js    # Request/error logging
│   ├── models/
│   │   ├── User.model.js           # Multi-role identity principal schema
│   │   ├── FieldServiceAgent.model.js
│   │   ├── Customer.model.js
│   │   ├── ServiceCall.model.js
│   │   ├── OnboardingPasskey.model.js
│   │   ├── PasskeyRenewalRequest.model.js
│   │   ├── ProfileLinkAudit.model.js
│   │   ├── RegistrationOverrideAudit.model.js
│   │   └── SequenceCounter.model.js  # Atomic sequential ID counter (AGT/CUST)
│   ├── controllers/
│   │   ├── auth.controller.js      # Multi-role auth, passkeys, profile policy, admin audits
│   │   ├── agent.controller.js     # Agent CRUD
│   │   ├── customer.controller.js  # Customer CRUD
│   │   └── serviceCall.controller.js
│   ├── utils/
│   │   ├── emailService.js         # Email sending (Ethereal for dev, SMTP for prod)
│   │   └── sequence.util.js        # Sequential ID helpers: getNextSequenceValue, formatSequenceId
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── agent.routes.js
│   │   ├── customer.routes.js
│   │   └── serviceCall.routes.js
│   └── logs/               # Application logs
│
├── client/                 # Frontend (React + Vite)
│   ├── src/
│   │   ├── main.jsx        # React entry point
│   │   ├── App.jsx         # Router configuration
│   │   ├── index.css       # Global styles + Tailwind
│   │   ├── api/
│   │   │   └── axios.js    # Axios instance configuration
│   │   ├── context/
│   │   │   └── AuthContext.jsx  # Global auth state
│   │   └── components/
│   │       ├── Sidebar.jsx              # 🔄 Navigation + global entity legend
│   │       ├── Login.jsx
│   │       ├── Register.jsx
│   │       ├── UserProfile.jsx
│   │       ├── ForgotPassword.jsx       # 🆕 Password reset request
│   │       ├── ResetPassword.jsx        # 🆕 Password reset form
│   │       ├── FieldServiceAgents.jsx   # 🔄 Agent directory + role context (employeeId system-generated)
│   │       ├── AgentProfile.jsx         # 🔄 Agent detail + role context + pro-forma
│   │       ├── Customers.jsx            # 🔄 Customer list + entity chip
│   │       ├── ServiceCalls.jsx         # 🔄 Service call queue + entity chip
│   │       ├── Quotations.jsx           # 🔄 Quotation list + entity chip
│   │       ├── SiteInstructionModal.jsx # 🔄 Pro-forma editor + entity/role chips
│   │       ├── InvoiceApprovalPage.jsx  # 🔄 Public invoice approval + context chips
│   │       ├── ServiceCallRegistration.jsx  # 🆕 Standalone service call booking form
│   │       └── ResidentialCustomer.jsx      # 🔄 Full bespoke residential customer profile (complete)
│   ├── index.html
│   └── vite.config.js      # Dev server + proxy config
│
├── setup-and-run.sh        # Automated setup script
├── install-mongodb.sh      # MongoDB installation helper
├── README.md               # User-facing documentation
├── PROJECT-STRUCTURE.md    # Detailed architecture docs
├── AUTH_GUIDE.md           # Authentication system guide
├── LOGGING_GUIDE.md        # Logging system guide
└── AI_ASSISTANT_GUIDE.md   # This file
```

---

## 🔑 Key Concepts & Conventions

### 1. Field-Level Permissions

**Critical Feature**: Profile updates are governed by immutable and write-once policy layers.

**Protected Fields (User Model):**
- `userName` - Cannot change (identity)
- `createdAt` - System-managed
- `_id` - Database identifier
- `isSuperUser` - Security flag
- `role`, profile-link fields - controlled via admin/linking flows

**Write-Once Registration Identifiers (Profile Update Policy):**
- `businessRegistrationNumber`, `taxNumber`, `vatNumber`
- Non-superAdmin users can only set these when empty, then they become locked.
- SuperAdmin can override existing values only with valid `registrationChangeEvidence`.
**Implementation:**
- Models define `IMMUTABLE_FIELDS` and `EDITABLE_FIELDS` arrays
- Controllers apply immutable checks plus write-once legal-identifier rules
- Attempts to bypass policy return 400/403 depending on violation
- See: `server/models/User.model.js` and `server/controllers/auth.controller.js`

**Why This Matters:**
- Prevents accidental modification of legal identifiers
- Maintains data integrity for accounting/compliance
- Protects against malicious field manipulation

### 2. Authentication Flow

**Registration:**
1. User submits form → `POST /api/auth/register`
2. Backend validates all required fields
3. Password hashed with bcrypt (10 salt rounds)
4. User created in MongoDB
5. JWT generated with 30-day expiration
6. Token + user data returned to client
7. Client stores in localStorage via AuthContext

**Login:**
1. User submits credentials → `POST /api/auth/login`
2. Backend finds user by email
3. Password compared with hashed version
4. JWT generated and returned
5. Client stores and redirects to `/profile`

**Protected Routes:**
1. Client includes JWT in request header: `Authorization: Bearer <token>`
2. Server middleware (`protect`) extracts token
3. Token verified with JWT_SECRET
4. User ID decoded from token
5. User fetched from database (password excluded)
6. User attached to `req.user` for controllers
7. Request continues or 401 if invalid

**Token Storage:**
- Stored in localStorage (key: 'userInfo')
- Persists across browser sessions
- Cleared on logout
- Managed by AuthContext

### 2.5 Password Reset Flow (🆕 NEW)

**Overview:**
Complete password recovery system with secure token generation, email delivery, and auto-login.

**Forgot Password (Request Reset):**
1. User clicks "Forgot Password?" on login page → Routes to `/forgot-password`
2. User enters email → POST `/api/auth/forgot-password`
3. Backend:
   - Validates email is provided
   - Finds user (returns same message even if not found - security)
   - Generates cryptographic reset token: `crypto.randomBytes(32).toString('hex')`
   - Hashes token with SHA256 for database storage
   - Sets 1-hour expiry: `Date.now() + 60 * 60 * 1000`
   - Sends email with reset link: `${CLIENT_URL}/reset-password/${unhashedToken}`
   - Returns 200 (generic response for security)
4. Frontend:
   - Shows success message (generic: "Check your email")
   - Auto-redirects to login after 5 seconds

**Reset Password (New Password):**
1. User receives email with reset link
2. Clicks link → Routes to `/reset-password/:token` with token in URL
3. ResetPassword component:
   - Enters new password (min 6 chars)
   - Password strength indicator shows: Weak (red) / Medium (yellow) / Strong (green)
   - Validates password match
   - POST/PUT `/api/auth/reset-password/:token` with new password
4. Backend:
   - Validates password is provided and >= 6 chars
   - Hashes URL token with SHA256 (must match stored hash)
   - Finds user with matching token AND valid expiry (`resetPasswordExpire > Date.now()`)
   - Updates password (auto-hashed by bcrypt pre-save hook)
   - Clears reset token and expiry fields
   - Generates new JWT token
   - Returns JWT (enables auto-login)
5. Frontend:
   - Calls `login()` with JWT from response
   - Auto-redirects to `/profile`
   - User is logged in with new password

**Token Security:**
- Generated: 32 random bytes (256-bit entropy)
- Stored: SHA256 hash (not plaintext)
- Transmitted: Via email link (HTTPS in production)
- Expires: 1 hour from generation
- Used: Hashed comparison prevents timing attacks
- Cleared: Immediately after successful reset

**Email Service Architecture:**
- Development: Ethereal Email (fake SMTP)
  - Auto-generates test account on first use
  - Logs preview URL to terminal
  - Perfect for local testing
- Production: Real SMTP (Gmail, SendGrid, etc.)
  - Environment variables: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
  - File: `server/utils/emailService.js`
  - HTML template with Appatunid branding

**Security Best Practices Implemented:**
- ✅ Tokens hashed (SHA256) before storage
- ✅ Short expiry window (1 hour)
- ✅ Generic responses (prevent email enumeration)
- ✅ Tokens cleared after use
- ✅ Auto-login with JWT (smooth UX)
- ✅ Password auto-hashed by bcrypt
- ✅ No sensitive data in logs

**Files Involved:**
- Backend: `User.model.js` (token fields, generatePasswordResetToken method)
- Backend: `auth.controller.js` (forgotPassword, resetPassword endpoints)
- Backend: `auth.routes.js` (POST /forgot-password, PUT /reset-password/:token)
- Backend: `utils/emailService.js` (email sending)
- Frontend: `ForgotPassword.jsx` (request form)
- Frontend: `ResetPassword.jsx` (new password form)
- Frontend: `Login.jsx` ("Forgot Password?" link)

### 3. Environment Variables

**Server (.env - server/):**
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/field-service-db
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=development

# Email Configuration (Password Reset)
CLIENT_URL=http://localhost:3002
FROM_NAME=Appatunid Support
FROM_EMAIL=noreply@appatunid.com

# Production SMTP (Gmail or SendGrid)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password
```

**Client (.env - client/):**
```env
VITE_API_URL=http://localhost:5000
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key-here
```

**⚠️ Security Notes:**
- `.env` files are gitignored
- Never commit API keys or secrets
- JWT_SECRET must be strong in production
- Google Maps API key needs billing enabled
- `VITE_` variables are exposed in the client bundle (treat as public)
- Restrict Google Maps API keys by HTTP referrers and API scope

### 4. API Proxy Configuration

**How It Works:**
- Vite dev server (port 3000) proxies `/api/*` to backend (port 5000)
- Configured in `client/vite.config.js`
- Client makes requests to `/api/auth/login` (relative)
- Vite forwards to `http://localhost:5000/api/auth/login`
- Avoids CORS issues in development

**Production:**
- Build client: `npm run build` (creates `dist/`)
- Serve static files from Express
- API and frontend on same origin

### 5. Logging System

**Request Logging:**
- Every HTTP request logged to console and `server/logs/request.log`
- Includes: timestamp, method, URL, IP, body (passwords masked)
- Use `requestLogger` middleware

**Error Logging:**
- All errors logged to console and `server/logs/error.log`
- Includes: timestamp, stack trace, request context
- Use `errorLogger` middleware or `logError()` function

**General Logging:**
- `logInfo(message)` - Informational messages
- `logError(message, error)` - Error messages

**Files:**
- `server/middleware/logger.middleware.js`
- `server/logs/` directory

### 6. Database Relationships

**User (SuperUser):**
- No direct references (top-level entity)
- Creates Agents, Customers, and Service Calls

**FieldServiceAgent:**
- Reference: `createdBy` → User._id
- Referenced by: ServiceCall.assignedAgent

**Customer:**
- Reference: `createdBy` → User._id
- Referenced by: ServiceCall.customer

**ServiceCall:**
- Reference: `createdBy` → User._id
- Reference: `customer` → Customer._id
- Reference: `assignedAgent` → FieldServiceAgent._id

**Mongoose Population:**
- Use `.populate('customer')` to get customer details in service call queries
- Use `.populate('assignedAgent')` for agent details

### 7. Auto-Generated Fields

**Agent Employee IDs:**
- Format: `AGT-000001`, `AGT-000002`, etc.
- Auto-generated in `agent.controller.js` using `getNextSequenceValue('agent_employee_id')`
- Collision-safe: up to 5 retry attempts before returning 500
- See: `server/utils/sequence.util.js`, `server/models/SequenceCounter.model.js`

**Customer IDs:**
- Format: `CUST-000001`, `CUST-000002`, etc.
- Auto-generated in `customer.controller.js` using `getNextSequenceValue('customer_id')`
- See: `server/utils/sequence.util.js`, `server/models/SequenceCounter.model.js`

**Service Call Numbers:**
- Format: `SC-000001`, `SC-000002`, etc.
- Auto-generated by pre-save hook if not provided
- Sequential numbering based on document count
- See: `server/models/ServiceCall.model.js`

**Timestamps:**
- All models have `timestamps: true`
- Automatically adds `createdAt` and `updatedAt`
- Updated automatically by Mongoose

---

## 🔧 Common Development Tasks

### Adding a New API Endpoint

1. **Define Route** (`server/routes/*.routes.js`):
   ```javascript
   router.get('/new-endpoint', protect, controllerFunction);
   ```

2. **Create Controller** (`server/controllers/*.controller.js`):
   ```javascript
   export const controllerFunction = async (req, res) => {
     try {
       // Logic here
       res.json({ data });
     } catch (error) {
       res.status(500).json({ message: error.message });
     }
   };
   ```

3. **Add JSDoc Comments**:
   ```javascript
   /**
    * @route   GET /api/resource/new-endpoint
    * @desc    Description of what it does
    * @access  Private/Public
    */
   ```

4. **Update Documentation**:
   - Add endpoint to README.md API Documentation section
   - Update AI_ASSISTANT_GUIDE.md if significant

### Adding a New React Component

1. **Create Component** (`client/src/components/NewComponent.jsx`):
   ```jsx
   /**
    * @file NewComponent.jsx
    * @description Component purpose
    */
   import { useState } from 'react';
   
   const NewComponent = () => {
     // Component logic
     return (
       <div>Component JSX</div>
     );
   };
   
   export default NewComponent;
   ```

2. **Add Route** (`client/src/App.jsx`):
   ```jsx
   <Route path="/new-route" element={
     <ProtectedRoute>
       <NewComponent />
     </ProtectedRoute>
   } />
   ```

3. **Update Sidebar** (`client/src/components/Sidebar.jsx`):
   - Add navigation link if needed

4. **Style with Tailwind**:
   - Use existing color scheme (indigo for primary)
   - Follow responsive design patterns

### Database Schema Changes

1. **Update Model** (`server/models/*.model.js`):
   ```javascript
   newField: {
     type: String,
     required: [true, 'Error message'],
     trim: true,
   }
   ```

2. **Update EDITABLE_FIELDS/IMMUTABLE_FIELDS** if needed

3. **Update Controller** to handle new field

4. **Update Frontend Forms** to capture new data

5. **Test Migration** (MongoDB is schema-less, but validate existing data)

### Adding Middleware

1. **Create Middleware** (`server/middleware/custom.middleware.js`):
   ```javascript
   export const customMiddleware = (req, res, next) => {
     // Middleware logic
     next(); // Must call next() to continue
   };
   ```

2. **Apply to Routes**:
   ```javascript
   // Global: app.use(customMiddleware);
   // Route: router.get('/', customMiddleware, controller);
   ```

3. **Document in server.js** if global

### Password Reset Feature (🆕 NEW)

**Understanding the System:**
The password reset feature provides secure, email-based password recovery. It uses cryptographic tokens, SHA256 hashing, and time-based expiry.

**Testing Locally:**
1. Development uses Ethereal Email (fake SMTP)
2. No real emails sent - preview URL logged to terminal
3. Example log output:
   ```
   📧 Password reset email sent!
   📬 Preview URL: https://ethereal.email/message/...
   ```

**Modifying Reset Token Duration:**
```javascript
// File: server/models/User.model.js (line ~190)
this.resetPasswordExpire = Date.now() + (30 * 60 * 1000); // Change 60 to 30 for 30 minutes
```

**Production Email Configuration:**

**Option 1: Gmail (Recommended for small apps)**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=youremail@gmail.com
SMTP_PASS=your-app-password  # From Gmail 2FA settings, not your actual password
FROM_NAME=Your Company Support
FROM_EMAIL=noreply@yourcompany.com
```

Setup:
1. Enable 2-Factor Authentication on Gmail
2. Go to Security → App passwords
3. Generate app password for "Mail"
4. Use that password in `SMTP_PASS`

**Option 2: SendGrid (Recommended for production)**
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
FROM_NAME=Your Company Support
FROM_EMAIL=noreply@yourcompany.com
```

**Security Checklist:**
- ✅ Tokens are hashed with SHA256 before storage
- ✅ 1-hour expiry window (prevent brute force)
- ✅ Generic success messages (prevent email enumeration)
- ✅ Tokens cleared after successful reset
- ✅ Password hashed by bcrypt before storage
- ✅ JWT returned for auto-login

**Customizing Email Template:**
File: `server/utils/emailService.js` (lines ~100-250)
- Modify HTML in the email template
- Update styling with CSS
- Change branding/colors
- Update FROM_NAME and FROM_EMAIL in .env

**Troubleshooting:**
- Email not received? Check spam folder, verify email address is correct
- Ethereal preview URL not appearing? Check terminal output in server logs
- Token expired error? User waited >1 hour, they need to request new reset
- "Service unavailable" error? Check SMTP credentials are correct, email service is running

---

## 🐛 Debugging Guide

### Backend Issues

**MongoDB Connection Failed:**
- Check if MongoDB is running: `sudo systemctl status mongod`
- Verify MONGODB_URI in `server/.env`
- Check MongoDB logs: `sudo journalctl -u mongod`

**JWT Token Issues:**
- Verify JWT_SECRET matches in server/.env
- Check token in request header: `Authorization: Bearer <token>`
- Token expires in 30 days - may need to re-login
- Use browser DevTools → Application → Local Storage to inspect token

**API Endpoint Not Found:**
- Check route is registered in `server.js`
- Verify HTTP method matches (GET, POST, PUT, DELETE)
- Check for typos in route path
- Ensure middleware order is correct

**CORS Errors:**
- Verify `cors()` middleware is applied
- Check Vite proxy configuration in `client/vite.config.js`
- Backend must be running on port 5000

### Frontend Issues

**Component Not Rendering:**
- Check route is defined in `App.jsx`
- Verify component is exported properly
- Check browser console for React errors
- Use React DevTools to inspect component tree

**API Calls Failing:**
- Check Network tab in browser DevTools
- Verify backend server is running
- Check Axios interceptor isn't blocking request
- Verify endpoint URL is correct

**AuthContext Issues:**
- User is null after refresh → Check localStorage
- Login not persisting → Verify `login()` is called with complete user data
- Protected routes not working → Check `useAuth()` hook usage

**Tailwind Styles Not Applying:**
- Verify `index.css` imports Tailwind directives
- Check `tailwind.config.js` content paths
- Rebuild if styles changed: `npm run dev` (Vite handles HMR)

---

## 📝 Code Style & Standards

### JavaScript/JSX

**File Headers:**
```javascript
/**
 * @file filename.js
 * @description Purpose and functionality
 * @module ModuleName
 */
```

**Function Documentation:**
```javascript
/**
 * Function description
 * 
 * @async
 * @function functionName
 * @param {Type} paramName - Description
 * @returns {Type} Description
 * 
 * @example
 * functionName(param);
 */
```

**Naming Conventions:**
- Components: PascalCase (`UserProfile.jsx`)
- Functions: camelCase (`getUserProfile`)
- Constants: UPPER_SNAKE_CASE (`JWT_SECRET`)
- Files: kebab-case for configs (`vite.config.js`)

**Import Order:**
1. External libraries (react, express, etc.)
2. Internal modules (controllers, models)
3. Relative imports (./components)

**Async/Await:**
- Always use try-catch for async operations
- Handle errors gracefully
- Log errors with context

### React Patterns

**Hooks:**
- `useState` for local state
- `useEffect` for side effects
- `useContext` (via `useAuth()`) for global auth state
- `useNavigate` for programmatic navigation

**Conditional Rendering:**
```jsx
{loading && <Spinner />}
{error && <ErrorMessage />}
{data && <DataDisplay />}
```

**Event Handlers:**
- Prefix with `handle`: `handleSubmit`, `handleChange`
- Use arrow functions to preserve `this` context

**Styling:**
- Tailwind CSS utility classes
- Responsive: `sm:`, `md:`, `lg:` prefixes
- Colors: `indigo-600` (primary), `red-600` (errors)

### API Design

**RESTful Endpoints:**
- GET `/api/resource` - List all
- GET `/api/resource/:id` - Get one
- POST `/api/resource` - Create
- PUT `/api/resource/:id` - Update
- DELETE `/api/resource/:id` - Delete

**Response Format:**
```javascript
// Success
res.json({ 
  [data],
  message: 'Optional success message'
});

// Error
res.status(400).json({ 
  message: 'Error description',
  details: 'Additional info (dev only)'
});
```

**Status Codes:**
- 200: Success
- 201: Created
- 400: Bad Request (validation error)
- 401: Unauthorized (no/invalid token)
- 403: Forbidden (insufficient permissions)
- 404: Not Found
- 500: Server Error

---

## 🧪 Testing Guidelines

### Manual Testing Checklist

**Authentication:**
- [ ] Register new user with all fields
- [ ] Login with valid credentials
- [ ] Login with invalid credentials (verify error)
- [ ] Access protected route without token (verify redirect)
- [ ] Logout and verify token cleared
- [ ] Refresh page while logged in (verify session persists)

**Profile Management:**
- [ ] View profile displays all fields
- [ ] Update editable fields successfully
- [ ] Attempt to update protected fields (verify blocked)
- [ ] Update password (verify re-hashing)

**Agent Management:**
- [ ] Create new agent
- [ ] View all agents
- [ ] View single agent with job stats
- [ ] Update agent information
- [ ] Delete agent

**Customer Management:**
- [ ] Create new customer with address
- [ ] Google Maps autocomplete works
- [ ] View all customers
- [ ] Update customer details
- [ ] Delete customer

**Service Calls:**
- [ ] View service calls list
- [ ] (Placeholder - needs implementation)

### API Testing with curl

**Register:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "userName": "testuser",
    "email": "test@example.com",
    "password": "password123",
    "businessName": "Test Business",
    "businessRegistrationNumber": "REG123",
    "taxNumber": "TAX123",
    "vatNumber": "VAT123",
    "phoneNumber": "+27123456789",
    "physicalAddress": "123 Test St"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'
```

**Get Profile (with token):**
```bash
curl -X GET http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🚀 Deployment Checklist

### Pre-Deployment

- [ ] Environment variables set for production
- [ ] JWT_SECRET changed to strong random value
- [ ] MongoDB Atlas connection string configured
- [ ] Google Maps API key has billing enabled
- [ ] Remove console.log statements (or use conditional logging)
- [ ] Update CORS settings for production domain
- [ ] Build client: `npm run build`
- [ ] Test production build locally

### Environment Setup

**Server:**
- [ ] `NODE_ENV=production`
- [ ] `MONGODB_URI=mongodb+srv://...`
- [ ] `JWT_SECRET=<strong-random-string>`
- [ ] `PORT=5000` (or cloud provider's PORT)

**Client:**
- [ ] `VITE_API_URL=https://your-api-domain.com`
- [ ] `VITE_GOOGLE_MAPS_API_KEY=<production-key>`

### Post-Deployment

- [ ] Test all API endpoints
- [ ] Verify authentication flow
- [ ] Test Google Maps integration
- [ ] Monitor error logs
- [ ] Set up log rotation
- [ ] Configure SSL/HTTPS
- [ ] Set up database backups

---

## 📚 Additional Resources

### Documentation Files
- **README.md** - User-facing setup and API docs
- **PROJECT-STRUCTURE.md** - Detailed architectural breakdown
- **AUTH_GUIDE.md** - Authentication system deep-dive
- **LOGGING_GUIDE.md** - Logging best practices
- **FIELD_PERMISSIONS.md** - Field permission details
- **PROFILE_EDITING_GUIDE.md** - Profile editing rules

### External Documentation
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Mongoose Docs](https://mongoosejs.com/docs/guide.html)
- [React Router](https://reactrouter.com/en/main)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [JWT.io](https://jwt.io/)
- [Google Maps API](https://developers.google.com/maps/documentation)

### Git Repository
- **Remote**: https://github.com/Derikcoder/test-app
- **Active Branch**: `foundation`
- **Branch Model**: Parent → Child → Consolidation → Production

#### Branch Architecture

This project uses a structured branching model where **each branch is a standalone, portable module** — designed so individual branches can be carried into other projects as reusable components. The framework is being built as a **digital transformation platform for service industry businesses**.

```
main                 ← Production (stable, never touched directly)
  └── consolidation  ← QA / integration merge point
        └── foundation    ← Base framework (parent of all features)
              ├── feature/invoicing-engine
              ├── feature/customer-portal
              ├── feature/field-agent-app
              └── feature/<module-name>
```

| Branch | Purpose |
|--------|---------|
| `main` | Stable production code only. Never commit here directly. |
| `consolidation` | Integration branch. All features merge here for QA before `main`. |
| `foundation` | Living base framework. All feature branches are born from here. |
| `feature/*` | Standalone modules, named after the functionality they deliver. |

#### Branch Workflow
```bash
# Start a new module from foundation
git checkout foundation
git checkout -b feature/your-module-name

# Work on the feature, commit regularly
git add .
git commit -m "feat: describe what you built"

# Merge back to foundation when done
git checkout foundation
git merge feature/your-module-name

# Promote stable foundation to consolidation for QA
git checkout consolidation
git merge foundation

# After QA passes, merge consolidation into main
git checkout main
git merge consolidation
```

#### Naming Conventions
- Feature branches: `feature/<module-name>` (e.g. `feature/invoicing-engine`)
- Hotfix branches: `hotfix/<description>` (e.g. `hotfix/login-token-expiry`)
- Commit messages follow conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`

---

## 🔄 Recent Changes

### 2026-04-09 (Session 27)
**Feature: FieldAgentSelfProfile — Field Service Agent's Own Workspace**

- ✅ **`client/src/components/FieldAgentSelfProfile.jsx`** — Created (new component)
  - Self-scoped workspace view rendered at `/profile` when `user.role === 'fieldServiceAgent'`
  - Reads agent ID from `user.fieldServiceAgentProfile` (no `useParams`); shows early error if missing
  - Same data display and actions as `AgentProfile.jsx`: stats, tabbed service calls (All / To Attend / In Progress / Completed / Unassigned), WhatsApp, Call Customer, CreateQuoteModal, SiteInstructionModal, Mark Job Complete, Create Invoice, Accept Job
  - `isSuperUser={false}`, `isSuperAdmin={false}` passed to all modals (no admin-only actions exposed)
  - Framing: "My Workspace", "My Service Calls", "My Profile" badge; no Back button, no "Governance + Override" badge
  - Uses new role-scoped endpoints: `GET /api/agents/me`, `GET /api/service-calls/my-assigned`, `GET /api/service-calls/eligible-unassigned/:id`, `POST /api/service-calls/:id/self-accept`

- ✅ **`client/src/App.jsx`** — Modified
  - Lazy import for `FieldAgentSelfProfile`
  - New `ProfileRoute` component: `user.role === 'fieldServiceAgent'` → `<FieldAgentSelfProfile />`, else → `<UserProfile />`
  - `/profile` route uses `ProfileRoute` (no change to URL)

**Bug Fix: `createdBy` filter blocked all field agent data fetches**
- Root cause: `getAgentById`, `getServiceCalls`, `getEligibleUnassignedServiceCalls`, `selfAcceptServiceCall` all filtered by `createdBy: req.user._id`. Agent profiles and service calls are owned by the admin (`createdBy = admin._id`). When a `fieldServiceAgent` logs in, their `req.user._id` ≠ admin's `_id` → 404s and empty arrays.

- ✅ **`server/controllers/agent.controller.js`** — Added `getMyAgentProfile`
  - `GET /api/agents/me`: `FieldServiceAgent.findOne({ userAccount: req.user._id })` — no `createdBy` constraint
  - Existing `getAgentById` unchanged (admin-to-admin scoping preserved)

- ✅ **`server/routes/agent.routes.js`** — Added `GET /me` route
  - Registered before `GET /:id` to prevent "me" being captured as an `:id` param

- ✅ **`server/controllers/serviceCall.controller.js`** — Added `getMyAssignedServiceCalls`; fixed `getEligibleUnassignedServiceCalls` + `selfAcceptServiceCall`
  - `getMyAssignedServiceCalls`: `ServiceCall.find({ assignedAgent: req.user.fieldServiceAgentProfile })` — no `createdBy` constraint
  - `getEligibleUnassignedServiceCalls` + `selfAcceptServiceCall`: when `req.user.role === 'fieldServiceAgent'`, resolves `businessCreatedBy` from `agent.createdBy` (the admin who created the agent record) for all downstream queries; adds ownership guard (`FieldServiceAgent.findOne({ _id: agentId, userAccount: req.user._id })`)

- ✅ **`server/routes/serviceCall.routes.js`** — Added `GET /my-assigned` route
  - Registered before `GET /eligible-unassigned/:agentId` (static before parametric)

**Tests — 10 new unit tests, 255 total pass:**
- `agent.controller.test.js`: +3 tests for `getMyAgentProfile` (found, not found, DB error)
- `serviceCall.controller.test.js`: +7 tests:
  - `getMyAssignedServiceCalls`: found, no profile → 400, DB error
  - `getEligibleUnassignedServiceCalls` (fieldServiceAgent): resolves business owner + returns jobs; denies mismatched userAccount → 403
  - `selfAcceptServiceCall` (fieldServiceAgent): resolves business owner + self-accepts; denies mismatched userAccount → 403

### 2026-04-08 (Session 26)
- ✅ Site-wide nav z-index / padding fix (UI/UX)
  - **Problem**: Sidebar hamburger button (`fixed top-4 inset-x-0 z-50`) was visually overlapping page headers (e.g. "+ Create Agent" button) because all page content wrappers used `py-8`/`py-10`/`py-12` (32–48px) — less than the nav's ~64px height.
  - **Fix**: Split vertical padding on all Sidebar-using pages: `py-*` → `pt-20 pb-*` (80px top = 16px clearance).
  - **Scope**: 10 files changed:
    - `client/src/index.css` — `.page-body` utility: `py-12` → `pt-20 pb-12` (covers Customers, ServiceCalls, RegisterNewCustomer, ServiceCallRegistration)
    - `FieldServiceAgents.jsx` + `AgentProfile.jsx` — `pageShellClass` constant: `py-8` → `pt-20 pb-8`
    - `ResidentialCustomer.jsx`, `BranchCustomer.jsx`, `FranchiseCustomer.jsx`, `HeadOfficeCustomer.jsx`, `SingleBusinessCustomer.jsx` — inline `py-10` → `pt-20 pb-10`
    - `UserProfile.jsx` — inline `py-10` → `pt-20 pb-10`
    - `Quotations.jsx` — inline `py-12` → `pt-20 pb-12`
  - Also includes `FieldServiceAgents.jsx` syntax fix (missing `);` `};` before `export default`, from prior session)
- ✅ UAT test accounts added to `server/.env` under "App Test Accounts Secrets" section
  - Field Service Agent: `UAT_FIELD_AGENT_EMAIL` / `UAT_FIELD_AGENT_PASSWORD`
  - Customer (Private): `UAT_CUSTOMER_EMAIL` / `UAT_CUSTOMER_PASSWORD`

### 2026-04-07 (Session 25)
- ✅ Portal-publish on submit: `POST /api/quotations/:id/send` with `channels: []` → status `sent`; customer sees quote in portal immediately
  - `sendQuotation` guard changed: empty array is allowed (portal-only); only non-empty all-invalid arrays → 400
  - `CreateQuoteModal.jsx` `handleSubmit` auto-calls send with `channels: []` after creation; failure is non-fatal
  - "Share Channels" section renamed "Share PDF Externally" to clarify portal-first model
- ✅ New `ServiceCall` status `awaiting-quote-approval` between `in-progress` and `on-hold`
  - `ServiceCall.model.js` enum updated
  - `createQuotationFromServiceCall` controller auto-saves new status after `Quotation.create`
  - `ServiceCalls.jsx` `awaitingQuoteApprovalCalls` filter and amber `colorMap` entry updated
- ✅ Delete & purge quotations
  - `purgeQuotations` controller (superAdmin only, scoped to `createdBy`): deletes `expired`/`rejected` + overdue `draft`/`sent`
  - `DELETE /api/quotations/purge` route registered before `DELETE /api/quotations/:id`
  - `Quotations.jsx`: per-card two-step delete (`superAdmin`/`businessAdministrator`; blocked for `converted`/`approved`); "Purge Stale" button

### 2026-03-23 (Session 23)
### 2026-03-24 (Session 24)
- ✅ Built customer registration test infrastructure (29 test cases across 6 phases)
    - Created `register_customers_testcases.md` — full test specification inc. mandatory security tests
    - Created `scripts/log-register-customers-test-result.sh` — strict 16-field failure logger
    - Initialized `server/logs/register_customers_test_errors.log` — append-only error log
    - Created `scripts/run-register-customers-tests.sh` — interactive terminal runner (695 lines)
       - Supports `--filter <phase>`, `--from <test-id>`, `--dry-run`
    - Created `server/tests/postman/register_customers_collection.json` — Postman E2E collection
       - 20 requests, 4 folders: Setup & Happy Path, RC-API, RC-NEG, RC-SEC
       - Collection variables auto-populated: `CUSTOMER_OBJECT_ID`, `SERVICE_CALL_ID`, `TS`, `CUSTOMER_ID_QA`
    - Created `server/tests/postman/POSTMAN_INSTRUCTIONS.md` — step-by-step Postman guide
    - Updated `AI_ASSISTANT_GUIDE.md` with full Testing Infrastructure section for AI agents

- ✅ Added public customer approval flow for pro-forma site instructions
   - New public invoice share summary endpoint: `GET /api/invoices/share/:token`
   - New public decision endpoint: `POST /api/invoices/share/:token/decision`
   - New customer-facing React route: `/invoice-approval/:token`
- ✅ Updated billing delivery links to include approval action path
   - Pro-forma email delivery now includes both secure PDF access and the approval-page link
   - WhatsApp and Telegram share messages now include the approval page for pro-forma documents

### 2026-03-19 (Session 22)
- ✅ Made quote sharing channels optional in submit flow
   - Quote modal now allows per-send channel selection instead of hardcoded channels
   - Telegram is available as a first-class share option for dev/test workflows
- ✅ Added Telegram quote-share support in backend send endpoint
   - `POST /api/quotations/:id/send` now supports `telegram` in `channels`
   - Endpoint returns `telegramUrl` and stores `lastTelegramLink` for audit visibility

### 2026-03-19 (Session 21)
- ✅ Added quote delivery pipeline (PDF + channels)
   - Implemented real PDF generation for quotations using `pdfkit`
   - Added send endpoint to deliver quote PDF via email and generate WhatsApp share link
   - Added tokenized public PDF share route for customer access
- ✅ Updated UX wording from “Create Quote” to “Submit Quote” in quote modal
- ✅ Accepted quotation workflow now auto-converts to service jobcard
   - On approval, quotation is converted and linked service call is created with `in-progress` status
   - Supports operational visibility of accepted work as active jobs

### 2026-03-19 (Session 20)
- ✅ Added first-visit assessment inclusion to call-out pricing logic
   - For first-time customer/site visits under call-out-floor conditions, first 15 minutes on-site assessment is included
   - Backend now computes and stores `chargeableLabourHours` after included assessment allowance
   - UI added first-site-visit toggle and labour-hour breakdown to reflect included assessment policy

### 2026-03-19 (Session 19)
- ✅ Added call-out floor rule for travel costing
   - Rule: if `distanceTravelledKm < 45` and `travelTimeMinutes < 30`, minimum travel charge is `R650.00`
   - Applied in both frontend totals preview and backend authoritative calculation
   - Added `travelTimeMinutes` as an explicit field for current manual entry and future Google API enrichment

### 2026-03-19 (Session 18)
- ✅ Enforced UI consistency rule for helper notes in quote modal sections
   - Helper comments are placed in the first block of each section to prevent field-row misalignment
   - Removed per-input helper text under costing fields
- ✅ Refined travel input policy in quote modal and backend
   - `distanceTravelledKm` remains the variable operational input (future Google API source)
   - `ratePerKm` is controlled and only editable by superAdmin

### 2026-03-19 (Session 17)
- ✅ Added procurement and delivery profitability capture to quotation flow
   - New quotation fields: `partsFulfilmentMode`, `deliveryProvider`, `partsProcurementCost`, `thirdPartyDeliveryCost`, `estimatedPartsProfit`
   - UI now captures in-house vs third-party delivery mode (e.g. Picup) and related costs
   - Backend computes `estimatedPartsProfit = partsCost - partsProcurementCost - thirdPartyDeliveryCost`
- ✅ Set default quotation validity period to 14 days while keeping manual calendar override
   - Frontend defaults `validUntil` to 14 days from today
   - Backend and schema provide 14-day fallback defaults for robust create flows

### 2026-03-19 (Session 16)
- ✅ Implemented function-based travel costing in quotation flow
   - Formula: `travellingCost = (distanceTravelledKm × 8.5) + timeTravelledCost`
   - UI now captures `distanceTravelledKm` and `timeTravelledCost`; rate/km is fixed to `R8.50` for now
   - Backend now computes and stores structured travel fields (`distanceTravelledKm`, `travelRatePerKm`, `timeTravelledCost`) and derived `travellingCost`
   - Backward compatibility: legacy `travellingCost` payload still maps to the time component when structured travel inputs are absent

### 2026-03-19 (Session 15)
- ✅ Added tiered part markup for quote line items in quote modal
   - Unit input is treated as cost and converted to selling unit price automatically
   - Markup tiers: <R1000 (50%), <R2000 (40%), <R3000 (30%), <R4000 (25%), <R5000 (20%), >=R5000 (20%)
   - Frontend totals and submitted quotation line-item unit prices now use marked-up values

### 2026-03-19 (Session 14)
- ✅ Enforced superAdmin-only control of travelling cost in quotation costing
   - UI: travelling cost input disabled for non-super users in `client/src/components/CreateQuoteModal.jsx`
   - Backend: `server/controllers/quotation.controller.js` now forces `travellingCost = 8.5` for non-super users

### 2026-03-19 (Session 13)
- ✅ Enforced superAdmin-only control of labour rate in quotation costing
   - UI: labour rate input disabled for non-super users in `client/src/components/CreateQuoteModal.jsx`
   - Backend: `server/controllers/quotation.controller.js` now forces `labourRate = 650` for non-super users

### 2026-03-19 (Session 12)
- ✅ Separated quotation costing concerns across UI and backend
   - Parts remain line items (with optional part number)
   - Labour cost captured separately (`labourHours` × `labourRate`)
   - Consumables cost calculated separately using configured percentage of parts cost
   - Travelling cost captured as separate editable value
   - Totals now computed server-side using the separated pricing model

### 2026-03-19 (Session 11)
- ✅ Added optional line-item part number support for quotations
   - Added `partNumber` to quotation line-item schema in `server/models/Quotation.model.js`
   - Updated `client/src/components/CreateQuoteModal.jsx` to capture part number before description (optional)
   - Preserved non-required behavior to support rare no-part-number items

### 2026-03-19 (Session 10)
- ✅ Added explicit quote template selector in `client/src/components/CreateQuoteModal.jsx`
   - Template options: Auto, Perkins, Cummins, Emergency Repair, Generic
   - Added apply action to load selected template line items on demand

### 2026-03-19 (Session 9)
- ✅ Added machine-model quote templates in reusable quote modal
   - `CreateQuoteModal.jsx` now supports suggested line items from machine model context
- ✅ Added quote creation shortcut endpoint from service call context
   - `POST /api/quotations/from-service-call/:serviceCallId`
   - Uses service call + historical machine data to seed quote creation
   - Falls back to template line items when line items are not provided

### 2026-03-19 (Session 8)
- ✅ Added reusable quote creation flow for superAdmin and customer-oriented usage
   - Created `client/src/components/CreateQuoteModal.jsx` reusable modal component
   - Integrated quote creation button into `client/src/components/AgentProfile.jsx` service-call cards
   - Integrated quote creation button into `client/src/components/ServiceCalls.jsx`
- ✅ Fixed quotation backend create contract in `server/controllers/quotation.controller.js`
   - Added required `serviceType` validation and persistence
   - Added subtotal/VAT/total calculations before save

### 2026-03-19 (Session 7)
- ✅ Improved customer contact flow in agent profile
   - Added WhatsApp-first customer contact button and regular call button in `client/src/components/AgentProfile.jsx`
   - Added South Africa-friendly phone normalization fallback for `wa.me` and `tel:` links
   - Extended service call customer populate in `server/controllers/serviceCall.controller.js` to include customer phone fields used by contact actions

### 2026-03-19 (Session 6)
- ✅ Added superUser operations queue for service call assignment
   - Updated `client/src/components/ServiceCalls.jsx` to show unassigned call alerts and awaiting-acceptance counters
   - Added inline assignment controls to assign unassigned calls to field service agents
- ✅ Extended service call assignment workflow metadata
   - Added `assignedDate`, `agentAccepted`, and `assignmentNotifiedAt` in `server/models/ServiceCall.model.js`
   - Updated `server/controllers/serviceCall.controller.js` to auto-stamp assignment metadata and default status behavior when an agent is assigned

### 2026-03-19 (Session 5)
- ✅ Extended service booking lifecycle capture for existing-customer flow
   - Added `servicesInProgress`, `progressStatus`, `quotationHistory`, and `invoicingHistory` to `bookingRequest` in `server/models/ServiceCall.model.js`
   - Updated `client/src/components/ServiceCalls.jsx` to:
      - Capture lifecycle fields in the existing-customer path
      - Validate required lifecycle fields for existing customers
      - Persist lifecycle fields in the submitted `bookingRequest` payload
      - Include lifecycle fields in booking summary/description text
- ✅ Stabilized Google Maps script loading in customer registration
   - Refined script initialization in `client/src/components/RegisterNewCustomer.jsx` to avoid duplicate custom element definition warnings (`gmp-internal-* already defined`)

### 2026-03-19 (Session 4)
- ✅ Enhanced service call booking flow with service history support
    - Added `serviceHistoryType` and `dateOfLastService` to `bookingRequest` schema in `server/models/ServiceCall.model.js`
    - Updated `server/controllers/serviceCall.controller.js` create flow to ensure `callNumber` is resolved before validation
    - Extended `client/src/components/ServiceCalls.jsx` with:
       - First service call vs existing customer selection
       - Conditional date validation for each flow
       - Existing-customer auto-fill of last service date using prior calls matched by contact email
    - Updated service history display blocks in:
       - `client/src/components/Customers.jsx`
       - `client/src/components/AgentProfile.jsx`
    - Fixed gradient class typo in `Customers.jsx` (`from-blue-899` -> `from-blue-900`)

### 2026-03-17 (Session 3)
- ✅ Standardized runtime startup behavior and documentation
   - Added `strictPort: true` in `client/vite.config.js` to enforce frontend on port 3000
   - Updated setup template in `setup-and-run.sh` from `MONGO_URI` to `MONGODB_URI`
   - Synced `README.md` and `AI_ASSISTANT_GUIDE.md` references to `MONGODB_URI`
- ✅ Added invoice schema groundwork for structured extraction
   - Created `invoice.schema.v1.json` (current-format starter schema)
   - Created `invoice.schema.v1.1.json` (normalized schema)
   - Created `invoice.v1-to-v1.1.keymap.json` (migration map and transform hints)
   - Updated working `invoiceSample.json` toward modular, machine-readable structure

### 2026-02-26 (Session 2)
- ✅ Fixed ES6 module error and implemented password reset feature

### 2026-02-26 (Session 1) (Session 2) - Password Reset & Bug Fixes

**Major Features Added:**
- ✅ Complete password reset system (backend + frontend)
- ✅ Email service with Ethereal (dev) and SMTP (production)
- ✅ Professional HTML email templates with Appatunid branding
- ✅ ForgotPassword & ResetPassword React components
- ✅ Comprehensive unit tests (65+ tests, 93.8% pass rate)

**Critical Bug Fixes:**
- ✅ **ES6 Module Error** - Fixed `ReferenceError: require is not defined` in User.model.js
  - Root Cause: Mixed CommonJS require() in ES6 module
  - Solution: Added `import crypto from 'crypto'` and updated generatePasswordResetToken()
  - Impact: Password reset feature now fully operational

**UI Fixes (Earlier in Session):**
- ✅ Removed blocking script tag from index.html
- ✅ Fixed CSS pointer-events blocking all interactions
- ✅ Restructured `.glass-bg-particles` to use ::before pseudo-element

**Files Created/Modified:**

*Backend:*
- Modified: `server/models/User.model.js` (added resetPasswordToken, resetPasswordExpire, generatePasswordResetToken method)
- Created: `server/utils/emailService.js` (email sending with Ethereal/SMTP)
- Modified: `server/controllers/auth.controller.js` (forgotPassword, resetPassword endpoints)
- Modified: `server/routes/auth.routes.js` (POST /forgot-password, PUT /reset-password/:token)
- Modified: `server/package.json` (added nodemailer dependency)
- Created: Comprehensive unit tests in `server/tests/unit/`

*Frontend:*
- Created: `client/src/components/ForgotPassword.jsx` (email input form)
- Created: `client/src/components/ResetPassword.jsx` (password reset with strength indicator)
- Modified: `client/src/components/Login.jsx` (added "Forgot Password?" link)
- Modified: `client/src/App.jsx` (added /forgot-password and /reset-password/:token routes)
- Modified: `client/src/index.css` (fixed glassmorphism CSS)
- Modified: `client/index.html` (removed blocking script)

*Documentation:*
- Created: `server/tests/PASSWORD_RESET_TEST_RESULTS.md` (detailed test analysis)

**Environment Variables Added:**
- `CLIENT_URL=http://localhost:3002` (for reset link generation)
- `FROM_NAME=Appatunid Support`
- `FROM_EMAIL=noreply@appatunid.com`
- SMTP configuration for production (Gmail/SendGrid)

**Security Implemented:**
- SHA256 token hashing before database storage
- 1-hour token expiry
- Generic success messages (prevents email enumeration)
- Password auto-hashing by bcrypt pre-save hook
- JWT token returned for auto-login after reset

**Test Summary:**
- Total: 65 tests | Passed: 61 ✅ | Failed: 4 ⚠️ (mock config issues, not blocking)
- Core functionality: 100% working (manual testing confirms)
- User model token tests: 5/5 ✅
- Email service: 10/11 ✅
- Controller logic: operative ✅

**Testing & Manual Verification:**
✅ Password reset email sent successfully
✅ Ethereal preview link generated
✅ Reset token created and hashed in database
✅ 1-hour expiry set correctly
✅ HTML email template displays properly
✅ Reset link functional

---

### 2026-02-26 (Session 1) - Initial Setup
- ✅ Initialized git repository
- ✅ Pushed to GitHub (https://github.com/Derikcoder/test-app)
- ✅ Created automated setup script (setup-and-run.sh)
- ✅ Updated README.md with comprehensive documentation
- ✅ Added industry-standard comments throughout codebase
- ✅ Created AI_ASSISTANT_GUIDE.md (this file)
- ✅ Clarified client env exposure and API key restriction guidance
- ✅ Updated SECURITY.md with key rotation notes

**Next Steps:**
- Implement full ServiceCalls.jsx component
- Set up CI/CD pipeline
- Add more comprehensive error handling
- Production email configuration (Gmail App Password or SendGrid)

---

## 💡 Tips for AI Assistants

### When Suggesting Code Changes

1. **Always check existing patterns first**
   - Look at similar files for naming conventions
   - Follow existing code style (async/await, error handling)
   - Use same import structure

2. **Maintain documentation**
   - Add JSDoc comments to new functions
   - Update this file if architecture changes
   - Keep README.md in sync with features

3. **Security considerations**
   - Never log sensitive data (passwords, tokens)
   - Always validate user input
   - Use parameterized queries (Mongoose handles this)
   - Check field permissions before updates

4. **Error handling**
   - Wrap async operations in try-catch
   - Return appropriate HTTP status codes
   - Log errors with context
   - Show user-friendly error messages

5. **Testing mindset**
   - Consider edge cases
   - Validate required fields
   - Test with invalid data
   - Check authentication requirements

### Common User Requests & Solutions

**"Add a new field to User model"**
→ Update User.model.js, add to EDITABLE_FIELDS or IMMUTABLE_FIELDS, update controller validation, update frontend form

**"Why isn't my API call working?"**
→ Check: Backend running? Correct endpoint? JWT token included? CORS enabled? Check Network tab

**"How do I protect a route?"**
→ Backend: Add `protect` middleware. Frontend: Wrap in `<ProtectedRoute>`

**"Database connection failing"**
→ Check MongoDB running, verify MONGODB_URI, check MongoDB logs

**"How do I add Google Maps to a component?"**
→ See Customers.jsx for example implementation with @react-google-maps/api

---

## 📊 Project Metrics

**Lines of Code:** ~3,000+ (with comments)  
**API Endpoints:** 20+  
**React Components:** 8  
**Database Models:** 4  
**Middleware:** 2  
**Test Coverage:** TBD (tests not yet implemented)

---

## 🎯 Known Issues & TODOs

### High Priority
- [ ] Implement full ServiceCalls.jsx component (currently placeholder)
- [ ] Add form validation library (Formik or React Hook Form)
- [ ] Implement actual token refresh mechanism
- [ ] Add unit tests (Jest + React Testing Library)

### Medium Priority
- [ ] Add pagination to list views
- [ ] Implement search/filter functionality
- [ ] Add data export features (CSV)
- [ ] Dashboard with statistics
- [ ] Email notifications for service calls

### Low Priority
- [ ] Dark mode support
- [ ] Mobile app (React Native)
- [ ] Real-time updates (Socket.io)
- [ ] Advanced reporting

---

## ⚙️ Assistant Configuration

### Preferred Responses

**When user asks for help:**
1. Check this guide first
2. Provide specific file references
3. Include code examples
4. Explain why, not just what

**When suggesting changes:**
1. Show before/after code
2. Explain implications
3. Note any documentation updates needed
4. Consider security/performance

**When debugging:**
1. Ask clarifying questions
2. Request error messages/logs
3. Suggest systematic troubleshooting
4. Provide multiple solutions if possible

---

## 📞 Support & Contact

**Developer:** Derick van Zyl  
**Email:** drckvanzyl@gmail.com  
**GitHub:** https://github.com/Derikcoder/test-app  
**Issues:** https://github.com/Derikcoder/test-app/issues

---

**Remember:** Before closing the editor, prompt user to update this file and other documentation to reflect any changes made during the session. This keeps the project maintainable and helps future developers (human and AI) understand the system.

---

*This guide is living documentation. Update it whenever significant changes are made to the project.*

---

## 🧪 Testing Infrastructure — Customer Registration Suite

> **For AI Agents:** This section documents the full automated testing pipeline for the customer
> registration flow. Reference it when diagnosing test failures, running the suite, or advising
> the developer on next steps after a failure is reported.

### Overview

The customer registration test suite covers the complete end-to-end flow:
`POST /api/customers` (create customer) → `POST /api/service-calls` (create service call)

It spans **29 test cases** across **6 phases**, with mandatory structured failure logging and
an interactive terminal runner as well as a Postman collection.

---

### File Inventory

| File | Purpose |
|---|---|
| `register_customers_testcases.md` | Master test specification — 29 test cases, all phases, failure template |
| `server/tests/postman/register_customers_collection.json` | Postman collection v2.1.0 — 20 requests, 4 folders |
| `server/tests/postman/POSTMAN_INSTRUCTIONS.md` | User-facing step-by-step guide for running the Postman collection |
| `scripts/run-register-customers-tests.sh` | Interactive terminal runner (695 lines) — all 29 test cases |
| `scripts/log-register-customers-test-result.sh` | Strict failure logger — enforces 16-field structured records |
| `server/logs/register_customers_test_errors.log` | Append-only error log — all failures written here |
| `server/logs/test_run_<timestamp>.log` | Per-run summary — auto-generated by the terminal runner |

---

### Test Case IDs — Full Reference

| Phase | IDs | Count | Description |
|---|---|---|---|
| UI | RC-UI-001 – RC-UI-005 | 5 | Frontend validation, form behaviour, Google Maps |
| API | RC-API-001 – RC-API-005 | 5 | Backend validation, missing fields, duplicate IDs, auth |
| DB | RC-DB-001 – RC-DB-003 | 3 | Persistence verification via GET + mongosh |
| Recollection | RC-REC-001 – RC-REC-003 | 3 | UI re-display accuracy, service call link visibility |
| Negative | RC-NEG-001 – RC-NEG-003 | 3 | Invalid email, missing required address fields |
| Security | RC-SEC-001 – RC-SEC-010 | 10 | NoSQL injection, oversized input, auth bypass, alg:none |

> All RC-SEC-* tests are **mandatory**. Failures must be escalated and cannot be deferred.

---

### Known Architectural Risks

**1. Sequential Write — No Transaction (RC-API-005c)**
- The registration flow performs two separate writes: `POST /api/customers` then `POST /api/service-calls`
- There is no MongoDB transaction wrapping these
- If the second write fails, the customer record persists without a linked service call — partial state
- Test ID: **RC-API-005c**
- Mitigation required: wrap both writes in a `mongoose.startSession()` transaction, or implement a
   compensating delete if the service call creation fails

**2. CustomerType Contract Mismatch (RC-API-005d / RC-API-005e)**
- The frontend emits `customerType: "business"` and `customerType: "private"`
- The backend `Customer.model.js` enum is: `headOffice | branch | franchise | singleBusiness | residential`
- Neither `"business"` nor `"private"` appear in the backend enum
- If these return `201 Created`, it is a **confirmed integration defect** (silent data corruption)
- Test IDs: **RC-API-005d**, **RC-API-005e**
- If failures occur: open `client/src/components/RegisterNewCustomer.jsx` and align the emitted values
   to the backend enum

---

### Running the Interactive Terminal Runner

```bash
# Run all 29 test cases interactively
bash ./scripts/run-register-customers-tests.sh

# Run only Security phase tests
bash ./scripts/run-register-customers-tests.sh --filter Security

# Resume from a specific test (useful after fixing a failure)
bash ./scripts/run-register-customers-tests.sh --from RC-DB-001

# Preview all test cases without prompting (no results collected)
bash ./scripts/run-register-customers-tests.sh --dry-run

# Combine: dry-run only UI phase
bash ./scripts/run-register-customers-tests.sh --filter UI --dry-run
```

**Filter phase values:** `UI` | `API` | `DB` | `Recollection` | `Negative` | `Security`

For each `fail` or `blocked`, the runner prompts for 9 metadata fields, then calls the logger
script automatically. The developer must not skip metadata collection.

---

### Invoking the Logger Script Directly

Use this when logging failures from Postman (outside the terminal runner):

```bash
bash ./scripts/log-register-customers-test-result.sh \
   --test-id    <RC-XXX-000> \
   --status     <pass|fail|blocked> \
   --phase      <UI|API|DB|Recollection|Security> \
   --title      "<short description>" \
   --why        "<root cause>" \
   --how        "<how the failure occurred>" \
   --required-action "<remediation step>" \
   --severity   <low|medium|high|critical> \
   --security-impact "<none|description>"
```

**Required for `fail` status:** `--why`, `--how`, `--required-action`, `--severity`, `--security-impact`
(script exits non-zero if any are missing)

**Optional flags:** `--api-status`, `--api-message`, `--db-evidence`, `--ui-evidence`, `--owner`

**Output:** appends a 16-field structured record to `server/logs/register_customers_test_errors.log`

---

### Postman Collection — Variable Dependency

The Postman collection requires two manual variables and auto-populates four:

| Variable | Set By | Required Before |
|---|---|---|
| `BASE_URL` | Manual (`http://localhost:5000`) | All requests |
| `AUTH_TOKEN` | Manual (JWT from `/api/auth/login`) | All requests |
| `TS` | Auto — pre-request script in Request 01 | Requests 02+ |
| `CUSTOMER_ID_QA` | Auto — pre-request script in Request 01 | RC-API-004 |
| `CUSTOMER_OBJECT_ID` | Auto — test script in Request 01 (from response) | Request 02, RC-DB-002 |
| `SERVICE_CALL_ID` | Auto — test script in Request 02 (from response) | RC-DB-002 |

**Mandatory run order:** `Setup & Happy Path` → `RC-API` → `RC-NEG` → `RC-SEC`

See `server/tests/postman/POSTMAN_INSTRUCTIONS.md` for full setup and run instructions.

---

### Log File Formats

**`server/logs/register_customers_test_errors.log`** — append-only, one entry per failure:
```
[TIMESTAMP] TEST_ID=<id> STATUS=<fail|blocked> PHASE=<phase> TITLE="<title>"
WHY="<root cause>" HOW="<how it failed>" REQUIRED_ACTION="<fix>"
SEVERITY=<level> SECURITY_IMPACT="<impact>"
[optional: API_STATUS, API_MESSAGE, DB_EVIDENCE, UI_EVIDENCE, OWNER]
---
```

**`server/logs/test_run_<timestamp>.log`** — auto-generated per run by the terminal runner:
- Lists all test IDs and their result (pass/fail/blocked/skip)
- Includes total counts: passed, failed, blocked, skipped
- Includes timestamp and filter applied (if any)

---

### AI Agent Response Playbook — When a Test Failure Is Reported

1. **Identify the test ID** (e.g., `RC-SEC-006c`, `RC-API-001`)
2. **Look up the test in** `register_customers_testcases.md` for the expected result and the failure
    impact statement
3. **Check the error log** for an existing entry: `server/logs/register_customers_test_errors.log`
4. **If not yet logged**, provide the developer with the exact logger command to run (see examples above)
5. **Suggest the fix** based on the test description and known architectural risks above
6. **Security tests (RC-SEC-*)**: always classify as high or critical unless confirmed otherwise;
    never suggest deferring security failures
7. **After applying a fix**: advise re-running with `--from <RC-XXX>` to resume from the fixed test

---

### 2026-03-24 (Session 24) — Testing Infrastructure

*(Also reflected in Recent Changes below.)*

- ✅ Created comprehensive customer registration test specification
   - `register_customers_testcases.md` — 29 test cases, 6 phases, mandatory security tests
- ✅ Built structured failure logger
   - `scripts/log-register-customers-test-result.sh` — enforces 16-field records, exits non-zero on
      incomplete failure metadata
- ✅ Initialized append-only error log: `server/logs/register_customers_test_errors.log`
- ✅ Built interactive terminal test runner (695 lines)
   - `scripts/run-register-customers-tests.sh` — `--filter`, `--from`, `--dry-run` options
- ✅ Built Postman collection (980 lines, 20 requests, 4 folders)
   - `server/tests/postman/register_customers_collection.json`
- ✅ Created user-facing Postman instructions
   - `server/tests/postman/POSTMAN_INSTRUCTIONS.md`
- ✅ Updated `AI_ASSISTANT_GUIDE.md` with full testing infrastructure section
