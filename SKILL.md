---
name: aimvs-dev
description: Use for every AI Music Video Studio development interaction involving task-environment selection, Git worktree lifecycle or dirty-state maintenance, Computer Use, local browser testing, dev-stack control, debugging, code review, or prior manual-test evidence. This is the repo source of truth for named AIMVS worktrees, stack 0 safety, isolated nonzero stacks, Git-state preservation, browser assignment, authentication, verification, and recovery.
---

# AIMVS Development

## Continuous improvement

Improve this skill as part of using it. Whenever usage, debugging, investigation, or user feedback produces a
durable verified AIMVS setup, browser, emulator, screenshot, reporting, login, Git/worktree, or recovery finding, update this
skill during the same task without waiting for a separate request. Adjust its instructions, scripts, tests, or
references as appropriate, retest affected behavior, and validate the skill before finishing. After every
modification, review whether `SKILL.md` remains a concise operating contract and router; split, merge, rename, or
reroute conditional detail when that reduces irrelevant context without hiding universal safeguards or fragmenting
the skill unnecessarily. Preserve reusable knowledge; do not record guesses, duplicate guidance, secrets,
credentials, branch-specific results, or transient runtime state.
A successful one-time repair does not qualify by itself. Keep incident-specific symptoms, data shapes, migration
recipes, and task recaps in task history unless they establish a stable rule that changes future decisions.

## Purpose

Use this skill as the AIMVS source of truth for task-environment and worktree decisions, Computer Use interactions,
local browser tests, dev-stack actions, emulator investigations, authentication flows, code reviews, dirty Git-state
operations, and prior manual-test evidence questions. It overrides global browser-testing defaults for AIMVS. Stack 0
belongs to Ethan's main VS Code environment and is never an agent test target. Every agent-run test uses a free
nonzero stack index, including tests of uncommitted changes in the primary worktree. Every new linked worktree has its
nonzero index reserved in its `aimvs<N>-<task-slug>` name and the shared Git directory from creation through
removal, even before startup. Stack 0 keeps Ethan's main native services; every nonzero stack uses its own private
backend containers plus its own indexed native frontend/API processes.

Author every change to this skill in the AIMVS repository. The public `EthanSK/aimvs-dev-skill` repository is an
output-only mirror: publish to it through AIMVS's guarded publisher, never pull, merge, or otherwise import its
history into AIMVS, and expect the publisher to replace any direct public-repository commits. (Codex task:
01a0200e-ba77-7e42-8233-0fb4caa5bc70)

## Universal safeguards

- Run manual browser or Computer Use testing only when Ethan explicitly requests it in the current task.
- Never start, stop, restart, restore, or test against stack 0 unless Ethan explicitly requests that exact stack-0
  action. Read-only port and log inspection is allowed.
- Create new linked worktrees only through `npm run aimvs-worktree -- create --task-slug=<task-slug>`. Keep the exact
  `aimvs<N>` number for every backend and native process, retain its shared reservation while the worktree exists, and
  release it only after guarded runtime cleanup and successful Git worktree removal. Existing unnumbered worktrees are
  legacy-compatible and must not be renamed merely to apply this rule. (Codex task:
  01a05ebf-a8f9-7f83-a325-1565cf6005a7)
- Treat native standalone-API hot reload as a nonzero-stack feature. After a successful API watcher build, require the
  supervisor to replace that stack's exact API PID and require the latest startup to say `development` before Computer
  Use; stack 0 remains manually controlled, and trigger-local or Function-definition changes still require the guarded
  private-backend stop/rebuild/start. (Codex task: 01a0312f-5629-7b23-b7b1-4653b92e9dcc)
- For desktop browsers, Ethan uses two display setups. When the MacBook is standalone, keep the verified test window on its sole
  `Built-in Retina Display` without pointless display movement. When external monitors are attached, keep the one
  agent-owned test window on `Built-in Retina Display` and preserve every external-display workspace, active media
  window, and unrelated app. An in-app Browser overflow session stays in one exact task-owned agent tab and has no
  macOS window or physical-display assignment; preserve every pre-existing browser tab.
