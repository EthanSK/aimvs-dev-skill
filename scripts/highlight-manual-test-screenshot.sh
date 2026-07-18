#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCREENSHOT=""
HIGHLIGHT=""
LABEL=""
LABEL_POSITION=""

while (($# > 0)); do
  case "$1" in
    --screenshot)
      SCREENSHOT="${2:-}"
      shift 2
      ;;
    --highlight)
      HIGHLIGHT="${2:-}"
      shift 2
      ;;
    --label)
      LABEL="${2:-}"
      shift 2
      ;;
    --label-position)
      LABEL_POSITION="${2:-}"
      shift 2
      ;;
    *)
      printf 'Unknown argument: %s\n' "$1" >&2
      exit 1
      ;;
  esac
done

if [[ ! -f "$SCREENSHOT" || "${SCREENSHOT##*.}" != "png" ]]; then
  printf '%s\n' '--screenshot must be an existing .png file' >&2
  exit 1
fi
if [[ -z "$HIGHLIGHT" ]]; then
  printf '%s\n' '--highlight is required' >&2
  exit 1
fi
if [[ -z "$LABEL" ]]; then
  printf '%s\n' '--label is required' >&2
  exit 1
fi
if [[ -z "$LABEL_POSITION" ]]; then
  printf '%s\n' '--label-position is required' >&2
  exit 1
fi

SCREENSHOT_DIRECTORY="$(cd "$(dirname "$SCREENSHOT")" && pwd)"
SCREENSHOT_FILENAME="$(basename "$SCREENSHOT")"
SCREENSHOT_PATH="$SCREENSHOT_DIRECTORY/$SCREENSHOT_FILENAME"
TEMPORARY_PATH="$SCREENSHOT_DIRECTORY/.${SCREENSHOT_FILENAME}.highlight-tmp-$$.png"
trap 'rm -f "$TEMPORARY_PATH"' EXIT

HIGHLIGHT_RESULT="$(node "$SCRIPT_DIR/draw-screenshot-highlight.mjs" \
  --input "$SCREENSHOT_PATH" \
  --output "$TEMPORARY_PATH" \
  --highlight "$HIGHLIGHT" \
  --label "$LABEL" \
  --label-position "$LABEL_POSITION")"
mv "$TEMPORARY_PATH" "$SCREENSHOT_PATH" # Keep the evidence filename stable while replacing it atomically with the annotated PNG.
printf 'screenshot=%s\n%s\n' "$SCREENSHOT_PATH" "$HIGHLIGHT_RESULT"
