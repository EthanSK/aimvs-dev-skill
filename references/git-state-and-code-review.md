# Git state and code review

Review the effective working tree by default. Do not report staged-versus-unstaged differences or index composition
as code-review findings unless Ethan explicitly asks for an index or staging audit; he normally reviews first and
stages manually afterward.

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
