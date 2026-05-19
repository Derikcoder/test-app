# Machines Database Feature - Implementation Guide

**Status:** Phase 1 Complete (Database & API Layer)
**Date:** May 19, 2026

## Overview

The Machines feature enables service agents to:

1. Track all machines/equipment they've serviced
2. View service history and recurring issues
3. Auto-generate quotations based on historic data
4. Capture real-world variations (parts availability, regional costs, quality specs)
5. Avoid re-entering machine details on repeat bookings

## Architecture

### Database Schema

#### Machine Model (`Machine.model.js`)

Stores machine/equipment specifications and service metadata.

**Key Fields:**

**Indexes:**

- Prevents duplicate machines even if registered by different agents
- Uses `sparse: true` to ignore null values

#### MachineServiceHistory Model (`MachineServiceHistory.model.js`)

Records each service event with detailed outcomes and costs.

**Key Concept:** Service history tracking begins when your company performs the first service on a machine. Earlier service history can be captured if the customer provides it, but your system only guarantees continuity from your first touchpoint forward.

**Key Fields:**

- `machineId`: ObjectId → Machine
- `serviceCallId`: ObjectId → ServiceCall
- `serviceType`: String (e.g., 'preventive maintenance', 'emergency repair')
- `partsUsed`: Array of Part objects (see below)
- `servicesPerformed`: String (description of work done)
- `issuesFound`: String (problems discovered)
- `recommendations`: String (suggested upgrades/maintenance)
- `machineCondition`: String (state of machine at service)
- `quotationId`: ObjectId → Quotation (if quoted before service)
- `wasQuoted`: Boolean
- `servicedAt`: Date
- `notes`: String

**Part Used Schema (sub-document):**
Captures real-world variations for each component with full supplier & pricing data:
-`supplierPartNumber`: String (part number from supplier, for reordering)
-`type`: String (part classification, e.g., 'filter', 'oil', 'spark-plug', 'bearing')
-`category`: String (e.g., 'filter', 'oil', 'spark-plug')
-`description`: String (human-readable description)
-`brand`: String (manufacturer brand)
-`preferredBrand`: String (usually-ordered brand)
-`actualBrand`: String (brand actually used - may differ due to availability)
-`model`: String (spec number)
-`quantity`: Number
-`unitCost`: Number (cost at time of service)
-`latestPrice`: Number (most recent market price; updated by price sync function)
-`currency`: String ('ZAR', 'USD', etc.)
-`totalCost`: Number (quantity × unitCost at service time)
-`availabilityNote`: String ('not available', 'generic substitute', 'regional shortage')
-`qualityAssessment`: String ('OEM', 'compatible', 'alternative')
-`lastPriceUpdateAt`: Date (when latestPrice was last updated)

**Note:** `latestPrice` field supports future integration with:
-**Google Search results updater** → Auto-sync market prices for cost forecasting
-**Supplier catalog API integrations** → Direct lookups from current supplier pricing systems

This enables agents to see real-time pricing trends and availability changes for parts without manual research.

**Key Concept:** This structure separates:
-**Preferred brand** → what was ordered
-**Actual brand** → what was installed (if different due to stock)
-**Cost** → captures market/region/exchange rate variations
-**Quality assessment** → manufacturing spec, not cost-dependent

**Indexes:**
-`(machineId, servicedAt)` → Fast retrieval of "service history for machine"
-`(agentId, servicedAt)` → Fast retrieval of "all services by agent"
-`(machineId, agentId)` → Fast retrieval of "services for agent on specific machine"

#### ServiceCall Updates

Added `machineId` field:
-`machineId`: ObjectId → Machine (optional, sparse index)
-When user selects existing machine, pre-fills equipment details
-When service is completed, new MachineServiceHistory record created

### API Endpoints

**Base Path:** `/api/machines` (all require JWT authentication)

#### Read Operations

GET /api/machines
  → Returns all machines for current agent, sorted by serviceCount (descending)
  
GET /api/machines/category/:category
  → Returns machines filtered by service category (e.g., 'generator-backup-power')
  
