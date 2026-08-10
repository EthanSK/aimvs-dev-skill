# Emulator safety and recovery

## Contents

- [Durable recovery memory](#durable-recovery-memory)
- [Shared emulator ownership](#shared-emulator-ownership)
- [Periodic exporter ownership and recovery](#periodic-exporter-ownership-and-recovery)
- [Persisted data and object drift](#persisted-data-and-object-drift)
- [Storage customTime limitation](#storage-customtime-limitation)
- [Firestore WebChannel wedge recovery](#firestore-webchannel-wedge-recovery)
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

## Periodic exporter ownership and recovery

Run only one `export-emulator-data-periodically` process against the shared emulator hub. `firebase emulators:export`
exports whichever dataset is live on `:4400`; it does not care which checkout launched the exporter. A main-checkout
exporter can therefore overwrite main's canonical export while a worktree-owned emulator is running. Before changing
emulator ownership, stop every periodic exporter and verify none remain. Restart exactly one exporter only after the
main emulator command's `--import` and `--export-on-exit` paths both resolve to main's canonical
`emulator-export-data`.

The periodic exporter runs one export immediately when its terminal starts, then waits for its configured interval
(normally 30 minutes). Repeated Restore Terminals runs or manual terminal restarts therefore create extra immediate
exports even when only one exporter remains afterward. Large snapshots can briefly add enough Firestore and disk load
to make clients sluggish, so correlate each export's actual start/completion window with the client errors; an error
that began before the export is not caused by it.

If the wrong live dataset has already overwritten the canonical export, stop all exporters first, export the current
live state to a uniquely named recovery directory, stop the wrong emulator cleanly, and verify its ports close. Move
the overwritten canonical export to a separate preservation path before restoring a known-good snapshot. Restart the
emulators from main, then use the Admin SDK with project id `ai-music-video-studio-staging` to verify the affected
Channel, private Channel, collaborator, Assets, and Projects instead of trusting open ports alone. Only then restart
one main-checkout exporter and verify its first export completes. Never delete or reuse either recovery copy during
the restore.

If the hub is gone but an orphan Firestore Java process still owns `:8080`, the Firebase CLI cannot export it. After
stopping every periodic exporter, call Firestore's `/emulator/v1/projects/<project-id>:export` endpoint with a unique
`export_directory` and `export_name`, verify the resulting overall-export metadata, then stop only that verified
orphan PID. Preserve the canonical export separately before restoring main; an open Firestore port alone is not a
healthy shared emulator.

Never edit `serve-emulators.sh` while an invocation of that script is still running. In a verified failure, the file
grew by 40 bytes while Bash was waiting for Firebase; after Firebase exited, Bash resumed at the old end-of-file offset
and executed the newly exposed `ort-on-exit="$EMULATOR_EXPORT_DATA_DIR"` suffix as a separate command. Stop the owning
terminal before changing the script, or treat the edit as applying only to the next launch. If this suffix error occurs,
check for an orphan Firestore process on `:8080` before retrying startup.

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

## Worktrees that change emulator triggers

The frontend and standalone API intentionally use the standard emulator ports, so a trigger-changing worktree
cannot run an isolated emulator concurrently with the shared main emulator. Isolate it in time while keeping the
same ports:

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

This repository patches that Firebase Tools export loop through `tools/scripts/patch-storage-emulator.ts`; the
normal `postinstall` applies it. The bug is present in the installed `15.13.0` and was reverified in a clean
`15.24.0` package. Run `npm run patch:storage-emulator` after a dependency refresh or when diagnosing this exact
error. The command is idempotent and makes only the blob/metadata snapshot loop synchronous. Storage mutations are
synchronous after their async Rules checks, so one no-yield loop keeps the in-memory file map and disk blobs aligned;
periodic export briefly pauses Storage request handling instead of writing a corrupt snapshot. Run the focused
regression with `TS_NODE_PROJECT=tools/scripts/tsconfig.json node --test -r ts-node/register
tools/scripts/patch-storage-emulator.spec.ts` after changing this patch or upgrading Firebase Tools. Restart only
through the terminal that owns the shared emulator, then prove recovery with clean export/shutdown cycles and
matching Storage metadata/blob counts. Firebase regenerates internal blob UUID filenames during export, so compare
logical object counts, size multisets, or sampled content hashes instead of expecting those filenames to stay the
same. Do not delete the shared export as a first response because that hides the race and loses reusable local state.

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
