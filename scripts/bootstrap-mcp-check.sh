#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MCP_DIR="$ROOT_DIR/.continue/mcpServers"
SYMLINK_PATH="/tmp/test-app"
EXPECTED_FILES=(
  "$MCP_DIR/repo-safe-coding-mcp.yaml"
  "$MCP_DIR/read-only-investigation-mcp.yaml"
  "$MCP_DIR/broader-agentic-coding-mcp.yaml"
)

fail() {
  echo "Bootstrap check failed: $1" >&2
  exit 1
}

check_file_exists() {
  local file_path="$1"
  [[ -f "$file_path" ]] || fail "missing file: $file_path"
}

check_yaml() {
  local file_path="$1"
  python3 - "$file_path" <<'PY'
import pathlib
import sys

try:
    import yaml
except Exception as exc:
    print(f"PyYAML is required to validate MCP configs: {exc}", file=sys.stderr)
    raise SystemExit(1)

path = pathlib.Path(sys.argv[1])
with path.open('r', encoding='utf-8') as handle:
    data = yaml.safe_load(handle)

if not isinstance(data, dict):
    raise SystemExit(f"{path}: expected a mapping at the top level")

required = ('name', 'version', 'schema', 'mcpServers')
missing = [key for key in required if key not in data]
if missing:
    raise SystemExit(f"{path}: missing keys: {', '.join(missing)}")

if data['schema'] != 'v1':
    raise SystemExit(f"{path}: schema must be v1")

servers = data['mcpServers']
if not isinstance(servers, list) or not servers:
    raise SystemExit(f"{path}: mcpServers must be a non-empty list")

for index, server in enumerate(servers, start=1):
    if not isinstance(server, dict):
        raise SystemExit(f"{path}: server {index} must be a mapping")
    for key in ('name', 'command', 'args'):
        if key not in server:
            raise SystemExit(f"{path}: server {index} missing key {key}")
    if not isinstance(server['args'], list) or not server['args']:
        raise SystemExit(f"{path}: server {index} args must be a non-empty list")

print(f"YAML OK: {path.name}")
PY
}

echo "Checking MCP bootstrap prerequisites..."

for file_path in "${EXPECTED_FILES[@]}"; do
  check_file_exists "$file_path"
  check_yaml "$file_path"
done

[[ -L "$SYMLINK_PATH" ]] || fail "missing symlink: $SYMLINK_PATH"
[[ -d "$SYMLINK_PATH" ]] || fail "symlink does not resolve to a directory: $SYMLINK_PATH"

if command -v docker >/dev/null 2>&1; then
  docker --version >/dev/null || fail "docker is installed but not working"
  echo "Docker OK"
else
  fail "docker is not installed or not on PATH"
fi

echo "Symlink OK: $SYMLINK_PATH -> $(readlink "$SYMLINK_PATH")"
echo "Bootstrap check passed"
