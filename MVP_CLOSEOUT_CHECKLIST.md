# MVP Close-Out Checklist

Created: 2026-05-19
Purpose: Final execution checklist to move from active build into MVP release readiness.
Scope: SuperAdmin governance flows, Field Agent operations, Customer onboarding/self-service, Quote-to-Invoice lifecycle, UAT evidence, and deployment guardrails.

How to use:

1. Run sections in order.
2. Mark each item as complete only with objective evidence.
3. Capture defects immediately with severity and owner.
4. Do not promote to release if any P0/P1 blocker remains open.

Release decision rule:

- GO if all P0/P1 checks are green and P2/P3 items are accepted with owners and target dates.
- NO-GO if any auth, data integrity, payment, or role-boundary blocker fails.

## 1. Environment and Startup Baseline (P0)

- [ ] Backend starts cleanly (`server`) with MongoDB connection healthy.
- [ ] Frontend starts cleanly (`client`) with API connectivity confirmed.
- [ ] `NODE_ENV`, `CLIENT_URL`, `MONGODB_URI`, JWT secret, and CORS settings are correctly set for target environment.
- [ ] Health endpoint responds successfully.
- [ ] Logging paths are writable and errors are visible in expected logs.

Evidence:

- Startup timestamps
- Health endpoint response
- Screenshot/log snippet of connected DB and API readiness

## 2. Authentication and Onboarding Critical Path (P0)

### 2.1 SuperAdmin and Protected Routing

- [ ] Unauthenticated users are redirected from protected routes.
- [ ] SuperAdmin login works and role context renders correctly in key pages.
- [ ] Role boundary checks prevent unauthorized actions.

### 2.2 Field Agent Provisioning and Invite Flow

- [ ] Agent profile can be created without immediate login account.
- [ ] Profile page shows Invite Actions strip with linked-account state.
- [ ] If unlinked, Provision Login works directly from agent profile.
- [ ] Provision result returns and displays temporary secret access key.
- [ ] Open Login Screen shortcut pre-fills credentials correctly.
- [ ] Resend Invite works for linked accounts and returns refreshed temporary secret access key.
- [ ] Welcome email path works in current environment (real SMTP or Ethereal preview URL in dev).

### 2.3 Customer Provisioning and First Login

- [ ] Customer provisioning generates temporary secret access key.
- [ ] Customer receives onboarding path (login and reset option).
- [ ] Customer can first-login and then set permanent password.

### 2.4 Recovery Flows

- [ ] Forgot Password works for customer and field agent accounts.
- [ ] Reset link expiry and token validation behave correctly.
- [ ] Recovery does not expose account existence information beyond intended messaging.

Evidence:

- User IDs and linked profile IDs
- Invite/provision success responses
- Email preview links or delivery logs
- Successful login/reset screenshots

## 3. Data Integrity and Index Safety (P0)

- [ ] Multiple agent profiles with `userAccount = null` can be created without duplicate key errors.
- [ ] Unique link enforcement works when `userAccount` is present (no duplicate linkage).
- [ ] Existing and newly created agent/customer records preserve referential consistency.
- [ ] Startup index sync runs without destructive side effects.

Evidence:

- Create two unprovisioned agents successfully
- Attempt duplicate account link and confirm expected rejection
- Index names/state snapshot from DB tools

## 4. Role-Based Operational Flows (P1)

### 4.1 SuperAdmin Governance

- [ ] Can create/edit/delete agent and customer profiles per policy.
- [ ] Can provision and resend invites from relevant profile/list surfaces.
- [ ] Can view full transaction state across service calls, quotations, invoices.

### 4.2 Field Agent Workflow

- [ ] Field agent login lands on correct workspace.
- [ ] Agent can view assigned calls and status tabs.
- [ ] Agent can create quotation from service context.
- [ ] Agent can complete jobs and trigger invoice creation path where applicable.

### 4.3 Customer Workflow

- [ ] Customer can access portal sections (`/customer/:section`).
- [ ] Customer can view billing and pending approval/payment actions.
- [ ] Customer can approve/reject quotation/invoice as intended.

Evidence:

- One complete run per role with timestamped notes

## 5. Quote-to-Invoice Full Cycle (P1)

For at least 3 representative scenarios (different customer types and service categories):

