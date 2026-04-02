#!/usr/bin/env bash
#
# scripts/run-register-customers-tests.sh
# =========================================
# Interactive test runner for the Register Customers E2E test suite.
#
# Usage:
#   bash ./scripts/run-register-customers-tests.sh [options]
#
# Options:
#   --filter <phase>     Run only tests in a given phase
#                        (UI | API | DB | Recollection | Negative | Security)
#   --from <test-id>     Resume from (and including) a specific test ID
#   --dry-run            Print all test cases without prompting for results
#   -h, --help           Show this message
#
# Output files:
#   server/logs/register_customers_test_errors.log   per-test fail/block records
#   server/logs/test_run_<timestamp>.log             full run summary
#
# References:
#   register_customers_testcases.md
#   scripts/log-register-customers-test-result.sh
#
# ─────────────────────────────────────────────────────────────────────────────

# ── 0. Locate workspace root ─────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$WORKSPACE_ROOT"

LOGGER="$SCRIPT_DIR/log-register-customers-test-result.sh"
LOG_DIR="$WORKSPACE_ROOT/server/logs"
ERROR_LOG="$LOG_DIR/register_customers_test_errors.log"
TS_RAW="$(date -u +"%Y%m%dT%H%M%SZ")"
RUN_LOG="$LOG_DIR/test_run_${TS_RAW}.log"

# ── 1. Color helpers (only when writing to a terminal) ───────────────────────
if [[ -t 1 ]]; then
  C_GREEN="\033[0;32m"; C_RED="\033[0;31m"; C_YELLOW="\033[1;33m"
  C_CYAN="\033[0;36m";  C_BLUE="\033[0;34m"; C_BOLD="\033[1m"
  C_DIM="\033[2m";      C_RESET="\033[0m"
else
  C_GREEN=""; C_RED=""; C_YELLOW=""; C_CYAN=""; C_BLUE=""
  C_BOLD=""; C_DIM=""; C_RESET=""
fi

# ── 2. Counters ───────────────────────────────────────────────────────────────
COUNT_PASS=0; COUNT_FAIL=0; COUNT_BLOCK=0; COUNT_SKIP=0
RESULTS=()   # entries: "RC-UI-001|pass", "RC-API-002|fail", etc.

# ── 3. CLI argument parsing ───────────────────────────────────────────────────
FILTER_PHASE=""
FROM_ID=""
DRY_RUN=false

usage() {
cat <<'USAGE'

Usage: bash ./scripts/run-register-customers-tests.sh [options]

Options:
  --filter <phase>   Run only tests in a given phase
                     Values: UI | API | DB | Recollection | Negative | Security
  --from <test-id>   Resume the suite from (and including) this test ID
                     Example: --from RC-DB-001
  --dry-run          Print all test cases without prompting for results
  -h, --help         Show this message

Examples:
  bash ./scripts/run-register-customers-tests.sh
  bash ./scripts/run-register-customers-tests.sh --filter Security
  bash ./scripts/run-register-customers-tests.sh --from RC-DB-001
  bash ./scripts/run-register-customers-tests.sh --dry-run
  bash ./scripts/run-register-customers-tests.sh --filter UI --dry-run

USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --filter)   FILTER_PHASE="${2:-}"; shift 2 ;;
    --from)     FROM_ID="${2:-}"; shift 2 ;;
    --dry-run)  DRY_RUN=true; shift ;;
    -h|--help)  usage; exit 0 ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

