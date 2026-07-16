---
name: aimvs-dev
description: Use for every AI Music Video Studio development interaction involving Computer Use, a local browser test, dev-stack startup or control, debugging, or questions about prior manual-test screenshot evidence. This is the repo source of truth for Ethan-owned stack 0 safety, agent-owned nonzero stack selection, MacBook-display routing, shared or isolated Firebase emulators, port offsets, browser assignment, authentication, verification, recovery, and durable manual-test reports.
---

# AIMVS Development

## Continuous improvement

Improve this skill as part of using it. Whenever usage, debugging, investigation, or user feedback produces a
durable verified AIMVS setup, browser, emulator, screenshot, reporting, login, or recovery finding, update this
skill during the same task without waiting for a separate request. Adjust its instructions, scripts, tests, or
references as appropriate, retest affected behavior, and validate the skill before finishing. Preserve reusable
knowledge; do not record guesses, duplicate guidance, secrets, credentials, branch-specific results, or transient
runtime state.

## Overview

This skill is the source of truth for every AIMVS Computer Use interaction and local browser test, including a
test of uncommitted changes in the main checkout. Select it before any global Computer Use or browser-testing
skill. Stack 0 belongs to Ethan's main VS Code environment and is never an agent test target. Every agent-run test
uses a free nonzero stack index, even when its source is the main checkout; Safari is the first-choice browser for
the first agent-owned stack and additional concurrent stacks use the next browsers below.

## Non-negotiable browser display

Every AIMVS browser interaction must happen on the MacBook's display named `Built-in Retina Display`. Never test
on either external display (including the ultrawide or the Dell), and never disturb an existing external-display
browser window.

Never move, raise, resize, or reposition a Computer Use preview or dedicated test-browser window over a video
the user is watching. Preserve the active playback area and leave the user's media window unobstructed; if the
assigned browser cannot be operated without covering it, stop and report the blocker instead of moving the test
or preview window across the video.

Before the first browser action, assign the browser from the order in **Browsers (avoid auth/storage collisions)**,
set the exact stack URL, and inventory the existing windows:

```bash
STACK_INDEX=1 # replace this with the selected free nonzero index for every agent-run test
STACK_URL="http://localhost:$((4200 + STACK_INDEX))/"
swift .agents/skills/aimvs-dev/scripts/inspect-browser-displays.swift
```

The script identifies displays by `NSScreen.localizedName`, converts their live frames into the same coordinate
system as browser windows, and prints the numeric identity and display of each substantial
Safari/Chrome/Firefox/Opera window. Record the pre-existing window IDs and whether the assigned browser app was
already running; never claim they were created by the test. Do not infer the display from a window's size, a
negative X coordinate, or whichever display is currently main.

When Safari is assigned, create exactly one dedicated test window and navigate it to the exact stack URL in the
same operation with:

```bash
inspection="$(bash .agents/skills/aimvs-dev/scripts/open-safari-test-window.sh "$STACK_URL")"
printf '%s\n' "$inspection"
TEST_WINDOW_ID="$(sed -n 's/^window=//p' <<<"$inspection")"
```

This derives the window bounds from the live `Built-in Retina Display` frame, creates the window at those bounds,
navigates it, and prints its numeric ID. The helper must never activate Safari, raise a window, or require Safari
to remain frontmost after setup.

When Firefox, Opera, or personal Chrome is assigned to a concurrent stack, use that browser's normal persistent
profile with the applicable Computer Use/browser controller—never a fresh or isolated profile. After recording
the existing window IDs, create exactly one dedicated window at `STACK_URL`, place it within the live
`Built-in Retina Display` bounds, then immediately re-run the inventory. Accept the window only when one new ID
for the assigned browser appears on that display and the controller state shows `STACK_URL`; save that ID as
`TEST_WINDOW_ID`. This creation-and-placement operation is the only browser action allowed before verification.
If the controller cannot create, identify, and place that exact new window without navigating, moving, raising,
or closing a pre-existing window, stop and report the blocker instead of improvising.

Do not use an untracked `Cmd+N` workflow or identify/move windows by eye. Window creation and placement are a
one-time setup while the tracked window exists. The Safari helper technically defaults to stack 0 when no URL
argument is provided, but agents must always pass their nonzero `STACK_URL` so they never touch Ethan's stack.

