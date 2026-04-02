# Cleanup Sequence And Agent Delegation Plan

Last updated: 2026-04-02

## Objective
Complete post-remediation cleanup safely while preserving active feature work.

## Current Constraints
1. Do not sync `feature/customer-management` yet (active improvement branch).
2. Keep the app running for onboarding testing.
3. Archive stale worktree branches only when clean.

## Order Of Operations

### Phase 1: Preserve And Archive Stale Worktree Branches
1. Create archive snapshot tags for clean stale branches.
2. Remove clean stale worktrees.
3. Rename archived branches under `archived/*` namespace.
4. Leave dirty stale branch untouched and log blocker.

### Phase 2: Sync Behind-Only Branches
1. Fast-forward behind-only branches with `--ff-only`.
2. Push branches that exist on origin.
3. Record branches that are local-only.

### Phase 3: Blocked Branch Handling
1. Keep `feature/customer-management` unsynced until product decision.
2. Keep `copilot-worktree-2026-03-18T16-36-16` untouched because of uncommitted changes.
3. Revisit after onboarding test decision.

### Phase 4: Closeout
1. Update branch tracker with completed/blocked states.
2. Confirm next queue is either:
   - active feature branch reconciliation, or
   - stale branch deletion after approval.

## Agent Delegation (Oracle Model)

### 1) Security Tracker Agent
Responsibilities:
- Branch inventory and drift scan
- Secret-risk scanning
- Tracker updates and queue ordering

Inputs:
- `git branch`, `git worktree`, drift counts, scan outputs

Outputs:
- Updated `BRANCH_SECURITY_TRACKER.md`
- Blocker list and next queue

### 2) Git Hygiene Agent
Responsibilities:
- Worktree archival actions
- Fast-forward sync operations
- Safe branch rename/archive operations

Inputs:
- Queue from tracker
- User constraints (do-not-touch branches)

Outputs:
- Synced branch list
- Archived branch list
- Blocked branch exceptions

### 3) Integration Validation Agent
Responsibilities:
- Build/test verification after sync operations
- Detect regression risk before push

Inputs:
- Branch after sync or merge

Outputs:
- Build/test status
- Go/No-Go recommendation

### 4) Oracle (Coordinator)
Responsibilities:
- Resolve conflicts between agent recommendations
- Sequence work and communicate decisions
- Request user approval for risky/destructive actions

Inputs:
- All agent outputs

Outputs:
- Final actions, commits, and summary

## Immediate Execution Queue
1. Confirm onboarding test outcome from user.
2. If approved: stash/commit strategy for `copilot-worktree-2026-03-18T16-36-16`.
3. After approval: finalize stale worktree cleanup.
4. Plan `feature/customer-management` sync/adaptation strategy against `main`.

## Decision Gate
Do not force-clean dirty worktrees without explicit user approval.
