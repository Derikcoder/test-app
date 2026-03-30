# Epic: Loan Asset Tracking for a Distributed Business with Mobile Generators

**User Type Configuration**: 
```
businessCustomer?branches=true;headOffice=true;billing=serviceAddress
```

**Epic Objective**: As a service provider, I want to manage the service history of both fixed and loaned generator assets across a customer's multiple branches, so that I can accurately track maintenance, associate work with the physical machine (not just the location), and ensure seamless support for their internal logistics.

---

## Story 1 – Register Customer with Hub & Branches

**As a** service administrator,  
**I want to** create a master customer account that includes a central hub ("Head Office") and multiple branch locations,  
**So that** I can accurately reflect the customer's organisational structure and later assign assets to the correct physical location.

### Acceptance Criteria

- [ ] The master account has one billing address and one primary contact (central finance)
- [ ] Each branch location has its own physical address, local contact person, and optional separate billing
- [ ] The hub location is marked as a "depot" where loan assets are stored
- [ ] Registration UI guides: Master Account Details → Add Hub → Add Branches (optional)
- [ ] Each branch can be viewed and edited from the master profile

### Technical Considerations

- Master customer record with optional `parentCustomerId` (for future multi-level hierarchies)
- Branch records link back to master via `parentCustomerId`
- Hub is a special site type marked with `isDepot: true`
- Billing address can differ per branch or default to master

---

## Story 2 – Register Fixed Assets by Location

**As a** service administrator,  
**I want to** register a generator as a fixed asset and permanently assign it to a specific branch location,  
**So that** every service call for that asset is automatically associated with that branch's address and contact.

### Acceptance Criteria

- [ ] Asset is linked to one branch location (immutable after creation)
- [ ] Asset record includes: serial number, asset type, brand, model, installation date, current status
- [ ] Service history for the asset is tied to that branch, but also viewable under the master account
- [ ] Asset appears in the branch's asset list
- [ ] Master profile shows consolidated view of all fixed assets across branches

### Technical Considerations

- New `Asset` model with `type: 'fixed'`, `location: branchId` (permanent)
- Assets belong to master customer but are physically tied to specific sites
- Service calls reference asset directly, not just site

---

## Story 3 – Register Loan Assets as Movable

**As a** service administrator,  
**I want to** register a generator as a loan asset (mobile) that is initially stored at the hub,  
**So that** I can track its service history independently of where it is temporarily deployed.

### Acceptance Criteria

- [ ] Loan asset has a unique identifier (e.g., serial number) and a current "storage location" (hub)
- [ ] Loan asset record includes: serial number, asset type, brand, model, acquisition date, current status
- [ ] Loan asset can be checked out to a branch and later returned to the hub
- [ ] Service history follows the loan asset, not the branch
- [ ] Master profile shows all loan assets with their current deployment status

### Technical Considerations

- New `Asset` model with `type: 'loan'`, `currentLocation: siteId`, `homeLocation: hubId`
- Separate deployment history table: `AssetDeployment` (asset, to-branch, from-branch, checkout-date, checkin-date)
- Service calls reference asset and include location context (hub vs. deployed branch)

---

## Story 4 – Schedule a Service Call for a Fixed Asset

**As a** service dispatcher,  
**I want to** create a work order for a fixed generator by selecting the asset from the branch's list,  
**So that** the technician gets the correct branch address and the service is recorded against that asset.

### Acceptance Criteria

- [ ] Service call form shows "Select Asset" with list filtered to branch or master
- [ ] Work order shows branch address, local contact, and asset details
- [ ] Invoicing can be directed to the branch or central billing as configured
- [ ] Service call is recorded against the asset (linked in database)
- [ ] Service history for the asset updates automatically

### Technical Considerations

- Service call now includes `assetId` (required for fixed assets)
- Site address/contact pulled from asset's linked branch
- Billing address determined by master or branch preference

---

## Story 5 – Schedule a Service Call for a Loaned Asset

**As a** service dispatcher,  
**I want to** create a work order for a loan generator, either while it is stored at the hub or while it is deployed at a branch,  
**So that** the service location is correctly captured and the asset's service history remains continuous.

### Acceptance Criteria

