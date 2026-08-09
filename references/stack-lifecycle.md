# Dev-stack lifecycle

## Contents

- [Ports per stack](#ports-per-stack)
- [Ethan's main environment](#ethans-main-environment)
- [VS Code workspace membership](#vs-code-workspace-membership)
- [Run an agent-owned stack](#run-an-agent-owned-stack)
- [Mandatory pre-Computer-Use health gate](#mandatory-pre-computer-use-health-gate)
- [Stop and close an agent-owned stack](#stop-and-close-an-agent-owned-stack)

## Ports per stack

| Thing                       | Base (stack 0 = main) | Stack N  |
| --------------------------- | --------------------- | -------- |
| frontend                    | 4200                  | 4200 + N |
| standalone API              | 3000                  | 3000 + N |
| standalone API inspector    | 9230                  | 9230 + N |
| frontend debug-log receiver | 9476                  | 9476 + N |

Stack 0's debug log is `frontend-debug.log`; stack N's is `frontend-debug-N.log`.

## Ethan's main environment

Stack 0 is exclusively Ethan's main VS Code environment. Agents must never start, stop, restart, restore, or use
stack 0 for their own tests unless Ethan explicitly asks for that exact stack 0 action. Read-only port and log
inspection is allowed. Testing source from the main checkout still uses a free nonzero stack index.

For questions such as "what is causing the API debug log error?", read the checkout-root `api-debug.log` directly
with shell tools first; do not open or operate VS Code/Computer Use merely to read API errors. The API truncates
this file on server start, so it represents the current API session. If stack 0 is missing or unhealthy, report it
to Ethan and leave it alone unless he explicitly asks for the exact start, stop, restart, or restore action. Agents
must never invoke `Restore Terminals` for stack 0 on their own.
Every stack-0 terminal group in `.vscode/settings.json` must set `cwd` to
`${workspaceFolder:ai-music-video-studio}`, and every restored shell command must source the primary sibling's
`tools/scripts/set-main-worktree-dir.sh` before starting. This second guard corrects a terminal that still inherits
the active linked worktree and refuses to continue if the primary checkout is unavailable or not on `main`.
After installing a Restore Terminals build with `cwd` support, verify `code --list-extensions --show-versions`
reports that exact version and reload VS Code before running the command; an extension folder on disk does not mean
VS Code registered or loaded it.

The user actively uses the same VS Code window while agents work. Preserve its current layout and make only the
smallest temporary UI change required for the task. Never maximize the terminal panel vertically, toggle the
terminal or editor into full screen, enter Zen Mode, hide the editor/sidebar to enlarge the terminal, or otherwise
resize/rearrange panels for convenience. Use the terminal at its existing size; if a terminal must be revealed,
restore the immediately preceding layout as soon as the interaction is complete. Do not change the active editor,
terminal tab, panel, or workspace focus unless the task actually requires it.

## VS Code workspace membership

Whenever Codex creates or starts using an AIMVS worktree, add that worktree folder to the currently active AIMVS
VS Code workspace immediately:

```bash
code --add "$WORKTREE_DIR"
```

Use `code --status` before and after the command to verify the last active window is the AIMVS workspace and that
both the main checkout and the exact worktree path appear under `Workspace Stats`. Do not open the worktree in a
separate VS Code window when the main workspace is already open. When explicitly removing a worktree, remove its
folder from that workspace as part of the same cleanup and verify it is gone:

```bash
code --remove "$WORKTREE_DIR"
```

If the `code` CLI is unavailable or the last active window is not the AIMVS workspace, use VS Code's **Add Folder
to Workspace...** / **Remove Folder from Workspace** UI against the exact path and verify the resulting workspace
folders before continuing.

## Run an agent-owned stack

1. **Reuse the shared main emulator stack.** Check its required ports before starting a worktree:

   ```bash
   lsof -nP -iTCP:5001 -iTCP:8080 -iTCP:9199 -sTCP:LISTEN
   ```

   If those emulators are already listening, reuse them. If they are not running, ask Ethan to start them in his
   main environment and wait for them to become ready. Do not invoke `Restore Terminals` or start a second shared
   emulator from a worktree. A trigger-changing test must use the coordinated main-checkout shared-emulator refresh
   workflow routed from the main `SKILL.md`.

2. **Make ignored local files available in the worktree** before starting the API.

   Git worktrees do not copy ignored files. The repo-local `post-checkout` hook auto-links these from the
   main checkout when a worktree is created: `node_modules`, `.secret.local`, `apps/api/.env.local`, and the
   `apps/api/bin` ffmpeg binaries. If a worktree is missing them, first ensure hooks are enabled:

   ```bash
   MAIN_CHECKOUT="$(git worktree list --porcelain | sed -n '1s/^worktree //p')" # Git lists the main worktree first; derive its hooks path without publishing a machine-specific home directory.
   git config core.hooksPath "$MAIN_CHECKOUT/.githooks"
   ```

   Then either check out any branch in the worktree to trigger the hook or run `.githooks/post-checkout`
   from inside that worktree. The `node_modules` symlink is important for Nx's normal Node
   webpack externalization: without `node_modules` at the worktree root, webpack bundles dependencies like
   Nest/Pino/sharp and standalone API builds can fail or produce worker/native-module path bugs. If you do
   not want a symlink, run `npm install` in the worktree instead.

   The shared emulators are reused, but R2/Stripe local config still comes from ignored `apps/api/.env.local`.
   The API startup should say `injecting env (4) from .env.local`; if it says `(0)`, R2 signing will fail
   with `No value provided for input HTTP label: Bucket`. Run `watch:api` after linking so the build copies it
   into `dist/apps/api/.env.local` before `serve:api:standalone:debug` starts.

   The frontend App Check debug token is also ignored local config. `apps/frontend/plugins/env-var-plugin.js`
   reads `FIREBASE_APPCHECK_DEBUG_TOKEN` from `process.env` or repo-root `.secret.local`; no manual export is
   needed when the frontend command is launched from the worktree root. Restart the frontend after changing
   `.secret.local`.

   If the worktree does not have `apps/api/bin/ffmpeg` and `apps/api/bin/ffprobe`, either run
   `npm run download:ffmpeg` in the worktree or prefix the standalone API command with
   `USE_SYSTEM_FFMPEG=true`.

   The standalone API caches GCP Secret Manager payloads in
   `~/Library/Caches/ai-music-video-studio/secrets.json`. Rotating a provider secret does not update that cache or
   a running API process. Restart only the agent-owned nonzero API with `REFRESH_SECRETS=true` for one launch, then
   verify the refreshed credential through equality/status-only checks. Never print secret payloads, hashes, raw
   provider request objects, or unfiltered provider-error log sections; Axios request data can contain
   `Authorization` or `x-api-key` headers.

3. **Pick the next free nonzero agent stack index** before starting anything, including tests from main:

   ```bash
   lsof -nP -iTCP:4200-4210 -iTCP:3000-3010 -iTCP:9230-9240 -sTCP:LISTEN
   ```

   Treat index `N` as used if `4200+N` or `3000+N` is listening. Use the next free nonzero `N`, keep that same
   index for the frontend/API/watch commands, and always pass `--dev-stack-index=N`. Never use `0`: it belongs to
   Ethan, even when the agent is testing code directly from the main checkout.

4. **Per worktree, pass the SAME `--dev-stack-index=N` to all three worktree processes**.

   Give every nonzero stack its own Nx workspace-data directory, including when the agent is testing from the main
   checkout. Without this, stack 0 and an agent stack in the same checkout can share Nx's running-task records and
   the agent frontend can stop at `Waiting for frontend:serve:development in another nx process`. Use
   `.nx/workspace-data-stack-N` for every Nx-backed command in that stack; leave stack 0 on the normal default.

   Prefer launching these in iTerm2 so the long-running dev processes live in a normal standalone terminal
   session, not in a Codex tool session that disappears when the chat/tool process exits. iTerm2 is installed
   at `/Applications/iTerm.app`, but its AppleScript application name is `iTerm`; target the bundle id below so
   the script also works when iTerm is not already running. Use ONE iTerm2 window per worktree stack and put the
   three worktree processes in separate tabs. Use iTerm2's AppleScript `create window` / `create tab` / `write text`
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

   (cd "$WORKTREE_DIR" && NX_WORKSPACE_DATA_DIRECTORY=".nx/workspace-data-stack-${STACK_INDEX}" npx nx build api --configuration=development)

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

   `exec zsh` keeps the tab open if a command exits, so failures remain visible. If iTerm2 AppleScript automation
   is blocked or only one tab launches, do not silently continue with hidden Codex long-running exec sessions; use
   the existing VS Code/terminal tabs or report the blocker so the stack does not end up half-launched.

   If iTerm2 is unavailable, fall back to running each command in separate tabs in another terminal app:

   ```bash
   NX_WORKSPACE_DATA_DIRECTORY=.nx/workspace-data-stack-1 npm run watch:api -- --dev-stack-index=1                 # build + watch the API
   NX_WORKSPACE_DATA_DIRECTORY=.nx/workspace-data-stack-1 npm run serve:api:standalone:debug -- --dev-stack-index=1 # standalone API on :3001, inspector :9231
   NX_WORKSPACE_DATA_DIRECTORY=.nx/workspace-data-stack-1 npm run serve:frontend:standalone-server -- --dev-stack-index=1 # frontend on :4201
   ```

   The prebuild before window creation is intentional: without it, a fresh worktree starts the standalone API
   before `dist/apps/api` exists and reproduces `Error: spawn node ENOENT`. `watch:api` performs another build
   before watching, but the prebuild gives the concurrently launched API server a current runnable artifact.

   The frontend proxy and the standalone API resolve the same stack from the flag, so `:4201`'s `/api`
   calls hit the `:3001` API, and generated links/routing use the offset ports too.

   For API changes, `watch:api` only rebuilds `dist/apps/api`; restart `serve:api:standalone:debug` for the same
   index before testing so the running Node process loads the rebuilt code. If no API is listening on the computed
   `3000 + N` port, the indexed frontend still loads but `/api` calls fail. Verify the port actually closes before
   relaunching: signaling only the npm wrapper can leave `run-standalone.js` orphaned, in which case terminate that
   exact stack's listener PID and wait for the port to close before rerunning the command in the preserved session.

5. **Open `STACK_URL`** in that stack's assigned browser. For example, stack 1 uses
   `http://localhost:4201/`. The toolbar shows a red
   `WORKTREE <NAME> · STACK #1 :4201` banner, where `<NAME>` is the uppercased checkout directory minus
   the `ai-music-video-studio-` prefix, so you never confuse a worktree browser page for main or another worktree.

## Mandatory pre-Computer-Use health gate

Before the first browser or Computer Use action for a worktree, and again after any relevant source change or
process restart, inspect the current output of every tab in that exact worktree's tracked iTerm stack window without
raising it. Require the API-watch, API-server, and frontend tabs to show the exact worktree path and the same nonzero
`--dev-stack-index=N`, then verify all of the following from their latest/current runs:

- API watch completed its latest build successfully and is still watching.
- The standalone API completed Nest startup, listens on `3000 + N` with its inspector on `9230 + N`, and has no
  unresolved startup or current-run errors.
- The frontend's latest build says `Application bundle generation complete`, listens on `4200 + N` with its debug
  receiver on `9476 + N`, targets that stack's standalone API, and has no unresolved compilation errors.
- The required emulator ports are listening. For a coordinated trigger-changing test, the current run in the exact
  owning main VS Code emulator terminal is also error-free and reports the primary checkout and canonical export.
- A request through the frontend proxy reaches the paired API, and fresh worktree frontend/API logs contain no
  unexplained errors from the current run.

Inspect terminal and log content locally, but filter App Check debug tokens, credentials, signed URLs, cookies, and
other secrets out of tool output and reports; the health gate needs status and error evidence, not sensitive values.
Prefer narrow status/error matching over returning raw log tails. Match the actual `App Check debug token: <value>`
log format, including whitespace after the colon, and redact URL query credentials such as `key=<value>`. Verify a
filtered sample contains `[REDACTED]` for every matching secret shape before returning those lines through a tool.
In a Perl replacement, write `${1}[REDACTED]`, not `$1[REDACTED]`; the latter is ambiguous and can silently delete
the secret without inserting the marker.

A listening port, a `200` root response, or an older successful build is not enough. Angular's dev server can keep
serving its last successful lazy chunks after a later `Application bundle generation failed`; fetch the relevant
served lazy chunk when live UI contradicts source. If any current process, build, proxy, emulator, or fresh-log check
fails, diagnose and fix the cause, rebuild or restart only the affected worktree process, then repeat this entire
gate until it is clean. Do not open or operate the test browser, hand the URL to Ethan, or begin screenshot evidence
while an error remains; report a blocker if it cannot be fixed safely. Historical output from before a later verified
restart/build does not itself fail the gate, but never use that distinction to dismiss an error still affecting the
current run.

## Stop and close an agent-owned stack

Stop and close the agent-owned nonzero stack in each case: at the end of every Computer Use manual-test session,
whenever finished using a worktree's dev stack, and before removing its worktree. This applies to passed, failed,
partial, blocked, and interrupted tests unless Ethan explicitly asks to keep that exact stack running. Finish the
report and browser cleanup first, then stop the processes before closing any terminal tab or window:

```bash
bash .agents/skills/aimvs-dev/scripts/close-iterm-dev-stack.sh \
  --window-id "$DEV_WINDOW_ID" \
  --stack-index "$STACK_INDEX"
```

The helper sends Ctrl-C to every tab first, waits for the frontend, API, inspector, and debug-log ports to stop
listening, and refuses to close the window if any remain. Only then does it close the terminal sessions and their
exact tracked window. It closes the stopped sessions individually because closing a multi-tab window directly
shows iTerm's `Close Window #…` confirmation. If iTerm still shows that prompt, the helper uses Accessibility to
require exactly one matching prompt and one `OK` button before pressing it, then verifies the tracked window is
no longer visible; iTerm can retain an invisible stale scripting
object after a successful close, so `exists` is not a valid success check. Do not leave this dialog for the user or
confirm an unverified iTerm prompt.

For a fallback terminal, use the same order on only its tracked tabs and window: send Ctrl-C to each stack process,
verify ports `4200 + N`, `3000 + N`, `9230 + N`, and `9476 + N` have no listeners, then close those tabs and their
window. Never quit a terminal app or close an unrelated window. Remove the worktree from VS Code and Git afterward
only when removal is part of the task.
