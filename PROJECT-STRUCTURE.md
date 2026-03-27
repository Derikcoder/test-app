# Project Structure

This document provides a structured, enterprise-grade overview of the codebase. It is intended to help engineers, QA, and ops teams quickly understand where key responsibilities live and how the system is organized.

Last updated: 2026-03-26

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

### Component Hierarchy

```text
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

```text
main                 ← Production (stable, never touched directly)
  └── consolidation  ← QA / integration merge point
        └── foundation    ← Base framework (parent of all features)
              ├── feature/invoicing-engine
              ├── feature/customer-portal
              ├── feature/field-agent-app
              └── feature/<module-name>
```

| Branch          | Purpose                                                                 |
| --------------- | ----------------------------------------------------------------------- |
| `main`          | Stable production code. Never commit here directly.                     |
| `consolidation` | Integration branch — all features QA'd here before promoting to `main`. |
| `foundation`    | Living base framework. All feature branches are created from here.      |
| `feature/*`     | Standalone modules, named after the functionality they deliver.         |

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
- `PROJECT-STRUCTURE.md`: This document — enterprise-grade structural reference.
- `API_COLLECTION.md`: Live API endpoint inventory, integration structure, and API management plan.
- `user-manual/`: Human-facing documentation layer with section-based navigation for setup, API, workflows, security, and user stories.
- `schemas/`: JSON Schema contract registry used to plumb API contracts into one typed system map.
- `schemas/project.schema.json`: Root JSON Schema registry for shared and domain API contracts.
- `schemas/shared/`: Shared reusable schema contracts (types, response envelopes, auth policy).
- `schemas/domains/`: Domain-level schema contracts for auth, customers, agents, service calls, equipment, quotations, and invoices.
- `docs/`: Mermaid flow assets and interactive HTML viewers for process logic.
- `docs/flowchart LR`: Technical user registration swimlane flow.
- `docs/flowchart LR non technical`: Executive/non-technical registration flow.
- `docs/flowchart TD`: Detailed user registration process flow.
- `docs/sequenceDiagram`: User registration sequence diagram for API docs.
- `docs/user-registration-swimlane-pannable.html`: Interactive pannable and zoomable swimlane diagram.
- `APPATUNID_UI_QUICKREF.md`: Glassmorphism UI component quick reference.
- `GLASSMORPHISM_DESIGN_GUIDE.md`: Full design system guide for the Appatunid UI.
- `AUTH_GUIDE.md`: Authentication deep-dive — JWT, tokens, password reset.
- `FIELD_PERMISSIONS.md`: Field-level permissions and immutable fields policy.
- `LOGGING_GUIDE.md`: Logging policy and usage guidelines.
- `PROFILE_EDITING_GUIDE.md`: Profile editing rules and examples.
- `SECURITY.md`: Security policies, threat model, and best practices.
- `TESTING_GUIDE.md`: Testing strategy and instructions.
- `UNIT_TESTING_SUMMARY.md`: Summary of unit test coverage and results.
- `register_customers_testcases.md`: End-to-end customer registration test specification (29 cases across UI/API/DB/Recollection/Negative/Security).
- `certs/`: Shared local HTTPS certificate workspace for backend/frontend dev TLS files and tracked metadata.
- `certs/README.md`: Certificate placement, generation, and handling guide for local development.
- `certs/CERTIFICATE_INVENTORY.md`: Metadata log for cert expiry, fingerprints, ownership, and verification history.
- `setup-and-run.sh`: Full environment setup and app startup script.
- `refresh.sh`: ⚠️ DEV ONLY — stops and restarts all dev processes. Remove before production.
- `install-mongodb.sh`: MongoDB install helper for first-time setup.
- `scripts/check-cert-expiry.sh`: Verifies local cert expiry dates and SHA256 fingerprints for dev TLS assets.
- `scripts/log-register-customers-test-result.sh`: Structured test result logger for customer registration suite (mandatory failure metadata).
- `scripts/run-register-customers-tests.sh`: Interactive terminal runner for customer registration suite with `--filter`, `--from`, and `--dry-run` options.
- `invoice.schema.v1.json`: Starter JSON Schema matching current invoice payload format.
- `invoice.schema.v1.1.json`: Normalized JSON Schema for cleaner integration format.
- `invoice.v1-to-v1.1.keymap.json`: Field mapping and transform hints from v1 to v1.1.
- `invoiceSample.json`: Working invoice sample payload used as source reference.
- `package.json`: Root scripts that orchestrate client/server workflows.
- `.github/copilot-instructions.md`: GitHub Copilot custom instructions for this repo.
- `client/`: React + Vite frontend application.
- `server/`: Express + MongoDB backend API.

### User Manual Scaffold

The repository now includes a first-pass `user-manual/` structure to improve human navigation without moving the existing canonical root docs yet.

```text
user-manual/
├── README.md            # Manual index / navigation hub
├── setup/               # Environment, HTTPS, Postman onboarding
├── api/                 # API register and contract navigation
├── workflows/           # Process maps and operational flows
├── security/            # Secret handling and security practices
└── user-stories/        # Role-based journey documentation
```

Initial section landing pages currently point back to existing root and test documentation until content is consolidated.

### Local HTTPS Certificate Layout

Use this default shared structure for local SSL certificates used by the dev backend and Vite frontend:

```text
test-app/
└── certs/
  ├── localhost+1.pem
  └── localhost+1-key.pem
```

Related environment variables:

- Server (`server/.env`): `SSL_ENABLED`, `SSL_CERT_FILE`, `SSL_KEY_FILE`
- Client (`client/.env`): `VITE_SSL_ENABLED`, `VITE_SSL_CERT_FILE`, `VITE_SSL_KEY_FILE`, `VITE_API_PROXY_TARGET`

Path values from `server/.env` and `client/.env` should point to `../certs/...`.

See also: [Local HTTPS Setup](README.md#local-https-setup) in `README.md` for complete setup and verification steps.

---

## 🖥️ Client Application (`client/`)

- `index.html`: Vite HTML entry point.
- `vite.config.js`: Vite configuration, dev server (port 3000), and API proxy to backend.
- `tailwind.config.js`, `postcss.config.js`: Styling pipeline configuration.
- `.env`: Frontend runtime config — VITE\_ prefixed variables only.
- `.env.example`: Template for client environment variables.
- `.eslintrc.cjs`: ESLint configuration for the frontend.

### Client Source (`client/src/`)

- `main.jsx`: React bootstrap and root render.
- `App.jsx`: Router and protected route configuration.
- `index.css`: Global styles and Tailwind base layers (glassmorphism variables).
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
- `FieldServiceAgents.jsx`: Field service agent list and CRUD screen.
- `AgentProfile.jsx`: Agent detail view with job statistics.
- `InvoiceApprovalPage.jsx`: Public customer review page for shared pro-forma documents with approve/reject actions.
- `Customers.jsx`: Customer list page — all customers filtered by type, with navigation to type-specific profiles.
- `RegisterNewCustomer.jsx`: Reusable modal/form for registering any customer type. Callable from any screen.
- `HeadOfficeCustomer.jsx`: Profile view for Head Office accounts (parent of branches/franchises).
- `BranchCustomer.jsx`: Profile view for Branch accounts (child of Head Office).
- `FranchiseCustomer.jsx`: Profile view for Franchise accounts (child of Head Office, independent billing).
- `SingleBusinessCustomer.jsx`: Profile view for standalone SME customers.
- `ResidentialCustomer.jsx`: Profile view for individual/residential customers.
- `ServiceCalls.jsx`: Service calls list page and booking flow with first-service/existing-customer modes, scheduling, last-service auto-fill by contact email, lifecycle capture (`servicesInProgress`, `progressStatus`, `quotationHistory`, `invoicingHistory`), plus superUser operations alerts for unassigned calls and assignment to field agents.
- `CreateQuoteModal.jsx`: Reusable quotation creation modal, shared across superAdmin and customer-oriented flows.
- `CreateQuoteModal.jsx`: Reusable quotation submission modal, shared across superAdmin and customer-oriented flows, with machine-model template loading, unit-cost tiered markup conversion for parts line items, separated costing inputs (parts, labour, consumables, travel), function-based travel costing inputs (`distanceTravelledKm`, superAdmin-controlled `ratePerKm`, `travelTimeMinutes`, manual `timeTravelledCost`), call-out floor rule support, first-site-visit 15-minute assessment inclusion, procurement/delivery profitability capture, 14-day default quotation validity with calendar override, section-level helper-note placement to preserve row alignment, and optional post-submit PDF share action (Email/WhatsApp/Telegram).
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
- `context/AuthContext.test.jsx`: Auth context unit tests.
- `TEST_RESULTS_FINAL.md`, `TEST_RESULTS_SUMMARY.md`: Test run documentation.

---

## ⚙️ Server Application (`server/`)

- `server.js`: Express bootstrap — middleware registration, route wiring, and server start.
- `.env`: Backend environment config (PORT, MONGODB_URI, JWT_SECRET, email settings).
- `.env.example`: Template for server environment variables.
- `babel.config.cjs`: Babel config for Jest/ESM transpilation.
- `jest.config.js`: Jest test runner configuration.
- `config/db.js`: MongoDB connection and initialization.
- `logs/error.log`: Runtime error log.
- `logs/request.log`: HTTP request log.
- `logs/register_customers_test_errors.log`: Append-only customer registration test failure log.
- `logs/test_run_<timestamp>.log`: Per-run summary output generated by the registration test runner.

### Server Models (`server/models/`)

- `User.model.js`: Multi-principal user schema (`superAdmin`, `businessAdministrator`, `fieldServiceAgent`, `customer`) with role/profile-link constraints and write-once registration policy support.
- `FieldServiceAgent.model.js`: Field agent schema, employee details, and metadata.
- `Customer.model.js`: Customer schema, contact information, sites, and account status.
- `OnboardingPasskey.model.js`: One-time passkey lifecycle for delegated-role onboarding.
- `PasskeyRenewalRequest.model.js`: Approval-driven passkey renewal requests.
- `ProfileLinkAudit.model.js`: Audit log for attach/detach/reassign user-profile link corrections.
- `RegistrationOverrideAudit.model.js`: Immutable legal-evidence snapshot audit for superAdmin registration identifier overrides.
- `ServiceCall.model.js`: Service call schema — booking request, statuses, priority, parts used, and service history/lifecycle fields (`serviceHistoryType`, `dateOfLastService`, `servicesInProgress`, `progressStatus`, `quotationHistory`, `invoicingHistory`), with assignment workflow metadata (`assignedDate`, `agentAccepted`, `assignmentNotifiedAt`).
- `Quotation.model.js`: Quotation schema — line items, totals, status, linked service call, structured travel fields (including travel time for call-out floor logic), first-site-visit assessment fields (`isFirstSiteVisit`, `includedAssessmentMinutes`, `chargeableLabourHours`), procurement/delivery analytics fields, and default 14-day validity.
- `Invoice.model.js`: Invoice schema — rendered from quotations, payment tracking.
- `Equipment.model.js`: Equipment/asset tracking schema.
- `Example.model.js`: Example/template entity schema.

### Server Controllers (`server/controllers/`)

- `auth.controller.js`: Multi-principal registration/login, passkey generation/renewal, profile updates with write-once/legal-evidence policy, admin profile-link correction flows, and legal override audit query endpoint.
- `agent.controller.js`: Field service agent CRUD.
- `customer.controller.js`: Customer CRUD.
- `serviceCall.controller.js`: Service call CRUD, status transitions, agent assignment, create-time call number resolution fallback, and assignment metadata stamping for superUser queue handoff.
- `quotation.controller.js`: Quotation creation, line items, status management.
- `quotation.controller.js`: Quotation creation, line items, status management, and create-time pricing calculation (subtotal/VAT/total).
- `quotation.controller.js`: Quotation creation, line items, status management, separated pricing calculation (parts/labour/consumables/travel), service-call shortcut quote creation, server-side labour-rate protection for non-super users, function-based travel-cost calculation (`distanceTravelledKm × ratePerKm + timeTravelledCost`) with call-out floor condition support, first-site-visit included assessment logic, procurement/delivery profit capture, 14-day default validity fallback, PDF generation, quote delivery endpoints (optional Email/WhatsApp/Telegram), and auto-conversion of approved quotations into in-progress service jobcards.
- `invoice.controller.js`: Invoice generation from quotations, pro-forma workflow, payment tracking, PDF sharing, and public customer approval/rejection endpoints.
- `equipment.controller.js`: Equipment/asset CRUD.

### Server Routes (`server/routes/`)

- `auth.routes.js`: `/api/auth` — login, register, profile, password reset, passkey lifecycle endpoints, profile-link correction endpoints, and legal override audit query endpoint.
- `agent.routes.js`: `/api/agents` — agent endpoints.
- `customer.routes.js`: `/api/customers` — customer endpoints.
- `serviceCall.routes.js`: `/api/service-calls` — service call endpoints.
- `quotation.routes.js`: `/api/quotations` — quotation endpoints including PDF generation, send/distribution, and tokenized share access.
- `invoice.routes.js`: `/api/invoices` — invoice endpoints including pro-forma workflows, tokenized public PDF access, and public customer approval/rejection routes.
- `equipment.routes.js`: `/api/equipment` — equipment endpoints.
- `example.routes.js`: `/api/example` — example/template endpoints.

### Server Middleware (`server/middleware/`)

- `auth.middleware.js`: JWT verification (`protect` middleware) — applied to all private routes.
- `logger.middleware.js`: `logInfo`, `logError`, `logRequest` helpers used throughout controllers.

### Server Tests (`server/tests/`)

- `setup.js`: Test environment setup and MongoDB in-memory configuration.
- `unit/controllers/`: Unit tests for each controller.
- `unit/middleware/`: Middleware unit tests.
- `unit/models/`: Model schema and method tests.
- `unit/utils/`: Utility function tests.
- `postman/register_customers_collection.json`: Postman E2E collection for customer registration flow.
- `postman/POSTMAN_INSTRUCTIONS.md`: Step-by-step Postman execution guide for the registration suite.
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

```text
UI event → component state → api/axios.js → Express route
  → auth.middleware.js (JWT check)
  → controller (validation + business logic)
  → Mongoose model (schema + field protection)
  → MongoDB
```

### API Plumbing Standard (Contract + Flow)

All new APIs are now plumbed into the platform using a formal contract-and-flow model:

1. Add/update endpoint contracts in `schemas/domains/*.domain.json`
2. Reuse shared contracts from `schemas/shared/`
3. Wire and expose through `schemas/project.schema.json`
4. Reflect endpoint inventory in `API_COLLECTION.md`
5. Capture data/process logic in Mermaid flow docs under `docs/`

This standard keeps endpoint binding, integration tracking, and data flow reasoning consistent across the codebase as modules scale.

## ⚠️ Known Dev-Only Files (Remove Before Production)

- `refresh.sh` — dev convenience script to kill and restart all processes.
