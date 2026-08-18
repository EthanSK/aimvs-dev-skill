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
verify the staged and unstaged patches separately before dropping the recovery stash. Restored file contents alone
do not prove that the index was restored.

If the rebase or later dirty-state restoration reports conflicts, stop with every conflicting path unresolved and
unmerged so Ethan can inspect it. Never resolve, stage, `git add`, continue, skip, abort, or choose ours/theirs unless
Ethan explicitly asks. Git represents visible conflicts as unmerged index entries rather than ordinary unstaged
files; treat that unmerged state as the required meaning of "leave conflicts unstaged," restore only proven
non-conflicting staged/unstaged boundaries, and keep the exact recovery stash until the conflicts are resolved and
the restored state is verified.

Capture the new stash's immutable commit hash immediately and use that hash for every later inspect/apply command.
Stash ordinals such as `stash@{0}` are shared across worktrees and can move when another task creates a stash, so a
saved ordinal can silently replay another task's state into a recovery worktree.