# ── 4. Test case registry: "ID|PHASE|TITLE" ───────────────────────────────────
TESTS=(
  "RC-UI-001|UI|Happy Path Registration (New Customer + Service Call)"
  "RC-UI-002|UI|Required Existing Customer Selection Validation"
  "RC-UI-003|UI|Electrical Unsupported Path Guard"
  "RC-UI-004|UI|Generator Required Fields Validation"
  "RC-UI-005|UI|Service Message Required by Category"
  "RC-API-001|API|Create Customer — Missing Required Fields Returns 400"
  "RC-API-002|API|Duplicate Customer ID Rejected with 400"
  "RC-API-003|API|Unauthorized Request Rejected with 401/403"
  "RC-API-004|API|Partial Write Safety Check (Sequential Write Risk)"
  "RC-API-005|API|Customer Type Contract Compatibility Check"
  "RC-DB-001|DB|Customer Document Persisted in MongoDB"
  "RC-DB-002|DB|Service Call Linked to Customer ObjectId"
  "RC-DB-003|DB|createdBy Scoping Verified on Customer Document"
  "RC-REC-001|Recollection|Customer Appears in Create Quotation Dropdown"
  "RC-REC-002|Recollection|Quotation Submission with New Customer Succeeds"
  "RC-REC-003|Recollection|Invoice Pro-Forma Seeded from Service Call"
  "RC-NEG-001|Negative|Invalid Email Format Rejected"
  "RC-NEG-002|Negative|Missing Physical Address for Residential Flow"
  "RC-NEG-003|Negative|Stale Token During Submit Rejected"
  "RC-SEC-001|Security|Stored XSS Payload in Notes Field"
  "RC-SEC-002|Security|Reflected XSS-like Payload in Name Fields"
  "RC-SEC-003|Security|SQL/NoSQL Injection Probe in Email Field"
  "RC-SEC-004|Security|Oversized Input Handling"
  "RC-SEC-005|Security|Duplicate Customer ID Race Condition"
  "RC-SEC-006|Security|Auth Bypass Attempt (no/expired/malformed token)"
  "RC-SEC-007|Security|Tenant Isolation / Ownership Check"
  "RC-SEC-008|Security|Address/HTML Injection in Recollection Flows"
  "RC-SEC-009|Security|Sensitive Data Exposure in Server Logs"
  "RC-SEC-010|Security|Sequential-Write Integrity Risk Validation"
)

