// @file MACHINES_FRONTEND_INTEGRATION.md
// @description Complete guide for integrating Machine Library frontend with Service Call Registration

// # Machines Feature - Frontend Phase 2 Integration Guide

// ## Overview
// This document details the frontend implementation of Phase 2: building Machine Library and Service Call integration.
// All backend APIs are production-ready and documented in MACHINES_FEATURE_IMPLEMENTATION.md.

// ## Components Created

// ### 1. MachineLibrary.jsx
// **Location:** `/client/src/components/MachineLibrary.jsx`
// **Purpose:** Main machine registry view for service agents
// **Route:** `/machines` (Protected - requires authentication)

// **Features:**
// - Display all machines for current agent sorted by service count
// - Filter machines by service category
// - Show machine specifications (make, model, capacity, site)
// - Display service statistics (total services, last serviced date)
// - View full service history in modal with details
// - Show parts used, recommendations, issues, labour hours, costs

// **API Endpoints Used:**
// - `GET /api/machines` - Fetch all machines for agent
// - `GET /api/machines/category/:category` - Filter by category
// - `GET /api/machines/:id/service-history` - Get service history for modal

// **UI Pattern:**
// - Responsive grid layout with machine cards
// - Click card to open detailed modal
// - Category filter buttons at top
// - Loading and empty states
// - Premium glass-morphism styling with brand colors

// ### 2. MachineSelector.jsx
// **Location:** `/client/src/components/MachineSelector.jsx`
// **Purpose:** Embedded machine selection component for ServiceCallRegistration
// **Integration:** Imported and used within ServiceCallRegistration form

// **Features:**
// - Optional machine selection from agent's machine library
// - Auto-filter machines by selected service category
// - Display selected machine with key specs highlighted
// - Fetch and show quotation template from last service
// - Pre-fill equipment details when machine selected
// - Clear selection to create new machine record
// - Responsive dropdown with search/filter

// **Props:**
// - `userToken` (string) - JWT token for API calls
// - `serviceCategory` (string) - Current service category for filtering
// - `onMachineSelected` (function) - Callback when machine selected, receives { machineId, machine, quotationTemplate }
// - `onMachineDeselected` (function) - Callback when selection cleared
// - `selectedMachineId` (string) - Optional current selection for UI state

// **API Endpoints Used:**
// - `GET /api/machines` - Fetch all machines
// - `GET /api/machines/category/:category` - Filter by category
// - `GET /api/machines/:id/quotation-template` - Get template for pre-fill

// ## Integration Steps

// ### Step 1: Import MachineSelector in ServiceCallRegistration.jsx

```jsx

import MachineSelector from './MachineSelector';
```

// ### Step 2: Add State for Machine Selection

```jsx
const [selectedMachine, setSelectedMachine] = useState(null);
const [selectedMachineId, setSelectedMachineId] = useState('');
const [quotationTemplate, setQuotationTemplate] = useState(null);
```

// ### Step 3: Create Handler for Machine Selection

```jsx
const handleMachineSelected = (machineData) => {
  const { machineId, machine, quotationTemplate } = machineData;
  
  setSelectedMachineId(machineId);
  setSelectedMachine(machine);
  setQuotationTemplate(quotationTemplate);
  
  // Auto-fill form fields from machine
  setFormData((prev) => ({
    ...prev,
    siteName: machine.siteName || prev.siteName,
    generatorMakeModel: machine.generatorMakeModel || prev.generatorMakeModel,
    machineModelNumber: machine.machineModelNumber || prev.machineModelNumber,
    generatorCapacityKva: machine.generatorCapacityKva 
      ? String(machine.generatorCapacityKva) 
      : prev.generatorCapacityKva,
    // Only auto-fill if machine has these
    ...(machine.serialNumber && { serialNumber: machine.serialNumber }),
  }));
};

const handleMachineDeselected = () => {
  setSelectedMachineId('');
  setSelectedMachine(null);
  setQuotationTemplate(null);
  // Form fields remain as entered by user
};
```

// ### Step 4: Render MachineSelector in Form

// Place this AFTER category selection but BEFORE equipment details section:
// ```jsx
// {!isGeneralMaintenance && (
```

// ### Step 5: Link Machine to Service Call
// When building payload to submit, include:
```jsx
const payload = {
  // ... existing fields ...
  machineId: selectedMachineId || null, // null if creating new machine
  // ... rest of payload ...
};
```

// ### Step 6: Update Routes in App.jsx
// Add MachineLibrary route:

```jsx
import MachineLibrary from './components/MachineLibrary';

// In Routes:
<Route
  path="/machines"
  element={
    <ProtectedRoute>
      <MachineLibrary />
    </ProtectedRoute>
  }
/>

