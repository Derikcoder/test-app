# Agent Operating Model

Last updated: 2026-04-02

## Goal
Create focused agent roles so delivery remains fast and predictable.

## Oracle Pattern
Copilot (Oracle) coordinates specialist agents, collects outputs, and decides final action path.

## Essential Agents (Phase 1)
1. Project Tracker Agent
Purpose: convert goals into executable checklists, tick off validated work, keep blocker/evidence state current, and maintain next-action queue.

1. Security Tracker Agent
Purpose: branch inventory, drift analysis, secret-risk scans, remediation queue updates.

2. Backend Agent
Purpose: routes, controllers, auth, middleware, schema logic, tests.

3. Frontend Agent
Purpose: React components, UX flows, state wiring, API integration.

4. Integration Agent
Purpose: verify backend/frontend contract compatibility and release readiness.

## Scaled Agents (Phase 2)
1. Database Agent
Purpose: schema evolution, index strategy, migration safety, data integrity.

2. API Contract Agent
Purpose: request/response contract tracking, versioning, backward compatibility checks.

3. Process Flow Agent
Purpose: map end-to-end workflows, identify bottlenecks, enforce operational checklists.

4. DevOps/Security Agent
Purpose: deployment configuration, environment hygiene, CI/CD gates, vulnerability triage.

## Specialist Team Recommendations (Current State)
Use this decision matrix when deciding whether to activate specialist agents.

1. Activate now (high value this week)
- Project Tracker Agent
- Backend Agent
- Integration Agent
- Security Tracker Agent

2. Activate this sprint only if work starts
- Database Agent (if local-first mirror/event log implementation begins)
- API Contract Agent (if auth/response shape changes across frontend/backend)

3. Activate later (low immediate value)
- Process Flow Agent (after sprint 1 backend stability)
- DevOps/Security Agent (as release window approaches)

## Oracle Routing For Next Week
1. Project Tracker Agent starts each session and publishes the checklist.
2. Backend Agent executes implementation tasks in priority order.
3. Integration Agent validates contract and regression behavior after each major task group.
4. Security Tracker Agent runs branch/risk checks before end-of-day closeout.
5. Oracle resolves conflicts and sets next session top 3 actions.

## Agent Handoff Contract
Each agent output must include:
1. Task summary
2. Files touched or reviewed
3. Risks found
4. Decision recommendation
5. Next step owner

## Anti-Overlap Rules
1. Backend agent does not design UI.
2. Frontend agent does not define server data contracts alone.
3. Database agent does not change app UX behavior.
4. Security tracker agent does not ship feature code.
5. Oracle merges outcomes and resolves conflicts in recommendations.

## Execution Cadence
1. Start of session: Security Tracker Agent refreshes branch state.
2. Feature cycle: Backend and Frontend agents run in parallel where possible.
3. Before merge: Integration Agent validates contracts and critical flows.
4. End of session: Oracle updates tracker and next queue step.

## 30-Day Rollout

### Week 1
1. Run Security Tracker + Backend + Frontend + Integration only.
2. Use [BRANCH_SECURITY_TRACKER.md](BRANCH_SECURITY_TRACKER.md) for queue control.

### Week 2
1. Introduce Database Agent for schema-impacting tasks.
2. Add API Contract Agent for endpoint drift prevention.

### Week 3
1. Add Process Flow Agent for UAT/business workflow validation.
2. Define standard handoff snippets in PR descriptions.

### Week 4
1. Add DevOps/Security Agent for release gates and dependency/security review.
2. Measure cycle time and reduce friction points.

## Success Criteria
1. Lower context-switch overhead
2. Fewer merge surprises
3. Faster branch remediation cycles
4. Clear ownership per task type