# ── 5. Test detail printer ────────────────────────────────────────────────────
show_details() {
  local id="$1"
  case "$id" in
    RC-UI-001)
      echo "  Steps:"
      echo "    1. Navigate to /customers/register"
      echo "    2. Ensure 'Use Existing Customer' toggle is disabled"
      echo "    3. Fill all required fields: name, email, phone, customerId, service details"
      echo "    4. Submit the form"
      echo "  Expected:"
      echo "    - Success toast: 'Customer and service request saved successfully'"
      echo "    - Form resets after successful submit"
      echo "    - New customer appears in customer listings"
      ;;
    RC-UI-002)
      echo "  Steps:"
      echo "    1. Enable the 'Use Existing Customer' toggle"
      echo "    2. Do NOT select a customer from the dropdown"
      echo "    3. Submit the form"
      echo "  Expected:"
      echo "    - Error: 'Please select an existing customer'"
      echo "    - No API call to POST /api/service-calls is made"
      ;;
    RC-UI-003)
      echo "  Steps:"
      echo "    1. Select service category: Electrical"
      echo "    2. Set electrical type to 'building-wiring'"
      echo "    3. Submit"
      echo "  Expected:"
      echo "    - Error: 'We do not perform building wiring electrical services'"
      echo "    - No API writes attempted"
      ;;
    RC-UI-004)
      echo "  Steps:"
      echo "    1. Select service category: Generator"
      echo "    2. Leave generator brand and model fields empty"
      echo "    3. Submit"
      echo "  Expected:"
      echo "    - Validation error: generator brand and model are required"
      ;;
    RC-UI-005)
      echo "  Steps:"
      echo "    1. For Generator / Electrical / Plumbing: leave subject/message empty"
      echo "    2. Submit for each category separately"
      echo "  Expected:"
      echo "    - Category-specific validation error displayed for each"
      ;;
    RC-API-001)
      echo "  Steps:"
      echo "    1. POST /api/customers omitting each required field one at a time:"
      echo "       customerType, contactFirstName, contactLastName, email, phoneNumber, customerId"
      echo "  Expected:"
      echo "    - HTTP 400 for each missing field case"
      echo "    - Body: { message: 'Please fill in all required fields' }"
      echo "  Tip: Use Postman collection → 'RC-API | Server Validation' folder"
      ;;
    RC-API-002)
      echo "  Steps:"
      echo "    1. Create a customer successfully (note the customerId used)"
      echo "    2. POST /api/customers again with the SAME customerId"
      echo "  Expected:"
      echo "    - HTTP 400"
      echo "    - Body: { message: 'Customer ID already exists' }"
      ;;
    RC-API-003)
      echo "  Steps:"
      echo "    1. Call POST /api/customers with NO Authorization header"
      echo "    2. Call with an expired JWT token"
      echo "    3. Call with a malformed token: 'Bearer bad.token.value'"
      echo "  Expected:"
      echo "    - HTTP 401 or 403 in all three cases"
      echo "    - No DB writes occur"
      ;;
    RC-API-004)
      echo "  Steps:"
      echo "    1. POST /api/customers with a valid payload → succeeds (note customer _id)"
      echo "    2. POST /api/service-calls with INVALID payload (e.g. omit title)"
      echo "       using the returned customer _id as 'customer' field"
      echo "  Expected:"
      echo "    - Service call creation returns 400"
      echo "    - Customer record REMAINS in DB — no rollback (known architectural risk)"
      echo "    - UI should show service call failure message"
      echo "  NOTE: Record this as expected current behavior and log as known risk."
      ;;
    RC-API-005)
      echo "  Steps:"
      echo "    1. POST /api/customers with customerType='business'"
      echo "    2. POST /api/customers with customerType='private'"
      echo "    3. Check if backend accepts or rejects these values"
      echo "  Expected:"
      echo "    - Backend model enum: headOffice | branch | franchise | singleBusiness | residential"
      echo "    - Controller explicitly handles 'business' and 'residential' as special cases"
      echo "    - 'private' is NOT in either list — verify behavior and log as integration defect"
      ;;
    RC-DB-001)
      echo "  Steps:"
      echo "    1. Complete RC-UI-001 successfully"
      echo "    2. Open mongosh or Compass and query:"
      echo "       db.customers.find({ customerId: '<your-test-id>' }).pretty()"
      echo "  Expected:"
      echo "    - Exactly one document found"
      echo "    - Fields present: contactFirstName, contactLastName, email,"
      echo "      phoneNumber, customerId, createdBy, createdAt, updatedAt"
      ;;
    RC-DB-002)
      echo "  Steps:"
      echo "    1. Get the customer _id from RC-DB-001"
      echo "    2. Query: db.servicecalls.find({ customer: ObjectId('<id>') }).pretty()"
      echo "  Expected:"
      echo "    - Service call document exists"
      echo "    - 'customer' field references the correct customer _id"
      echo "    - serviceType, title, description fields are populated"
      ;;
    RC-DB-003)
      echo "  Steps:"
      echo "    1. Query: db.customers.find({ customerId: '<test-id>' })"
      echo "    2. Inspect the 'createdBy' field value"
      echo "  Expected:"
      echo "    - createdBy matches the ObjectId of the authenticated user"
      echo "    - GET /api/customers only returns documents owned by the same user"
      ;;
    RC-REC-001)
      echo "  Steps:"
      echo "    1. Register a new customer (RC-UI-001)"
      echo "    2. Navigate to Create Quotation modal/workflow"
      echo "    3. Inspect the customer selector/dropdown"
      echo "  Expected:"
      echo "    - Newly created customer appears in the list"
      echo "    - Selection correctly binds the customer _id"
      ;;
    RC-REC-002)
      echo "  Steps:"
      echo "    1. Select the newly created customer in the quotation form"
      echo "    2. Fill all required quotation fields"
      echo "    3. Submit"
      echo "  Expected:"
      echo "    - Quotation created: HTTP 201"
      echo "    - Quotation document 'customer' field equals the customer _id"
      ;;
    RC-REC-003)
      echo "  Steps:"
      echo "    1. Note the service call ID created during registration"
      echo "    2. Trigger pro-forma flow:"
      echo "       POST /api/invoices/from-service-call/<serviceCallId>/pro-forma"
      echo "  Expected:"
      echo "    - Invoice pro-forma created successfully"
      echo "    - Invoice is linked to the service call and customer context"
      ;;
    RC-NEG-001)
      echo "  Steps:"
      echo "    1. POST /api/customers with email field set to 'notanemail'"
      echo "    2. Also try: 'test@@bad.com', 'plainaddress', '@missing-local.org'"
      echo "  Expected:"
      echo "    - HTTP 400 for all malformed email values"
      echo "    - Model/controller regex validation rejects them"
      ;;
    RC-NEG-002)
      echo "  Steps:"
      echo "    1. Submit residential customer flow (customerType='residential')"
      echo "    2. Omit physicalAddress / physicalAddressDetails entirely"
      echo "  Expected:"
      echo "    - HTTP 400: 'Physical address is required for residential customers'"
      ;;
    RC-NEG-003)
      echo "  Steps:"
      echo "    1. Log in and get a valid JWT"
      echo "    2. Wait for or manually tamper the token to make it expired"
      echo "    3. Submit the registration form using the stale token"
      echo "  Expected:"
      echo "    - HTTP 401 or 403"
      echo "    - No new DB writes"
      ;;
    RC-SEC-001)
      echo "  SECURITY TEST — Stored XSS"
      echo "  Steps:"
      echo "    1. Enter the following in the notes field:"
      echo "       <script>alert('xss-rc-sec-001')</script>"
      echo "    2. Submit registration (expect 201 from API)"
      echo "    3. Navigate to any UI view that renders this customer's notes field"
      echo "  Expected:"
      echo "    - The script tag does NOT execute in the browser"
      echo "    - It is rendered as HTML-encoded text: &lt;script&gt;..."
      echo "  If payload EXECUTES: log as CRITICAL security defect immediately"
      ;;
    RC-SEC-002)
      echo "  SECURITY TEST — Reflected XSS in Name Fields"
      echo "  Steps:"
      echo "    1. Enter in contactFirstName: <img src=x onerror=alert('sec002')>"
      echo "    2. Submit and navigate to any customer list/profile view"
      echo "  Expected:"
      echo "    - No JavaScript execution"
      echo "    - Rendered as literal text: <img src=x ...>"
      ;;
    RC-SEC-003)
      echo "  SECURITY TEST — NoSQL Injection"
      echo "  Steps:"
      echo "    1. POST /api/customers with body email field set to: { \"\$ne\": null }"
      echo "    2. POST with email: \"test@x.com' OR '1'='1\""
      echo "    3. Observe API response and check DB for unexpected writes"
      echo "  Expected:"
      echo "    - Both requests rejected by validation or Mongoose type coercion"
      echo "    - No document created by the injected query logic"
      echo "  Tip: Use Postman collection → 'RC-SEC | Security Tests' folder"
      ;;
    RC-SEC-004)
      echo "  SECURITY TEST — Oversized Input"
      echo "  Steps:"
      echo "    1. Submit notes field with a string of 100,000+ characters"
      echo "    2. Submit businessName with 10,000 characters"
      echo "    3. Observe API response time and server stability"
      echo "  Expected:"
      echo "    - Request rejected or truncated safely"
      echo "    - No server crash, OOM error, or extreme response time"
      ;;
    RC-SEC-005)
      echo "  SECURITY TEST — Race Condition (Duplicate customerId)"
      echo "  Steps:"
      echo "    1. Fire 5-10 near-simultaneous POST /api/customers with identical customerId"
      echo "       (use curl parallel, Apache Bench, or Postman runner)"
      echo "  Expected:"
      echo "    - Exactly ONE document created in DB"
      echo "    - All other requests fail: duplicate constraint error"
      echo "    - MongoDB unique index on customerId enforces this"
      ;;
    RC-SEC-006)
      echo "  SECURITY TEST — Auth Bypass"
      echo "  Steps:"
      echo "    1. POST /api/customers with NO Authorization header"
      echo "    2. POST with header: 'Authorization: Bearer '"
      echo "    3. POST with alg:none JWT: 'Authorization: Bearer eyJhbGciOiJub25lIn0.e30.'"
      echo "    4. POST with random string: 'Authorization: Bearer notavalidtoken'"
      echo "  Expected:"
      echo "    - ALL four requests rejected with HTTP 401 or 403"
      echo "    - Zero data written to DB in any case"
      ;;
    RC-SEC-007)
      echo "  SECURITY TEST — Tenant Isolation"
      echo "  Steps:"
      echo "    1. User A creates a customer → note the customer _id"
      echo "    2. Authenticate as User B (different account)"
      echo "    3. User B: GET /api/customers/<user-A-customer-id>"
      echo "    4. User B: PUT /api/customers/<user-A-customer-id>"
      echo "    5. User B: DELETE /api/customers/<user-A-customer-id>"
      echo "  Expected:"
      echo "    - All return 404 (not found, due to createdBy scoping) or 403"
      echo "    - User B's GET /api/customers must NOT include User A's records"
      ;;
    RC-SEC-008)
      echo "  SECURITY TEST — HTML Injection in Recollection Flows"
      echo "  Steps:"
      echo "    1. Register customer with HTML in street address: <b>Main Street</b> & Oak"
      echo "    2. Open Create Quotation — verify customer appears in dropdown"
      echo "    3. Select customer — verify address renders safely"
      echo "    4. Open invoice seeding flow — verify same safety"
      echo "  Expected:"
      echo "    - '<b>Main Street</b>' is rendered as literal text, not bold HTML"
      echo "    - Ampersand is encoded as &amp; or shown as literal &"
      ;;
    RC-SEC-009)
      echo "  SECURITY TEST — Sensitive Data Exposure in Server Logs"
      echo "  Steps:"
      echo "    1. Trigger a deliberate validation failure on POST /api/customers"
      echo "       (omit a required field)"
      echo "    2. Inspect: server/logs/error.log"
      echo "    3. Inspect: server/logs/request.log"
      echo "  Expected:"
      echo "    - No raw JWT tokens in log output"
      echo "    - No full password hashes or secrets logged"
      echo "    - PII (email, address) NOT present in error log unnecessarily"
      echo "    - Logs show only: HTTP status, route, error message"
      ;;
    RC-SEC-010)
      echo "  SECURITY TEST — Sequential Write Integrity Risk"
      echo "  Steps:"
      echo "    1. POST /api/customers with valid payload (succeeds)"
      echo "    2. Immediately POST /api/service-calls with deliberately bad payload"
      echo "       (omit title or description)"
      echo "    3. Query DB: customer should exist, service call should not"
      echo "  Expected:"
      echo "    - Partial-write state is confirmed (known architectural risk)"
      echo "    - Document the state: customer persisted, service call absent"
      echo "    - Log with remediation: introduce MongoDB session/transaction"
      ;;
    *)
      echo "  (No test detail defined for $id — see register_customers_testcases.md)"
      ;;
  esac
}

