# Manual-test screenshot evidence and reviewer reports

Use this workflow for every AIMVS Computer Use session that tests app behavior, including passed, failed, partial,
and blocked sessions.

## Artifact contract

Each checkout/worktree owns exactly one independent date-prefixed report folder:

```text
manual-test-results/
└── <YYYY-MM-DD>-<worktree-report-slug>/
    ├── index.html
    ├── manual-test-results.md
    ├── <YYYY-MM-DD_HH-MM-SS>-<scenario-slug>-before.png
    ├── <YYYY-MM-DD_HH-MM-SS>-<scenario-slug>-after.png
    └── <later-proof-screenshots>.png
```

The first manual-test session's local date and slug name the folder. Reuse that folder for every later session in
the same checkout/worktree, even when the date or test area changes. Never copy, move, merge, or consolidate report
entries or screenshots between worktrees. Never create a second report folder for the same worktree.

The helpers record the owned folder name in that checkout's private Git directory. Any checkout can still see
tracked report folders inherited from other work, but it ignores clean inherited folders and creates its own folder
on the first capture. When this marker is introduced after a checkout already started reporting, the helper adopts
its one locally changed report folder; more than one is ambiguous and stops for review. Do not edit or copy the
private assignment marker between worktrees; later capture, create, and render commands use it to select the same
folder even when several inherited folders are visible.

`manual-test-results.md` is the append-only evidence source. `index.html` is the final reviewer-facing artifact and
must be regenerated after every source edit. It uses relative links to the Markdown source and adjacent screenshots,
so the reviewer can double-click it and review the results without a server. Historical entries may still reference
MP4 recordings; keep those files and render them as legacy evidence, but never create a new recording.

Keep this exact visible guardrail directly below the Markdown title and surface it in the HTML report:

> Newest entries for this checkout/worktree appear first. Never copy entries between worktrees; older entries are immutable and remain below newer entries.

## Capture important before and after moments

Capture a small number of meaningful proof pairs, not every click. Each pair must show the same user-visible area
immediately before the important action and after the observable result has settled. Prefer one pair per behavior
claim. Add another pair only when it proves a distinct state transition, failure path, or regression boundary.

Complete sign-in and any credential entry before capturing evidence. Never capture credentials, tokens, signed
URLs, personal data, another app, the whole display, the user's media, or a broader screen region. If authentication
itself is under test, exclude the sensitive entry portion and state that limitation in the report.

After creating and verifying the dedicated test-browser window and `TEST_WINDOW_ID`, capture the before state:

```bash
before_info="$(bash .agents/skills/aimvs-dev/scripts/capture-manual-test-screenshot.sh \
  --window-id "$TEST_WINDOW_ID" \
  --slug project-asset-linking \
  --phase before)"
printf '%s\n' "$before_info"
REPORT_DIRECTORY="$(sed -n 's/^report_directory=//p' <<<"$before_info")"
BEFORE_SCREENSHOT="$(sed -n 's/^screenshot=//p' <<<"$before_info")"
```

Perform the focused Computer Use steps, wait for the final state, then capture the after state with the same window
ID and scenario slug:

```bash
after_info="$(bash .agents/skills/aimvs-dev/scripts/capture-manual-test-screenshot.sh \
  --window-id "$TEST_WINDOW_ID" \
  --slug project-asset-linking \
  --phase after)"
printf '%s\n' "$after_info"
AFTER_SCREENSHOT="$(sed -n 's/^screenshot=//p' <<<"$after_info")"
```

The capture helper uses ScreenCaptureKit's `desktopIndependentWindow` filter and refuses non-browser window IDs.
It captures one PNG of only that exact window at up to 1920 pixels wide, without activating, raising, moving, or
resizing it, then exits immediately. Never start a continuous recorder or fall back to display capture, rectangle
capture, Preview, OBS, QuickTime, or another capture path.

If capture fails, do not substitute a broader capture mode or reuse an unrelated screenshot. Mark the visual
evidence partial or blocked and continue with safe UI/emulator/log evidence when that still satisfies the requested
test. Never overwrite an earlier screenshot.

## Inspect the actual screenshot pixels

After every proof capture, load each before and after PNG into the model's visual context with a read-only image
inspection tool such as `view_image`. The agent performing the test must actually look at and reason from the
pixels. A successful capture, nonzero dimensions, captions, report rendering, DOM or Accessibility state, and logs
do not prove that the UI looks right.

Inspect the whole visible app window at useful detail, not only the control under test. Compare the before and after
images and check the target behavior plus the surrounding UI for clipped, overlapping, obscured, or off-screen
elements; unexpected wrapping; misalignment or inconsistent spacing; missing text or icons; wrong layering; broken
responsive layout; and stale loading, disabled, or error feedback. Confirm the screenshots actually support their
captions and **What this proves** claim.

