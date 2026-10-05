# Git state and code review

## Staging and landing

- Verify staged paths with `git diff --cached --name-only`, unstaged paths with `git diff --name-only`, and untracked paths with `git ls-files --others --exclude-standard` before reporting a staging blocker. In `git status --short`, the first column is the index and the second is the working tree; `M ` is already staged. Self-improved — 2026-09-28: a reversed reading incorrectly blocked approved landing; separate path lists prevent that mistake. (Codex task: 01a0e873-10e4-70c0-8883-5de5495c4170)
- Refreshing or replacing an already-staged file with `git add` still counts as staging and requires my explicit permission. Me staging a file myself does not authorize an agent to change that file's index entry; preserve the exact staged snapshot unless the task-owned spec-file exception below, the project `AGENTS.md` instruction-edit exception, or the tiny MMCDW correction exception applies.
- Whenever you finish writing code, stage all task-owned spec-file changes without waiting for me to ask; I do not want to spend time reviewing them. Outside the tiny MMCDW correction exception, do not automatically stage dev-only changes, including dev controllers/services, dev creation tooling, fixtures, emulator seed data, or local development tooling; these require my explicit staging instruction. Leave manual-test reports unstaged unless I explicitly ask you to stage the report. Never automatically stage manual-test screenshots or their report folder as dev-only evidence; follow `manual-test-reporting.md` instead. Before handing work back, check the unstaged and untracked changes and stage every remaining task-owned spec hunk outside that folder. Stage only the qualifying hunks in mixed files; production and dev-only behavior changes remain unstaged for my review unless the tiny MMCDW correction exception applies. Preserve unrelated or pre-existing changes and their staging state. User corrections — 2026-09-29 and 2026-09-30: screenshot evidence is not dev-only staging, and automatic staging is limited to task-owned specs outside the tiny MMCDW exception.
- Never stage or unstage manual-test PNG screenshots, even if they are already staged or an earlier instruction said to leave them unstaged. Do not refresh, renormalize, or otherwise correct their Git index entries. Ethan manages their staging; a read-only status check does not authorize changing it. This rule overrides the staging exceptions above. User correction — 2026-09-29 (Codex task: 01a0e8ca-6772-7251-8d07-9979d45bcb56).
- Landing approval is state-specific. Never commit, merge, cherry-pick, fast-forward, or otherwise land a source worktree while that source worktree has any unstaged or untracked changes; treat a request to land that dirty source worktree as a mistake, refuse it, show its staged, unstaged, and untracked paths, and wait for me to review and stage every remaining change manually. Never rely on Git state captured before the current landing request, including state reported during an earlier review: I may have changed staging since then, so run a fresh read-only check of staged, unstaged, and untracked paths after the request and treat that post-request snapshot as authoritative. When that check confirms zero unstaged and zero untracked paths, an explicit current request to commit, merge, or otherwise land that already-staged state is sufficient approval: report the exact staged paths, but proceed without asking me to repeat the approval. The request becomes stale if the staged snapshot changes after that post-request check, except for a tiny MMCDW correction below; a difference from an earlier review snapshot does not make it stale. The task-owned spec-file, project `AGENTS.md`, and tiny MMCDW correction rules are the only exceptions to manual staging. Unrelated dirty changes in the target checkout do not block landing when they can be preserved and restored with their exact staged, unstaged, and untracked boundaries.
- `mmcdw` means: commit the exact staged snapshot, merge it into local `main`, stop and export the worktree-owned nonzero stack, remove the VS Code folder and Git worktree, and release its stack reservation. It grants the same state-specific landing approval as the full request, but never authorizes a push, branch deletion, or persistent-volume deletion; every normal fresh-state and ownership check still applies.
- During already-authorized MMCDW, if a tiny little correction to the approved snapshot is confined to one file and obviously correct, quickly make and stage only that correction, rerun the affected checks, and continue MMCDW without blocking me for another confirmation. Tell me what changed; keep this exception tiny. Larger or unclear changes and conflict resolutions retain their normal review and approval checkpoints. User request — 2026-10-04.
- Before MMCDW, first lint all spec files in the landing worktree, not just changed specs, using the configured Nx lint targets through npm. Also run all existing `typecheck-specs` targets and the spec inventory check: editor red lines can be TypeScript errors that passing tests or lint do not catch. Verify that every spec is covered, report any errors or coverage gaps, and do not proceed to commit, merge, or cleanup while these checks fail or remain incomplete. Preserve the staged snapshot; rerun the affected checks if the code changes before landing. User request — 2026-09-26.
- Before MMCDW or any request to merge or land onto `main`, check against the current local `main` HEAD. If the source does not already include it, preview whether the complete approved source state would merge cleanly, including staged changes as well as existing commits; do not mutate either checkout or its index just to preview the merge. A clean preview may proceed under the existing landing approval. Recheck if main or the approved source snapshot changes before landing.
- If that preview finds conflicts, stop the landing sequence before creating its commit, merging, or cleaning up. Tell me you will instead rebase onto current `main` HEAD, then perform the rebase using the existing conflict and dirty-state preservation workflow. Leave every resolved conflict delta unstaged for me to review, including test-file resolutions; preserve the original staged intent and all non-conflicting boundaries. Report what conflicted, how it was resolved, and verification results, then wait for me to review, stage, and explicitly tell you to continue. Never treat the original MMCDW request as approval to land the new resolutions. Before continuing, repeat the fresh-state and merge checks. If a resolution is ambiguous, retain the recovery data and ask rather than guessing.
- After resolving merge or rebase conflicts during MMCDW, automatically do a code review of the resolved code and affected integrations before reporting back, so I do not have to ask each time. Follow `aimvs-code-review`, include the findings and verification results, and keep the review, staging, and explicit-continue checkpoint above.

