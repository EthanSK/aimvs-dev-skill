# Git state and code review

Review the effective working tree by default. Do not report staged-versus-unstaged differences or index composition
as code-review findings unless Ethan explicitly asks for an index or staging audit; he normally reviews first and
stages manually afterward.

When preserving a dirty worktree through a stash or rebase, restore with `git stash apply --index` when safe and
verify the staged and unstaged patches separately before dropping the recovery stash. Restored file contents alone
do not prove that the index was restored.
