# Database Architecture and UAT Prefill Blueprint

Last updated: 2026-05-26

## 1) Objective

Scale data safely without creating cross-database complexity, while enabling reliable prefill for quotations and invoices based on historical cost and duration patterns.

This blueprint is designed for:
- multi-customer-type UAT runs,
- progressive migration from one logical database to bounded-context databases,
- practical prefill for "new" customers using historical benchmarks.

## 2) Core Rules

1. Partition by domain ownership, not by status.
2. Keep one collection per entity type, with status fields and indexes.
3. Use conditional rendering for internal costing visibility; do not rely on CSS hiding.
4. Use snapshots on customer-facing commercial documents to avoid fragile cross-database reads.
5. Treat prefill as a ranking problem with confidence scores.

## 3) Recommended Database Topology

## 3.1 Preferred (6 databases)

- Usersdb
  - users
  - onboarding_passkeys
  - passkey_renewal_requests
  - profile_link_audits
  - registration_override_audits

- Customersdb
  - customers
  - customer_sites
  - customer_assets (if kept separate from machine instances)

- Machinesdb
  - machines
  - machine_service_history
  - machine_taxonomy

- Suppliersdb
  - suppliers
  - supplier_catalog_parts
  - supplier_catalog_services
  - supplier_rate_cards

- Operationsdb
  - service_calls
  - service_call_email_locks
  - assignment_workflow data

- Financialdb
  - quotations
  - invoices
  - receipts/payments
  - sequence_counters (or shared utility db)

## 3.2 If you want to start with your original 4 databases

You can still do this, but keep these boundaries clear:

- Usersdb
  - admin users, field agents, customer auth users
  - note: keep customer business profile in Financialdb or a customer sub-namespace if you cannot add Customersdb yet

- Machinesdb
  - machine taxonomy + machine instances + machine service history

- Suppliersdb
  - supplier master + part/service catalogs + rate cards

- Financialdb
  - quotations, invoices, receipts/payments
  - do not split collections by status (sent/approved/paid etc.)
  - jobs in progress should remain in Operationsdb; if Operationsdb does not exist yet, keep service-calls logically separate from commercial documents

## 4) Domain Ownership Matrix

- Identity and Access
  - owner db: Usersdb
  - source of truth: user role, auth, onboarding secrets

- Customer Profile and Relationship
  - owner db: Customersdb (or temporary logical partition in Financialdb)
  - source of truth: customer metadata, addresses, profile attributes

- Machine and Asset Intelligence
  - owner db: Machinesdb
  - source of truth: machine type, service history, reliability patterns

- Supplier and Procurement Intelligence
  - owner db: Suppliersdb
  - source of truth: provider rates, category-based supplier alternatives

- Service Execution Lifecycle
  - owner db: Operationsdb
  - source of truth: call state, assignment, execution milestones

- Commercial and Billing
  - owner db: Financialdb
  - source of truth: quote/invoice totals, workflow statuses, payment lifecycle

## 5) Prefill Intelligence Model (for new customers too)

Create two layers: event capture and aggregates.

## 5.1 Event capture collection

Collection: benchmark_observations

Required fields:
- observedAt
- sourceType (UAT, production)
- customerType
- serviceType
- machineType
- machineBrand (optional)
- machineModel (optional)
- region/province
- partsFulfilmentMode
- labourHours
- travelDistanceKm
- travelTimeMinutes
- partsCost
- procurementCost
- thirdPartyServiceCost
- deliveryCost
- consumablesCost
- subtotal
- total
- quoteAccepted (bool)
- invoicePaid (bool)
- serviceOutcome (completed, callback, rejected)
- confidenceWeight

## 5.2 Aggregate collection

Collection: benchmark_aggregates

Group keys:
- customerType + serviceType + machineType + region (+ optional brand/model)

Computed metrics:
- count
- p50, p75, p90 for labourHours
- p50, p75, p90 for total and key components
- acceptanceRate
- paymentCompletionRate
- lastUpdatedAt
- confidenceScore

## 5.3 Prefill ranking order

When creating a quote for a customer with no prior service history:

1. exact customer historical pattern (if exists)
2. same customerType + serviceType + machineType + region
3. same serviceType + machineType + region
4. same serviceType + machineType (global)
5. service-type template default

Apply confidence gates:
- high confidence: count >= 30
- medium confidence: count >= 10
- low confidence: count < 10 (show warning in UI)

## 5.4 UI behavior

For prefilled values, mark each with:
- source label (Exact Match, Segment Average, Global Template)
- confidence badge (High, Medium, Low)
- "override allowed" where role permits

## 6) Customer Visibility Policy

Internal costing fields should never render for customer-facing views.

Best pattern:
- gate in rendering layer or document generation using role/view context
- do not use CSS-only hiding for sensitive/internal values

Policy:
- internal users: full breakdown
- customer/public share views: customer-safe totals only

## 7) Indexing Strategy

Do not split by status into separate collections.

For Financialdb:
- quotations: index(customerId, status, createdAt)
- quotations: index(serviceCallId)
- invoices: index(customerId, paymentStatus, workflowStatus, createdAt)
- invoices: unique(invoiceNumber)

For benchmark_aggregates:
- unique(groupKeyHash)
- index(customerType, serviceType, machineType, region)

For benchmark_observations:
- index(observedAt)
- index(customerType, serviceType, machineType)

## 8) Phased Migration Plan

Phase 0 - Stabilize contracts (now)
- freeze current payload contracts for quote/invoice/service call
- identify fields that are snapshots vs references

Phase 1 - Introduce repository abstraction
- add data access layer that hides physical db names from controllers
- no behavior change

Phase 2 - Split Identity first
- move auth and passkey/audit identity artifacts to Usersdb
- keep compatibility reads during transition

Phase 3 - Split Commercial
- move quotations/invoices/receipts to Financialdb
- keep operations references by ID only

Phase 4 - Introduce benchmark pipeline
- write benchmark_observations on quote submit/invoice finalize/payment
- run aggregate job to populate benchmark_aggregates

Phase 5 - Turn on ranked prefill
- quote form consumes benchmark_aggregates via prefill endpoint
- expose source and confidence badges

Phase 6 - Move machine and supplier intelligence
- move machine history and supplier catalogs to dedicated dbs
- update prefill resolver to query by ranked fallback

Phase 7 - harden and archive
- archive stale observations
- monitor query latency and prefill precision

## 9) UAT Capture Checklist

During UAT runs, ensure each run records:
- customerType
- serviceType
- machineType
- estimated vs actual labour/travel/cost
- quote accepted/rejected
- invoice paid/unpaid
- time-to-approval and time-to-payment

This gives enough signal to prefill realistically even for customers without prior service history.

## 10) Success Criteria

- New-customer quote prefill available with confidence scoring.
- Customer-facing documents show only safe totals.
- No status-based collection splitting.
- Cross-database joins avoided in hot paths.
- Migration can be rolled out incrementally without freezing feature delivery.
