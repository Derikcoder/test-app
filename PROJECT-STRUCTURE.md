# Project Structure

This document provides a structured, enterprise-grade overview of the codebase. It is intended to help engineers, QA, and ops teams quickly understand where key responsibilities live and how the system is organized.

Last updated: 2026-04-13

---

## 🏗️ Project Vision

This codebase is being built as a **digital transformation framework for service industry businesses** (field service, generators, electrical, plumbing, and beyond). The architecture is intentionally modular — each branch represents a **standalone, portable component** that can be extracted and carried into other projects.

---

## 🎯 Active Branch Goal — `feature/customer-management`

**Objective:** Refactor the customer module into a proper parent → child component hierarchy.

### Problem
`Customers.jsx` currently contains a customer registration/service request form — it is **not** a customer list. This mixes concerns and makes the component unsuitable as the customers landing page.

### Plan
1. **Extract** the existing form from `Customers.jsx` into a new reusable component: `RegisterNewCustomer.jsx`
2. **Recreate** `Customers.jsx` as a true customer list page — dynamically renders all customers from the database
3. **Create** `SingleCustomer.jsx` as the customer detail/profile view — child of `Customers.jsx`, navigated to per row
4. **Wire** routing so `Customers` → list, clicking a customer → `SingleCustomer` profile

### Current Status (April 2, 2026)
- `RegisterNewCustomer.jsx` onboarding payload is aligned with backend requirements by sending `customerType` during customer creation.
- Branch/site name input in onboarding is now conditionally required for `branch` and `franchise` customer types.

### Component Hierarchy
```
Customers.jsx                    ← parent: lists all customers from DB, filtered by type
  ├── HeadOfficeCustomer.jsx     ← profile: head office account (multiple branches/franchises)
  ├── BranchCustomer.jsx         ← profile: branch of a head office
  ├── FranchiseCustomer.jsx      ← profile: franchise operation
  ├── SingleBusinessCustomer.jsx ← profile: standalone business (SME)
  └── ResidentialCustomer.jsx    ← profile: individual/residential client

RegisterNewCustomer.jsx          ← standalone modal/form: register any customer type (callable from anywhere)
```

### Customer Type Notes
- **HeadOfficeCustomer** — parent account; may have linked Branch and Franchise children
- **BranchCustomer** — linked to a HeadOffice parent; inherits some account settings
- **FranchiseCustomer** — linked to a HeadOffice parent; independent billing but shared branding
- **SingleBusinessCustomer** — standalone SME; no parent/child account relationships
- **ResidentialCustomer** — individual homeowner or tenant; simpler profile, no business fields

Each customer type will have its own profile view tailored to the relevant fields and service history structure.

---

## 🌿 Branch Architecture

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
| `main` | Stable production code. Never commit here directly. |
| `consolidation` | Integration branch — all features QA'd here before promoting to `main`. |
| `foundation` | Living base framework. All feature branches are created from here. |
| `feature/*` | Standalone modules, named after the functionality they deliver. |

### Branch Rules
- **Always branch from `foundation`** when starting a new module
- **Merge feature → foundation** when module is complete and tested
- **Merge foundation → consolidation** when a milestone is ready for QA
- **Merge consolidation → main** only after QA sign-off
- **Never commit directly to `main`**

---

