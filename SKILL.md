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

## Purpose

Use this skill as the AIMVS source of truth for task-environment and worktree decisions, Computer Use interactions,
local browser tests, dev-stack actions, emulator investigations, authentication flows, code reviews, dirty Git-state
operations, and prior manual-test evidence questions. It overrides global browser-testing defaults for AIMVS. Stack 0
belongs to Ethan's main VS Code environment and is never an agent test target. Every agent-run test uses a free
nonzero stack index, including tests of
uncommitted changes in the primary worktree. Stack 0 keeps Ethan's main native services; every nonzero stack uses its
own private backend containers plus its own indexed native frontend/API processes.

Author every change to this skill in the AIMVS repository. The public `EthanSK/aimvs-dev-skill` repository is an
output-only mirror: publish to it through AIMVS's guarded publisher, never pull, merge, or otherwise import its
history into AIMVS, and expect the publisher to replace any direct public-repository commits. (Codex task:
01a0200e-ba77-7e42-8233-0fb4caa5bc70)

## Universal safeguards

- Run manual browser or Computer Use testing only when Ethan explicitly requests it in the current task.
- Never start, stop, restart, restore, or test against stack 0 unless Ethan explicitly requests that exact stack-0
  action. Read-only port and log inspection is allowed.
- Treat native standalone-API hot reload as a nonzero-stack feature. After a successful API watcher build, require the
  supervisor to replace that stack's exact API PID and require the latest startup to say `development` before Computer
  Use; stack 0 remains manually controlled, and trigger-local or Function-definition changes still require the guarded
  private-backend stop/rebuild/start. (Codex task: 01a0312f-5629-7b23-b7b1-4653b92e9dcc)
- Keep every AIMVS browser interaction in one exact agent-owned window on `Built-in Retina Display`. Preserve every
  pre-existing browser window, external-display workspace, active media window, and unrelated app.
- While Ethan is actively using the Mac, keep manual testing in the background on a best-effort basis and preserve
  every unrelated window. An explicit current request for AIMVS manual browser or Computer Use testing also authorizes
  the exact dedicated task window to become frontmost when required; do not ask for a second approval merely because
  that bounded test window may cover or take focus from the active app. Send the normal macOS heads-up before a known
  focus change, verify the exact task window and URL immediately before and after input, and never restore focus over
  newer user input. Stop only when ownership becomes ambiguous, the controller targets another window or URL, or
  continuing would interact with unrelated user state. (Codex tasks: 01a024ca-37e3-7883-89fe-f3233fb75a94,
  01a024f9-f80c-71c0-9005-51c76fc2e18d, 019fe81d-3690-71d3-820f-2a1ca360dcb4)
- Use Safari first, then Firefox and Opera for concurrent nonzero stacks. Never use Ethan's personal Chrome for an
  AIMVS manual test, and stop when none of the three permitted browsers is safely available. Use existing persistent
  profiles only; never substitute a fresh or isolated browser context.
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
- Close only the tracked agent-owned browser window and nonzero stack after every passed, failed, partial, blocked, or
  interrupted manual-test session unless Ethan explicitly asks to keep that exact stack running.
- For Safari, record task-created WebContent processes at test-window creation and after an abnormal reload, crash, or
  non-responsive-page recovery. Ordinary healthy route changes do not need another renderer inventory. At cleanup,
  use the deep renderer procedure only when a recorded task-created process survives or the page showed abnormal
  renderer behavior; never reconstruct ownership retrospectively from old task, process, or desktop logs. A healthy
  page with no recorded surviving renderer needs the exact task tab/window closed and its stack origin absent from
  Safari. (Codex tasks: 01a01b02-4104-72a1-8611-5535ace7202a,
  01a0399b-e199-79d2-b4ec-a32664b00adf)
- Create a verified 24-hour idle-cleanup check only when Ethan explicitly asks to keep the exact nonzero stack running
  after the current task turn. A stack that will be closed during the same task must not incur create/readback/cancel
  automation work. Never leave a deliberately retained stack without a cleanup owner; the check never applies to
  Ethan-owned stack 0. (Codex tasks: 01a016b1-fc04-7150-a318-493d65f7111c,
  01a0399b-e199-79d2-b4ec-a32664b00adf)
- Never remove a worktree until its tracked browser window and native stack processes are closed and any isolated
  backend has completed its guarded stop from that still-existing worktree. Ordinary stop and the 24-hour idle cleanup
  preserve the whole stack. Only explicit terminal task-completion authorization permits the separate guarded reclaim;
  retire its cleanup automation and complete reclaim before removing the worktree so the index becomes reusable. An
  explicit current-turn instruction from Ethan to manually bypass reclaim for one exact stack may waive only an
  unavailable current launcher or missing guarded-stop receipt through the narrow procedure in
  `references/stack-lifecycle.md`; ordinary completion permission never implies that bypass. A failed export, live
  port, running container, foreign or ambiguous owner, mixed topology, or failed readback always blocks removal and
  preserves the private Docker state. (Codex tasks: 019ff0c1-80ad-79f3-9d60-cbb4004bf608,
  01a0312f-5629-7b23-b7b1-4653b92e9dcc, 01a0391b-3fc2-7d41-8005-b7c77723995f)
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
2. For a manual test, select a free nonzero stack and assigned browser, prepare ignored local dependencies, start or
   reuse only the permitted processes, and pass the complete pre-Computer-Use health gate.
3. Create and verify one dedicated browser window for the exact worktree and stack URL before interacting. Stop if
   the process, display, URL, window identity, or worktree banner is ambiguous.
4. Test a compact set of high-value flows that maximizes meaningful surface area across the requested behavior.
   Inspect actual screenshot pixels yourself, then have the latest Claude Opus independently review only UI introduced
   or changed by the current task and regressions those changes caused. Do not ask it to redesign or polish unrelated
   pre-existing UI. Also inspect emulator state, frontend/API/emulator logs, and relevant UI state;
   DOM/Accessibility state and the second opinion do not replace your own visual judgment.
5. Remove only task-created fixtures and temporary hooks, update and inspect the durable Markdown report, then perform
   one bounded cleanup pass: close the exact test tab/window, stop the native processes, export and stop the isolated
   backend, retire a cleanup automation only when one was actually created, and run guarded reclaim when terminal
   completion is authorized. Use one fresh ownership preflight and one final readback; repeat a boundary only after a
   helper failure or verified state change. Preserve paused stacks and keep the worktree until cleanup succeeds.
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