If a visual defect was caused by the current task's changes and fixing it stays within the current scope, fix it
automatically, reload or restart as needed, rerun the focused flow, capture fresh proof images, and inspect them
again. Never overwrite the original evidence. If the defect is pre-existing, unrelated, or needs a deeper change to
existing code, do not silently widen the implementation; record the exact issue and affected screenshot under
**Bugs found**, **Points of weirdness**, or **Not verified** as appropriate, and bring it to Ethan's attention in the
final response. If ownership is unclear, inspect the current diff and relevant code; treat unresolved causality as
a verification gap instead of approving the screenshot.

## Add the evidence entry

After emulator and log verification, generate the newest entry and initial HTML. Describe each proof pair with a
short title, literal before/after captions, and one quick-glance sentence explaining what the transition proves:

```bash
node .agents/skills/aimvs-dev/scripts/create-manual-test-report.mjs \
  --slug project-asset-linking \
  --result passed \
  --confidence "High — UI, emulator, logs, and focused automated checks agree." \
  --browser Safari \
  --stack 0 \
  --url http://localhost:4200/ \
  --proof-title "Project link appears after import" \
  --before "$BEFORE_SCREENSHOT" \
  --before-caption "The asset browser has no project link before import." \
  --after "$AFTER_SCREENSHOT" \
  --after-caption "The imported asset shows its new project link." \
  --proves "Importing the asset creates the visible project association without a page refresh." \
  --area "project asset links" \
  --area "asset import"
```

Repeat the six proof arguments beginning with `--proof-title` to add another pair. Omit proof arguments only for a
blocked session where no safe screenshot exists or an automated-only run, and explain that gap in **Not verified**.

The generator records the tested base commit, branch, dirty/clean state, changed paths, and working-tree diff
fingerprint. It verifies every new PNG exists in the report folder, inserts the newest entry directly below the
marker, and leaves older entries byte-for-byte below it. Complete only the new entry in `manual-test-results.md`:

- Keep `confidence` directly below `result`, on one line, at most 200 characters, with the confidence level and
  shortest useful reason.
- State what was tested and why.
- Give each scenario its own `passed`, `failed`, `partial`, or `blocked` result, exact steps, expected behavior, and
  actual behavior.
- Record emulator state, frontend/API/emulator logs, bugs found, fixes made, exact retests, and meaningful gaps.
- Add a **Points of weirdness** section for evidence-backed behavior likely to make the user ask why it works that
  way, even when the test passed. Include surprising asymmetries, misleading names or feedback, hidden writes,
  no-op controls, unexpected coupling or cost, unusual log noise, and unresolved observations. Label each point as
  a confirmed bug, intentional-but-non-obvious behavior, or an open question; write `None` when there are no
  meaningful points.
- Keep bug explanations easy to scan: state the bug/reproduction first, then the solution and retest.
- Never include credentials, tokens, signed URLs, personal data, secrets, or transient local state.

Regenerate the final page after filling the entry:

```bash
node .agents/skills/aimvs-dev/scripts/render-manual-test-report.mjs
```

Before finishing, verify that:

- `index.html` contains the newest result, confidence, scenarios, aggregate counts, coverage areas, and proof-pair
  count;
- every proof appears as a large, vertically scrollable Before → After comparison with both captions and its
  **What this proves** text;
- clicking a proof screenshot opens the full-size image inside the report, and clicking again or pressing Escape
  returns to the same report position without navigating the browser directly to the PNG;
- every referenced PNG exists beside the report, has nonzero dimensions, was actually inspected by the testing
  agent, shows only the dedicated browser window at the intended moment, supports its proof claim, and has no
  unaddressed task-caused visual defect;
- the newest run is expanded and older runs remain available, including any historical MP4 evidence;
- the Markdown source still contains the insertion marker once and every older entry remains unchanged;
- the folder contains no credentials, logs, PID/state files, temporary captures, or unrelated artifacts.

Use a read-only image inspection tool for PNG verification. Never launch, activate, or open Preview.app, and never
automatically open `index.html` or any evidence file at the end of the task. When renderer layout itself changed,
verify the generated HTML in the already assigned dedicated test-browser window without raising it, then leave a
clickable report link in the final response so Ethan decides whether to open it. Do not enable Safari's **Allow
JavaScript from Apple Events** setting merely to scroll or inspect a report; leave browser security settings intact
and combine non-activating visual inspection with deterministic HTML/file checks.

When the personal `ethansk.open-index-in-system-browser` VS Code extension is installed, Ethan can right-click the
report's `index.html` row in the Source Control pane and choose **Open index.html in System Browser**. Treat that as
a user-initiated convenience only; never invoke the command or open the report automatically during handoff.

Do not stage or commit the folder unless the user asks. When they request the related implementation commit, keep
the report folder and screenshots with those code changes unless he explicitly excludes the images.

Always include the newest report entry's **Points of weirdness** in the final response so the user sees them
without opening the report. State `None` explicitly when the section is empty.

## Reading past evidence

Search the relevant checkout/worktree's one report folder first. Use `index.html` for quick review and
`manual-test-results.md` for exact text/fingerprints. If a question spans worktrees, read and label each folder
separately; never merge their histories. Report only what the entries and attached screenshots or historical
recordings prove, distinguish clean-commit evidence from dirty-tree evidence, and state gaps instead of inferring
coverage. Never auto-open the report or Preview while answering a history question.
