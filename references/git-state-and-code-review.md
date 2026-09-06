# Git state and code review

## Staging and landing

- Refreshing or replacing an already-staged file with `git add` still counts as staging and requires my explicit permission. Me staging a file myself does not authorize an agent to change that file's index entry; preserve the exact staged snapshot unless the task-owned `*.spec.ts` exception below or the project `AGENTS.md` instruction-edit exception applies.
- Always stage task-owned `*.spec.ts` changes once they are ready for review, without waiting for me to ask. This applies only to tests created or changed for the current task: never stage unrelated or pre-existing test changes, and stage only the task-owned hunks when a test file contains shared work.
- Landing approval is state-specific. Never commit, merge, cherry-pick, fast-forward, or otherwise land a source worktree while that source worktree has any unstaged or untracked changes; treat a request to land that dirty source worktree as a mistake, refuse it, show its staged, unstaged, and untracked paths, and wait for me to review and stage every remaining change manually. Never rely on Git state captured before the current landing request, including state reported during an earlier review: I may have changed staging since then, so run a fresh read-only check of staged, unstaged, and untracked paths after the request and treat that post-request snapshot as authoritative. When that check confirms zero unstaged and zero untracked paths, an explicit current request to commit, merge, or otherwise land that already-staged state is sufficient approval: report the exact staged paths, but proceed without asking me to repeat the approval. The request becomes stale only if the staged snapshot changes after that post-request check; a difference from an earlier review snapshot does not make it stale. The task-owned `*.spec.ts` and project `AGENTS.md` staging rules are the only exceptions to manual staging. Unrelated dirty changes in the target checkout do not block landing when they can be preserved and restored with their exact staged, unstaged, and untracked boundaries.
- `mmcdw` means: commit the exact staged snapshot, merge it into local `main`, stop and export the worktree-owned nonzero stack, remove the VS Code folder and Git worktree, and release its stack reservation. It grants the same state-specific landing approval as the full request, but never authorizes a push, branch deletion, or persistent-volume deletion; every normal fresh-state and ownership check still applies.

## Preserve state during reviews and Git operations

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
