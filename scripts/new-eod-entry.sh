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
TIME_STAMP="$(date +%H:%M)"
TIMEZONE="$(date +%Z)"
BRANCH_NAME="$(git -C "$ROOT_DIR" branch --show-current 2>/dev/null || true)"
LAST_COMMIT="$(git -C "$ROOT_DIR" rev-parse --short HEAD 2>/dev/null || true)"

if [[ -z "$BRANCH_NAME" ]]; then
  BRANCH_NAME="unknown"
fi

if [[ -z "$LAST_COMMIT" ]]; then
  LAST_COMMIT="none"
fi

ENTRY_CONTENT=$(cat <<EOF

## [$DATE_STAMP] [$TIME_STAMP] [$TIMEZONE]

### What We Were Busy With
- 

### Why This Work Mattered
- 

### Where We Intend Heading Next (Tomorrow)
- 

### Next Session Starter Tasks
- [ ] 
- [ ] 

### Risks / Blockers
- None.

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
echo "New end-of-day entry added to END_OF_DAY_LOG.md"
