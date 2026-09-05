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

## Skill usage announcement

Tell Ethan when this skill is being used and why. Explain any skill-directed action or pause, and distinguish a
verified runtime result from a documentation change that has not yet been merged or published.

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
- Default agent-owned nonzero frontend, API-watch, and API-server processes to separate controllable long-running
  command sessions. A visible terminal is optional; do not block startup on iTerm or integrated-panel attachment.
  Retain exact session/process ownership, verify each latest build and startup, and do not promise survival across
  quitting the host app. Preserve healthy existing sessions unless Ethan requests migration. The earlier iTerm-only
  prohibition was explicitly reversed; do not reintroduce it. Follow `references/stack-lifecycle.md` for launch,
  recovery, and shutdown. Stack 0 remains unchanged. (Codex task: 01a06eec-07f7-7aa1-a498-15f6334e4b91)
- Create new linked worktrees only through `npm run aimvs-worktree -- create --task-slug=<task-slug>`. Keep the exact
  `aimvs<N>` number for every backend and native process, retain its shared reservation while the worktree exists, and
  release it only after guarded runtime cleanup and successful Git worktree removal. Existing unnumbered worktrees are
  legacy-compatible and must not be renamed merely to apply this rule. (Codex task:
  01a05ebf-a8f9-7f83-a325-1565cf6005a7)
- Treat native standalone-API hot reload as a nonzero-stack feature. After a successful API watcher build, require the
  supervisor to replace that stack's exact API PID and require the latest startup to say `development` before Computer
  Use; stack 0 remains manually controlled, and trigger-local or Function-definition changes still require the guarded
  private-backend stop/rebuild/start. (Codex task: 01a0312f-5629-7b23-b7b1-4653b92e9dcc)
- Never call a running dev stack healthy or complete until its latest builds have processed the final relevant source
  or configuration edit successfully. A listener or `200` response is not proof because a failed watcher can keep
  serving the last good frontend or API bundle. Diagnose and repair in-scope current-run failures, then repeat the
  full live-stack health gate before handoff; preserve and report an unrelated or ambiguous concurrent-change blocker
  instead of hiding it with a restart or describing stale output as current. (Codex task:
  01a062c9-ac08-7d71-b8ae-2e831291d7e3)
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
- Before the first manual-test interaction, treat muting the exact tracked agent-owned browser page as best effort.
  Use an available page-level browser or native UI control, verify it when practical, and keep it muted for the session;
  otherwise continue testing without asking Ethan or reporting a blocker, and note the limitation in the report.
  Follow [the native mute procedure](references/browser-control.md#best-effort-browser-page-muting) when
  the page controller lacks a mute command. Never change another page, Ethan's personal Chrome, stack 0, or system
  audio to achieve muting. Mandatory muting and permission prompts for an unsupported mute control were rejected;
  do not reintroduce them. (Codex tasks:
  01a05db7-d115-7ce2-8094-c0494a7dcdd7, 01a06e92-e0cb-7291-9ebb-cc533be87f4c,
  01a06eec-07f7-7aa1-a498-15f6334e4b91)
- Derive backend ownership only from the stack index: stack 0 uses Ethan's main Firebase, Storage, MinIO, and native
  Download Assets Worker; every nonzero stack uses its own indexed Firebase, Storage, MinIO, and Worker containers.
  The old per-command isolation opt-in was rejected because one omitted flag silently mixed private and stack-0 data;
  never reintroduce shared mode for a nonzero stack. (Codex task: 019fe10d-0cee-7192-a8d9-19bdf0ba7666)
- Never run `npm run rules:test` while stack 0's shared Storage `:9199` is listening. Distinct emulator ports do not isolate
  Firebase Tools' user-global Storage blobs.
- Never print or commit credentials, App Check tokens, secrets, cookies, signed URLs, or unfiltered provider request
  and error payloads.
- Treat the saved AIMVS test-account sign-in as part of an explicitly requested manual test, not a new task requiring
  permission. Read `references/authentication.md` before declaring authentication blocked or asking Ethan to sign in;
  it defines the exact approved account/origin scope and the narrow exception for an active browser tool's mandatory
  action-time confirmation. Reuse an approval already given for that exact sign-in after an interruption.
- Keep manual-test evidence in Markdown and PNGs. HTML report generation is disabled; preserve but do not run the
  dormant renderer, and leave existing `index.html` files unchanged unless Ethan explicitly re-enables it.
- Keep **Preview Rendering** enabled by default on nonzero stacks. Disable it only for a deliberate lean-mode or
  performance-isolation test, then enable it again before cleanup because its per-origin localStorage override persists
  across reloads and later uses of the same stack. (Codex task: 019ff0c1-80ad-79f3-9d60-cbb4004bf608)
- Close only the tracked agent-owned browser page—its desktop window/tab or in-app Browser tab—after every passed,
  failed, partial, blocked, or interrupted manual-test session. Keep that worktree's exact healthy nonzero backend and
  native API-watch, API-server, and frontend hot-reload processes running while its worktree exists. Stop them only
  when Ethan explicitly asks or immediately before removing the worktree; the end of a test or task turn is not stop
  authority. Subsequent ordinary source edits use those normal watchers and hot reload; do not replace them with a
  second stack or manually restart them when their documented reload path is sufficient. (Codex tasks:
  01a04f3a-a977-7683-81aa-f1452cf39475, 01a05301-5376-77b1-9c70-99e37245cc98)
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
  retained or reused stack later. Create a timed cleanup only when Ethan explicitly asks for that timer or deadline;
  retain the existing ownership/readback safeguards for such an exceptional timer. The rule never applies to
  Ethan-owned stack 0. (Codex tasks: 01a016b1-fc04-7150-a318-493d65f7111c,
  01a0399b-e199-79d2-b4ec-a32664b00adf, 01a04f3a-a977-7683-81aa-f1452cf39475)
- Never delete, prune, reclaim, reset, recreate, or reseed a nonzero stack's Firebase, Storage, MinIO, backend-state,
  recovery-backup, or other persistent volume. `stop` must attempt and verify the Firebase export, warn rather than
  quarantine the number when best-effort dev writes were not exported, stop the runtime, remove only replaceable
  containers and its empty network, and preserve every volume with the same identity. For a numbered worktree, this
  makes the runtime safe but leaves its number reserved until successful worktree removal and guarded reservation
  release. The next worktree assigned that released number continues from its existing dataset. Worktree landing or
  removal never authorizes data deletion, and no completion wording, missing owner, age, idleness, or disk pressure
  weakens this rule. (Codex tasks: 01a024c0-a524-7960-a57e-f9fa68536e4c,
  01a05ebf-a8f9-7f83-a325-1565cf6005a7, 01a067e4-975c-7c71-b393-b27d66080bd9)
- Never land or remove a completed worktree until its tracked browser window and native stack processes are closed,
  its isolated backend has completed guarded `stop` from that still-existing worktree, and the indexed runtime is
  absent while every persistent volume remains. Retire its cleanup automation when one exists. A failed export warns
  that the newest dev writes may be missing but does not block removal once the stopped runtime and unchanged volumes
  are verified; a live port, running container, foreign or ambiguous owner, mixed topology, or failed readback still
  blocks removal and preserves all Docker state. After removing a numbered worktree, release its exact shared
  reservation and verify the number is assignable again without changing any volume. (Codex tasks:
  019ff0c1-80ad-79f3-9d60-cbb4004bf608,
  01a0312f-5629-7b23-b7b1-4653b92e9dcc, 01a024c0-a524-7960-a57e-f9fa68536e4c,
  01a05ebf-a8f9-7f83-a325-1565cf6005a7, 01a067e4-975c-7c71-b393-b27d66080bd9)
- Before stopping or restarting stack 0's Firebase emulator backend, run and verify its one-shot export. Use the shared
  `export-emulator-data` command only when Ethan authorizes stopping stack 0's backend. For a nonzero stack, stop its
  native writers before guarded `stop` attempts and verifies that private snapshot; a missed export warns and reuses
  the previous snapshot instead of blocking the stack number. (Codex task: 01a067e4-975c-7c71-b393-b27d66080bd9)
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
- **An explicitly requested standalone terminal or an existing iTerm-owned stack:** also read
  [references/standalone-terminals.md](references/standalone-terminals.md). New background launches do not need it.
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
   exact test tab/window. After the final relevant source or configuration edit, pass the complete live-stack health
   gate before declaring a running stack healthy or completing the handoff. Leave the exact healthy nonzero native
   processes and isolated backend running with normal hot reload while the worktree exists, and hand off their exact
   stack index, frontend URL, and exact process/session ownership; include a tracked window only when one exists.
   When Ethan asks to stop them or immediately before worktree removal, perform one bounded cleanup pass and require
   the runtime to be fully stopped while every persistent volume remains unchanged. Keep the embedded number reserved
   through Git removal, then release and verify it separately. Use one fresh ownership preflight and one final
   readback; repeat a boundary only after a helper failure or verified state change. Keep the worktree until that
   required cleanup succeeds. (Codex tasks: 01a04f3a-a977-7683-81aa-f1452cf39475,
   01a05301-5376-77b1-9c70-99e37245cc98, 01a05ebf-a8f9-7f83-a325-1565cf6005a7)
6. Preserve any durable verified workflow finding in this skill during the same task, reconsider the routing split,
   retest affected behavior, validate the skill, and publish it through the repository's guarded subtree workflow.

## Completion handoff

Before this handoff, apply `references/stack-lifecycle.md`'s completion health gate to every running stack owned by the
task. A failed latest build makes the task blocked rather than complete even when its ports and frontend URL respond.

Also end every completed implementation or review with a **Manual checks** section containing one to three concise,
high-value tests Ethan can perform against the current change set (`PR` shorthand). Choose the smallest set that best
proves the changed behavior, and give the exact starting state, action, and expected result so Ethan does not have to
design the test himself. Prefer realistic user-visible checks that cover the main success path and, only when useful,
one important edge or failure case; do not pad the list with redundant checks. If the change has no honest manual test,
keep the section and say why instead of inventing one.

End every user-facing final AIMVS response with the exact **Current Environment Footer** required by the host
repository's `AGENTS.md`; the **Manual checks** section above must come before it. Use `Worktree`, `Dev stack`, and
`Localhost` in that order, never include the branch, and make the worktree path and running localhost URL clickable:

```markdown
### Current environment

- **Worktree:** [<worktree name>](<absolute worktree path>)
- **Dev stack:** `<stack index>`
- **Localhost:** [<localhost URL>](<localhost URL>)
```

When no dev stack for that exact worktree is running, write `Not running` for both **Dev stack** and **Localhost**.
When more than one worktree is in scope, follow the repository's `#### Primary` and `#### Alternate` form and include
every worktree the task owns, actively uses, or is responsible for.
