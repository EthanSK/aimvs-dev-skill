# AIMVS Dev Skill

> A project-specific Codex skill for running several Git worktrees as isolated local dev stacks, safely controlling persistent desktop browsers or task-scoped in-app Browser overflow sessions, verifying Firebase-backed behavior, and producing screenshot-based reviewer-friendly manual-test reports.

This skill was built for the private **AI Music Video Studio (AIMVS)** repository. It is public as a complete,
working reference rather than a framework: the commands, ports, browser order, Firebase conventions, and report
workflow intentionally reflect AIMVS. You are welcome to adapt them to your own project.

The AIMVS repository is the only authoring source for Ethan's copy. This public repository is an output-only mirror;
direct commits here can be replaced by its guarded publisher and are never imported back into AIMVS.

## What it does

- Assigns predictable frontend, API, inspector, and debug-log ports to concurrent Git worktrees.
- Keeps stack 0 in Ethan's main environment and gives every nonzero stack its own private Firebase, Storage, MinIO,
  and Download Assets Worker backend.
- Routes each stack through Safari, Firefox, or Opera first, then through task-scoped in-app Browser sessions without
  imposing a three-browser concurrency cap. Desktop testing stays on the MacBook display and away from the user's
  active workspace or video.
- Handles test-account authentication and App Check without committing credentials.
- Verifies each feature at the UI, emulator-state, and frontend/API-log layers.
- Captures important settled-state PNGs through exact-window ScreenCaptureKit for desktop browsers or the tracked
  in-app Browser tab's viewport API—never reverted or recreated old behavior, the whole display, or a continuous
  recording.
- Maintains one append-only Markdown evidence source per worktree with independently captioned screenshot evidence.
  Automatic HTML report rendering is currently disabled; the dormant renderer remains available for later use.
- Requires the host repository to store manual-test PNGs through Git LFS so durable evidence does not bloat
  ordinary Git history.
- Preserves durable setup, recovery, and testing discoveries through a continuous-improvement contract.

## Repository layout

```text
SKILL.md                             Concise operating contract and reference router
agents/openai.yaml                   Skill-list metadata
references/worktree-lifecycle.md     Task-environment and linked-worktree lifecycle
references/stack-lifecycle.md        Dev-stack setup, health, and cleanup
references/git-state-and-code-review.md  Git-state preservation and code review
references/emulator-safety.md        Emulator ownership, data drift, and recovery
references/browser-control.md        Browser assignment and exact-window safety
references/authentication.md         Test-account and App Check workflow
references/manual-verification.md    Four-layer feature verification
references/manual-test-reporting.md  Screenshot evidence and report workflow
scripts/                             Window setup, screenshot capture, and report tooling
```

## Requirements

- macOS 14 or newer for ScreenCaptureKit's window-only screenshot API.
- Codex with Computer Use and the in-app Browser skill for visible or overflow browser interaction.
- Git worktrees, Git LFS, Node.js, npm, Swift, and the browsers used by your adapted workflow.
- A host repository whose dev servers, emulator commands, credentials, and logs match—or have been adapted from—
  the AIMVS conventions routed by `SKILL.md`.

The dormant HTML renderer uses `marked`. Its dependency remains installed so the renderer can be re-enabled later.

## Install as an exact Git reference

Use a submodule when you want the host repository and this public repository to point at the exact same skill
commit:

```bash
git submodule add https://github.com/EthanSK/aimvs-dev-skill.git .agents/skills/aimvs-dev
git commit -m "chore: link AIMVS dev skill"
```

After cloning the host repository:

```bash
git submodule update --init --recursive
```

To update an installed copy after Ethan publishes a new revision, fetch and check out that public revision, then
commit the updated submodule pointer in the host repository. Fork the public repository before authoring your own
adaptation; do not treat a direct commit to Ethan's public mirror as an upstream change to AIMVS.

## Adapt it to another project

At minimum, review and change:

1. The `aimvs-dev` name, description, and `agents/openai.yaml` metadata.
2. Dev-server commands, port offsets, log filenames, and health checks.
3. Emulator ownership rules and project-specific Firestore/Auth conventions.
4. Browser order, display name, window-opening helpers, and authentication flow.
5. Ignored credential filenames and environment-variable names.
6. Manual-test report title, coverage language, and any host-repository `AGENTS.md` instructions.

Add these rules to the host repository's `.gitattributes` before capturing evidence:

```gitattributes
_manual-test-results/**/*.png filter=lfs diff=lfs merge=lfs -text
```

If the host already tracks manual-test binaries without LFS, run `git add --renormalize _manual-test-results` as
part of the next intentional staging operation, then verify the staged paths with `git lfs ls-files`.

Keep the safety boundaries: never publish credentials, capture an entire display as a fallback, run a continuous
recorder, auto-open Preview, replace a requested logged-in desktop browser with an ad hoc isolated profile, reuse
another task's in-app Browser tab, or overwrite older evidence entries.

## Security and privacy

This public repository contains no credentials, tokens, private keys, signed URLs, browser data, screenshots, or
manual-test results. Credential and Firebase project values are loaded from ignored host-repository configuration
at runtime. Before publishing your own adaptation, scan the complete Git diff and history rather than relying only
on `.gitignore`.

## License

[MIT](LICENSE)