After setup, do not repeatedly run display/focus scripts and do not use an app-level Computer Use `Raise` action
merely to wake or find a browser. One narrow exception applies when the user explicitly permits temporary foreground
control and a Chromium AIMVS route remains blank while `frontend-debug-N.log` reports
`Transition was aborted because of invalid state`: after verifying the tracked window's display and stack URL, raise
only that exact dedicated window and keep it foregrounded through the route interactions. Chromium's View Transitions
API needs a fully active document; background inspection can still work while the Angular navigation itself stalls.
Send the normal macOS heads-up before taking focus, and stop taking focus as soon as the route test is complete.
Before acting on a fresh Computer Use state, require its accessibility tree to show the expected stack URL. If it
shows another window or stack, stop rather than activating the assigned browser or changing which window is
frontmost. Never invoke the creation flow again while `TEST_WINDOW_ID` still exists. Existing external-display
windows belong to the user: never raise, navigate, move, close, or otherwise interact with them.

Background Safari may defer an async completion or repaint until its page receives another interaction. Before
reporting a stuck loader, use one harmless in-page interaction such as opening and closing an existing filter,
then read fresh Computer Use state; do not activate or raise Safari to wake it.

By default, run several worktrees' frontend + standalone API at once, all sharing one Firebase emulator stack. Each
worktree runs on a "dev stack index" `N` that offsets every port by `N`, so stack 1's frontend is `:4201`,
stack 2's is `:4202`, etc. This lets you test different branches side by side in different browsers.

This works because we assume worktrees rarely change Firestore/Storage triggers, so the one shared emulator
is fine for all of them. If a worktree changes Functions, Firestore, or Storage trigger behavior, use the exclusive
emulator workflow below instead of the shared emulator.

Node-side wiring lives in `apps/frontend/plugins/dev-stack-config.cjs` (pure config) and `tools/scripts/run-dev-stack.cjs`
(the CLI the npm scripts call). In ordinary shared-emulator mode, `--dev-stack-index=N` on any script is the only
knob needed to keep that worktree's frontend and standalone API paired.

## Ports per stack (base + N)

| Thing | Base (stack 0 = main) | Stack N |
| --- | --- | --- |
| frontend | 4200 | 4200 + N |
| standalone API | 3000 | 3000 + N |
| standalone API inspector | 9230 | 9230 + N |
| frontend debug-log receiver | 9476 | 9476 + N |

Stack 0's debug log is `frontend-debug.log`; stack N's is `frontend-debug-N.log`.

## Completion handoff

End every completed AIMVS task or review with this compact field list. Keep every field on its own bullet so the
handoff stays easy to scan; never combine the checkout, branch, stack, or frontend URL into one sentence. Make the
checkout path and frontend URL clickable.

```markdown
- Checkout: [<checkout name>](<absolute checkout path>)
- Branch: <branch name>
- Dev stack: <stack index>
- Frontend: [<localhost URL>](<localhost URL>)
```

When no dev stack for that exact checkout or worktree is running, write `Not running` for both **Dev stack** and
**Frontend** instead of omitting either line.

## Ethan's main environment (stack 0)

Stack 0 is exclusively Ethan's main VS Code environment. Agents must never start, stop, restart, restore, or use
stack 0 for their own tests unless Ethan explicitly asks for that exact stack 0 action. Read-only port and log
inspection is allowed. Testing source from the main checkout still uses a free nonzero stack index.

For questions such as "what is causing the API debug log error?", read the checkout-root `api-debug.log` directly
with shell tools first; do not open or operate VS Code/Computer Use merely to read API errors. The API truncates
this file on server start, so it represents the current API session. If stack 0 is missing or unhealthy, report it
to Ethan and leave it alone unless he explicitly asks for the exact start, stop, restart, or restore action. Agents
must never invoke `Restore Terminals` for stack 0 on their own.

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

## Worktrees that change emulator triggers

The frontend and standalone API intentionally use the standard emulator ports, so a trigger-changing worktree
cannot run an isolated emulator concurrently with the shared main emulator. Isolate it in time while keeping the
same ports:

1. Confirm the worktree actually changes Functions, Firestore, or Storage trigger behavior. Do not take exclusive
   emulator ownership for ordinary frontend or standalone API changes.
2. Ask the user before stopping the shared emulator because every running AIMVS stack depends on it. Do not continue
   until he confirms that the other stacks can be interrupted.
3. Ask Ethan to stop the shared emulator through his existing main VS Code terminal, then verify ports `5001`,
   `8080`, and `9199` are free. Only operate that terminal if he explicitly asks for this exact action. Do not run
   a blanket teardown while another approved test is using the emulators.
4. From the trigger-changing worktree, start `npm run serve:emulators:standalone-server` in a dedicated normal
   terminal. This builds and loads that worktree's trigger code while retaining the standard emulator ports used
   by its frontend and standalone API.
