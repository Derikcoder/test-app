# Epic: Residential Turnkey Services

**User Type Configuration**:
```
residentialCustomer?assetTracking=optional;addressPersistence=true;services=all
```

**Privacy Note**:
- Use generic placeholder identities in docs, tests, and sample data (for example, "John Doe").
- Do not use real customer names in project artifacts.

## User Story – Unified Booking for a Residential Customer

**As a** residential property owner,
**I want to** log in and see all your services (mechanical, electrical, plumbing, appliances, and general maintenance) in one place,
**So that** I can easily select and book any type of work needed for my home.

## Acceptance Criteria

1. Service Catalogue
- The platform displays the full range of services:
- Mechanical: genset repair, maintenance, and new generator supply/installation (including CoC where applicable).
- Electrical: wiring, power points, lighting, appliance repairs, and general electrical fixes.
- Plumbing: water reticulation, pump repairs, geyser installation, tank maintenance, drainage.
- Property Maintenance: shelving, painting, curtain rails, carpentry, and handyman tasks.

2. Location Persistence
- Residential home address and visit notes (gate code, parking notes, access details) are saved.
- Saved location details auto-populate every new booking.

3. Asset Tracking (Optional)
- Customer can optionally link work to a specific residential asset (example: generator, tumble dryer, gate motor).
- Asset-level service history is available separately from property-wide history.

4. Booking Flexibility
- Booking supports preferred date and time window.
- Booking supports issue description and photos.
- Booking supports urgency selection (emergency vs routine).

5. Quotations and Multi-Stage Work
- Complex jobs support quotation generation, approval, deposit, and progress updates.
- Final invoicing closes the workflow.

6. Service History
- Residential customer sees one chronological timeline of all jobs across service categories.

7. Invoicing and Payment
- Customer receives job-based consolidated invoices.
- Online payment option is supported.

## Development Considerations

1. Service Category Templates
- Mechanical template: make/model, fuel type, run-hours, load profile.
- Electrical template: wiring context, load balancing, CoC required flag.
- Plumbing template: pump/tank/geyser details and pressure issues.
- Property maintenance template: scope checklist, materials, access constraints.

2. Optional Residential Asset Registry
- Allow multiple assets per residential customer.
- Keep unique `equipmentId` labels for repeat service tracking.
- Link service calls to specific assets when selected.

3. Quotation and Approval Workflow
- Support quote creation, acceptance/rejection, deposit required, and completion milestones.

4. Certification Tracking
- For CoC-required work, allow upload/linking of certificates on service call or invoice records.

5. Unified Dashboard
- Single residential timeline for scheduled, in-progress, and completed work regardless of service category.

## Suggested Subtasks

1. Build service catalogue UI for residential customer profile.
2. Persist and auto-fill residential location and access notes.
3. Add optional asset picker in residential booking flow.
4. Extend booking schema for category-specific template fields.
5. Add photo upload support for booking issue context.
6. Connect quotation/deposit flow to residential jobs.
7. Add CoC document attachment support.
8. Build unified residential history timeline and filters.

## GitHub-Issue Ready Snippet

**Title**
`[Epic: Residential Turnkey Services] As a residential customer, I want to book any property service from a single platform`

**Description**
Use this epic to track a unified residential booking and service-history experience across mechanical, electrical, plumbing, appliances, and general property maintenance. Include address persistence, optional asset-level tracking, quotation/deposit workflow for complex jobs, and consolidated invoicing with payment options.

## Status
- Stage: Planning
- Priority: High
- Owner: Product + Engineering
- Last Updated: March 30, 2026