## 📁 Root
- `README.md`: User-facing setup guide, API reference, and developer workflow.
- `AI_ASSISTANT_GUIDE.md`: Primary briefing for AI assistants — read this first before making changes.
- `BUSINESSRULES.md`: Consolidated business rules reference extracted from policy docs and enforced code paths.
- `PROJECT-STRUCTURE.md`: This document — enterprise-grade structural reference.
- `APPATUNID_UI_QUICKREF.md`: Glassmorphism UI component quick reference.
- `GLASSMORPHISM_DESIGN_GUIDE.md`: Full design system guide for the Appatunid UI.
- `AUTH_GUIDE.md`: Authentication deep-dive — JWT, tokens, password reset.
- `FIELD_PERMISSIONS.md`: Field-level permissions and immutable fields policy.
- `LOGGING_GUIDE.md`: Logging policy and usage guidelines.
- `PROFILE_EDITING_GUIDE.md`: Profile editing rules and examples.
- `SECURITY.md`: Security policies, threat model, and best practices.
- `TESTING_GUIDE.md`: Testing strategy and instructions.
- `UNIT_TESTING_SUMMARY.md`: Summary of unit test coverage and results.
- `setup-and-run.sh`: Full environment setup and app startup script.
- `refresh.sh`: ⚠️ DEV ONLY — stops and restarts all dev processes. Remove before production.
- `start-dev.sh`: Developer-facing startup script. Supports system MongoDB and user-mode `mongod` (forks into `.mongodb/data/` if system service is unavailable); cleans up on exit via named trap.
- `install-mongodb.sh`: MongoDB install helper for first-time setup. Updated for modern Ubuntu/Debian installs via the official MongoDB Community Server 8.0 apt repository; fixes earlier script corruption and supports environments where only `mongosh` was present.
- `invoice.schema.v1.json`: Starter JSON Schema matching current invoice payload format.
- `invoice.schema.v1.1.json`: Normalized JSON Schema for cleaner integration format.
- `invoice.v1-to-v1.1.keymap.json`: Field mapping and transform hints from v1 to v1.1.
- `invoiceSample.json`: Working invoice sample payload used as source reference.
- `package.json`: Root scripts that orchestrate client/server workflows.
- `.github/copilot-instructions.md`: GitHub Copilot custom instructions for this repo.
- `client/`: React + Vite frontend application.
- `server/`: Express + MongoDB backend API.

---

## 🖥️ Client Application (`client/`)
- `index.html`: Vite HTML entry point.
- `vite.config.js`: Vite configuration, dev server (port 3000), and API proxy to backend.
- `tailwind.config.js`, `postcss.config.js`: Styling pipeline configuration.
- `.env`: Frontend runtime config — VITE_ prefixed variables only.
- `.env.example`: Template for client environment variables.
- `.eslintrc.cjs`: ESLint configuration for the frontend.

### Client Source (`client/src/`)
- `main.jsx`: React bootstrap and root render.
- `App.jsx`: Router and protected route configuration.
- `index.css`: Global stylesheet — Tailwind base layers, CSS variables, and two `@layer components` blocks. The first block defines the original Glassmorphism system (`.glass-*` classes). The second block defines the shared dark-surface utility classes (`.dark-field-input`, `.btn-action-*`, `.spinner-*`, `.page-center`, `.page-body`, etc.). **All reusable Tailwind patterns must be extracted here — never left inline.** See `APPATUNID_UI_QUICKREF.md` for the full class reference.
- `api/axios.js`: Axios instance with API base URL config.
- `context/AuthContext.jsx`: Global auth state, JWT handling, login/logout, profile updates.
- `components/`: Page-level screens and shared UI components.