# ── 6. Prompt for failure/block metadata then call the logger ────────────────
prompt_and_log_failure() {
  local test_id="$1"
  local phase="$2"
  local title="$3"
  local status="$4"   # fail | blocked

  echo ""
  echo -e "${C_BOLD}  ── Failure details (required) ──────────────────────────────${C_RESET}"
  echo ""

  read -r -p "  Why did it fail? (root cause): " WHY
  [[ -z "$WHY" ]] && WHY="Not provided"

  read -r -p "  How did it fail? (exact steps / input / repro path): " HOW
  [[ -z "$HOW" ]] && HOW="Not provided"

  read -r -p "  Required remediation action: " REQUIRED_ACTION
  [[ -z "$REQUIRED_ACTION" ]] && REQUIRED_ACTION="Under investigation"

  local SEVERITY=""
  while true; do
    read -r -p "  Severity [low/medium/high/critical]: " SEVERITY
    SEVERITY="${SEVERITY,,}"
    case "$SEVERITY" in
      low|medium|high|critical) break ;;
      *) echo "  Invalid value. Enter: low, medium, high, or critical" ;;
    esac
  done

  read -r -p "  Security impact (none / low / medium / high / critical + description): " SECURITY_IMPACT
  [[ -z "$SECURITY_IMPACT" ]] && SECURITY_IMPACT="none"

  read -r -p "  API status code (Enter to skip): " API_STATUS
  [[ -z "$API_STATUS" ]] && API_STATUS="N/A"

  read -r -p "  API response message (Enter to skip): " API_MESSAGE
  [[ -z "$API_MESSAGE" ]] && API_MESSAGE="N/A"

  read -r -p "  DB evidence (collection/query/result, Enter to skip): " DB_EVIDENCE
  [[ -z "$DB_EVIDENCE" ]] && DB_EVIDENCE="N/A"

  read -r -p "  UI evidence / screenshot reference (Enter to skip): " UI_EVIDENCE
  [[ -z "$UI_EVIDENCE" ]] && UI_EVIDENCE="N/A"

  read -r -p "  Owner (Enter for 'QA'): " OWNER
  [[ -z "$OWNER" ]] && OWNER="QA"

  echo ""
  if bash "$LOGGER" \
      --test-id         "$test_id" \
      --status          "$status" \
      --phase           "$phase" \
      --title           "$title" \
      --why             "$WHY" \
      --how             "$HOW" \
      --required-action "$REQUIRED_ACTION" \
      --severity        "$SEVERITY" \
      --security-impact "$SECURITY_IMPACT" \
      --api-status      "$API_STATUS" \
      --api-message     "$API_MESSAGE" \
      --db-evidence     "$DB_EVIDENCE" \
      --ui-evidence     "$UI_EVIDENCE" \
      --owner           "$OWNER"; then
    echo -e "  ${C_DIM}→ Logged to: $ERROR_LOG${C_RESET}"
  else
    echo -e "  ${C_RED}Warning: logger script exited with an error. Check $ERROR_LOG manually.${C_RESET}" >&2
  fi
}