- [ ] Service call created and assigned.
- [ ] Quotation created and sent.
- [ ] Customer decision captured.
- [ ] Work progresses to completion/in-progress terminal as expected.
- [ ] Invoice/pro-forma generated and shared.
- [ ] Payment action captured.
- [ ] Review/rating captured where required.
- [ ] SuperAdmin sees final reconciled state.

Evidence template:

- SC:
- QT:
- INV:
- PAY:
- REV:
- Scenario verdict (PASS/FAIL):

## 6. UAT Regression Pack (P1)

Use this as the minimum regression set before MVP sign-off:

- [ ] Field agent onboarding and invite resend
- [ ] Customer onboarding and temporary key login
- [ ] Protected route redirects and role-gated actions
- [ ] Service call lifecycle transitions
- [ ] Quotation approval and rejection paths
- [ ] Invoice/pro-forma approval and payment actions
- [ ] Receipt/proof-of-payment visibility
- [ ] Existing customer repeat booking path
- [ ] Grouped customer type behaviors (head office, branch, franchise, single business, residential)
- [ ] Error handling UX (failed provision, invalid token, missing linkage)

Evidence:

- Test run log with pass/fail per case and defect references

## 7. Security and Compliance Gate (P1)

- [ ] No secrets committed in repo files.
- [ ] JWT and auth middleware enforced on private endpoints.
- [ ] Immutable/write-once registration identifier policy still enforced.
- [ ] Audit logging for critical admin override/provision paths is operational.
- [ ] Public share links only expose intended scope and honor token validation.

Evidence:

- Config review checklist
- Endpoint spot checks

## 8. Build, Test, and Performance Gate (P2)

- [ ] Frontend production build passes.
- [ ] Backend targeted unit suites for auth/email pass.
- [ ] No new lint/type errors in changed files.
- [ ] Key screens load within acceptable UAT thresholds on target environment.

Suggested commands:

- `cd client && npm run build`
- `cd server && NODE_OPTIONS=--experimental-vm-modules npx jest tests/unit/controllers/customerOnboarding.auth.test.mjs tests/unit/utils/emailService.test.mjs`

Evidence:

- Build output summary
- Test output summary

## 9. Deployment Readiness (P1)

- [ ] Target URLs confirmed (frontend and backend).
- [ ] CORS origin exactly matches frontend domain.
- [ ] Production SMTP configured (if not using Ethereal).
- [ ] Monitoring and log access validated.
- [ ] Rollback plan documented (previous stable tag/commit + restore steps).

Evidence:

- Deployment config snapshot
- Smoke test results on remote environment

## 10. MVP Sign-Off Pack (P0)

- [ ] Release notes drafted (features, fixes, known limitations).
- [ ] Known issues list with severity and owners.
- [ ] Demo script prepared (10-15 minute narrative).
- [ ] Stakeholder sign-off recorded.
- [ ] Post-MVP backlog seeded from deferred items.

Sign-off block:

- Product Owner:
- Engineering Lead:
- QA/UAT Lead:
- Date:
- Final Decision: GO / NO-GO

## 11. Day-1 Post-Release Monitoring Plan (P1)

- [ ] Monitor login/provisioning failures hourly during first day.
- [ ] Monitor quotation/invoice endpoint errors.
- [ ] Monitor payment action failures and support tickets.
- [ ] Capture first 24-hour defect triage and hotfix priorities.

Success criteria (first 24h):

- No P0 incidents
- No auth lockout trend
- No data corruption events
- Critical business flow completion rate within expected range

## 12. Execution Log (Session Template)

Session date: 2026-05-19
Session owner: Derick
Environment: Local dev on Linux, React frontend + Express API + MongoDB

### Section 1 Run Log - Environment and Startup Baseline (P0)

- [ ] Backend starts cleanly with MongoDB healthy
  - Result: Pending re-run in this checklist pass
  - Evidence: Previous sessions connected successfully after Atlas recovery
  - Notes: Re-run startup and capture fresh logs for MVP evidence pack
- [ ] Frontend starts cleanly with API connectivity
  - Result: Pending re-run in this checklist pass
  - Evidence: UI operational during onboarding and agent-profile flow validation
  - Notes: Capture clean startup evidence in same timestamp window as backend
- [x] Environment variables confirmed
  - Result: Pass
  - Evidence: Session validated active env usage for MongoDB URI, CLIENT URL, and dev email fallback
  - Notes: Keep production SMTP and CORS values for release environment checklist
