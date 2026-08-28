#!/usr/bin/env bash

set -euo pipefail

TARGET_DISPLAY_NAME='Built-in Retina Display'
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_URL="${1:-http://localhost:4200/}"
EXISTING_WINDOW_ID="${2:-}"

swift - <<'SWIFT'
import AppKit
import Foundation

guard let safari = NSWorkspace.shared.runningApplications.first(where: { $0.bundleIdentifier == "com.apple.Safari" }) else { // Launching Safari can order a new window above Ethan's active app without activating Safari, so fail before AppleScript can launch it. (Codex task: 01a024f9-f80c-71c0-9005-51c76fc2e18d)
  FileHandle.standardError.write(Data("Safari is not running; refusing to launch it during background browser testing.\n".utf8))
  exit(1)
}
guard !safari.isHidden else { // NSRunningApplication.unhide() can overlap Ethan's active window without changing the active app, so a hidden Safari is unavailable for background testing. (Codex task: 01a024f9-f80c-71c0-9005-51c76fc2e18d)
  FileHandle.standardError.write(Data("Safari is hidden; refusing to unhide it during background browser testing.\n".utf8))
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

window_id="$(osascript - "$left" "$top" "$right" "$bottom" "$TARGET_URL" "$EXISTING_WINDOW_ID" <<'APPLESCRIPT'
on run argv
  set leftBound to item 1 of argv as integer
  set topBound to item 2 of argv as integer
  set rightBound to item 3 of argv as integer
  set bottomBound to item 4 of argv as integer
  set targetURL to item 5 of argv
  set existingWindowId to item 6 of argv

  tell application "Safari"
    set didCreateWindow to false
    set createdWindowId to missing value
    try
      if existingWindowId is not "" then
        set testWindow to first window whose id is (existingWindowId as integer)
        if visible of testWindow is false then error "Safari test window " & existingWindowId & " is hidden; refusing to show it during background browser testing"
        set URL of current tab of testWindow to targetURL
      else
        set existingWindowIds to {}
        repeat with existingWindow in windows
          set end of existingWindowIds to (id of existingWindow as integer) -- Bug: Safari can leave a bulk ID result as live references, so opening a new document can make the snapshot identify an older window; copy each integer before comparing. (Codex task: 01a024c0-a524-7960-a57e-f9fa68536e4c)
        end repeat
        set testDocument to make new document with properties {URL:targetURL}
        set didCreateWindow to true
        set testWindow to missing value
        repeat with candidateWindow in windows
          set candidateWindowId to (id of candidateWindow as integer)
          if candidateWindowId is not in existingWindowIds then
            set testWindow to candidateWindow
            set createdWindowId to candidateWindowId
            exit repeat
          end if
        end repeat
        if testWindow is missing value then error "Could not identify the newly created Safari window"
      end if
      set bounds of testWindow to {leftBound, topBound, rightBound, bottomBound}
      set testWindowId to id of testWindow as text
    on error errorMessage number errorNumber
      if didCreateWindow then
        if createdWindowId is missing value then
          set createdWindows to {}
          repeat with candidateWindow in windows
            set candidateWindowId to (id of candidateWindow as integer)
            if candidateWindowId is not in existingWindowIds then set end of createdWindows to candidateWindow
          end repeat
          if (count createdWindows) is 1 then set createdWindowId to (id of item 1 of createdWindows as integer)
        end if
        if createdWindowId is not missing value then
          set matchingWindows to every window whose id is createdWindowId
          if (count matchingWindows) is 1 then close item 1 of matchingWindows
          delay 0.1
          if (count (every window whose id is createdWindowId)) is not 0 then error "Safari setup failed and its new window " & createdWindowId & " could not be closed"
        end if
      end if -- Bug: Safari could create the document and then fail while sizing it before the shell knew its ID; creation and exact cleanup share this AppleScript transaction so that partial setup cannot leak a window. (Codex task: 01a024c0-a524-7960-a57e-f9fa68536e4c)
      error errorMessage number errorNumber
    end try
  end tell

  return testWindowId
end run
APPLESCRIPT
)"

created_window_id=''
if [[ -z "$EXISTING_WINDOW_ID" ]]; then
  created_window_id="$window_id"
  cleanup_created_window_on_failure() {
    local exit_status=$?
    trap - EXIT
    if ((exit_status == 0)); then exit 0; fi
    set +e
    osascript - "$created_window_id" <<'APPLESCRIPT'
on run argv
  set createdWindowId to item 1 of argv as integer
    tell application "Safari"
      set matchingWindows to every window whose id is createdWindowId
      if (count matchingWindows) is 1 then close item 1 of matchingWindows
      delay 0.1
      if (count (every window whose id is createdWindowId)) is not 0 then error "Failed to close Safari test window " & createdWindowId
    end tell
end run
APPLESCRIPT
    exit "$exit_status"
  }
  trap cleanup_created_window_on_failure EXIT
fi # A later inspection failure still cleans up only this invocation's verified new window, never an EXISTING_WINDOW_ID supplied by its owner; the AppleScript transaction above owns failures before an ID is returned.

sleep 0.5
inspection="$(swift "$SCRIPT_DIR/inspect-browser-displays.swift")"
printf '%s\n' "window=$window_id" "$inspection"

if ! grep -Fq "BROWSER id=$window_id app=Safari display=$TARGET_DISPLAY_NAME target=true" <<<"$inspection"; then
  echo "Safari window $window_id was not verified on $TARGET_DISPLAY_NAME." >&2
  exit 1
fi

trap - EXIT
