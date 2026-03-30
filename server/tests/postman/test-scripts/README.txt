Postman Test Scripts Library

Purpose
- Keep copy/paste-ready Postman scripts in git for repeatable setup.
- Keep sample request payloads in git for consistent onboarding and QA.

Folder layout
- snippets/: Request-level Test tab snippets.
- templates/: Pre-request and helper templates.
- data/: JSON payload samples to paste in request body.

Ready-to-import Postman environment
- templates/postman-environment.local-https.json
	- Import directly in Postman (Environments -> Import)
	- Preloaded for local HTTPS backend at https://localhost:5000
- templates/postman-environment.local-http.json
	- Import directly in Postman (Environments -> Import)
	- Preloaded for local HTTP backend at http://localhost:5000
- templates/postman-environment.staging.json
	- Import directly in Postman (Environments -> Import)
	- Staging placeholders: https://staging.your-domain.com, AUTH_EMAIL, AUTH_PASSWORD

Auth/Security snippet batch
- auth-401-no-token.post-r-pm.js
- auth-401-invalid-or-expired-token.post-r-pm.js
- auth-403-role-restricted.post-r-pm.js
- conflict-409-duplicate-resource.post-r-pm.js
- auth-security-expected-status-set.post-r-pm.js

Validation snippet batch
- validation-400-required-fields.post-r-pm.js
- validation-400-invalid-format.post-r-pm.js
- validation-422-unprocessable-entity.post-r-pm.js
- validation-400-or-422-flex.post-r-pm.js
- validation-field-error-shape.post-r-pm.js

How to use in Postman
1) Open a request in Postman.
2) Copy script text from a file in snippets/.
3) Paste into Tests tab (or Pre-request tab for template files).
4) Save request.

Recommended collection variables
- BASE_URL
- AUTH_TOKEN
- INVOICE_SCHEMA_V1
- INVOICE_SCHEMA_V1_1

Schema validation approach
- Store the schema JSON text in a collection variable.
- Use snippet files schema-validate.invoice-v1.post-r-pm.js and schema-validate.invoice-v1_1.post-r-pm.js.
- These scripts read the variable, parse JSON, and validate response body.

Naming convention
- *.post-r-pm.js = post-response request script snippet
- *.pre-r-pm.js = pre-request script snippet

Tagged invoice contract validation runner
- Tag manifest:
	- snippets/tags.invoice-contract-validation.json
- Newman command (root package script):
	- AUTH_TOKEN="<jwt>" SERVICE_CALL_ID="<id>" npm run test:postman:invoice-contract
- Optional BASE_URL override:
	- BASE_URL="https://staging.your-domain.com" AUTH_TOKEN="<jwt>" SERVICE_CALL_ID="<id>" npm run test:postman:invoice-contract
- This runner builds a temporary collection and executes only snippet files listed in the invoice-contract tag manifest.

Maintenance
- Keep snippets generic and reusable.
- Add endpoint-specific snippets as new files instead of editing old ones heavily.
