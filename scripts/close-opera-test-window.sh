#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CG_WINDOW_ID="${1:-}"
SCRIPTING_WINDOW_ID="${2:-}"

if [[ ! "$CG_WINDOW_ID" =~ ^[0-9]+$ || ! "$SCRIPTING_WINDOW_ID" =~ ^[0-9]+$ ]]; then
  echo "Usage: $0 <coregraphics-window-id> <opera-scripting-window-id>" >&2
  exit 2
fi

before_inspection="$(swift "$SCRIPT_DIR/inspect-browser-displays.swift")"
cg_window_was_visible=false
if grep -Fq "BROWSER id=$CG_WINDOW_ID app=Opera " <<<"$before_inspection"; then cg_window_was_visible=true; fi # Computer Use can move Opera off the current Space after releasing it, so the stable Opera scripting ID remains the exact close authority while the CoreGraphics ID is verified whenever it is still visible. (Codex task: 01a0345e-6001-7353-b097-5527ecae7eca)

osascript - "$SCRIPTING_WINDOW_ID" <<'APPLESCRIPT'
on run argv
  set targetId to item 1 of argv
  tell application "Opera"
    set testWindow to missing value
    repeat with candidateWindow in windows
      if (id of candidateWindow as text) is targetId then set testWindow to candidateWindow
    end repeat
    if testWindow is missing value then error "Tracked Opera scripting window " & targetId & " is missing"
    close testWindow
  end tell
end run
APPLESCRIPT

sleep 0.5
after_inspection="$(swift "$SCRIPT_DIR/inspect-browser-displays.swift")"
if [[ "$cg_window_was_visible" == true ]] && grep -Fq "BROWSER id=$CG_WINDOW_ID app=Opera " <<<"$after_inspection"; then
  echo "Opera CoreGraphics window $CG_WINDOW_ID is still present after close." >&2
  exit 1
fi

scripting_window_state="$(osascript - "$SCRIPTING_WINDOW_ID" <<'APPLESCRIPT'
on run argv
  set targetId to item 1 of argv
  tell application "Opera"
    repeat with candidateWindow in windows
      if (id of candidateWindow as text) is targetId then return "present"
    end repeat
  end tell
  return "absent"
end run
APPLESCRIPT
)"
if [[ "$scripting_window_state" != absent ]]; then
  echo "Opera scripting window $SCRIPTING_WINDOW_ID is still present after close." >&2
  exit 1
fi

printf '%s\n' "closed_window=$CG_WINDOW_ID" "$after_inspection"
