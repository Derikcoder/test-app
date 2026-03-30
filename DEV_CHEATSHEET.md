# Developer Command Cheatsheet

Purpose: one place for day-to-day developer commands, separate from implementation scripts.

## New Developer First Run (Recommended Sequence)

Run from project root.

```bash
# 1) Install all dependencies (root + server + client)
npm run install:all

# 2) Install and trust local HTTPS certificates (one-time machine setup)
mkcert -install

# 3) Start local stack (backend + frontend)
npm run dev

# 4) Verify backend API responds (in a new terminal)
curl -k https://localhost:5000/api/health

# 5) Run backend tests
npm run test:server

# 6) Run frontend tests (one-shot, exits automatically)
npm run test:client

# 7) Stop local services when done
npm run shutdown
```

## Daily Restart Flow (Fast Path)

Run from project root.

```bash
npm run dev
npm run shutdown
```

## Root NPM Commands

Run from project root.

| Command | What it does |
|---|---|
| npm run install:all | Installs server and client dependencies in one step. |
| npm run dev | Starts the full local dev stack using `start-dev.sh`. |
| npm run refresh | Runs the project refresh helper script. |
| npm run eod:new | Appends a new end-of-day log entry template. |
| npm run api:review:new | Appends a new weekly API review log entry template. |
| npm run dev:server | Starts backend dev server via server package script. |
| npm run dev:client | Starts frontend dev server via client package script. |
| npm run build:client | Builds the frontend production bundle. |
| npm run test:server | Runs backend test suite. |
| npm run test:client | Runs frontend tests once (non-watch). |
| npm run test:client:watch | Runs frontend tests in watch mode. |
| npm test | Runs backend + frontend tests sequentially. |
| npm run test:coverage | Runs backend + frontend coverage commands. |
| npm run test:postman:invoice-contract | Runs only tagged invoice contract-validation snippets through Newman. |
| npm run certs:check | Checks local TLS certificate expiry and fingerprints. |
| npm run shutdown | Stops local dev services with shutdown helper script. |

### Invoice Contract Validation Quick Run

Required env vars:

```bash
AUTH_TOKEN="<jwt>" SERVICE_CALL_ID="<service-call-id>" npm run test:postman:invoice-contract
```

Optional staging/base URL override:

```bash
BASE_URL="https://staging.your-domain.com" AUTH_TOKEN="<jwt>" SERVICE_CALL_ID="<service-call-id>" npm run test:postman:invoice-contract
```

## Client NPM Commands

Run from `client/`.

| Command | What it does |
|---|---|
| npm run dev | Starts Vite dev server. |
| npm run build | Creates production build. |
| npm run lint | Runs ESLint against client source. |
| npm run preview | Serves production build locally for preview. |
| npm test | Runs Vitest tests. |
| npm run test:watch | Runs Vitest in watch mode. |
| npm run test:coverage | Runs Vitest with coverage. |

## Server NPM Commands

Run from `server/`.

| Command | What it does |
|---|---|
| npm start | Starts backend in normal (non-watch) mode. |
| npm run dev | Starts backend with Nodemon auto-reload. |
| npm test | Runs Jest tests with detect-open-handles enabled. |
| npm run test:watch | Runs Jest in watch mode. |
| npm run test:coverage | Runs Jest with coverage. |

## Standalone Shell Helpers

Run from project root unless noted.

| Command | What it does |
|---|---|
| ./setup-and-run.sh | One-command local setup and startup helper. |
| ./start-dev.sh | Starts core local development services. |
| ./refresh.sh | Runs project refresh workflow helper. |
| ./shutdown.sh | Stops local development services/processes. |
| ./install-mongodb.sh | Installs and configures MongoDB for local development. |
| ./scripts/check-cert-expiry.sh | Checks TLS cert expiry/fingerprint details. |
| ./scripts/new-eod-entry.sh | Adds new EOD entry template to log. |
| ./scripts/new-weekly-api-review-entry.sh | Adds new weekly API review entry template. |
| ./scripts/run-register-customers-tests.sh | Runs registration test flow via interactive shell runner. |
| ./scripts/log-register-customers-test-result.sh | Logs structured registration test failures. |

## Notes

- Prefer root commands for normal day-to-day workflow.
- Use package-local commands only when working in a single app (`client/` or `server/`).
- `npm run test:client` is intentionally one-shot to avoid watch-mode terminal lock.
- Use `npm run test:client:watch` when you explicitly want an interactive watch loop.
- Keep this file in sync whenever scripts change in package.json or shell helpers are added/renamed.
