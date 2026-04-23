# MVP Phase 8 - 12 Scenario Full-Cycle Cheat Sheet

Created: 2026-04-23
Source roadmap: MVP_ROADMAP.md

Purpose:
This sheet gives a strict 12-scenario execution plan that covers the remaining Phase 8 matrix gaps while you run multi-role testing in parallel browsers.

How to use this sheet:
1. Run each scenario end-to-end.
2. Mark PASS only when all full-cycle gates pass.
3. Capture evidence IDs or links for each gate.
4. Update matrix coverage trackers at the end.

Full-cycle gates (must pass for scenario PASS):
- Gate 1: Service Call created and assigned correctly
- Gate 2: Quote created and sent
- Gate 3: Customer decision captured (approve or reject path as planned)
- Gate 4: Work progresses to completion state
- Gate 5: Invoice/pro-forma created and shared
- Gate 6: Customer payment action captured
- Gate 7: Review/rating captured
- Gate 8: Super Admin views final state correctly

Evidence key template:
- SC = Service Call number
- QT = Quotation number
- INV = Invoice number
- PAY = Payment reference
- REV = Review reference or timestamp

## Scenario Plan (12)

| # | Service Category | Service Type | Customer Type | Agent Role Type | Planned Outcome | PASS/FAIL | Evidence (SC/QT/INV/PAY/REV) |
|---|---|---|---|---|---|---|---|
| 1 | Genset | Emergency Repair | Residential | Electrical only | Complete paid cycle |  |  |
| 2 | Genset | Installation | Single Business | Electronic only | Complete paid cycle |  |  |
| 3 | Electrical | Service Call | Head Office | Multi-skilled senior | Complete paid cycle |  |  |
| 4 | Mechanical | Maintenance | Branch | Electrical only | Complete paid cycle |  |  |
| 5 | Electronic | Fault Finding | Franchise | Electronic only | Complete paid cycle |  |  |
| 6 | Genset | Emergency Repair | Single Business | Multi-skilled senior | Complete paid cycle |  |  |
| 7 | Genset | Installation | Head Office | Electrical only | Complete paid cycle |  |  |
| 8 | Electrical | Service Call | Branch | Electronic only | Complete paid cycle |  |  |
| 9 | Mechanical | Maintenance | Franchise | Multi-skilled senior | Complete paid cycle |  |  |
|10 | Electronic | Fault Finding | Residential | Electrical only | Complete paid cycle |  |  |
|11 | Genset | Emergency Repair | Head Office | Electronic only | Complete paid cycle |  |  |
|12 | Electrical | Service Call | Single Business | Multi-skilled senior | Complete paid cycle |  |  |

## Per-Scenario Run Log

Use this block 12 times, once per scenario:

Scenario #: 
- Service setup: 
- Customer profile used: 
- Agent used: 
- Browser flow notes: 
- Gate 1 result: 
- Gate 2 result: 
- Gate 3 result: 
- Gate 4 result: 
- Gate 5 result: 
- Gate 6 result: 
- Gate 7 result: 
- Gate 8 result: 
- Final verdict (PASS/FAIL): 
- Defect IDs raised: 

## Phase 8 Coverage Tracker

Mark each item when covered by at least one PASS scenario.

Service type matrix (remaining 5):
- [ ] Genset - Emergency Repair
- [ ] Genset - Installation
- [ ] Electrical - Service Call
- [ ] Mechanical - Maintenance
- [ ] Electronic - Fault Finding

Customer type matrix (remaining 4):
- [ ] Single Business
- [ ] Head Office
- [ ] Branch
- [ ] Franchise

Agent role matrix (remaining 3):
- [ ] Electrical only
- [ ] Electronic only
- [ ] Multi-skilled senior

## Optional Bonus Closures (Phase 4/5)

If you validate these explicitly during runs, you can close additional gaps outside Phase 8:
- [ ] Workflow guard check: invalid state skip attempts blocked server-side
- [ ] Anti-self-approval check: field agent cannot self-approve own invoice in forbidden path
- [ ] Partial payment behavior validated and documented

## Quick Defect Severity Guide

- Sev 1: Data corruption, wrong customer billed, broken auth/role boundary
- Sev 2: Full-cycle blocker for one or more roles
- Sev 3: Incorrect UI state but recoverable workflow
- Sev 4: Cosmetic or wording issue

## Completion Rule

Phase 8 can be considered closed when:
1. All 12 scenarios are executed.
2. All three coverage trackers are fully checked.
3. Failed scenarios are rerun and pass, or documented as accepted risks with owner and target fix date.
