#!/usr/bin/env bash

set -euo pipefail

LOG_FILE="server/logs/register_customers_test_errors.log"

usage() {
  cat <<'USAGE'
Usage:
  bash ./scripts/log-register-customers-test-result.sh \
    --test-id <ID> \
    --status <pass|fail|blocked> \
    --phase <UI|API|DB|Recollection|Security> \
    --title <short title> \
    --why <root cause> \
    --how <how it failed> \
    --required-action <required remediation> \
    [--security-impact <impact>] \
    [--severity <low|medium|high|critical>] \
    [--api-status <status code>] \
    [--api-message <message>] \
    [--db-evidence <db proof>] \
    [--ui-evidence <ui proof>] \
    [--owner <owner>]
USAGE
}

TEST_ID=""
STATUS=""
PHASE=""
TITLE=""
WHY=""
HOW=""
REQUIRED_ACTION=""
SECURITY_IMPACT=""
SEVERITY=""
API_STATUS=""
API_MESSAGE=""
DB_EVIDENCE=""
UI_EVIDENCE=""
OWNER=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --test-id) TEST_ID="${2:-}"; shift 2 ;;
    --status) STATUS="${2:-}"; shift 2 ;;
    --phase) PHASE="${2:-}"; shift 2 ;;
    --title) TITLE="${2:-}"; shift 2 ;;
    --why) WHY="${2:-}"; shift 2 ;;
    --how) HOW="${2:-}"; shift 2 ;;
    --required-action) REQUIRED_ACTION="${2:-}"; shift 2 ;;
    --security-impact) SECURITY_IMPACT="${2:-}"; shift 2 ;;
    --severity) SEVERITY="${2:-}"; shift 2 ;;
    --api-status) API_STATUS="${2:-}"; shift 2 ;;
    --api-message) API_MESSAGE="${2:-}"; shift 2 ;;
    --db-evidence) DB_EVIDENCE="${2:-}"; shift 2 ;;
    --ui-evidence) UI_EVIDENCE="${2:-}"; shift 2 ;;
    --owner) OWNER="${2:-}"; shift 2 ;;
    --help|-h) usage; exit 0 ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$TEST_ID" || -z "$STATUS" || -z "$PHASE" || -z "$TITLE" ]]; then
  echo "Missing required fields: --test-id, --status, --phase, --title" >&2
  usage
  exit 1
fi

if [[ "$STATUS" != "pass" && "$STATUS" != "fail" && "$STATUS" != "blocked" ]]; then
  echo "Invalid --status. Use: pass, fail, blocked" >&2
  exit 1
fi

if [[ "$STATUS" == "fail" ]]; then
  if [[ -z "$WHY" || -z "$HOW" || -z "$REQUIRED_ACTION" || -z "$SEVERITY" || -z "$SECURITY_IMPACT" ]]; then
    echo "For failed tests, required fields are: --why, --how, --required-action, --severity, --security-impact" >&2
    exit 1
  fi
fi

mkdir -p "$(dirname "$LOG_FILE")"
TIMESTAMP_UTC="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

{
  echo "============================================================"
  echo "timestamp_utc: $TIMESTAMP_UTC"
  echo "test_case_id: $TEST_ID"
  echo "status: $STATUS"
  echo "phase: $PHASE"
  echo "title: $TITLE"
  echo "why_failed: ${WHY:-N/A}"
  echo "how_failed: ${HOW:-N/A}"
  echo "required_action: ${REQUIRED_ACTION:-N/A}"
  echo "security_impact: ${SECURITY_IMPACT:-N/A}"
  echo "severity: ${SEVERITY:-N/A}"
  echo "owner: ${OWNER:-N/A}"
  echo "api_status: ${API_STATUS:-N/A}"
  echo "api_message: ${API_MESSAGE:-N/A}"
  echo "db_evidence: ${DB_EVIDENCE:-N/A}"
  echo "ui_evidence: ${UI_EVIDENCE:-N/A}"
} >> "$LOG_FILE"

echo "Logged test result to $LOG_FILE"
