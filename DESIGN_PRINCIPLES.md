# Appatunid Design Principles

> **Enterprise-Grade Frontend Governance**
> Version: 1.0 | Last Updated: April 8, 2026

---

## 1. Philosophy

This document defines the design and code-style standards for the Appatunid Field Service Management SaaS platform. These rules are not optional suggestions — they are binding conventions that ensure:

- **Visual consistency** across all screens regardless of contributor
- **Maintainability** at scale (dozens of components, months of iteration)
- **Clarity for operators** who make time-sensitive decisions in the field
- **Institutional memory** preserved across developer sessions

> "Consistency is not a constraint — it is the product of discipline, and discipline is what separates professional software from functional scripts."

### Core Tenets

1. **Don't repeat yourself in CSS.** If a Tailwind string appears more than once, it belongs in `index.css`.
2. **Meaning over decoration.** Every color, spacing, and typography decision must have a reason.
3. **Operator-first design.** UI decisions prioritize clarity for stress-loaded, field-working users.
4. **Single source of truth.** One file defines the class, one guide defines the color, one doc defines the rule.

---

## 2. CSS Architecture

### 2.1 The Single-File Rule

All shared styles live in `client/src/index.css`. No other CSS files should exist in the frontend (excluding Tailwind/PostCSS config).

**If you write the same Tailwind string twice across any two files — it must become a class in `index.css`.**

### 2.2 `index.css` Block Structure

The file is organized as Tailwind layers:

```
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Followed by **two `@layer components` blocks**:

| Block | Contents |
|---|---|
| **Block 1: Glass System** (~48–377) | All `.glass-*` classes — the Glassmorphism design system |
| **Block 2: Shared Utility Classes** (~379–556) | 19 shared dark-surface utility classes (`.dark-field-input`, `.btn-action-*`, etc.) |

> **Critical rule:** Any new class must be added inside one of these two blocks. Never write bare CSS outside an `@layer` block.

### 2.3 Adding a New Shared Class — Required Procedure

Before writing any new reusable Tailwind string:

1. **Grep first** — `grep -rn "your-tailwind-string" client/src/components/` — check usage count.
2. **If it appears 2+ times**, create a class in Block 2 of `index.css`.
3. **Name the class** using the semantic naming conventions in §5.
4. **Run the CSS test suite** — `cd client && npx vitest run src/__tests__/css/index.css.test.js`
5. **Add the class name** to the `EXPECTED_CLASSES` array in the test file.
6. **Replace all inline instances** across components (`grep -rn "old-string" client/src/components/`).
7. **Verify ban-list** — the test suite checks 12 previously-extracted patterns are no longer inline.

### 2.4 The `@apply` Rules

- Every `@apply` directive **must end with a semicolon**.
- `@apply` is only valid inside the `@layer components` blocks — never at file root.
- Multi-utility `@apply` lines may chain utilities with spaces: `@apply flex items-center gap-2;`

### 2.5 CSS Test Suite

File: `client/src/__tests__/css/index.css.test.js`
Run: `cd client && npx vitest run src/__tests__/css/index.css.test.js`

The suite enforces:
- **Brace balance** — the file must have symmetric `{` and `}` counts
- **Block count** — at least one `@layer components` block must exist
- **`@apply` scope** — no `@apply` outside a block
- **`@apply` semicolons** — all `@apply` directives end with `;`
- **Class inventory** — 24 named classes must be defined (failure = class was deleted or renamed)
- **No inline ban-list** — 12 extracted patterns cannot appear inline in any component
- **Usage sanity** — key classes have minimum usage counts (e.g., `dark-field-input ≥ 30`)

**All 45 tests must pass before any commit touching `index.css` or component files.**

---

## 3. Component Design Patterns

### 3.1 Page Wrapper Pattern

| Class | When to Use |
|---|---|
| `.page-center` | Authentication screens, empty-state pages, any full-screen centered layout |
| `.page-body` | All content pages with top/side navigation (main app screens) |

> Do not use raw `min-h-screen` or background gradient strings outside these two classes.

### 3.2 Card Hierarchy

```
.glass-card                  ← top-level page section card
  └── .sub-card              ← secondary grouping within a glass-card
        └── raw content      ← inputs, text, tables
