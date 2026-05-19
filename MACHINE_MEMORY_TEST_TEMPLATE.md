# Machine Memory Validation Template

Purpose: Repeatable test template for validating machine selection, machine-linked service calls, service history memory, and quotation memory across different personas.

Use this template by copying one full run block per persona and scenario.

---

## Test Run Metadata

- Test Run ID:
- Date:
- Tester:
- Environment: Local / Dev / Staging
- Persona Under Test:
- Auth Role:
- Scenario Name:
- Scenario ID:
- Build/Commit (optional):

## Preconditions Checklist

- [ ] User can sign in for this persona.
- [ ] At least one customer exists for this persona flow.
- [ ] At least one machine exists in machine library (or scenario requires creating one).
- [ ] Service Calls page is accessible.
- [ ] Machine-related API routes are reachable.
- [ ] If assignment is part of scenario: target agent account is provisioned and password setup completed.

## Role-Scoped Index/Lookup Validation

Validate that the persona under test can only access machine records as allowed by their role. Run these checks for every persona:

### Agent (Field Service/Business Admin)

- [ ] Can only see machines where `createdBy` = their userId ("My Machines" view)
- [ ] Cannot access machines created by other agents (unless superAdmin)

### Customer

- [ ] Can only see machines where `customerId` = their customer id ("Machines at My Site" view)
- [ ] Cannot access machines at other customers/sites

### SuperAdmin

- [ ] Can see all machines in the system (no user/customer restriction)
- [ ] Can filter by agent, customer, or any indexed field
- [ ] Can audit for duplicates, orphaned records, and cross-agent activity
- [ ] Can run analytics on machine/service distribution, usage, and trends

Document actual/expected for each check below:

| Persona | Check | Expected | Actual | Status |
|---|---|---|---|---|
|Agent|My Machines only|Only own machines visible| |PASS/FAIL|
|Customer|My Site's Machines only|Only own site machines visible| |PASS/FAIL|
|SuperAdmin|All machines, all filters|Full system access, all filters| |PASS/FAIL|

---

## Test Data Snapshot (Before)

- Customer ID/Name:
- Machine ID/Label (if existing):
- Service Category:
- Service Type:
- Assigned Agent (if applicable):
- Known baseline: serviceCount / lastServicedAt / quotation baseline

---

## Core Flow A: Create/Select Machine in Booking

### Step A1: Open booking flow

- Action:
- Expected:
- Actual:
- Status: PASS / FAIL

### Step A2: Select existing machine from selector

- Action:
- Expected: Fields auto-fill from machine profile.
- Actual:
- Status: PASS / FAIL

### Step A3: Submit service call with machine selected

- Action:
- Expected: Service call created with machine linkage.
- Actual:
- Status: PASS / FAIL

### Step A4: Verify linkage persistence

- Action:
- Expected: Service call retains machine link on refresh/reopen.
- Actual:
- Status: PASS / FAIL

---

## Core Flow B: Service History Memory

### Step B1: Open machine history

- Action:
- Expected: New service appears in history list.
- Actual:
- Status: PASS / FAIL

### Step B2: Validate history details

- Action:
- Expected: Correct date, service type, notes, and linked service call.
- Actual:
- Status: PASS / FAIL

### Step B3: Validate aggregate updates

- Action:
- Expected: serviceCount and lastServicedAt updated correctly.
- Actual:
- Status: PASS / FAIL

---

## Core Flow C: Quotation/Component Memory

### Step C1: Create quote from linked service call

- Action:
- Expected: Quote form prefilled from machine/service context where applicable.
- Actual:
- Status: PASS / FAIL

### Step C2: Validate parts/components memory hints

- Action:
- Expected: Historical patterns or previous components are reusable/visible.
- Actual:
- Status: PASS / FAIL

### Step C3: Save and reopen quote context

- Action:
- Expected: Memory-derived fields remain consistent.
- Actual:
- Status: PASS / FAIL

---

## Assignment Recovery Flow (Optional)

Use when validating operational recovery.

### Step D1: Assign service call

- Action:
- Expected: Assignment succeeds for ready agent account.
- Actual:
- Status: PASS / FAIL

### Step D2: Unassign service call

- Action:
- Expected: Assignment cleared, call returns to pending assignment state.
- Actual:
- Status: PASS / FAIL

### Step D3: Reassign same agent

- Action:
- Expected: Reassignment succeeds and appears in assigned queues.
- Actual:
- Status: PASS / FAIL

### Step D4: Reassign different agent

- Action:
- Expected: Agent swap succeeds and new agent sees assignment.
- Actual:
- Status: PASS / FAIL

---

## Negative/Guardrail Cases

