# User Manual

This folder is the human-facing documentation layer for the project.

It is intended to give readers a predictable navigation path through setup, API usage, workflows, security rules, and user journeys without requiring them to scan the full repository root.

## Security Transparency Status

The project is currently running a dedicated security-remediation stream to address Dependabot-reported vulnerabilities ahead of broader remote field testing.

What readers should know:

1. Remediation is executed on `addressing-dependabot-identified-vulnerabilities`
2. Vulnerabilities are resolved by severity priority
3. Validation and documentation updates are part of the same workflow
4. Reconciliation into `foundation` is done only after tests and review gates pass

Current approach:

- Root `README.md` remains the repository foreword and master entry point.
- This manual acts as the structured navigation layer for process documentation.
- Existing source documents remain in their current locations until they are deliberately consolidated or moved.

## Manual Sections

- [Setup](setup/README.md) - Environment setup, local HTTPS, and Postman onboarding.
- [API](api/README.md) - API navigation, endpoint inventory context, and testing flow.
- [Workflows](workflows/README.md) - Operational process guidance and process-map entry points.
- [Security](security/README.md) - Secret handling, local TLS policy, and security operating rules.
- [User Stories](user-stories/README.md) - Role-based journeys and behavior expectations.

## Current Source Documents

- Repository foreword: [../README.md](../README.md)
- Architecture and structure: [../PROJECT-STRUCTURE.md](../PROJECT-STRUCTURE.md)
- Authentication reference: [../AUTH_GUIDE.md](../AUTH_GUIDE.md)
- API register: [../API_COLLECTION.md](../API_COLLECTION.md)
- Testing reference: [../TESTING_GUIDE.md](../TESTING_GUIDE.md)
- Security reference: [../SECURITY.md](../SECURITY.md)
- Postman execution guide: [../server/tests/postman/POSTMAN_INSTRUCTIONS.md](../server/tests/postman/POSTMAN_INSTRUCTIONS.md)

## Next Consolidation Pass

1. Decide which root documents remain canonical anchors.
2. Move user-facing process content into the section folders.
3. Replace duplicated guidance with cross-links.
4. Keep internal AI and architecture control docs stable unless intentionally rehomed.
