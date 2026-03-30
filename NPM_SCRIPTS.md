# NPM Scripts Reference

This document lists all npm scripts currently defined in the project.

Last updated: 2026-03-26

Verification status: manually verified against `package.json`, `client/package.json`, and `server/package.json` on 2026-03-26.

Total script count: 28

- Root scripts: 16
- Client scripts: 7
- Server scripts: 5

## Root Scripts
Source: package.json

### Exact scripts object (source of truth)

```json
{
	"install:all": "npm install --prefix server && npm install --prefix client",
	"dev": "bash ./start-dev.sh",
	"refresh": "bash ./refresh.sh",
	"eod:new": "bash ./scripts/new-eod-entry.sh",
	"api:review:new": "bash ./scripts/new-weekly-api-review-entry.sh",
	"dev:server": "npm run dev --prefix server",
	"dev:client": "npm run dev --prefix client",
	"build:client": "npm run build --prefix client",
	"test:server": "npm test --prefix server",
	"test:client": "cd ./client && npm test -- --run",
	"test:client:watch": "cd ./client && npm test",
	"test": "npm run test:server && npm run test:client",
	"test:coverage": "npm run test:coverage --prefix server && npm run test:coverage --prefix client",
	"test:postman:invoice-contract": "node ./server/tests/postman/scripts/run-invoice-contract-validation-newman.cjs",
	"certs:check": "bash ./scripts/check-cert-expiry.sh",
	"shutdown": "bash ./shutdown.sh"
}
```

| Script | Command |
|---|---|
| install:all | npm install --prefix server && npm install --prefix client |
| dev | bash ./start-dev.sh |
| refresh | bash ./refresh.sh |
| eod:new | bash ./scripts/new-eod-entry.sh |
| api:review:new | bash ./scripts/new-weekly-api-review-entry.sh |
| dev:server | npm run dev --prefix server |
| dev:client | npm run dev --prefix client |
| build:client | npm run build --prefix client |
| test:server | npm test --prefix server |
| test:client | cd ./client && npm test -- --run |
| test:client:watch | cd ./client && npm test |
| test | npm run test:server && npm run test:client |
| test:coverage | npm run test:coverage --prefix server && npm run test:coverage --prefix client |
| test:postman:invoice-contract | node ./server/tests/postman/scripts/run-invoice-contract-validation-newman.cjs |
| certs:check | bash ./scripts/check-cert-expiry.sh |
| shutdown | bash ./shutdown.sh |

## Client Scripts
Source: client/package.json

### Exact scripts object (source of truth)

```json
{
	"dev": "vite",
	"build": "vite build",
	"lint": "eslint .",
	"preview": "vite preview",
	"test": "vitest",
	"test:watch": "vitest --watch",
	"test:coverage": "vitest --coverage"
}
```

| Script | Command |
|---|---|
| dev | vite |
| build | vite build |
| lint | eslint . |
| preview | vite preview |
| test | vitest |
| test:watch | vitest --watch |
| test:coverage | vitest --coverage |

## Server Scripts
Source: server/package.json

### Exact scripts object (source of truth)

```json
{
	"start": "node server.js",
	"dev": "nodemon server.js",
	"test": "jest --detectOpenHandles",
	"test:watch": "jest --watch",
	"test:coverage": "jest --coverage"
}
```

| Script | Command |
|---|---|
| start | node server.js |
| dev | nodemon server.js |
| test | jest --detectOpenHandles |
| test:watch | jest --watch |
| test:coverage | jest --coverage |

## Quick Usage
Run any script from the corresponding folder:

- From project root: npm run <root-script>
- From client folder: npm run <client-script>
- From server folder: npm run <server-script>

## Quick Run: Tagged Invoice Contract Validation

Run only snippets tagged for invoice contract validation:

```bash
AUTH_TOKEN="<jwt>" SERVICE_CALL_ID="<service-call-id>" npm run test:postman:invoice-contract
```

Staging override:

```bash
BASE_URL="https://staging.your-domain.com" AUTH_TOKEN="<jwt>" SERVICE_CALL_ID="<service-call-id>" npm run test:postman:invoice-contract
```
