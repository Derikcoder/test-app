# Project Tracking System

Last updated: 2026-04-03

## Objective
Run fast, low-confusion delivery across parallel branches using one command center.

## Core Principle
Single source of truth for status, risk, and next action.

## Project Tracker Agent Runbook
Primary agent spec: `.github/project-tracker.agent.md`

Daily execution protocol:
1. Read active sprint tasks and branch risk state.
2. Refresh the checkbox board below.
3. Mark items complete only with evidence.
4. Reorder backlog using risk-first sequence.
5. Write end-of-day continuity log.

## Tracking Stack
1. Branch security and sync ledger: [BRANCH_SECURITY_TRACKER.md](BRANCH_SECURITY_TRACKER.md)
2. Agent operating model: [AGENT_OPERATING_MODEL.md](AGENT_OPERATING_MODEL.md)
3. Daily execution log: [END_OF_DAY_LOG.md](END_OF_DAY_LOG.md)
4. User-facing readiness and release notes: [README.md](README.md)
5. Crash continuity state: [continuity/CURRENT_STATUS.md](continuity/CURRENT_STATUS.md)
6. Checkpoint timeline: [continuity/SESSION_HISTORY.md](continuity/SESSION_HISTORY.md)

## Crash Recovery Protocol

Purpose: prevent context loss when editor/session crashes during in-progress edits.

Run these commands from the project root:
1. `npm run checkpoint -- "What changed" "Next action"`
2. `npm run checkpoint:recover`

What the checkpoint command captures:
1. Full git status and short status snapshot
2. Unstaged diff patch
3. Staged diff patch
4. Untracked file list
5. Machine-readable summary with branch, commit, note, and next action

Artifacts written per snapshot:
1. `continuity/checkpoints/<timestamp-branch>/summary.md`
2. `continuity/checkpoints/<timestamp-branch>/unstaged.diff`
3. `continuity/checkpoints/<timestamp-branch>/staged.diff`
4. `continuity/checkpoints/<timestamp-branch>/git-status.txt`
5. `continuity/checkpoints/<timestamp-branch>/untracked-files.txt`

Live session context files:
1. `continuity/CURRENT_STATUS.md` (single source of current task and next action)
2. `continuity/SESSION_HISTORY.md` (chronological checkpoint ledger)

Minimum operating rule while actively coding:
1. Create a checkpoint before editing a risky file.
2. Create a checkpoint after every meaningful milestone.
3. Create a final checkpoint before switching branches or stopping work.

## Command Center Views

### View A: Work Queue
Use this order when selecting next branch:
1. Security-risk branches with drift from main
2. Active feature branches with customer-facing value
3. Behind-only branches (sync or archive)

### View B: Risk Dashboard
Track these at all times:
1. Secret exposure risk
2. Branch drift from main
3. Test/build health
4. Deployment readiness

### View C: Release Readiness
Definition of done before remote tester rollout:
1. Main builds clean
2. Priority branch merges complete
3. Security tracker updated
4. Deployment checks complete

## Weekly Operating Rhythm

### Daily (10-20 min)
1. Refresh branch inventory
2. Update queue in [BRANCH_SECURITY_TRACKER.md](BRANCH_SECURITY_TRACKER.md)
3. Execute next branch action
4. Log outcomes in [END_OF_DAY_LOG.md](END_OF_DAY_LOG.md)

### Twice Weekly
1. Dependency/security review
2. Branch cleanup: archive stale worktree branches
3. Update remediation queue

### Weekly Review
1. Review velocity and blockers
2. Confirm top 3 goals for next week
3. Rebalance agent assignments if bottlenecks exist

## Work Item Contract (State-of-the-Art Lightweight)
For every significant task, capture:
1. Context: why now
2. Scope: exact files/areas
3. Risks: security/data/rollback
4. Acceptance criteria: observable pass conditions
5. Evidence: test/build/log outputs

## Metrics
1. Branch drift median (behind count)
2. Open high-risk branch count
3. Mean time to sync branch with main
4. Build pass rate on active branches
5. Number of stale branches archived per sprint

## Escalation Rules
1. If merge conflict touches security-sensitive files, resolve security first.
2. If branch is older than 30 days and not active, archive candidate.
3. If security scan flags possible secret, freeze merge and investigate.

## Continuous Improvement
1. Keep templates short and reusable.
2. Prefer checklists over long prose for repeat operations.
3. Update this system only when it improves speed or clarity.

## Current Week Execution Board

### Lane: Local-First Stability
- [x] Enforce null-user auth guard across protected flows
- [ ] Add local-first runtime mode logging in DB bootstrap
- [ ] Confirm fallback behavior does not crash protected controllers

### Lane: Data Seeding And Readiness
- [ ] Implement local seed script for baseline users and sample records
- [ ] Validate login flow for each required role against local DB
- [ ] Validate agents/customers/service-calls/quotations fetch successfully in local mode

### Lane: Mirror Preparation
- [ ] Define event envelope shape and idempotency key format
- [ ] Identify first 3 mutation paths for event emission
- [ ] Define retry/backoff/dead-letter rules for outbound sync

### Lane: Integration And Safety
- [ ] Run regression matrix for offline and recovery scenarios
- [ ] Capture evidence links (tests/logs/files) for each completed task
- [ ] Update end-of-day log with next-session starter tasks

## Latest Project Tracker Run
Date: 2026-04-03
Run type: Dry run verification of tracker agent workflow

Completed Today:
1. Enforced null-user auth guard across protected flows

In Progress:
1. Local-first runtime mode logging in DB bootstrap
2. Fallback controller crash regression confirmation

Blocked:
1. Atlas reachability is unstable from hotspot, so mirror/Atlas validation is deferred

Evidence:
1. Auth guard for missing principal is present in [server/middleware/auth.middleware.js](server/middleware/auth.middleware.js#L58)
2. Role middleware secondary guard is present in [server/middleware/auth.middleware.js](server/middleware/auth.middleware.js#L85)
3. DB bootstrap currently falls back to local but does not emit explicit runtime mode state in [server/config/db.js](server/config/db.js#L41)
4. Controller scan confirms wide reliance on req.user._id, validating why middleware guard is mandatory (captured in terminal scan output during this tracker run)

Next 3 Actions (Dependency Order):
1. Add explicit runtime mode logging in [server/config/db.js](server/config/db.js)
2. Run fallback regression matrix and capture outcomes in [END_OF_DAY_LOG.md](END_OF_DAY_LOG.md)
3. Implement local seed script and script entry in [server/package.json](server/package.json)
