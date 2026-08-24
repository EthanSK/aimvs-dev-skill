#!/usr/bin/env bash

set -euo pipefail

TARGET_DISPLAY_NAME='Built-in Retina Display'
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_URL="${1:-}"
FOREGROUND_APPROVAL="${2:-}"

if [[ -z "$TARGET_URL" || "$FOREGROUND_APPROVAL" != '--allow-foreground' ]]; then
  echo "Usage: $0 <url> --allow-foreground" >&2
  echo 'Opera window creation foregrounds the browser, so Ethan must explicitly approve that focus change first.' >&2
  exit 2
fi

swift - <<'SWIFT'
import AppKit
import Foundation

guard let opera = NSWorkspace.shared.runningApplications.first(where: { $0.bundleIdentifier == "com.operasoftware.Opera" }) else {
  FileHandle.standardError.write(Data("Opera is not running; refusing to launch it during AIMVS browser testing.\n".utf8))
  exit(1)
}
guard !opera.isHidden else {
  FileHandle.standardError.write(Data("Opera is hidden; refusing to unhide it during AIMVS browser testing.\n".utf8))
  exit(1)
}
SWIFT

target_bounds="$({ TARGET_DISPLAY_NAME="$TARGET_DISPLAY_NAME" swift - <<'SWIFT'
import AppKit
import Foundation

let targetDisplayName = ProcessInfo.processInfo.environment["TARGET_DISPLAY_NAME"] ?? ""
guard let primaryTop = NSScreen.screens.first?.frame.maxY else {
  fatalError("No displays are available")
}
guard let screen = NSScreen.screens.first(where: { $0.localizedName == targetDisplayName }) else {
  fatalError("Could not find display named \(targetDisplayName)")
}

let frame = screen.visibleFrame
let left = Int(frame.minX) + 24
let top = Int(primaryTop - frame.maxY) + 24
let right = Int(frame.maxX) - 24
let bottom = Int(primaryTop - frame.minY) - 24
print("\(left),\(top),\(right),\(bottom)")
SWIFT
} | tail -n 1)"

IFS=',' read -r left top right bottom <<<"$target_bounds"

list_scripting_ids() {
  osascript <<'APPLESCRIPT'
tell application "Opera"
  set outputText to ""
  repeat with candidateWindow in windows
    set outputText to outputText & (id of candidateWindow as text) & linefeed
  end repeat
  return outputText
end tell
APPLESCRIPT
}

list_cg_ids() {
  swift "$SCRIPT_DIR/inspect-browser-displays.swift" | sed -n 's/^BROWSER id=\([0-9][0-9]*\) app=Opera .*/\1/p'
}

find_one_new_id() {
  local before_ids="$1"
  local after_ids="$2"
  local new_ids
  new_ids="$(comm -13 <(printf '%s\n' "$before_ids" | sed '/^$/d' | sort) <(printf '%s\n' "$after_ids" | sed '/^$/d' | sort))"
  if [[ "$(printf '%s\n' "$new_ids" | sed '/^$/d' | wc -l | tr -d ' ')" -ne 1 ]]; then
    return 1
  fi
  printf '%s\n' "$new_ids"
}

close_scripting_window() {
  local scripting_id="$1"
  osascript - "$scripting_id" <<'APPLESCRIPT'
on run argv
  set targetId to item 1 of argv
  tell application "Opera"
    repeat with candidateWindow in windows
      if (id of candidateWindow as text) is targetId then
        close candidateWindow
        return
      end if
    end repeat
  end tell
end run
APPLESCRIPT
}

before_scripting_ids="$(list_scripting_ids)"
before_cg_ids="$(list_cg_ids)"
scripting_window_id=''
previous_frontmost_pid="$(osascript -e 'tell application "System Events" to unix id of first application process whose frontmost is true')"

cleanup_failed_open() {
  local exit_status=$?
  if [[ $exit_status -eq 0 ]]; then
    return
  fi
  if [[ -z "$scripting_window_id" ]]; then
    scripting_window_id="$(find_one_new_id "$before_scripting_ids" "$(list_scripting_ids)" 2>/dev/null || true)"
  fi
  if [[ -n "$scripting_window_id" ]]; then
    close_scripting_window "$scripting_window_id" || true
  fi
  current_frontmost="$(osascript -e 'tell application "System Events" to name of first application process whose frontmost is true' 2>/dev/null || true)"
  if [[ "$current_frontmost" == 'Opera' ]]; then
    osascript - "$previous_frontmost_pid" <<'APPLESCRIPT' >/dev/null 2>&1 || true
on run argv
  tell application "System Events" to set frontmost of first application process whose unix id is (item 1 of argv as integer) to true
end run
APPLESCRIPT
  fi
  exit "$exit_status"
}
trap cleanup_failed_open EXIT

set +e # Opera 141 returns -10000 after creating the window; accept it only when both delayed inventories prove exactly one new window. (Codex task: 01a0345e-6001-7353-b097-5527ecae7eca)
create_output="$(osascript -e 'tell application "Opera" to make new window' 2>&1)"
create_status=$?
set -e

sleep 0.8
scripting_window_id="$(find_one_new_id "$before_scripting_ids" "$(list_scripting_ids)")" || {
  echo 'Opera did not expose exactly one new scripting window after creation.' >&2
  exit 1
}

if [[ $create_status -ne 0 && "$create_output" != *'AppleEvent handler failed. (-10000)'* ]]; then
  printf 'Opera failed to create its test window: %s\n' "$create_output" >&2
  exit 1
fi

verified_url="$(osascript - "$scripting_window_id" "$TARGET_URL" "$left" "$top" "$right" "$bottom" <<'APPLESCRIPT'
on run argv
  set targetId to item 1 of argv
  set targetURL to item 2 of argv
  set leftBound to item 3 of argv as integer
  set topBound to item 4 of argv as integer
  set rightBound to item 5 of argv as integer
  set bottomBound to item 6 of argv as integer

  tell application "Opera"
    set testWindow to missing value
    repeat with candidateWindow in windows
      if (id of candidateWindow as text) is targetId then set testWindow to candidateWindow
    end repeat
    if testWindow is missing value then error "Tracked Opera window " & targetId & " is missing"
    set URL of active tab of testWindow to targetURL
    set bounds of testWindow to {leftBound, topBound, rightBound, bottomBound}
    return URL of active tab of testWindow
  end tell
end run
APPLESCRIPT
)"

sleep 0.8
inspection="$(swift "$SCRIPT_DIR/inspect-browser-displays.swift")"
cg_window_id="$(find_one_new_id "$before_cg_ids" "$(sed -n 's/^BROWSER id=\([0-9][0-9]*\) app=Opera .*/\1/p' <<<"$inspection")")" || {
  echo 'Opera did not expose exactly one new CoreGraphics window after creation.' >&2
  exit 1
}

if ! grep -Fq "BROWSER id=$cg_window_id app=Opera display=$TARGET_DISPLAY_NAME target=true" <<<"$inspection"; then
  echo "Opera window $cg_window_id was not verified on $TARGET_DISPLAY_NAME." >&2
  exit 1
fi
if [[ "$verified_url" != "$TARGET_URL" ]]; then
  printf 'Opera window %s loaded %s instead of %s.\n' "$cg_window_id" "$verified_url" "$TARGET_URL" >&2
  exit 1
fi

trap - EXIT
printf '%s\n' "window=$cg_window_id" "scripting_window=$scripting_window_id" "$inspection"
