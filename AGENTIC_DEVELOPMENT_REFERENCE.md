# Agentic Development Reference

This file is the living reference for the lightweight agentic setup in this repo. Update it whenever a profile, agent, or bootstrap check changes.

## Why This Exists

This workflow exists to keep frontend work disciplined, calm, and recoverable.

We are not trying to build an army of noisy helpers. We are trying to build a small team with taste:

- one part maps risk before touching code
- one part makes the smallest safe change
- one part checks whether the result still feels clear to a human being
- one part preserves the handoff so the next session starts with momentum instead of archaeology

The goal is lightweight software and lightweight process at the same time.

## Design Ethos

- Clarity beats cleverness. If an extraction makes the code harder to read, it is not a win.
- Operators come first. The product serves people making time-sensitive decisions, often under stress.
- Meaning over decoration. Every shared helper, token, label, and layout choice should carry a real purpose.
- Small honest refactors beat sweeping rewrites. We prefer visible, testable progress over dramatic cleanup.
- Institutional memory matters. A good session leaves behind working code and a useful trail.

## Anti-Goals

- We do not abstract just because duplication exists; we abstract when the repeated thing is truly the same idea.
- We do not hide business meaning behind generic helpers.
- We do not chase a generic, interchangeable UI.
- We do not accept large cosmetic churn that makes review harder without improving the product.
- We do not let the process become heavier than the code it is supposed to simplify.

## What Good Looks Like

- A heavier component becomes easier to scan without losing its business meaning.
- A shared helper removes repetition but still leaves the calling code legible.
- A UI pass makes the next action more obvious, not more stylized.
- A review can explain why a change is safer, lighter, or clearer in one short paragraph.
- A handoff note is short, specific, and enough for tomorrow-you to continue without guessing.

## Lessons Learned

- Over-extraction is a real failure mode. If a refactor saves lines but costs readability, we undo it.
- Visual consistency is operational, not cosmetic. In this product, inconsistency slows decisions.
- The smallest safe change usually reveals the next correct change. Broad exploration too early creates drift.
- Lightweight only counts if behavior stays stable. A slimmer file with new regressions is heavier in practice.
- A living reference must remember scars, not just rules.

## Refactor Ritual

For each meaningful UI weightloss pass, answer these questions before calling it done:

1. What became lighter?
2. What stayed intentionally explicit?
3. What still feels heavy but should not be abstracted yet?
4. What validation proved the refactor stayed safe?

If those answers are weak, the pass is probably not finished.

## Abnormal Shutdown Recovery

If there is no ritual handoff, assume the session may have ended abnormally first.

The most likely cause is a power outage, editor crash, or forced shutdown. In that case, do not trust memory alone. Run a quick sanity check by validating the current repo state against the last clearly stated goals.

Use this sequence:

1. Find the last explicit goal, checkpoint, or continuity note.
2. Compare that goal to the current working tree, recent commits, and any open task notes.
3. Identify what was finished, what was half-done, and what only existed as intent.
4. Restart from the last verified safe point, not from vague recollection.

Example: if the last known goal says the next step was to begin phase 6 of the weightloss work, and there is no ritual handoff after that, treat the missing handoff as a recovery event. Confirm whether phase 6 was never started, partially started, or completed before doing anything else.

### Deterministic Recovery Checklist

When a ritual handoff is missing, recovery is not complete until all four stages below are done.

#### Stage 1: Find the truth

1. Check the latest continuity note, checkpoint summary, or explicit next action.
2. Check the current working tree state.
3. Check the latest commits.
4. Check whether the files you expected to touch actually changed.

#### Stage 2: Classify the repo state

Choose one state before resuming:

- Clean: no uncommitted changes and the current tree matches the last stated goal.
- Dirty: there are staged or unstaged changes that were never captured in a ritual handoff.
- Stale: continuity notes and current repo state no longer line up cleanly.

#### Stage 3: Pass the safety gate

Do not resume until you can answer yes to all of these:

1. Is the last explicit goal still identifiable?
2. Does the current repo state support that goal?
3. Do I know what was completed, what was partial, and what was still only planned?
4. Is the next action still the correct next action?

If any answer is no, stop and reconcile the repo state before continuing.

#### Stage 4: Resume from the last verified point

Resume only from the last verified safe point, then create a fresh checkpoint or continuity note as soon as the recovered path is clear.

## 1. MCP Profiles

### Repo-Safe Coding Profile

- File: [.continue/mcpServers/repo-safe-coding-mcp.yaml](.continue/mcpServers/repo-safe-coding-mcp.yaml)
- Purpose: default profile for code edits, file inspection, and git-aware work inside this repo.
- Tool set: filesystem + git only.
- Use when: making the small safe change set for the weightloss strategy.

### Read-Only Investigation Profile

