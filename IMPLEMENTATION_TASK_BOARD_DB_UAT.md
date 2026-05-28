# Implementation Task Board: DB Architecture + UAT Prefill

Last updated: 2026-05-26
Source blueprint: DB_ARCHITECTURE_UAT_BLUEPRINT.md

## How to use this board

- Ticket IDs are ordered by phase.
- Status values: Backlog, Ready, In Progress, Blocked, Done.
- Estimate units are story points (SP).
- Each phase has a hard exit gate before the next phase starts.

## Phase Summary

| Phase | Goal | Tickets | Exit gate |
|---|---|---:|---|
| 0 | Freeze contracts and data boundaries | 4 | API contracts published and signed off |
| 1 | Add repository abstraction without behavior change | 5 | Controllers use repositories only |
| 2 | Move identity artifacts to Usersdb | 5 | Auth flows pass with compatibility reads |
| 3 | Move commercial documents to Financialdb | 6 | Quote/invoice lifecycle stable in Financialdb |
| 4 | Capture benchmark observations and aggregates | 6 | Aggregates populated from real events |
| 5 | Enable ranked prefill in quote workflow | 6 | Prefill live with confidence labels |
| 6 | Move machine and supplier intelligence to dedicated dbs | 5 | Prefill fallback includes machine/supplier signals |
| 7 | Harden, archive, and optimize | 5 | SLOs met and archive policy running |

---

## Phase 0: Stabilize Contracts

### P0-01 - Publish payload contract baseline
- Status: Backlog
- Estimate: 3 SP
- Depends on: none
- Description: Document request/response contracts for service calls, quotations, invoices, receipts, and payment updates.
- Acceptance criteria:
  - Versioned contract docs committed.
  - Required/optional fields marked.
  - Breaking-change rules defined.
- Output: contracts/phase0-contract-baseline.md

### P0-02 - Snapshot vs reference inventory
- Status: Backlog
- Estimate: 2 SP
- Depends on: P0-01
- Description: Classify each field as snapshot (embedded copy) or reference (foreign key only).
- Acceptance criteria:
  - Matrix created for quote and invoice fields.
  - Customer-facing document fields marked as snapshot-first.
- Output: contracts/snapshot-reference-matrix.md

### P0-03 - Status/index audit and anti-pattern cleanup
- Status: Backlog
- Estimate: 2 SP
- Depends on: none
- Description: Confirm no status-split collections; status handled via indexed fields.
- Acceptance criteria:
  - Existing collections mapped.
  - Index recommendations listed for quotations/invoices.
- Output: contracts/status-index-audit.md

### P0-04 - Migration readiness checkpoint
- Status: Backlog
- Estimate: 1 SP
- Depends on: P0-01, P0-02, P0-03
- Description: Team review and sign-off before repository abstraction starts.
- Acceptance criteria:
  - Decision log added.
  - Risks and rollback assumptions captured.
- Output: continuity/checkpoints/phase0-signoff.md

Phase 0 exit gate: all contract docs approved by backend + frontend owners.

---

## Phase 1: Repository Abstraction

### P1-01 - Create database routing config
- Status: Backlog
- Estimate: 3 SP
- Depends on: P0-04
- Description: Introduce central db routing config for logical domain to physical database mapping.
- Acceptance criteria:
  - Mapping supports current single-db mode and future multi-db mode.
  - Config is environment-driven.
- Output: server/config/db-routing.js

### P1-02 - Implement repository interfaces
- Status: Backlog
- Estimate: 5 SP
- Depends on: P1-01
- Description: Define repository contracts for users, service calls, quotations, invoices, suppliers, machines.
- Acceptance criteria:
  - Interfaces include CRUD + query-by-index use cases.
  - No controller directly imports mongoose models for covered entities.
