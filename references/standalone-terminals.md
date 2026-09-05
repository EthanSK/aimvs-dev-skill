# Optional standalone terminals

Read this only when Ethan explicitly requests a standalone terminal or a retained stack already uses iTerm.
The default for new agent-owned nonzero launches is a controllable background command session; use
`stack-lifecycle.md` for its startup, health, retention, and shutdown rules. Never migrate a healthy stack solely
to make its terminal visible.

Before creating or controlling a native window, follow the host's display-routing and advance-notification skills.
Do not use native app automation when the active tool explicitly denies that app. Ordinary command tools remain
available for an authorized, exactly owned process operation; that does not authorize bypassing the denied UI route.

## Launch an explicitly requested iTerm stack

iTerm2 is installed
at `/Applications/iTerm.app`, but its AppleScript application name is `iTerm`; target the bundle id below so
the script also works when iTerm is not already running. Use ONE iTerm2 window per worktree stack and put the
three native stack-owned processes in separate tabs. The indexed Worker stays inside the private backend and must
not be added to the worktree window. Use iTerm2's AppleScript `create window` / `create tab` / `write text`
commands instead of synthetic keyboard shortcuts or clipboard paste; Ghostty keyboard automation has been
unreliable with the user's `Dvorak - QWERTY ⌘` input source. Create each tab first, then write the command into
that tab's session; passing commands directly to `create tab with default profile command ...` can open and
close too quickly instead of leaving the expected long-running tab. Capture the new window's numeric id
immediately, then re-resolve that exact window and retain each new tab's session before writing its command;
iTerm can otherwise resolve a later `current session of devWindow` against a pre-existing active window even
though the tab was created in the new window. Snapshot existing iTerm window ids first
so session restoration or an already-open iTerm window does not steal the worktree tabs. Record the exact new
window id as `DEV_WINDOW_ID` when creating it; never try to rediscover the worktree window later by title,
position, or whichever iTerm window is active.

Creating an iTerm window briefly foregrounds iTerm even when the AppleScript omits `activate`, so it is not a
background-safe operation. Send the normal macOS heads-up before launch, remember the previously frontmost app,
create the window and tabs in one batch, then immediately restore that app as shown below. Do not ask for exclusive
keyboard or mouse control and do not claim that removing `activate` prevents the focus change.

```bash
WORKTREE_DIR="/absolute/path/to/your-project-worktree"
STACK_INDEX=1
STACK_URL="http://localhost:$((4200 + STACK_INDEX))/"
DEV_COLOR_ENV="NX_WORKSPACE_DATA_DIRECTORY=.nx/workspace-data-stack-${STACK_INDEX} FORCE_COLOR=1 NX_COLOR=true NPM_CONFIG_COLOR=always CLICOLOR_FORCE=1"

(cd "$WORKTREE_DIR" && NX_WORKSPACE_DATA_DIRECTORY=".nx/workspace-data-stack-${STACK_INDEX}" npm exec -- nx build api --configuration=development)

iterm_command() {
  local title="$1"
  local cmd="$2"
  printf "%s" "printf '\\033]0;${title}\\007'; cd '${WORKTREE_DIR}'; ${cmd}; exec zsh"
}

PREVIOUS_FRONTMOST_PID="$(osascript -e 'tell application "System Events" to unix id of first application process whose frontmost is true')"
DEV_WINDOW_ID="$(osascript - \
  "$(iterm_command "AIMVS stack ${STACK_INDEX} API watch" "${DEV_COLOR_ENV} npm run watch:api -- --dev-stack-index=${STACK_INDEX}")" \
  "$(iterm_command "AIMVS stack ${STACK_INDEX} API server" "${DEV_COLOR_ENV} npm run serve:api:standalone:debug -- --dev-stack-index=${STACK_INDEX}")" \
  "$(iterm_command "AIMVS stack ${STACK_INDEX} frontend" "${DEV_COLOR_ENV} npm run serve:frontend:standalone-server -- --dev-stack-index=${STACK_INDEX}")" <<'APPLESCRIPT'
on list_contains(candidateList, candidateValue)
  repeat with existingValue in candidateList
    if (existingValue as integer) is (candidateValue as integer) then return true
  end repeat
  return false
end list_contains

on run argv
  tell application id "com.googlecode.iterm2"
    activate
    set existingWindowIds to {}
    repeat with existingWindow in windows
      set end of existingWindowIds to id of existingWindow
    end repeat

    create window with default profile
    delay 0.5
    set devWindow to missing value
    repeat with candidateWindow in windows
      if not my list_contains(existingWindowIds, id of candidateWindow) then
        set devWindow to candidateWindow
        exit repeat
      end if
    end repeat
    if devWindow is missing value then set devWindow to current window

    set devWindowId to id of devWindow
    set apiWatchSession to current session of devWindow
    tell apiWatchSession to write text (item 1 of argv) newline yes

    tell devWindow to create tab with default profile
    delay 0.5
    set devWindow to first window whose id is devWindowId
    set apiServerSession to current session of last tab of devWindow
    tell apiServerSession to write text (item 2 of argv) newline yes

    tell devWindow to create tab with default profile
    delay 0.5
    set devWindow to first window whose id is devWindowId
    set frontendSession to current session of last tab of devWindow
    tell frontendSession to write text (item 3 of argv) newline yes
    return devWindowId
  end tell
end run
APPLESCRIPT
)"
osascript - "$PREVIOUS_FRONTMOST_PID" <<'APPLESCRIPT'
on run argv
  tell application "System Events"
    set frontmost of first application process whose unix id is (item 1 of argv as integer) to true
  end tell
end run
APPLESCRIPT
printf 'DEV_WINDOW_ID=%s\n' "$DEV_WINDOW_ID"
```

`exec zsh` keeps the terminal session open if a command exits, so failures remain visible. If iTerm control is
unavailable, preserve existing processes and report the exact limitation. The user-approved background command
workflow can start or repair the owned stack without opening another terminal app. Never claim that the background
process is attached to iTerm or an integrated panel. (Codex task: 01a06eec-07f7-7aa1-a498-15f6334e4b91)

The explicit prebuild above permits concurrent creation of the three standalone terminal sessions. In the default
background workflow, waiting for `watch:api`'s own initial successful build provides the same startup ordering
without a redundant prebuild.

## Close an existing iTerm stack

Use this only at an authorized stop or migration boundary, after verifying its exact recorded window and process
ownership. Preserve unrelated terminal sessions and windows.

```bash
bash .agents/skills/aimvs-dev/scripts/close-iterm-dev-stack.sh \
  --window-id "$DEV_WINDOW_ID" \
  --stack-index "$STACK_INDEX"
```

The helper sends Ctrl-C to every tab first, waits for the frontend, API, inspector, and debug-log ports to stop
listening, and refuses to close the window if any remain. It does not touch stack 0's Worker or the private backend.
Only then does it close the terminal sessions and their exact tracked window. It closes the stopped sessions
individually because closing a multi-tab window directly
shows iTerm's `Close Window #…` confirmation. If iTerm still shows that prompt, the helper uses Accessibility to
require exactly one matching prompt and one `OK` button before pressing it, then verifies the tracked window is
no longer visible; iTerm can retain an invisible stale scripting
object after a successful close, so `exists` is not a valid success check. Do not leave this dialog for the user or
confirm an unverified iTerm prompt.


Then return to `stack-lifecycle.md` for the private-backend export/stop sequence, if the backend is being stopped.
A native-process-only migration leaves the private backend and its data running.
