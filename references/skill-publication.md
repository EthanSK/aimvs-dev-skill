# Publish the AIMVS development skill

Read before changing or publishing this skill.

- `.agents/skills/aimvs-dev` is tracked as ordinary AIMVS files and mirrored to the public
  `https://github.com/EthanSK/aimvs-dev-skill` repository with Git subtree. Clones and worktrees already contain the
  complete skill; never initialize a nested repository there.

- Treat the AIMVS folder as the authoring source. Validate and commit skill changes in AIMVS, then run
  `npm run aimvs-dev-skill:push` to publish only that folder's history to the public repository. The public repository
  is an output-only mirror: never pull, merge, or otherwise import its history into AIMVS, and expect the guarded
  publisher to replace direct public-repository commits. The guarded push must fail if subtree history contains private
  AIMVS paths; never bypass it with a raw push.

- Never publish ignored credentials, test reports, screenshots, recordings, logs, signed URLs, browser state, or private AIMVS
  source with the public skill. Review the exact subtree diff before every public push.

Original source-ownership decision: Codex task `01a0200e-ba77-7e42-8233-0fb4caa5bc70`.