# ── 7. Pass log (minimal record for audit completeness) ──────────────────────
log_pass() {
  local test_id="$1"
  local phase="$2"
  local title="$3"

  bash "$LOGGER" \
    --test-id         "$test_id" \
    --status          "pass" \
    --phase           "$phase" \
    --title           "$title" \
    --why             "N/A" \
    --how             "N/A" \
    --required-action "N/A" \
    --security-impact "N/A" \
    --severity        "N/A" \
    2>/dev/null || true
}

# ── 8. Print final summary to screen + write run log ─────────────────────────
print_summary() {
  local total=$(( COUNT_PASS + COUNT_FAIL + COUNT_BLOCK + COUNT_SKIP ))
  echo ""
  echo -e "${C_BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${C_RESET}"
  echo -e "${C_BOLD}  TEST RUN SUMMARY — Register Customers Suite${C_RESET}"
  echo -e "${C_DIM}  Completed: $(date -u +"%Y-%m-%d %H:%M:%S UTC")${C_RESET}"
  echo -e "${C_BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${C_RESET}"
  printf "  %-12s %s\n" "Total run:"  "$total"
  echo -e "  ${C_GREEN}$(printf "%-12s" "Passed:")     $COUNT_PASS${C_RESET}"
  echo -e "  ${C_RED}$(printf "%-12s" "Failed:")     $COUNT_FAIL${C_RESET}"
  echo -e "  ${C_YELLOW}$(printf "%-12s" "Blocked:")    $COUNT_BLOCK${C_RESET}"
  echo -e "  ${C_CYAN}$(printf "%-12s" "Skipped:")    $COUNT_SKIP${C_RESET}"
  echo ""

  if (( COUNT_FAIL > 0 || COUNT_BLOCK > 0 )); then
    echo -e "  ${C_BOLD}Failed / Blocked tests:${C_RESET}"
    for entry in "${RESULTS[@]}"; do
      local eid="${entry%%|*}"
      local estat="${entry##*|}"
      if [[ "$estat" == "fail" ]]; then
        echo -e "    ${C_RED}✗ $eid${C_RESET}"
      elif [[ "$estat" == "blocked" ]]; then
        echo -e "    ${C_YELLOW}⊘ $eid${C_RESET}"
      fi
    done
    echo ""
    echo -e "  Full failure details → ${C_BLUE}server/logs/register_customers_test_errors.log${C_RESET}"
  fi

  if (( COUNT_FAIL == 0 && COUNT_BLOCK == 0 && COUNT_SKIP == 0 )); then
    echo -e "  ${C_GREEN}${C_BOLD}✓ All tests passed.${C_RESET}"
  fi

  echo -e "${C_BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${C_RESET}"

  # ── Write machine-readable run summary ──
  mkdir -p "$LOG_DIR"
  {
    echo "=================================================================="
    echo "  TEST RUN SUMMARY — Register Customers Suite"
    echo "  Run at:    $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
    echo "  Filter:    ${FILTER_PHASE:-none}"
    echo "  From ID:   ${FROM_ID:-start}"
    echo "=================================================================="
    printf "  %-10s %s\n" "Total:"   "$total"
    printf "  %-10s %s\n" "Passed:"  "$COUNT_PASS"
    printf "  %-10s %s\n" "Failed:"  "$COUNT_FAIL"
    printf "  %-10s %s\n" "Blocked:" "$COUNT_BLOCK"
    printf "  %-10s %s\n" "Skipped:" "$COUNT_SKIP"
    echo ""
    echo "  Test results:"
    for entry in "${RESULTS[@]}"; do
      local eid="${entry%%|*}"
      local estat="${entry##*|}"
      printf "    %-22s  %s\n" "$eid" "$estat"
    done
    echo ""
    echo "  Failure log: $ERROR_LOG"
    echo "=================================================================="
  } > "$RUN_LOG"

  echo ""
  echo -e "  ${C_DIM}Run log saved → $RUN_LOG${C_RESET}"
  echo ""
}

