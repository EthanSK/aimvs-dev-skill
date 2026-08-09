# Manual verification

Keep requested manual testing proportionate and usage-conscious. Prefer a small set of high-value scenarios that
jointly cover the important behavior, and let one honest settled flow prove several overlapping outcomes when it can.
Avoid near-duplicate interactions and screenshots. This is guidance rather than a hard quota: add another scenario
when a materially different risk cannot be covered clearly by the existing flows.

Within the requested feature scope, actively maximize meaningful surface area: cover every materially distinct new
entry point, state, and recovery path, and prefer flows that exercise several connected components at once. Compact
means avoiding redundant repetition, not leaving separate new behavior untested.

For feature testing, prove the behavior at all four layers before calling it done:

- UI: complete the user-visible flow in the stack browser, reload after frontend changes, and verify expected
  controls, loading/disabled states, snackbars, dialogs, and absence of stale feedback after refresh.
- Screenshot pixels: load every captured PNG with a read-only image tool and personally inspect the actual image.
  File existence, dimensions, captions, DOM, Accessibility state, and logs do not prove visual correctness.
- Emulator state: query the active Firestore/Storage emulator session—shared normally or temporarily refreshed from
  main under exclusive coordination for a trigger-changing worktree—after each important flow and confirm the expected
  documents, counters, operation statuses, links, and storage side effects. Use the staging project namespace when
  connecting to the local emulator.
- Logs: inspect the stack frontend debug log (`frontend-debug.log` for stack 0, `frontend-debug-N.log` for stack
  N), the standalone API logs, and emulator output. Treat fresh console/runtime errors, failed HTTP calls, and
  backend exceptions as test failures unless they are already known and irrelevant to the touched code.

Treat every dev fixture button as a durable emulator mutation. In particular, **Create 40 Test Project Notices**
writes 40 server-owned documents under the selected project and can leave its latest synthetic bulk notice visible
below the generation button long after the test. Run it only against an exact disposable project in the agent's
nonzero stack, never against Ethan's existing project; remove that temporary project or its known fixture documents
afterward and re-query the project notices before cleanup is considered complete.

If verification finds a bug caused by the current work—including a defect visible in a screenshot—fix it
surgically, restart or reload the affected process when needed, and repeat the smallest proving flow, screenshot,
log, and emulator checks. Report pre-existing, unrelated, or deeper visual problems with the exact screenshot
instead of silently widening the implementation. Do not leave temporary test hooks, forced errors, debug logs, or
local-only code changes in the diff.

When a feature has user-visible async/error handling, test at least one failure mode in addition to the happy
path. Prefer a temporary local throw, disabled dependency, invalid emulator fixture, or rejected API response that
exercises the real UI/status/notification path. Remove the temporary fault before final verification, then confirm
the happy path still works and the logs are clean.

After deleting an exact temporary emulator project, wait for in-flight Functions triggers and query that project ID
again. A clip or project trigger that started before deletion can recreate a skeletal project document or derived
subcollection after the first cleanup check; recursively delete only the known temporary ID again and reverify it is
absent instead of assuming the first successful delete is final.
