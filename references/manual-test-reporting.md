# Manual-test screenshot evidence and reviewer reports

Use this workflow for every AIMVS Computer Use session that tests app behavior, including passed, failed, partial,
and blocked sessions.

## Contents

- [Artifact contract](#artifact-contract)
- [Capture only important settled states](#capture-only-important-settled-states)
- [Inspect the actual screenshot pixels](#inspect-the-actual-screenshot-pixels)
- [Record the visual review](#record-the-visual-review)
- [Add the evidence entry](#add-the-evidence-entry)
- [Reading past evidence](#reading-past-evidence)

## Artifact contract

Each checkout/worktree owns exactly one independent date-prefixed report folder:

```text
_manual-test-results/
└── <YYYY-MM-DD>-<worktree-report-slug>/
    ├── manual-test-results.md
    ├── <YYYY-MM-DD_HH-MM-SS>-<important-state-slug>.png
    └── <later-evidence-screenshots>.png
```

The first manual-test session's local date and slug name the folder. Reuse that folder for every later session in
the same checkout/worktree, even when the date or test area changes. Never copy, move, merge, or consolidate report
entries or screenshots between worktrees while recording or reviewing tests. Never create a second report folder for
the same worktree. When Git integrates two branches that independently appended to the same canonical folder,
preserve both entry streams in newest-first order and keep every screenshot that still represents current behavior;
choosing one side would silently erase valid evidence, while creating another folder would make the report tooling
reject the checkout. Do not rewrite an integrated entry that still uses the older `proofs:` metadata except to remove
a screenshot that later UI changes made inaccurate; keep each surviving legacy PNG as independent evidence.
The helpers record the owned folder name inside that checkout's private Git directory. Any checkout can still see
tracked report folders inherited from other work, but it ignores clean inherited folders and creates its own folder
on the first capture. When this marker is introduced after a checkout already started reporting, the helper adopts
its one locally changed report folder; more than one is ambiguous and stops for review. Do not edit or copy the
private assignment marker between worktrees; later capture and create commands use it to select the same folder even
when several inherited folders are visible.

`manual-test-results.md` is the append-only reviewer-facing artifact. HTML report generation is disabled, including generic Markdown-to-HTML viewers of this report: do not run
`render-manual-test-report.mjs`, and do not create, update, or delete existing `index.html` files. Keep the dormant
renderer code so Ethan can re-enable it later without rebuilding it.
Self-improved — 2026-10-02: the generic response viewer bypassed the existing no-HTML rule; check the artifact type before invoking any viewer. (Codex task: 01a0ecff-cf98-7541-bcae-a898915b8bd3)

Store manual-test PNGs through Git LFS:

```gitattributes
_manual-test-results/**/*.png filter=lfs diff=lfs merge=lfs -text
```

The report generator refuses screenshots whose resolved `filter` attribute is not `lfs`, preventing a later commit
from silently adding large binary blobs to ordinary Git history. Before a requested commit, verify the relevant
paths with `git check-attr filter -- <path>`; if Ethan has staged screenshots, check them with read-only
`git lfs ls-files`. When introducing this rule to a repository that already tracks manual-test
PNGs as ordinary blobs, report the required renormalization to Ethan; do not stage or renormalize screenshots yourself.

After restoring a dirty worktree through a stash or rebase, inspect every untracked manual-test PNG's actual file
type before accepting the recovery. Git can restore an untracked LFS screenshot as its small text pointer, which
makes image viewers fail even though the filename still ends in `.png`. Report any such pointer and its verified LFS
object to Ethan; do not overwrite or automatically repair the screenshot. LFS pointer incident: Codex task
01a024c0-a524-7960-a57e-f9fa68536e4c. User correction — 2026-09-29 (Codex task:
01a0e8ca-6772-7251-8d07-9979d45bcb56).

Keep this exact visible guardrail directly below the Markdown title:

> Newest entries for this checkout/worktree appear first. Never copy entries between worktrees; retain older run records. Remove outdated or misaligned screenshots and their report references; preserve existing Git staging.

## Capture only important settled states

Capture a small number of screenshots that make the important verified behavior quick to understand. Each screenshot
stands on its own; do not manufacture or require a paired “before” state. A setup screen usually proves nothing and
can misleadingly imply that old product behavior was recreated. Capture a state only when it materially helps the
reviewer see a result, warning, loading boundary, error path, or regression-sensitive UI.

Keep decoded frames, contact-sheet inputs, generated fixtures, derivative media, probe outputs, and superseded recordings in a disposable temporary directory, never under `_manual-test-results` or another reviewable repository path. Retain only the few annotated final screenshots and explicitly requested final recordings that a reviewer will actually open; remove the temporary media after extracting the result.

Keep exactly one final screenshot per capture: the inspected, annotated PNG. Raw captures, normalization inputs and annotation candidates stay in a task-owned temporary directory outside the repository until the final image passes visual review; then copy only that image into the assigned report folder and remove the temporary files. Never retain a raw/annotated pair or parallel `-dotted`, `-annotated` or similar copies of the same capture. Retained-capture protection begins after that final copy, not during temporary preparation. Before finishing, compare the new filenames and capture timestamps and require one retained PNG per capture. User correction — 2026-10-02: four raw captures and their dotted versions were both retained. (Codex task: 01a0ecff-cf98-7541-bcae-a898915b8bd3)

Never revert, reimplement, or temporarily resurrect earlier product behavior solely to capture visual evidence. The
code diff and test steps describe what changed; screenshots should show only genuine states reached while testing the
current working copy.

At the end of every manual test, audit this worktree's task-owned screenshots against the accumulated user requests,
current UI, and fresh Git status. Check each applicable full page, embedded/sidebar view, and layout variant; matching
current code does not prove the request was implemented. If Ethan asks for badges after a header, check that they
share its row when space allows; placing them underneath is not equivalent. Before claiming all evidence is current, record each surface
as verified or blocked and report gaps. For conditional badges, verify both shown and omitted states in their real
caller layouts; a hiding class alone does not prove the badge is invisible. Self-improved — 2026-09-30: a full-page
fix was missed in its Watch sidebar, a matching-but-wrong screenshot was accepted as current, and thumbnail CSS
overrode a badge's hiding class; a below-heading row also failed the requested after-heading alignment. (Codex task: 01a0ecff-cf98-7541-bcae-a898915b8bd3)
At the end of every manual test and after UI changes or rebasing, inspect every task-owned screenshot against the
current UI. Outdated means the screenshot content, not its annotation style: keep still-accurate evidence even when its old annotation style differs from current rules. Delete screenshots with outdated content or visible misalignment that obscures or misrepresents the evidence, including misplaced annotations, and remove their
image and screenshot-metadata references from the report. Preserve historical run text and record the cleanup;
fix in-scope alignment defects before capturing fresh replacements. Never stage or unstage these deletions
automatically, even when Ethan staged the original PNG. User correction — 2026-10-02; supersedes the earlier
preserve-outdated-screenshots instruction. User clarification — 2026-10-04: outdated is about content, not annotation style.

Give every screenshot its own short title, literal caption, and narrow **What this proves** claim. The claim must not
assert interactions, persistence, backend state, or timing that the pixels cannot establish by themselves; put that
evidence in the scenario steps and supporting checks instead.

Every new evidence screenshot must burn one high-contrast, slightly translucent yellow dotted outline and short yellow review label into the
final PNG so it is obvious in VS Code, source control, and any image viewer. This is mandatory even
when the evidence concerns the whole window or animation over time. If no safe label position exists, recapture a
composition that can be annotated or document the verification without retaining that screenshot. Leave extra space
(normally 12–16 captured pixels, measured from the nearest dot edge) between the yellow outline and the highlighted control's own border, focus outline,
text, and icons; also check that gap against neighboring rows and text, especially the line immediately below a badge. If a box around the badge cannot clear both lines, highlight a narrower evidence region or recapture. Self-improved — 2026-10-01: a Comment heading box cleared the badge border but crowded the following body line; compare all four stroke edges with adjacent content before accepting it. (Codex task: 01a0ecff-cf98-7541-bcae-a898915b8bd3) Never trace directly over an existing outline. Keep highlights narrow and use at most one per
screenshot. The agent chooses the rectangle, one concise explanatory sentence, and the
nearest visually empty label position from the screenshot's proof claim and inspected pixels; the helper does not
detect or guess any of them. Write the label like a quick update to a reviewer, such as `The dialog shows the parsed
media error in full.` Do not split it into a title, dash, and description. Prefer a position
immediately beside one outline edge; move farther away only when every nearby position would cover controls, text,
visible media, or evidence. The label has yellow glyphs with a thin black outline and no background block, but it
still must not touch meaningful UI or evidence.
Inspect the full raw screenshot first, then inspect the annotated PNG again; verify each new capture has a dotted rather than continuous outline, regardless of which helper produced it. Do not delete accurate historical evidence solely for an older annotation style; apply the content and evidence-obscuration checks above. User clarification — 2026-10-04.
Zoom in and confirm the yellow stroke
leaves the target's outlines and surrounding container readable through its gaps and slight translucency. Move the rectangle or label and regenerate from the raw screenshot if either
touches useful UI. The annotation must never replace whole-window review. Never annotate a screenshot
from an earlier run or draw a second annotation over an existing one. The helper keeps annotation text readable
across landscape, square, and portrait screenshots and refuses to shrink below its readability floor; shorten the
sentence if it reports that the label does not fit. Recapture instead when the selected area needs to change.

Complete sign-in and credential entry before capturing evidence. Never capture credentials, tokens, signed URLs,
personal data, another app, the whole display, the user's media, or a broader screen region. If authentication itself
is under test, exclude the sensitive entry portion and state that limitation in the report.

If Chromium DevTools was opened during the test, reset any temporary network preset, close DevTools, and verify the
tracked window shows only the app before capturing. Never retain a DevTools screenshot: its Console can expose the
App Check debug token even when the tested panel itself looks harmless.
Immediately before capture, inspect fresh Accessibility state for DevTools panels and confirm the captured pixels
contain only the app; record measurements separately from proof images. Self-improved — 2026-09-30: a progress-gap
capture still showed Console and Network Conditions despite the existing rule (Codex task:
01a09727-c5e5-7672-9047-e0f448963715).

After creating and verifying the dedicated desktop-browser window and `TEST_WINDOW_ID`, wait for an important state
to settle and capture it:

```bash
screenshot_info="$(bash .agents/skills/aimvs-dev/scripts/capture-manual-test-screenshot.sh \
  --window-id "$TEST_WINDOW_ID" \
  --slug global-thumbnail-picker)"
printf '%s\n' "$screenshot_info"
REPORT_DIRECTORY="$(sed -n 's/^report_directory=//p' <<<"$screenshot_info")"
SCREENSHOT="$(sed -n 's/^screenshot=//p' <<<"$screenshot_info")"
RAW_SCREENSHOT="$(sed -n 's/^raw_screenshot=//p' <<<"$screenshot_info")"
```

The capture helper uses ScreenCaptureKit's `desktopIndependentWindow` filter and refuses non-browser window IDs. It
captures one PNG of only that exact window at up to 1920 pixels wide, without activating, raising, moving, or resizing
it into a task-owned temporary directory outside the repository, then exits immediately. Never start a continuous recorder or fall back to display capture, rectangle capture,
Preview, OBS, QuickTime, or another capture path.

For a task-scoped in-app Browser session, do not invent `TEST_WINDOW_ID` or call the ScreenCaptureKit helper. Prepare
the worktree's assigned report directory with `prepare-manual-test-report.mjs`, call the tracked agent tab's
`screenshot({ fullPage: false })` through `$browser:control-in-app-browser`, and save the returned bytes in a task-owned temporary directory outside the repository, reserving one new timestamped `.png` filename for the final evidence. The in-app Browser can return JPEG bytes even though
the capture is destined for a PNG report; after inspecting the raw pixels, run
`normalize-in-app-browser-screenshot.sh --screenshot <absolute-path>`, then run
`file -b --mime-type <absolute-path>` and require `image/png` before annotation; the `.png` extension and a successful
image preview do not prove PNG bytes. Self-improved — 2026-10-02: the picker-free upload test missed normalization and
the annotation helper rejected JPEG captures; the signature check catches this before annotation. Evidence:
`_manual-test-results/2026-10-02-uploads-without-picker/manual-test-results.md` (Codex task:
`01a0fcfd-381c-7361-90da-28b9479c768a`).
When the task's root CWD differs from the verified target worktree, use absolute paths to the task-owned external temporary directory for capture preparation and inside the target worktree for final evidence; a relative path
can resolve in main or a sibling worktree and leave an orphan outside the task's ownership. Verify every temporary
capture path is absent from main and sibling worktrees after the final evidence is saved. (Codex task:
01a0312f-5629-7b23-b7b1-4653b92e9dcc)
Do not merely rename the extension or load the worktree's native `sharp` module inside the Browser runtime; macOS can
reject that native module because the browser process and module signatures have different Team IDs. Capture only the
app viewport, record the filename for the report generator, and verify the tab ID plus `STACK_URL` immediately before
and after capture. Never use full-page or display capture as a substitute for the settled viewport the tester actually
inspected. (Codex task: 01a03a49-3424-7e93-bcd8-f261515ba730)

After inspecting the raw PNG, copy it to a candidate in the same temporary directory and annotate that candidate. Express the rectangle as `left,top,width,height` percentages of the full screenshot:

```bash
ANNOTATED_SCREENSHOT="$(dirname "$RAW_SCREENSHOT")/annotated.png"
cp "$RAW_SCREENSHOT" "$ANNOTATED_SCREENSHOT"
bash .agents/skills/aimvs-dev/scripts/highlight-manual-test-screenshot.sh \
  --screenshot "$ANNOTATED_SCREENSHOT" \
  --highlight "34.3,49,31.5,16.5" \
  --label "The dialog shows the parsed media error in full." \
  --label-position "50,41"
```

To convert a pixel rectangle or label position, divide each horizontal value by the screenshot width and each vertical
value by its height, then multiply by 100. `--label-position` is the label's horizontal center and top edge. Put it in
the nearest clean empty space beside the outline, not over controls, text, visible media, or the highlighted evidence.
The helper rewrites the temporary candidate while preserving its dimensions and original metadata. It does not add a viewer-only overlay. Inspect that candidate's pixels, then require that `$REPORT_DIRECTORY/$SCREENSHOT` does not exist and copy only the accepted candidate there. Remove this capture's raw and candidate files after verifying the retained PNG. If annotation needs adjustment, regenerate the candidate from the temporary raw capture; never create a second retained version.

If capture fails, do not substitute a broader capture mode or reuse an unrelated screenshot. Mark the visual evidence
partial or blocked and continue with safe UI/emulator/log evidence when that still satisfies the requested test. Never
overwrite an earlier screenshot.

## Inspect the actual screenshot pixels

After every capture, load each PNG into the model's visual context with a read-only image inspection tool such as
`view_image`. The agent performing the test must inspect the screenshots itself. Do not use Opus or another external
model for screenshot review unless Ethan explicitly requests it, and do not treat the absence of an external review
as a verification gap. Record your own inspection and any issues in the report. Ethan rejected mandatory Opus
screenshot review; do not reintroduce it. (Codex task: 01a0bec3-1668-72a3-9dcf-84048fd382db) A successful capture,
nonzero dimensions, captions, Markdown metadata, DOM or Accessibility state, and logs do not prove that the UI looks
right.

Inspect the whole visible app window at useful detail, not only the control under test. Check the target behavior and
surrounding UI for clipped, overlapping, obscured, or off-screen elements; unexpected wrapping; misalignment or
inconsistent spacing; missing text or icons; wrong layering; broken responsive layout; and stale loading, disabled,
or error feedback. Confirm that every screenshot actually supports its caption and **What this proves** claim.
For spacing or alignment fixes, reproduce the exact content state in Ethan's report and compare the visible edges he named, such as a floated label, a single-line avatar, and the bottom outline; equal CSS padding or a different wrapped state is not proof. Check empty, short, and wrapped values when their row heights differ, and record the measured gaps and unchanged field height before passing. Self-improved — 2026-09-28: the earlier Channel review checked wrapped names but missed the reported single-line avatar; see the stack 13 spacing entries in `_manual-test-results/2026-09-28-search-prefix-icons/manual-test-results.md` (Codex task: 01a0e8c6-c803-70c2-a1e0-37e123b6dd11).
For selected cards, inspect the longest visible title and every metadata group at desktop and phone widths. Require a
clear inset between text and the card's right edge or selection ring, as well as a gap between independent
neighbouring grid/card rings. Joined row outlines are acceptable only when their established design calls for them;
fix task-owned overflow before keeping evidence or claiming completion. User correction — 2026-09-28 (Codex task:
01a0e8c5-e4a3-7b53-8c02-2c796ab9fe2d).
For a before/after visual regression, reproduce the baseline's interaction state and browser-viewport geometry where
practical; otherwise label each unavoidable difference so the review does not confuse geometry or hover/focus state
with a rendering change.
For a reported interaction defect, replay the user's exact control, action order, timing, and pointer or focus position
before marking it passed. Record a similar action as a separate scenario; it does not verify the reported reproduction.

If a visual defect was caused by the current task and fixing it stays within scope, fix it automatically, reload or
restart as needed, rerun the focused flow, capture fresh evidence, and inspect it again. Never overwrite the original
evidence. If the defect is pre-existing, unrelated, or needs a deeper change to existing code, do not silently widen
the implementation; record the exact issue and affected screenshot under **Issues and retests**, **Points of weirdness**, or
**Not verified** as appropriate, and bring it to Ethan's attention in the final response. If ownership is unclear,
inspect the current diff and relevant code; treat unresolved causality as a verification gap instead of approving the
screenshot.

## Record the visual review

Review every retained screenshot yourself in the current task and record a verdict for each file against its narrow
claim and the current diff. Fix task-caused visible regressions and document meaningful gaps or unrelated observations
as described above. Do not invoke Opus or require a second model or approval; Ethan removed that mandatory step because
of repeated approval requests on 2026-09-21. Existing reports retain their historical review provenance.

## Add the evidence entry

After emulator and log verification, generate the newest Markdown entry. Describe each independent screenshot with
its own title, filename, caption, and quick-glance claim:

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

Before finishing, verify that:

- `manual-test-results.md` contains the newest result, confidence, scenarios, coverage areas, screenshot metadata,
  and **Points of weirdness**;
- every screenshot has its own title, caption, and **What this proves** metadata in the newest Markdown entry;
- every new evidence PNG visibly contains exactly one high-contrast yellow dotted outline and a brief yellow
  reviewer-friendly label without obscuring the evidence; recapture or omit any screenshot that cannot be annotated
  safely, and document the verification gap in the report;
- every referenced PNG exists beside the report, has nonzero dimensions, was actually inspected by the testing
  agent, shows only the dedicated desktop-browser window or task-owned in-app Browser viewport at the intended
  moment, supports its evidence claim, and has no unaddressed task-caused visual defect;
- `git check-attr filter -- <each-png>` reports `lfs` so future commits cannot store it as a normal Git blob;
- the Markdown source still contains the insertion marker once and older run text remains unchanged, except for
  removing outdated or misaligned screenshot references and recording the cleanup;
- no `index.html` file was created, updated, or deleted;
- the folder contains no credentials, logs, PID/state files, recordings, temporary captures, or unrelated artifacts.
- each capture from this run has exactly one retained PNG, with no raw or alternate-annotation twin; temporary preparation files have been removed.

Use a read-only image inspection tool for PNG verification. Never launch, activate, or open Preview.app, and never
automatically open any evidence file at the end of the task.

Leave manual-test reports unstaged unless Ethan explicitly asks to stage a report. Never stage or unstage PNG
screenshots, including to "correct" ones Ethan staged himself; delete outdated or misaligned task-owned evidence
as described above, without overwriting retained captures.
Do not commit the report folder unless Ethan asks. For a requested implementation commit, preserve his exact staged
evidence snapshot. User corrections — 2026-09-28 and 2026-09-29 (Codex task:
01a0e8ca-6772-7251-8d07-9979d45bcb56).

Always include the newest report entry's **Points of weirdness** in the final response so the user sees them without
opening the report. State `None` explicitly when the section is empty.

## Reading past evidence

Search the relevant checkout/worktree's one report folder first and use `manual-test-results.md` for exact
text/fingerprints. If a question spans worktrees, read and label each folder separately; never merge their histories.
Report only what the entries and attached screenshots prove, distinguish clean-commit evidence from dirty-tree
evidence, and state gaps instead of inferring coverage. Never auto-open the report or Preview while answering a
history question.
