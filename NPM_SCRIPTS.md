# NPM Scripts Reference

This document lists all npm scripts currently defined in the project.

Last updated: 2026-03-24

Verification status: manually verified against `package.json`, `client/package.json`, and `server/package.json` on 2026-03-24.

Total script count: 24

- Root scripts: 12
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
	"dev:server": "npm run dev --prefix server",
	"dev:client": "npm run dev --prefix client",
	"build:client": "npm run build --prefix client",
	"test:server": "npm --prefix ./server run test --",
	"test:server:json": "npm --prefix ./server run test -- --json --outputFile=jest.output.json .",
	"test:server:debug": "npm --prefix ./server run test -- --runInBand",
	"test:client": "npm test --prefix client",
	"test": "npm run test:server && npm run test:client",
	"test:coverage": "npm run test:coverage --prefix server && npm run test:coverage --prefix client",
	"shutdown": "bash ./shutdown.sh"
}
```

| Script | Command |
|---|---|
| install:all | npm install --prefix server && npm install --prefix client |
| dev | bash ./start-dev.sh |
| refresh | bash ./refresh.sh |
| eod:new | bash ./scripts/new-eod-entry.sh |
| dev:server | npm run dev --prefix server |
| dev:client | npm run dev --prefix client |
| build:client | npm run build --prefix client |
| test:server | npm --prefix ./server run test -- |
| test:server:json | npm --prefix ./server run test -- --json --outputFile=jest.output.json . |
| test:server:debug | npm --prefix ./server run test -- --runInBand |
| test:client | npm test --prefix client |
| test | npm run test:server && npm run test:client |
| test:coverage | npm run test:coverage --prefix server && npm run test:coverage --prefix client |
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
