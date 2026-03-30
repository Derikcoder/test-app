# Unit Testing Guide

## Table of Contents

- [Overview](#overview)
- [Testing Setup](#testing-setup)
- [Test Structure](#test-structure)
- [Running Tests](#running-tests)
- [Test Coverage](#test-coverage)
- [Writing New Tests](#writing-new-tests)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)
- [Expanding Test Coverage](#expanding-test-coverage)
- [Resources](#resources)
- [Notes](#notes)

## Overview

This project uses **Jest** for backend testing and **Vitest** with **React Testing Library** for frontend testing. The test suite provides comprehensive coverage for:

- **Backend (Server):** Models, Controllers, Middleware
- **Frontend (Client):** Components, Context, API Configuration
- **Database:** Model validation and behavior

### Testing Frameworks

| Area        | Framework             | Description                   |
| ----------- | --------------------- | ----------------------------- |
| **Server**  | Jest                  | Node.js testing framework     |
| **Client**  | Vitest                | Vite-native testing framework |
| **React**   | React Testing Library | Component testing utilities   |
| **API**     | Supertest             | HTTP assertion library        |
| **Mocking** | Jest/Vitest Mocks     | Function and module mocking   |

## Testing Setup

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

```text
- Test Environment: Node
- Coverage Threshold: 60%
- Setup File: tests/setup.js
```

**Client:** `client/vite.config.js`

```text
- Test Environment: jsdom
- Setup File: src/__tests__/setup.js
- Globals: Enabled (describe, it, expect)
```

## Test Structure

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

- Server: `*.test.js`
- Client: `*.test.jsx` for components, `*.test.js` for utilities
- Pattern: `[filename].test.[js|jsx]`

## Running Tests

### Server Tests

```bash
# Navigate to server directory
cd server

# Run all tests
npm test

# Run tests in watch mode (auto-rerun on file changes)
npm run test:watch

# Run tests with coverage report
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

# Run tests with coverage report
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

# Run only tagged invoice contract validation snippets (Postman/Newman)
AUTH_TOKEN="<jwt>" SERVICE_CALL_ID="<service-call-id>" npm run test:postman:invoice-contract
```

Optional BASE_URL override:

```bash
BASE_URL="https://staging.your-domain.com" AUTH_TOKEN="<jwt>" SERVICE_CALL_ID="<service-call-id>" npm run test:postman:invoice-contract
```

### Postman/Newman Contract Validation

The invoice contract-validation runner builds a temporary Postman collection and executes only snippet files listed in:

- `server/tests/postman/test-scripts/snippets/tags.invoice-contract-validation.json`

Supporting files:

- `server/tests/postman/scripts/run-invoice-contract-validation-newman.cjs`
- `server/tests/postman/test-scripts/README.txt`

Environment bootstrap files for Postman imports:

- `server/tests/postman/test-scripts/templates/postman-environment.local-https.json`
- `server/tests/postman/test-scripts/templates/postman-environment.local-http.json`
- `server/tests/postman/test-scripts/templates/postman-environment.staging.json`

**Root scripts already exist in this repository.** Current relevant entries in root `package.json`:

```json
{
  "scripts": {
    "test:server": "npm test --prefix server",
    "test:client": "npm test --prefix client",
    "test": "npm run test:server && npm run test:client",
    "test:postman:invoice-contract": "node ./server/tests/postman/scripts/run-invoice-contract-validation-newman.cjs"
  }
}
```

## Test Coverage

### Current Coverage

| Area                   | Files Tested       | Coverage Target |
| ---------------------- | ------------------ | --------------- |
| **Server Models**      | User.model.js      | 80%+            |
| **Server Middleware**  | auth.middleware.js | 90%+            |
| **Server Controllers** | auth.controller.js | 70%+            |
| **Client Components**  | Login.jsx          | 80%+            |
| **Client Context**     | AuthContext.jsx    | 90%+            |
| **Client API**         | axios.js           | 70%+            |

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

### Coverage Thresholds

**Server (`jest.config.js`):**

- Branches: 60%
- Functions: 60%
- Lines: 60%
- Statements: 60%

**Client:**

- Target: 70%+ overall coverage

## Writing New Tests

### Server Test Template

```javascript
/**
 * @file [filename].test.js
 * @description Unit tests for [module name]
 */

import { functionToTest } from "../../../path/to/module.js";
import Model from "../../../models/Model.js";

jest.mock("../../../models/Model.js");

describe("[Module Name]", () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: {}, params: {}, user: null };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe("[Function Name]", () => {
    test("should [expected behavior]", async () => {
      const mockData = {};
      Model.findOne = jest.fn().mockResolvedValue(mockData);

      await functionToTest(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({}));
    });
  });
});
```

### Client Component Test Template

```javascript
/**
 * @file [ComponentName].test.jsx
 * @description Unit tests for [ComponentName] component
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import ComponentName from "../../components/ComponentName";
import { AuthProvider } from "../../context/AuthContext";

vi.mock("axios");

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <ComponentName />
      </AuthProvider>
    </BrowserRouter>,
  );
};

describe("ComponentName", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("Rendering", () => {
    it("should render component with expected elements", () => {
      renderComponent();

      expect(screen.getByText(/expected text/i)).toBeInTheDocument();
      expect(screen.getByRole("button")).toBeInTheDocument();
    });
  });

  describe("User Interaction", () => {
    it("should handle button click", async () => {
      renderComponent();

      const button = screen.getByRole("button");
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

1. Test behavior, not implementation.
2. Use descriptive test names.
3. Follow the Arrange-Act-Assert pattern.
4. Keep tests independent.

Example:

```javascript
test("should return 401 when password is incorrect", () => {
  expect(true).toBe(true);
});
```

### Server Testing Practices

1. Mock external dependencies.
2. Test error handling explicitly.
3. Clean up MongoDB connections after tests.

```javascript
afterAll(async () => {
  await mongoose.connection.close();
});
```

### Client Testing Practices

1. Use Testing Library queries.
2. Test accessibility.
3. Wait for async operations.

```javascript
await waitFor(() => {
  expect(screen.getByText(/success/i)).toBeInTheDocument();
});
```

## Troubleshooting

### Common Issues

#### Server Test Issues

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
import User from "../models/User.model.js";
```

#### Client Test Issues

**Issue:** `window is not defined`

```javascript
test: {
  environment: "jsdom",
}
```

**Issue:** React hooks error

```javascript
const { result } = renderHook(() => useAuth(), {
  wrapper: AuthProvider,
});
```

**Issue:** Axios not mocked

```javascript
vi.mock("axios");
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

**Jest:**

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Jest Matchers](https://jestjs.io/docs/expect)

**Vitest:**

- [Vitest Documentation](https://vitest.dev/)
- [Vitest API](https://vitest.dev/api/)

**React Testing Library:**

- [RTL Documentation](https://testing-library.com/docs/react-testing-library/intro/)
- [Common Queries](https://testing-library.com/docs/queries/about)

**Supertest:**

- [Supertest GitHub](https://github.com/visionmedia/supertest)

## Notes

- **Test Environment:** Tests use isolated test databases, see `server/tests/setup.js`
- **Coverage Reports:** Generated in `coverage/` directories and gitignored
- **CI/CD Ready:** Tests can be integrated into GitHub Actions or other CI pipelines
- **Performance:** Run tests in parallel for faster execution, for example with `--maxWorkers=4`

**Last Updated:** 2026-02-26
**Maintained By:** Development Team

For questions or issues, create a GitHub issue or contact the team.