- Output: server/repositories/interfaces/*

### P1-03 - Add repository adapters (current db only)
- Status: Backlog
- Estimate: 5 SP
- Depends on: P1-02
- Description: Build adapters that preserve exact behavior while still using current physical storage.
- Acceptance criteria:
  - Existing tests pass with adapters enabled.
  - No response shape change.
- Output: server/repositories/adapters/current/*

### P1-04 - Refactor controllers to repository usage
- Status: Backlog
- Estimate: 8 SP
- Depends on: P1-03
- Description: Move controller data access behind repository layer.
- Acceptance criteria:
  - Invoice, quotation, and service-call controllers use repositories only.
  - Regression tests pass.
- Output: controller refactor PR

### P1-05 - Add compatibility test suite
- Status: Backlog
- Estimate: 3 SP
- Depends on: P1-04
- Description: Add tests to confirm behavior is unchanged after abstraction.
- Acceptance criteria:
  - Golden tests cover core workflows.
  - Snapshot tests for response payloads pass.
- Output: server/tests/compat/repository-compat.test.*

Phase 1 exit gate: all targeted controllers routed through repositories with no behavior regressions.

---

## Phase 2: Split Identity to Usersdb

### P2-01 - Provision Usersdb and connection wiring
- Status: Backlog
- Estimate: 2 SP
- Depends on: P1-05
- Description: Add Usersdb connection and health probe integration.
- Acceptance criteria:
  - Usersdb reachable in all environments.
  - Health endpoint reports Usersdb status.
- Output: server/config/database-connections/*

### P2-02 - Migrate identity collections
- Status: Backlog
- Estimate: 5 SP
- Depends on: P2-01
- Description: Move users and onboarding/passkey/audit collections into Usersdb.
- Acceptance criteria:
  - One-time migration script with idempotency.
  - Row/document counts match before/after.
- Output: scripts/migrations/phase2-usersdb-migration.*

### P2-03 - Compatibility reads and dual-read fallback
- Status: Backlog
- Estimate: 3 SP
- Depends on: P2-02
- Description: Temporary fallback read from old location during cutover window.
- Acceptance criteria:
  - Fallback path covered by tests.
  - Metrics emitted when fallback is used.
- Output: server/repositories/adapters/identity/*

### P2-04 - Auth flow verification matrix
- Status: Backlog
- Estimate: 3 SP
- Depends on: P2-03
- Description: Validate login, token refresh, passkey renewal, and profile updates.
- Acceptance criteria:
  - Test matrix executed for admin, field agent, customer roles.
  - No auth regressions.
- Output: testing/phase2-auth-verification.md

### P2-05 - Remove fallback reads
- Status: Backlog
- Estimate: 2 SP
- Depends on: P2-04
- Description: Decommission temporary fallback once stable.
- Acceptance criteria:
  - Fallback code removed.
  - Monitoring confirms no legacy reads.
- Output: cleanup PR

Phase 2 exit gate: identity traffic fully served from Usersdb.

---

## Phase 3: Split Commercial to Financialdb

### P3-01 - Provision Financialdb and indexes
- Status: Backlog
- Estimate: 2 SP
- Depends on: P2-05
- Description: Create Financialdb and required indexes for quotations/invoices.
- Acceptance criteria:
  - Indexes created: customerId+status+createdAt, serviceCallId, invoiceNumber unique.
  - Index build monitored.
- Output: scripts/db/phase3-financial-indexes.*

### P3-02 - Migrate quotations and invoices
- Status: Backlog
- Estimate: 5 SP
- Depends on: P3-01
- Description: Migrate quotation/invoice/receipt collections with ID preservation.
- Acceptance criteria:
  - IDs and cross-references preserved.
  - Integrity report produced.
- Output: scripts/migrations/phase3-financial-migration.*

### P3-03 - Enforce snapshot fields on customer docs
- Status: Backlog
- Estimate: 3 SP
- Depends on: P3-02
- Description: Ensure customer-facing docs do not require cross-db joins for rendering.
- Acceptance criteria:
  - Snapshot field list enforced at creation time.
  - PDF generation works if source references are unavailable.
- Output: server/controllers/*, model validations

### P3-04 - Validate visibility gates for costing
- Status: Backlog
- Estimate: 2 SP
- Depends on: P3-03
- Description: Confirm customer/public views exclude internal costing details.
- Acceptance criteria:
  - Role/view-based tests pass.
  - Shared/public PDF excludes internal breakdown.
- Output: server/tests/unit/controllers/invoice.controller.test.*

### P3-05 - Financial workflow UAT script update
- Status: Backlog
- Estimate: 2 SP
- Depends on: P3-04
- Description: Extend UAT flow script to assert quote->invoice->payment lifecycle in Financialdb.
- Acceptance criteria:
  - UAT script captures DB origin and lifecycle states.
  - Script passes in CI/UAT.
- Output: scripts/uat_flow_run.sh update

### P3-06 - Cutover and rollback runbook
- Status: Backlog
- Estimate: 2 SP
- Depends on: P3-05
- Description: Write operational runbook for cutover and recovery.
- Acceptance criteria:
  - Step-by-step cutover with verification commands.
  - Rollback tested in staging.
- Output: continuity/FINANCIALDB_CUTOVER_RUNBOOK.md

Phase 3 exit gate: all commercial workflows run from Financialdb in staging and UAT.

---

## Phase 4: Benchmark Pipeline

### P4-01 - Create benchmark_observations schema
- Status: Backlog
- Estimate: 3 SP
- Depends on: P3-06
- Description: Define event schema for pricing/duration outcomes across UAT and production.
- Acceptance criteria:
  - Required fields from blueprint included.
  - Validation and indexes added.
- Output: server/models/BenchmarkObservation.model.js

### P4-02 - Capture events on key milestones
- Status: Backlog
- Estimate: 5 SP
- Depends on: P4-01
- Description: Write observation events on quote submit, invoice finalize, and payment completion.
- Acceptance criteria:
  - Events emitted exactly once per milestone.
  - Idempotency guard implemented.
- Output: controller hooks + service layer

### P4-03 - Build benchmark_aggregates updater job
- Status: Backlog
- Estimate: 5 SP
- Depends on: P4-02
- Description: Scheduled job computes p50/p75/p90 and success rates by segment keys.
- Acceptance criteria:
  - Aggregate math validated with fixture dataset.
  - Updater is restart-safe.
- Output: server/jobs/benchmarkAggregateJob.*

### P4-04 - Confidence scoring rules engine
- Status: Backlog
- Estimate: 3 SP
- Depends on: P4-03
- Description: Apply confidence levels based on sample size and recency.
- Acceptance criteria:
  - High/Medium/Low thresholds configurable.
  - Confidence exposed in aggregate records.
- Output: server/services/prefillConfidenceService.*

### P4-05 - Data quality and anomaly checks
- Status: Backlog
- Estimate: 2 SP
- Depends on: P4-02
- Description: Flag outliers and incomplete observations.
- Acceptance criteria:
  - Invalid records quarantined or ignored with logs.
  - Data quality report generated.
- Output: scripts/data-quality/benchmark-quality-check.*

### P4-06 - UAT capture dashboard export
- Status: Backlog
- Estimate: 2 SP
- Depends on: P4-03
- Description: Add reporting output for UAT evidence collection.
- Acceptance criteria:
  - Export includes customerType/serviceType/machineType coverage.
  - Acceptance and payment rates visible.
- Output: reports/uat-benchmark-coverage.*

Phase 4 exit gate: benchmark aggregates populated and verified from real workflow events.

---

## Phase 5: Ranked Prefill

### P5-01 - Prefill query service with fallback ranking
- Status: Backlog
- Estimate: 5 SP
- Depends on: P4-06
- Description: Implement ranked resolver order for exact match to template fallback.
- Acceptance criteria:
  - Resolver follows 5-level ranking from blueprint.
  - Best match and alternatives returned.
- Output: server/services/prefillResolverService.*

### P5-02 - Prefill API endpoint
- Status: Backlog
- Estimate: 3 SP
- Depends on: P5-01
- Description: Add endpoint for quote form prefill suggestions.
- Acceptance criteria:
  - Endpoint accepts customer/service/machine context.
  - Response includes source label and confidence.
- Output: server/routes/prefill.routes.*, controller

### P5-03 - Quote form integration
- Status: Backlog
- Estimate: 5 SP
- Depends on: P5-02
- Description: Integrate prefill values into quote UI with clear user controls.
- Acceptance criteria:
  - Prefilled fields visibly tagged by source.
  - Users can override where permitted.
- Output: client/src/components/CreateQuoteModal.jsx

### P5-04 - Role-based override policy
- Status: Backlog
- Estimate: 2 SP
- Depends on: P5-03
- Description: Enforce who can accept/override low-confidence suggestions.
- Acceptance criteria:
  - Policy enforced backend-side.
  - Forbidden overrides return clear errors.
- Output: server/middleware/prefillPolicy.*

### P5-05 - Prefill performance guardrails
- Status: Backlog
- Estimate: 2 SP
- Depends on: P5-01
- Description: Add latency budgets and query instrumentation.
- Acceptance criteria:
  - p95 latency target defined and monitored.
  - Slow query logs enabled.
- Output: telemetry updates

### P5-06 - Prefill A/B validation in UAT
- Status: Backlog
- Estimate: 3 SP
- Depends on: P5-03, P5-05
- Description: Compare manual-only vs prefill-assisted quoting outcomes.
- Acceptance criteria:
  - Time-to-quote and variance improvements measured.
  - Recommendation for full rollout documented.
- Output: reports/prefill-uat-ab-summary.md

Phase 5 exit gate: ranked prefill is live in UAT with confidence and source transparency.

---

## Phase 6: Machine + Supplier Intelligence Split

### P6-01 - Provision Machinesdb/Suppliersdb adapters
- Status: Backlog
- Estimate: 3 SP
- Depends on: P5-06
- Description: Wire repository adapters for machine and supplier domains.
- Acceptance criteria:
  - Read/write paths validated for both domains.
  - Health checks include both databases.
- Output: server/repositories/adapters/machines/*, suppliers/*

### P6-02 - Migrate machine history and taxonomy
- Status: Backlog
- Estimate: 5 SP
- Depends on: P6-01
- Description: Move machine and service history data to Machinesdb.
- Acceptance criteria:
  - Document counts and key references reconciled.
  - Service history queries pass regression tests.
- Output: scripts/migrations/phase6-machinesdb-migration.*

### P6-03 - Migrate supplier catalogs and rate cards
- Status: Backlog
- Estimate: 5 SP
- Depends on: P6-01
- Description: Move supplier master/catalog/rate data to Suppliersdb.
- Acceptance criteria:
  - Supplier lookup queries stable.
  - Pricing source-of-truth documented.
- Output: scripts/migrations/phase6-suppliersdb-migration.*

### P6-04 - Extend prefill resolver with machine/supplier priors
- Status: Backlog
- Estimate: 3 SP
- Depends on: P6-02, P6-03
- Description: Improve prefill with machine reliability and supplier cost priors.
- Acceptance criteria:
  - Resolver includes supplier availability and machine history hints.
  - Confidence score adjusts with new signals.
- Output: prefill resolver enhancement PR

### P6-05 - Cross-domain contract tests
- Status: Backlog
- Estimate: 2 SP
- Depends on: P6-04
- Description: Ensure no hot-path cross-db joins are introduced.
- Acceptance criteria:
  - Contract tests verify ID-only references.
  - Performance budget still met.
- Output: server/tests/contract/cross-domain-boundaries.test.*

Phase 6 exit gate: machine/supplier domains isolated and prefill quality improved with domain signals.

---

## Phase 7: Harden and Archive

### P7-01 - Observation retention and archive policy
- Status: Backlog
- Estimate: 3 SP
- Depends on: P6-05
- Description: Define retention and archive strategy for raw observations.
- Acceptance criteria:
  - Archive window configured.
  - Restore/test procedure documented.
- Output: policies/benchmark-retention-policy.md

### P7-02 - Query optimization and index tune-up
- Status: Backlog
- Estimate: 3 SP
- Depends on: P7-01
- Description: Tune indexes based on live query plans and usage metrics.
- Acceptance criteria:
  - Slow queries reduced below target.
  - Explain plans captured for critical queries.
- Output: performance/phase7-index-optimization.md

### P7-03 - SLO + alerting for prefill and financial workflows
- Status: Backlog
- Estimate: 2 SP
- Depends on: P7-02
- Description: Add SLOs and production alerts for latency/errors.
- Acceptance criteria:
  - Alerts wired to responsible team.
  - Error budget tracked.
- Output: ops/slo-prefill-financial.md

### P7-04 - Security and visibility regression pack
- Status: Backlog
- Estimate: 2 SP
- Depends on: P7-03
- Description: Re-verify customer/public visibility restrictions for internal costing.
- Acceptance criteria:
  - Security tests pass for all customer-facing documents.
  - No sensitive field leaks in PDFs/API responses.
- Output: security/phase7-visibility-regression.md

### P7-05 - Final rollout and legacy cleanup
- Status: Backlog
- Estimate: 3 SP
- Depends on: P7-04
- Description: Remove legacy flags, adapters, and deprecated read paths.
- Acceptance criteria:
  - Legacy code removed with changelog.
  - Final architecture diagram updated.
- Output: cleanup PR + architecture refresh

Phase 7 exit gate: stable, observable, and maintainable multi-db architecture in production mode.

---

## Cross-phase Operational Tickets

### OPS-01 - Migration rollback drills
- Status: Backlog
- Estimate: 2 SP per drill
- Cadence: end of Phases 2, 3, and 6
- Acceptance criteria:
  - Drill run logs stored.
  - Recovery time recorded.

### OPS-02 - UAT dataset curation
- Status: Backlog
- Estimate: 2 SP
- Cadence: continuous during Phases 4-6
- Acceptance criteria:
  - Coverage across customerType x serviceType x machineType matrix.
  - Data quality above agreed threshold.

### OPS-03 - Documentation updates
- Status: Backlog
- Estimate: 1 SP per phase
- Cadence: every phase close
- Acceptance criteria:
  - AI_ASSISTANT_GUIDE.md recent changes updated.
  - README/PROJECT-STRUCTURE updates applied where relevant.

---

## Suggested Initial Sprint Cut (first 2 weeks)

- P0-01, P0-02, P0-03, P0-04
- P1-01, P1-02, P1-03

Expected result: contract-safe baseline + repository foundation, with no behavior change and low migration risk.
