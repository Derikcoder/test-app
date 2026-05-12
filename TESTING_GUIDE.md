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



## 📋 Table of Contents
  - [Jestering Pattern & Principles](#jestering-pattern--principles)

- [Overview](#overview)
- [Testing Setup](#testing-setup)
- [Test Structure](#test-structure)
- [Running Tests](#running-tests)
- [Test Coverage](#test-coverage)
- [Writing New Tests](#writing-new-tests)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---


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
- All entity and Express mocks must be created via `server/tests/unit/__mocks__/factories/`
- Example: `const mockUser = createMockUser({ email: 'customer@example.com' })`
- Factories ensure consistency, realism, and maintainability

### Anti-Pattern Checklist
- ❌ Over-mocking (e.g., `jest.mock('everything')`)
- ❌ Testing implementation details (e.g., `expect(helperFunction).toHaveBeenCalled()`)
- ❌ Fragile selectors (avoid checking exact call order unless required)
- ❌ Shared state between tests (always reset in `beforeEach`)
- ❌ Magic strings without explanation

### Example Jestering Test
```javascript
test('customer approves pro-forma', async () => {
  // GIVEN
  const req = createMockRequest({ params: { token: 'share-token-123' }, body: { decision: 'approved' } });
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

> **Always:**
> - Use factories for all mocks
> - Structure tests as GIVEN/WHEN/THEN
> - Reset mocks in `beforeEach`
> - Use realistic data
> - Avoid anti-patterns above

This project uses **Jest** for backend testing and **Vitest** with **React Testing Library** for frontend testing. The test suite provides comprehensive coverage for:

- **Backend (Server):** Models, Controllers, Middleware
- **Frontend (Client):** Components, Context, API Configuration
- **Database:** Model validation and behavior

### Testing Frameworks

| Area | Framework | Description |
|------|-----------|-------------|
| **Server** | Jest | Node.js testing framework |
| **Client** | Vitest | Vite-native testing framework |
| **React** | React Testing Library | Component testing utilities |
| **API** | Supertest | HTTP assertion library |
| **Mocking** | Jest/Vitest Mocks | Function and module mocking |

---

## 🛠️ Testing Setup

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

---

## 📁 Test Structure

### Server Tests (`server/tests/`)

```
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

```
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
- Client: `*.test.jsx` (for components), `*.test.js` (for utilities)
- Pattern: `[filename].test.[mjs|js|jsx]`

---

## 🚀 Running Tests

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

---

## 📊 Test Coverage

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


### Server Test Template (Jestering)
```javascript
/**
 * @file [filename].test.mjs
 * @description Unit tests for [module name] (Jestering pattern)
 */
import { jest } from '@jest/globals';
import { createMockRequest, createMockResponse } from '../__mocks__/factories/express.factory.js';
import { createMock[Entity] } from '../__mocks__/factories/[entity].factory.js';

// Mock dependencies at module boundaries
await jest.unstable_mockModule('../../../models/[Entity].model.js', () => ({ __esModule: true, default: {} }));

const controller = await import('../../../controllers/[controller].js');
const functionToTest = controller.functionToTest;
const Entity = (await import('../../../models/[Entity].model.js')).default;

    test('should [expected behavior]', async () => {
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
});
```
      // Arrange
      const mockData = { /* test data */ };
      Model.findOne = jest.fn().mockResolvedValue(mockData);

      // Act
      await functionToTest(req, res, next);

      // Assert
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

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ComponentName from '../../components/ComponentName';
import { AuthProvider } from '../../context/AuthContext';

// Mock dependencies
vi.mock('axios');

// Helper to render with providers
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

---

## 🎓 Best Practices

### General

1. **Test Behavior, Not Implementation**
   - Focus on what the code does, not how it does it
   - Test user interactions and outcomes

2. **Use Descriptive Test Names**
   ```javascript
   ✅ test('should return 401 when password is incorrect')
   ❌ test('password test')
   ```

3. **Arrange-Act-Assert Pattern**
   ```javascript
   test('should login user', () => {
     // Arrange: Setup test data
     const mockUser = { email: 'test@example.com' };
     
     // Act: Execute the code
     const result = loginUser(mockUser);
     
     // Assert: Verify the result
     expect(result).toBeDefined();
   });
   ```

4. **Keep Tests Independent**
   - Each test should run in isolation
   - Use `beforeEach` to reset state
   - Don't rely on test execution order

### Server Tests

1. **Mock External Dependencies**
   ```javascript
   jest.mock('../models/User.model.js');
   ```

2. **Test Error Handling**
   ```javascript
   test('should handle database errors', async () => {
     Model.findOne.mockRejectedValue(new Error('DB Error'));
     await controller(req, res);
     expect(res.status).toHaveBeenCalledWith(500);
   });
   ```

3. **Clean Up MongoDB Connections**
   ```javascript
   afterAll(async () => {
     await mongoose.connection.close();
   });
   ```

### Client Tests

1. **Use Testing Library Queries**
   ```javascript
   // Preferred
   screen.getByRole('button', { name: /submit/i })
   screen.getByLabelText(/email/i)
   
   // Avoid
   screen.getByClassName('submit-btn')
   ```

2. **Test Accessibility**
   ```javascript
   test('should have accessible form fields', () => {
     render(<Login />);
     expect(screen.getByLabelText(/email/i)).toBeRequired();
   });
   ```

3. **Wait for Async Operations**
   ```javascript
   await waitFor(() => {
     expect(screen.getByText(/success/i)).toBeInTheDocument();
   });
   ```

---

## 🐛 Troubleshooting

### Common Issues

#### Server Tests

**Issue:** Tests hang or timeout
```bash
# Solution: Add --detectOpenHandles flag
npm test -- --detectOpenHandles
```

**Issue:** MongoDB connection errors
```bash
# Solution: Ensure MongoDB is running
sudo systemctl start mongod

# Or use in-memory MongoDB
npm install --save-dev mongodb-memory-server
```

**Issue:** Module import errors
```javascript
// Ensure package.json has "type": "module"
// Use .js extensions in imports
import User from '../models/User.model.js';
```

#### Client Tests

**Issue:** `window is not defined`
```javascript
// Solution: Ensure jsdom is installed and configured
// vite.config.js
test: {
  environment: 'jsdom',
}
```

**Issue:** React hooks error
```javascript
// Solution: Wrap component in proper providers
const { result } = renderHook(() => useAuth(), {
  wrapper: AuthProvider,
});
```

**Issue:** Axios not mocked
```javascript
// Solution: Mock axios before imports
vi.mock('axios');
```

### Debug Mode

**Server (Jest):**
```bash
# Run with verbose output
npm test -- --verbose

# Debug specific test
node --inspect-brk node_modules/.bin/jest tests/unit/models/User.model.test.js
```

**Client (Vitest):**
```bash
# Run with UI for debugging
npx vitest --ui

# Run with reporter
npx vitest --reporter=verbose
```

---

## 📈 Expanding Test Coverage

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

---

## 🔗 Resources

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

---

## 📝 Notes

- **Test Environment:** Tests use isolated test databases (see `server/tests/setup.js`)
- **Coverage Reports:** Generated in `coverage/` directories (gitignored)
- **CI/CD Ready:** Tests can be integrated into GitHub Actions or other CI pipelines
- **Performance:** Run tests in parallel for faster execution (`--maxWorkers=4`)

---

**Last Updated:** 2026-02-26
**Maintained By:** Development Team

For questions or issues, please create a GitHub issue or contact the team.