- While Ethan is actively using the Mac, try every discrete manual browser action once with the least activating
  exact-window method available. If it clearly fails and ownership remains exact, the agent may retry once or twice
  with progressively more direct app- or window-scoped control, using judgment and foregrounding only as the final
  fallback. Send the normal macOS heads-up before a known focus or window-order change; the current explicit manual-test
  request authorizes that bounded fallback without separate foreground permission. Re-verify the exact task window,
  URL, display, and postcondition after every attempt, preserve newer user focus, never use global input, and never
  retry a consequential action unless its postcondition proves the earlier attempt did not occur. (Codex tasks:
  01a024ca-37e3-7883-89fe-f3233fb75a94, 01a024f9-f80c-71c0-9005-51c76fc2e18d,
  019fe81d-3690-71d3-820f-2a1ca360dcb4, 01a0357e-e591-7381-bc21-f9b5f93ccee7,
  01a0361a-9cf7-7dc3-b1b6-381b783854d5)
- Use Safari first, then Firefox and Opera for concurrent nonzero stacks. Never use Ethan's personal Chrome for an
  AIMVS manual test. When those desktop browsers are already
  assigned, actively used, incompatible, or unsafe, use a distinct task-scoped in-app Browser binding and agent tab
  for every additional test. The in-app Browser is the intentional overflow context, so there is no artificial
  three-session limit. Never use Ethan's personal Chrome for an AIMVS manual test or create an ad hoc isolated
  desktop-browser profile; desktop browsers use their existing persistent profiles. (Codex task:
  01a03a49-3424-7e93-bcd8-f261515ba730)
- Before the first manual-test interaction, mute the exact tracked agent-owned browser page and verify that it is
  muted; keep it muted for the whole session. Apply this to every desktop-browser window or in-app Browser tab used
  with a nonzero stack. Never mute or otherwise change Ethan's personal Chrome or any stack-0 page. If exact
  page-level muting cannot be verified without affecting another page or browser, stop and report the manual test as
  blocked. (Codex task: 01a05db7-d115-7ce2-8094-c0494a7dcdd7)
- Derive backend ownership only from the stack index: stack 0 uses Ethan's main Firebase, Storage, MinIO, and native
  Download Assets Worker; every nonzero stack uses its own indexed Firebase, Storage, MinIO, and Worker containers.
  The old per-command isolation opt-in was rejected because one omitted flag silently mixed private and stack-0 data;
  never reintroduce shared mode for a nonzero stack. (Codex task: 019fe10d-0cee-7192-a8d9-19bdf0ba7666)
- Never run `npm run rules:test` while stack 0's shared Storage `:9199` is listening. Distinct emulator ports do not isolate
  Firebase Tools' user-global Storage blobs.
- Never print or commit credentials, App Check tokens, secrets, cookies, signed URLs, or unfiltered provider request
  and error payloads.
- Keep manual-test evidence in Markdown and PNGs. HTML report generation is disabled; preserve but do not run the
  dormant renderer, and leave existing `index.html` files unchanged unless Ethan explicitly re-enables it.
- Keep **Preview Rendering** enabled by default on nonzero stacks. Disable it only for a deliberate lean-mode or
  performance-isolation test, then enable it again before cleanup because its per-origin localStorage override persists
  across reloads and later uses of the same stack. (Codex task: 019ff0c1-80ad-79f3-9d60-cbb4004bf608)
- Close only the tracked agent-owned browser page—its desktop window/tab or in-app Browser tab—after every passed,
  failed, partial, blocked, or interrupted manual-test session. Keep that worktree's exact healthy nonzero backend and
  native frontend/API hot-reload processes running while its worktree exists. Stop them only when Ethan explicitly
  asks or immediately before removing the worktree; the end of a test or task turn is not stop authority. (Codex task:
  01a05301-5376-77b1-9c70-99e37245cc98)