- [ ] Attempt assignment to non-ready agent account -> blocked with actionable message.
- [ ] Submit booking without required machine/equipment fields (when required) -> validation blocks.
- [ ] Reload after each major step -> data remains consistent.
- [ ] Persona cannot access unauthorized data/routes.

## API/DB Verification Notes (Optional)

- Service call ID(s):
- machineId present in payload/record: Yes / No
- Machine history entry created: Yes / No
- Assignment metadata correct (assignedDate, agentAccepted, status): Yes / No

---

## Outcome Summary

- Overall Result: PASS / FAIL / PASS WITH NOTES
- Blocking Issues:
- Non-Blocking Issues:
- Workarounds Used:
- Retest Needed: Yes / No

## Case-Specific Update Log

Record scenario-specific findings and what changed in the app/process.

|Date|Persona|Scenario ID|Change/Observation|Type (Bug/Fix/Process)|Action Owner|Status|
|---|---|---|---|---|---|---|
|YYYY-MM-DD|Example Persona|MM-001|Example note|Process|Name|Open|

## Regression Carry-Forward Checklist

- [ ] Add this scenario to the recurring regression pack.
- [ ] If process rule changed, update operation notes.
- [ ] If behavior changed, update relevant test cases/docs.
- [ ] If fix was applied, link PR/commit or file references.

---

## Authoritative Value Coverage Matrix

Purpose: Track 100 percent value-level coverage for all currently definable machine-booking and assignment logic values.

Rule of completion: A value is covered only when at least one linked scenario ID is executed and PASS.

### A. Service Category and Type Values

|Value Group|Value|Scenario IDs|Covered (Yes/No)|
|---|---|---|---|
|serviceCategory|generator-backup-power|MMV-001, MMV-002, MMV-003||
|serviceCategory|plumbing|MMV-004, MMV-005||
|serviceCategory|electrical|MMV-006, MMV-007||
|serviceCategory|general-maintenance|MMV-008, MMV-009||
|generator type|Preventive Maintenance|MMV-001||
|generator type|Emergency Repair|MMV-002||
|generator type|Load Bank Testing|MMV-003||
|generator type|Fuel System Service|MMV-010||
|plumbing type|Drain Unblocking|MMV-004||
|plumbing type|Leak Detection & Repair|MMV-011||
|plumbing type|Pipe Installation / Replacement|MMV-012||
|plumbing type|Water Pump Service|MMV-005||
|plumbing type|Electric Water Heater Service|MMV-013||
|electrical type|Electrical Fault Finding|MMV-006||
|electrical type|DB Board Maintenance|MMV-014||
|electrical type|Pump Control Panel Service|MMV-007||
|general-maintenance type|Inspection & Assessment|MMV-008||
|general-maintenance type|Corrective Maintenance|MMV-009||

### B. Customer Structure Values

|Value Group|Value|Scenario IDs|Covered (Yes/No)|
|---|---|---|---|
|customerType|business|MMV-001, MMV-004, MMV-006||
|customerType|private|MMV-002, MMV-005||
|businessStructure|single|MMV-001, MMV-011||
|businessStructure|group|MMV-003, MMV-012||
|businessRole (group)|headOffice|MMV-003||
|businessRole (group)|branch/franchise|MMV-012||
|branch head office link|selectedHeadOfficeId present|MMV-012||

### C. Scheduling and Priority Values

|Value Group|Value|Scenario IDs|Covered (Yes/No)|
|---|---|---|---|
|urgency|low|MMV-001||
|urgency|medium|MMV-004||
|urgency|high|MMV-006||
|urgency|urgent|MMV-002||
|preferredTimeWindow|06:00 - 10:00|MMV-001||
|preferredTimeWindow|08:00 - 12:00|MMV-002||
|preferredTimeWindow|12:00 - 16:00|MMV-004||
|preferredTimeWindow|16:00 - 20:00|MMV-006||
|preferredTimeWindow|20:00 - 23:00|MMV-008||

### D. Service History and Outage Values

|Value Group|Value|Scenario IDs|Covered (Yes/No)|
|---|---|---|---|
|serviceHistoryType|first-service-call|MMV-001, MMV-004||
|serviceHistoryType|existing-customer|MMV-003, MMV-006||
|outageWindowApplicable (generator only)|no|MMV-001||
|outageWindowApplicable (generator only)|yes with valid start/end|MMV-002||
|outage validation|end before/equal start blocked|MMV-015||

### E. Machine Selection and Location Values