# ── 9. Preflight checks ───────────────────────────────────────────────────────
if [[ ! -f "$LOGGER" ]]; then
  echo "ERROR: logger script not found: $LOGGER" >&2
  echo "       Ensure scripts/log-register-customers-test-result.sh exists." >&2
  exit 1
fi

mkdir -p "$LOG_DIR"

# ── 10. Banner ────────────────────────────────────────────────────────────────
echo ""
echo -e "${C_BOLD}╔═══════════════════════════════════════════════════════════════╗${C_RESET}"
echo -e "${C_BOLD}║   REGISTER CUSTOMERS — INTERACTIVE TEST RUNNER               ║${C_RESET}"
echo -e "${C_BOLD}║   Suite: Customer Registration E2E (29 test cases)            ║${C_RESET}"
echo -e "${C_BOLD}╚═══════════════════════════════════════════════════════════════╝${C_RESET}"
echo ""
echo -e "  ${C_DIM}Run start: $(date -u +"%Y-%m-%d %H:%M UTC")${C_RESET}"
echo -e "  ${C_DIM}Error log: server/logs/register_customers_test_errors.log${C_RESET}"
echo -e "  ${C_DIM}Run log:   server/logs/test_run_${TS_RAW}.log${C_RESET}"
[[ -n "$FILTER_PHASE" ]] && echo -e "  ${C_YELLOW}Filter:    Phase = $FILTER_PHASE${C_RESET}"
[[ -n "$FROM_ID"      ]] && echo -e "  ${C_YELLOW}Resume:    From $FROM_ID onwards${C_RESET}"
$DRY_RUN && echo -e "  ${C_CYAN}Mode:      DRY RUN (results not recorded)${C_RESET}"
echo ""