- [ ] Health endpoint successful
  - Result: Pending explicit hit in this run
  - Evidence: Not yet logged in this execution log block
  - Notes: Capture API health response payload and timestamp
- [ ] Logging visibility confirmed
  - Result: Pending explicit check in this run
  - Evidence: Auth and provisioning diagnostics were visible during session troubleshooting
  - Notes: Add one request log and one error-path log sample for completeness

Section 1 verdict: PASS / FAIL
Section 1 blockers: Need fresh startup + health endpoint evidence in one continuous run

### Section 2 Run Log - Authentication and Onboarding Critical Path (P0)

#### 2.1 SuperAdmin and Protected Routing

- [x] Protected-route redirect validated
  - Result: Pass
  - Evidence: Cleared `userInfo` in the login tab, then `https://localhost:3000/profile` redirected back to `https://localhost:3000/login`.
- [x] SuperAdmin login and role context validated
  - Result: Pass
  - Evidence: Profile-page role chips and governance mode were visible during live run
- [x] Role boundary checks validated
  - Result: Pass
  - Evidence: From the customer session, `https://localhost:3000/agents` redirected back to the customer workspace at `https://localhost:3000/customer/profile`, with no admin content exposed.

#### 2.2 Field Agent Provisioning and Invite Flow

- [x] Agent profile created with no linked login account
  - Result: Pass
  - Evidence: New second agent created while first agent remained unprovisioned; creation succeeded
- [x] Invite Actions strip shows linked-account state
  - Result: Pass
  - Evidence: Agent profile page showed Invite Actions with `Login account linked: Yes` and `Permanent password set: No`.
- [x] Provision Login from agent profile works
  - Result: Pass
  - Evidence: Agent record is now linked and provisioned (`Login account linked: Yes`), and first-login credential card is present on the profile flow.
- [x] Temporary secret access key displayed after provision
  - Result: Pass
  - Evidence: Agent profile displayed `Refreshed first-login credentials` and a temporary secret access key.
- [x] Open Login Screen shortcut prefill works
  - Result: Pass
  - Evidence: Immediate agent sign-in succeeded in runtime (`POST /api/auth/login` for `fsa-004@test.com` followed by `✅ User logged in successfully`).
- [x] Resend Invite returns refreshed temporary key
  - Result: Pass
  - Evidence: Runtime flow showed `Welcome email resent to fsa-004@test.com`, server log printed `Admin resent agent welcome email`, and updated credential card/temporary key rendered.
- [x] Email path validated (SMTP or Ethereal preview)
  - Result: Pass in dev path
  - Evidence: Ethereal preview-link behavior and send flow traced and confirmed in backend/tests

#### 2.3 Customer Provisioning and First Login

- [x] Customer provisioning returns temporary key
  - Result: Pass
  - Evidence: Provision response handling and customer modal display already in active flow
- [ ] Customer onboarding path validated
  - Result: Pending focused replay in this checklist pass
  - Evidence: Flow exists and was previously exercised, but not yet captured in this log section
- [ ] Customer first login and password update validated
  - Result: Pending focused replay in this checklist pass
  - Evidence: Not captured yet in this session log

#### 2.4 Recovery Flows

- [ ] Forgot Password validated for customer and field agent
  - Result: Pending explicit two-role test in this checklist pass
  - Evidence: Recovery endpoints are in place and previously reviewed
- [ ] Reset link token validity and expiry validated
  - Result: Pending
  - Evidence: Not executed in this log yet
- [ ] Recovery messaging leakage check passed
  - Result: Pending
  - Evidence: Not executed in this log yet

Section 2 verdict: PASS / FAIL
Section 2 blockers: Remaining runtime checks are in 2.3 (customer onboarding/first login) and 2.4 (recovery flows).

### Open Defects Raised in This Session

| Defect ID | Severity | Area | Description | Owner | Status |
|---|---|---|---|---|---|
| AGT-ONB-001 | Sev 2 | Agent onboarding UX | Provisioning and resend actions were not clearly available on Agent Profile page | Derick + Copilot | Fixed in code; pending final UI confirmation |

### Session Close Notes

- GO / NO-GO recommendation after Sections 1 and 2: Pending
- Required actions before next session: Complete Section 1 startup evidence and finish Section 2 runtime checks marked pending
- Next section to execute: Section 1 fresh startup run, then Section 2.2 end-to-end profile provisioning and resend checks
