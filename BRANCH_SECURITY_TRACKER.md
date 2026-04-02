# Branch Security Tracker

Last updated: 2026-04-02
Owner: Copilot + Derick
Purpose: Keep branch security/sync status in one place so work can continue quickly without context loss.

## Workflow (Second-Agent Style)
1. Primary agent: implement features/fixes.
2. Tracking agent task: run branch inventory + secret scan + drift check.
3. Update this file after each scan cycle.
4. Prioritize flagged branches in the order listed under "Remediation Queue".

## Current Branch Inventory
Local branches: 14
Remote branches: 8

## Branch Status Matrix

| Branch | Behind/Ahead vs main | Security file drift | Secret risk status | Next action |
|---|---:|---:|---|---|
| main | 0/0 | 0 | Baseline | Keep as source of truth |
| foundation | 2 behind / 25 ahead | High | Review required | Merge main, resolve security files first |
| feature/register-customer-process | 4 behind / 17 ahead | High | Review required | Merge main, sync security files |
| customerManagement | 4 behind / 4 ahead | High | Review required | Merge main, sync security files |
| addressing-dependabot-identified-vulnerabilities | 4 behind / 21 ahead | High | Review required | Merge main, verify dependency and security deltas |
| Quotation | 11 behind / 2 ahead | Low | Monitor | Rebase/merge main and verify |
| copilot-worktree-2026-03-18T15-11-07 | 46 behind / 3 ahead | Low | Monitor | Evaluate if still needed, then sync or archive |
| copilot-worktree-2026-03-18T21-23-41 | 46 behind / 1 ahead | Low | Monitor | Evaluate if still needed, then sync or archive |
| consolidation | 45 behind / 0 ahead | None detected | Candidate for fast-forward/align | Sync to main |
| feature/customer-management | 40 behind / 0 ahead | None detected | Candidate for fast-forward/align | Sync to main |
| feature/field-agent-dispatch-protocol | 15 behind / 0 ahead | None detected | Candidate for fast-forward/align | Sync to main |
| invoice | 7 behind / 0 ahead | None detected | Candidate for fast-forward/align | Sync to main |
| viteConfig-and-lazyLoading | 7 behind / 0 ahead | None detected | Candidate for fast-forward/align | Sync to main |
| copilot-worktree-2026-03-18T16-36-16 | 46 behind / 0 ahead | None detected | Candidate for fast-forward/align | Archive or sync |

## Remediation Queue (Order of Operations)
1. foundation
2. feature/register-customer-process
3. customerManagement
4. addressing-dependabot-identified-vulnerabilities
5. Quotation
6. Remaining behind-only branches (sync or archive)

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
- Treat the four high-drift branches as priority remediation targets.

## Update Template (Use Each Cycle)
Date:
Scanner:
Branches checked:
New flags:
Branches cleared:
Actions completed:
Next branch in queue:
