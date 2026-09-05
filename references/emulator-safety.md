# Emulator safety and recovery

## Contents

- [Durable recovery memory](#durable-recovery-memory)
- [Backend isolation and stack 0 ownership](#backend-isolation-and-stack-0-ownership)
- [Main periodic and one-shot exporter ownership](#main-periodic-and-one-shot-exporter-ownership)
- [Host memory and swap contention](#host-memory-and-swap-contention)
- [Firestore performance diagnostics](#firestore-performance-diagnostics)
- [Persisted data and object drift](#persisted-data-and-object-drift)
- [Storage customTime limitation](#storage-customtime-limitation)
- [Firestore WebChannel wedge recovery](#firestore-webchannel-wedge-recovery)
- [Nonzero isolated backends](#nonzero-isolated-backends)
- [Worktrees that change emulator triggers](#worktrees-that-change-emulator-triggers)
- [Shared Storage emulator export failures](#shared-storage-emulator-export-failures)

## Durable recovery memory

Treat this reference as the durable memory for AIMVS emulator failures and recovery. Before changing emulator
processes or data, search the relevant section for matching symptoms. After a recovery verifies a reusable symptom,
cause, diagnostic, recovery step, or prevention rule, update the closest section in the same task. Keep the guidance
procedural and current rather than adding a separate dated incident log; do not record guesses, credentials, signed
URLs, private object contents, transient PIDs, or large raw logs.

## Backend isolation and stack 0 ownership

Stack 0 is Ethan's main VS Code environment and owns the native main Firebase, Storage, MinIO, and Download Assets
Worker services. Every nonzero dev stack uses its own indexed native frontend/API processes and its own Docker Compose
backend containing Functions, Firestore, Storage, MinIO, and the Worker. Real staging Auth remains shared. The stack
index is the only backend-mode source of truth; never point a nonzero stack at stack 0 or add back the removed
per-command isolation flag. (Codex task: 019fe10d-0cee-7192-a8d9-19bdf0ba7666)

Starting `serve:emulators` restores AIMVS's intentional single-emulator behavior: it runs `teardown-emulators` first,
which stops Firebase processes and the standard emulator ports globally, then starts the requested checkout's suite.
Use it only for Ethan-authorized stack-0 work; nonzero stacks use `npm run isolated-backend` instead. Coordinate
exclusive ownership before starting it because it interrupts stack 0.
The refusal-only teardown and multi-emulator ownership framework were tried and explicitly rejected in favor of this
original behavior. (Codex task: 019faf46-16ac-7a90-b650-e988a2e6a505)

Node-side wiring lives in `apps/frontend/plugins/dev-stack-config.cjs` (pure config) and `tools/scripts/run-dev-stack.cjs`
(the CLI the npm scripts call). `--dev-stack-index=N` pairs every native process with that index's private backend;
native startup refuses a nonzero stack whose matching containers are absent.

## Main periodic and one-shot exporter ownership

Main's Restore Terminals deliberately owns one periodic Firebase exporter that snapshots the shared backend every 30
minutes for crash recovery. Firebase Tools rewrites the whole combined export, including every Storage object, so
correlate its actual run window before attributing a slowdown and never start another copy from a linked worktree or
isolated backend. Before an authorized manual stop or restart of the shared backend, still run `npm run
export-emulator-data` once from the primary main worktree and require Firebase's own `Export complete` output. This
keeps main's original one-line export command; the separate TypeScript wrapper was rejected as unnecessary divergence
and must not be reintroduced. Nonzero stacks never export this dataset; their guarded stop exports only their private
snapshot. (Codex tasks: 019ff0c1-80ad-79f3-9d60-cbb4004bf608,
019fe10d-0cee-7192-a8d9-19bdf0ba7666)

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
`export_directory` and `export_name`, plus `database` set to
`projects/<project-id>/databases/(default)`; omitting the database makes emulator 1.21 reject the request before writing
anything. Verify the resulting overall-export metadata, then stop only that verified orphan PID. Preserve the canonical
export separately before restoring main; an open Firestore port alone is not a healthy shared emulator. (Codex task:
01a038c3-e59b-7112-8252-861c13623017)

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
`npm install` updates Firebase Tools but does not download a newly selected Firestore emulator JAR. The launcher must
run Firebase's supported `setup:emulators:firestore` command when that expected JAR is missing, verify its SHA-256, and
only then inspect its selected classes with `javap`; otherwise the first start after an upgrade fails with a misleading
class-not-found error before Firebase reaches its normal download step. (Codex task: 01a038c3-e59b-7112-8252-861c13623017)
When an upgrade moves a selected method to another class, update both the instrumentation map and the extension's
narrow ignored-type allow-list together; Firestore emulator 1.22 moved `transactionalQuery` from `CloudFirestoreV1` to
`FirestoreEmulatorHelper` while preserving its transaction timing role. (Codex task: 01a038c3-e59b-7112-8252-861c13623017)

Each emulator session writes sanitized NDJSON spans under `firestore-diagnostics/`. The receiver retains method names,
durations, trace/span correlation, status, process ID, and a small allow-list of protocol/thread attributes; it omits
request bodies, document values, document IDs, and document paths. Old session files are pruned after 24 hours while
the launcher is running, and each session stops writing after 1 GiB. The pinned agent/API downloads live under
`.firebase/firestore-diagnostics/`, while a small supported agent extension re-allows only the selected classes that
OpenTelemetry otherwise excludes through its broad `com.google.cloud.*` performance ignore. A small bootstrap agent
keeps the full OpenTelemetry runtime out of the Storage rules JVM even though Firebase passes `JAVA_TOOL_OPTIONS` to
both Java children, and startup fails visibly if an emulator upgrade removes any selected class or method.

Use trace IDs to compare the outer Firestore gRPC request with selected internal spans. A long
`ReactiveLockManager.acquireLocks` span is direct lock-wait evidence; a long `FirestoreEmulatorQueryExecutor.performScans`
span points at query scanning; a long `ListenStreamManager.notifyQueryListeners` span points at listener fan-out. If
the recorded gRPC and internal spans stay fast while the UI is slow, continue with browser/WebChannel, standalone API,
frontend rendering, and host-pressure controls instead of attributing the pause to emulator locking.

## Persisted data and object drift

Private nonzero backends prevent worktree tests from changing stack 0's documents or Storage objects. If stack 0
contains a shape its current code does not understand, first verify whether it came from stack-0 activity or a legacy
pre-isolation test; never reconnect a nonzero stack to stack 0 as a workaround. Within one private stack, persisted
data can still outlive source changes, so compare its stored fields and object paths with that worktree before
restarting processes.

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

If every current Asset's Firebase original exists but its R2 thumbnail or waveform is absent and MinIO contains a
different dev-fixture Asset ID set, repair only Assets tagged `#devasset`: regenerate their derivatives through the
normal workers and restore an R2-only dev sample master only from a bundled matching fixture. Verify every repaired
pointer and object, then export the private stack. Never reseed the stack, delete its older MinIO keys, or apply this
repair to a non-dev Asset merely to make the IDs match. (Codex task: 01a024c0-a524-7960-a57e-f9fa68536e4c)

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

A stopped frontend does not stop its already-loaded browser page. A stale stack-0 page or legacy shared-mode page can
keep Firestore WebChannels connected to stack 0, and after the emulator reports
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

## Nonzero isolated backends

Treat a nonzero backend as ready only when it has a unique Compose project, loopback-only host ports, a nonzero
dev-stack index, and private named volumes for Firebase and MinIO. It includes Functions built from that exact
worktree, Firestore, Firebase Storage, MinIO, and the Download Assets Worker; real staging Firebase Auth stays shared
and the normal App Check debug-token setup is reused. A new frontend port is a separate browser origin and can require
one normal sign-in the first time; backend restarts must not replace Auth with private emulator state. The frontend and
hot-reloading standalone API remain native. A new stack defaults to the read-only canonical seed; empty data requires
explicit `--seed=empty`. Its first launch may therefore use the canonical seed or empty data, but
every later launch must prefer that stack's private Firebase export and existing MinIO volume regardless of the
requested seed. Persist writes only inside those volumes; never merge datasets or let an isolated stack export into
the shared canonical directory.
If Docker reports `all predefined address pools have been fully subnetted` while creating a new isolated Compose
network, do not prune networks, stop another stack, or reuse another stack's subnet. For stack indices 1 through 254,
first prove that Docker has no network and macOS has no host route overlapping `10.250.N.0/24`, then create only
`aimvs-isolated-backend-stack-N_default` as a bridge with subnet `10.250.N.0/24`, gateway `10.250.N.1`, and the Compose
labels `com.docker.compose.project=aimvs-isolated-backend-stack-N` and `com.docker.compose.network=default`. Rerun the
normal guarded start and require every indexed container, mount, and loopback port to pass its usual ownership checks;
never use this recovery when the subnet overlaps, the index is outside that range, or ownership is ambiguous. Guarded
start reuses that fully verified empty recovery network until Compose uses it; guarded stop removes it with the other
replaceable runtime artifacts, while every persistent and recovery volume remains unchanged and a numbered worktree's
stack reservation remains held. (Codex tasks:
01a03564-7a64-7be2-a3f6-390ab477b9a6,
01a024c0-a524-7960-a57e-f9fa68536e4c)
The launcher creates those exact data volumes itself and marks them external to Compose so a configuration update
cannot produce a destructive volume-recreation prompt. Earlier ownerless volumes are adopted after either their exact
worktree containers and mounts prove ownership or only the complete deterministic three-volume dataset remains; the
launcher then records the worktree plus all three volume creation identities atomically in the backend-state volume.
Reject any incomplete dataset or later identity mismatch, and never answer a Compose `Recreate (data will be lost)?`
prompt. (Codex tasks: 01a0200e-ba77-7e42-8233-0fb4caa5bc70,
01a067e4-975c-7c71-b393-b27d66080bd9)
That backend-state volume records `active` immediately before Compose starts and `stopped` after either a guarded stop
attempt or validated crash recovery. A reboot or crash can prevent export-on-exit and leave that record active after
the containers disappear; warn that the latest unexported dev writes may be missing, keep every volume, and reuse the
last preserved snapshot instead of permanently blocking the stack number. Older datasets without this record are
adopted once and then covered by every later lifecycle. (Codex tasks: 01a024c0-a524-7960-a57e-f9fa68536e4c,
01a067e4-975c-7c71-b393-b27d66080bd9)
Normal nonzero-stack stop/export is always preservation-only. Guarded `stop` attempts and verifies Firebase export, but
an export failure only warns that the latest unexported dev writes may be missing; it still removes only exact stopped
runtime containers and its empty network, and proves every current and recovery volume kept the same identity. A
numbered worktree keeps the number reserved until that worktree is successfully removed and its shared reservation is
guardedly released; only then can a later worktree receive the number and continue from the saved dataset. Never delete,
prune, reclaim, reset, recreate, or reseed a stack's Firebase, Storage, MinIO, backend-state, recovery-backup, or other
persistent volume. Completion, inactivity, missing worktrees, disk pressure, and stale owner labels never authorize
data deletion. (Codex tasks: 01a024c0-a524-7960-a57e-f9fa68536e4c,
01a05ebf-a8f9-7f83-a325-1565cf6005a7)
Real Auth and browser storage can outlive a private dataset reset, so an origin can remember a Channel ID that the new
Firestore no longer contains. Exact reads of the signed-in User's own `channel-collaborators/{userId}` path intentionally
return a normal missing snapshot because public Channel cards use that same read to decide whether to show Switch
Channel; the old Rules denial produced one null-value error for every unrelated public Channel. The identity listener
maps that missing snapshot to its existing lost-access path, clears only `channelIdLoggedIn` and
`userIdForLoggedInChannel` from that origin's sessionStorage and localStorage, and reloads. Production collaborator
removal still keeps the document with Removed status. Never broaden the allowance to another User's path, clear all
localhost site data, or create a fake Channel with the old ID. Require the current private dataset's active Channel, a
fresh `dateLastLoggedIn`, and no fresh permission errors after recovery. (Codex task: 019ff0c1-80ad-79f3-9d60-cbb4004bf608)
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
that limit. Stopped isolated containers use no CPU or RAM, but their private named volumes still use disk. Stack 0's
continuously running `aimvs-minio` container can prevent Docker Resource Saver from stopping that VM, even when every
nonzero backend is stopped. During host slowness, compare the current Docker Desktop settings, VM/guest memory,
`docker stats`, and running-container inventory before attributing the configured maximum to one isolated stack. Never
stop stack 0's MinIO or apply a lower global memory setting without Ethan's approval because both interrupt his main
environment. (Codex task: 019ff0c1-80ad-79f3-9d60-cbb4004bf608)

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
state stop, inspect Firebase's own result: `Export complete` proves the latest snapshot, while `Export failed` warns
that the next task will continue from the previous preserved snapshot. Either result must still release only exact dead
runtime artifacts and preserve every volume; never quarantine the number for missing best-effort dev writes. A
container that never reached readiness was never handed off as a supported writable stack; keep its last good snapshot
and clean it up through guarded stop. (Codex tasks: 019ff0c1-80ad-79f3-9d60-cbb4004bf608,
01a067e4-975c-7c71-b393-b27d66080bd9)

## Worktrees that change emulator triggers

A nonzero stack's private Firebase image owns the Functions, Firestore Rules, and Storage Rules from that exact
worktree. After changing trigger-local code or a Function definition, stop the stack's native writers, run the guarded
private-backend stop, then start the same indexed backend again so Docker rebuilds the Function bundle. Verify the
private containers and indexed ports before testing. Never copy worktree trigger hunks into main or restart stack 0
for a nonzero test; that old shared-emulator workaround was rejected once every nonzero backend became isolated.
The nonzero standalone-API supervisor only replaces the native Node child after successful API builds; it deliberately
does not reload this frozen Functions bundle, so observing a native API restart is never proof that trigger code loaded.
(Codex tasks: 019fe10d-0cee-7192-a8d9-19bdf0ba7666, 01a0312f-5629-7b23-b7b1-4653b92e9dcc)

## Shared Storage emulator export failures

If stopping or restarting the shared emulator fails with `ENOENT` for
`firebase/storage/blobs/<uuid>` while exporting Storage, inspect `firebase-debug.log` before changing rules or
discarding emulator data. Firebase Tools can yield between reading its live file map and copying each blob, so an
ordinary delete or replacement request can remove the source file halfway through the snapshot. That race is not
evidence that a rules-codegen worktree changed the running emulator; verify the emulator command's checkout and
loaded rules paths separately before attributing the failure to another worktree.

Firebase Tools still has this narrow live-delete export race, but AIMVS deliberately does not patch the export loop:
making a multi-gigabyte snapshot synchronous blocks ordinary Storage requests for the whole copy. The normal
`postinstall` patch keeps the larger Storage upload-body limit and actively restores any legacy server/export patches
left in `node_modules`; Firebase Tools 15.25.1 supplies the line-buffered Storage Rules response handling itself and
fixes 15.25.0's Functions-emulator secret-param argument transposition.
Run the focused regression with `TS_NODE_PROJECT=tools/scripts/tsconfig.json node --test
-r ts-node/register tools/scripts/patch-storage-emulator.spec.ts` after changing this patch or upgrading Firebase
Tools. Restart only through the terminal that owns the shared emulator. If an export hits `ENOENT`, preserve the live
state and logs and retry only after stopping concurrent Storage mutations; do not delete the shared export as a first
response because that hides the race and loses reusable local state.

Firebase Tools 15.24.0 can wedge authenticated Storage requests while every listener and Docker healthcheck stays
green. Its Storage Rules bridge parses each child-process stdout chunk as one JSON object, but concurrent replies can
arrive as multiple newline-delimited objects in one chunk; the decisive log signature is one Storage log message that
contains two JSON objects separated by a newline. Compare an authenticated Firebase-client upload with an Admin
Storage upload because Admin bypasses Storage Rules: if Admin finishes but the authenticated request stays at 100%,
inspect this framing path before restarting or blaming cross-stack isolation. AIMVS now pins Firebase Tools 15.25.1,
which contains the upstream line-buffered handler and regression tests; do not restore the former local framing
backport. Do not downgrade to 15.25.0: it transposes `force` and `isEmulator` when resolving Function params, so local
Functions discovery can call Cloud Secret Manager and fail without OAuth; 15.25.1 contains upstream fix `2480f20062ed`.
The isolated launcher permits the verified 15.24.0-export to 15.25.1-CLI transition without relabelling the canonical
snapshot and still rejects unknown version mismatches. Verify future changes with a healthy Functions discovery and
concurrent authenticated uploads, then repeat one real browser GIF, animated WebP, and video upload and confirm their
thumbnails and retained copies in the stack's private MinIO volume. (Codex tasks:
01a000ff-9a55-7e93-a300-1b6e91ab3dc6, 01a035d6-3481-7d93-87af-76be7acb550e)

Do not run `npm run rules:test` on the host while the shared Storage emulator is listening on `:9199`. The script checks
that port before generating rules and exits if it is occupied. Normal dev-stack startup, `npm test`, local Git hooks,
and Firebase predeploy do not invoke this suite; the deploy workflow runs it on an isolated GitHub Actions host. The
test config uses separate ports, but Firebase Tools 15.24.0 stores every local Storage emulator's live blobs in the
same user-global temporary directory. When the short-lived test emulator stops, it removes that directory, so the
shared emulator keeps stale in-memory metadata and can exit with `ENOENT` on the next asset read. Distinct ports do
not isolate Storage persistence, and the repository patch above fixes only the separate live-export race. If the
guard reports a conflict, stop and report it instead of running the suite or stopping Ethan's emulator. After a
collision, treat the shared stack as unhealthy and preserve its export; restart it only with Ethan's explicit
authorization.

For Rules verification while retained emulators are running, use a disposable Docker container with its own filesystem,
no mounted datasets, no published ports, and no credentials. Never run the destructive test harness against a retained
stack's emulator. Copy the current templates, shared TypeScript sources, test harness, and matching Linux dependencies
into the disposable image; supply the cached Firestore and Storage emulator binaries before running with `--network none`.
Run the unchanged `npm run rules:test` guard and harness inside that container, require both generator and Rules tests
to pass, and verify the container exited successfully with no mounts. This isolates Storage's temporary blob directory
without stopping stack 0 or clearing the task's retained dev data. Keep test logs outside the source diff. (Codex task:
01a03e53-d1b8-7961-8139-3c2c4547b888)