|Value Group|Value|Scenario IDs|Covered (Yes/No)|
|---|---|---|---|
|machine selection mode|existing machine selected|MMV-001, MMV-006||
|machine selection mode|no machine selected (manual fields)|MMV-004, MMV-008||
|machine selector filter|category-filtered list behavior|MMV-016||
|location flag|machineLocationSameAsAdmin = yes|MMV-001||
|location flag|machineLocationSameAsAdmin = no|MMV-005||
|required equipment fields path|requiresEquipmentDetails = true|MMV-001, MMV-005||
|non-equipment path|requiresEquipmentDetails = false|MMV-004, MMV-008||

### F. General Maintenance Task Values

|Value Group|Value|Scenario IDs|Covered (Yes/No)|
|---|---|---|---|
|task option|Fixtures|MMV-008||
|task option|Doors|MMV-017||
|task option|Minor Repairs|MMV-018||
|task option|Basic Installations|MMV-019||
|task option|Painting|MMV-020||
|task option|Tiling|MMV-021||
|task option|Window Replacement|MMV-022||
|task selection logic|multiple tasks selected|MMV-023||
|task validation|none selected blocked|MMV-024||

### G. Assignment and Recovery Values

|Value Group|Value|Scenario IDs|Covered (Yes/No)|
|---|---|---|---|
|assignment|assign to ready agent|MMV-025||
|assignment|blocked: account not provisioned|MMV-026||
|assignment|blocked: password setup incomplete|MMV-027||
|recovery|unassign call|MMV-028||
|recovery|reassign same agent|MMV-029||
|recovery|reassign different agent|MMV-030||

### H. Portal Booking Mode Values

|Value Group|Value|Scenario IDs|Covered (Yes/No)|
|---|---|---|---|
|portalBookingMode|repeat|MMV-031||
|portalBookingMode|new|MMV-032||
|grouped portal mapping|headOffice|MMV-033||
|grouped portal mapping|branch|MMV-034||
|grouped portal mapping|franchise|MMV-035||
|grouped portal mapping|singleBusiness|MMV-036||
|grouped portal mapping|residential|MMV-037||

---

## Scenario Catalog (Execution Order)

Use this as your deterministic run list. Mark PASS/FAIL and link evidence.

|Scenario ID|Focus|Persona|Result|Evidence|
|---|---|---|---|---|
|MMV-001|Generator preventive, machine selected, low urgency|Business Admin|||
|MMV-002|Generator emergency with outage window yes, urgent|Business Admin|||
|MMV-003|Generator load bank, existing customer, group HO|Business Admin|||
|MMV-004|Plumbing drain unblock, no equipment details|Business Admin|||
|MMV-005|Plumbing water pump, machine location different|Business Admin|||
|MMV-006|Electrical fault finding, machine selected|Business Admin|||
|MMV-007|Electrical pump control panel service|Business Admin|||
|MMV-008|General maintenance inspection, single task|Business Admin|||
|MMV-009|General maintenance corrective maintenance|Business Admin|||
|MMV-010|Generator fuel system service|Business Admin|||
|MMV-011|Plumbing leak detection|Business Admin|||
|MMV-012|Plumbing pipe replacement, grouped branch + HO link|Business Admin|||
|MMV-013|Plumbing electric water heater service|Business Admin|||
|MMV-014|Electrical DB board maintenance|Business Admin|||
|MMV-015|Outage invalid datetime validation (negative)|Business Admin|||
|MMV-016|Selector list category filter integrity|Field Service Agent|||
|MMV-017|General maintenance task: Doors|Business Admin|||
|MMV-018|General maintenance task: Minor Repairs|Business Admin|||
|MMV-019|General maintenance task: Basic Installations|Business Admin|||
|MMV-020|General maintenance task: Painting|Business Admin|||
|MMV-021|General maintenance task: Tiling|Business Admin|||
|MMV-022|General maintenance task: Window Replacement|Business Admin|||
|MMV-023|General maintenance multi-select tasks|Business Admin|||
|MMV-024|General maintenance none-selected validation (negative)|Business Admin|||
|MMV-025|Assign to ready agent|Business Admin|||
|MMV-026|Assignment blocked: unprovisioned agent|Business Admin|||
|MMV-027|Assignment blocked: password setup incomplete|Business Admin|||
|MMV-028|Unassign call|Business Admin|||
|MMV-029|Reassign same agent|Business Admin|||
|MMV-030|Reassign different agent|Business Admin|||
|MMV-031|Portal booking repeat mode|Customer|||
|MMV-032|Portal booking new mode|Customer|||
|MMV-033|Portal grouped mapping: headOffice|Customer|||
|MMV-034|Portal grouped mapping: branch|Customer|||
|MMV-035|Portal grouped mapping: franchise|Customer|||
|MMV-036|Portal grouped mapping: singleBusiness|Customer|||
|MMV-037|Portal grouped mapping: residential|Customer|||