```

- Use `.glass-card` for primary sections (form panels, data sections).
- Use `.sub-card` for nested groups within a card (e.g., address block inside a customer form).
- Never nest a `glass-card` inside a `glass-card` — escalate to the glass system document if depth increases.

### 3.3 Form Field Pattern

| Surface | Field Class | Label Class |
|---|---|---|
| Dark backgrounds (app screens) | `.dark-field-input` | `.dark-label` |
| Glass cards / Glassmorphism forms | `.glass-form-input` | `.glass-label` |

> Never use bare `bg-white/10 border border-white/20 text-white px-4 py-3 rounded-lg` inline — this is `.dark-field-input`.

**Section header pattern** (above a group of fields): `.field-kicker`

**Table column headers** (dark tables): `.th-yellow` (default) or `.th-cyan` (agent-scoped tables)

### 3.4 Button Variants

All buttons use the base `.btn-action` class plus a color modifier:

| Class | Semantic Purpose |
|---|---|
| `.btn-action-amber` | Service-call actions, warnings, primary CTA on amber-scoped screens |
| `.btn-action-cyan` | Agent actions, field operations |
| `.btn-action-emerald` | Invoice/pro-forma actions, save/complete |
| `.btn-action-blue` | General navigation, document actions |
| `.btn-action-green` | Success / approval |
| `.btn-action-orange` | Quotation actions |

> Button color must match the entity's semantic color (see §4). Never use an emerald button on a service-call screen.

### 3.5 Loading States

| Class | When to Use |
|---|---|
| `.spinner-lg` | Full-page or section loading state |
| `.spinner-sm` | Inline or button-embedded loading state |

> Never write `animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400` inline.

### 3.6 Collapsible Sections

Use `.collapsible-hd` for the header row of any expandable/collapsible section.

---

## 4. Semantic Color System

Every entity in the system has a canonical color. This color is used consistently across:
- Sidebar navigation icons and labels
- Page header entity chips
- Table header classes (`.th-yellow`, `.th-cyan`)
- Button variant selection
- Badge and status indicators

### Entity Color Map

| Color | Entity / Purpose | Tailwind Tokens |
|---|---|---|
| **Cyan** | Field Agents, operational role indicator | `text-cyan-300`, `border-cyan-500`, `bg-cyan-900/30` |
| **Indigo** | Customers (all types) | `text-indigo-300`, `border-indigo-500` |
| **Amber** | Service Calls, warnings | `text-amber-300`, `border-amber-500`, `bg-amber-900/30` |
| **Orange** | Quotations | `text-orange-300`, `border-orange-500` |
| **Emerald** | Invoices, Pro-Forma | `text-emerald-300`, `border-emerald-500`, `bg-emerald-900/30` |
| **Red** | Errors, danger actions, delete | `text-red-400`, `border-red-500`, `bg-red-900/30` |
| **Fuchsia** | Super Admin role indicator, governance mode | `text-fuchsia-300`, `border-fuchsia-500` |
| **Yellow** | Brand accent, primary highlight | `text-yellow-300`, `border-yellow-400` |

### Brand Colors

| Role | Hex | Usage |
|---|---|---|
| **Primary Brand** | `#05198C` (Deep Blue) | Brand hero elements, primary accent backgrounds |
| **Secondary Brand** | `#FFFB28` (Bright Yellow) | CTAs, spinner accents, highlights |

### Color Rules

1. **A screen's dominant color must match its entity** — service-call screens are amber, agent screens are cyan.
2. **Never mix entity colors on the same screen** unless showing a relationship (e.g., a service call assigned to an agent may show both amber and cyan).
3. **Red is reserved for destructive actions and error states.** Do not use red for any positive or neutral action.
4. **Yellow/amber CTA** (`text-yellow-300`, `bg-yellow-400`) are the only acceptable primary-action highlights on dark backgrounds.

---

## 5. Naming Conventions

### 5.1 CSS Class Names

Classes follow a **BEM-inspired flat-utility naming** pattern:

| Pattern | Example | When to Use |
|---|---|---|
| `noun-adjective` | `dark-label`, `dark-field-input` | Element type + surface context |
| `noun-size` | `spinner-lg`, `spinner-sm` | Element type + size variant |
| `block-element` | `btn-action`, `btn-action-amber` | Base + modifier |
| `layout-purpose` | `page-center`, `page-body` | Layout role |
| `noun-purpose` | `field-kicker`, `col-label` | Semantic role |

> Avoid generic names like `.card`, `.input`, `.label`. Always include context (surface, entity, or purpose).

### 5.2 React Component Files

- **PascalCase** for all component files: `AgentProfile.jsx`, `CreateQuoteModal.jsx`
- **No abbreviations** in component names: `ServiceCallRegistration` not `SCReg`
- **Modal suffix** for all modal components: `CreateQuoteModal`, `SiteInstructionModal`
- **Page suffix** for public/standalone pages: `InvoiceApprovalPage`

