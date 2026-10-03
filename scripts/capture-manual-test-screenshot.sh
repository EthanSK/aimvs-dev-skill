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
TIMESTAMP="$(date '+%Y-%m-%d_%H-%M-%S')"
SCREENSHOT_FILENAME="${TIMESTAMP}-${SLUG}.png"
SCREENSHOT_PATH="$REPORT_DIRECTORY/$SCREENSHOT_FILENAME"
SOURCE_FINGERPRINT="$(shasum -a 256 "$SCRIPT_DIR/capture-browser-window.swift" | awk '{print $1}')"
CAPTURE_BINARY="/tmp/aimvs-capture-browser-window-${UID}-${SOURCE_FINGERPRINT}"

if [[ -e "$SCREENSHOT_PATH" ]]; then
  printf 'Screenshot already exists: %s\n' "$SCREENSHOT_PATH" >&2
  exit 1
fi
CAPTURE_DIRECTORY="$(mktemp -d "${TMPDIR:-/tmp}/aimvs-manual-capture.XXXXXX")"
RAW_SCREENSHOT_PATH="$CAPTURE_DIRECTORY/$SCREENSHOT_FILENAME"
trap 'rm -rf "$CAPTURE_DIRECTORY"' ERR # Remove this capture's temporary directory if compilation or capture fails before the path can be handed back.
if [[ ! -x "$CAPTURE_BINARY" ]]; then
  swiftc -parse-as-library "$SCRIPT_DIR/capture-browser-window.swift" -o "$CAPTURE_BINARY"
fi

CAPTURE_RESULT="$($CAPTURE_BINARY --window-id "$WINDOW_ID" --output "$RAW_SCREENSHOT_PATH")"
printf 'report_directory=%s\nscreenshot=%s\nraw_screenshot=%s\n%s\n' \
  "$REPORT_DIRECTORY" "$SCREENSHOT_FILENAME" "$RAW_SCREENSHOT_PATH" "$CAPTURE_RESULT"