5. Run and test only that worktree against this emulator session. Do not claim other stacks are concurrently safe.
6. When testing finishes, stop the worktree emulator cleanly and ask Ethan to restore his main emulator. Only
   restore stack 0 if he explicitly asks for that exact action, then verify its ports before handing it back.

## Running a stack

1. **Reuse the shared main emulator stack.** Check its required ports before starting a worktree:

   ```bash
   lsof -nP -iTCP:5001 -iTCP:8080 -iTCP:9199 -sTCP:LISTEN
   ```

   If those emulators are already listening, reuse them. If they are not running, ask Ethan to start them in his
   main environment and wait for them to become ready. Do not invoke `Restore Terminals` or start a second shared
   emulator from a worktree. The only exception is the explicitly coordinated trigger-isolation workflow above.

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
   close too quickly instead of leaving the expected long-running tab. Snapshot existing iTerm window ids first
   so session restoration or an already-open iTerm window does not steal the worktree tabs. Record the exact new
   window id as `DEV_WINDOW_ID` when creating it; never try to rediscover the worktree window later by title,
   position, or whichever iTerm window is active.

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

       tell current session of devWindow to write text (item 1 of argv) newline yes
       tell devWindow to create tab with default profile
       delay 0.5
       tell current session of devWindow to write text (item 2 of argv) newline yes
       tell devWindow to create tab with default profile
       delay 0.5
       tell current session of devWindow to write text (item 3 of argv) newline yes
       return id of devWindow
     end tell
   end run
   APPLESCRIPT
   )"
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
   `3000 + N` port, the indexed frontend still loads but `/api` calls fail.

5. **Open `STACK_URL`** in that stack's assigned browser (see below). For example, stack 1 uses
   `http://localhost:4201/`. The toolbar shows a red
   `WORKTREE <NAME> · STACK #1 :4201` banner, where `<NAME>` is the uppercased checkout directory minus
   the `ai-music-video-studio-` prefix, so you never confuse a worktree tab for main or another worktree.

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
require exactly one matching prompt and one `OK` button before pressing it, then verifies the tracked window is no
longer visible; iTerm can retain an invisible stale scripting
object after a successful close, so `exists` is not a valid success check. Do not leave this dialog for the user or
confirm an unverified iTerm prompt.

For a fallback terminal, use the same order on only its tracked tabs and window: send Ctrl-C to each stack process,
verify ports `4200 + N`, `3000 + N`, `9230 + N`, and `9476 + N` have no listeners, then close those tabs and their
window. Never quit a terminal app or close an unrelated window. Remove the worktree from VS Code and Git afterward
only when removal is part of the task.

## Browsers (avoid auth/storage collisions)

Use Safari first for the first agent-owned nonzero AIMVS test stack. This repo rule overrides any global preference
for personal Chrome. Concurrent agent stacks must use different browsers so Firebase Auth persistence + App Check
storage do not fight; assign them in this order: Safari → Firefox → Opera → personal Chrome. Never switch away
from Safari merely because another browser is already logged in—use the test-account sign-in flow below when
Safari needs authentication. Stack 0 is not part of this assignment because agents never test against it.

The window setup above is conditional on this assignment: use the Safari helper only for Safari, and use the
verified browser-controller flow for Firefox, Opera, or personal Chrome. Keep every test browser on
`Built-in Retina Display` when other monitors are attached. If the newly created test window opens elsewhere,
move only that new window to `Built-in Retina Display` and re-run the display inventory before interacting.

## Browser control while the user is using the Mac

The Safari helper and read-only accessibility inspection can operate without activating or raising the test
window, so the user may continue using another app or display during those operations. Computer Use pointer,
keyboard, or browser-controller actions can change shared desktop focus. Before any such input, obtain a short
exclusive-control window; if the user is actively clicking or typing, do not rely on multi-step UI sequences because
his input can steal focus between steps and make the test invalid.

When the user grants exclusive control, use the normal visible browser assigned to that stack with Computer Use. If
he wants to keep using the machine while testing runs, ask for a short exclusive-control window before clicks/typing, or use
a scriptable browser/control path only if he accepts that mode. Use the same stack URL, same `.secret.local`
credentials, and same App Check debug token. Do not silently switch browser modes and call it the requested
manual Firefox/Safari/Opera test.