### 5.3 Function and Variable Names

- **camelCase** for all functions and variables
- **`handle` prefix** for event handlers: `handleSubmit`, `handleDeleteAgent`
- **`is`/`has` prefix** for booleans: `isLoading`, `hasPhone`, `isSuperAdmin`
- **`fetch`/`load` prefix** for async data functions: `fetchAgentData`, `loadServiceCalls`
- **Descriptive names** — never `data`, `result`, `res` as final variable names in business logic

### 5.4 API Route Naming

- **RESTful plural nouns**: `/api/agents`, `/api/customers`, `/api/service-calls`
- **Kebab-case** for multi-word routes: `/api/service-calls`, `/api/field-agents`
- **Action sub-routes** for non-CRUD operations: `/api/auth/forgot-password`, `/api/agents/:id/assign`

---

## 6. Accessibility Standards

### 6.1 Color Contrast

- All text on dark backgrounds must meet **WCAG AA minimum** (4.5:1 for normal text, 3:1 for large text).
- `text-white/55` (`.field-kicker`) is the minimum opacity for decorative labels — never go below 55% opacity for visible text.
- Error messages must use `text-red-400` (not `text-red-200`) on dark surfaces.

### 6.2 Keyboard Navigation

- All interactive elements (buttons, inputs, links) must be reachable via Tab key.
- Modals must trap focus while open and return focus to the trigger on close.
- Dropdowns and collapsible sections must support Enter/Space to toggle.

### 6.3 Semantic HTML

- Use `<button>` for actions, `<a>` for navigation — never reverse these.
- Form inputs must have associated `<label>` elements (via `htmlFor`/`id` pair).
- Use `role="alert"` for error messages that appear after user action.
- Use `aria-label` on icon-only buttons.

### 6.4 Screen Reader Considerations

- Loading spinners must include `aria-label="Loading"` or visually-hidden text.
- Status chips (role badge, entity chip) should use `aria-label` for clarity.
- Modals must have `role="dialog"` and `aria-modal="true"`.

---

## 7. Performance Standards

### 7.1 No Inline Styles in Render Paths

- Never use the `style={{ }}` prop for layout or visual properties in rendered components.
- Exception: dynamically computed values (e.g., calculated widths, progress bar percentages).
- Tailwind `className` strings are the correct solution — extract to `index.css` if repeated.

### 7.2 Memoization

- Wrap expensive computations in `useMemo()` when inputs change rarely but computation is heavy.
- Wrap stable callback props in `useCallback()` when passed to child components.
- Do **not** memoize trivially cheap operations — memoization has overhead.

### 7.3 Lazy Loading

- All page-level route components must be lazy-loaded: `const Page = lazy(() => import('./Page'))`.
- Heavy modal components (e.g., `CreateQuoteModal`) may also be lazy-loaded when not visible.
- See `VITE_LAZY_LOADING_STRATEGY.md` for the full lazy-loading implementation plan.

### 7.4 Bundle Discipline

- Do not add new npm packages for functionality that can be implemented with ~20 lines of native code.
- Date formatting: use `Intl.DateTimeFormat` — do not add `moment.js` or `date-fns`.
- UUID generation: use `crypto.randomUUID()` — do not add `uuid` package.
- Check `bundle-report.html` (at `client/bundle-report.html`) after any new dependency.

---

## 8. State Management Patterns

### 8.1 Local vs. Global State

- **Component-local state** (`useState`): form inputs, UI toggles, loading/error flags for that component.
- **Global state** (`AuthContext`): authentication status, current user object, JWT token.
- **No Redux or Zustand** — the current complexity level does not justify it.

### 8.2 Data Fetching Pattern

```jsx
// Standard async fetch pattern — use this every time
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
  const fetchData = async () => {
    try {
      const response = await api.get('/endpoint');
      setData(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };
  fetchData();
}, []);
```

### 8.3 Form State Pattern

- Controlled inputs only — always bind `value` + `onChange`.
- Form state as a single object: `const [form, setForm] = useState({ field1: '', field2: '' })`.
- Reset pattern: `setForm(initialFormState)` where `initialFormState` is defined as a constant outside the component.

---

## 9. Testing Standards

### 9.1 CSS Test Suite (Required)

Run before every commit that touches `index.css` or component files:

```bash
cd client && npx vitest run src/__tests__/css/index.css.test.js
```

All 45 tests must pass. A failing test means either:
- A class was deleted or renamed without updating the test inventory
- An inline Tailwind pattern was added that matches the ban-list
- CSS syntax was broken (brace mismatch, bad `@apply`)

### 9.2 Component Tests

- New modal components must have a corresponding test file in `client/src/__tests__/components/`.
- Minimum test coverage for modals: renders without crash, shows loading state, handles error state.
- Use the existing `Login.test.jsx` and `CreateQuoteModal.test.jsx` as patterns.

### 9.3 Backend Tests

- New API endpoints must have corresponding tests in `server/tests/`.
- Tests use Jest with `babel.config.cjs` for ESM support.
- Run: `cd server && npm test`

### 9.4 Testing Philosophy

> A test that can only pass when things work correctly is a regression net — not a liability. Write the test first on any complex logic, and always write it after any bug fix to prevent the bug from returning.

---

## 10. Documentation Standards

### 10.1 When to Update `AI_ASSISTANT_GUIDE.md`

Update the "Recent Changes" section at the top of the file whenever:
- A new API endpoint or route is added
- A database model is changed
- A new React component is created or deleted
- A new npm dependency is added
- Environment variables are added or renamed

Format for each entry:
```markdown
### Session: [Date] — [Short Description]
**Files Modified:**
- `path/to/file.jsx` — description of change
**New Dependencies:** (if any)
**Notes:** any important caveats
```

### 10.2 When to Update `PROJECT-STRUCTURE.md`

Update when:
- A new file is added to `client/src/` or `server/`
- A file is deleted or renamed
- The architecture of a component changes significantly (new props, new mode)

### 10.3 When to Update `DESIGN_PRINCIPLES.md` (This File)

Update when:
- A new design pattern is established and used in 2+ components
- A new entity color is added to the semantic map
- A new CSS class type or naming pattern is introduced
- An accessibility rule is added or strengthened

### 10.4 When to Update `APPATUNID_UI_QUICKREF.md`

Update when:
- A new CSS class is added to `index.css`
- An existing class is changed or deprecated
- A new design pattern is codified

### 10.5 JSDoc Standards

All non-trivial functions must have JSDoc:

```js
/**
 * @description Brief description of what this function does.
 * @param {string} paramName - What this parameter represents.
 * @returns {Promise<Object>} What the resolved value contains.
 * @throws {Error} When this throws and why.
 */
```

---

## 11. Security Design Rules

### 11.1 Data Display

- Never render raw HTML from API responses — use text content, not `dangerouslySetInnerHTML`.
- Financial figures: always render as formatted strings, never as editable floats without validation.
- JWT tokens and passwords: never log, never display, never store in `localStorage` beyond what `AuthContext` requires.

### 11.2 Field-Level Permissions

The following fields are **write-once** (set on creation, cannot be changed):

| Model | Immutable Fields |
|---|---|
| User | `userName`, `businessName`, `businessRegistrationNumber` |
| Agent | `firstName`, `lastName`, `employeeId` |
| Customer | `businessName`, `customerId` |
| ServiceCall | `callNumber` |

**UI rule:** These fields must be rendered as read-only display text (not inputs) on edit screens. If a superAdmin override is ever needed, it must require an explicit audit justification field.

### 11.3 Role-Aware Rendering

- Use `isSuperAdmin` (from `AuthContext`) to conditionally render governance-mode actions.
- Never rely on CSS (`hidden`, `display:none`) as the only gatekeeping for privileged actions — the API must also enforce it.

---

## 12. Design System Reference Files

| File | Purpose |
|---|---|
| `DESIGN_PRINCIPLES.md` | **This file** — Master design governance rules |
| `GLASSMORPHISM_DESIGN_GUIDE.md` | Complete Glassmorphism CSS class reference (Block 1 of `index.css`) |
| `APPATUNID_UI_QUICKREF.md` | Quick-reference for all CSS classes (both blocks), patterns, and snippets |
| `AI_ASSISTANT_GUIDE.md` | Project briefing for AI assistants; recent change log |
| `PROJECT-STRUCTURE.md` | Complete file-by-file architecture reference |
| `AUTH_GUIDE.md` | Authentication system deep-dive |
| `LOGGING_GUIDE.md` | Backend logging best practices |
| `VITE_LAZY_LOADING_STRATEGY.md` | Frontend code-splitting and lazy loading plan |
| `FIELD_PERMISSIONS.md` | Field-level permission rules for all models |

---

*These principles are the product of iterative development on a production FSM SaaS platform. They encode lessons learned from refactoring, debugging, and operating the system at increasing scale. Read this file before adding any component, class, or pattern to the codebase.*
