# Unit Testing Guide

## #Jestering Quick Reference Card

```markdown
┌─────────────────────────────────────────┐
│           #JESTERING CHEAT SHEET        │
├─────────────────────────────────────────┤
│ GIVEN  → Setup mocks and data          │
│ WHEN   → Execute the action            │
│ THEN   → Verify behavior               │
├─────────────────────────────────────────┤
│ ✅ MOCK: DB, API, email, files         │
│ ❌ DON'T MOCK: logic, validators       │
├─────────────────────────────────────────┤
│ createMock[Entity]() → factory         │
│ jest.clearAllMocks() → beforeEach      │
│ mockResolvedValue() → async mocks      │
├─────────────────────────────────────────┤
│ "customer approves pro-forma" ✅       │
│ "should approve" ❌                    │
└─────────────────────────────────────────┘
```

## Table of Contents

- [Overview](#overview)
- [Jestering Pattern & Principles](#jestering-pattern--principles)
- [Testing Setup](#testing-setup)
- [Test Structure](#test-structure)
- [UAT Auth Methodology - password set = FALSE](#uat-auth-methodology---password-set--false)
- [Running Tests](#running-tests)
- [Test Coverage](#test-coverage)
- [Writing New Tests](#writing-new-tests)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)
- [Expanding Test Coverage](#expanding-test-coverage)
- [Resources](#resources)
- [Notes](#notes)

---

## Overview

This guide covers the test stack used in this project, how the suite is organized, how to run it, and the conventions expected when writing new tests.

It is intended to keep server, client, and database testing practices aligned while making coverage, debugging, and maintenance straightforward.

## #Jestering Pattern & Principles

### What is #Jestering?

The #Jestering test framework enforces:

- **GIVEN/WHEN/THEN** structure for every test (readable AAA)
- Use of reusable mock factories (`createMock[Entity]()`) for all entities and Express objects
- Realistic, complete test data in all mocks
- Mocks only at system boundaries (database, APIs, email, file system)
- Descriptive, action-focused test names
- Explicit anti-pattern checklist (see below)

### Factory Usage

- All entity and Express mocks should be created via `server/tests/unit/__mocks__/factories/`
- Example: `const mockUser = createMockUser({ email: 'customer@example.com' })`
- Factories improve consistency and maintainability

### Anti-Pattern Checklist

- Avoid over-mocking (for example, `jest.mock('everything')`)
- Avoid testing implementation details
- Avoid fragile assertions on call order unless required
- Avoid shared state across tests
- Avoid unexplained magic strings

### Example Jestering Test

```javascript
test('customer approves pro-forma', async () => {
  // GIVEN
  const req = createMockRequest({
    params: { token: 'share-token-123' },
    body: { decision: 'approved' },
  });
  const res = createMockResponse();
  const mockInvoice = mockStates.awaitingApproval();
  Invoice.findOne.mockResolvedValue(mockInvoice);

  // WHEN
  await submitSharedInvoiceDecision(req, res);

  // THEN
  expect(mockInvoice.workflowStatus).toBe('approved');
  expect(res.json).toHaveBeenCalledWith(
    expect.objectContaining({ message: expect.stringContaining('approved') })
  );
});
```

## Testing Setup

This section covers dependencies, configuration files, and environment setup required to run the test suites.

### Prerequisites

Ensure all testing dependencies are installed:

```bash
# Install server testing dependencies
cd server
npm install

# Install client testing dependencies
cd ../client
npm install
```

### Dependencies Installed

**Server (`server/package.json`):**

- `jest` - Testing framework
- `supertest` - HTTP testing
- `@types/jest` - TypeScript types for Jest

**Client (`client/package.json`):**

- `vitest` - Testing framework
- `@testing-library/react` - React component testing
- `@testing-library/jest-dom` - Additional matchers
- `@testing-library/user-event` - User interaction simulation
- `@vitest/ui` - Web UI for test results
- `jsdom` - DOM implementation for Node.js

### Configuration Files

**Server:** `server/jest.config.js`

```javascript
- Test Environment: Node
- Coverage Threshold: 60%
- Setup File: tests/setup.js
```

**Client:** `client/vite.config.js`

```javascript
- Test Environment: jsdom
- Setup File: src/__tests__/setup.js
- Globals: Enabled (describe, it, expect)
```

## Test Structure

This section shows the expected folder layout for server and client tests, plus naming conventions.

### Server Tests (`server/tests/`)

```text
server/tests/
├── setup.js                           # Test environment setup
└── unit/
    ├── models/
    │   └── User.model.test.js        # User model validation tests
    ├── middleware/
    │   └── auth.middleware.test.js   # JWT authentication tests
    └── controllers/
        └── auth.controller.test.js   # Auth controller logic tests
```

### Client Tests (`client/src/__tests__/`)

```text
client/src/__tests__/
├── setup.js                          # React Testing Library setup
├── components/
│   └── Login.test.jsx               # Login component tests
├── context/
│   └── AuthContext.test.jsx         # Auth context state tests
└── api/
    └── axios.test.js                # Axios configuration tests
```

### Test File Naming Convention

- Server: `*.test.mjs` (ESM, Jestering pattern)
- Client: `*.test.jsx` (components), `*.test.js` (utilities)
- Pattern: `[filename].test.[mjs|js|jsx]`

## UAT Auth Methodology - password set = FALSE

This project includes a manual UAT methodology for personas whose permanent password has not yet been set.

Definition:

- `password set = FALSE` means a user account is provisioned, but no permanent password has been established and verified.

Applicable personas:

- `customer`
- `fieldServiceAgent`

UAT operating rule:

- Do not log out of the only active session for a persona in this state unless you captured the newest temporary secret access key, or you intentionally plan to test Forgot Password.

Manual testing pattern:

1. Keep the active persona session open.
2. Use a separate browser session for `superAdmin`.
3. From the persona profile, use Provision Login if no linked account exists.
4. Use Resend Invite whenever you need fresh first-login credentials.
5. Record the newest temporary secret access key and Ethereal preview URL in development.
6. Only then log out and re-enter as that persona.

Exit condition:

- Once permanent password is set and verified, normal login and Forgot Password flows become the required path.

## Running Tests

### Server Tests

```bash
# Navigate to server directory
cd server

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npx jest tests/unit/models/User.model.test.js

# Run tests matching pattern
npx jest --testNamePattern="password"
```

### Client Tests

```bash
# Navigate to client directory
cd client

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npx vitest --ui

# Run specific test file
npx vitest src/__tests__/components/Login.test.jsx

# Run tests matching pattern
npx vitest --testNamePattern="login"
```

### Run All Tests (Root Directory)

```bash
# Run all backend tests
npm run test:server

# Run all frontend tests
npm run test:client

# Run all tests (both frontend and backend)
npm test
```

**Note:** You may need to add these scripts to the root `package.json`:

```json
{
  "scripts": {
    "test:server": "npm --prefix ./server run test --",
    "test:client": "npm --prefix ./client run test --",
    "test": "npm run test:server && npm run test:client"
  }
}
```

## Test Coverage

### Current Coverage

| Area | Files Tested | Coverage Target |
|------|--------------|-----------------|
| **Server Models** | User.model.js | 80%+ |
| **Server Middleware** | auth.middleware.js | 90%+ |
| **Server Controllers** | auth.controller.js | 70%+ |
| **Client Components** | Login.jsx | 80%+ |
| **Client Context** | AuthContext.jsx | 90%+ |
| **Client API** | axios.js | 70%+ |

### Viewing Coverage Reports

**Server:**

```bash
cd server
npm run test:coverage
open coverage/lcov-report/index.html
```

**Client:**

```bash
cd client
npm run test:coverage
open coverage/index.html
```

## Writing New Tests

When adding new tests, follow the Jestering pattern first: write scenarios in GIVEN/WHEN/THEN form, use shared mock factories, and keep assertions behavior-focused.

### Server Test Template (Jestering)

```javascript
/**
 * @file [filename].test.mjs
 * @description Unit tests for [module name] (Jestering pattern)
 */
import { jest } from '@jest/globals';
import { createMockRequest, createMockResponse } from '../__mocks__/factories/express.factory.js';
import { createMock[Entity] } from '../__mocks__/factories/[entity].factory.js';

await jest.unstable_mockModule('../../../models/[Entity].model.js', () => ({
  __esModule: true,
  default: {},
}));

const controller = await import('../../../controllers/[controller].js');
const functionToTest = controller.functionToTest;
const Entity = (await import('../../../models/[Entity].model.js')).default;

beforeEach(() => {
  jest.clearAllMocks();
});

test('[user action] [does something]', async () => {
  // GIVEN
  const req = createMockRequest({ /* overrides */ });
  const res = createMockResponse();
  const mockEntity = createMock[Entity]({ /* overrides */ });
  Entity.findOne = jest.fn().mockResolvedValue(mockEntity);

  // WHEN
  await functionToTest(req, res);

  // THEN
  expect(Entity.findOne).toHaveBeenCalled();
  expect(res.json).toHaveBeenCalledWith(
    expect.objectContaining({ /* expected data */ })
  );
});
```

### Client Component Test Template

```javascript
/**
 * @file [ComponentName].test.jsx
 * @description Unit tests for [ComponentName] component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ComponentName from '../../components/ComponentName';
import { AuthProvider } from '../../context/AuthContext';

vi.mock('axios');

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <ComponentName />
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('ComponentName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Rendering', () => {
    it('should render component with expected elements', () => {
      renderComponent();
      expect(screen.getByText(/expected text/i)).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('User Interaction', () => {
    it('should handle button click', async () => {
      renderComponent();
      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/success/i)).toBeInTheDocument();
      });
    });
  });
});
```

## Best Practices

### General

1. Test behavior, not implementation details.
2. Use descriptive test names.
3. Keep tests independent.
4. Reset state in `beforeEach`.
5. Prefer accessible queries in UI tests.

### Server Tests

1. Mock external dependencies at boundaries.
2. Include error-path coverage.
3. Close DB connections in teardown where needed.

### Client Tests

1. Prefer Testing Library role/label queries.
2. Include accessibility checks.
3. Use `waitFor` for async assertions.

## Troubleshooting

### Common Issues

#### Server Tests

**Issue:** Tests hang or timeout

```bash
npm test -- --detectOpenHandles
```

**Issue:** MongoDB connection errors

```bash
sudo systemctl start mongod
npm install --save-dev mongodb-memory-server
```

**Issue:** Module import errors

```javascript
// Ensure package.json has "type": "module"
import User from '../models/User.model.js';
```

#### Client Tests

**Issue:** `window is not defined`

```javascript
// vite.config.js
// test: { environment: 'jsdom' }
```

**Issue:** React hooks error

```javascript
const { result } = renderHook(() => useAuth(), {
  wrapper: AuthProvider,
});
```

**Issue:** Axios not mocked

```javascript
vi.mock('axios');
```

### Debug Mode

**Server (Jest):**

```bash
npm test -- --verbose
node --inspect-brk node_modules/.bin/jest tests/unit/models/User.model.test.js
```

**Client (Vitest):**

```bash
npx vitest --ui
npx vitest --reporter=verbose
```

## Expanding Test Coverage

### Priority Areas to Test

**Server:**

- [ ] Agent Controller (create, update, delete, performance)
- [ ] Customer Controller (CRUD, sites)
- [ ] ServiceCall Controller (CRUD, parts, photos, rating)
- [ ] Equipment Controller (CRUD, warranty, service history)
- [ ] Quotation Controller (CRUD, conversion, PDF generation)
- [ ] Invoice Controller (CRUD, payments, overdue)
- [ ] Logger Middleware (logging, error handling)

**Client:**

- [ ] Register Component (form validation, submission)
- [ ] UserProfile Component (display, edit, update)
- [ ] ProtectedRoute Component (authentication guard)
- [ ] Additional React components as created

**Database:**

- [ ] Agent Model (validation, auto-ID generation)
- [ ] Customer Model (validation, sites array)
- [ ] ServiceCall Model (validation, parts, photos)
- [ ] Equipment Model (validation, warranty)
- [ ] Quotation Model (validation, status workflow)
- [ ] Invoice Model (validation, payment calculations)

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Jest Matchers](https://jestjs.io/docs/expect)
- [Vitest Documentation](https://vitest.dev/)
- [Vitest API](https://vitest.dev/api/)
- [RTL Documentation](https://testing-library.com/docs/react-testing-library/intro/)
- [Common Queries](https://testing-library.com/docs/queries/about)
- [Supertest GitHub](https://github.com/visionmedia/supertest)

## Notes

- Tests use isolated test databases (see `server/tests/setup.js`).
- Coverage reports are generated in `coverage/` directories.
- Tests can be integrated with CI workflows.
- Run tests in parallel when appropriate (`--maxWorkers=4`).

---

**Last Updated:** 2026-05-19
**Maintained By:** Development Team

For questions or issues, please create a GitHub issue or contact the team.
