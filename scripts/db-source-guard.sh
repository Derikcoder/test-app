#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_DBPATH="$ROOT_DIR/.mongodb/data"

# Allow explicit override for rare system-mongo workflows.
if [[ "${ALLOW_SYSTEM_MONGO:-0}" == "1" ]]; then
  exit 0
fi

if ! command -v pgrep >/dev/null 2>&1; then
  exit 0
fi

mapfile -t mongod_lines < <(pgrep -a mongod 2>/dev/null || true)
if [[ ${#mongod_lines[@]} -eq 0 ]]; then
  exit 0
fi

project_count=0
system_count=0
unknown_count=0

for line in "${mongod_lines[@]}"; do
  if [[ "$line" == *"--dbpath $PROJECT_DBPATH"* ]]; then
    ((project_count+=1))
  elif [[ "$line" == *"--dbpath /var/lib/mongodb"* ]]; then
    ((system_count+=1))
  else
    ((unknown_count+=1))
  fi
done

if [[ $system_count -gt 0 || $unknown_count -gt 0 ]]; then
  echo "❌ MongoDB source guard blocked startup."
  echo "   Detected mongod process not bound to project dbPath: $PROJECT_DBPATH"
  echo ""
  echo "   Active mongod processes:"
  printf '   - %s\n' "${mongod_lines[@]}"
  echo ""
  echo "   Why this matters: mixed local stores cause apparent data loss and stale datasets."
  echo "   Fix: stop system/other mongod, then retry npm run dev."
  echo "   Override intentionally with ALLOW_SYSTEM_MONGO=1 (not recommended)."
  exit 1
fi

# If we get here, running mongod instances are project-local only.
exit 0
