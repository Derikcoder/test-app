# Branch Security Tracker

Last updated: 2026-04-02 (post foundation + feature/register-customer-process + customerManagement + addressing-dependabot sync)
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
| foundation | 3 behind / 26 ahead | Resolved in current cycle | Monitoring | Keep aligned with main for future merges |
| feature/register-customer-process | 2 behind / 18 ahead | Resolved in current cycle | Monitoring | Keep aligned with main for future merges |
| customerManagement | 1 behind / 5 ahead | Resolved in current cycle | Monitoring | Keep aligned with main for future merges |
| addressing-dependabot-identified-vulnerabilities | 0 behind / 22 ahead | Resolved in current cycle | Monitoring | Keep aligned with main for future merges |
| Quotation | 15 behind / 2 ahead | Low | Monitor | Rebase/merge main and verify |
| copilot-worktree-2026-03-18T15-11-07 | 46 behind / 3 ahead | Low | Monitor | Evaluate if still needed, then sync or archive |
| copilot-worktree-2026-03-18T21-23-41 | 46 behind / 1 ahead | Low | Monitor | Evaluate if still needed, then sync or archive |
| consolidation | 45 behind / 0 ahead | None detected | Candidate for fast-forward/align | Sync to main |
| feature/customer-management | 40 behind / 0 ahead | None detected | Candidate for fast-forward/align | Sync to main |
| feature/field-agent-dispatch-protocol | 15 behind / 0 ahead | None detected | Candidate for fast-forward/align | Sync to main |
| invoice | 7 behind / 0 ahead | None detected | Candidate for fast-forward/align | Sync to main |
| viteConfig-and-lazyLoading | 7 behind / 0 ahead | None detected | Candidate for fast-forward/align | Sync to main |
| copilot-worktree-2026-03-18T16-36-16 | 46 behind / 0 ahead | None detected | Candidate for fast-forward/align | Archive or sync |

## Remediation Queue (Order of Operations)
1. Quotation
2. Remaining behind-only branches (sync or archive)

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
Branches checked: foundation, feature/register-customer-process, customerManagement, addressing-dependabot-identified-vulnerabilities, Quotation
New flags: none for obvious live key signatures in tip scans
Branches cleared: foundation, feature/register-customer-process, customerManagement, addressing-dependabot-identified-vulnerabilities
Actions completed: merged main into addressing-dependabot-identified-vulnerabilities, resolved conflicts in env/server/vite/startup files, validated build, pushed branch
Next branch in queue: Quotation

## Update Template (Use Each Cycle)
Date:
Scanner:
Branches checked:
New flags:
Branches cleared:
Actions completed:
Next branch in queue:
