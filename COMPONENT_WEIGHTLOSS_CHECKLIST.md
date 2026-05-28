# Component Weightloss Checklist

Mission: make the UI codebase lean, reusable, and fast without changing behavior.

## Execution Rules (Every Component)
- [ ] Find top repeated className patterns in the target component.
- [ ] Extract only 1-2 highest-value patterns into shared semantic helpers in [client/src/styles/library/_components.scss](client/src/styles/library/_components.scss).
- [ ] Replace only exact duplicated patterns in the component.
- [ ] Keep behavior, spacing, and accessibility unchanged.
- [ ] Run lint and build after each component pass.
- [ ] Log completion in this checklist before moving on.

## Definition Of Done Per Component
- [ ] Top duplicated class strings reduced.
- [ ] No visual regressions in target area.
- [ ] Lint passes.
- [ ] Build passes.
- [ ] File marked complete in checklist.

## Phase 1: Highest Impact First

### 1) Service and Profile Heavy Components
- [x] [client/src/components/ServiceCallRegistration.jsx](client/src/components/ServiceCallRegistration.jsx)
- [x] [client/src/components/AgentProfile.jsx](client/src/components/AgentProfile.jsx)
- [x] [client/src/components/FieldAgentSelfProfile.jsx](client/src/components/FieldAgentSelfProfile.jsx)
- [x] [client/src/components/UserProfile.jsx](client/src/components/UserProfile.jsx)
- [x] [client/src/components/FieldServiceAgents.jsx](client/src/components/FieldServiceAgents.jsx)
- [x] [client/src/components/SiteInstructionModal.jsx](client/src/components/SiteInstructionModal.jsx)

### 2) Intake and Registration Flows
- [x] [client/src/components/RegisterNewCustomer.jsx](client/src/components/RegisterNewCustomer.jsx)
- [x] [client/src/components/Register.jsx](client/src/components/Register.jsx)
- [x] [client/src/components/Login.jsx](client/src/components/Login.jsx)
- [x] [client/src/components/ForgotPassword.jsx](client/src/components/ForgotPassword.jsx)
- [x] [client/src/components/ResetPassword.jsx](client/src/components/ResetPassword.jsx)

## Phase 2: Operational and Data Views
- [x] [client/src/components/Quotations.jsx](client/src/components/Quotations.jsx)
- [x] [client/src/components/InvoiceApprovalPage.jsx](client/src/components/InvoiceApprovalPage.jsx)
- [x] [client/src/components/ServiceCalls.jsx](client/src/components/ServiceCalls.jsx)
- [x] [client/src/components/Customers.jsx](client/src/components/Customers.jsx)
- [x] [client/src/components/CustomerPortal.jsx](client/src/components/CustomerPortal.jsx)
- [x] [client/src/components/PublicAgentProfile.jsx](client/src/components/PublicAgentProfile.jsx)
- [x] [client/src/components/CustomerBillingPanel.jsx](client/src/components/CustomerBillingPanel.jsx)
- [x] [client/src/components/CustomerAssetHistoryPage.jsx](client/src/components/CustomerAssetHistoryPage.jsx)

## Phase 3: Machine and Shared UI Surface
- [x] [client/src/components/MachineLibrary.jsx](client/src/components/MachineLibrary.jsx)
- [x] [client/src/components/MachineSelector.jsx](client/src/components/MachineSelector.jsx)
- [x] [client/src/components/Sidebar.jsx](client/src/components/Sidebar.jsx)
- [x] [client/src/components/shared/PageStates.jsx](client/src/components/shared/PageStates.jsx)

## Phase 4: Customer Variant Screens
- [x] [client/src/components/HeadOfficeCustomer.jsx](client/src/components/HeadOfficeCustomer.jsx)
- [x] [client/src/components/BranchCustomer.jsx](client/src/components/BranchCustomer.jsx)
- [x] [client/src/components/FranchiseCustomer.jsx](client/src/components/FranchiseCustomer.jsx)
- [x] [client/src/components/SingleBusinessCustomer.jsx](client/src/components/SingleBusinessCustomer.jsx)
- [x] [client/src/components/ResidentialCustomer.jsx](client/src/components/ResidentialCustomer.jsx)

## Phase 5: customerProfile Subfolder
- [x] [client/src/components/customerProfile/ProfileLayout.jsx](client/src/components/customerProfile/ProfileLayout.jsx)
- [x] [client/src/components/customerProfile/CustomerInfoGrid.jsx](client/src/components/customerProfile/CustomerInfoGrid.jsx)
- [x] [client/src/components/customerProfile/QuotationsSection.jsx](client/src/components/customerProfile/QuotationsSection.jsx)
- [x] [client/src/components/customerProfile/ServiceCallHistorySection.jsx](client/src/components/customerProfile/ServiceCallHistorySection.jsx)
- [x] [client/src/components/customerProfile/shared.jsx](client/src/components/customerProfile/shared.jsx)

## Already Completed In This Mission
- [x] [client/src/components/CreateQuoteModal.jsx](client/src/components/CreateQuoteModal.jsx)
- [x] [client/src/components/QuotationApprovalPage.jsx](client/src/components/QuotationApprovalPage.jsx)
- [x] [client/src/components/CustomerSelfServicePanel.jsx](client/src/components/CustomerSelfServicePanel.jsx)

## Lightweight Speed Guardrails
- [x] Keep helper class additions small and semantic.
- [x] Prefer reusing existing helpers before creating new ones.
- [x] No broad redesigns during refactor passes.
- [x] No behavior changes without explicit request.
- [x] Re-check bundle output after each phase.

## Phase Completion Log
- [x] Phase 1 complete
- [x] Phase 2 complete
- [x] Phase 3 complete
- [x] Phase 4 complete
- [x] Phase 5 complete

## Final Mission Exit Criteria
- [x] All component checkboxes complete.
- [x] Lint green.
- [x] Build green.
- [x] No visual regressions in smoke test.
- [x] Shared style helpers remain clean and intentional.
