# Register Customers — Postman Collection Instructions

**Collection file:** `server/tests/postman/register_customers_collection.json`  
**Test case reference:** `register_customers_testcases.md` (workspace root)  
**Error log:** `server/logs/register_customers_test_errors.log`

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Import the Collection](#2-import-the-collection)
3. [Get Your JWT Token](#3-get-your-jwt-token)
4. [Set Collection Variables](#4-set-collection-variables)
5. [Run Order — Critical](#5-run-order--critical)
6. [Folder-by-Folder Guide](#6-folder-by-folder-guide)
7. [Reading Test Results in Postman](#7-reading-test-results-in-postman)
8. [Logging a Failure](#8-logging-a-failure)
9. [Database Verification Queries](#9-database-verification-queries)
10. [Collection Variable Reference](#10-collection-variable-reference)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Prerequisites

Before running the collection, ensure the following are ready:

| Requirement | How to Verify |
|---|---|
| MongoDB is running | `sudo systemctl status mongod` |
| Backend server is running on port 5000 | `cd server && npm run dev` |
| Postman is installed (v10+) | `postman --version` or open the Postman app |
| A registered user account exists | Use `POST /api/auth/register` or the frontend signup |

**Start everything at once:**
```bash
bash ./setup-and-run.sh
```

---

## 2. Import the Collection

1. Open **Postman**
2. Click **Import** (top-left, or `Ctrl+O` / `Cmd+O`)
3. Select **File** tab
4. Navigate to:
   ```
   server/tests/postman/register_customers_collection.json
   ```
5. Click **Import**

The collection **"Register Customers — E2E Test Suite"** will appear in your left sidebar under **Collections**.

---

## 3. Get Your JWT Token

The collection requires a valid JWT. You must obtain one before setting the collection variable.

### Option A — Postman Login Request

Create a new request (outside this collection):

```
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "your-registered-email@example.com",
  "password": "your-password"
}
```

The response will contain a `token` field:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

Copy the token value (everything after `"token":`, without the quotes).

### Option B — curl

```bash
curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}' \
  | grep -o '"token":"[^"]*"'
```

> **Security note:** Do not commit tokens to version control. Tokens expire after 30 days.

---

## 4. Set Collection Variables

The collection uses 6 variables. You only need to set `BASE_URL` and `AUTH_TOKEN` manually — the rest are auto-populated by test scripts.

### Steps

1. In Postman's left sidebar, find **"Register Customers — E2E Test Suite"**
2. Click the **three-dot menu (…)** next to the collection name
3. Select **Edit**
4. Click the **Variables** tab
5. Set the following:

| Variable | Value | Set By |
|---|---|---|
| `BASE_URL` | `http://localhost:5000` | You (manual) |
| `AUTH_TOKEN` | Paste your JWT token here | You (manual) |
| `TS` | *(leave blank)* | Auto — pre-request script |
| `CUSTOMER_ID_QA` | *(leave blank)* | Auto — pre-request script |
| `CUSTOMER_OBJECT_ID` | *(leave blank)* | Auto — happy path test script |
| `SERVICE_CALL_ID` | *(leave blank)* | Auto — happy path test script |

6. Click **Save**

---

## 5. Run Order — Critical

> ⚠️ **You must run the "Setup & Happy Path" folder FIRST.**  
> Downstream folders depend on `CUSTOMER_OBJECT_ID` and `SERVICE_CALL_ID` which are only populated by the happy path requests.

**Correct run order:**

```
1. Setup & Happy Path          ← ALWAYS first — seeds CUSTOMER_OBJECT_ID + SERVICE_CALL_ID
2. RC-API | Server Validation  ← Requires AUTH_TOKEN only
3. RC-NEG | Negative Cases     ← Requires AUTH_TOKEN only
4. RC-SEC | Security Tests     ← Requires AUTH_TOKEN only
```

**Dependency diagram:**
```
AUTH_TOKEN ─────────────────────────────┐
                                        ▼
         ┌── 01 Happy Path Create Customer ──► CUSTOMER_OBJECT_ID
         │                                        │
Setup &  │── 02 Happy Path Create Service Call ──► SERVICE_CALL_ID
Happy    │       (uses CUSTOMER_OBJECT_ID)
Path     │
         └── 03 GET Customer List (verification)

         ↓                     ↓              ↓
   RC-API Tests           RC-NEG Tests    RC-SEC Tests
   (standalone)           (standalone)    (standalone)
```

---

## 6. Folder-by-Folder Guide

### Folder 1 — Setup & Happy Path

**Purpose:** Creates a real customer + service call and confirms the response structure. Seeds collection variables for downstream tests.

**Tests covered:** RC-UI-001, RC-API (happy path), RC-DB-003

| Request | What It Tests | Expected Result |
|---|---|---|
| 01 Happy Path — Create Customer | Full valid customer creation | `201 Created` + `_id` in response, `CUSTOMER_OBJECT_ID` set |
| 02 Happy Path — Create Service Call | Service call linked to created customer | `201 Created` + `_id` in response, `SERVICE_CALL_ID` set |
| 03 GET Customer List (RC-DB-001) | Customer exists in the database | `200 OK` + array contains created customer |

**⚠️ If Request 01 fails:** Stop. Fix the failure before continuing. All downstream tests will break without `CUSTOMER_OBJECT_ID`.

---

### Folder 2 — RC-API | Server Validation

**Purpose:** Verifies that the backend rejects malformed or incomplete requests correctly.

| Request | Test ID | What It Tests | Expected Result |
|---|---|---|---|
| RC-API-001 Missing Required Field — no email | RC-API-001 | POST without `email` | `400` with validation error |
| RC-API-002 Missing Required Field — no contactFirstName | RC-API-002 | POST without `contactFirstName` | `400` with validation error |
| RC-API-003 Missing Required Field — no customerType | RC-API-003 | POST without `customerType` | `400` with validation error |
| RC-API-004 Duplicate customerId | RC-API-004 | POST with same `customerId` twice (re-uses `CUSTOMER_ID_QA`) | `400` or `409` — duplicate rejected |
| RC-API-005a No Auth Token | RC-API-005a | POST without `Authorization` header | `401 Unauthorized` |
| RC-API-005b Malformed Token | RC-API-005b | POST with `Authorization: Bearer INVALID` | `401 Unauthorized` |
| RC-API-005c Partial Write Simulation | RC-API-005c | POST valid customer, then intentionally broken service call payload | Customer `201`, service call `400/500` — partial write risk exposed |
| RC-API-005d customerType 'business' (contract test) | RC-API-005d | POST with `customerType: "business"` (not in backend enum) | Confirms contract defect: `400` expected, `201` is a confirmed bug |
| RC-API-005e customerType 'private' (contract test) | RC-API-005e | POST with `customerType: "private"` (UI-emitted value) | Confirms contract defect: `400` expected, `201` is a confirmed bug |

> **Known Issue — RC-API-005d/e:** The frontend emits `'business'` and `'private'`, but the backend model enum is `headOffice | branch | franchise | singleBusiness | residential`. If these return `201`, it is a confirmed integration defect. Log it with `--severity high`.

---

### Folder 3 — RC-NEG | Negative Cases

**Purpose:** Verifies rejection of logically-invalid but structurally-valid data.

| Request | Test ID | What It Tests | Expected Result |
|---|---|---|---|
| RC-NEG-001 Invalid email format | RC-NEG-001 | POST with `email: "not-an-email"` | `400` — invalid email format rejected |
| RC-NEG-003 Invalid email domain | RC-NEG-003 | POST with `email: "user@"` | `400` — malformed domain rejected |
| RC-NEG-002 Missing residential address | RC-NEG-002 | POST `residential` customer without `physicalAddressDetails` | `400` — address required for residential |

---

### Folder 4 — RC-SEC | Security Tests

**Purpose:** Probes security boundaries. All tests in this folder are **mandatory** — failures must be logged and escalated.

> ❗ **Non-negotiable:** Security test failures require immediate remediation. They cannot be deferred as "low priority."

| Request | Test ID | What It Tests | Expected Result |
|---|---|---|---|
| RC-SEC-003a NoSQL Injection — email field | RC-SEC-003a | POST with `{"email": {"$gt": ""}}` | `400` — not processed by MongoDB |
| RC-SEC-003b NoSQL Injection — customerId field | RC-SEC-003b | POST with `{"customerId": {"$where": "1==1"}}` | `400` — operator not evaluated |
| RC-SEC-004 Oversized input | RC-SEC-004 | POST with 50,000-character `notes` field | `400` or `413` — rejected before DB write |
| RC-SEC-006a No token | RC-SEC-006a | POST with no `Authorization` header | `401` — must not create any resource |
| RC-SEC-006b Empty Bearer | RC-SEC-006b | POST with `Authorization: Bearer ` (empty) | `401` — must not create any resource |
| RC-SEC-006c alg:none JWT attack | RC-SEC-006c | POST with a crafted unsigned JWT: `eyJhbGciOiJub25lIn0.eyJpZCI6ImF0dGFja2VyIn0.` | `401` — `protect` middleware must reject `alg:none` tokens |
| RC-SEC-007 Pro-forma recollection auth | RC-SEC-007 | GET `/api/invoices/share/:token` with spoofed token | `400` or `404` — must not expose other tenant's invoice |

> **RC-SEC-006c is critical.** If the `alg:none` attack returns `200` or `201`, it means the JWT library accepts unsigned tokens. This is a critical vulnerability — log with `--severity critical`.

---

## 7. Reading Test Results in Postman

### Running a Single Request
1. Click the request name
2. Click **Send**
3. In the bottom panel, click the **Test Results** tab
4. Green = pass, Red = fail

### Running a Folder (Recommended)

1. Right-click the folder name → **Run folder**  
   *or*  
   Click the **Run** button (triangle) next to the folder name
2. In the Collection Runner panel, click **Run Register Customers — E2E Test Suite**
3. Review the per-request pass/fail summary

### Understanding Test Assertions

Each request includes `pm.test()` assertions. Examples:

```
✅  [RC-API-001] Status is 400       → Backend correctly rejected missing email
✅  [RC-SEC-006c] alg:none rejected   → JWT library correctly rejects unsigned tokens
❌  [RC-API-005d] Status is 400       → Got 201 — customerType contract defect confirmed
```

A red assertion means the API behaved unexpectedly — that is a **test failure that must be logged.**

---

## 8. Logging a Failure

When a test fails, you **must** log it using the error logger script. Do not skip this step.

### Basic Syntax

```bash
bash ./scripts/log-register-customers-test-result.sh \
  --test-id   <RC-XXX-000> \
  --status    fail \
  --phase     <UI|API|DB|Recollection|Negative|Security> \
  --title     "<short description>" \
  --why       "<root cause explanation>" \
  --how       "<exactly how the failure occurred>" \
  --required-action "<what must be done to fix this>" \
  --severity  <low|medium|high|critical> \
  --security-impact "<none|potential-data-exposure|auth-bypass|injection-risk|etc.>"
```

### Optional Fields

```bash
  --api-status    <HTTP status code observed>
  --api-message   "<response body excerpt>"
  --db-evidence   "<relevant mongosh query output>"
  --ui-evidence   "<screenshot description or console output>"
  --owner         "<name of person responsible>"
```

### Example — Logging a Security Failure

```bash
bash ./scripts/log-register-customers-test-result.sh \
  --test-id "RC-SEC-006c" \
  --status fail \
  --phase Security \
  --title "alg:none JWT accepted by protect middleware" \
  --why "jsonwebtoken library not configured to reject unsigned tokens" \
  --how "POST /api/customers with alg:none JWT returned 201 Created" \
  --required-action "Add algorithms: ['HS256'] to jwt.verify() options in auth.middleware.js" \
  --severity critical \
  --security-impact "auth-bypass: unauthenticated actors can create resources under any tenant" \
  --api-status "201" \
  --api-message "{'data': {'_id': '...', 'customerId': '...'}}"
```

### Example — Logging a Validation Failure

```bash
bash ./scripts/log-register-customers-test-result.sh \
  --test-id "RC-API-001" \
  --status fail \
  --phase API \
  --title "POST /api/customers accepts request with missing email" \
  --why "email field not marked required in Customer model or validator not applied" \
  --how "POST without email returned 201 instead of 400" \
  --required-action "Add required: true to email field in Customer.model.js and re-test" \
  --severity high \
  --security-impact "none" \
  --api-status "201"
```

### Logging a Blocked Test

```bash
bash ./scripts/log-register-customers-test-result.sh \
  --test-id "RC-DB-002" \
  --status blocked \
  --phase DB \
  --title "Cannot verify service call persistence — backend not running" \
  --why "Backend server failed to start (port conflict on 5000)" \
  --how "All requests return ECONNREFUSED" \
  --required-action "Resolve port conflict and restart server" \
  --severity medium \
  --security-impact "none"
```

Logs are written to: `server/logs/register_customers_test_errors.log`

---

## 9. Database Verification Queries

Use these mongosh queries to verify test results at the database level (RC-DB-001, RC-DB-002, RC-DB-003).

### Connect to MongoDB

```bash
mongosh mongodb://localhost:27017/field-service-db
```

### RC-DB-001 — Verify Customer Persisted

```javascript
db.customers.findOne({ customerId: "CUST-QA-<TS>" })
```

Expected: Document returned with all submitted fields.

### RC-DB-002 — Verify Service Call Persisted and Linked

```javascript
db.servicecalls.findOne({ _id: ObjectId("<SERVICE_CALL_ID>") })
```

Expected: Document with `customer: ObjectId("<CUSTOMER_OBJECT_ID>")` field.

### RC-DB-003 — Verify Auth Scope (createdBy = logged-in user)

```javascript
db.customers.findOne({ _id: ObjectId("<CUSTOMER_OBJECT_ID>") }, { createdBy: 1 })
```

Expected: `createdBy` matches the `_id` of the user whose JWT was used.

### RC-DB - Cleanup After Testing

```javascript
// Remove test customers created during the QA run
db.customers.deleteMany({ customerId: /^CUST-QA-/ })

// Remove associated test service calls
db.servicecalls.deleteMany({ "bookingRequest.description": /QA runner/ })
```

> ⚠️ **Run cleanup only in development.** Never run cleanup against production data.

---

## 10. Collection Variable Reference

| Variable | Set By | Purpose | Example Value |
|---|---|---|---|
| `BASE_URL` | Manual | Backend API base URL | `http://localhost:5000` |
| `AUTH_TOKEN` | Manual | Valid JWT for auth | `eyJhbGciOiJIUzI1...` |
| `TS` | Pre-request script (Request 01) | Unique timestamp for this test run | `1711289400000` |
| `CUSTOMER_ID_QA` | Pre-request script (Request 01) | Unique customer ID for this run | `CUST-QA-1711289400000` |
| `CUSTOMER_OBJECT_ID` | Test script (Request 01) | MongoDB `_id` of created customer | `65f8a3b...` |
| `SERVICE_CALL_ID` | Test script (Request 02) | MongoDB `_id` of created service call | `65f8a4c...` |

**Variable dependency chain:**
```
Request 01 runs  →  TS set (pre-request)
                 →  CUSTOMER_ID_QA set (pre-request)
                 →  CUSTOMER_OBJECT_ID set (test script, from response)

Request 02 runs  →  SERVICE_CALL_ID set (test script, from response)
                    (uses CUSTOMER_OBJECT_ID in body)

Requests 03–20   →  use CUSTOMER_OBJECT_ID and SERVICE_CALL_ID
```

---

## 11. Troubleshooting

### `401 Unauthorized` on every request

Your `AUTH_TOKEN` is missing, expired, or incorrect.

1. Log in again: `POST /api/auth/login`
2. Copy the new token
3. Update the `AUTH_TOKEN` collection variable

---

### `ECONNREFUSED` / Could not connect

The backend is not running.

```bash
cd server && npm run dev
```

Verify it started on port 5000:
```bash
ss -tlpn | grep 5000
```

---

### `CUSTOMER_OBJECT_ID` is empty — downstream tests fail

Request 01 (Happy Path — Create Customer) did not complete successfully.

1. Open the **Test Results** tab after running Request 01
2. Fix the failure indicated there
3. Re-run Request 01 to repopulate `CUSTOMER_OBJECT_ID`
4. Then continue with the remaining folders

---

### RC-DB requests return empty / null

The test database may not be `field-service-db`. Verify:

```bash
mongosh --eval "db.adminCommand({listDatabases: 1})"
```

Check `MONGODB_URI` in `server/.env` matches the database you are querying.

---

### Duplicate `customerId` error on re-run

`CUSTOMER_ID_QA` is timestamp-based so it changes each run. If you see duplicates, you may have re-run Request 01 without resetting. Clean up:

```javascript
db.customers.deleteMany({ customerId: /^CUST-QA-/ })
```

---

### `alg:none` test (RC-SEC-006c) returns `200` or `201`

This is a **critical security defect**, not a test configuration issue.

1. Log the failure immediately:
   ```bash
   bash ./scripts/log-register-customers-test-result.sh \
     --test-id "RC-SEC-006c" --status fail --phase Security \
     --title "alg:none JWT accepted" \
     --why "jwt.verify() missing algorithms restriction" \
     --how "Unsigned token returned 201" \
     --required-action "Add { algorithms: ['HS256'] } to jwt.verify() in auth.middleware.js" \
     --severity critical \
     --security-impact "auth-bypass"
   ```
2. Fix `server/middleware/auth.middleware.js` before any further testing.

---

## Related Files

| File | Purpose |
|---|---|
| `register_customers_testcases.md` | Full test specification — 29 test cases across 6 phases |
| `scripts/run-register-customers-tests.sh` | Interactive terminal test runner (alternative to Postman) |
| `scripts/log-register-customers-test-result.sh` | Structured failure logger |
| `server/logs/register_customers_test_errors.log` | Append-only failure log |
| `server/logs/test_run_<timestamp>.log` | Per-run summary from the terminal runner |
| `server/tests/postman/register_customers_collection.json` | This Postman collection |

---

*Last Updated: 2026-03-24*
