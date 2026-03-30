#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_FILE="$ROOT_DIR/END_OF_DAY_LOG.md"
MARKER="## Entries"

if [[ ! -f "$LOG_FILE" ]]; then
  echo "END_OF_DAY_LOG.md not found at: $LOG_FILE" >&2
  exit 1
fi

DATE_STAMP="$(date +%F)"
BRANCH_NAME="$(git -C "$ROOT_DIR" branch --show-current 2>/dev/null || true)"
LAST_COMMIT="$(git -C "$ROOT_DIR" rev-parse --short HEAD 2>/dev/null || true)"

if [[ -z "$BRANCH_NAME" ]]; then
  BRANCH_NAME="unknown"
fi

if [[ -z "$LAST_COMMIT" ]]; then
  LAST_COMMIT="none"
fi

ENTRY_CONTENT=$(cat <<EOF

## [$DATE_STAMP] Weekly API Review

### Participants
- Full-Stack Developer and Web Designer
- Business Analyst and Project Manager

### What Changed Since Last Review
- 

### Endpoint Inventory Check (API_COLLECTION.md)
- [ ] No drift found
- [ ] Drift found and corrected
- Notes:

### Auth and Role-Policy Regression Check
- [ ] No auth or role-policy regressions found
- [ ] Regressions found and logged
- Notes:

### Test Coverage Check
- Postman:
- Unit tests:
- Gaps:

### Open API Risks / Blockers
- 

### Decisions
- Go or no-go for release-impacting API changes:

### Action Items
- [ ] Owner:  Due:  Verification:
- [ ] Owner:  Due:  Verification:

### Done Criteria
- [ ] No undocumented endpoint changes remain
- [ ] No critical auth/security failures remain unresolved
- [ ] All new API work has owner, due date, and verification plan

### Commit / Branch Context
- Branch: $BRANCH_NAME
- Last commit touched: $LAST_COMMIT
EOF
)

if [[ "${1:-}" == "--dry-run" ]]; then
  echo "$ENTRY_CONTENT"
  exit 0
fi

TMP_FILE="$(mktemp)"

awk -v marker="$MARKER" -v entry="$ENTRY_CONTENT" '
  {
    print
    if ($0 == marker) {
      print entry
    }
  }
' "$LOG_FILE" > "$TMP_FILE"

if cmp -s "$LOG_FILE" "$TMP_FILE"; then
  rm -f "$TMP_FILE"
  echo "No changes made. Marker \"$MARKER\" not found or entry not inserted."
  exit 1
fi

mv "$TMP_FILE" "$LOG_FILE"
echo "New weekly API review entry added to END_OF_DAY_LOG.md"
