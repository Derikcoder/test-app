# Project Tracking System

Last updated: 2026-04-02

## Objective
Run fast, low-confusion delivery across parallel branches using one command center.

## Core Principle
Single source of truth for status, risk, and next action.

## Tracking Stack
1. Branch security and sync ledger: [BRANCH_SECURITY_TRACKER.md](BRANCH_SECURITY_TRACKER.md)
2. Agent operating model: [AGENT_OPERATING_MODEL.md](AGENT_OPERATING_MODEL.md)
3. Daily execution log: [END_OF_DAY_LOG.md](END_OF_DAY_LOG.md)
4. User-facing readiness and release notes: [README.md](README.md)

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
