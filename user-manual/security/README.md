# Security

This section is for project security rules, secret handling, and environment-safety practices.

## Current Program Context

This repository is in an active dependency hardening cycle to address Dependabot findings before remote-server field testing.

Branch used for this work:

- `addressing-dependabot-identified-vulnerabilities`

## Intended Topics

- Secret handling and environment-variable discipline
- Local TLS and certificate handling rules
- Auth and token handling expectations
- Development and deployment security checks

## Audience-Focused Guidance

Engineering: Follow remediation branch workflow and severity-first patching, and record dependency upgrades and breaking-change decisions.

QA: Re-run targeted and full regression suites after vulnerability fixes, and confirm no auth, billing, or booking regressions from dependency changes.

Product and Stakeholders: Use security status as a release-readiness signal for MVP trust and track transparent progress through documented remediation updates.

Operations: Include dependency vulnerability status in pre-deployment checklists and require clean or explicitly risk-accepted audit reports before remote field tests.

## Current Source Documents

- [../../SECURITY.md](../../SECURITY.md)
- [../../AUTH_GUIDE.md](../../AUTH_GUIDE.md)
- [../../certs/README.md](../../certs/README.md)
- [../../FIELD_PERMISSIONS.md](../../FIELD_PERMISSIONS.md)

## Suggested Reading Path

1. Read [../../SECURITY.md](../../SECURITY.md)
2. Follow the local TLS handling guidance in [../../certs/README.md](../../certs/README.md)
3. Use [../../AUTH_GUIDE.md](../../AUTH_GUIDE.md) for authentication-specific security details
4. Use [../README.md](../README.md) for manual-wide transparency status and cross-section context
