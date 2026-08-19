# Emulator safety and recovery

## Contents

- [Durable recovery memory](#durable-recovery-memory)
- [Shared emulator ownership](#shared-emulator-ownership)
- [Main periodic and one-shot exporter ownership](#main-periodic-and-one-shot-exporter-ownership)
- [Host memory and swap contention](#host-memory-and-swap-contention)
- [Firestore performance diagnostics](#firestore-performance-diagnostics)
- [Persisted data and object drift](#persisted-data-and-object-drift)
- [Storage customTime limitation](#storage-customtime-limitation)
- [Firestore WebChannel wedge recovery](#firestore-webchannel-wedge-recovery)
- [Container-isolated emulator experiments](#container-isolated-emulator-experiments)
- [Worktrees that change emulator triggers](#worktrees-that-change-emulator-triggers)
- [Shared Storage emulator export failures](#shared-storage-emulator-export-failures)

## Durable recovery memory

Treat this reference as the durable memory for AIMVS emulator failures and recovery. Before changing emulator
processes or data, search the relevant section for matching symptoms. After a recovery verifies a reusable symptom,
cause, diagnostic, recovery step, or prevention rule, update the closest section in the same task. Keep the guidance
procedural and current rather than adding a separate dated incident log; do not record guesses, credentials, signed
URLs, private object contents, transient PIDs, or large raw logs.

## Shared emulator ownership

By default, run several worktrees' frontend + standalone API at once, all sharing one Firebase emulator stack. Each
worktree runs on a "dev stack index" `N` that offsets every port by `N`, so stack 1's frontend is `:4201`,
stack 2's is `:4202`, etc. This lets you test different branches side by side in different browsers.

This works because we assume worktrees rarely change Firestore/Storage triggers, so the one shared emulator
is fine for all of them. If a worktree changes Functions, Firestore, or Storage trigger behavior, use the exclusive
emulator workflow below instead of the shared emulator.

Starting `serve:emulators` restores AIMVS's intentional single-emulator behavior: it runs `teardown-emulators` first,
which stops Firebase processes and the standard emulator ports globally, then starts the requested checkout's suite.
Coordinate exclusive ownership before starting it because every stack using the current shared emulator is interrupted.
The refusal-only teardown and multi-emulator ownership framework were tried and explicitly rejected in favor of this
original behavior. (Codex task: 019faf46-16ac-7a90-b650-e988a2e6a505)

Node-side wiring lives in `apps/frontend/plugins/dev-stack-config.cjs` (pure config) and `tools/scripts/run-dev-stack.cjs`
(the CLI the npm scripts call). In ordinary shared-emulator mode, `--dev-stack-index=N` on any script is the only
knob needed to keep that worktree's frontend and standalone API paired.

## Main periodic and one-shot exporter ownership

Main's Restore Terminals deliberately owns one periodic Firebase exporter that snapshots the shared backend every 30
minutes for crash recovery. Firebase Tools rewrites the whole combined export, including every Storage object, so
correlate its actual run window before attributing a slowdown and never start another copy from a linked worktree or
isolated backend. Before an authorized manual stop or restart of the shared backend, still run `npm run
export-emulator-data` once from the primary main worktree and require Firebase's own `Export complete` output. This
keeps main's original one-line export command; the separate TypeScript wrapper was rejected as unnecessary divergence
and must not be reintroduced. An ordinary nonzero frontend/API stack does not own or stop the shared backend, so closing
it must not export shared data. (Codex task: 019ff0c1-80ad-79f3-9d60-cbb4004bf608)

For an isolated backend, `npm run isolated-backend -- export --dev-stack-index=N` writes one private snapshot without
stopping. Its guarded `stop` command already persists and verifies the private snapshot through Firebase's clean
shutdown path. Never point either command at main's canonical directory or merge isolated data back into main.

Treat a user-authorized fresh shared-dataset reset as a preservation operation, not ordinary slowness cleanup. Stop the
verified main periodic exporter, run `npm run export-emulator-data`, record representative Firestore collection counts
and the Storage object count, copy the complete canonical export to a unique ignored backup, and verify its file count
and metadata hashes before stopping the owning stack-0 terminal cleanly. Preserve the final export-on-exit snapshot
separately, create an empty canonical `emulator-export-data` directory, and rerun the normal command in that same
terminal. Require Firebase Tools to report that it skipped the missing import metadata, then prove all three emulators
are ready, Firestore has no root collections, and Storage has no objects. Large persisted Storage bytes make full
exports expensive but do not by themselves slow idle Firestore document reads; use the fresh dataset as a controlled
comparison, not proof of causality. Never reset shared data without Ethan explicitly authorizing that exact reset.
(Codex task: 019ff0c1-80ad-79f3-9d60-cbb4004bf608)

If the wrong live dataset has already overwritten the canonical export, stop the verified main periodic exporter first,
export the current live state to a uniquely named recovery directory, stop the wrong emulator cleanly, and verify its
ports close. Move the overwritten canonical export to a separate preservation path before restoring a known-good
snapshot. Restart the
emulators from main, then use the Admin SDK with project id `ai-music-video-studio-staging` to verify the affected
Channel, private Channel, collaborator, Assets, and Projects instead of trusting open ports alone. Only then run one
verified canonical export. Never delete or reuse either recovery copy during
the restore.

If the hub is gone but an orphan Firestore Java process still owns `:8080`, the Firebase CLI cannot export it. After
stopping the verified main periodic exporter, call Firestore's `/emulator/v1/projects/<project-id>:export` endpoint with a unique
`export_directory` and `export_name`, verify the resulting overall-export metadata, then stop only that verified
orphan PID. Preserve the canonical export separately before restoring main; an open Firestore port alone is not a
healthy shared emulator.

Never edit `serve-emulators.sh` while an invocation of that script is still running. In a verified failure, the file
grew by 40 bytes while Bash was waiting for Firebase; after Firebase exited, Bash resumed at the old end-of-file offset
and executed the newly exposed `ort-on-exit="$EMULATOR_EXPORT_DATA_DIR"` suffix as a separate command. Stop the owning
terminal before changing the script, or treat the edit as applying only to the next launch. If this suffix error occurs,
check for an orphan Firestore process on `:8080` before retrying startup.

Preserve npm's `node_modules/.bin` symlinks when freezing the Functions build. On macOS, lowercase `cp -r` dereferences
`node_modules/.bin/firebase-functions` into a regular file, so its relative `../_virtual/rolldown_runtime.js` import
resolves from `.bin` and Functions discovery fails. Use `cp -R`; if this error returns, compare `ls -l` and `readlink`
for the source and copied binaries before restarting the shared emulators.

## Host memory and swap contention

When emulator document reads are slow but repeated Admin or REST reads become fast and current logs show no lock or
transport failures, measure host paging before blaming Firestore. Several concurrent dev stacks can keep multi-gigabyte
frontend compiler working sets compressed while the Firestore JVM itself has hundreds of megabytes swapped out. Check
`vm.swapusage`, `memory_pressure`, a short `iostat` sample, `top` with `mem`, `cmprs`, and `pageins`, and
`vmmap -summary <firestore-pid>`. High used-swap alone is historical state, not proof of active contention; require
coincident page-ins, disk or system-CPU pressure, and a slow server-side read while the symptom is happening. Warm one
persistent Admin client before timing queries because its first request includes gRPC channel setup; do not report that
setup time as Firestore cold-read latency. Compare repeated real reads without printing document data, and treat a fast
control window with similar swap use as evidence against swap being the direct on/off cause.

Treat export load as a separate timing question. Split the snapshot with
`du -sh emulator-export-data/firestore_export emulator-export-data/storage_export` before describing its size because
Storage blobs can account for nearly all bytes. Correlate the actual `firebase emulators:export` child, canonical metadata
mtime, Firestore CPU and resident-memory change, and the complaint window. A completed short export can add a brief spike
and leave more pages compressed or swapped, but it does not explain continuous slowness outside the export window.

If warm reads are fast, the live JVM has no `BLOCKED` threads, and socket queues are empty, prefer a coordinated clean
shutdown of verified unused nonzero stacks and their exact task-owned browser pages over restarting the shared emulator.
Do not kill Nx daemons individually or close browser pages until their owning worktree and active task are verified.

Treat every report of a slow emulator as authorization to sweep for orphaned or zombie AIMVS dev processes before
blaming Firestore or restarting it. Compare duplicate commands, working directories, parent/child trees, TTY and stream
state, terminal/task ownership, listening ports, and CPU-time deltas. A true `Z` zombie is already dead, uses no CPU, and
cannot be killed; leave it alone unless its parent is independently proven orphaned. An active process is proven orphaned
only when it is detached from its dead terminal or parent, owns no listener, has no useful live child, has no active task
owner, and the real serving process is separately identified. Do not ask Ethan for permission once every check proves
that ownership boundary: verify the exact PID again, stop only the orphan with `INT`, then `TERM`, and use `KILL` only if
both softer signals fail and it still satisfies every orphan check. Recheck every live emulator, API, frontend, MinIO,
and Worker port plus a warmed Firestore control afterward; continue diagnosing if the symptom remains. If any ownership
check is ambiguous, preserve the process and report the blocker. Never restart Firestore, MinIO, or the real Worker merely
to remove an orphan. The verified download-Worker wrappers that motivated this rule survived under PID 1 with revoked
streams, no listener, and one CPU core each. (Codex task: 019fe10d-0cee-7192-a8d9-19bdf0ba7666)

Do not fingerprint an AIMVS worktree with an unrestricted `find .` followed by one `git ls-files` process per file. That
walk includes large ignored dependency, build, diagnostics, and emulator-export trees and can sustain tens of thousands
of disk operations per second while every local stack becomes sluggish. Use scoped Git-native queries such as
`git status --porcelain=v1 --untracked-files=all` or `git ls-files --others --exclude-standard` instead.

Multiple idle browser sockets are not proof of Firestore contention. When the Firebase Emulator UI feels slow but an
owner-authorized REST or warmed Admin read of the same collection is fast, verify that the UI route still names an
existing document after the last import, then capture the slow request in browser DevTools. `Queueing` or `Stalled`
time isolates the browser connection pool; `Waiting (TTFB)` only implicates the emulator when a simultaneous warmed
server-side control read is also slow.

## Firestore performance diagnostics

The 30-second Firestore lock-timeout JAR patch is deliberately manual opt-in. Normal `postinstall` must not run
`patch:firestore-emulator`; keep Firebase's stock 2-second JAR for ordinary development and use the patch command only
for a controlled comparison. Older worktrees can still contain the stale lifecycle patch and every worktree writes to
the same Firebase JAR cache, so the normal emulator launcher verifies the official SHA-256 and atomically restores the
verified `.orig` before startup. Replacing the cached JAR does not change an already-running emulator JVM, so restart
only through the verified owning terminal when Ethan authorizes that stack-0 action.

The normal `serve:emulators` and `serve:emulators:standalone-server` commands enable the feature-flagged Firestore
OpenTelemetry launcher for the next start without rewriting the Firebase emulator JAR. Set
`AIMVS_FIRESTORE_DIAGNOSTICS=0` before either npm command only when a clean no-agent comparison is required. The Java
agent adds some measurement overhead, so use the disabled comparison if the diagnostic run itself becomes suspect.

Each emulator session writes sanitized NDJSON spans under `firestore-diagnostics/`. The receiver retains method names,
durations, trace/span correlation, status, process ID, and a small allow-list of protocol/thread attributes; it omits
request bodies, document values, document IDs, and document paths. Old session files are pruned after 24 hours while
the launcher is running, and each session stops writing after 1 GiB. The pinned agent/API downloads live under
`.firebase/firestore-diagnostics/`, while a small supported agent extension re-allows only the four selected classes that
OpenTelemetry otherwise excludes through its broad `com.google.cloud.*` performance ignore. A small bootstrap agent
keeps the full OpenTelemetry runtime out of the Storage rules JVM even though Firebase passes `JAVA_TOOL_OPTIONS` to
both Java children, and startup fails visibly if an emulator upgrade removes any selected class or method.

Use trace IDs to compare the outer Firestore gRPC request with selected internal spans. A long
`ReactiveLockManager.acquireLocks` span is direct lock-wait evidence; a long `FirestoreEmulatorQueryExecutor.performScans`
span points at query scanning; a long `ListenStreamManager.notifyQueryListeners` span points at listener fan-out. If
the recorded gRPC and internal spans stay fast while the UI is slow, continue with browser/WebChannel, standalone API,
frontend rendering, and host-pressure controls instead of attributing the pause to emulator locking.

## Persisted data and object drift

Shared emulator ownership does not isolate stored data from worktree behavior. A worktree can write a newer document
or storage-path shape that main does not understand, then leave main failing after that worktree's stack stops even
though every listener still belongs to the correct checkout. When main breaks after another stack's test, verify the
affected emulator fields and object paths against both code versions before restarting processes; use disposable test
data or restore compatible data when the worktree intentionally changes a persisted shape.

Do not confuse stale persisted data with stale emulator code. Moving source hunks into main and restarting the emulator
can update the running Functions or Rules code, but it cannot repair incompatible Firestore documents or Storage
objects. Inspect and narrowly repair or replace only task-owned incompatible fixtures when the stored shape is the
problem; never restart or overwrite shared data merely because the UI and the active worktree disagree.

A Firebase CLI project alias and its resolved project ID can address distinct Firestore REST namespaces inside the
same emulator process. Before declaring a fixture repair complete, query the namespace named by the browser's Firebase
configuration as well as any CLI alias used to start the hub; hub/export success under the resolved project ID does not
prove that an alias-path REST write repaired the browser's data, or vice versa. Apply the narrow compatible repair to
every populated namespace that serves the shared dataset, then verify the browser-marked reload and canonical export.

If an unmerged profile-picture flow leaves a request-versioned object, copy the intended bytes to main's canonical
`profile-pic.webp` path, repoint only that channel, persist the emulator export, verify the canonical object, and remove
the temporary object; never broaden main's path validator merely to accept temporary shared-emulator data.

Firestore emulator exports and the persistent MinIO volume can also drift independently. A canonical Firestore export
can retain a request-versioned R2 pointer after a later profile-picture test deletes that superseded object, so every
reload repeats a signed-URL 404 and can make coalesced media loading look globally slow. For a local R2 `NotFound`,
compare the exact Firestore pointer with the bucket keys and retained test evidence; restore the proven matching object
or update only the stale emulator pointer to the newest surviving valid object instead of repeatedly restarting Java
or changing download authorization.

An apparently misleading frontend TypeError can also come from a persisted discriminator written by another
worktree, not from the named helper being missing. In one verified case, an experimental worktree wrote
`assetType: animatedImage` while main recognized image, video, and audio and represented animation as
`assetType: image` plus `isAnimatedImage: true`; the helper existed but its exhaustive switch returned no iterable
value. Before changing frontend code, enumerate the affected documents' discriminator values against the active
branch's types, then normalize only the incompatible emulator fixtures to that branch's schema.

## Storage customTime limitation

Firebase Tools 15.24.0 does not persist GCS `customTime` in the Storage emulator. Its metadata model can serialize the
field, but the upload/copy implementations omit it and metadata PATCH ignores it. When a temporary object has no
`customTime` locally, verify that production code supplies the field and that focused tests cover that call; only a
real staging GCS bucket can prove lifecycle expiry. Do not change working production lifecycle code to satisfy this
emulator gap, and print only selected metadata fields because the full object metadata contains a download token.

Do not use the Admin Storage SDK's server-side `copy()` to build disposable local fixtures without reading the
destination back. The emulator can resolve the call successfully without creating the destination object; this was
reproduced while preparing Asset-download failure/retry fixtures. For a small task-owned fixture, read the source
bytes with `download()`, write the exact destination with `save()`, and verify that destination before starting the
test. This is fixture setup only: never replace production copy behavior merely to satisfy the emulator.

## Firestore WebChannel wedge recovery

A stopped frontend does not stop its already-loaded browser page. Stale AIMVS pages from stopped stacks can keep
Firestore WebChannels connected to the shared emulator, and after the emulator reports
`too many pending messagings in the back channel (10001)`, `NETWORK_ERROR`, or transaction lock timeouts, those pages
can immediately reconnect and leave a freshly restarted emulator looking slow again.

Before restarting anything, compare the exact browser query with an Admin or authenticated emulator REST query. If the
same query returns quickly outside the browser while the page spinner remains, treat the browser WebChannel as wedged
instead of changing the query, indexes, rules, or asset data. Coordinate active tasks, stop their nonzero stacks, and
inventory every loaded AIMVS localhost page across the assigned browsers; a clear frontend port does not prove its page
is gone. Preserve the shared export and obtain explicit stack-0 authority before restarting the shared emulator.

If Chrome remains wedged after the emulator restart, close only verified stale agent-owned localhost pages from stopped
stacks, preserving the requested main page and every unrelated browser page. When the main page still holds the broken
transport, send the macOS heads-up and terminate only Chrome's
`--utility-sub-type=network.mojom.NetworkService` helper with `TERM`; Chrome recreates it without closing its windows.
Reconnect browser control to the same browser page, then prove recovery with three consecutive reloads measured until
the expected rows render and the progress bar disappears. Require no fresh WebChannel transport errors in the frontend
or Firestore logs. Never quit Chrome, close ambiguous/user-owned pages, delete emulator data, or call the issue fixed
from the HTML shell's load time alone.

## Container-isolated emulator experiments

Treat the opt-in full backend as isolated only when it has a unique Compose project, loopback-only host ports, a
nonzero dev-stack index, and private named volumes for Firebase and MinIO. It includes Functions built from that exact
worktree, Firestore, Firebase Storage, MinIO, and the Download Assets Worker; real staging Firebase Auth stays shared
and the normal App Check debug-token setup is reused. A new frontend port is a separate browser origin and can require
one normal sign-in the first time; backend restarts must not replace Auth with private emulator state. The frontend and
hot-reloading standalone API remain native. Its first launch may use a read-only canonical seed or empty data, but
every later launch must prefer that stack's private Firebase export and existing MinIO volume regardless of the
requested seed. Persist writes only inside those volumes; never merge datasets or let an isolated stack export into
the shared canonical directory.
Real Auth and browser storage can outlive a private dataset reset, so an origin can remember a Channel ID that the new
Firestore no longer contains. The verified symptom is `403 Not collaborator of channel` plus a Rules null-value error
on the signed-in user's own missing collaborator read. This is dev-only reset state: production collaborator removal
keeps the document with Removed status, so never add a missing-document Rules allowance or silently treat absence as
normal removal. Keep Auth and App Check intact; remove only `channelIdLoggedIn` and `userIdForLoggedInChannel` from that
origin's sessionStorage and localStorage, reload, and require the current private dataset's active Channel, a fresh
`dateLastLoggedIn`, and no fresh permission errors. Do not clear all localhost site data or create a fake Channel with
the old ID. (Codex task: 019ff0c1-80ad-79f3-9d60-cbb4004bf608)
For an empty isolated dataset, create the Channel with its final `Dev Stack N` name before its default profile picture is
generated, and give every stack its own Channel, active collaborator, and picture object. Do not create a placeholder
AOEU Channel and rename its Firestore document afterward: the picture generator seeds the color and initial from the
name at render time, while a later rename deliberately does not regenerate that object. If a test setup already did
this, use the normal Channel Settings remove-and-save flow once after the final rename, then require a new versioned
profile-picture path and visually distinct rendered picture on that stack's Assets page. (Codex task:
019ff0c1-80ad-79f3-9d60-cbb4004bf608)
Separate containers let the host schedule backend processes across cores, but do not promise faster single-request
Firestore execution and add real CPU/RAM load.

Docker Desktop's CPU setting is a ceiling, its memory setting controls the RAM visible to the shared Linux VM rather
than permanently pinning that many host bytes, and its disk setting is only the maximum sparse-image size. Current
Docker Desktop releases return freed container memory to macOS, but a running VM can still use or cache memory up to
that limit. Stopped isolated containers use no CPU or RAM, but their private named volumes still use disk. Main's
continuously running `aimvs-minio` container also prevents Docker Resource Saver from stopping that VM, even when every
isolated backend is stopped. During host slowness, compare the current Docker Desktop settings, VM/guest memory,
`docker stats`, and running-container inventory before attributing the configured maximum to one isolated stack. Never
stop main MinIO or apply a lower global memory setting without Ethan's approval because both interrupt every stack that
uses the shared backend. (Codex task: 019ff0c1-80ad-79f3-9d60-cbb4004bf608)

Use the standalone API's normal host cache as the single GCP-secret source for isolated Functions. Before Docker starts,
the host launcher must reuse that loader so a missing cache is populated through the Mac's existing Google
authentication, then write an ignored stack-specific Functions `.secret.local` containing only `API_TOKEN` and mount
that prepared file read-only. If the cache lacks `API_TOKEN`, force one host refresh before failing so an unsuccessful
initial fetch cannot poison every later start. Never mount host Google credentials, the mixed repo-root `.secret.local`, or the complete
cache into Docker: Firebase rejects the root file's reserved `FIREBASE_APPCHECK_DEBUG_TOKEN`, while copying every other
entry would expose test-login credentials to Functions. Verify secret availability through presence or behavior without
printing values. After changing the preparation or its Compose wiring, run
`TS_NODE_PROJECT=tools/scripts/tsconfig.json node --test -r ts-node/register -r tsconfig-paths/register tools/scripts/prepare-isolated-functions-secrets.spec.ts`.
(Codex task: 019ff0c1-80ad-79f3-9d60-cbb4004bf608)

Mount the persistent volume at a parent such as `/data` and give Firebase a replaceable child such as `/data/export`.
Firebase removes and recreates its export directory; pointing `--export-on-exit` at the volume mount itself fails with
`EBUSY`. Run Firebase and one-shot exports from another directory on that same volume, such as `/data/runtime`, because
Firebase stages the whole snapshot under its current working directory before replacing `/data/export`; a container-
layer working directory turns the swap into a second multi-gigabyte cross-filesystem copy. When a staging directory
remains, name and preserve it: continue from `/data/export` only when that prior snapshot still has valid metadata,
otherwise refuse startup instead of silently reseeding. Persist readiness from the successful healthcheck in the
private volume rather than inferring it later from rotatable Docker logs. Set the container stop signal to `SIGINT` and
allow enough grace time for the export because Firebase CLI's clean shutdown path is tied to Ctrl-C. After every ready-
state stop, require Firebase's own `Export complete` log line and reject `Export failed`; Docker can report that the
container stopped successfully even when Firebase lost the snapshot. A container that never reached readiness was
never handed off as a supported writable stack; keep its last good snapshot and clean it up through guarded stop.
(Codex task: 019ff0c1-80ad-79f3-9d60-cbb4004bf608)

## Worktrees that change emulator triggers

The frontend and standalone API use the standard emulator ports by default. An explicitly started full isolated
backend safely owns that worktree's Functions triggers and private data. If the worktree is using the ordinary shared
backend instead, a trigger-changing worktree still cannot run its full behavior concurrently with the shared main
emulator; isolate it in time while keeping the same ports:

1. Confirm the worktree actually changes Functions, Firestore, or Storage trigger behavior. Do not take exclusive
   emulator ownership for ordinary frontend or standalone API changes.
2. Resolve the live emulator process's command, checkout, owning VS Code terminal tab, and import/export paths. Inspect
   the worktree and primary main checkout's staged, unstaged, and untracked state before changing either; open ports or
   an old successful log line do not prove which source the current emulator loaded.
3. Move only the exact source hunks the emulator needs from the worktree into the primary main checkout as unstaged,
   uncommitted changes. Preserve every pre-existing main staged, unstaged, and untracked boundary exactly; never stage,
   commit, overwrite an overlapping change, or copy unrelated frontend, standalone-API, test, or cleanup hunks. Stop for
   Ethan's decision if the required hunk overlaps existing main work or cannot be transferred exactly.
4. Ask Ethan before stopping the shared emulator because every running AIMVS stack depends on it. Do not continue until
   he confirms that the other stacks can be interrupted and explicitly authorizes operating the exact stack-0 emulator
   terminal.
5. In the same shell in the same main VS Code terminal tab that already owns the emulator, stop the current command,
   verify ports `5001`, `8080`, and `9199` are free, then rerun the emulator command there. Do not start it from a new
   shell, another terminal tab or app, Restore Terminals, a linked worktree, or a blanket teardown. Reusing the owning
   shell preserves its verified checkout, environment, canonical import/export paths, and visible process ownership.
6. Verify the new emulator run reports the primary main checkout and canonical `emulator-export-data`, loaded the
   transferred source, started without unresolved errors, and owns the expected ports. Then repeat the manual-test
   health gate before using the browser.
7. Run and test only the authorized worktree against this temporarily refreshed shared emulator session. Leave the
   transferred main hunks unstaged and uncommitted for Ethan to review; do not silently remove, stage, or commit them
   after testing.

## Shared Storage emulator export failures

If stopping or restarting the shared emulator fails with `ENOENT` for
`firebase/storage/blobs/<uuid>` while exporting Storage, inspect `firebase-debug.log` before changing rules or
discarding emulator data. Firebase Tools can yield between reading its live file map and copying each blob, so an
ordinary delete or replacement request can remove the source file halfway through the snapshot. That race is not
evidence that a rules-codegen worktree changed the running emulator; verify the emulator command's checkout and
loaded rules paths separately before attributing the failure to another worktree.

Firebase Tools still has this narrow live-delete export race, but AIMVS deliberately does not patch the export loop:
making a multi-gigabyte snapshot synchronous blocks ordinary Storage requests for the whole copy. The normal
`postinstall` patch keeps only the larger Storage upload-body limit and actively restores any legacy server/export
patches left in `node_modules`. Run the focused regression with `TS_NODE_PROJECT=tools/scripts/tsconfig.json node --test
-r ts-node/register tools/scripts/patch-storage-emulator.spec.ts` after changing this patch or upgrading Firebase
Tools. Restart only through the terminal that owns the shared emulator. If an export hits `ENOENT`, preserve the live
state and logs and retry only after stopping concurrent Storage mutations; do not delete the shared export as a first
response because that hides the race and loses reusable local state.

Do not run `npm run rules:test` locally while the shared Storage emulator is listening on `:9199`. The script checks
that port before generating rules and exits if it is occupied. Normal dev-stack startup, `npm test`, local Git hooks,
and Firebase predeploy do not invoke this suite; the deploy workflow runs it on an isolated GitHub Actions host. The
test config uses separate ports, but Firebase Tools 15.24.0 stores every local Storage emulator's live blobs in the
same user-global temporary directory. When the short-lived test emulator stops, it removes that directory, so the
shared emulator keeps stale in-memory metadata and can exit with `ENOENT` on the next asset read. Distinct ports do
not isolate Storage persistence, and the repository patch above fixes only the separate live-export race. If the
guard reports a conflict, stop and report it instead of running the suite or stopping Ethan's emulator. After a
collision, treat the shared stack as unhealthy and preserve its export; restart it only with Ethan's explicit
authorization.