### Completion Gate

- [ ] Every row in all value coverage tables has Covered = Yes.
- [ ] Every Scenario Catalog row has Result = PASS, or has defect ID and rerun outcome recorded.
- [ ] No critical or high defects remain open for machine-memory logic.

---

## Team and Sub-Agent Execution Plan

Use this section to assign real people/accounts to execution tracks. Replace placeholder names once before starting the cycle.

### Team Roster (Prefilled Template)

|Sub-Agent ID|Team Role|Primary Persona Access|Assigned Tester (Default)|Backup Tester (Default)|
|---|---|---|---|---|
|SA-01|Core Booking Validator|Business Admin|QA Lead - Booking|QA Analyst 1|
|SA-02|Equipment and Location Validator|Business Admin + Field Service Agent|QA Analyst 1|QA Analyst 2|
|SA-03|Assignment Workflow Validator|Business Admin + Field Service Agent|QA Analyst 2|QA Lead - Booking|
|SA-04|Portal Mapping Validator|Customer + Business Admin|QA Analyst 3|QA Analyst 1|
|SA-05|Negative and Guardrail Validator|Business Admin + Customer|QA Lead - Quality Gate|QA Analyst 3|

Replace the default tester labels with real names once, then keep this mapping fixed for the full cycle.

### Parallel Execution Waves

Run each wave in parallel. Do not move to next wave until all blocking defects from current wave are triaged.

|Wave|Sub-Agent|Scenario IDs|Goal|Status|
|---|---|---|---|---|
|W1|SA-01|MMV-001, MMV-002, MMV-003, MMV-010|Generator category and outage/value logic baseline|Not Started|
|W1|SA-02|MMV-004, MMV-005, MMV-006, MMV-007|Cross-category equipment/location branching|Not Started|
|W1|SA-05|MMV-015, MMV-024|Critical negative validations|Not Started|
|W2|SA-01|MMV-011, MMV-012, MMV-013, MMV-014|Remaining plumbing/electrical type coverage|Not Started|
|W2|SA-02|MMV-008, MMV-009, MMV-017, MMV-018, MMV-019, MMV-020, MMV-021, MMV-022, MMV-023|General maintenance task value completion|Not Started|
|W2|SA-03|MMV-025, MMV-026, MMV-027|Assignment readiness and block logic|Not Started|
|W3|SA-03|MMV-028, MMV-029, MMV-030|Unassign/reassign recovery workflow|Not Started|
|W3|SA-04|MMV-031, MMV-032, MMV-033, MMV-034, MMV-035, MMV-036, MMV-037|Portal mode and grouped mapping coverage|Not Started|
|W3|SA-05|MMV-016|Machine selector filtering and edge checks|Not Started|

### Handoff and Evidence Rules

- [ ] Every scenario run must include evidence references in Scenario Catalog.
- [ ] Any FAIL must include defect ID before handoff to next wave.
- [ ] Any blocked scenario must be reassigned to backup tester within same wave.
- [ ] SA-05 validates closure quality before marking a wave complete.

### Daily Standup Snapshot

Fill once per test day:

- Date:
- Completed Scenario IDs:
- Failed Scenario IDs:
- Blocked Scenario IDs:
- New Defect IDs:
- Retest Queue for Next Day:

### Recommended 3-Day Execution Schedule

Use this default schedule unless resource constraints require adjustment.

|Day|Primary Objective|Sub-Agents Active|Scenario Scope|Exit Criteria|
|---|---|---|---|---|
|Day 1|Baseline functional coverage|SA-01, SA-02, SA-05|W1 full scope + start W2 criticals (MMV-025 to MMV-027)|All W1 scenarios executed; Sev 1/2 defects triaged same day|
|Day 2|Value completion and assignment hardening|SA-01, SA-02, SA-03|Finish W2 full scope + W3 assignment recovery (MMV-028 to MMV-030)|All value rows A through G have at least one PASS scenario|
|Day 3|Portal mapping and closure gate|SA-03, SA-04, SA-05|Finish W3 portal scope + retests for all failed scenarios|All completion gate checkboxes met; no open critical/high defects|

### Suggested Daily Cadence

- 09:00 to 09:20: Standup and scenario handoff confirmation.
- 09:20 to 12:30: Primary execution block.
- 13:30 to 16:00: Retests and defect reproduction.
- 16:00 to 16:30: Evidence cleanup and status updates in Scenario Catalog.
- 16:30 to 17:00: Go/No-Go check for next day wave.

---

## Copy Block for Next Persona Run

Duplicate from "Test Run Metadata" through "Regression Carry-Forward Checklist" for each persona and scenario.
