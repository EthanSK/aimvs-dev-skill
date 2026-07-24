# Emulator safety and recovery

## Contents

- [Shared emulator ownership](#shared-emulator-ownership)
- [Persisted data and object drift](#persisted-data-and-object-drift)
- [Firestore WebChannel wedge recovery](#firestore-webchannel-wedge-recovery)
- [Worktrees that change emulator triggers](#worktrees-that-change-emulator-triggers)
- [Shared Storage emulator export failures](#shared-storage-emulator-export-failures)

## Shared emulator ownership

By default, run several worktrees' frontend + standalone API at once, all sharing one Firebase emulator stack. Each
worktree runs on a "dev stack index" `N` that offsets every port by `N`, so stack 1's frontend is `:4201`,
stack 2's is `:4202`, etc. This lets you test different branches side by side in different browsers.

This works because we assume worktrees rarely change Firestore/Storage triggers, so the one shared emulator
is fine for all of them. If a worktree changes Functions, Firestore, or Storage trigger behavior, use the exclusive
emulator workflow below instead of the shared emulator.

Node-side wiring lives in `apps/frontend/plugins/dev-stack-config.cjs` (pure config) and `tools/scripts/run-dev-stack.cjs`
(the CLI the npm scripts call). In ordinary shared-emulator mode, `--dev-stack-index=N` on any script is the only
knob needed to keep that worktree's frontend and standalone API paired.

## Persisted data and object drift

Shared emulator ownership does not isolate stored data from worktree behavior. A worktree can write a newer document
or storage-path shape that main does not understand, then leave main failing after that worktree's stack stops even
though every listener still belongs to the correct checkout. When main breaks after another stack's test, verify the
affected emulator fields and object paths against both code versions before restarting processes; use disposable test
data or restore compatible data when the worktree intentionally changes a persisted shape.

If an unmerged profile-picture flow leaves a request-versioned object, copy the intended bytes to main's canonical
`profile-pic.webp` path, repoint only that channel, persist the emulator export, verify the canonical object, and remove
the temporary object; never broaden main's path validator merely to accept temporary shared-emulator data.

Firestore emulator exports and the persistent MinIO volume can also drift independently. A canonical Firestore export
can retain a request-versioned R2 pointer after a later profile-picture test deletes that superseded object, so every
reload repeats a signed-URL 404 and can make coalesced media loading look globally slow. For a local R2 `NotFound`,
compare the exact Firestore pointer with the bucket keys and retained test evidence; restore the proven matching object
or update only the stale emulator pointer to the newest surviving valid object instead of repeatedly restarting Java
or changing download authorization.

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
