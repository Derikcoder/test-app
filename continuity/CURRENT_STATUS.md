# Current Session Status

Last updated: 2026-04-13 ~13:45 SAST

## Active Task
MVP Phase 04 — Customer Portal: Quote-to-In-Progress cycle

## Next Action
Run the first live SuperAdmin prospect-intake walkthrough using the new prospect-first policy.
After that, continue with customer self-profile routing (`GET /api/customers/me` + `CustomerSelfProfile.jsx`).

## Working Branch
main (Session 27 feature branch merged — working on main or new branch per task)

## Last Commit
34ce6ca — Merge feature/field-agent-profile-ui → main (255/255 tests pass)

## Latest Checkpoint
20260408-135848-main

## Modified Files (short status)
- Prospect-first conversion changes are currently uncommitted:
	- `server/controllers/serviceCall.controller.js`
	- `server/controllers/quotation.controller.js`
	- `server/models/Quotation.model.js`
	- `server/tests/unit/controllers/serviceCall.controller.test.js`
	- `server/tests/unit/controllers/quotation.controller.test.js`
	- `AI_ASSISTANT_GUIDE.md`
	- `README.md`
	- `PROJECT-STRUCTURE.md`
	- `install-mongodb.sh`

## DB State
- `test-app` database: ACTIVE — SuperAdmin + mechagent001_test user accounts exist
- `test-app-test` database: DROPPED (will rebuild on next `npm test`)

## UAT Credential Store
- Location: `server/.env` → section "App Test Accounts Secrets"
- SuperAdmin: `jj@wolmaranskontrakdienste.co.za` — active login confirmed
- Agent: `mechagent001_test` (userName) / `privtfa1@wolmaranskontrakdienste.co.za` — active login confirmed
- Customer (private): `privcusttest@wolmaranskontrakdienste.co.za` / `TESTADMIN` — not yet provisioned

## UAT Progress
- [x] UAT-0: Agent onboarding via email invite → set-password → login ✅
- [ ] UAT-1: Agent first-login flow + profile view
- [ ] UAT-2: Service call creation by agent
- [ ] UAT-3: Quotation creation by admin
- [ ] UAT-4: Customer portal — quote approval

## Policy Update
- Prospect-first conversion is now active: booking-request service calls and sent quotations do not create `Customer` or `User` records.
- The first real `Customer` + customer portal `User` is created only when the public quote acceptance endpoint succeeds.

## Recovery Path
- continuity/checkpoints/20260408-135848-main/summary.md
