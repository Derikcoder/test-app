#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHECKPOINT_DIR="$ROOT_DIR/continuity/checkpoints"
CURRENT_STATUS_FILE="$ROOT_DIR/continuity/CURRENT_STATUS.md"

if [[ ! -d "$CHECKPOINT_DIR" ]]; then
  echo "No checkpoint directory found at continuity/checkpoints"
  exit 1
fi

LATEST="$(ls -1 "$CHECKPOINT_DIR" | sort | tail -n 1)"

if [[ -z "$LATEST" ]]; then
  echo "No checkpoints found."
  exit 1
fi

echo "Latest checkpoint: continuity/checkpoints/$LATEST"

if [[ -f "$CURRENT_STATUS_FILE" ]]; then
  echo ""
  echo "Current status snapshot:"
  echo "----------------------------------------"
  cat "$CURRENT_STATUS_FILE"
  echo "----------------------------------------"
fi

SUMMARY_FILE="$CHECKPOINT_DIR/$LATEST/summary.md"
if [[ -f "$SUMMARY_FILE" ]]; then
  echo ""
  echo "Checkpoint summary:"
  echo "----------------------------------------"
  cat "$SUMMARY_FILE"
  echo "----------------------------------------"
fi
