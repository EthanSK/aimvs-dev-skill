# Dev-stack lifecycle

## Contents

- [Ports per stack](#ports-per-stack)
- [Ethan's main environment](#ethans-main-environment)
- [Create a linked worktree](#create-a-linked-worktree)
- [VS Code workspace membership](#vs-code-workspace-membership)
- [Run an agent-owned stack](#run-an-agent-owned-stack)
- [Schedule the 24-hour idle-cleanup check](#schedule-the-24-hour-idle-cleanup-check)
- [Mandatory pre-Computer-Use health gate](#mandatory-pre-computer-use-health-gate)
- [Stop and close an agent-owned stack](#stop-and-close-an-agent-owned-stack)

## Ports per stack

| Thing                       | Stack 0 = Ethan's main | Every nonzero stack N |
| --------------------------- | ---------------------- | --------------------- |
| frontend                    | 4200                   | 4200 + N              |
| standalone API              | 3000                   | 3000 + N              |
| standalone API inspector    | 9230                   | 9230 + N              |
| frontend debug-log receiver | 9476                   | 9476 + N              |
| Functions                   | 5001                   | 15000 + N             |
| Firestore                   | 8080                   | 18080 + N             |
| Firebase Storage            | 9199                   | 16000 + N             |
| Firebase Auth               | real staging Auth      | real staging Auth     |
| MinIO                       | 9000                   | 17000 + N             |
| download-assets-worker      | 8787                   | 18800 + N             |

The main Restore Terminals setup owns stack 0's native download-assets-worker on `:8787`. Every nonzero stack owns
an indexed Worker inside its private Docker backend; never point it at the main Worker or start a second native copy.
(Codex task: 019fe10d-0cee-7192-a8d9-19bdf0ba7666)
Launch stack 0's Worker only through `npm run serve:download-assets-worker`, which starts the locked local Nx CLI as
its direct child and forwards terminal shutdown signals. Do not put `npx` between `run-dev-stack.cjs` and any
long-running Nx task: when Restore Terminals replaced the Worker terminal, Wrangler stopped but that indirect Nx
process survived under PID 1, lost its listener, ignored ordinary termination, and continuously consumed one CPU
core. Nx remains the normal Worker task owner because it shuts down Wrangler and Workerd correctly when it receives
the forwarded signal. (Codex task: 019fe10d-0cee-7192-a8d9-19bdf0ba7666)

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
Every stack-0 terminal group in `.vscode/restore-terminals.json` must set `cwd` to
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

## Create a linked worktree

Name every new linked AIMVS worktree directory `aimvs-<task-slug>`, not
`ai-music-video-studio-<task-slug>`. This applies to the directory only; keep the established branch naming convention,
such as `codex/<task-slug>`. Do not rename existing worktrees merely to apply the new convention.

If Ethan explicitly requests an active worktree rename, first resolve its owning task and live processes, fingerprint
its staged/unstaged/untracked state, and verify the destination is free. Use `git worktree move`, then immediately put
an old-path compatibility symlink in place so saved task working directories and already-running processes remain
usable. Verify the new registered path, unchanged Git boundaries, symlink target, and live stack before notifying the
owning task to use the new path. Never treat the compatibility symlink as a second worktree. (Codex task:
01a01193-8a28-7801-b514-509a50b727bb)

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

When replacing an old workspace path after a worktree rename, run `code --add "$NEW_WORKTREE_DIR"` and
`code --remove "$OLD_WORKTREE_DIR"` as separate invocations, then read back `Workspace Stats`. A combined
`code --remove "$OLD_WORKTREE_DIR" --add "$NEW_WORKTREE_DIR"` invocation left both entries visible during the verified
rename flow. (Codex task: 01a01193-8a28-7801-b514-509a50b727bb)

If the `code` CLI is unavailable or the last active window is not the AIMVS workspace, use VS Code's **Add Folder
to Workspace...** / **Remove Folder from Workspace** UI against the exact path and verify the resulting workspace
folders before continuing.

## Run an agent-owned stack

1. **Pick the first completely unused nonzero stack index** before starting anything, including tests from main.

   For each candidate `N`, require all four native ports to be free, no running or stopped container with that exact
   Compose project label, and no named volume whose name starts with that exact project prefix:

   ```bash
   STACK_INDEX=N
   for STACK_PORT in $((4200 + STACK_INDEX)) $((3000 + STACK_INDEX)) $((9230 + STACK_INDEX)) $((9476 + STACK_INDEX)); do
     lsof -nP -iTCP:"$STACK_PORT" -sTCP:LISTEN
   done
   docker container ls --all --filter "label=com.docker.compose.project=aimvs-isolated-backend-stack-${STACK_INDEX}" --format '{{.Names}}'
   docker volume ls --format '{{.Name}}' | awk -v prefix="aimvs-isolated-backend-stack-${STACK_INDEX}_" 'index($0, prefix) == 1'
   ```

   All three commands must return no ownership evidence before assigning a new index. A stopped Compose project is
   still owned: its containers retain the originating worktree path and its volumes retain private data. Preserve it
   and choose another index. Reuse an existing index only for its verified owning worktree after comparing every
   container's `com.docker.compose.project.working_dir` label and bind mount with the exact current worktree. Never use
   `0`; it belongs to Ethan even when testing source from main. (Codex task:
   019fe10d-0cee-7192-a8d9-19bdf0ba7666)

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

   The private backend does not replace ignored API config; R2/Stripe local config still comes from
   `apps/api/.env.local`.
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

3. **Start the stack's private backend.** Every nonzero stack owns isolated Functions, Firestore, Storage, MinIO, and
   Download Assets Worker containers. Start them before the native worktree processes:

   ```bash
   npm run isolated-backend -- start --dev-stack-index=N
   npm run watch:api -- --dev-stack-index=N
   npm run serve:api:standalone:debug -- --dev-stack-index=N
   npm run serve:frontend:standalone-server -- --dev-stack-index=N
   ```

   The stack index is the only backend-mode source of truth. Native nonzero launchers refuse to start until the
   matching Compose backend exists; there is no shared-mode flag or fallback to stack 0. A genuinely new stack defaults
   to the canonical stack-0 snapshot; use `--seed=empty` only when an empty first initialization is explicitly required.
   Later starts always retain that stack's existing private Firebase export and MinIO volume, and an interrupted first
   initialization retries with its already-persisted seed choice. Never delete its volumes, reseed it, or merge its data
   into stack 0. (Codex tasks: 019fe10d-0cee-7192-a8d9-19bdf0ba7666, 01a02060-8246-7b91-9540-bbd3d4d5a105)

   The API watcher does not replace the Functions bundle baked into the isolated Firebase image. After changing a
   Function definition or trigger-local code, run the guarded isolated-backend `stop`, then `start` again before
   testing the trigger; ordinary standalone API changes still use the normal native rebuild-and-restart workflow.

   Stop it with `npm run isolated-backend -- stop --dev-stack-index=N`; that guarded stop exports and verifies the
   private Firebase snapshot before returning. Use
   `npm run isolated-backend -- export --dev-stack-index=N` for a one-shot private snapshot without stopping.

4. **Per worktree, pass the SAME `--dev-stack-index=N` to every worktree process**.

   Give every nonzero stack its own Nx workspace-data directory, including when the agent is testing from the main
   checkout. Without this, stack 0 and an agent stack in the same checkout can share Nx's running-task records and
   the agent frontend can stop at `Waiting for frontend:serve:development in another nx process`. Use
   `.nx/workspace-data-stack-N` for every Nx-backed command in that stack; leave stack 0 on the normal default.

   Prefer launching these in iTerm2 so the long-running dev processes live in a normal standalone terminal
   session, not in a Codex tool session that disappears when the chat/tool process exits. iTerm2 is installed
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
   index before testing so the running Node process loads the rebuilt code. Immediately before every API-server
   restart, explicitly run `NX_WORKSPACE_DATA_DIRECTORY=.nx/workspace-data-stack-N npm exec -- nx build api
--configuration=development`: another task can overwrite the shared `dist/apps/api` with a production build,
   and restarting that artifact makes localhost requests fail CORS even though the source and stack index are
   correct. After restart, require the latest startup output to say `Current API environment: development` and
   verify a localhost-origin preflight returns `Access-Control-Allow-Origin` before continuing. If no API is
   listening on the computed `3000 + N` port, the indexed frontend still loads but `/api` calls fail. Verify the
   old port actually closes before relaunching: signaling only the npm wrapper can leave `run-standalone.js`
   orphaned, in which case terminate that exact stack's listener PID and wait for the port to close before rerunning
   the command in the preserved session.

5. **Open `STACK_URL`** in that stack's assigned browser. For example, stack 1 uses
   `http://localhost:4201/`. The toolbar shows a red
   `WORKTREE <NAME> · STACK #1 :4201` banner. New `aimvs-<task-slug>` directory names remain fully visible in
   `<NAME>`; legacy `ai-music-video-studio-<task-slug>` names omit their long prefix. This keeps every worktree
   browser page distinguishable from main and other worktrees.

6. **Schedule and verify the 24-hour idle-cleanup check** described below. Starting a persistent nonzero stack is not
   complete until the scheduler readback proves that the exact task and stack have a cleanup owner.

## Schedule the 24-hour idle-cleanup check

Immediately after starting any agent-owned nonzero stack, create a one-time follow-up attached to the exact owning
task for 24 hours after the verified start time. In Codex Desktop, use the supported heartbeat automation through
`automation_update`; in another host, use its native task-follow-up scheduler. Never implement this with `sleep`,
`nohup`, a loose cron entry, a LaunchAgent, or a detached watchdog process. If no supported scheduler is available,
do not leave the stack running after the active task ends.

Give the follow-up a unique name containing the worktree basename and stack index. Put these non-secret ownership
facts in its prompt so a compacted or resumed task can still act safely:

- exact task/thread identifier and visible title;
- absolute worktree path and stack index;
- tracked `DEV_WINDOW_ID` and assigned browser/window identity when one exists;
- verified stack start time and exact isolated Compose project;
- expected native and private-backend ports;
- an instruction to follow this section and [Stop and close an agent-owned stack](#stop-and-close-an-agent-owned-stack).

Do not copy a mutable "latest task activity" timestamp into the prompt. It becomes stale as soon as the owning task
runs again; the follow-up must resolve that value from actual task history when it executes.

Read the scheduler state back before relying on it. Require the exact owning task, prompt identifiers, one run only,
and a next-run time 24 hours after stack start. A completed-looking create/update call is not proof that the timer was
persisted. Keep the automation identifier in the task context, and recover it later by the unique worktree/stack name
if compaction removed that context.

Encode a one-time target with its local calendar date as well as its local clock time, such as a one-count yearly rule
with `BYMONTH` and `BYMONTHDAY`; a daily one-count rule can fire later the same day instead of tomorrow. Follow the
scheduler tool's contract and write the user's local wall-clock fields directly rather than converting them to UTC.
Still verify the scheduler's absolute next-run instant after saving, because the stored recurrence text alone does
not prove that the host interpreted its timezone correctly.

When the follow-up runs, ignore the heartbeat's own turn when judging activity and prove all of the following before
calling the stack unused:

- the owning task has had no non-heartbeat work for at least 24 hours;
- the exact stack has had no meaningful frontend/API request, build, log, browser-interaction, or source-work activity
  for at least 24 hours;
- no user or other active task currently owns or uses the exact worktree, browser window, terminal window, or stack;
- no upload, generation, rendering, export, migration, or other state-changing operation is still running; and
- the current processes, ports, terminal window, browser window, and isolated containers still match the recorded
  ownership facts.

Resolve owning-task activity from the task's actual turn history, not from timestamps copied into the automation
prompt. Read the newest turns, skip the current heartbeat and every earlier turn whose user message is a heartbeat,
then use the latest real timestamp from the newest remaining turn (`completedAt` when present, otherwise `startedAt`).
Treat prompt fields such as `Latest verified owning task activity`, automation `updated_at`, scheduler delivery time,
and heartbeat rescheduling as hints or automation activity, never as proof of user or task activity. Parse ISO offsets
or epoch values into absolute instants and compare those instants in UTC; never compare clock text or discard an
offset. For example, `17:38:39Z` and `17:38:33+01:00` are one hour and six seconds apart, not six seconds. Require a
full 24 elapsed hours before cleanup, and read back the rescheduled run as an absolute instant 24 hours after the
verified activity rather than validating only its displayed clock time. If task history or the scheduler's absolute
next-run instant cannot be read, treat activity as ambiguous and preserve the stack. (Codex task:
01a016e3-6c55-7d42-b152-7c96b6916fdd)

A merely loaded stale browser page is not proof of current use, but a focused page, recent interaction, active task,
or any ownership ambiguity blocks automatic cleanup. If recent use is proven, replace the consumed follow-up with a
new one-time check 24 hours after the latest confirmed use. If ownership or activity is ambiguous, preserve everything
and schedule the next check 24 hours after the current one; report the exact ambiguity instead of guessing.

When inactivity is proven, invoke `$macos-heads-up-notification`, close and verify only the tracked browser window,
then use the normal guarded stop sequence below. Stop the nonzero backend only through its verified export-and-stop
command. Never stop stack 0 or its Firebase emulators, MinIO, or Worker. Require the indexed native ports and exact
isolated Compose project to be gone before marking the cleanup complete.

Whenever normal task cleanup closes the stack before the follow-up fires, cancel or retire its exact scheduled check
and read scheduler state back to prove it is no longer active. Never leave a stale timer that can later wake and act on
reused ports or a different stack owner.

## Mandatory pre-Computer-Use health gate

Before the first browser or Computer Use action for a worktree, and again after any relevant source change or
process restart, inspect the current output of every tab in that exact worktree's tracked iTerm stack window without
raising it. Require the API-watch, API-server, frontend, and any download-Worker tab to show the exact worktree path
and the same nonzero `--dev-stack-index=N`, then verify all of the following from their latest/current runs:

- API watch completed its latest build successfully and is still watching.
- The standalone API completed Nest startup, listens on `3000 + N` with its inspector on `9230 + N`, and has no
  unresolved startup or current-run errors.
- The frontend's latest build says `Application bundle generation complete`, listens on `4200 + N` with its debug
  receiver on `9476 + N`, targets that stack's standalone API, and has no unresolved compilation errors.
- The indexed Download Assets Worker container reports healthy, listens on `18800 + N`, and, when testing Download
  selected, a POST with no grant reaches that Worker and returns its expected `400` without current-run errors.
- Indexed Functions `15000 + N`, Firestore `18080 + N`, Storage `16000 + N`, MinIO `17000 + N`, and Worker `18800 + N`
  are listening, every private container reports healthy, and MinIO's `/minio/health/live` returns success.
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
partial, blocked, and interrupted tests unless Ethan explicitly asks to keep that exact stack running. Worktree removal
is blocked until this whole sequence succeeds; the isolated launcher and Compose file live in the worktree, so never
delete or move it first.

Finish the report and task-fixture cleanup, then close and verify the exact tracked browser window. Stop the native
frontend/API processes next so they cannot issue another write while Firebase creates its final private export:

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

Run the stack's guarded backend stop only after the native ports are closed:

```bash
npm run isolated-backend -- stop --dev-stack-index="$STACK_INDEX"
```

Require `Verified the private Firebase export completed.` when Firebase reached readiness, followed by `Verified all
isolated backend containers stopped; private volumes preserved.` A container that failed before readiness instead
prints `Firebase never became ready; no private export was required.` so its Worker and MinIO can still be cleaned up.
The command keeps the stack-indexed Firebase and MinIO volumes for its next start. An already-stopped Firebase
container that previously reached readiness is safe only when its latest lifecycle has a clean exit and a verified
export-on-exit; a container that never existed needs no export. If export verification fails, any container remains
live, or ownership is ambiguous, stop cleanup and keep the worktree; never bypass the command with raw `docker stop`,
`docker compose down`, or volume deletion. (Codex task: 019ff0c1-80ad-79f3-9d60-cbb4004bf608)

Every nonzero stack owns and exports only its private backend. Before an authorized manual stop or restart of stack
0's shared backend, run `npm run export-emulator-data` once from the primary main worktree and require Firebase's own
`Export complete` output; main's 30-minute periodic exporter is only crash protection and does not prove the latest
writes were persisted.

For a fallback terminal, use the same order on only its tracked tabs and window: send Ctrl-C to each stack process,
verify ports `4200 + N`, `3000 + N`, `9230 + N`, and `9476 + N` have no listeners, then close those tabs and their
window. Never stop stack 0's Worker, quit a terminal app, or close an unrelated window. Only after every applicable
browser, native-process, export, and container check above succeeds may an agent remove the worktree from VS Code and
Git. Recheck that its frontend/API/debug ports and isolated Docker project have no running owner before removal; any
failure blocks removal instead of becoming a warning.
