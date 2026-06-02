# Architecture Doctrine: One Source of Truth

Version: 1.0  
Last Updated: 2026-06-02

## Purpose

This doctrine defines how the platform must evolve without data drift, duplicated logic, or mismatched behavior between frontend, backend, and database layers.

The governing principle is simple:

1. Roots and branches must stay aligned.
2. Facts live in one place.
3. Every layer expresses the same domain truth.

## The Tree Model (Applied)

1. Roots: database facts, core invariants, lifecycle state.
2. Trunk: API contracts and authorization rules.
3. Branches: user workflows and interface behavior.
4. Pruning: intentional removal of stale paths, old assumptions, and duplicate data channels.

If roots and branches diverge, the system appears inconsistent even when each part works in isolation.

## Non-Negotiable Rules

1. Single active DB target per runtime session.
2. Explicit DB target selection (`local-only`, `atlas-only`, `auto`) is mandatory.
3. Startup must fail fast when mixed local MongoDB stores are detected.
4. `createdBy` is an audit field, not a tenancy boundary for superAdmin visibility.
5. Business keys must remain globally unique where defined.
6. Duplicate audits are required before UAT and before release promotion.

## Source-of-Truth Responsibilities

1. Database
- Stores canonical facts and immutable identifiers.
- Enforces unique keys and reference integrity.

2. Backend
- Owns business logic, permissions, and state transitions.
- Exposes contract-stable APIs; no hidden per-screen logic branches.

3. Frontend
- Mirrors backend capabilities and domain lifecycle faithfully.
- Never redefines domain truth with conflicting local assumptions.

## Access Scope Doctrine

1. `superAdmin`
- Global operational visibility.
- Can read and operate across all service-provider data domains.

2. `businessManager` (planned)
- Scoped visibility to one service provider domain.
- Enforced by explicit tenancy key (for example `serviceProviderId`).

3. `fieldServiceAgent` and `customer`
- Profile-bound visibility and action scope.

## Data Governance for Scale

1. Keep one canonical domain model before splitting databases.
2. Introduce explicit tenancy key(s) before broad partitioning.
3. Run additive migrations first, then backfill, then cut reads/writes.
4. Avoid dual-write paths until contracts and reconciliation checks exist.

## Operational Guardrails (Current)

1. DB source guard script blocks mixed local MongoDB stores.
2. DB target reports provide host, DB name, record counts, and ownership map.
3. Duplicate audits check critical business keys:
- users: email, userName
- fieldserviceagents: email, employeeId
- customers: email, customerId
- servicecalls: callNumber
- quotations: quotationNumber
- invoices: invoiceNumber
- machines: category/type/model/site compound key

## Mandatory Checks

Run these before UAT and before release handoff:

```bash
npm run db:guard
npm run db:report:local
npm run db:audit:duplicates:local
```

For cloud verification:

```bash
npm run db:report:atlas
npm run db:audit:duplicates:atlas
```

## ERD-Driven Multi-DB Roadmap (Pre-Split Checklist)

1. Define bounded contexts and ownership boundaries in ERD.
2. Mark global IDs vs context-local IDs.
3. Define cross-context references and consistency model.
4. Decide read model strategy for cross-context queries.
5. Define migration batches and rollback checkpoints.
6. Add reconciliation reports for every moved entity group.

No database split proceeds until all six checklist items are approved.

## Decision Log Rule

Every architecture-affecting DB decision must record:

1. Why now.
2. Which invariants are affected.
3. Which checks prove correctness.
4. How rollback works.

If a decision cannot be verified and rolled back, it is not production-ready.
