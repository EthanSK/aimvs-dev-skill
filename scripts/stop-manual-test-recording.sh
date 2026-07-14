#!/usr/bin/env bash

set -euo pipefail

if [[ "${1:-}" != '--report-directory' || -z "${2:-}" || $# -ne 2 ]]; then
  printf '%s\n' 'Usage: stop-manual-test-recording.sh --report-directory <absolute-report-directory>' >&2
  exit 1
fi

REPORT_DIRECTORY="$(cd "$2" && pwd)"
STATE_FILE="$REPORT_DIRECTORY/.manual-test-recording-state"
LOG_FILE="$REPORT_DIRECTORY/.manual-test-recording.log"
if [[ ! -f "$STATE_FILE" ]]; then
  printf 'No active recording state exists in %s\n' "$REPORT_DIRECTORY" >&2
  exit 1
fi

RECORDING_PID="$(sed -n 's/^pid=//p' "$STATE_FILE")"
RECORDING_FILENAME="$(sed -n 's/^recording=//p' "$STATE_FILE")"
if [[ ! "$RECORDING_PID" =~ ^[1-9][0-9]*$ ]]; then
  printf 'Recording state has an invalid PID\n' >&2
  exit 1
fi
if [[ ! "$RECORDING_FILENAME" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{2}-[0-9]{2}-[0-9]{2}-[a-z0-9]+(-[a-z0-9]+)*\.mp4$ ]]; then
  printf 'Recording state has an invalid filename\n' >&2
  exit 1
fi
if ! kill -0 "$RECORDING_PID" 2>/dev/null; then
  sed -n '1,80p' "$LOG_FILE" >&2
  printf 'Recorder process %s is no longer running\n' "$RECORDING_PID" >&2
  exit 1
fi

kill -INT "$RECORDING_PID"
for _ in {1..100}; do
  if rg -q '^recording-finished=' "$LOG_FILE" 2>/dev/null; then
    break
  fi
  if rg -q '^recording-error=' "$LOG_FILE" 2>/dev/null; then
    sed -n '1,80p' "$LOG_FILE" >&2
    exit 1
  fi
  sleep 0.2
done
if ! rg -q '^recording-finished=' "$LOG_FILE" 2>/dev/null; then
  kill -TERM "$RECORDING_PID" 2>/dev/null || true
  printf 'Recorder did not stop cleanly within 20 seconds; state and partial video were preserved\n' >&2
  exit 1
fi

RECORDING_PATH="$REPORT_DIRECTORY/$RECORDING_FILENAME"
if [[ ! -s "$RECORDING_PATH" ]]; then
  sed -n '1,80p' "$LOG_FILE" >&2
  printf 'Recorder stopped without producing video data\n' >&2
  exit 1
fi
if command -v ffprobe >/dev/null 2>&1; then
  ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height,duration \
    -of default=noprint_wrappers=1 "$RECORDING_PATH" >/dev/null
fi

rm -f "$STATE_FILE" "$LOG_FILE"
printf 'report_directory=%s\nrecording=%s\n' "$REPORT_DIRECTORY" "$RECORDING_FILENAME"
