# Browser assignment and window control

## Contents

- [Display setup and browser placement](#display-setup-and-browser-placement)
- [In-app Browser overflow fallback](#in-app-browser-overflow-fallback)
- [Browser assignment](#browser-assignment)
- [Background browser control while the user is using the Mac](#background-browser-control-while-the-user-is-using-the-mac)
- [Close the dedicated test browser window](#close-the-dedicated-test-browser-window)
- [Browser crash and recovery](#browser-crash-and-recovery)

## Display setup and browser placement

Ethan uses two setups. Inventory the connected displays before browser setup and classify them by exact
`NSScreen.localizedName`:

- **Standalone MacBook:** `Built-in Retina Display` is the only connected display. Keep the verified test window on
  that sole display without moving or recreating it merely for routing. Background-first control matters most because
  raising the browser covers Ethan's current workspace.
- **MacBook with external monitors:** `Built-in Retina Display` and one or more external displays are connected. Keep
  every AIMVS interaction in one agent-owned window on the built-in display, never test on the external displays, and
  preserve every external-display browser window and Space. A foreground fallback there is usually less intrusive,
  but it remains a fallback after a non-activating attempt.

The task-scoped in-app Browser does not create a macOS window, so it is exempt from physical-display, CoreGraphics
window-ID, and macOS focus rules; keep its exact task-owned agent tab hidden in the background unless visible
interaction is genuinely useful.

Never move, raise, resize, or reposition a Computer Use preview or dedicated test-browser window over a video
the user is watching. Preserve the active playback area and leave the user's media window unobstructed; if the
assigned browser cannot be operated without covering it, stop and report the blocker instead of moving the test
or preview window across the video.

Before the first browser action, assign the browser from the order in **Browser assignment**, set the exact stack
URL, classify the display setup, and inventory the existing desktop windows to prove whether Safari, Firefox, or
Opera is available:

```bash
STACK_INDEX=1 # replace this with the selected free nonzero index for every agent-run test
STACK_URL="http://localhost:$((4200 + STACK_INDEX))/"
swift .agents/skills/aimvs-dev/scripts/inspect-browser-displays.swift
```

The script identifies displays by `NSScreen.localizedName`, converts their live frames into the same coordinate
system as browser windows, and prints the numeric identity and display of each substantial Safari, Firefox, Opera,
or Chrome window. Chrome is included only so its user-owned windows can be inventoried and preserved; never assign
it to an AIMVS test. Record the pre-existing window IDs and whether the assigned browser app was already running;
never claim they were created by the test. Do not infer the display from a window's size, a negative X coordinate,
or whichever display is currently main.

When Safari is assigned, create exactly one dedicated test window and navigate it to the exact stack URL in the
same operation with:

```bash
inspection="$(bash .agents/skills/aimvs-dev/scripts/open-safari-test-window.sh "$STACK_URL")"
printf '%s\n' "$inspection"
TEST_WINDOW_ID="$(sed -n 's/^window=//p' <<<"$inspection")"
```

This derives the window bounds from the live `Built-in Retina Display` frame, creates the window at those bounds,
navigates it, and prints its numeric ID. The helper must never activate Safari, raise a window, or require Safari
to remain frontmost after setup. It deliberately fails before AppleScript when Safari is stopped or hidden: launching
or unhiding Safari can order its window above Ethan's active app without making Safari the active app, so treat Safari
as unavailable and use the next safely assigned browser rather than weakening or bypassing that guard. (Codex task:
01a024f9-f80c-71c0-9005-51c76fc2e18d)

Immediately before creating the window, record the PID and launch time of every standard Safari
`com.apple.WebKit.WebContent` process, then recheck after the first load and retain each process created during that
exact boundary. Refresh the boundary only after an abnormal reload, forced reload, replacement-window load, crash, or
non-responsive-page recovery; ordinary healthy route changes and full navigations do not justify repeated process
forensics. Exclude `WebContent.EnhancedSecurity` and WebKit processes owned by other apps. If another Safari
interaction occurred during the same boundary, treat attribution as ambiguous instead of claiming the new PID. Never
search old task/session logs during cleanup to reconstruct renderer ownership that was not recorded at creation.
(Codex task: 01a0399b-e199-79d2-b4ec-a32664b00adf)

When Firefox or Opera is assigned to a concurrent stack, use that browser's normal persistent profile—never a fresh
or isolated profile. After recording the existing window IDs, create exactly one dedicated window at `STACK_URL`,
place it within the live `Built-in Retina Display` bounds, then immediately re-run the inventory. Accept the window
only when one new ID for the assigned browser appears on that display and the controller state shows `STACK_URL`;
save that ID as `TEST_WINDOW_ID`. When Accessibility returns a window query or collection, bind the exact new window
object before changing its position or size; reusing `item 1` after the first mutation can re-evaluate the query and
resize a pre-existing window instead. This creation-and-placement operation is the only browser action allowed before
verification. If the controller cannot create, identify, and place that exact new window without navigating, moving,
raising, or closing a pre-existing window, stop and report the blocker instead of improvising.

Opera 141 foregrounds itself and returns AppleEvent error `-10000` from `make new window` even though it creates the
window. Never interpret that error alone as failure and never improvise a second window. Try a safely assigned
non-activating browser or creation method first. If Opera is required and that attempt cannot create the window, send
the macOS heads-up and use the guarded helper as the bounded foreground fallback:

```bash
inspection="$(bash .agents/skills/aimvs-dev/scripts/open-opera-test-window.sh "$STACK_URL" --allow-foreground)"
printf '%s\n' "$inspection"
TEST_WINDOW_ID="$(sed -n 's/^window=//p' <<<"$inspection")"
OPERA_SCRIPTING_WINDOW_ID="$(sed -n 's/^scripting_window=//p' <<<"$inspection")"
```

The helper accepts `-10000` only when delayed before/after inventories prove exactly one new Opera scripting window,
then navigates and sizes that exact object in a later AppleEvent and independently resolves one new CoreGraphics ID.
It closes the newly identified scripting window on every later setup failure. This preserves pre-existing Opera
windows and turns the false error into verified window ownership rather than a retry. Any nonzero helper result is
followed by a fresh inventory before any retry. If exactly one task-created window exists, recover that window instead
of creating another. If no window or side effect exists and ownership remains exact, the agent may retry the helper
once; ambiguity or a second failure ends setup. (Codex tasks: 01a0345e-6001-7353-b097-5527ecae7eca,
01a0357e-e591-7381-bc21-f9b5f93ccee7, 01a0361a-9cf7-7dc3-b1b6-381b783854d5)

Do not use an untracked `Cmd+N` workflow or identify/move windows by eye. Window creation and placement are a
one-time setup while the tracked window exists. The Safari helper technically defaults to stack 0 when no URL
argument is provided, but agents must always pass their nonzero `STACK_URL` so they never touch Ethan's stack.

## In-app Browser overflow fallback

Use the in-app Browser after Safari, Firefox, and Opera are already assigned, actively used, incompatible, or unsafe.
Do not report the old three-browser limit as a blocker while the in-app Browser skill is available. Each task uses its
own in-app Browser binding and exactly one new agent-owned tab at its distinct nonzero `STACK_URL`, so concurrent
manual tests are limited only by the available task/stack capacity rather than the three desktop apps.

Invoke and follow `$browser:control-in-app-browser`, select the in-app Browser through that skill's current permitted
selection path, and read its browser documentation before interaction. Use its explicit `iab` selector when Ethan's
current request names the in-app Browser; otherwise let the skill select for `STACK_URL` and require that the result
is the in-app Browser before continuing. Name the browser session with the worktree and stack, create one new agent
tab, record its ID as `TEST_BROWSER_TAB_ID`, navigate it to `STACK_URL`, and verify the exact URL plus the visible
`WORKTREE <NAME> · STACK #N :<PORT>` banner through fresh DOM and screenshot state. Never claim a user tab, reuse
another task's tab, enumerate another task's browser state, or use an in-app Browser tab against stack 0.

The in-app Browser is the explicitly permitted overflow context, not an ad hoc desktop profile. Its tab does not have
`TEST_WINDOW_ID`, a macOS display, or a CoreGraphics identity. Keep it background-only unless live viewing helps the
test, use semantic Browser locators before coordinate input, and reset any temporary viewport override before
cleanup. If the in-app Browser skill or binding is unavailable, report that exact blocker; personal Chrome and a
standalone automation profile are still not fallbacks. (Codex task: 01a03a49-3424-7e93-bcd8-f261515ba730)

After desktop-browser setup, follow the per-action escalation ladder below while Ethan uses the Mac. Prefer
non-activating screenshots, Accessibility state, scripting, and logs. Before a known activating fallback, send the
normal macOS heads-up, capture the frontmost app and a read-only CoreGraphics window-list snapshot, then verify
`TEST_WINDOW_ID` and its exact URL immediately before and after input. The current explicit manual-test request
authorizes that bounded fallback; do not ask for separate foreground permission solely because the verified task
window must briefly become frontmost. The installed Sky Window2 API says input methods activate their target,
and an observed app-targeted `sky.drag` reordered Opera without changing the reported active app, so treat either
active-app or window-order movement as foregrounding but not as a reason to abandon an otherwise authorized test.
Restore the previously frontmost app only when
`TEST_WINDOW_ID` is still the frontmost window; if any other window or app is frontmost, preserve it because Ethan may
have resumed work during the interaction. Do not reintroduce app-level or unconditional focus restoration because
either can override Ethan's newer same-app window or app choice. (Codex tasks:
01a000ff-9a55-7e93-a300-1b6e91ab3dc6, 01a024ca-37e3-7883-89fe-f3233fb75a94,
01a024f9-f80c-71c0-9005-51c76fc2e18d) Before acting on fresh Computer Use state, require its accessibility tree to
show the exact stack URL; if it shows another window or stack, stop Computer Use for that browser session. Never act
on the mismatched state, attempt to re-establish the window through Computer Use, or invoke the creation flow again
while `TEST_WINDOW_ID` still exists. Existing external-display windows belong to the user: never raise, navigate,
move, close, or otherwise interact with them.

`@oai/sky` currently targets Safari by app and can return whichever Safari window is frontmost; it does not accept the
saved Safari window ID as an interaction target. If fresh state therefore returns another Safari window, use the
non-activating ScreenCaptureKit helper for read-only evidence and stop all further Safari Computer Use for that
session. For one essential best-effort background Sky interaction, verify the numeric `TEST_WINDOW_ID`, record the
frontmost app and the read-only CoreGraphics window order, perform only the exact app-targeted action without calling
activation, then recheck both states. If the browser moved forward, reverify the exact task window before continuing;
do not restore apps automatically. When the only usable method is documented to activate its target, rely on the
current manual-test request and send the normal macOS heads-up instead of asking again. Restore the previous app only if
`TEST_WINDOW_ID` is still the frontmost Safari window; if focus has moved elsewhere, leave it there.

The browser must skip a View Transition when `document.visibilityState` is `hidden`. A background Safari window can
therefore complete Angular route activation and expose the destination Accessibility tree while its captured pixels
remain blank or stale. For background route changes, navigate the tracked window directly to the exact destination
URL so Safari performs a full document load without the Router transition, then verify the URL, Accessibility tree,
pixels, and fresh logs again. Do not misdiagnose this as an emulator delay or retry the same in-app navigation. If the
test specifically needs the Router transition itself, use the authorized task window in the foreground after the
normal macOS heads-up. A direct URL
load is only valid for setting up visual evidence; never use it to claim that in-app navigation is reliable or to
investigate a blank RouterOutlet, because it bypasses the exact transition path under test.

Do not treat Opera's AppleScript `set URL of active tab of window id ...` as a background navigation or cleanup
method. In a verified Opera 133 stack-window run, that exact window-scoped command changed the frontmost app from
OBS++ to Opera even though it navigated the intended window successfully. Classify it as an activating fallback,
send the normal heads-up before using it, and restore the previous app only under the exact-window focus rule above;
do not retry it when keeping Opera behind Ethan's work is required. (Codex task:
01a0357e-e591-7381-bc21-f9b5f93ccee7)

Background Safari may also defer an async completion or repaint until its page receives another interaction. Before
reporting a stuck loader on a route that did not use a View Transition, use one harmless in-page interaction such as
opening and closing an existing filter, then read fresh Computer Use state; do not activate or raise Safari to wake
it.

## Browser assignment

Use Safari first for the first agent-owned nonzero AIMVS test stack. Concurrent agent stacks must use different
browsers so Firebase Auth persistence + App Check storage do not fight; assign them in this order: Safari → Firefox
→ Opera → a distinct task-scoped in-app Browser binding for each additional stack. Never use Ethan's personal Chrome
for AIMVS testing, even as a fallback, and never create a fresh or isolated desktop-browser profile to work around
that rule. Never switch away from Safari merely because another browser is already logged in—use the test-account
sign-in flow when Safari needs authentication. Stack 0 is not part of this assignment because agents never test
against it.

Treat a browser Ethan is actively using as unavailable, even when it would otherwise be next in the assignment
order. Never commandeer or repeatedly foreground his active browser; choose the next compatible desktop browser or
the in-app Browser overflow fallback. When a test specifically needs Chromium DevTools, use Opera and stop if Opera
is unavailable; the in-app Browser does not substitute for a DevTools-specific test, and personal Chrome is not a
fallback.

With Ethan's `Dvorak - QWERTY ⌘` input source, character-based `Cmd+Option+I` automation may not toggle Opera
DevTools. After verifying and focusing only the tracked Opera test window, use physical macOS key code `34` with
Command+Option and then verify that docked DevTools actually appeared; do not keep retrying character `i` shortcuts.

The window setup above is conditional on this assignment: use the Safari helper only for Safari, and use the
verified browser-controller flow for Firefox or Opera. Keep every test browser on
`Built-in Retina Display` when other monitors are attached. If the newly created test window opens elsewhere,
move only that new window to `Built-in Retina Display` and re-run the display inventory before interacting. For the
in-app Browser, follow the overflow section instead; do not invent a macOS window or display check for its agent tab.

## Background browser control while the user is using the Mac

The dedicated test window is agent-owned and should remain behind Ethan's current work whenever the action can be
completed and verified there. The user may keep working in other apps and browser windows throughout the test. Prefer
fresh `get_app_state` state, exact-window ScreenCaptureKit captures, Accessibility queries, scripting, and logs before
input.

For an in-app Browser overflow session, operate only `TEST_BROWSER_TAB_ID` through the Browser skill. Its background
tab does not require macOS focus, window-order, or display checks. Require a fresh URL and DOM or screenshot check
before each material interaction, and stop if the tab is missing, stale, or no longer shows the exact stack origin;
recover it only through the Browser skill's documented task-tab flow.

For each discrete click, keypress, text entry, drag, navigation, or browser-control action:

1. Refresh `TEST_WINDOW_ID`, exact stack URL, display, frontmost app, ordered-window state, and the relevant
   postcondition without activating the browser.
2. Attempt the action once with the least activating exact-window method available, then verify whether it worked.
3. If it clearly did not work and ownership remains exact, retry once with a more direct app- or window-scoped method.
   If necessary, the agent may make one final retry that activates or raises only the verified task window. Use
   judgment and skip any retry that cannot add evidence or capability.
4. Before a known activating fallback, send the normal macOS heads-up. The current explicit manual-test request
   authorizes this bounded fallback; do not ask for separate permission solely because the verified task window must
   briefly become frontmost.
5. Re-verify ownership and the postcondition after every attempt, preserve newer user focus, and never retry a
   consequential or state-changing action unless the postcondition proves the earlier attempt did not occur.

For a harmless resize or drag, never infer the reached position from Sky's requested endpoint. Opera 133 visibly
stopped one `sky.drag` at a mid-width boundary even though the requested endpoint was near the intended limit; inspect
fresh pixels or measured state, then use at most one corrective edge drag when the first result is clearly partial and
the exact window still owns the gesture. (Codex task: 01a0357e-e591-7381-bc21-f9b5f93ccee7)

Never repeat the same ignored mechanism or send unscoped global keyboard/pointer input. The maximum is the initial
non-activating attempt plus two progressively more direct retries. A mismatched window, URL, display, ambiguous side
effect, or newer user action stops the sequence immediately. (Codex task:
01a0361a-9cf7-7dc3-b1b6-381b783854d5)

Do not use `CGEventPostToPid` as a background browser-input workaround. A verified Opera 133 run kept Ethan's app
frontmost and preserved the exact task window and URL, but Opera ignored the process-directed double-key shortcut;
do not repeat that mechanism. Count it as the first non-activating attempt, refresh exact state, and use the next more
direct scoped method in the ladder when the action is still necessary. Never escalate to global input. (Codex task:
01a0361a-9cf7-7dc3-b1b6-381b783854d5)

An explicit request to run a Computer Use test authorizes input only inside the verified dedicated test window and
through the ladder above. The ordinary Computer Use confirmation policy still applies to consequential actions such
as credentials, payments, permanent deletion, or sensitive-data transmission. (Codex tasks:
01a024f9-f80c-71c0-9005-51c76fc2e18d, 01a0357e-e591-7381-bc21-f9b5f93ccee7,
01a0361a-9cf7-7dc3-b1b6-381b783854d5)

Keep the tracked window unminimized on `Built-in Retina Display`; a minimized Safari window drops out of Computer
Use targeting. Before every input action, require the current Computer Use state to show the tracked window UUID,
exact stack URL, and worktree banner. Use element-index actions and app-targeted key presses so the action stays scoped
to that window. If any identity is missing or mismatched, do not click coordinates, press keys, reload, close, or
perform another Computer Use action in that browser session. Keep testing behind Ethan's current work. When
foreground interaction is required, use only the final bounded fallback in the ladder above. Never send global
keyboard or pointer input.

Opera can expose the same page twice in one fresh Accessibility tree; the first subtree's element ids reject actions
as invalid while the later subtree contains the focused HTML content. When exact controls are duplicated, act only on
the occurrence in the focused page subtree and refresh state after every interaction instead of selecting the first
text match.

If a native file chooser is visibly attached to the verified task window but its Accessibility action times out,
use a screenshot-derived coordinate click on its visible **Cancel** button and re-query the exact browser window
before treating the chooser as blocked. Do not leave a recoverable chooser for Ethan to dismiss or switch to an
unrelated browser window.

Do not click an Accessibility-disabled control to prove it is a no-op. Computer Use can wait until the control becomes
enabled and then execute a later valid click; prove the disabled state from fresh Accessibility/pixel evidence and
prove duplicate prevention from request or emulator counts instead.

Finish stack health, fixtures, uploads, and test sequencing before the first interaction. Keep waits, shell work,
screenshot capture, and report generation in the background. Use the same stack URL, `.secret.local` credentials,
and App Check debug token as the assigned browser surface; do not create any browser context beyond the permitted
desktop profiles or the task-scoped in-app Browser overflow binding.

If an action unexpectedly foregrounds the verified task window, stop that input and re-check ownership, window
identity, URL, logs, pixels, and postcondition. Continue only when the exact task target remains proven and no newer
user focus would be overridden; otherwise preserve Ethan's newer state and stop the sequence. Never restore the page
or focus with ambiguous keys or coordinates.

Treat the test browser window appearing above Ethan's active window as foregrounding even when System Events still
reports another app as frontmost. The installed Sky API says Window2 input methods activate their target, while an
observed app-targeted `sky.drag` reordered the target window without changing the reported active app. This is why the
agent must check both active-app and ordered-window state and reverify the exact task target before continuing.
(Codex task: 01a024f9-f80c-71c0-9005-51c76fc2e18d)

Keep foreground control bounded to the exact fallback action announced by the macOS heads-up. Restore the previously
frontmost app only when `TEST_WINDOW_ID` remains the frontmost window; otherwise preserve Ethan's newer focus choice.
End the interval after restoration, an unexpected failure, or newer user activity; a later action starts again with
its own non-activating attempt. (Codex tasks: 01a0357e-e591-7381-bc21-f9b5f93ccee7,
01a0361a-9cf7-7dc3-b1b6-381b783854d5)

Computer Use currently has no pointer-only move action. Do not fake a hover by dragging across page text because that
selects the text and contaminates screenshot evidence. For an editable name whose cancel path is already proven
non-mutating, click the name, verify edit mode, then press Escape without moving the pointer so its display tooltip can
appear; otherwise use a controller with a real pointer move or report that the hover could not be captured safely.

Safari can expose a collapsed Angular expansion-panel header and its hidden child actions as one composite button. If
the header's Accessibility description includes action labels from inside the collapsed panel, never invoke its primary
click: the click can activate a hidden dev or management action instead of expanding the panel. Try the explicitly
exposed `Expand` secondary action once; if neither Accessibility state nor pixels change and coordinate input is
unavailable, report the panel interaction as blocked instead of clicking the composite target.

If the browser keeps defocusing, typed text lands in the wrong place, or Computer Use reports that the user changed
the app mid-action, assume the user is using the computer. Stop that input, preserve the newer focus choice, and
continue non-UI work until fresh read-only state proves the dedicated task window can be targeted safely. Do not
reuse an earlier attempt or assume the next action requires focus; restart the ladder from a non-activating method and
report a blocker when exact targeting remains ambiguous.

## Close the dedicated test browser window

At the end of every Computer Use manual-test session—passed, failed, partial, or blocked—finish capturing and
verifying the report evidence, then close the exact dedicated task page identified by `TEST_WINDOW_ID` or
`TEST_BROWSER_TAB_ID` and `STACK_URL`. Do not leave it open merely because development work will continue.

For an in-app Browser session, call `close()` only on the tracked agent tab, then require its ID to be absent from the
current task's `browser.tabs.list()` result. Do not claim or close user tabs, and do not inspect other tasks to prove
cleanup. Empty task-tab and user-tab lists are normal after closure and do not invalidate the reusable browser
binding.

Close only `TEST_WINDOW_ID` with the assigned controller, then re-run the browser-display inventory. Normally require
that ID to be gone. If Ethan or another task added an unrelated tab to the tracked Safari window, preserve the shared
window and close only the single tab whose URL has the exact `STACK_URL` origin; then require that origin to be absent
from every Safari window. Never close a whole window merely because it started as task-owned after its tab ownership
changed, and never target a pre-existing window by title, position, or sight. Try exact-window background closure
first. If it clearly fails while ownership remains exact, use the bounded ladder, including a final foreground
fallback after the heads-up when necessary. If the test launched an otherwise stopped browser app, quit it only after
the tracked window closes and only when it has no other windows. If exact cleanup cannot be proven safe, leave the
tracked window alone and report cleanup as blocked instead of closing another window or app. (Codex tasks:
01a0357e-e591-7381-bc21-f9b5f93ccee7, 01a0361a-9cf7-7dc3-b1b6-381b783854d5,
01a0399b-e199-79d2-b4ec-a32664b00adf)

For an Opera window created by the guarded helper, close and verify both tracked identities with:

```bash
bash .agents/skills/aimvs-dev/scripts/close-opera-test-window.sh \
  "$TEST_WINDOW_ID" "$OPERA_SCRIPTING_WINDOW_ID"
```

If a Safari Computer Use close times out and the next state attaches to an unrelated sheet or window, do not click
the new state or send an app-wide `Cmd+W`. Re-read the tracked numeric `TEST_WINDOW_ID` and its exact URL with
Safari AppleScript, require exactly one matching window, close that exact window by ID, then re-run the display
inventory and require the ID to be gone. This Safari-only fallback preserves unrelated sheets and windows when
Computer Use loses its original window target during the close.

For a healthy Safari session with no recorded surviving task-created renderer, cleanup is complete when the exact
task tab/window is closed and its stack origin is absent from every Safari window. Use the deeper renderer check only
when a recorded task-created WebContent PID survives or the page crashed, froze, or became non-responsive. In that
case, wait up to ten seconds, inspect the unchanged PID, launch time, command, CPU, physical footprint, and
Safari-container files, and require the exact stack origin to be absent. A renderer recorded during the exact abnormal
test boundary and still running after those checks is a proven active orphan, not a `Z` zombie. Stop only that PID
using `INT`, then `TERM`, then `KILL` if required, rechecking after each signal. Verify Safari's pre-existing windows
and processes remain present afterward. If attribution, current tab ownership, or concurrent Safari activity is
ambiguous, do not signal anything: report the cleanup blocker and ask Ethan to quit Safari. Never search historical
logs for a PID or rely on a 24-hour stack check to resolve a known surviving renderer.

Safari on macOS 26 can retain a closed window as an invisible, tabless AppleScript record even after an exact-window
close. Treat that record as closed only when the browser-display inventory no longer exposes the ID, `visible` is
false, the current tab is unavailable, the exact stack origin is absent from every Safari window, and the recorded
task-created renderer is absent. Do not quit Safari, close another hidden record, or disturb unrelated Safari state
merely to make the stale numeric record disappear. (Codex task: 01a024c0-a524-7960-a57e-f9fa68536e4c)

After the browser window is proven closed, complete the agent-owned stack cleanup routed from the main `SKILL.md`.
The session is not cleaned up until both its browser window and its stack processes and terminal window are gone,
unless Ethan explicitly asked to keep that exact nonzero stack running.

## Browser crash and recovery

If the browser crashes, freezes, loses its window, or restores a previous session mid-test, do not abandon the
task. First inventory browser windows and confirm whether `TEST_WINDOW_ID` still exists. If it exists, recover only
that window and restore `STACK_URL`. If it no longer exists, the one-window rule permits one replacement after a
non-activating setup attempt and the normal heads-up before any activating fallback. Record the new ID and verify its
process, display, and `STACK_URL` before interacting. If creation clearly fails with no window or side effect, the
agent may make one final more-direct creation retry; ambiguity or another failure ends recovery. Never repurpose a
pre-existing window as the replacement. Verify authenticated state again and continue from the last reliable
checkpoint. Capture useful crash/report text or visible error details if available, then check frontend/API/emulator
logs to decide whether the crash was browser instability or an app-triggered failure.

For an in-app Browser tab that becomes stale or disappears, keep the existing browser binding and follow the Browser
skill's tab-recovery guidance: discard only the stale tab handle, create one replacement agent tab, record its new ID,
and reverify `STACK_URL`, the worktree banner, authentication, and logs before continuing. Never reselect the browser
merely to recover a tab.

When Safari reports a page as non-responsive, finish the renderer-exit procedure above before creating any
replacement or switching browsers. A force reload that creates another renderer does not clean up the hung one.
If the replacement is also blank, frozen, or non-responsive, close and verify it once, then stop using Safari for
that run and continue only with the next safely assigned browser. Non-responsive state does not broaden the test
scope. Diagnose the exact tracked Safari window through the same background-first ladder; send the normal heads-up
before its final activating fallback. (Codex tasks: 01a0357e-e591-7381-bc21-f9b5f93ccee7,
01a0361a-9cf7-7dc3-b1b6-381b783854d5)

After a crash or forced browser restart, always re-check emulator state and operation status docs before retrying
the action. This avoids double-running a mutation while the previous backend operation actually succeeded.