- File: [.continue/mcpServers/read-only-investigation-mcp.yaml](.continue/mcpServers/read-only-investigation-mcp.yaml)
- Purpose: inspection-first profile for summaries, diff review, and planning.
- Tool set: filesystem + git only, no write-focused or reasoning-only extras.
- Use when: mapping risk, checking duplication, or reviewing changes before editing.

### Broader Agentic Coding Profile

- File: [.continue/mcpServers/broader-agentic-coding-mcp.yaml](.continue/mcpServers/broader-agentic-coding-mcp.yaml)
- Purpose: broader stack for tasks that benefit from sequential thinking or the extra git fallback.
- Tool set: filesystem + git + docker git fallback + sequential thinking.
- Use when: a task needs more exploration or multi-step reasoning than the repo-safe profile.

### Router-First Instruction

- File: [.github/instructions/router-first.instructions.md](.github/instructions/router-first.instructions.md)
- Purpose: always classify the request through the task router before any other action.
- Use when: you want every new message to begin with a routing step.

## 2. Lightweight Agents

### Task Router Agent

- File: [.agent.task-router.md](.agent.task-router.md)
- Role: first-pass classifier that routes each request to the narrowest specialist agent.
- Best for: deciding whether a new message should go to scouting, UI refactor, UX review, continuity, or testing.

### Read-Only Scout Agent

- File: [.agent.read-only-scout.md](.agent.read-only-scout.md)
- Role: inspect repo state, summarize diffs, locate duplication, and find regressions without edits.
- Best for: pre-edit discovery and falsifiable hypothesis building.

### UI Refactor Agent

- File: [.agent.ui-refactor.md](.agent.ui-refactor.md)
- Role: small, safe UI/UX cleanup and shared-component extraction.
- Best for: weightloss refactors, shared hooks, component slimming, style consolidation.

### UX Review Agent

- File: [.agent.ux-review.md](.agent.ux-review.md)
- Role: review-only assessment of clarity, consistency, and usability.
- Best for: sanity-checking the result of a UI refactor before committing.

### Continuity Custodian Agent

- File: [.agent.continuity-custodian.md](.agent.continuity-custodian.md)
- Role: keep checkpoints, session notes, and end-of-day handoff state aligned.
- Best for: preserving the next-session starting point after a work block.

## 3. Bootstrap Check

### Command

- `npm run bootstrap:mcp`

### Verifies

- All three MCP profile files parse correctly.
- `/tmp/test-app` exists as a symlink to the workspace.
- Docker is available for the git fallback.

## 4. Recommended Default Flow

1. Run `npm run bootstrap:mcp`.
2. Route the request through `task-router` first, or rely on the router-first instruction.
3. Use `read-only-investigation-mcp.yaml` to map the smallest safe change surface.
4. Use `repo-safe-coding-mcp.yaml` for the actual edit.
5. Use `ux-review` after a UI pass if the visual result needs a sanity check.
6. Use `continuity-custodian` before stopping for the day.

## 5. Update Rules

- Keep this file short and current.
- Add new agents only when they have a clearly narrower role.
- Prefer changing an existing profile or agent before creating a new one.
- If a profile or agent loses its job, remove it from here.

## 6. Phased Expansion Before New Agents

We do not add backend or database agents just because those domains exist in the repo. We add them when the work starts repeating in a way that a specialist can genuinely reduce risk or speed up delivery.

Current stance:

- Keep the active set lightweight and frontend-first.
- Use the existing router, scout, UI, UX, and continuity roles until repeated backend or database task shapes become obvious.
- Record the rollout decision in the operating model before creating any new agent file.

### Rollout Triggers

Create a new agent only when most of the following are true:

1. The same task shape has appeared at least three times in recent work.
2. The task has a stable boundary that existing agents do not already cover well.
3. The new role would reduce risk, not just rename the same work.
4. The router can distinguish the new role in one sentence.

### Server Agent Trigger

A server-focused agent becomes worth creating when backend work starts repeating across routes, controllers, middleware, validation, and tests with a consistent delivery pattern.

Good signals:

1. Multiple endpoint tasks follow the same route-controller-test pattern.
2. Auth and permission work needs repeated safety checks.
3. Existing agents are spending too much time handing backend work back to the Oracle.

### Database Agent Trigger

A database-focused agent becomes worth creating when schema and query safety work becomes a recurring lane instead of an occasional concern.

Good signals:

1. Schema evolution or index decisions are happening regularly.
2. Data integrity reviews are needed before feature work can ship.
3. Query behavior, migration safety, or model constraints are becoming a repeated source of risk.

### Expansion Guardrails

Before creating any new agent:

1. Confirm an existing agent cannot absorb the work with a clearer spec update.
2. Write the new role's anti-overlap rule before writing its file.
3. Define its handoff contract and validation expectation.
4. Add it to the operating model as proposed first, then promote it only after a successful trial run.

### Default Recommendation Right Now

The next likely additions are:

1. A narrow Server Delivery Agent for repeated endpoint and controller work.
2. A narrow Database Safety Agent for schema, index, and migration risk.

Until those triggers are met, keep the system small.
