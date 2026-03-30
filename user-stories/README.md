# User Stories

This folder houses user stories organized by feature area and user type configuration. Each story file maps to a specific business capability and user role.

## Organization

- **LOAN_ASSET_TRACKING.md** — Epic: Multi-branch customer with fixed and loaned asset management and deployment tracking

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
| `businessCustomer?branches=false` | Single-location business with only fixed assets | — (planned) |
| `franchise?billing=serviceAddress` | Franchise network with independent locations | — (planned) |

## Story Status

| Story | Status | Priority |
|-------|--------|----------|
| LOAN_ASSET_TRACKING (Stories 1–8) | In Planning | High |

## Next Steps

1. Confirm hierarchy and asset-ownership model with stakeholders
2. Design master-branch UI wireframes
3. Extend Customer and create Asset models
4. Begin implementation with Story 1 (Master + Branches Registration)

---

**Last Updated**: March 30, 2026