```

// ✅ **ALREADY DONE** - Check App.jsx lines 39 and 315-322

// ## Usage Flows
<!-- /  -->
// ### Flow 1: Service Agent Registers Service for Known Machine
// 1. Agent navigates to Service Call Registration
// 2. Selects service category and service type
// 3. MachineSelector appears with machines in that category
// 4. Agent selects existing machine from list
// 5. Form auto-fills: site name, make/model, capacity
// 6. Quotation template displays (previous labour hours, parts, costs)
// 7. Agent can adjust costs based on current conditions
// 8. Completes remaining form fields
// 9. Submits service call with machineId linked
/
// ### Flow 2: Service Agent Registers Service for Unknown Machine (First-time)
// 1. Agent navigates to Service Call Registration
// 2. Selects service category and service type
// 3. MachineSelector shows no matching machines
// 4. Agent skips machine selection
// 5. Enters machine details manually in equipment fields
// 6. Completes and submits form
// 7. Post-submission: Machine record auto-created from service call details
// 8. Future services for this machine will find it in selector
<!-- /  -->
// ### Flow 3: Agent Browsing Machine Library
// 1. Agent clicks "My Machines" navigation link
// 2. MachineLibrary displays all machines they've worked on
// 3. Agent filters by service category (optional)
// 4. Clicks machine card to see service history modal
// 5. Modal shows:
//    - Machine specifications
//    - Complete service timeline
//    - Parts used in each service with availability notes
//    - Cost history (labour + parts)
//    - Technical recommendations from previous services
<!-- /  -->
// ## Data Flow Diagram
<!-- /  -->
// ```
// ServiceCallRegistration.jsx
//   ↓
//   └─→ [Service Category Selected]
//       ↓
//       └─→ MachineSelector.jsx
//           ├─ Fetches: GET /api/machines?category=X
//           ├─ Displays: Machine list for agent
//           ├─ Agent selects machine
//           ├─ Fetches: GET /api/machines/:id/quotation-template
//           ├─ Returns: Last service data (labour, parts, costs)
//           └─→ onMachineSelected callback
//               ├─ Sets: selectedMachineId, selectedMachine, quotationTemplate
//               └─ Auto-fills: Form fields with machine specs
// 
// Service Call Submitted
//   ↓
//   └─→ POST /api/service-calls
//       ├─ Includes: machineId (if machine selected)
//       ├─ Or: machineId = null (if new machine)
//       └─→ Backend creates/links Machine record
//
// Service Completion (Future)
//   ↓
//   └─→ POST /api/machines/:id/service-history
//       ├─ Records: Parts used, labour hours, cost, recommendations
//       ├─ Updates: Machine.serviceCount, Machine.lastServicedAt
//       └─→ Machine now visible in future MachineSelector queries
// ```
// 
// ## Quotation Template Structure
// 
// When a machine is selected, the template provides:
// ```javascript
// {
//   lastService: {
//     date: "2024-12-01",
//     labourHours: 4,
//     partsUsed: [
//       {
//         description: "Spark plug set",
//         quantity: 1,
//         actualBrand: "NGK",
//         preferredBrand: "NGK",
//         availabilityNote: "Stock available",
//         qualityAssessment: "OEM spec"
//       },
//       // ... more parts
//     ]
//   },
//   suggestedCosts: {
//     labour: 800, // Last labour cost (editable)
//     parts: 1200  // Last parts cost (reference only)
//   },
//   note: "Machine in good condition, no issues noted"
// }
/```
// 
// Agent can then:
// - Pre-fill labour hours from template (4 hrs)
// - Review previous parts used for ordering
// - Adjust labour cost based on current market rates
// - Update parts list if availability has changed
// 
// ## Navigation & UI Integration
// 
// ### Sidebar Navigation
// Add link to MachineLibrary in main sidebar:
// ```jsx
// <nav>
//   {/* ... existing nav items ... */}
//   <Link to="/machines" className="nav-link">
//     📋 My Machines
//   </Link>
// </nav>
// ```
// 
// ### Mobile Responsive
// - MachineLibrary: Stacked cards on mobile, 2-3 column grid on desktop
// - MachineSelector: Touch-friendly dropdown with large tap targets
// - Modal: Full viewport height, scrollable content
// 
// ### Accessibility
// - Semantic HTML (button, label, select)
// - ARIA labels on modals and buttons
// - Keyboard navigation for machine selection dropdown
// - Loading states with accessible spinner
// - Error messages in plain language
// 
// ## Testing Checklist
// 
// - [ ] MachineLibrary loads and displays machines for current agent

### Role-Scoped Index/Lookup Validation

- [ ] Agent: Only sees their own machines in MachineLibrary and MachineSelector ("My Machines" view)
- [ ] Customer: Only sees machines at their site (if customer UI present)
- [ ] SuperAdmin: Can see all machines, filter by agent/customer, and audit system-wide (if superAdmin UI present)

