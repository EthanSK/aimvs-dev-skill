# Dev-stack lifecycle

## Contents

- [Ports per stack](#ports-per-stack)
- [Ethan's main environment](#ethans-main-environment)
- [Run an agent-owned stack](#run-an-agent-owned-stack)
- [Retain an agent-owned stack after testing](#retain-an-agent-owned-stack-after-testing)
- [Schedule an explicitly requested timed cleanup](#schedule-an-explicitly-requested-timed-cleanup)
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
| MinIO console               | 9001                   | 17100 + N             |
| download-assets-worker      | 8787                   | 18800 + N             |
| Firestore WebSocket         | —                      | 19150 + N             |
| Emulator UI                 | —                      | 14000 + N             |
| Emulator hub                | —                      | 14400 + N             |
| Emulator logging            | —                      | 14500 + N             |

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

## Run an agent-owned stack

1. **Use the worktree's reserved nonzero stack index.** A new `aimvs<N>-<task-slug>` worktree owns `N` from
   creation through removal, even while its runtime is stopped or has never started. Read `N` from the directory name
   and confirm the exact finalized owner with `npm run aimvs-worktree -- list`; never pick another number for that
   worktree. Every backend and native launcher validates the numbered prefix and shared reservation before it can start.

   Existing unnumbered worktrees and an agent test from primary main remain legacy-compatible. For those only, inspect
   `npm run aimvs-worktree -- list`, skip every reserved number, then pick the lowest reusable nonzero index whose
   native/private ports are free and whose runtime passes the guarded ownership checks below. Stopped containers, an
   empty exact Compose network, and named volumes do not themselves reserve a number; only the new shared worktree
   reservation does. The guarded `start` replaces a verified stopped runtime and continues from the preserved dataset.

   ```bash
   STACK_INDEX=N
   for STACK_PORT in \
     $((4200 + STACK_INDEX)) $((3000 + STACK_INDEX)) $((9230 + STACK_INDEX)) $((9476 + STACK_INDEX)) \
     $((15000 + STACK_INDEX)) $((18080 + STACK_INDEX)) $((16000 + STACK_INDEX)) \
     $((17000 + STACK_INDEX)) $((17100 + STACK_INDEX)) $((18800 + STACK_INDEX)) \
     $((19150 + STACK_INDEX)) $((14000 + STACK_INDEX)) $((14400 + STACK_INDEX)) $((14500 + STACK_INDEX)); do
     lsof -nP -iTCP:"$STACK_PORT" -sTCP:LISTEN
   done
   docker container ls --filter "label=com.docker.compose.project=aimvs-isolated-backend-stack-${STACK_INDEX}" --format '{{.Names}}'
   ```

   Before starting the reserved index or reusing a legacy stopped runtime, verify its containers are stopped, its exact network is empty, and every current and
   recovery-backup volume identity is preserved. The launcher performs this proof, records the new runtime worktree,
   removes only stopped containers, reuses the exact empty network, then starts against the existing volumes. `start`,
   `stop`, `export`, and the read-only `reservable` proof hold one per-index lock in the shared Git directory through
   their final readback, while the lifetime reservation prevents another worktree from claiming an idle index. A running
   lifecycle owner, container, live port, attached/foreign network, incomplete dataset, or ambiguous identity blocks
   reuse. Never delete a volume to free a number, and never use `0`; it belongs to Ethan even when testing source from main.
   (Codex tasks: 01a024c0-a524-7960-a57e-f9fa68536e4c,
   01a05ebf-a8f9-7f83-a325-1565cf6005a7)

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
   Stack 0 API startup should say `injecting env (4) from .env.local`; a healthy nonzero stack says `(2)` because
   `getDevStackEnv` deliberately pre-sets `CLOUDFLARE_R2_ENDPOINT` and `CLOUDFLARE_R2_BUCKET_NAME`. Both still require
   the same four assignments in the source and copied `.env.local` files. If startup says `(0)`, R2 signing will fail
   with `No value provided for input HTTP label: Bucket`. Run `watch:api` after linking so the build copies the file
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

   If Docker exhausts its predefined address pools, follow `emulator-safety.md`'s canonical fixed-subnet recovery. A
   stopped container can still reference a deleted network ID and fail with `network <id> not found`; let the guarded
   launcher verify the stopped runtime, replace its stale containers, reuse its exact empty network, and retain every
   current and recovery volume. Never remove a volume or dataset to recover a stack. (Codex task:
   01a024c0-a524-7960-a57e-f9fa68536e4c)

   The launcher creates the three exact private data volumes before Compose starts and declares them external so
   Compose never offers to recreate preserved data merely because its volume configuration changed. For an ownerless
   volume created by the earlier launcher, the first updated start still requires the complete correctly owned
   container/mount proof; it then atomically records the worktree and all three volume creation identities inside the
   backend-state volume. Later starts can verify that durable record even if the stopped containers were removed. If
   Compose ever prints `Recreate (data will be lost)?`, do not answer it: stop and investigate because the guarded
   launcher is designed to keep that destructive path unreachable. Any transient Docker writer that receives the
   record through stdin must use `docker run --interactive` and read the JSON back before Compose starts; without the
   flag, Docker closes stdin and `cat` silently creates a zero-byte record. (Codex task:
   01a0200e-ba77-7e42-8233-0fb4caa5bc70)

   The backend-state volume separately records whether the latest runtime is `active` or `stopped`. Guarded start
   writes `active` immediately before Compose starts so an incomplete startup fails closed; guarded stop writes
   `stopped` only after final export and shutdown verification. Missing containers while the record is still `active` blocks reuse because the
   latest Firebase writes may not have been exported. Older datasets without this record are adopted once, then every
   later start/stop is covered. (Codex task: 01a024c0-a524-7960-a57e-f9fa68536e4c)

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

   For nonzero stacks, `watch:api` makes every successful development build publish one atomic completion marker and
   `serve:api:standalone:debug` automatically replaces that stack's exact Node child after a one-second debounce. A
   compile error leaves the last good API serving; the next fresh successful build causes one clean replacement. The
   nonzero watcher deliberately skips the Nx cache because a cached build can restore an old marker ID and hide the
   first good build after a compile error. Do not manually restart the API during ordinary nonzero-stack source edits.
   Instead, compare the listener PID before and after the build, require the old port owner to exit, require exactly
   one new listener with no orphan Node or Nx process, and require the latest startup output to say
   `Current API environment: development` before Computer Use. Also verify a localhost-origin preflight returns
   `Access-Control-Allow-Origin`; the indexed frontend can still load while `/api` calls fail when its computed API
   port is missing. Stack 0 intentionally keeps its direct, manually controlled standalone API and does not use this
   supervisor. Native API reload never updates the frozen Firebase Functions bundle: after trigger-local code or a
   Function definition changes, stop native writers and follow `emulator-safety.md`'s guarded private-backend
   stop/rebuild/start before testing. (Codex task: 01a0312f-5629-7b23-b7b1-4653b92e9dcc)

5. **Open `STACK_URL`** in that stack's assigned browser. For example, stack 1 uses
   `http://localhost:4201/`. The toolbar shows a red
   `WORKTREE <NAME> · STACK #1 :4201` banner. New `aimvs1-<task-slug>` directory names make the reserved stack
   visible in `<NAME>`; legacy `ai-music-video-studio-<task-slug>` names omit their long prefix. This keeps every worktree
   browser page distinguishable from main and other worktrees.

6. **Retain the stack after testing.** Close only the exact task browser page but keep this verified private backend
   plus its native API watcher, supervised API server, and frontend watcher alive until the worktree is removed or
   Ethan explicitly asks to stop them. Ordinary source edits should flow through frontend hot reload and the nonzero
   API supervisor; wait for and verify their successful rebuild instead of manually replacing healthy processes. Keep
   the tracked `DEV_WINDOW_ID` in the task handoff and do not create an idle-cleanup automation merely because the
   stack remains active. (Codex tasks: 01a04f3a-a977-7683-81aa-f1452cf39475,
   01a05301-5376-77b1-9c70-99e37245cc98)

## Retain an agent-owned stack after testing

The end of a manual test or task turn does not authorize stopping a healthy nonzero stack. Close and verify only the
exact task-owned browser page, then confirm the terminal window, worktree path, indexed ports, and private containers
still match the owning worktree before handing the running stack back to Ethan. Preserve the tracked `DEV_WINDOW_ID`
and include the stack index and frontend URL in the completion handoff.

## Schedule an explicitly requested timed cleanup

Do not schedule this during ordinary stack startup or retention. Worktree removal is the default cleanup boundary.
Create a timed check only when Ethan explicitly asks for a time-based cleanup or deadline, then schedule the one-time
follow-up for that requested interval after the verified stack start time and attach it to the exact owning task. In
Codex Desktop, use the supported heartbeat automation through `automation_update`; in another host, use its native
task-follow-up scheduler. Never implement this with `sleep`, `nohup`, a loose cron entry, a LaunchAgent, or a detached
watchdog process. If no supported scheduler is available, report that the requested timer cannot be made safe and
leave the worktree-owned stack running. (Codex tasks: 01a0399b-e199-79d2-b4ec-a32664b00adf,
01a04f3a-a977-7683-81aa-f1452cf39475)

Do not create a 24-hour or other idle-cleanup automation for normal retention. Task inactivity, completion wording,
compaction, or a loaded-but-idle page does not weaken the worktree's ownership. If a legacy cleanup automation exists,
retire it only after verifying the exact owning task, worktree, and stack so it cannot later stop a retained or reused
runtime. A guarded stop releases only runtime artifacts; a numbered worktree keeps its shared stack reservation while it
exists, including across later task turns. Stop and export the stack only when Ethan explicitly asks or immediately
before removing its worktree, using the guarded sequence below. Release the reservation only after Git removes that
exact worktree. (Codex tasks: 01a05301-5376-77b1-9c70-99e37245cc98,
01a05ebf-a8f9-7f83-a325-1565cf6005a7)

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

Stop and close the agent-owned nonzero stack only when Ethan explicitly asks or immediately before removing its
worktree. Never stop it merely because a Computer Use session passed, failed, became blocked or interrupted, the task
turn ended, the stack became idle, or a manual-test session passed, failed, became partial, blocked, or interrupted.
A documented restart boundary may restart only the affected worktree process; otherwise close its exact test browser
page, keep the normal hot-reload processes running, and report their stack and URL. Worktree removal is blocked until
this whole sequence succeeds; the isolated launcher and Compose file live in the worktree, so never delete or move it
first. (Codex tasks: 01a04f3a-a977-7683-81aa-f1452cf39475, 01a05301-5376-77b1-9c70-99e37245cc98)

Perform cleanup as one bounded pass. Take one fresh ownership snapshot, run the recorded browser/native/backend
helpers in order, then take one final readback. The helpers and guarded backend commands already repeat their internal
safety checks; do not reread unchanged references, search historical task or process logs, or restart the whole
preflight between successful steps. Recheck only the boundary that failed or changed—for example, when the tracked
Safari window acquired another task's tab. (Codex task: 01a0399b-e199-79d2-b4ec-a32664b00adf)

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

Require `Verified the private Firebase export completed.` when Firebase reached readiness, followed by `Dev stack N
stopped runtime released; persistent volumes preserved.` and the final guarded-stop confirmation. For a numbered worktree,
the final confirmation must also say that `N` remains reserved until worktree removal; only the post-removal
`npm run aimvs-worktree -- release --dev-stack-index=N` makes it assignable to another worktree. A container that
failed before readiness instead prints `Firebase never became ready; no private export was required.` so its last good
snapshot remains intact. The command removes only exact stopped runtime containers and its empty network, then proves
that every current and recovery volume has the same identity. An already-stopped Firebase container that reached
readiness is safe only when its latest lifecycle has a clean exit and verified export-on-exit; a container that never
existed needs no export. If export verification fails, any indexed port remains live, a container is running, or
ownership/topology is ambiguous, stop cleanup and keep every artifact. Never bypass the command with raw `docker
stop`, `docker compose down`, pruning, reseeding, or volume deletion. (Codex tasks:
019ff0c1-80ad-79f3-9d60-cbb4004bf608, 01a024c0-a524-7960-a57e-f9fa68536e4c,
01a05ebf-a8f9-7f83-a325-1565cf6005a7)

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
