#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WINDOW_ID=""
SLUG=""

while (($# > 0)); do
  case "$1" in
    --window-id)
      WINDOW_ID="${2:-}"
      shift 2
      ;;
    --slug)
      SLUG="${2:-}"
      shift 2
      ;;
    *)
      printf 'Unknown argument: %s\n' "$1" >&2
      exit 1
      ;;
  esac
done

if [[ ! "$WINDOW_ID" =~ ^[1-9][0-9]*$ ]]; then
  printf '%s\n' '--window-id must be a positive integer' >&2
  exit 1
fi
if [[ ! "$SLUG" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]; then
  printf '%s\n' '--slug must be lowercase kebab-case' >&2
  exit 1
fi

REPORT_DIRECTORY="$(node "$SCRIPT_DIR/prepare-manual-test-report.mjs" --slug "$SLUG")"
STATE_FILE="$REPORT_DIRECTORY/.manual-test-recording-state"
LOG_FILE="$REPORT_DIRECTORY/.manual-test-recording.log"
if [[ -f "$STATE_FILE" ]]; then
  EXISTING_PID="$(sed -n 's/^pid=//p' "$STATE_FILE")"
  if [[ "$EXISTING_PID" =~ ^[1-9][0-9]*$ ]] && kill -0 "$EXISTING_PID" 2>/dev/null; then
    printf 'A manual-test recording is already running with PID %s\n' "$EXISTING_PID" >&2
    exit 1
  fi
  rm -f "$STATE_FILE" "$LOG_FILE"
fi

TIMESTAMP="$(date '+%Y-%m-%d_%H-%M-%S')"
RECORDING_FILENAME="${TIMESTAMP}-${SLUG}.mp4"
RECORDING_PATH="$REPORT_DIRECTORY/$RECORDING_FILENAME"
RECORDER_BINARY="/tmp/aimvs-record-browser-window-${UID}"
swiftc -parse-as-library "$SCRIPT_DIR/record-browser-window.swift" -o "$RECORDER_BINARY"

printf 'pid=%s\nrecording=%s\n' "$$" "$RECORDING_FILENAME" >"$STATE_FILE"
printf 'report_directory=%s\nrecording=%s\npid=%s\n' \
  "$REPORT_DIRECTORY" "$RECORDING_FILENAME" "$$"
exec "$RECORDER_BINARY" \
  --window-id "$WINDOW_ID" \
  --output "$RECORDING_PATH" \
  > >(tee "$LOG_FILE") 2>&1 # Bug: detached children lose either the Codex command session or macOS capture permission; keep the recorder as this session's foreground process until the stop wrapper finalizes it.