### Client Components (`client/src/components/`)
- `Sidebar.jsx`: Slide-in navigation and primary app shell menu.
- `Login.jsx`: Login form with JWT authentication.
- `Register.jsx`: New user registration form.
- `ForgotPassword.jsx`: Password reset request form — sends reset email.
- `ResetPassword.jsx`: Password reset form — consumes reset token from email link.
- `UserProfile.jsx`: Profile display and edits with write-once registration identifiers, legal-evidence override capture for superAdmin, and role-aware account dashboard.
- `FieldServiceAgents.jsx`: Field service agent list and CRUD screen. Employee ID (`AGT-XXXXXX`) is system-generated; input field was removed from registration form.
- `AgentProfile.jsx`: Agent detail view with job statistics.
- `FieldAgentSelfProfile.jsx`: Field agent's own workspace — loads the calling agent's profile via `GET /api/agents/me` (no `createdBy` restriction) and their assigned service calls via `GET /api/service-calls/my-assigned`. Role-scoped: only accessible when `user.role === 'fieldServiceAgent'`; routed via `ProfileRoute` in `App.jsx`.
- `InvoiceApprovalPage.jsx`: Public customer review page for shared pro-forma documents with approve/reject actions.
- `Customers.jsx`: Customer list page — all customers filtered by type, with navigation to type-specific profiles.
- `RegisterNewCustomer.jsx`: Reusable modal/form for registering any customer type. Callable from any screen.
- `HeadOfficeCustomer.jsx`: Profile view for Head Office accounts (parent of branches/franchises).
- `BranchCustomer.jsx`: Profile view for Branch accounts (child of Head Office).
- `FranchiseCustomer.jsx`: Profile view for Franchise accounts (child of Head Office, independent billing).
- `SingleBusinessCustomer.jsx`: Profile view for standalone SME customers.
- `ResidentialCustomer.jsx`: Profile view for individual/residential customers. Fully built — hero header, contact card, address card, service locations, account details, conditional notes, and service call history with status badges.
- `ServiceCalls.jsx`: Service calls list page and booking flow with first-service/existing-customer modes, scheduling, last-service auto-fill by contact email, lifecycle capture (`servicesInProgress`, `progressStatus`, `quotationHistory`, `invoicingHistory`), plus superUser operations alerts for unassigned calls and assignment to field agents. Booking-request intake now supports prospect-first capture: a service call may remain unlinked to a `Customer` until a quotation is actually accepted.
- `CreateQuoteModal.jsx`: Reusable quotation creation and editing modal, shared across superAdmin, businessAdministrator, and agent flows. Features: machine-model template loading, tiered unit-cost markup for parts line items, separated costing inputs (parts, labour, consumables, travel), function-based travel costing (`distanceTravelledKm × ratePerKm + timeTravelledCost`), call-out floor rule, first-site-visit 15-minute assessment inclusion, procurement/delivery profit capture, 14-day default validity with calendar override, optional PDF share (Email/WhatsApp/Telegram), and full edit mode (`editMode` prop) that pre-populates from an existing quotation and submits via PUT — stored prices used as-is (no markup re-applied on edit).
- `UserProfile_old.jsx`, `UserProfile_backup2.jsx`: Local backups (not used in routing).

### Frontend UI System — Role-Aware Visual Cues

**Purpose:** Make user context (role, access mode, entity type) instantly visible across all pages to prevent operational confusion and support multi-role governance workflows.

**Color Legend (Sidebar + All Page Headers):**
Integrated into `Sidebar.jsx` as persistent global entity legend and replicated on all operational page headers:
- 🟦 **Cyan** — Field Agents
- 🟦 **Indigo** — Customers
- 🟨 **Amber** — Service Calls
- 🟧 **Orange** — Quotations
- 🟩 **Emerald** — Invoices / Pro-Forma
- 🟪 **Fuchsia** — Super Admin role indicator
- 🟦 **Cyan** — Field Service Agent / Non-admin role indicator

**Sidebar Global Legend (`Sidebar.jsx`):**
- Persistent 5-item entity legend in footer showing color + name for all core entities
- Dynamic role badge showing "Super Admin" (fuchsia) vs. operational role (cyan)
- Access mode chip showing "Governance Mode" (superAdmin) vs. "Operational Mode"
- Maintains visual context across all navigation

**Page Header Implementation (All Operational Pages):**
Each page now includes role and entity context chips in header, immediately below page title:
- **Entity Chip** — Colored label matching entity legend (e.g., "Entity: Service Calls" in amber)
- **Role Chip** — Dynamic role badge (fuchsia for super-admin, cyan for operational) with role label
- Applied to: Customers, ServiceCalls, Quotations, FieldServiceAgents, AgentProfile

**Pro-Forma Invoice Context (Modal + Public Pages):**
- `SiteInstructionModal.jsx` — Emerald entity chip + role/access context
- `InvoiceApprovalPage.jsx` — Emerald entity chip + "Public Customer Approval" access context

**Implementation Notes:**
- Props drilling pattern: parent passes `roleLabel` and `isSuperAdmin` to modals
- Tailwind utility classes for high-contrast dark mode (slate-950 backgrounds, colored borders/text)
- No color-related logic in JavaScript — pure declarative styling via Tailwind classes
- Sidebar legend is the single source of truth for color semantics

### Client Tests (`client/src/__tests__/`)
- `setup.js`: Test environment setup (jsdom, mocks).
- `api/axios.test.js`: Axios instance and API config tests.
- `components/Login.test.jsx`: Login component unit tests.
- `components/CreateQuoteModal.test.jsx`: Quotation modal unit tests.
- `context/AuthContext.test.jsx`: Auth context unit tests.
- `css/index.css.test.js`: CSS regression suite — 45 Vitest tests across 4 suites: brace balance, class inventory (24 named classes), no-raw-inline-patterns (12 banned Tailwind strings), and usage sanity checks. Run with `npx vitest run src/__tests__/css/index.css.test.js`.
- `TEST_RESULTS_FINAL.md`, `TEST_RESULTS_SUMMARY.md`: Test run documentation.

