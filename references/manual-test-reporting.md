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
    ├── <YYYY-MM-DD_HH-MM-SS>-<important-state-slug>.png
    └── <later-evidence-screenshots>.png
```

The first manual-test session's local date and slug name the folder. Reuse that folder for every later session in
the same checkout/worktree, even when the date or test area changes. Never copy, move, merge, or consolidate report
entries or screenshots between worktrees while recording or reviewing tests. Never create a second report folder for
the same worktree. When Git integrates two branches that independently appended to the same canonical folder,
preserve both immutable entry streams in newest-first order, keep both sets of screenshots, and regenerate
`index.html`; choosing one side would silently erase valid evidence, while creating another folder would make the
report tooling reject the checkout. Do not rewrite an integrated entry that still uses the older `proofs:` metadata;
the renderer shows each surviving legacy PNG as an independent evidence card and ignores deliberately removed files.
The helpers record the owned folder name inside that checkout's private Git directory. Any checkout can still see
tracked report folders inherited from other work, but it ignores clean inherited folders and creates its own folder
on the first capture. When this marker is introduced after a checkout already started reporting, the helper adopts
its one locally changed report folder; more than one is ambiguous and stops for review. Do not edit or copy the
private assignment marker between worktrees; later capture, create, and render commands use it to select the same
folder even when several inherited folders are visible.

`manual-test-results.md` is the append-only evidence source. `index.html` is the final reviewer-facing artifact and
must be regenerated after every source edit. It uses relative links to the Markdown source and adjacent screenshots,
so the reviewer can double-click it and review the results without a server. Keep the readable report markup before
the embedded style block in generated source order so the latest confidence paragraph remains near the top of the
HTML file while the report stays self-contained.

Store manual-test PNGs through Git LFS:

```gitattributes
manual-test-results/**/*.png filter=lfs diff=lfs merge=lfs -text
```

The report generator refuses screenshots whose resolved `filter` attribute is not `lfs`, preventing a later commit
from silently adding large binary blobs to ordinary Git history. Before a requested commit, verify the relevant
paths with `git check-attr filter -- <path>`; after staging only when explicitly requested, verify the staged
screenshots appear in `git lfs ls-files`. When introducing this rule to a repository that already tracks manual-test
PNGs as ordinary blobs, include `git add --renormalize manual-test-results` in that explicitly requested staging
operation; never stage or renormalize pre-emptively.

Keep this exact visible guardrail directly below the Markdown title and surface it in the HTML report:

> Newest entries for this checkout/worktree appear first. Never copy entries between worktrees; older entries are immutable and remain below newer entries.

## Capture only important settled states

Capture a small number of screenshots that make the important verified behavior quick to understand. Each screenshot
stands on its own; do not manufacture or require a paired “before” state. A setup screen usually proves nothing and
can misleadingly imply that old product behavior was recreated. Capture a state only when it materially helps the
reviewer see a result, warning, loading boundary, error path, or regression-sensitive UI.

Never revert, reimplement, or temporarily resurrect earlier product behavior solely to capture visual evidence. The
code diff and test steps describe what changed; screenshots should show only genuine states reached while testing the
current working copy.

Give every screenshot its own short title, literal caption, and narrow **What this proves** claim. The claim must not
assert interactions, persistence, backend state, or timing that the pixels cannot establish by themselves; put that
evidence in the scenario steps and supporting checks instead.

When one narrow area is the main evidence, optionally burn one high-contrast outline and short review label into the
final PNG so it is obvious in VS Code, source control, the HTML report, and any image viewer. Keep highlights narrow
and use at most one per screenshot. The agent chooses the rectangle, one concise explanatory sentence, and the nearest
visually empty label position from the screenshot's proof claim and inspected pixels; the helper does not detect or
guess any of them. Write the label like a quick update to a reviewer, such as `The dialog shows the parsed media error
in full.` Do not split it into a title, dash, and description. Prefer a position immediately beside one outline edge;
move farther away only when every nearby position would cover controls, text, visible media, or evidence. The label has
yellow glyphs with a thin black outline and no background block, but it still must not touch meaningful UI or evidence.
Inspect the full raw screenshot first, then inspect the annotated PNG again; move the text and regenerate from the raw
screenshot if it covers anything. The annotation must never replace whole-window review. Never annotate an older
immutable screenshot or draw a second annotation over an existing one. The helper keeps annotation text readable
across landscape, square, and portrait screenshots and refuses to shrink below its readability floor; shorten the
sentence if it reports that the label does not fit. Recapture instead when the selected area needs to change.

Complete sign-in and credential entry before capturing evidence. Never capture credentials, tokens, signed URLs,
personal data, another app, the whole display, the user's media, or a broader screen region. If authentication itself
is under test, exclude the sensitive entry portion and state that limitation in the report.

After creating and verifying the dedicated test-browser window and `TEST_WINDOW_ID`, wait for an important state to
settle and capture it:

```bash
screenshot_info="$(bash .agents/skills/aimvs-dev/scripts/capture-manual-test-screenshot.sh \
  --window-id "$TEST_WINDOW_ID" \
  --slug global-thumbnail-picker)"
