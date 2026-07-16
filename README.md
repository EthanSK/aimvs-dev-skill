# AIMVS Dev Skill

> A project-specific Codex skill for running several Git worktrees as isolated local dev stacks, safely controlling real desktop browsers, verifying Firebase-backed behavior, and producing screenshot-based reviewer-friendly manual-test reports.

This skill was built for the private **AI Music Video Studio (AIMVS)** repository. It is public as a complete,
working reference rather than a framework: the commands, ports, browser order, Firebase conventions, and report
workflow intentionally reflect AIMVS. You are welcome to adapt them to your own project.

## What it does

- Assigns predictable frontend, API, inspector, and debug-log ports to concurrent Git worktrees.
- Reuses a shared Firebase emulator stack, with a guarded exclusive workflow for trigger-changing branches.
- Routes each stack to a persistent real browser while keeping testing on the MacBook display and away from the
  user's active workspace or video.
- Handles test-account authentication and App Check without committing credentials.
- Verifies each feature at the UI, emulator-state, and frontend/API-log layers.
- Captures important settled-state PNGs of only the exact dedicated browser window through ScreenCaptureKit—never
  reverted or recreated old behavior, the whole display, or a continuous recording.
- Maintains one append-only Markdown evidence source per worktree and renders a double-clickable HTML report with
  result counts, confidence summaries, coverage areas, independently captioned screenshot cards, and a fast
  click-to-enlarge overlay that stays inside the browser viewport.
- Requires the host repository to store manual-test PNGs through Git LFS so durable evidence does not bloat
  ordinary Git history.
- Preserves durable setup, recovery, and testing discoveries through a continuous-improvement contract.

## Repository layout

```text
SKILL.md                         Codex routing and operating procedure
agents/openai.yaml               Skill-list metadata
references/manual-test-reporting.md
scripts/                         Window setup, screenshot capture, and report tooling
```

## Requirements

- macOS 14 or newer for ScreenCaptureKit's window-only screenshot API.
- Codex with Computer Use for visible browser interaction.
- Git worktrees, Git LFS, Node.js, npm, Swift, and the browsers used by your adapted workflow.
- A host repository whose dev servers, emulator commands, credentials, and logs match—or have been adapted from—
  the AIMVS conventions in `SKILL.md`.

The HTML renderer uses `marked`. Run `npm install` in this repository when the host project does not already
provide that dependency.

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

To update the shared skill, commit and push inside the submodule first, then commit the updated submodule pointer
in the host repository. Do not edit a detached submodule revision without creating or checking out a branch.

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
manual-test-results/**/*.png filter=lfs diff=lfs merge=lfs -text
```

If the host already tracks manual-test binaries without LFS, run `git add --renormalize manual-test-results` as
part of the next intentional staging operation, then verify the staged paths with `git lfs ls-files`.

Keep the safety boundaries: never publish credentials, capture an entire display as a fallback, run a continuous
recorder, auto-open Preview, replace a requested logged-in browser with an isolated profile, or overwrite older
evidence entries.

## Security and privacy

This public repository contains no credentials, tokens, private keys, signed URLs, browser data, screenshots, or
manual-test results. Credential and Firebase project values are loaded from ignored host-repository configuration
at runtime. Before publishing your own adaptation, scan the complete Git diff and history rather than relying only
on `.gitignore`.

## License

[MIT](LICENSE)