GET /api/machines/:id
  → Returns single machine details
  
GET /api/machines/:id/service-history
  → Returns chronological list of all services on this machine
  → Each record includes parts used, costs, issues, recommendations
  
GET /api/machines/:id/quotation-template
  → Returns structured template from last service
  → Used to pre-populate quotation form with historic costs

#### Write Operations

POST /api/machines
  → Create new machine record
  → Auto-detects duplicates (same category+type+specs at same site)
  → Returns 409 Conflict if machine already registered
  
PUT /api/machines/:id
  → Update machine details (notes, operating hours, customer link, etc.)
  → Cannot update core specifications (serviceCategory, machineType, etc.)
  
DELETE /api/machines/:id
  → Soft/hard delete (architecture decision needed)
  
POST /api/machines/:id/service-history
  → Record completed service on machine
  → Auto-updates machine.serviceCount, lastServicedAt, lastServiceAgent
  → Creates permanent audit trail

## Implementation Phases

### ✅ Phase 1: Database & API (COMPLETE)

- [x] Machine.model.js created with compound unique index
- [x] MachineServiceHistory.model.js created with part tracking
- [x] ServiceCall.model.js updated with machineId reference
- [x] machine.controller.js with 9 endpoints
- [x] machine.routes.js with route definitions
- [x] server.js updated to import and mount machine routes

### 🔄 Phase 2: Frontend Integration (NEXT)

**Frontend Tasks:**

1. **Machine Library View**
   - New component: `src/components/MachineLibrary.jsx`
   - Shows agent's list of machines with:
     - Machine specs (make, model, capacity)
     - Service count badge
     - Last serviced date
     - Service history modal/detailed view
   - Filter by service category

2. **Service Call Registration Enhancement**
   - Add "Select Existing Machine" option in ServiceCallRegistration
   - When machine selected:
     - Auto-fill equipment details (make, model, capacity, site)
     - Show service history sidebar
     - Show quotation template from last service
   - When machine NOT selected:
     - Create new machine record on service completion
     - Launch flow to select/link to existing machine

3. **Quotation Auto-Generation**
   - Call `GET /api/machines/:id/quotation-template`
   - Pre-populate Quotation form with:
     - Historic labour hours/costs
     - Previous parts used (with availability notes)
     - Suggested costs (editable by agent)
   - Agent can adjust costs based on current market conditions

4. **Service Completion Flow**
   - After service marked complete:
     - Call `POST /api/machines/:id/service-history`
     - Record parts used, costs, issues found, recommendations
     - Update machine.serviceCount, lastServicedAt

### 📋 Phase 3: Analytics & Reporting (FUTURE)

- Agent dashboard: "Machines I service" → Total count and frequency breakdown
- Machine health dashboard: Track recurring issues and recommendations
- Cost analysis: Identify parts that vary by region/time
- Quotation accuracy: Compare estimated vs actual costs

## Business Logic

### Machine Registration & Service History Tracking

- **First service touchpoint:** Service history begins when your agents perform the first service on a machine
- **Inherited history:** Customers may provide documentation of prior services (e.g., maintenance records from previous service provider)—this can be manually recorded in notes or as historical entries if needed
- **Your data is the source of truth:** From your first service forward, all service records are captured in MachineServiceHistory with full details (parts, costs, issues, recommendations)

### Duplicate Detection

When creating a machine, check for existing record with:
-Same `serviceCategory`
-Same `machineType`
-Same `generatorMakeModel`
-Same `machineModelNumber`
-Same `siteName`

If found, return 409 Conflict with existing machineId so agent can link to existing record.

### Cost Tracking Across Time/Region

The system captures:
-**Preferred brand** vs **actual brand used** → Tracks when substitutes are necessary
-**Unit cost** + **currency** → Handles regional pricing variations
-**Availability note** → Documents market conditions (shortage, regional stock issue)
-**Quality assessment** → Captures manufacturing spec independently from cost

Example: A filter might be:

{
  preferredBrand: "Caterpillar",
  actualBrand: "Generic equivalent",
  unitCost: 250,
  currency: "ZAR",
  availabilityNote: "Caterpillar out of stock in Johannesburg",
  qualityAssessment: "Compatible - meets OEM specifications"
}