printf '%s\n' "$screenshot_info"
REPORT_DIRECTORY="$(sed -n 's/^report_directory=//p' <<<"$screenshot_info")"
SCREENSHOT="$(sed -n 's/^screenshot=//p' <<<"$screenshot_info")"
```

The capture helper uses ScreenCaptureKit's `desktopIndependentWindow` filter and refuses non-browser window IDs. It
captures one PNG of only that exact window at up to 1920 pixels wide, without activating, raising, moving, or resizing
it, then exits immediately. Never start a continuous recorder or fall back to display capture, rectangle capture,
Preview, OBS, QuickTime, or another capture path.

After inspecting the raw PNG, optionally replace it atomically with an outlined version. Express the rectangle as
`left,top,width,height` percentages of the full screenshot:

```bash
bash .agents/skills/aimvs-dev/scripts/highlight-manual-test-screenshot.sh \
  --screenshot "$REPORT_DIRECTORY/$SCREENSHOT" \
  --highlight "34.3,49,31.5,16.5" \
  --label "The dialog shows the parsed media error in full." \
  --label-position "50,41"
```

To convert a pixel rectangle or label position, divide each horizontal value by the screenshot width and each vertical
value by its height, then multiply by 100. `--label-position` is the label's horizontal center and top edge. Put it in
the nearest clean empty space beside the outline, not over controls, text, visible media, or the highlighted evidence.
The helper rewrites the PNG itself while preserving its dimensions and original metadata. It does not add report
metadata or an HTML-only overlay.

If capture fails, do not substitute a broader capture mode or reuse an unrelated screenshot. Mark the visual evidence
partial or blocked and continue with safe UI/emulator/log evidence when that still satisfies the requested test. Never
overwrite an earlier screenshot.
## Inspect the actual screenshot pixels

After every capture, load each PNG into the model's visual context with a read-only image inspection tool such as
`view_image`. The agent performing the test must actually look at and reason from the pixels. A successful capture,
nonzero dimensions, captions, report rendering, DOM or Accessibility state, and logs do not prove that the UI looks
right.

Inspect the whole visible app window at useful detail, not only the control under test. Check the target behavior and
surrounding UI for clipped, overlapping, obscured, or off-screen elements; unexpected wrapping; misalignment or
inconsistent spacing; missing text or icons; wrong layering; broken responsive layout; and stale loading, disabled,
or error feedback. Confirm that every screenshot actually supports its caption and **What this proves** claim.

If a visual defect was caused by the current task and fixing it stays within scope, fix it automatically, reload or
restart as needed, rerun the focused flow, capture fresh evidence, and inspect it again. Never overwrite the original
evidence. If the defect is pre-existing, unrelated, or needs a deeper change to existing code, do not silently widen
the implementation; record the exact issue and affected screenshot under **Issues and retests**, **Points of weirdness**, or
**Not verified** as appropriate, and bring it to Ethan's attention in the final response. If ownership is unclear,
inspect the current diff and relevant code; treat unresolved causality as a verification gap instead of approving the
screenshot.

## Add the evidence entry

After emulator and log verification, generate the newest entry and initial HTML. Describe each independent screenshot
with its own title, filename, caption, and quick-glance claim:

```bash
node .agents/skills/aimvs-dev/scripts/create-manual-test-report.mjs \
  --slug project-asset-linking \
  --result passed \
  --confidence "High — UI, emulator, logs, and focused automated checks agree." \
  --browser Safari \
  --stack 1 \
  --url http://localhost:4201/ \
  --evidence-title "Imported asset shows its project link" \
  --screenshot "$SCREENSHOT" \
  --caption "The imported asset is visible with its new project link." \
  --proves "The settled asset browser visibly shows the project association." \
  --area "project asset links" \
  --area "asset import"