- For Safari, record task-created WebContent processes at test-window creation and after an abnormal reload, crash, or
  non-responsive-page recovery. Ordinary healthy route changes do not need another renderer inventory. At cleanup,
  use the deep renderer procedure only when a recorded task-created process survives or the page showed abnormal
  renderer behavior; never reconstruct ownership retrospectively from old task, process, or desktop logs. A healthy
  page with no recorded surviving renderer needs the exact task tab/window closed and its stack origin absent from
  Safari. (Codex tasks: 01a01b02-4104-72a1-8611-5535ace7202a,
  01a0399b-e199-79d2-b4ec-a32664b00adf)
- Do not create an idle-cleanup automation for a normally retained nonzero stack. Stack retention follows the owning
  worktree, not task inactivity: stop it only when Ethan explicitly asks or immediately before removing that worktree.
  Retire any legacy idle-cleanup automation after verifying its exact stack and task ownership so it cannot stop a
  retained or reused stack later. (Codex task: 01a05301-5376-77b1-9c70-99e37245cc98)
- Never delete, prune, reclaim, reset, recreate, or reseed a nonzero stack's Firebase, Storage, MinIO, backend-state,
  recovery-backup, or other persistent volume. `stop` must export Firebase, stop the runtime, remove only replaceable
  containers and its empty network, and preserve every volume with the same identity. For a numbered worktree, this makes
  the runtime safe but leaves its number reserved until successful worktree removal and guarded reservation release.
  The next worktree assigned that released number continues from its existing dataset. Worktree landing or removal never
  authorizes data deletion, and no completion wording, missing owner, age, idleness, or disk pressure weakens this
  rule. (Codex tasks: 01a024c0-a524-7960-a57e-f9fa68536e4c,
  01a05ebf-a8f9-7f83-a325-1565cf6005a7)
- Never land or remove a completed worktree until its tracked browser window and native stack processes are closed,
  its isolated backend has completed guarded `stop` from that still-existing worktree, and the indexed runtime is
  absent while every persistent volume remains. Retire its cleanup automation when one exists. A failed export, live
  port, running container, foreign or ambiguous owner, mixed topology, or failed readback blocks removal and preserves
  all Docker state. After removing a numbered worktree, release its exact shared reservation and verify the number is
  assignable again without changing any volume. (Codex tasks: 019ff0c1-80ad-79f3-9d60-cbb4004bf608,
  01a0312f-5629-7b23-b7b1-4653b92e9dcc, 01a024c0-a524-7960-a57e-f9fa68536e4c,
  01a05ebf-a8f9-7f83-a325-1565cf6005a7)
- Before stopping or restarting a Firebase emulator backend, run and verify its one-shot export. Use the shared
  `export-emulator-data` command only when Ethan authorizes stopping stack 0's backend. Stop every nonzero stack's
  native writers before its guarded `stop` command exports and verifies that stack's private snapshot.
- Main's Restore Terminals owns exactly one 30-minute shared-emulator exporter for crash recovery. Never start that
  periodic exporter from a linked worktree or nonzero backend; those stacks keep private data through their guarded
  stop/export flow. The periodic snapshot does not replace the verified one-shot export immediately before stopping
  or restarting the shared backend. (Codex task: 019ff0c1-80ad-79f3-9d60-cbb4004bf608)

## Required routing

Read every matching reference completely before acting. Several references can apply to one task. Every reference is
linked directly here so an agent never needs to discover operating instructions through a nested reference chain.

- **Any AIMVS task/thread creation, fork, handoff, environment selection, or worktree creation, reuse, rename, or
  removal:** read [references/worktree-lifecycle.md](references/worktree-lifecycle.md) before the task environment is
  chosen or task work begins.
- **Starting, inspecting, controlling, or stopping a dev stack; checking stack health:** read
  [references/stack-lifecycle.md](references/stack-lifecycle.md).
- **Any emulator operation or diagnosis, persisted-data mismatch, WebChannel wedge, trigger-changing worktree, Storage
  export failure, or security-rules test:** read
  [references/emulator-safety.md](references/emulator-safety.md).
- **Any browser or Computer Use interaction, browser assignment, window creation, focus issue, cleanup, or crash:**
  read [references/browser-control.md](references/browser-control.md).
