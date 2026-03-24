# Vite Config and Lazy Loading Strategy

## Objective

Reduce initial bundle size and eliminate the Vite chunk-size warning by splitting route-level code and isolating heavy dependencies from the app entry bundle.

## Current Baseline (Observed)

- Build warning: chunk larger than 500 kB after minification.
- Main JS chunk: `dist/assets/index-Rgr6PRK4.js` (~590.9 kB minified, ~145.9 kB gzip).
- Visual analysis reports generated:
  - `client/bundle-report.html`
  - `client/bundle-report.json`

## Key Bundle Drivers

Top contributors in current main chunk:

1. `@react-google-maps/api/dist/esm.js` (~299 kB rendered)
2. `react-dom.production.min.js` (~133 kB rendered)
3. `client/src/components/RegisterNewCustomer.jsx` (~64 kB rendered)
4. `client/src/components/CreateQuoteModal.jsx` (~54 kB rendered)
5. `client/src/components/ServiceCalls.jsx` (~54 kB rendered)

## Root Cause

`client/src/App.jsx` currently imports all route components eagerly. This causes most app screens and heavy libraries (including Google Maps) to be bundled into one entry chunk.

## Strategy Phases

### Phase 1: Route-Level Lazy Loading (Primary)

Refactor `client/src/App.jsx` to use `React.lazy` + `Suspense` for route components.

Targets:

- Public routes
  - Register
  - Login
  - ForgotPassword
  - ResetPassword
  - InvoiceApprovalPage
- Protected routes
  - UserProfile
  - Quotations
  - FieldServiceAgents
  - AgentProfile
  - Customers
  - RegisterNewCustomer
  - HeadOfficeCustomer
  - BranchCustomer
  - FranchiseCustomer
  - SingleBusinessCustomer
  - ResidentialCustomer
  - ServiceCalls

Expected impact:

- Smaller initial bundle
- Faster first load
- Better browser caching due to route-specific chunks

### Phase 2: Vendor Chunk Optimization (Secondary)

Add `build.rollupOptions.output.manualChunks` in `client/vite.config.js`.

Proposed chunk groups:

- `react-vendor`: `react`, `react-dom`
- `router-vendor`: `react-router-dom`, `@remix-run/router`
- `http-vendor`: `axios`
- `maps-vendor`: `@react-google-maps/api`

Expected impact:

- Stable vendor caching between releases
- Better diff-based deploys
- Reduced churn in application chunks

### Phase 3: Validate and Compare

After each phase:

1. Run `npm run build` in `client`.
2. Regenerate visual report:
   - `npx vite-bundle-visualizer -o bundle-report.html --open false`
   - `npx vite-bundle-visualizer -t raw-data -o bundle-report.json --open false`
3. Compare:
   - New entry chunk size
   - Number of emitted JS chunks
   - Largest remaining contributors

Success criteria:

- Main entry chunk below 500 kB minified (target)
- Google Maps code no longer in initial entry path for non-customer-registration flows

## Implementation Notes

- Keep route paths unchanged to avoid navigation regressions.
- Preserve `ProtectedRoute` behavior and loading UX.
- Use a single shared suspense fallback to avoid repetitive code.
- Avoid changing business logic during this phase; this is packaging/performance-only.

## Proposed Execution Order

1. Implement lazy loading in `client/src/App.jsx`.
2. Build + verify no route breakage.
3. Add `manualChunks` in `client/vite.config.js`.
4. Build + compare report output.
5. Capture final measurements in commit message and/or docs.