```

Repeat the four evidence arguments beginning with `--evidence-title` for another important screenshot. Evidence is
optional for a blocked session where no safe screenshot exists or an automated-only run; explain that gap in
**Not verified**.

The generator records the tested base commit, branch, dirty/clean state, changed paths, and working-tree diff
fingerprint. It verifies every new PNG exists in the report folder, inserts the newest entry directly below the
marker, and leaves older entries byte-for-byte below it. Complete only the new entry in `manual-test-results.md`:

- Keep `confidence` directly below `result`, on one line, at most 200 characters, with the confidence level and
  shortest useful reason.
- State what was tested and why.
- Give each scenario its own `passed`, `failed`, `partial`, or `blocked` result, exact steps, expected behavior, and
  actual behavior.
- Record emulator state, frontend/API/emulator logs, issues found, fixes made, exact retests, and meaningful gaps.
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

- `index.html` contains the newest result, confidence, scenarios, aggregate counts, coverage areas, and evidence
  screenshot count;
- the latest confidence `<p>` appears before the embedded `<style>` block in `index.html`, near the top of the file;
- every screenshot appears as a large independent card with its title, caption, and **What this proves** text, in a
  two-column desktop grid that stacks on narrow screens;
- every intentionally highlighted PNG visibly outlines the correct narrow area, uses a brief reviewer-friendly label,
  and keeps both readable without obscuring the evidence;
- clicking any screenshot opens it in an in-page browser-viewport overlay, clicking the enlarged image or pressing
  Escape closes it immediately, native browser fullscreen is never used, and the trigger is keyboard-accessible;
- every referenced PNG exists beside the report, has nonzero dimensions, was actually inspected by the testing
  agent, shows only the dedicated browser window at the intended moment, supports its evidence claim, and has no
  unaddressed task-caused visual defect;
- `git check-attr filter -- <each-png>` reports `lfs` so future commits cannot store it as a normal Git blob;
- the newest run is expanded and older runs remain available;
- the Markdown source still contains the insertion marker once and every older entry remains unchanged;
- the folder contains no credentials, logs, PID/state files, recordings, temporary captures, or unrelated artifacts.

Use a read-only image inspection tool for PNG verification. Never launch, activate, or open Preview.app, and never
automatically open `index.html` or any evidence file at the end of the task. When renderer layout itself changed,
verify the generated HTML in the already assigned dedicated test-browser window without raising it, then leave a
clickable report link in the final response so Ethan decides whether to open it. Do not enable Safari's **Allow
JavaScript from Apple Events** setting merely to scroll or inspect a report; leave browser security settings intact
and combine non-activating visual inspection with deterministic HTML/file checks.

When the personal `ethansk.open-index-in-system-browser` VS Code extension is installed, Ethan can right-click the
report's `index.html` row in the Source Control pane and choose **Open index.html in System Browser**. Treat that as a
user-initiated convenience only; never invoke the command or open the report automatically during handoff.

Do not stage or commit the folder unless the user asks. When they request the related implementation commit, keep the
report folder and screenshots with those code changes unless he explicitly excludes the images.

Always include the newest report entry's **Points of weirdness** in the final response so the user sees them without
opening the report. State `None` explicitly when the section is empty.

## Reading past evidence

Search the relevant checkout/worktree's one report folder first. Use `index.html` for quick review and
`manual-test-results.md` for exact text/fingerprints. If a question spans worktrees, read and label each folder
separately; never merge their histories. Report only what the entries and attached screenshots prove, distinguish
clean-commit evidence from dirty-tree evidence, and state gaps instead of inferring coverage. Never auto-open the
report or Preview while answering a history question.