If the browser keeps defocusing, typed text lands in the wrong place, or Computer Use reports that the user
changed the app mid-action, assume the user is probably using the computer. Stop the immediate click/type loop and
retry with exponential backoff: wait 1 minute, then 2 minutes, then 4, 8, 16, 32, and cap at 60 minutes. Re-check
`get_app_state` after each wait before continuing. Do not keep burning retries while focus is unstable.

## Sign-in (test account)

Local development uses real Firebase Auth for the staging project; only Firestore, Functions, and Storage are
emulated by this stack. Do not treat the absence of an Auth emulator on `:9099` as a blocker, and do not create
a staging sign-up/user unless the user explicitly asks.

Read both credentials from ignored repo-root `.secret.local`: `AIMVS_TEST_LOGIN_EMAIL` and
`AIMVS_TEST_LOGIN_PASSWORD`. If either variable is missing, stop and ask the user to add it; never invent a
fallback account. Never print or commit these values. Use the persistent browser profile for the stack so App
Check/Auth state survives between runs.

Before spending time debugging browser focus, verify the saved email exists in staging Auth when ADC is available:

```bash
node - <<'NODE'
const fs = require('fs');
const { initializeApp, applicationDefault, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const line = fs.readFileSync('.secret.local', 'utf8').split(/\r?\n/).find((entry) => entry.startsWith('AIMVS_TEST_LOGIN_EMAIL='));
if (!line) throw new Error('AIMVS_TEST_LOGIN_EMAIL is missing from .secret.local');
const email = line.slice('AIMVS_TEST_LOGIN_EMAIL='.length);
const projectId = JSON.parse(fs.readFileSync('.firebaserc', 'utf8')).projects.staging;
if (!projectId) throw new Error('The staging Firebase project is missing from .firebaserc');
if (!getApps().length) initializeApp({ credential: applicationDefault(), projectId });
getAuth().getUserByEmail(email).then((user) => {
  console.log(JSON.stringify({ savedEmailExists: true, providers: user.providerData.map((p) => p.providerId).sort() }));
}).catch((error) => {
  console.log(JSON.stringify({ savedEmailExists: false, code: error.code || 'unknown' }));
  process.exitCode = 1;
});
NODE
```

When filling the Angular/Firebase sign-in form, do not use Accessibility/AX `set_value`. It can make fields look
filled without updating Angular/TanStack form state, leaving stale validation and causing misleading login
failures. In Firefox, password-field clipboard paste can also be unreliable. Use Computer Use to click the visible
email field, type with real keyboard input (`Cmd-A`, literal keystrokes), refresh app state, click the password
field, type the password with real keyboard input, refresh app state, then click the visible Sign In submit button.
Do not rely on `Tab`/`Enter` order in Firefox: it can land on the Forgot Password control and switch the form to
Reset Password instead of submitting.

Safari may cover the app with Auto-Complete or `Update Password` popovers during and after sign-in. Press Escape
to dismiss each popover, then refresh Computer Use accessibility state before deciding whether sign-in failed or
reusing an element index. The authenticated redirect may already have completed behind an `Update Password`
prompt, so verify the URL and authenticated-only UI after dismissing it instead of submitting the form again.

Firefox may show saved-password/autofill popovers from stale local attempts, including a previously mistyped
email. Do not select those suggestions. Dismiss or ignore them and manually type the current `.secret.local`
values. After submitting, Firefox may show a "Save password" prompt for the current `STACK_URL`; click "Not now"
so it does not obscure the app while waiting for the auth redirect. After every modal change, popover,
failed click, or user focus interruption, call Computer Use
`get_app_state` again before reusing element indexes; Firefox's accessibility indexes shift.

Login verification must be based on authenticated UI state, not just the public page rendering. The public home
can show a `Create Project` button while still unauthenticated. Treat login as successful only after the top-right
`Sign In` control is gone and an authenticated-only account/channel/project UI is visible, for example
`/dashboard` with the side nav, credits, notifications, and profile picture controls. If Firebase says
`No account found`, re-run the Auth preflight before retrying UI steps.

## App Check debug token

For worktree browsers/ports, use one registered App Check debug token across stacks. Save it in ignored
repo-root `.secret.local` as `FIREBASE_APPCHECK_DEBUG_TOKEN=...`; the frontend dev build injects that string
as `window.FIREBASE_APPCHECK_DEBUG_TOKEN` by reading `process.env` or `.secret.local` at frontend build time.
If it is missing, the app falls back to Firebase's `true` debug mode, which generates a token in that browser's
IndexedDB for that localhost origin; copy the console token, register it in Firebase Console > App Check > the
staging web app > Manage debug tokens, then add it to `.secret.local` and restart the frontend. Never commit
debug tokens.

