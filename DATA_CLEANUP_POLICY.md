# Data Cleanup Safety Policy

Last updated: 2026-04-02

## Purpose
Define safe rules for deleting or resetting test data.

## Non-Negotiable Rule
No blanket full-database wipe scripts are allowed in this repository.

## Allowed Approach
Only targeted cleanup operations are allowed, scoped by one or more of the following:
- Specific collection
- Specific record identifier
- Specific date range
- Specific tenant/user scope
- Specific test tag/marker

## Required Safety Controls
Every cleanup script or command must include all of the controls below:
1. Explicit scope summary shown before execution
2. Dry-run mode by default (preview only)
3. Interactive confirmation step
4. Environment guard blocking production by default
5. Audit output (what was deleted and why)

## Prohibited Patterns
- Commands or scripts that call full database drop operations
- Commands that run destructive changes without a confirmation step
- Scripts that accept broad wildcard deletion without hard limits
- Scripts committed without usage notes and safeguards

## Implementation Standard
When creating a targeted cleanup tool, include:
- Name that describes narrow intent
- Required arguments (for example: customerId, serviceCallId, fromDate)
- Safety checks that fail closed if scope is missing
- Short usage examples and rollback notes

## Review Requirement
Any destructive cleanup script must be reviewed before merge.

## Operational Note
If a fresh environment is needed, provision a new test database instance instead of dropping shared data.
