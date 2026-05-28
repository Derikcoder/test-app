# Code Clean and DRY Audit

Date: 2026-05-27
Scope: client/src and server source files
Coverage: 140 code files (.js, .jsx, .mjs)

## Audit method

1. Naming convention scan of source file names.
2. Lint readiness check.
3. Duplicate block scan with jscpd.
4. Targeted hotspot inspection for large repeated UI and controller patterns.

## Key findings (ordered by impact)

### 1) High: very high code duplication in production code

- Production-focused duplication scan (excluding tests and backup files):
  - Files analyzed: 76
  - Duplicated lines: 3831 (14.09%)
  - Clones found: 58

Primary duplication hotspot cluster:

- Customer-type profile components are heavily duplicated:
  - client/src/components/SingleBusinessCustomer.jsx
  - client/src/components/HeadOfficeCustomer.jsx
  - client/src/components/BranchCustomer.jsx
  - client/src/components/FranchiseCustomer.jsx
  - client/src/components/ResidentialCustomer.jsx
- Combined size of the above files: 2717 lines.

Observed repeated handler patterns across these files include:
- handleAcceptQuot
- handleRejectQuot

Risk:
- Bugs and business rule updates must be applied in multiple places.
- Higher chance of behavioral drift between customer types.

### 2) High: lint gate is currently broken

- client/.eslintrc.cjs uses ESM export syntax:
  - export default { ... }
- Running client lint fails because .cjs expects CommonJS module syntax.

Impact:
- Automated consistency checks are blocked.
- Prevents reliable quality gating in local and CI workflows.

### 3) Medium: naming consistency has legacy outliers

Source naming is mostly consistent (PascalCase component names), but these legacy/backup files are still in active source folder:

- client/src/components/UserProfile_old.jsx
- client/src/components/UserProfile_backup2.jsx

Risk:
- Ambiguity for maintainers.
- Increases accidental import risk and scan noise.

### 4) Medium: duplicated domain constants between client and server

- client/src/constants/agentTaxonomy.js
- server/config/agentTaxonomy.js

These files are near-identical and can drift if updated separately.

Risk:
- Validation mismatch between frontend and backend.
- Runtime and UX inconsistencies for categories/skills.

### 5) Medium: repeated patterns inside controllers and models

jscpd also flagged notable duplication in:

- server/controllers/customer.controller.js
- server/controllers/agent.controller.js
- server/models/Quotation.model.js and server/models/Invoice.model.js

Risk:
- Policy changes and formula fixes may not be synchronized.

## Recommended cleanup sequence

### Phase A: Unblock quality gates (quick)

1. Fix client ESLint config format/extension mismatch.
2. Run lint successfully and capture baseline warnings/errors.

### Phase B: Remove low-risk clutter (quick)

1. Archive or remove legacy backup components from main source path:
   - UserProfile_old.jsx
   - UserProfile_backup2.jsx
2. Add ignore rules for backup naming patterns if needed.

### Phase C: DRY refactor (high value)

1. Create a shared customer profile shell and shared hooks/utilities for:
   - data fetching
   - quotation actions
   - common sections and cards
2. Keep only customer-type-specific deltas in each variant file.
3. Extract duplicated approval page logic into shared utilities/components:
   - InvoiceApprovalPage.jsx
   - QuotationApprovalPage.jsx
4. Extract shared server domain utilities for duplicated model/controller logic.

### Phase D: Single source of truth for taxonomy

1. Move taxonomy to one canonical schema source (shared package or generated artifact).
2. Import in both client and server.

## Success criteria

- Client lint runs successfully.
- Production duplication reduced from 14.09% to below 8%.
- Customer-type component cluster reduced by at least 35% lines.
- Zero legacy backup files under client/src/components.
- Frontend and backend taxonomy sourced from one shared definition.

## Commands used

- npm run lint (client)
- npx -y jscpd --min-lines 8 --min-tokens 70 --reporters console client/src server
- npx -y jscpd --min-lines 8 --min-tokens 70 --reporters console --format javascript,jsx --ignore "**/*.test.*,**/*_old.*,**/*_backup*" client/src/components server/controllers server/models server/config
- source file name and pattern scans with rg
