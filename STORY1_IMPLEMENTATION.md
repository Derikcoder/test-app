# Story 1 Implementation: Master + Branches Registration

## Phase 1: Model Updates (In Progress)

### Changes to `server/models/Customer.model.js`

1. **Add `isDepot` field to Site schema** — Mark hub locations
2. **Add hub-branch validation** — Ensure headOffice has exactly 1 depot, branches have none

### Changes to `server/controllers/customer.controller.js`

1. **Add branch validation logic** — When creating branch, validate parent exists
2. **Add hub validation** — When creating headOffice, ensure hub site has isDepot: true

### Changes to `client/src/components/RegisterNewCustomer.jsx`

1. **Add "Master Account" vs "Master + Branches" selector**
2. **If master + branches: show branch table with add/edit inline**
3. **Create branches as separate customer records during master registration**

### Changes to `client/src/components/HeadOfficeCustomer.jsx`

1. **Show master account overview**
2. **Show hub site with depot badge**
3. **Show branches table with add/edit/delete actions**
4. **Allow adding new branches from profile**

## Current Task

Updating Customer.model.js to add:
1. Site schema: `isDepot: Boolean` field
2. Customer validation: headOffice must have exactly 1 depot site, other types must have 0 depot sites

Status: In Progress (applying model updates)
