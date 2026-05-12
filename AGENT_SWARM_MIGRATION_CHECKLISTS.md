# Agent Swarm ESM Migration: Migration Checklists

## Backend Agent Checklist

**All backend unit tests have been migrated to the #Jestering pattern (GIVEN/WHEN/THEN, factory-based mocks, anti-pattern checklist). Legacy patterns have been removed. See TESTING_GUIDE.md for details.**
- [ ] Identify all backend test files using jest.mock or require
- [ ] For each file:
    - [ ] Replace all require() with import/export
    - [ ] Replace jest.mock() with await jest.unstable_mockModule() and dynamic import
    - [ ] Add `import { jest } from '@jest/globals';` if needed
    - [ ] Remove any CommonJS-specific code
    - [ ] Ensure all mocks are async and ESM-compatible
- [ ] Update Jest and Babel configs for ESM
- [ ] Validate by running backend test suite

## Frontend Agent Checklist
- [ ] Identify all frontend test files using require or CommonJS mocks
- [ ] For each file:
    - [ ] Replace require() with import/export
    - [ ] Refactor mocks to ESM-compatible patterns
    - [ ] Update test configs for ESM
- [ ] Validate by running frontend test suite

## Database Agent Checklist
- [ ] Identify all DB integration tests and scripts
- [ ] For each file:
    - [ ] Replace require() with import/export
    - [ ] Refactor DB utility mocks to ESM
    - [ ] Ensure DB setup/teardown scripts are ESM-compatible
- [ ] Validate by running DB integration tests

## Coordinator Agent Checklist
- [ ] Review all agent proposals/patches
- [ ] Merge or request changes
- [ ] Ensure config consistency (Jest, Babel, package.json)
- [ ] Run full test suite
- [ ] Document migration progress and blockers