## Preserve state during reviews and Git operations

- Whenever rebasing onto current local `main` HEAD, check what changed on main since the previous base, including instructions and established ways of doing things. Update anything already done in the PR that the new patterns apply to, including added files and changes that merge cleanly; resolving conflicts alone is not enough. Before finishing, inspect the whole in-flight diff for superseded patterns, verify the affected behavior, and report what was adapted or any unresolved choice. Preserve unrelated work and the original staging boundaries. User request — 2026-09-22. Inventory every bulk-capable host and wrapper of changed shared cards, then verify that new entry gestures reach each owner with the same eligibility checks; resolving the overlapping files does not cover newly added callers. Self-improved — 2026-09-30: the Shift-click sweep found opt-ins missing from new list integrations. (Codex task: 01a0e8c5-e4a3-7b53-8c02-2c796ab9fe2d)

Review the effective working tree by default. Do not report staged-versus-unstaged differences or index composition
as code-review findings unless Ethan explicitly asks for an index or staging audit; he normally reviews first and
stages manually afterward.

When applying or landing a linked worktree back to main, preserve the exact staged, unstaged, and untracked boundaries
of both worktrees. Re-read those boundaries immediately before the landing operation; an earlier snapshot is stale.

When Ethan asks to move dirty changes from main into an owning worktree, a verified copy is only the preservation
checkpoint, not completion. After proving that every staged, unstaged, and untracked item exists in the destination,
remove only those exact duplicates from main in the same task when the request authorizes the move; preserve unrelated
Git boundaries, use recoverable deletion for discarded artifacts, and report the operation as a copy if main remains
dirty for any reason.

When preserving a dirty worktree through a stash or rebase, restore with `git stash apply --index` when safe and
verify the staged, unstaged, and untracked state separately before dropping the recovery stash. Restored file
contents alone do not prove that the index was restored.

If the rebase or later dirty-state restoration reports conflicts, inspect the original base, updated base, immutable
recovery stash, and originating task history. Resolve every conflict automatically when the intended combination is
unambiguous; never choose blanket ours/theirs or silently discard either side. If the intent remains ambiguous, stop
with only those ambiguous paths unresolved and keep the exact recovery stash.

Do not accept Git's partial index after a conflicted `git stash apply --index`. The message `Index was not unstashed`
means non-conflicting edits can be staged even when they were originally unstaged. Use the immutable stash parents to
reconstruct and verify every non-conflicting staged/unstaged boundary and the complete untracked manifest. Git may
temporarily require a resolved index entry to clear an unmerged path, but leave the final conflict resolution as an
ordinary unstaged working-tree change for Ethan to review. When that path also had a pre-existing staged change,
preserve the re-applied staged intent in the index and place only the conflict-resolution delta above it as unstaged.
If safe reconstruction is ambiguous, stop without dropping the recovery stash rather than handing off a collapsed or
partly restored index.

Capture the new stash's immutable commit hash immediately and use that hash for every later inspect/apply command.
Stash ordinals such as `stash@{0}` are shared across worktrees and can move when another task creates a stash, so a
saved ordinal can silently replay another task's state into a recovery worktree.

In zsh preservation loops, never name a scalar loop variable `path`: `path` is the shell's command-search array, so
assigning an untracked filename to it makes later tools such as `shasum` disappear. Use a task-specific name such as
`untracked_file`, and verify the complete sorted hash manifest before any mutation.

## Verify selected Jest specs

- For a spec under `+state`, pass its filename to Nx Jest's `--testFile` and require a Jest `Tests:` total. A full path
  containing `+` can exit successfully with “No tests found”; Nx success alone does not prove that the suite ran.
  Self-improved — 2026-09-23: full `+state` paths ran zero tests, while filename reruns executed 63 and 48 tests
  (Codex task: 01a0c563-e671-72e2-8815-406eda717990).
