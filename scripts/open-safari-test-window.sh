#!/usr/bin/env bash

set -euo pipefail

TARGET_DISPLAY_NAME='Built-in Retina Display'
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_URL="${1:-http://localhost:4200/}"
EXISTING_WINDOW_ID="${2:-}"

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

window_id="$(osascript - "$left" "$top" "$right" "$bottom" "$TARGET_URL" "$EXISTING_WINDOW_ID" <<'APPLESCRIPT'
on run argv
  set leftBound to item 1 of argv as integer
  set topBound to item 2 of argv as integer
  set rightBound to item 3 of argv as integer
  set bottomBound to item 4 of argv as integer
  set targetURL to item 5 of argv
  set existingWindowId to item 6 of argv

  tell application "Safari"
    if existingWindowId is not "" then
      try
        set testWindow to first window whose id is (existingWindowId as integer)
      on error
        error "Safari test window " & existingWindowId & " no longer exists; refusing to create an untracked replacement"
      end try
      set URL of current tab of testWindow to targetURL
    else
      set existingWindowIds to id of every window
      set testDocument to make new document with properties {URL:targetURL}
      set testWindow to missing value
      repeat with candidateWindow in windows
        if (id of candidateWindow) is not in existingWindowIds then
          set testWindow to candidateWindow
          exit repeat
        end if
      end repeat
      if testWindow is missing value then error "Could not identify the newly created Safari window"
    end if
    set bounds of testWindow to {leftBound, topBound, rightBound, bottomBound}
    set testWindowId to id of testWindow as text
  end tell

  return testWindowId
end run
APPLESCRIPT
)"

sleep 0.5
inspection="$(swift "$SCRIPT_DIR/inspect-browser-displays.swift")"
printf '%s\n' "window=$window_id" "$inspection"

if ! grep -Fq "BROWSER id=$window_id app=Safari display=$TARGET_DISPLAY_NAME target=true" <<<"$inspection"; then
  echo "Safari window $window_id was not verified on $TARGET_DISPLAY_NAME." >&2
  exit 1
fi