- [ ] Service call form shows "Select Asset" filtered to loan assets
- [ ] If the asset is at the hub, work order address defaults to hub
- [ ] If the asset is loaned to a branch, the dispatcher can:
  - [ ] Choose to service it at that branch (field visit)
  - [ ] Request it be returned to hub for service
- [ ] Work order includes a note about the asset's current deployment status
- [ ] Service history for the asset links to deployment context

### Technical Considerations

- Service call includes `assetId` + `deploymentId` (context of where asset was when serviced)
- Address/contact pulled from current deployment location
- Technician can see asset's home hub and current branch in work order

---

## Story 6 – View Service History of a Loan Asset Across Deployments

**As a** service manager,  
**I want to** view a consolidated service history for a specific loan asset (by serial number),  
**So that** I can see all maintenance performed regardless of which branch it was in at the time.

### Acceptance Criteria

- [ ] Asset detail page shows chronological service history
- [ ] History shows: date, service type, work done, location (hub or branch), technician
- [ ] History distinguishes between hub and branch service calls
- [ ] Invoices related to that asset are linked and displayed
- [ ] Export option (CSV/PDF) for service history

### Technical Considerations

- Service history query joins `ServiceCall`, `AssetDeployment`, `Site`, and `Invoice` tables
- Timeline view shows deployment periods alongside service events
- Grouped by year or date range with filters
- Machine identity is anchored to `equipmentId` labels physically attached to machines, so identical make/model units from different branches remain distinguishable at a single service location.

---

## Story 7 – Track Deployment of Loan Assets

**As a** customer's central asset manager,  
**I want to** log when a loan generator is moved from the hub to a branch and back,  
**So that** I can keep an accurate record of which asset is currently at which location.

### Acceptance Criteria

- [ ] Master profile shows "Loan Asset Inventory" with current locations
- [ ] "Check Out Asset" UI allows selecting a loan asset and a destination branch
- [ ] "Check In Asset" UI allows returning an asset to hub
- [ ] Deployment history is immutable and audited (created by, timestamp)
- [ ] Service technicians see current location before scheduling service calls

### Technical Considerations

- `AssetDeployment` records created for each checkout/checkin
- Asset's `currentLocation` updated to reflect last checkout
- Deployment history queryable for analytics and audit trails

### Scope Note (Current Project)

- Customer-internal checkout/checkin logistics are out of scope for this platform.
- This platform focuses on machine-level service tracking using Appatunid machine IDs (`equipmentId`) and serial numbers.
- Dispatchers/technicians record where service occurred, and the service history remains tied to the exact machine serviced.

---

## Story 8 – Generate Service Report for Hub vs. Branches

**As a** service provider,  
**I want to** run a report that shows all service work performed on assets belonging to this customer, grouped by location (hub or branch) and by asset type (fixed vs. loan),  
**So that** I can analyse maintenance patterns and support the customer's internal logistics.

### Acceptance Criteria

- [ ] Report page accessible from master customer profile
- [ ] Report filters by: date range, asset type (fixed/loan), location (hub/branch)
- [ ] Report groups by location and asset type with subtotals
- [ ] Loan assets appear under the location where service occurred, with reference to home hub
- [ ] Export to CSV/PDF

### Technical Considerations

- Query aggregates service calls by asset type and location
- Shows maintenance patterns (e.g., fixed assets per branch, loan asset utilization)
- Rollup of labor hours, parts costs, downtime

---

## Implementation Roadmap

| Phase | Stories | Approximate Scope |
|-------|---------|-------------------|
| **Phase 1** | 1 | Master + branches registration; UI foundation |
| **Phase 2** | 2, 3 | Asset models (fixed + loan); inventory UI |
| **Phase 3** | 4, 5 | Service call linking to assets |
| **Phase 4** | 6, 7 | Deployment tracking + service history |
| **Phase 5** | 8 | Reporting and analytics |

---

## Related Documents

- [AI_ASSISTANT_GUIDE.md](../AI_ASSISTANT_GUIDE.md) — Recent changes and architecture notes
- [PROJECT-STRUCTURE.md](../PROJECT-STRUCTURE.md) — Component organization
- [README.md](../README.md) — API endpoint documentation

---

**Created**: March 30, 2026  
**Status**: In Planning  
**Priority**: High
