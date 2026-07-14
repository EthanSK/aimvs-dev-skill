#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WINDOW_ID=""
SLUG=""
PHASE=""

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
    --phase)
      PHASE="${2:-}"
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
if [[ "$PHASE" != 'before' && "$PHASE" != 'after' ]]; then
  printf '%s\n' '--phase must be before or after' >&2
  exit 1
fi

REPORT_DIRECTORY="$(node "$SCRIPT_DIR/prepare-manual-test-report.mjs" --slug "$SLUG")"
TIMESTAMP="$(date '+%Y-%m-%d_%H-%M-%S')"
SCREENSHOT_FILENAME="${TIMESTAMP}-${SLUG}-${PHASE}.png"
SCREENSHOT_PATH="$REPORT_DIRECTORY/$SCREENSHOT_FILENAME"
TEMPORARY_PATH="$REPORT_DIRECTORY/.${SCREENSHOT_FILENAME}.tmp-$$.png"
SOURCE_FINGERPRINT="$(shasum -a 256 "$SCRIPT_DIR/capture-browser-window.swift" | awk '{print $1}')"
CAPTURE_BINARY="/tmp/aimvs-capture-browser-window-${UID}-${SOURCE_FINGERPRINT}"
trap 'rm -f "$TEMPORARY_PATH"' EXIT

if [[ -e "$SCREENSHOT_PATH" ]]; then
  printf 'Screenshot already exists: %s\n' "$SCREENSHOT_PATH" >&2
  exit 1
fi
if [[ ! -x "$CAPTURE_BINARY" ]]; then
  swiftc -parse-as-library "$SCRIPT_DIR/capture-browser-window.swift" -o "$CAPTURE_BINARY"
fi

CAPTURE_RESULT="$($CAPTURE_BINARY --window-id "$WINDOW_ID" --output "$TEMPORARY_PATH")"
mv "$TEMPORARY_PATH" "$SCREENSHOT_PATH"
printf 'report_directory=%s\nscreenshot=%s\n%s\n' \
  "$REPORT_DIRECTORY" "$SCREENSHOT_FILENAME" "$CAPTURE_RESULT"
