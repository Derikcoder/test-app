#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHECKPOINT_DIR="$ROOT_DIR/continuity/checkpoints"
CURRENT_STATUS_FILE="$ROOT_DIR/continuity/CURRENT_STATUS.md"
SESSION_HISTORY_FILE="$ROOT_DIR/continuity/SESSION_HISTORY.md"

NOTE="${1:-Checkpoint snapshot}"
NEXT_ACTION="${2:-Continue from latest checkpoint notes}"

mkdir -p "$CHECKPOINT_DIR"

TIMESTAMP="$(date '+%Y-%m-%d %H:%M:%S %Z')"
STAMP_KEY="$(date '+%Y%m%d-%H%M%S')"
BRANCH="$(git -C "$ROOT_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")"
HEAD_SHA="$(git -C "$ROOT_DIR" rev-parse --short HEAD 2>/dev/null || echo "none")"
CHECKPOINT_NAME="$STAMP_KEY-${BRANCH//\//-}"
SNAPSHOT_PATH="$CHECKPOINT_DIR/$CHECKPOINT_NAME"

mkdir -p "$SNAPSHOT_PATH"

git -C "$ROOT_DIR" status > "$SNAPSHOT_PATH/git-status.txt"
git -C "$ROOT_DIR" status --short > "$SNAPSHOT_PATH/git-status-short.txt"
git -C "$ROOT_DIR" diff > "$SNAPSHOT_PATH/unstaged.diff"
git -C "$ROOT_DIR" diff --staged > "$SNAPSHOT_PATH/staged.diff"
git -C "$ROOT_DIR" ls-files --others --exclude-standard > "$SNAPSHOT_PATH/untracked-files.txt"

cat > "$SNAPSHOT_PATH/summary.md" <<EOF
# Checkpoint Summary

- Timestamp: $TIMESTAMP
- Branch: $BRANCH
- HEAD: $HEAD_SHA
- Note: $NOTE
- Next Action: $NEXT_ACTION

## Quick Recover
1. Review this summary.
2. Inspect git state using git status.
3. Restore intent from continuity/CURRENT_STATUS.md.
4. Re-apply lost edits using unstaged.diff and staged.diff if needed.
EOF

cat > "$CURRENT_STATUS_FILE" <<EOF
# Current Session Status

Last updated: $TIMESTAMP

## Active Task
$NOTE

## Next Action
$NEXT_ACTION

## Working Branch
$BRANCH

## Last Commit
$HEAD_SHA

## Latest Checkpoint
$CHECKPOINT_NAME

## Modified Files (short status)
EOF

if [[ -s "$SNAPSHOT_PATH/git-status-short.txt" ]]; then
  sed 's/^/- /' "$SNAPSHOT_PATH/git-status-short.txt" >> "$CURRENT_STATUS_FILE"
else
  echo "- Clean working tree" >> "$CURRENT_STATUS_FILE"
fi

echo "" >> "$CURRENT_STATUS_FILE"
echo "## Recovery Path" >> "$CURRENT_STATUS_FILE"
echo "- continuity/checkpoints/$CHECKPOINT_NAME/summary.md" >> "$CURRENT_STATUS_FILE"
echo "- continuity/checkpoints/$CHECKPOINT_NAME/unstaged.diff" >> "$CURRENT_STATUS_FILE"
echo "- continuity/checkpoints/$CHECKPOINT_NAME/staged.diff" >> "$CURRENT_STATUS_FILE"

if [[ ! -f "$SESSION_HISTORY_FILE" ]]; then
  cat > "$SESSION_HISTORY_FILE" <<'EOF'
# Session History

Chronological checkpoint record for crash recovery and continuity.
EOF
fi

cat >> "$SESSION_HISTORY_FILE" <<EOF

## $TIMESTAMP
- Branch: $BRANCH
- HEAD: $HEAD_SHA
- Checkpoint: $CHECKPOINT_NAME
- Note: $NOTE
- Next Action: $NEXT_ACTION
EOF

echo "Checkpoint created: continuity/checkpoints/$CHECKPOINT_NAME"
echo "Current status updated: continuity/CURRENT_STATUS.md"
