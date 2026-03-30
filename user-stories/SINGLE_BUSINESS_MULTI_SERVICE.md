# Epic: Single Business with Multiple Services

**User Type Configuration**:
```
singleBusiness?services=mechanical+electrical+plumbing+maintenance;assetTracking=recommended
```

**Privacy Note**:
- Use generic placeholder identities in docs, demos, and tests (for example, "John Doe" / "Sample Bistro").
- Do not store or publish real customer names from external invoices in repository documentation.

## User Story – Centralised Service Management for a Single Location

**As a** restaurant owner or manager,
**I want to** book, track, and pay for any services under one account tied to my single business location,
**So that** I can handle generator service, equipment faults, plumbing, and general maintenance without juggling different contact methods.

## Acceptance Criteria

1. Single Account, Single Location
- One business record with one physical address, one billing address, and one primary contact.
- All service requests default to that same location.

2. Comprehensive Service Catalogue
- Mechanical: genset repair, maintenance, installation (including CoC where applicable).
- Electrical (equipment-focused): kitchen equipment repairs (toasters, ovens, fan motors, lighting-related equipment).
- Plumbing: drainage, water supply installations, sink/tap installs, pipe repairs.
- General Maintenance: welding, furniture repair, handyman tasks.

3. Asset Management (Optional, Recommended)
- Register key assets (example categories: generator, toaster, cooler fan motor).
- Link future service calls to assets.
- View service history per asset.

4. Booking Workflow
- Select service category and, when relevant, specific asset.
- Attach photos and problem description.
- Set urgency (emergency vs routine).
- System creates work order and timeline estimate.

5. Quotation and Approval for Large Jobs
- Complex jobs support quote request, online approval, deposit tracking, and final invoice.

6. Unified Service History
- Chronological timeline across all categories at the single location.
- Optional asset filter for machine/equipment-specific history.

7. Consolidated Invoicing
- Completed jobs produce digital invoices.
- Customer can view invoices under one account and pay online.

8. Multi-Service Visits
- Additional tasks can be added to the same site visit.
- Travel charged once; labour itemized per task.

## Development Considerations

1. Asset Registry
- Customer can create assets with make/model/serial/fuel-type metadata.
- Service requests link to assets to maintain precise history.
- Support fixed and movable asset classifications for operational clarity.

2. Flexible Service Models
- Standard call-out: single issue.
- Multi-task visit: one trip, multiple unrelated tasks.
- Project-based: quoting, approval, deposits, phased execution.

3. Electrical Service Categorisation
- Distinguish equipment-electrical work from licensed building-wiring work.
- Add compliance flags (licensed scope, CoC-required).

4. Plumbing Sub-Categories
- Capture installation-level detail (water supply, waste, drainage routing).
- Capture material lists and technical notes for invoicing and future repeat work.

5. Certification Tracking
- Attach and retrieve CoC documents from work order / invoice context.

6. Customer Notifications
- Notify on work-order status changes, technician ETA, and follow-up actions.

## Suggested Subtasks

1. Add single-business service catalogue view with category presets.
2. Add multi-task visit mode to service-call creation (single travel, itemized labour).
3. Add optional photo attachments in booking workflow.
4. Add asset selector + asset creation shortcut in booking flow.
5. Add asset filter controls to unified timeline.
6. Extend quotation workflow for project-based jobs and deposit milestones.
7. Add CoC attachment and retrieval workflow for applicable jobs.
8. Add notification events for status, dispatch, and completion.

## GitHub-Issue Ready Snippet

**Title**
`[Epic: Single Business with Multiple Services] As a restaurant owner, I want a single account to manage all my service needs`

**Description**
Track implementation of single-location multi-service operations for a single-business customer profile. Include service catalogue coverage across mechanical/electrical/plumbing/general maintenance, optional asset-linked service history, multi-task visit workflow, quote/deposit lifecycle for larger jobs, and consolidated invoicing/payment visibility.

## Status
- Stage: Planning
- Priority: High
- Owner: Product + Engineering
- Last Updated: March 30, 2026