if ! $DRY_RUN; then
  echo -e "  ${C_DIM}Controls:  p = pass  |  f = fail  |  b = blocked  |  s = skip  |  q = quit${C_RESET}"
  echo ""
fi

# ── 11. Main test loop ────────────────────────────────────────────────────────
TOTAL_TESTS=${#TESTS[@]}
CUR_IDX=0
REACHED_FROM_ID=false

for entry in "${TESTS[@]}"; do
  IFS='|' read -r tc_id tc_phase tc_title <<< "$entry"
  CUR_IDX=$(( CUR_IDX + 1 ))

  # Handle --from: skip tests before the specified start ID
  if [[ -n "$FROM_ID" && "$REACHED_FROM_ID" == "false" ]]; then
    if [[ "$tc_id" == "$FROM_ID" ]]; then
      REACHED_FROM_ID=true
    else
      RESULTS+=("${tc_id}|skipped-before-resume")
      COUNT_SKIP=$(( COUNT_SKIP + 1 ))
      continue
    fi
  fi

  # Handle --filter: skip tests not in the requested phase
  if [[ -n "$FILTER_PHASE" && "${tc_phase,,}" != "${FILTER_PHASE,,}" ]]; then
    RESULTS+=("${tc_id}|skipped-filter")
    COUNT_SKIP=$(( COUNT_SKIP + 1 ))
    continue
  fi

  # ── Print test case header ────────────────────────────────────────────────
  echo -e "${C_BOLD}─────────────────────────────────────────────────────────────────${C_RESET}"
  echo -e "  ${C_BLUE}[${CUR_IDX}/${TOTAL_TESTS}]${C_RESET}  ${C_BOLD}Phase:${C_RESET} ${tc_phase}  |  ${C_BOLD}${tc_id}${C_RESET}"
  echo -e "  ${C_BOLD}Title:${C_RESET} ${tc_title}"
  echo ""
  show_details "$tc_id"
  echo ""

  # ── Dry run: skip prompt ──────────────────────────────────────────────────
  if $DRY_RUN; then
    echo -e "  ${C_DIM}[dry-run — result not recorded]${C_RESET}"
    echo ""
    continue
  fi

  # ── Prompt for result ─────────────────────────────────────────────────────
  RESULT=""
  while true; do
    read -r -p "  Result [p=pass / f=fail / b=blocked / s=skip / q=quit]: " RESULT
    RESULT="${RESULT,,}"
    case "$RESULT" in
      p|pass)
        RESULT="pass"
        COUNT_PASS=$(( COUNT_PASS + 1 ))
        echo -e "  ${C_GREEN}✓ Passed${C_RESET}"
        log_pass "$tc_id" "$tc_phase" "$tc_title"
        break
        ;;
      f|fail)
        RESULT="fail"
        COUNT_FAIL=$(( COUNT_FAIL + 1 ))
        echo -e "  ${C_RED}✗ Failed — collecting failure details...${C_RESET}"
        prompt_and_log_failure "$tc_id" "$tc_phase" "$tc_title" "fail"
        break
        ;;
      b|block|blocked)
        RESULT="blocked"
        COUNT_BLOCK=$(( COUNT_BLOCK + 1 ))
        echo -e "  ${C_YELLOW}⊘ Blocked — collecting context...${C_RESET}"
        prompt_and_log_failure "$tc_id" "$tc_phase" "$tc_title" "blocked"
        break
        ;;
      s|skip)
        RESULT="skip"
        COUNT_SKIP=$(( COUNT_SKIP + 1 ))
        echo -e "  ${C_CYAN}→ Skipped${C_RESET}"
        break
        ;;
      q|quit)
        echo ""
        echo -e "  ${C_YELLOW}Test run aborted by user at $tc_id.${C_RESET}"
        RESULTS+=("${tc_id}|aborted")
        print_summary
        exit 0
        ;;
      *)
        echo "  Invalid input. Enter p, f, b, s, or q"
        ;;
    esac
  done

  RESULTS+=("${tc_id}|${RESULT}")
  echo ""
done

# ── 12. Final summary ─────────────────────────────────────────────────────────
print_summary
