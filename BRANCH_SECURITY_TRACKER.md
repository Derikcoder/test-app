# Branch Security Tracker

Last updated: 2026-04-02 (post stale archival + feature/customer-management worktree sync)
Owner: Copilot + Derick
Purpose: Keep branch security/sync status in one place so work can continue quickly without context loss.

## Workflow (Second-Agent Style)
1. Primary agent: implement features/fixes.
2. Tracking agent task: run branch inventory + secret scan + drift check.
3. Update this file after each scan cycle.
4. Prioritize flagged branches in the order listed under "Remediation Queue".

## Current Branch Inventory
Local branches: 14
Remote branches: 10
Active worktrees: 3

## Branch Status Matrix

| Branch | Behind/Ahead vs main | Security file drift | Secret risk status | Next action |
|---|---:|---:|---|---|
| main | 0/0 | 0 | Baseline | Keep as source of truth |
| foundation | 4 behind / 26 ahead | Resolved in current cycle | Monitoring | Keep aligned with main for future merges |
| feature/register-customer-process | 3 behind / 18 ahead | Resolved in current cycle | Monitoring | Keep aligned with main for future merges |
| customerManagement | 2 behind / 5 ahead | Resolved in current cycle | Monitoring | Keep aligned with main for future merges |
| addressing-dependabot-identified-vulnerabilities | 1 behind / 22 ahead | Resolved in current cycle | Monitoring | Keep aligned with main for future merges |
| Quotation | 0 behind / 3 ahead | Resolved in current cycle | Monitoring | Keep aligned with main for future merges |
| archived/copilot-worktree-2026-03-18T15-11-07 | Archived | N/A | Archived | Archived with reversible tag snapshot |
| archived/copilot-worktree-2026-03-18T21-23-41 | Archived | N/A | Archived | Archived with reversible tag snapshot |
| copilot-worktree-2026-03-18T16-36-16 | 54 behind / 0 ahead | Stale worktree (dirty) | Blocked | Await user decision before stash/commit/archive |
| consolidation | 50 behind / 0 ahead | None detected | Candidate for fast-forward/align | Sync to main |
| feature/customer-management | 0 behind / 0 ahead | Synced (WIP preserved) | In progress | Continue customer onboarding enhancement work |
| feature/field-agent-dispatch-protocol | 20 behind / 0 ahead | None detected | Candidate for fast-forward/align | Sync to main |
| invoice | 12 behind / 0 ahead | None detected | Candidate for fast-forward/align | Sync to main |
| viteConfig-and-lazyLoading | 12 behind / 0 ahead | None detected | Candidate for fast-forward/align | Sync to main |

## Remediation Queue (Order of Operations)
1. Continue onboarding fixes on `feature/customer-management`
2. Decide handling for dirty `copilot-worktree-2026-03-18T16-36-16`
3. Final stale branch cleanup pass (post decision)

## Cleanup Plan
- [CLEANUP_SEQUENCE_AGENT_PLAN.md](CLEANUP_SEQUENCE_AGENT_PLAN.md)

## Security-Sensitive Files to Check First
- SECURITY.md
- README.md
- AI_ASSISTANT_GUIDE.md
- server/.env.example
- client/.env.example
- server/server.js
- setup-and-run.sh

## Decision Rules
- If branch has security-file drift: do security sync before feature work.
- If branch is only behind and 0 ahead: sync to main or archive.
- If branch is very stale worktree branch: archive unless active ownership exists.

## Scan Notes
- Latest tip scans did not show obvious live secrets (for example, Google API key format or credentialed MongoDB URI patterns).
- Placeholder/test secrets still appear in example/test files (expected).
- Foundation branch synced with main and pushed on 2026-04-02.
- Treat remaining high-drift branches as priority remediation targets.

## Latest Cycle Update
Date: 2026-04-02
Scanner: Copilot
Branches checked: all local branches + worktrees
New flags: none for obvious live key signatures in tip scans
Branches cleared: foundation, feature/register-customer-process, customerManagement, addressing-dependabot-identified-vulnerabilities, Quotation
Actions completed: archived clean stale worktree branches (`copilot-worktree-2026-03-18T15-11-07`, `copilot-worktree-2026-03-18T21-23-41`), synced behind-only branches, synced `feature/customer-management` to main via stash-apply workflow, resolved stash conflicts, preserved onboarding WIP files, identified dirty stale worktree blocker (`copilot-worktree-2026-03-18T16-36-16`)
Next branch in queue: feature/customer-management onboarding fix cycle

## Update Template (Use Each Cycle)
Date:
Scanner:
Branches checked:
New flags:
Branches cleared:
Actions completed:
Next branch in queue:
