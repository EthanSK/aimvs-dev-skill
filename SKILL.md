---
name: aimvs-dev
description: Use for every AI Music Video Studio development interaction involving Computer Use, a local browser test, dev-stack startup or control, debugging, code review, Git worktree or dirty rebase/stash maintenance, or questions about prior manual-test screenshot evidence. This is the repo source of truth for Ethan-owned stack 0 safety, agent-owned nonzero stack selection, Git-state preservation, MacBook-display routing, shared or isolated Firebase emulators, port offsets, browser assignment, authentication, verification, recovery, and durable manual-test reports.
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

Use this skill as the AIMVS source of truth for every Computer Use interaction, local browser test, dev-stack action,
emulator investigation, authentication flow, code review, dirty Git-state operation, and prior manual-test evidence
question. It overrides global browser-testing defaults for AIMVS. Stack 0 belongs to Ethan's main VS Code environment
and is never an agent test target. Every agent-run test uses a free nonzero stack index, including tests of
uncommitted main-checkout changes.

## Universal safeguards

- Run manual browser or Computer Use testing only when Ethan explicitly requests it in the current task.
- Never start, stop, restart, restore, or test against stack 0 unless Ethan explicitly requests that exact stack-0
  action. Read-only port and log inspection is allowed.
- Keep every AIMVS browser interaction in one exact agent-owned window on `Built-in Retina Display`. Preserve every
  pre-existing browser window, external-display workspace, active media window, and unrelated app.
- Use Safari first, then Firefox, Opera, and personal Chrome for concurrent nonzero stacks. Use existing persistent
  profiles only; never substitute a fresh or isolated browser context.
- Reuse the shared main Firebase emulator stack for ordinary worktree tests. Trigger-changing worktrees require the
  explicitly coordinated exclusive shared-emulator refresh workflow.
- Never run `npm run rules:test` while shared Storage `:9199` is listening. Distinct emulator ports do not isolate
  Firebase Tools' user-global Storage blobs.
- Never print or commit credentials, App Check tokens, secrets, cookies, signed URLs, or unfiltered provider request
  and error payloads.
- Keep preview rendering disabled on every nonzero stack unless the requested test specifically verifies preview
  generation. Enable **Preview Rendering** only for that test, then disable it again before cleanup because its
  per-origin localStorage override persists across reloads and later uses of the same stack.
- Close only the tracked agent-owned browser window and nonzero stack after every passed, failed, partial, blocked, or
  interrupted manual-test session unless Ethan explicitly asks to keep that exact stack running.

## Required routing

Read every matching reference completely before acting. Several references can apply to one task. Every reference is
linked directly here so an agent never needs to discover operating instructions through a nested reference chain.

- **Starting, inspecting, controlling, or stopping a dev stack; preparing a worktree; checking stack health:** read
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

1. Confirm the requested action is authorized, identify the exact checkout/worktree, preserve its staged, unstaged,
   untracked, ignored, browser, emulator, and dev-stack state, then read all matching references above.
2. For a manual test, select a free nonzero stack and assigned browser, prepare ignored local dependencies, start or
   reuse only the permitted processes, and pass the complete pre-Computer-Use health gate.
3. Create and verify one dedicated browser window for the exact worktree and stack URL before interacting. Stop if
   the process, display, URL, window identity, or worktree banner is ambiguous.
4. Test a compact set of high-value flows that maximizes meaningful surface area across the requested behavior.
   Inspect actual screenshot pixels yourself, then have the latest Claude Opus independently review only UI introduced
   or changed by the current task and regressions those changes caused. Do not ask it to redesign or polish unrelated
   pre-existing UI. Also inspect emulator state, frontend/API/emulator logs, and relevant UI state;
   DOM/Accessibility state and the second opinion do not replace your own visual judgment.
5. Remove only task-created fixtures and temporary hooks, generate and inspect the durable report, close the exact
   test window, stop the agent-owned stack, and verify cleanup.
6. Preserve any durable verified workflow finding in this skill during the same task, reconsider the routing split,
   retest affected behavior, validate the skill, and publish it through the repository's guarded subtree workflow.

## Completion handoff

End every completed AIMVS task or review with this compact field list. Keep every field on its own bullet so the
handoff stays easy to scan; never combine the worktree or checkout, branch, stack, or frontend URL into one sentence.
Make the worktree or checkout path and frontend URL clickable. Use exactly one of these forms for the first field:

- Linked Git worktree: `- Worktree: [<worktree name>](<absolute worktree path>)`
- Repository's primary checkout: `- Checkout: [<checkout name>](<absolute checkout path>)`

```markdown
- Branch: <branch name>
- Dev stack: <stack index>
- Frontend: [<localhost URL>](<localhost URL>)
```

When no dev stack for that exact checkout or worktree is running, write `Not running` for both **Dev stack** and
**Frontend** instead of omitting either line.

Also end every completed implementation or review with a **Manual checks** section containing one to three concise,
high-value tests Ethan can perform against the current change set (`PR` shorthand). Choose the smallest set that best
proves the changed behavior, and give the exact starting state, action, and expected result so Ethan does not have to
design the test himself. Prefer realistic user-visible checks that cover the main success path and, only when useful,
one important edge or failure case; do not pad the list with redundant checks. If the change has no honest manual test,
keep the section and say why instead of inventing one.