---

## ⚙️ Server Application (`server/`)
- `server.js`: Express bootstrap — middleware registration, route wiring, and server start.
- `.env`: Backend environment config (PORT, MONGODB_URI, JWT_SECRET, email settings).
- `.env.example`: Template for server environment variables.
- `babel.config.cjs`: Babel config for Jest/ESM transpilation.
- `jest.config.js`: Jest test runner configuration.
- `config/db.js`: MongoDB connection — dev-first strategy: tries local MongoDB first in `development`, falls back to Atlas; uses `MONGODB_URI` only in `production`.
- `logs/error.log`: Runtime error log.
- `logs/request.log`: HTTP request log.

### Server Models (`server/models/`)
- `User.model.js`: Multi-principal user schema (`superAdmin`, `businessAdministrator`, `fieldServiceAgent`, `customer`) with role/profile-link constraints and write-once registration policy support.
- `FieldServiceAgent.model.js`: Field agent schema, employee details, and metadata.
- `Customer.model.js`: Customer schema, contact information, sites, and account status. Under the prospect-first policy, customer records represent converted customers, not every quoted prospect.
- `OnboardingPasskey.model.js`: One-time passkey lifecycle for delegated-role onboarding.
- `PasskeyRenewalRequest.model.js`: Approval-driven passkey renewal requests.
- `ProfileLinkAudit.model.js`: Audit log for attach/detach/reassign user-profile link corrections.
- `RegistrationOverrideAudit.model.js`: Immutable legal-evidence snapshot audit for superAdmin registration identifier overrides.
- `SequenceCounter.model.js`: Atomic sequential counter for system-generated IDs (Agent: `AGT-XXXXXX`, Customer: `CUST-XXXXXX`). Uses `findOneAndUpdate` with `$inc` + upsert for collision-safe incrementing.
- `ServiceCall.model.js`: Service call schema — booking request, statuses, priority, parts used, and service history/lifecycle fields (`serviceHistoryType`, `dateOfLastService`, `servicesInProgress`, `progressStatus`, `quotationHistory`, `invoicingHistory`), with assignment workflow metadata (`assignedDate`, `agentAccepted`, `assignmentNotifiedAt`). Service calls can now exist in a prospect-only state via `bookingRequest` without an immediate `customer` link.
- `Quotation.model.js`: Quotation schema — line items, totals, status, linked service call, structured travel fields (including travel time for call-out floor logic), first-site-visit assessment fields (`isFirstSiteVisit`, `includedAssessmentMinutes`, `chargeableLabourHours`), procurement/delivery analytics fields, and default 14-day validity. Supports prospect delivery via `recipientSnapshot` so a quote can be sent before a `Customer` or portal `User` exists.
- `Invoice.model.js`: Invoice schema — rendered from quotations, payment tracking.
- `Equipment.model.js`: Equipment/asset tracking schema.
- `Example.model.js`: Example/template entity schema.

### Server Controllers (`server/controllers/`)
- `auth.controller.js`: Multi-principal registration/login, passkey generation/renewal, profile updates with write-once/legal-evidence policy, admin profile-link correction flows, and legal override audit query endpoint.
- `agent.controller.js`: Field service agent CRUD. `employeeId` is now auto-generated (`AGT-000001` format) via `SequenceCounter`; no longer accepted from client input. Includes `getMyAgentProfile` — looks up the calling user's own agent record via `{ userAccount: req.user._id }` (no `createdBy` restriction) for fieldServiceAgent self-access.
- `customer.controller.js`: Customer CRUD. `customerId` is now auto-generated (`CUST-000001` format) via `SequenceCounter`; no longer accepted from client input.
- `serviceCall.controller.js`: Service call CRUD, status transitions, agent assignment, create-time call number resolution fallback, and assignment metadata stamping for superUser queue handoff. Includes `getMyAssignedServiceCalls` — returns calls where `assignedAgent === req.user.fieldServiceAgentProfile` for field agent self-access. `getEligibleUnassignedServiceCalls` and `selfAcceptServiceCall` resolve `businessCreatedBy` from the agent record when the caller is a `fieldServiceAgent`, avoiding the `createdBy: req.user._id` mismatch.
- `quotation.controller.js`: Quotation creation, line items, status management.
- `quotation.controller.js`: Quotation creation, line items, status management, and create-time pricing calculation (subtotal/VAT/total).
- `quotation.controller.js`: Quotation creation, line items, status management, separated pricing calculation (parts/labour/consumables/travel), service-call shortcut quote creation, server-side labour-rate protection for non-super users, function-based travel-cost calculation (`distanceTravelledKm × ratePerKm + timeTravelledCost`) with call-out floor condition support, first-site-visit included assessment logic, procurement/delivery profit capture, 14-day default validity fallback, PDF generation, quote delivery endpoints (optional Email/WhatsApp/Telegram), and auto-conversion of approved quotations into in-progress service jobcards.
- `invoice.controller.js`: Invoice generation from quotations, pro-forma workflow, payment tracking, PDF sharing, and public customer approval/rejection endpoints.
- `equipment.controller.js`: Equipment/asset CRUD.

