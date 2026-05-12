# Test Strategy Debug Checklist (Power-Cut Safe)

Purpose: Track progress step-by-step so recovery is easy after interruptions.

## Session Header

- [x] Date/time updated for this work session
- [x] Branch confirmed: `feature/group-branch-support-service-calls`
- [x] Last known failing test count recorded
- [x] Last known passing test count recorded

Notes:
- Last command run: `node --experimental-vm-modules ./node_modules/.bin/jest --detectOpenHandles --json --outputFile=jest.output.json .`
- Current blocker: None (all suites passing)
- Next immediate action: Keep Phase 6 scripts as standard recovery workflow after interruptions

Current counts from latest JSON run:
- Failed suites: 0
- Passed suites: 25
- Failed tests: 0
- Passed tests: 42
- Total suites: 25
- Total tests: 42

---

## Phase 1 - Reliable JSON Test Output

- [x] Run Jest directly from `server` with JSON output:
  - `cd server && node --experimental-vm-modules ./node_modules/.bin/jest --detectOpenHandles --json --outputFile=jest.output.json`
- [x] Confirm `server/jest.output.json` is valid JSON (not placeholder text)
- [x] Confirm file timestamp updates on each test run

---

## Phase 2 - Remove Hard Suite Blockers

- [x] Replace placeholder test file content in `server/tests/unit/middleware/auth.middleware.test.mjs`
- [x] Replace placeholder test file content in `server/tests/unit/models/User.model.test.mjs`
- [x] Replace placeholder test file content in `server/tests/unit/routes/invoice.routes.test.mjs`
- [x] Replace placeholder test file content in `server/tests/unit/services/quotationAutoResolver.service.test.mjs`
- [x] Re-run tests and confirm no "must contain at least one test" failures

---

## Phase 3 - Fix Import/Path Drift (ESM Migration)

- [x] Replace stale `Agent.model.js` references with `FieldServiceAgent.model.js` where applicable
- [x] Fix tests importing controllers that do not exist anymore
- [x] Fix symbol export mismatches (example: `login` vs `loginUser`)
- [x] Re-run tests and confirm module resolution errors are reduced/eliminated

---

## Phase 4 - Align Tests With Current Controller Behavior

- [x] Update `findById` expectations where controllers now use `findOne` with access filters
- [x] Fix mock chains for `.populate()` and query flow used by current controllers
- [x] Update response assertions to match current payload contracts
- [x] Re-run tests and record remaining failures

---

## Phase 5 - Fix Test Input/Contract Mismatches

- [x] Fix invalid function call signatures in tests (example: `sendQuotationEmail` payload)
- [x] Ensure mocked `req.user` data matches controller role/ownership requirements
- [x] Ensure test factories produce fields required by updated controller logic
- [x] Re-run tests and verify failing tests are real logic issues, not setup issues

---

## Phase 6 - Stabilize Workflow

- [x] Add npm script for JSON server test run
- [x] Add npm script for targeted/debug test runs
- [x] Document "how to resume after interruption" in this file
- [x] Keep a short changelog of each debug session below

---

## Resume Procedure (After Interruption)

1. Open this file.
2. Find the first unchecked item.
3. Run one test command and update notes.
4. Continue from that exact checkbox.

---

## Session Changelog

### Entry Template
- Date/time:
- Completed checkboxes:
- New failures found:
- Fixed failures:
- Next checkbox:

### 2026-05-12 (Initial)
- Date/time: 2026-05-12
- Completed checkboxes: Created tracking checklist
- New failures found: N/A
- Fixed failures: N/A
- Next checkbox: Phase 1, first item

### 2026-05-12 (Phase 1 Complete)
- Date/time: 2026-05-12 11:41 (local)
- Completed checkboxes: Session header + all Phase 1 items
- New failures found: 21 failed suites, 12 failed tests
- Fixed failures: Reliable Jest JSON output path verified and working
- Next checkbox: Phase 2, first placeholder test file

### 2026-05-12 (Phase 2 Complete)
- Date/time: 2026-05-12
- Completed checkboxes: All Phase 2 items
- New failures found: Remaining failures now concentrated in import/path/symbol and assertion drift categories
- Fixed failures: Empty-suite blockers removed (no remaining "must contain at least one test" failures)
- Next checkbox: Phase 3, first import/path drift item

### 2026-05-12 (Phases 3-5 Complete)
- Date/time: 2026-05-12
- Completed checkboxes: All Phase 3, Phase 4, and Phase 5 items
- New failures found: Progressively reduced from 17 failed suites to 2, then to 0
- Fixed failures: Import/path/symbol drift, query/assertion drift, and test input contract mismatches
- Next checkbox: Phase 6 changelog upkeep only

### 2026-05-12 (Passing Baseline)
- Date/time: 2026-05-12
- Completed checkboxes: Added `test:server:json` and `test:server:debug` scripts
- New failures found: None
- Fixed failures: Final 2 failing suites resolved
- Next checkbox: Continue development using passing baseline and update changelog per session

### 2026-05-12 (Smoke Cleanup Pass)
- Date/time: 2026-05-12
- Completed checkboxes: Replaced temporary smoke tests with behavior-focused tests for model metadata, invoice routes, quotation auto resolver, and root user model behavior
- New failures found: 1 transient invoice model assertion mismatch (fixed)
- Fixed failures: Suite restored to green with improved coverage quality
- Next checkbox: Keep TODO tests aligned with controller creation for `email.controller`, `user.controller`, and `customerOnboarding.auth.controller`

Latest baseline after cleanup:
- Failed suites: 0
- Passed suites: 25
- Failed tests: 0
- Passed tests: 42
- Todo tests: 6