## Manual verification loop

For feature testing, prove the behavior at all four layers before calling it done:

- UI: complete the user-visible flow in the stack browser, reload after frontend changes, and verify expected
  controls, loading/disabled states, snackbars, dialogs, and absence of stale feedback after refresh.
- Screenshot pixels: load every captured PNG with a read-only image tool and personally inspect the actual image.
  File existence, dimensions, captions, DOM, Accessibility state, and logs do not prove visual correctness.
- Emulator state: query the active Firestore/Storage emulator session—shared normally or exclusive for a
  trigger-changing worktree—after each important flow and confirm the expected documents, counters, operation
  statuses, links, and storage side effects. Use the staging project namespace when connecting to the local emulator.
- Logs: inspect the stack frontend debug log (`frontend-debug.log` for stack 0, `frontend-debug-N.log` for stack
  N), the standalone API logs, and emulator output. Treat fresh console/runtime errors, failed HTTP calls, and
  backend exceptions as test failures unless they are already known and irrelevant to the touched code.

If verification finds a bug caused by the current work—including a defect visible in a screenshot—fix it
surgically, restart or reload the affected process when needed, and repeat the smallest proving flow, screenshot,
log, and emulator checks. Report pre-existing, unrelated, or deeper visual problems with the exact screenshot
instead of silently widening the implementation. Do not leave temporary test hooks, forced errors, debug logs, or
local-only code changes in the diff.

When a feature has user-visible async/error handling, test at least one failure mode in addition to the happy
path. Prefer a temporary local throw, disabled dependency, invalid emulator fixture, or rejected API response that
exercises the real UI/status/notification path. Remove the temporary fault before final verification, then confirm
the happy path still works and the logs are clean.

## Manual-test reporting

Before every AIMVS Computer Use test, read and follow
[references/manual-test-reporting.md](references/manual-test-reporting.md) completely. Capture only important
settled-state PNGs from the exact dedicated browser window; never revert or recreate old behavior to manufacture a
“before” state, and never run a continuous screen recording. Each screenshot independently carries its own title,
caption, and narrow evidence claim.
Maintain the checkout/worktree's single date-prefixed report folder containing the append-only Markdown source,
adjacent Git LFS-backed screenshots, and final double-clickable `index.html`. The helpers store the folder assignment
inside the checkout's private Git directory, so each checkout ignores clean report folders inherited from other
worktrees; when this marker is introduced to active work, only one locally changed report folder can be adopted.
The report renders independent cards in a responsive grid and lets the reviewer click any image to open an instant
browser-viewport overlay without entering native fullscreen. Generate and verify the newest report entry before the
final response, including failed, partial, and blocked sessions. Never capture credentials, another app, the user's
display/video, or a broader screen region as a fallback. Never open Preview.app or automatically open the
report/evidence at the end; provide links and let the user choose what to open.

## Close the dedicated test browser window

At the end of every Computer Use manual-test session—passed, failed, partial, or blocked—finish capturing and
verifying the report evidence, then close the exact dedicated window identified by `TEST_WINDOW_ID`. Do not leave
it open merely because development work will continue.

Close only `TEST_WINDOW_ID` with the assigned controller, then re-run the browser-display inventory and require
that ID to be gone. Never target a pre-existing window by title, position, or sight. If the test launched an
otherwise stopped browser app, quit it only after the tracked window closes and only when it has no other windows.
If exact cleanup cannot be proven safe, report it as blocked instead of closing another window or app.

After the browser window is proven closed, complete **Stop and close an agent-owned stack**. The session is not
cleaned up until both its browser window and its stack processes and terminal window are gone, unless Ethan
explicitly asked to keep that exact nonzero stack running.

## Browser crash and recovery

If the browser crashes, freezes, loses its window, or restores a previous session mid-test, do not abandon the
task. First inventory browser windows and confirm whether `TEST_WINDOW_ID` still exists. If it exists, recover only
that window and restore `STACK_URL`. If it no longer exists, the one-window rule permits exactly one replacement:
repeat the assigned browser's creation-and-placement flow, record the new ID, and verify its process, display, and
`STACK_URL` before interacting. Never repurpose a pre-existing window as the replacement. Verify authenticated
state again and continue from the last reliable checkpoint. Capture useful crash/report text or visible error
details if available, then check frontend/API/emulator logs to decide whether the crash was browser instability
or an app-triggered failure.

After a crash or forced browser restart, always re-check emulator state and operation status docs before retrying
the action. This avoids double-running a mutation while the previous backend operation actually succeeded.