| Persona | Component | Check | Expected | Actual | Status |
|---|---|---|---|---|---|
|Agent|MachineLibrary|Only own machines visible| | |PASS/FAIL|
|Agent|MachineSelector|Only own machines selectable| | |PASS/FAIL|
|Customer|MachineLibrary|Only own site machines visible| | |PASS/FAIL|
|SuperAdmin|MachineLibrary|All machines, all filters| | |PASS/FAIL|

- [ ] Category filter reduces machines correctly
- [ ] Clicking machine card opens modal with history
- [ ] Service history shows parts used with availability notes
- [ ] MachineSelector appears in ServiceCallRegistration (when category selected)
- [ ] Selecting machine auto-fills form fields
- [ ] Quotation template displays in selector (previous labour/costs/parts)
- [ ] Clearing selection resets fields
- [ ] Form submission includes machineId when machine selected
- [ ] Form submission works with machineId = null (new machine)
- [ ] Mobile responsive: Cards stack, modal scrolls
- [ ] Accessibility: Tab navigation works, labels present
- [ ] Error handling: API errors show user-friendly messages
- [ ] Loading states: Spinners show while fetching

## Next Steps (Phase 3 & 4)

### Phase 3: Quotation Auto-Generation

- Enhance CreateQuoteModal to accept quotationTemplate data
- Pre-populate form fields from template
- Allow agent to adjust costs pre-submission
- Link quotation to machine for history tracking

### Phase 4: Service Completion Flow

- Create ServiceHistoryRecorder component
- Show after service marked complete
- Capture: parts used, labour hours, issues, recommendations
- Call POST /api/machines/:id/service-history to record
- Update machine.serviceCount, lastServicedAt automatically
- Show confirmation with updated machine history

### Phase 3-4: Pricing Integration

- Google Search integration for current part prices
- Supplier API connections for real-time availability
- Predictive costing with regional adjustments
- Historical trend analysis for market conditions

## Styling & Design System

### CSS Classes Used

- `.glass-card` - Machine card container
- `.glass-heading` - Machine type title
- `.executive-title` - Page header
- `.executive-subtitle` - Page description
- `.dark-field-input` - Form input styling
- `.dark-label` - Form label styling

### Color Scheme

- Primary: #05198C (deep blue)
- Secondary: #FFFB28 (bright yellow)
- Accent: #00D9FF (cyan) for highlights
- Background: Gradient from slate-50 to slate-100 (light mode)

### Animations

- Card hover: Shadow increase, border glow
- Modal open: Fade + scale
- Loading spinner: Smooth rotation
- Button hover: Background color shift

## API Reference

For complete API details, see MACHINES_FEATURE_IMPLEMENTATION.md

### GET /api/machines

Returns: Array of Machine objects for current agent
Response: `[{ _id, serviceCategory, machineType, serviceCount, ... }]`

### GET /api/machines/category/:category

Returns: Filtered array by serviceCategory
Response: `[{ _id, serviceCategory, machineType, ... }]`

### GET /api/machines/:id/quotation-template

Returns: Template for quotation pre-population
Response: `{ lastService: {...}, suggestedCosts: {...}, note: "..." }`

### GET /api/machines/:id/service-history

Returns: Array of service records for machine
Response: `[{ serviceType, servicedAt, totalServiceCost, partsUsed: [...] }]`

### POST /api/service-calls

Include: `machineId: "UUID"` or `machineId: null`

## Troubleshooting

**Issue: MachineSelector not showing machines**

- Check: API response with `GET /api/machines?category=X`
- Check: User has token and is authenticated
- Check: serviceCategory prop is being passed correctly

**Issue: Quotation template not loading**

- Check: Machine has previous service history
- Check: Template endpoint returns data: `GET /api/machines/:id/quotation-template`
- Check: selectedMachine._id matches request

**Issue: Form fields not auto-filling**

- Check: handleMachineSelected is being called
- Check: Machine object has required fields (siteName, generatorMakeModel, etc.)
- Check: setFormData is updating state correctly

**Issue: Modal not showing service history**

- Check: Service history endpoint returns array: `GET /api/machines/:id/service-history`
- Check: History records have servicedAt and partsUsed fields
- Check: Modal is setting historyLoading state correctly

## Performance Considerations

- Machine list is filtered client-side after fetch (small data set)
- Service history loaded only when modal opened (lazy load)
- Quotation template fetched on machine selection (not in list)
- Consider pagination if agent has >50 machines (future optimization)
- Service history items limited to 20 recent (future optimization)

## Security Notes

- All API calls include JWT token in Authorization header
- Machine data scoped to authenticated user (backend validates)
- Service history only visible for user's own machines
- No sensitive PII exposed in machine cards (only site name, make/model)

---

**Document Version:** 1.0  
**Last Updated:** 2026-04-11  
**Related Documents:** MACHINES_FEATURE_IMPLEMENTATION.md, ServiceCallRegistration.jsx, MachineLibrary.jsx

// This file is documentation only - no code to run