### Quotation Generation Strategy

When generating quotation for repeat machine:

1. Fetch MachineServiceHistory for this machine
2. Sort by `servicedAt` descending, take most recent
3. Use `partsUsed[]` and costs as baseline
4. Agent reviews and adjusts:
   - Update parts if prices changed
   - Update labour hours if more/less work expected
   - Update notes if machine has known issues
5. Submit quotation as new record (not using template directly)

## Key Design Decisions

### Why Compound Unique Index?

- Same machine could be registered by different agents
- Prevents wasteful duplicates while allowing legitimate multi-registration
- Sparse index ignores NULL values (some machines may not have all specs)

### Why Both Preferred + Actual Brand?

- Real-world reality: preferred parts often unavailable
- Tracks availability patterns and regional issues
- Separates cost variations (market-driven) from quality (spec-driven)

### Why Separate MachineServiceHistory?

- Unbounded array growth on Machine document (16MB limit)
- Each service is its own audit record (immutable once created)
- Enables efficient time-series queries ("services last 3 months")
- Allows referencing related ServiceCall, Quotation, etc.

### Why Optional machineId on ServiceCall?

- Not every service call uses machine tracking yet
- Backward compatibility with existing service calls
- Agent can decide whether to link to machine system
- Sparse index prevents waste on unmachined calls

## Future Integrations: Pricing & Supplier Lookup

### Price Tracking & Market Intelligence

The system is architected to support automated price discovery and supplier catalog lookups:

**Phase 1: Google Search Integration**

- Build automated Google Search scraper for part pricing
- Updates `latestPrice` field based on market searches
- Identifies price trends and regional variations
- Scheduled jobs (daily/weekly) refresh pricing for frequently-used parts

**Phase 2: Supplier API Integrations**

- Direct API connections to current supplier catalogs
- Real-time availability checking
- Automated part number lookups
- Stock status for parts (in stock, backorder, discontinued)
- Alternative part suggestions from supplier inventory

**Phase 3: Predictive Costing**

- Historical cost trends analysis
- Price forecasting for quotations
- Regional cost adjustments
- Supplier comparison automation

### Implementation Benefits

- Agents see current market prices when generating quotations
- Automatic detection of price increases/decreases over time
- Smart recommendations for cost-effective alternatives
- Better quotation accuracy without manual research
- Supplier inventory visibility reduces "part not available" surprises

## Testing Strategy

### Unit Tests (Service Layer)

- Test duplicate detection logic
- Test machine aggregate updates (serviceCount, lastServicedAt)
- Test part cost calculations

### Integration Tests (API Layer)

- Test machine CRUD operations
- Test service history recording
- Test quotation template generation
- Test filtering by category and agent

### E2E Tests (Full Workflow)

- Agent creates new machine on service booking
- Agent services same machine again → quotation auto-populated
- Agent adjusts costs/parts → quotation submitted
- Service history shows all past services with parts used

## Database Considerations

### Indexes

- All indexes added and documented in model files
- `createdBy + serviceCount` for fast "my machines" lookup
- `machineId + servicedAt` for fast history lookup
- Compound unique index prevents duplicates

### Growth Projections

- Average service agent: 50-100 machines
- Each machine: 5-10 services/year average (more for gensets, less for one-time jobs)
- Each service: 3-5 parts tracked
- Per agent: ~500-1000 service history records/year

### Archival Strategy (Future)

- Service history older than 2 years could be archived
- Machine soft-delete if no services in 12 months
- Cost history exports for analysis

## Next Steps

1. **Frontend Phase 2**: Build Machine Library and Service Call integration
2. **Quotation Enhancement**: Implement auto-generation from machine history
3. **Testing**: Write test suites for all new endpoints
4. **Documentation**: Update user guide with "My Machines" workflow
5. **Migration**: Plan data migration for existing service calls to link machines (optional)

---

**Architecture approved by:** Derick
**Implementation started:** May 19, 2026
**Expected completion:** End of May 2026
