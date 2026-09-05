# Dev-stack lifecycle

## Contents

- [Ports per stack](#ports-per-stack)
- [Ethan's main environment](#ethans-main-environment)
- [Run an agent-owned stack](#run-an-agent-owned-stack)
- [Retain an agent-owned stack after testing](#retain-an-agent-owned-stack-after-testing)
- [Schedule an explicitly requested timed cleanup](#schedule-an-explicitly-requested-timed-cleanup)
- [Mandatory live-stack health gates](#mandatory-live-stack-health-gates)
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

   First distinguish an already-running owned stack from a stopped runtime. If the reserved index's containers,
   mounts, recorded worktree, and ports prove that its private backend is already healthy and belongs to this task,
   retain it and start only missing native roles. Do not call backend `start`, demand an empty network, or stop
   healthy containers merely to attach new command sessions. A foreign or ambiguous running owner still blocks
   launch. (Codex task: 01a06eec-07f7-7aa1-a498-15f6334e4b91)

   Before starting a stopped reserved runtime or reusing a legacy stopped runtime, verify its containers are stopped, its exact network is empty, and every current and
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

3. **Start or retain the stack's private backend.** Every nonzero stack owns isolated Functions, Firestore, Storage,
   MinIO, and Download Assets Worker containers. When the exact owned backend is already healthy, skip its start
   command. Otherwise use the guarded start below before native processes. Step 4 explains the separate native
   sessions and required ordering; do not run these long-lived commands sequentially in one blocking shell:

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

   Use three separate tool-managed long-running sessions: API watcher, standalone API server, and frontend.
   A visible integrated terminal is optional, not a startup requirement. In Codex, launch each command through
   `exec_command` with `tty: true`, the exact worktree `workdir`, and a short initial yield. Keep each returned
   `session_id` and continue it with `write_stdin`; returning a session ID is not proof of build/startup success.
   Other hosts use their equivalent controllable long-running command facility. Do not background commands with
   `&`, discard their handles, or replace the existing API supervisor with a new wrapper. (Codex task:
   01a06eec-07f7-7aa1-a498-15f6334e4b91)

   Start `watch:api` first and wait for its initial successful development build before starting the API server.
   The launcher already performs that prebuild; a second manual build is unnecessary when its success is verified.
   Start the frontend in its own session, or reuse its already healthy owned process. Use the same
   `NX_WORKSPACE_DATA_DIRECTORY=.nx/workspace-data-stack-N` on all three commands.

   Keep each role's session handle, launcher/child PIDs, exact worktree, and stack index in the task's live context
   and continuation handoff, not in committed skill files or a new registry. Read output with empty
   `write_stdin` calls; bound each wait so progress updates remain possible. Prove command input and shutdown using
   a disposable shell when needed; never type shell commands into a foreground dev server.

   These are background command sessions, not hidden integrated-terminal panels. Do not pass a generic exec
   `session_id` to `open_in_codex` and treat a queued or blank panel as successful attachment. Prefer an actually
   supported visible view only when it can show the same controlled session without restarting the stack; otherwise
   continue in the background. Survival across ordinary tool yields is verified, but survival across app quit,
   agent-runtime restart, or machine sleep is not guaranteed. Say so rather than claiming permanent persistence.

   On continuation, read the saved sessions and recheck their exact process ownership and listeners before reusing
   or starting anything. If a session handle is lost, inspect the recorded launcher/child PIDs, commands, worktree
   paths, and reserved index: a lost handle does not prove the processes stopped. Never launch a duplicate stack.
   Restart only a proven task-owned process when necessary and authorized; preserve a healthy process in its existing
   terminal unless Ethan requests migration. Do not migrate other tasks or stack 0 merely to apply this default.

   For explicitly requested standalone terminals or an existing iTerm-owned stack, follow
   [standalone terminal control](standalone-terminals.md). A denied native-app control route is not a denial of normal
   shell execution; use the supported command tools for the already-authorized stack operation, without bypassing
   the denied app's control boundary.

   For an existing stack, reuse its exact owned command session. A source fix that requires a frontend-process
   restart includes that restart within the already-authorized repair: after ownership checks, restart only that
   frontend session and verify the new process serves the changed bundle. Do not ask Ethan to repeat restart approval,
   restart the API/backend unnecessarily, or treat a browser refresh as a plugin reload. Source HMR does not reload
   the running Node process's build-plugin implementation. If control is genuinely blocked, report that precise
   blocker without calling the repair complete. (Codex task: 01a06eec-07f7-7aa1-a498-15f6334e4b91)

   Commands for the three separate long-running sessions (replace the example index 1 consistently):

   ```bash
   NX_WORKSPACE_DATA_DIRECTORY=.nx/workspace-data-stack-1 npm run watch:api -- --dev-stack-index=1                 # build + watch the API
   NX_WORKSPACE_DATA_DIRECTORY=.nx/workspace-data-stack-1 npm run serve:api:standalone:debug -- --dev-stack-index=1 # standalone API on :3001, inspector :9231
   NX_WORKSPACE_DATA_DIRECTORY=.nx/workspace-data-stack-1 npm run serve:frontend:standalone-server -- --dev-stack-index=1 # frontend on :4201
   ```

   Waiting for the API watcher's initial build is intentional: starting the standalone API before `dist/apps/api`
   exists reproduces `Error: spawn node ENOENT`. The initial successful build supplies its current runnable artifact.

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
   the exact role/session/process mapping in the task handoff and do not create an idle-cleanup automation merely because the
   stack remains active. (Codex tasks: 01a04f3a-a977-7683-81aa-f1452cf39475,
   01a05301-5376-77b1-9c70-99e37245cc98)

## Retain an agent-owned stack after testing

The end of a manual test or task turn does not authorize stopping a healthy nonzero stack. Close and verify only the
exact task-owned browser page, then confirm the retained sessions, worktree path, indexed ports, and private containers
still match the owning worktree before handing the running stack back to Ethan. Preserve the exact role/session/PID
mapping in the continuation context and include the stack index and frontend URL in the completion handoff. A visible
window ID is relevant only to an existing standalone terminal; do not invent one for background sessions.

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

## Mandatory live-stack health gates

Before the first browser or Computer Use action for a worktree, and again after any relevant source change or
process restart, inspect current output from that worktree's three exact retained command sessions (or its existing
standalone terminal sessions without raising their window). Require API-watch, API-server, and frontend ownership to
match the exact worktree and the same nonzero `--dev-stack-index=N`; the indexed Worker remains a private container.
If a historical session handle is unavailable, verify current process ancestry and fresh build markers/logs without
claiming that its terminal is attached or starting a duplicate. Then verify all of the following from their latest/current runs:

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
while an error remains; report a blocker if it cannot be fixed safely. Apply repair actions only within an authorized
start, fix, or migration request; a read-only status question calls for inspection and an accurate report, not an
automatic restart. Historical output from before a later verified
restart/build does not itself fail the gate, but never use that distinction to dismiss an error still affecting the
current run.

Apply the same complete gate after the final relevant source or configuration edit and before every completion or
handoff that retains a running stack, even when no browser test was requested. The latest successful frontend and API
builds must have processed that final edit; an earlier success followed by a failure is an unhealthy stale stack.
Repair every in-scope current-run build or runtime error before finishing. Do not use a process restart to conceal
source that still fails to compile. If an unrelated or ambiguous concurrent edit prevents safe repair, preserve its
Git boundaries, report the exact blocking error and owner when known, and leave the task explicitly blocked rather
than calling the stack healthy. (Codex task: 01a062c9-ac08-7d71-b8ae-2e831291d7e3)

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

Stop each background role through its exact retained session handle: send Ctrl-C with `write_stdin`, wait for the
session to exit, and verify the recorded launcher/child processes plus ports `4200 + N`, `3000 + N`,
`9230 + N`, and `9476 + N` are gone. A finished tool session alone does not prove all descendants stopped.
If a handle is unavailable or a child survives, freshly verify that exact PID's command, worktree, stack role,
and recorded ancestry before a bounded graceful signal to that process. Never use broad process-name or port kills,
close unrelated sessions, or stop stack 0. If ownership is ambiguous, stop and report it.

For an existing iTerm stack, follow [standalone terminal cleanup](standalone-terminals.md#close-an-existing-iterm-stack)
instead. Native-process migration stops only the roles being moved, proves their old owners exited, starts one
replacement per role, and repeats the live-stack health gate; it does not stop or export the private backend.
Run the stack's guarded backend stop only after the native ports are closed:

```bash
npm run isolated-backend -- stop --dev-stack-index="$STACK_INDEX"
```

For a running Firebase container that reached readiness, require either `Verified the private Firebase export
completed.` or the explicit warning that export-on-exit was not verified and the latest unexported dev writes may be
missing. Then require `Dev stack N stopped runtime released; persistent volumes preserved.` and the final guarded-stop
confirmation. For a numbered worktree, the final confirmation must also say that `N` remains reserved until worktree
removal; only the post-removal
`npm run aimvs-worktree -- release --dev-stack-index=N` makes it assignable to another worktree. A container that
failed before readiness instead prints `Firebase never became ready; no private export was required.` so its last good
snapshot remains intact. The command removes only exact stopped runtime containers and its empty network, then proves
that every current and recovery volume has the same identity. Guarded stop always attempts and verifies export-on-exit,
but a failed or crash-missed export is best-effort dev-data loss rather than permanent quarantine: warn that the latest
unexported writes may be missing, reuse the last preserved snapshot, and remove only exact dead runtime artifacts while
keeping every persistent volume. If any indexed port remains live, a container is running, the dataset is incomplete,
or ownership/topology is ambiguous, stop cleanup and keep every artifact. Never bypass the command with raw `docker
stop`, `docker compose down`, pruning, reseeding, or volume deletion. (Codex tasks:
019ff0c1-80ad-79f3-9d60-cbb4004bf608, 01a024c0-a524-7960-a57e-f9fa68536e4c,
01a05ebf-a8f9-7f83-a325-1565cf6005a7, 01a067e4-975c-7c71-b393-b27d66080bd9)

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