- **Any sign-in, test-account, App Check, browser autofill, or authenticated file-picker flow:** read
  [references/authentication.md](references/authentication.md).
- **Any code review, stash, rebase, worktree landing, or staged/unstaged preservation operation:** read
  [references/git-state-and-code-review.md](references/git-state-and-code-review.md).
- **Every requested manual feature test, fixture mutation, failure-path test, or four-layer verification pass:** read
  [references/manual-verification.md](references/manual-verification.md).
- **Every Computer Use test, screenshot/report update, or question about prior manual-test evidence:** read
  [references/manual-test-reporting.md](references/manual-test-reporting.md).

## Core workflow

1. Before choosing a task environment or worktree, follow `references/worktree-lifecycle.md`. Then confirm the
   requested action is authorized, identify the exact worktree, preserve its staged, unstaged, untracked, ignored,
   browser, emulator, and dev-stack state, and read every other matching reference above.
2. For a manual test, use the exact stack reserved in a numbered worktree's name; only a legacy unnumbered worktree or
   primary-main test selects a free unreserved nonzero stack. Assign the browser surface, prepare ignored local
   dependencies, start or reuse only the permitted processes, and pass the complete pre-Computer-Use health gate.
3. Create and verify one dedicated browser page for the exact worktree and stack URL before interacting: one desktop
   window on `Built-in Retina Display`, or one task-owned in-app Browser tab after the desktop browsers are exhausted.
   Stop if the applicable process/window or tab identity, URL, or worktree banner is ambiguous.
4. Test a compact set of high-value flows that maximizes meaningful surface area across the requested behavior.
   Inspect actual screenshot pixels yourself, then have the latest Claude Opus independently review only UI introduced
   or changed by the current task and regressions those changes caused. Do not ask it to redesign or polish unrelated
   pre-existing UI. Also inspect emulator state, frontend/API/emulator logs, and relevant UI state;
   DOM/Accessibility state and the second opinion do not replace your own visual judgment.
5. Remove only task-created fixtures and temporary hooks, update and inspect the durable Markdown report, and close the
   exact test tab/window. Leave the exact healthy nonzero native processes and isolated backend running with normal hot
   reload while the worktree exists. When Ethan asks to stop them or immediately before worktree removal, perform one
   bounded cleanup pass and require the runtime to be fully stopped while every persistent volume remains unchanged.
   Keep the embedded number reserved through Git removal, then release and verify it separately. Use one fresh ownership
   preflight and one final readback; repeat a boundary only after a helper failure or verified state change. Keep the
   worktree until that required cleanup succeeds. (Codex tasks: 01a05301-5376-77b1-9c70-99e37245cc98,
   01a05ebf-a8f9-7f83-a325-1565cf6005a7)
6. Preserve any durable verified workflow finding in this skill during the same task, reconsider the routing split,
   retest affected behavior, validate the skill, and publish it through the repository's guarded subtree workflow.

## Completion handoff

End every completed AIMVS task or review with this compact field list. Keep every field on its own bullet so the
handoff stays easy to scan; never combine the worktree, branch, stack, or frontend URL into one sentence. Make the
worktree path and frontend URL clickable. Use this form for the first field whether the task uses the primary or a
linked worktree:

- `- Worktree: [<worktree name>](<absolute worktree path>)`

```markdown
- Branch: <branch name>
- Dev stack: <stack index>
- Frontend: [<localhost URL>](<localhost URL>)
```

When no dev stack for that exact worktree is running, write `Not running` for both **Dev stack** and
**Frontend** instead of omitting either line.

Also end every completed implementation or review with a **Manual checks** section containing one to three concise,
high-value tests Ethan can perform against the current change set (`PR` shorthand). Choose the smallest set that best
proves the changed behavior, and give the exact starting state, action, and expected result so Ethan does not have to
design the test himself. Prefer realistic user-visible checks that cover the main success path and, only when useful,
one important edge or failure case; do not pad the list with redundant checks. If the change has no honest manual test,
keep the section and say why instead of inventing one.
