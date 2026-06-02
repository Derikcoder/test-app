# ERD Artifact Folder

All ERD diagrams are stored in this folder.

Rules:
- Format: `.svg`
- Location: `/erds`
- Naming: file name must match the represented diagram `fileName` exactly

Validation rule:
- Expected result = `PASS`
- Unexpected result = `FAIL` with a short explanation of why it failed and what must change

Recommended tracking record for each ERD update:
- `diagramFileName`
- `expectedOutcome`
- `actualOutcome`
- `status` (`PASS` or `FAIL`)
- `explanation` (required when status is `FAIL`)

Examples:
- `User.svg`
- `ServiceCallWorkflow.svg`
- `CustomerAndSites.svg`
