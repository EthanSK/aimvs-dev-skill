#!/usr/bin/env bash

set -euo pipefail

WINDOW_ID=""
STACK_INDEX=""

while (($# > 0)); do
  case "$1" in
    --window-id)
      WINDOW_ID="${2:-}"
      shift 2
      ;;
    --stack-index)
      STACK_INDEX="${2:-}"
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
if [[ ! "$STACK_INDEX" =~ ^[1-9][0-9]*$ ]]; then
  printf '%s\n' '--stack-index must be a positive integer' >&2
  exit 1
fi

PORTS=(
  "$((4200 + STACK_INDEX))"
  "$((3000 + STACK_INDEX))"
  "$((9230 + STACK_INDEX))"
  "$((9476 + STACK_INDEX))"
)

osascript - "$WINDOW_ID" <<'APPLESCRIPT'
on run argv
  set targetWindowId to item 1 of argv as integer
  tell application id "com.googlecode.iterm2"
    try
      set devWindow to first window whose id is targetWindowId
    on error
      error "Tracked iTerm window " & targetWindowId & " does not exist"
    end try
    repeat with devTab in tabs of devWindow
      repeat with devSession in sessions of devTab
        tell devSession to write text (ASCII character 3) newline no
      end repeat
    end repeat
  end tell
end run
APPLESCRIPT

for _ in {1..100}; do
  listeningPort=""
  for port in "${PORTS[@]}"; do
    if lsof -tiTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
      listeningPort="$port"
      break
    fi
  done
  if [[ -z "$listeningPort" ]]; then
    break
  fi
  sleep 0.2
done
if [[ -n "$listeningPort" ]]; then
  printf 'Stack %s still has a listener on port %s; refusing to close iTerm window %s\n' \
    "$STACK_INDEX" "$listeningPort" "$WINDOW_ID" >&2
  exit 1
fi

osascript - "$WINDOW_ID" <<'APPLESCRIPT'
on run argv
  set targetWindowId to item 1 of argv as integer
  tell application id "com.googlecode.iterm2"
    set devWindow to first window whose id is targetWindowId
    repeat
      set sessionToClose to missing value
      repeat with devTab in tabs of devWindow
        if (count of sessions of devTab) > 0 then
          set sessionToClose to first session of devTab
          exit repeat
        end if
      end repeat
      if sessionToClose is missing value then exit repeat
      close sessionToClose
      delay 0.1
    end repeat
  end tell
end run
APPLESCRIPT

osascript - "$WINDOW_ID" <<'APPLESCRIPT' &
on run argv
  set targetWindowId to item 1 of argv as integer
  tell application id "com.googlecode.iterm2"
    close (first window whose id is targetWindowId)
  end tell
end run
APPLESCRIPT
CLOSE_PID=$!

confirmationResult="not-needed"
for _ in {1..50}; do
  if ! jobs -pr | grep -qx "$CLOSE_PID"; then
    break
  fi
  probeResult="$(osascript <<'APPLESCRIPT'
tell application "System Events"
  set matchingProcesses to every application process whose bundle identifier is "com.googlecode.iterm2"
  if (count of matchingProcesses) is not 1 then error "Expected exactly one running iTerm process"
  tell item 1 of matchingProcesses
    set closePromptCount to 0
    set okButtons to {}
    repeat with candidateElement in entire contents
      try
        if (role of candidateElement) is "AXStaticText" then
          set elementValue to value of candidateElement as text
          if elementValue starts with "Close Window #" then set closePromptCount to closePromptCount + 1
        else if (role of candidateElement) is "AXButton" and (name of candidateElement) is "OK" then
          set end of okButtons to candidateElement
        end if
      end try
    end repeat
    if closePromptCount is 0 then return "waiting"
    if closePromptCount is not 1 or (count of okButtons) is not 1 then error "Refusing to confirm an ambiguous iTerm close dialog"
    perform action "AXPress" of item 1 of okButtons
    return "confirmed"
  end tell
end tell
APPLESCRIPT
)"
  if [[ "$probeResult" == "confirmed" ]]; then
    confirmationResult="$probeResult"
    break
  fi
  sleep 0.1
done

if kill -0 "$CLOSE_PID" 2>/dev/null; then
  kill "$CLOSE_PID" 2>/dev/null || true
  wait "$CLOSE_PID" 2>/dev/null || true
  printf 'iTerm window %s did not close; confirmation result was %s\n' "$WINDOW_ID" "$confirmationResult" >&2
  exit 1
fi
wait "$CLOSE_PID"

windowVisible="$(osascript - "$WINDOW_ID" <<'APPLESCRIPT'
on run argv
  set targetWindowId to item 1 of argv as integer
  tell application id "com.googlecode.iterm2"
    try
      return visible of first window whose id is targetWindowId
    on error
      return false
    end try
  end tell
end run
APPLESCRIPT
)"
if [[ "$windowVisible" != "false" ]]; then
  printf 'iTerm window %s is still visible after close\n' "$WINDOW_ID" >&2
  exit 1
fi

printf 'closed_window=%s\nstack_index=%s\nconfirmation=%s\n' \
  "$WINDOW_ID" "$STACK_INDEX" "$confirmationResult"
