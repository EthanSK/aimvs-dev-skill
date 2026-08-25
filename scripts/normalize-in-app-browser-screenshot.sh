#!/bin/bash

set -euo pipefail

if [[ "$#" -ne 2 || "$1" != '--screenshot' ]]; then
  echo "Usage: $0 --screenshot <report-png-path>" >&2
  exit 1
fi

SCREENSHOT="$2"
[[ -f "$SCREENSHOT" ]] || {
  echo "Screenshot not found: $SCREENSHOT" >&2
  exit 1
}
[[ "$SCREENSHOT" == *.png ]] || {
  echo "The normalized screenshot path must end in .png: $SCREENSHOT" >&2
  exit 1
}

SOURCE_MIME_TYPE="$(file -b --mime-type "$SCREENSHOT")"
case "$SOURCE_MIME_TYPE" in
  image/png)
    printf 'source_format=png\nnormalized=false\nscreenshot=%s\n' "$SCREENSHOT"
    exit 0
    ;;
  image/jpeg)
    ;;
  *)
    echo "Unsupported in-app Browser screenshot format: $SOURCE_MIME_TYPE" >&2
    exit 1
    ;;
esac

TEMP_DIRECTORY="$(mktemp -d "${TMPDIR:-/tmp}/aimvs-in-app-browser-screenshot.XXXXXX")"
trap 'rm -rf "$TEMP_DIRECTORY"' EXIT
NORMALIZED_SCREENSHOT="$TEMP_DIRECTORY/normalized.png"
sips --setProperty format png "$SCREENSHOT" --out "$NORMALIZED_SCREENSHOT" >/dev/null
[[ "$(file -b --mime-type "$NORMALIZED_SCREENSHOT")" == 'image/png' ]] || {
  echo "The in-app Browser screenshot conversion did not produce PNG bytes." >&2
  exit 1
}
mv "$NORMALIZED_SCREENSHOT" "$SCREENSHOT"
printf 'source_format=jpeg\nnormalized=true\nscreenshot=%s\n' "$SCREENSHOT"
