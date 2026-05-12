# Agent Swarm ESM Migration: Agent Definitions

## 1. Frontend Agent
- **Domain:** client/src, React components, frontend tests (Vitest, React Testing Library)
- **Responsibilities:**
  - Convert all frontend test files to ESM (import/export)
  - Refactor jest.mock to ESM-compatible mocks (if any)
  - Update frontend test configs for ESM
  - Flag unsupported legacy patterns

## 2. Backend Agent

**All backend unit tests now use the #Jestering pattern (GIVEN/WHEN/THEN, factory-based mocks, anti-pattern checklist). Legacy test patterns are deprecated. See TESTING_GUIDE.md for details.**
- **Domain:** server/controllers, server/tests/unit, server/utils, backend tests (Jest)
- **Responsibilities:**
  - Convert all backend test files to ESM (import/export)
  - Refactor jest.mock to jest.unstable_mockModule + dynamic import
  - Update Jest/Babel configs for ESM
  - Handle shared utility/middleware test files

## 3. Database Agent
- **Domain:** server/tests/integration, DB setup/teardown scripts, DB utilities
- **Responsibilities:**
  - Convert DB integration tests to ESM
  - Refactor DB utility mocks
  - Ensure DB scripts are ESM-compatible

## 4. Coordinator Agent
- **Domain:** Entire repo
- **Responsibilities:**
  - Review and merge agent proposals
  - Resolve conflicts and ambiguous cases
  - Ensure config consistency
  - Run and validate full test suite
