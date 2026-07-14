# Manual-test recording and reviewer reports

Use this workflow for every AIMVS Computer Use session that tests app behavior, including passed, failed, partial,
and blocked sessions.

## Artifact contract

Each checkout/worktree owns exactly one independent date-prefixed report folder:

```text
manual-test-results/
└── <YYYY-MM-DD>-<worktree-report-slug>/
    ├── index.html
    ├── manual-test-results.md
    ├── <YYYY-MM-DD_HH-MM-SS>-<session-slug>.mp4
    └── <later-session-recordings>.mp4
```

The first manual-test session's local date and slug name the folder. Reuse that folder for every later session in
the same checkout/worktree, even when the date or test area changes. Never copy, move, merge, or consolidate report
entries or recordings between worktrees. Never create a second report folder for the same worktree.

`manual-test-results.md` is the append-only evidence source. `index.html` is the final reviewer-facing artifact and
must be regenerated after every source edit. It is self-contained except for relative links to the Markdown source
and adjacent MP4 recordings, so the reviewer can double-click it and review the results without a server.

Keep this exact visible guardrail directly below the Markdown title and surface it in the HTML report:

> Newest entries for this checkout/worktree appear first. Never copy entries between worktrees; older entries are immutable and remain below newer entries.

## Record the exact test window

Complete sign-in and any credential entry before recording. Never record credentials, tokens, signed URLs,
personal data, another app, the whole display, the user's media, microphone audio, or system audio. If authentication
itself is under test, exclude the sensitive entry portion and record that limitation in the report.

After creating and verifying the dedicated test-browser window and `TEST_WINDOW_ID`, start recording immediately
before the first Computer Use action:

Run the start wrapper as a long-running foreground command in its own persistent exec/terminal session. Never use
command substitution or wait for it to exit: keep the returned session open while testing, and read
`report_directory`, `recording`, and `pid` from its startup output before `recording-started`:

```bash
bash .agents/skills/aimvs-dev/scripts/start-manual-test-recording.sh \
  --window-id "$TEST_WINDOW_ID" \
  --slug project-asset-linking
```

Do not perform the first Computer Use action until the same session prints `recording-started`.

The recorder uses ScreenCaptureKit's `desktopIndependentWindow` filter and refuses non-browser window IDs. It
captures only that exact window at up to 1920 pixels wide, with cursor/click indication and no audio. Keeping its
foreground command session open preserves both the recorder lifetime and the parent process's macOS Screen
Recording permission; detached `nohup` children are reaped by the command runner, while `launchd` jobs do not
inherit the needed capture permission. Never fall back to `screencapture -v`, display capture, rectangle capture,
OBS, QuickTime, or another recorder: those can capture the user's active display or video. Recording must not
activate, raise, move, resize, or cover any window.

After the final Computer Use verification action, stop and validate the recording before doing non-UI log/emulator
checks:

```bash
stop_info="$(bash .agents/skills/aimvs-dev/scripts/stop-manual-test-recording.sh \
  --report-directory "$REPORT_DIRECTORY")"
printf '%s\n' "$stop_info"
```

After the stop wrapper succeeds, wait for the persistent recorder command session to report completion and close.

If startup, recording, or finalization fails, do not substitute a broader capture mode. Preserve any diagnostic
log/partial file, mark the recording evidence blocked or partial, and continue with safe UI/emulator/log evidence
when that still satisfies the requested test. A new coherent Computer Use session gets a new MP4; never overwrite
an earlier recording.

## Add the evidence entry

After emulator and log verification, generate the newest entry and initial HTML. Pass the recording filename from
the same session; omit `--recording` only for an automated-only run or a documented recording failure:

```bash
node .agents/skills/aimvs-dev/scripts/create-manual-test-report.mjs \
  --slug project-asset-linking \
  --result passed \
  --confidence "High — UI, emulator, logs, and focused automated checks agree." \
  --browser Safari \
  --stack 0 \
  --url http://localhost:4200/ \
  --recording "$RECORDING_FILENAME" \
  --area "project asset links" \
  --area "asset import"
```

The generator records the tested base commit, branch, dirty/clean state, changed paths, and working-tree diff
fingerprint. It inserts the newest entry directly below the marker and leaves older entries byte-for-byte below it.
Complete only the new entry in `manual-test-results.md`:

- Keep `confidence` directly below `result`, on one line, at most 200 characters, with the confidence level and
  shortest useful reason.
- State what was tested and why.
- Give each scenario its own `passed`, `failed`, `partial`, or `blocked` result, exact steps, expected behavior, and
  actual behavior.
- Record emulator state, frontend/API/emulator logs, bugs found, fixes made, exact retests, and meaningful gaps.
- Keep bug explanations easy to scan: state the bug/reproduction first, then the solution and retest.
- Never include credentials, tokens, signed URLs, personal data, secrets, or transient local state.

Regenerate the final page after filling the entry:

```bash
node .agents/skills/aimvs-dev/scripts/render-manual-test-report.mjs
```

Before finishing, verify that:

- `index.html` exists and contains the newest result, confidence, scenarios, aggregate counts, and coverage areas;
- every referenced MP4 exists beside it and `ffprobe` reports a playable H.264 video stream;
- the newest run is expanded, older runs remain available, and recordings play through relative file links;
- the Markdown source still contains the insertion marker once and every older entry remains unchanged;
- the folder contains no credentials, logs, PID/state files, temporary recordings, or unrelated artifacts.

Do not stage or commit the folder unless the user asks. When they request the related implementation commit, keep the
report folder and recordings with those code changes unless he explicitly excludes the videos.

## Reading past evidence

Search the relevant checkout/worktree's one report folder first. Use `index.html` for quick review and
`manual-test-results.md` for exact text/fingerprints. If a question spans worktrees, read and label each folder
separately; never merge their histories. Report only what the entries and attached recordings prove, distinguish
clean-commit evidence from dirty-tree evidence, and state gaps instead of inferring coverage.
