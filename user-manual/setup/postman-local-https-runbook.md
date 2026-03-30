# Local HTTPS + Postman Runbook

This runbook is the single end-to-end setup path for local HTTPS API testing in Postman.

Use this when you want to:

- Start the app locally over HTTPS
- Authenticate successfully in Postman
- Store and reuse JWT tokens for protected requests
- Run collection folders in the correct dependency order

Related source references:

- Core environment and HTTPS setup: [../../README.md](../../README.md#local-https-setup)
- Local certificate handling policy: [../../certs/README.md](../../certs/README.md)
- Postman collection deep reference: [../../server/tests/postman/POSTMAN_INSTRUCTIONS.md](../../server/tests/postman/POSTMAN_INSTRUCTIONS.md)

## 1. Prerequisites

1. MongoDB is running.
2. Local certificate files exist on your machine:
   - certs/localhost+1.pem
   - certs/localhost+1-key.pem
3. Environment files exist:
   - server/.env
   - client/.env
4. Postman desktop is installed.

Quick checks:

- MongoDB: sudo systemctl status mongod
- Cert verification: npm run certs:check

## 2. Set Local HTTPS Environment Variables

Server file: server/.env

- SSL_ENABLED=true
- SSL_CERT_FILE=../certs/localhost+1.pem
- SSL_KEY_FILE=../certs/localhost+1-key.pem

Client file: client/.env

- VITE_API_URL=<https://localhost:5000>
- VITE_API_PROXY_TARGET=<https://localhost:5000>
- VITE_SSL_ENABLED=true
- VITE_SSL_CERT_FILE=../certs/localhost+1.pem
- VITE_SSL_KEY_FILE=../certs/localhost+1-key.pem

Security rule reminder:

- Keep raw cert and key files local.
- Commit only env variable names, placeholders, docs, and metadata.

## 3. Start Services

Option A:

- ./start-dev.sh

Option B:

1. Backend: cd server && npm run dev
2. Frontend: cd client && npm run dev

Expected local URLs:

- Frontend: <https://localhost:3000>
- Backend API: <https://localhost:5000/api>

## 4. Prepare Postman Environment

Import one environment template:

- server/tests/postman/test-scripts/templates/postman-environment.local-https.json

In Postman, confirm:

- BASE_URL=<https://localhost:5000>
- AUTH_EMAIL is set
- AUTH_PASSWORD is set

If SSL errors occur in Postman for local development, trust your local cert or temporarily disable SSL certificate verification in Postman settings.

## 5. Authenticate And Save AUTH_TOKEN

Create or open login request:

- Method: POST
- URL: <https://localhost:5000/api/auth/login>
- Authorization: No Auth
- Body type: raw JSON
- Body fields:
  - email: {{AUTH_EMAIL}}
  - password: {{AUTH_PASSWORD}}

In login request post-response script, save token to environment variable:

- Parse response JSON
- Read response.data.token
- Set AUTH_TOKEN in environment

After sending request, verify AUTH_TOKEN now has a value in the active environment.

## 6. Configure Protected Requests

For protected endpoints:

- Authorization type: Bearer Token
- Token value: {{AUTH_TOKEN}}

Do not use JWT Bearer token generation for normal API calls.
Use issued tokens from login.

## 7. Run Collection In Correct Order

Collection:

- server/tests/postman/register_customers_collection.json

Run order:

1. Setup & Happy Path
2. RC-API | Server Validation
3. RC-NEG | Negative Cases
4. RC-SEC | Security Tests

Why this matters:

- Folder 1 seeds IDs used by downstream tests.

## 8. Troubleshooting Quick Map

400 Please provide email and password:

- Ensure login credentials are in JSON body, not query params.

401 Invalid token / Unauthorized:

- Confirm AUTH_TOKEN exists and is attached as Bearer token.
- Re-run login and refresh token.

SSL or self-signed certificate error:

- Verify cert paths in env files.
- Validate cert files exist locally.
- Trust cert locally or temporarily disable SSL verification in Postman.

Collection failures after auth succeeds:

- Usually test data or dependency ordering issues, not connectivity.
- Re-run Setup & Happy Path first.

## 9. Day-To-Day Workflow

1. Start services.
2. Send login request once.
3. Confirm AUTH_TOKEN updated.
4. Run target folder or full collection in order.
5. Log failures with scripts/log-register-customers-test-result.sh when required.

## 10. Optional Deep References

- Postman full reference: [../../server/tests/postman/POSTMAN_INSTRUCTIONS.md](../../server/tests/postman/POSTMAN_INSTRUCTIONS.md)
- Certificate policy and generation: [../../certs/README.md](../../certs/README.md)
- Environment and HTTPS sections: [../../README.md](../../README.md#environment-configuration)
