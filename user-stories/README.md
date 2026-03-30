# User Stories

This folder houses user stories organized by feature area and user type configuration. Each story file maps to a specific business capability and user role.

## Organization

- **LOAN_ASSET_TRACKING.md** — Epic: Multi-branch customer with fixed and loaned asset management and deployment tracking
- **RESIDENTIAL_TURNKEY_SERVICES.md** — Epic: Single-platform residential booking across mechanical, electrical, plumbing, and property maintenance

## User Type Configurations

As we evolve the system, user types are defined with configuration flags:

```
userType = businessCustomer
  ?branches=true          # Multi-branch support (headOffice + branches)
  ?headOffice=true        # Designated hub/depot location
  ?billing=serviceAddress # Billing address linked to service address
```

### Example Configurations

| Config | Use Case | Stories |
|--------|----------|---------|
| `businessCustomer?branches=true;headOffice=true;billing=serviceAddress` | Distributed business with hub, branches, fixed & loan assets | LOAN_ASSET_TRACKING |
| `residentialCustomer?assetTracking=optional;addressPersistence=true;services=all` | Homeowner with unified turnkey property maintenance booking | RESIDENTIAL_TURNKEY_SERVICES |
| `businessCustomer?branches=false` | Single-location business with only fixed assets | — (planned) |
| `franchise?billing=serviceAddress` | Franchise network with independent locations | — (planned) |

## Story Status

| Story | Status | Priority |
|-------|--------|----------|
| LOAN_ASSET_TRACKING (Stories 1–8) | In Planning | High |
| RESIDENTIAL_TURNKEY_SERVICES (Unified Story + Subtasks) | In Planning | High |

## Next Steps

1. Confirm hierarchy and asset-ownership model with stakeholders
2. Design master-branch UI wireframes
3. Define residential service-category templates and booking payload rules
4. Add unified residential timeline view and optional asset tagging

---

**Last Updated**: March 30, 2026