### Server Routes (`server/routes/`)
- `auth.routes.js`: `/api/auth` — login, register, profile, password reset, passkey lifecycle endpoints, profile-link correction endpoints, and legal override audit query endpoint.
- `agent.routes.js`: `/api/agents` — agent endpoints. `GET /me` (before `/:id`) returns the calling field agent's own profile.
- `customer.routes.js`: `/api/customers` — customer endpoints.
- `serviceCall.routes.js`: `/api/service-calls` — service call endpoints. `GET /my-assigned` returns assigned calls scoped to the calling field agent.
- `quotation.routes.js`: `/api/quotations` — quotation endpoints including PDF generation, send/distribution, and tokenized share access.
- `invoice.routes.js`: `/api/invoices` — invoice endpoints including pro-forma workflows, tokenized public PDF access, and public customer approval/rejection routes.
- `equipment.routes.js`: `/api/equipment` — equipment endpoints.
- `example.routes.js`: `/api/example` — example/template endpoints.

### Server Middleware (`server/middleware/`)
- `auth.middleware.js`: JWT verification (`protect` middleware) — applied to all private routes. Includes null-user guard: returns 401 if decoded user ID no longer exists in the database.
- `logger.middleware.js`: `logInfo`, `logError`, `logRequest` helpers used throughout controllers.

### Server Utils (`server/utils/`)
- `emailService.js`: Email sending with Ethereal fake SMTP for development and configurable real SMTP for production.
- `sequence.util.js`: Sequential ID generation — `getNextSequenceValue(sequenceName)` (atomic DB counter) and `formatSequenceId(prefix, value, width)` (e.g. `AGT-000001`).

### Server Tests (`server/tests/`)
- `setup.js`: Test environment setup and MongoDB in-memory configuration.
- `unit/controllers/`: Unit tests for each controller.
- `unit/middleware/`: Middleware unit tests.
- `unit/models/`: Model schema and method tests.
- `unit/utils/`: Utility function tests.
- `TEST_RESULTS_FINAL.md`, `TEST_RESULTS_SUMMARY.md`: Test run documentation.
- `PASSWORD_RESET_TEST_RESULTS.md`: Password reset flow test results.

---

## 🔄 Runtime Architecture
- **Frontend** (Vite) runs on **port 3000** and proxies `/api/*` requests to the backend.
- **Backend** (Express) runs on **port 5000** and connects to MongoDB.
- **MongoDB** runs locally on the default port `27017`, database: `test-app`.

## ⚙️ Configuration and Environment
- Client env vars must be prefixed with `VITE_` — they are bundled into the client and are **not secret**.
- Backend env vars are read from `server/.env` — never commit this file.
- `VITE_GOOGLE_MAPS_API_KEY` required for address/map picker functionality.
- `JWT_SECRET` must be a strong random string in production.

## 🔁 Data and Control Flow
```
UI event → component state → api/axios.js → Express route
  → auth.middleware.js (JWT check)
  → controller (validation + business logic)
  → Mongoose model (schema + field protection)
  → MongoDB
```

## ⚠️ Known Dev-Only Files (Remove Before Production)
- `refresh.sh` — dev convenience script to kill and restart all processes.
