# Browser assignment and window control

## Contents

- [Non-negotiable browser display](#non-negotiable-browser-display)
- [Browser assignment](#browser-assignment)
- [Background browser control while the user is using the Mac](#background-browser-control-while-the-user-is-using-the-mac)
- [Close the dedicated test browser window](#close-the-dedicated-test-browser-window)
- [Browser crash and recovery](#browser-crash-and-recovery)

## Non-negotiable browser display

Every AIMVS browser interaction must happen on the MacBook's display named `Built-in Retina Display`. Never test
on either external display (including the ultrawide or the Dell), and never disturb an existing external-display
browser window.

Never move, raise, resize, or reposition a Computer Use preview or dedicated test-browser window over a video
the user is watching. Preserve the active playback area and leave the user's media window unobstructed; if the
assigned browser cannot be operated without covering it, stop and report the blocker instead of moving the test
or preview window across the video.

Before the first browser action, assign the browser from the order in **Browser assignment**, set the exact stack
URL, and inventory the existing windows:

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
to remain frontmost after setup.

Immediately before creating the window, record the PID and launch time of every standard Safari
`com.apple.WebKit.WebContent` process. Recheck after the first load and after every later full navigation, reload,
forced reload, or replacement-window load; retain each process that appeared during that exact test action as a
task-created renderer. Exclude `WebContent.EnhancedSecurity` and WebKit processes owned by other apps. If another
Safari interaction occurred during the same boundary, treat attribution as ambiguous instead of claiming the new
PID. This tracking is mandatory because Safari page processes are launchd children and can survive after their
owning window disappears.

When Firefox or Opera is assigned to a concurrent stack, use that browser's normal persistent profile with the
applicable Computer Use/browser controller—never a fresh or isolated profile. After recording the existing window
IDs, create exactly one dedicated window at `STACK_URL`, place it within the live
`Built-in Retina Display` bounds, then immediately re-run the inventory. Accept the window only when one new ID
for the assigned browser appears on that display and the controller state shows `STACK_URL`; save that ID as
`TEST_WINDOW_ID`. This creation-and-placement operation is the only browser action allowed before verification.
If the controller cannot create, identify, and place that exact new window without navigating, moving, raising,
or closing a pre-existing window, stop and report the blocker instead of improvising.

Do not use an untracked `Cmd+N` workflow or identify/move windows by eye. Window creation and placement are a
one-time setup while the tracked window exists. The Safari helper technically defaults to stack 0 when no URL
argument is provided, but agents must always pass their nonzero `STACK_URL` so they never touch Ethan's stack.

After setup, prefer background control so Ethan can keep using the Mac; do not repeatedly run display/focus scripts
or use an app-level Computer Use `Raise` merely to wake or find a browser. When the verified controller genuinely
needs the test document foregrounded, use one brief, announced focus change on `TEST_WINDOW_ID` and complete only the
blocked interaction. Restore the previously frontmost app only when `TEST_WINDOW_ID` is still the frontmost window;
if any other window or app is frontmost, preserve it because Ethan may have resumed work during the interaction. Do
not reintroduce app-level or unconditional focus restoration because either can override Ethan's newer same-app
window or app choice. (Codex task: 01a000ff-9a55-7e93-a300-1b6e91ab3dc6) Before acting on fresh Computer Use state,
require its accessibility tree to show the exact stack URL; if it shows another window or stack, re-establish and
verify the tracked window before interacting. Never invoke the creation flow again while `TEST_WINDOW_ID` still
exists. Existing external-display windows belong to the user: never raise, navigate, move, close, or otherwise
interact with them.

`@oai/sky` currently targets Safari by app and can return whichever Safari window is frontmost; it does not accept the
saved Safari window ID as an interaction target. If fresh state therefore returns another Safari window, prefer the
non-activating ScreenCaptureKit helper for read-only evidence. When an interaction genuinely requires `@oai/sky`, a
brief targeted `activate`/`set index` or Computer Use `Raise` is acceptable after the normal macOS heads-up: verify the
numeric `TEST_WINDOW_ID`, remember the previously frontmost app, perform the smallest interaction, then restore that
app only if `TEST_WINDOW_ID` is still the frontmost Safari window. If focus has moved elsewhere, leave it there. Never
keep Safari foregrounded or repeatedly reclaim focus; if Ethan is actively using Safari or focus changes again, defer
with the focus-instability backoff below or choose the next available browser.

The browser must skip a View Transition when `document.visibilityState` is `hidden`. A background Safari window can
therefore complete Angular route activation and expose the destination Accessibility tree while its captured pixels
remain blank or stale. For background route changes, navigate the tracked window directly to the exact destination
URL so Safari performs a full document load without the Router transition, then verify the URL, Accessibility tree,
pixels, and fresh logs again. Do not misdiagnose this as an emulator delay or retry the same in-app navigation. If the
test specifically needs the Router transition itself, stop and request foreground permission instead. A direct URL
load is only valid for setting up visual evidence; never use it to claim that in-app navigation is reliable or to
investigate a blank RouterOutlet, because it bypasses the exact transition path under test.

Background Safari may also defer an async completion or repaint until its page receives another interaction. Before
reporting a stuck loader on a route that did not use a View Transition, use one harmless in-page interaction such as
opening and closing an existing filter, then read fresh Computer Use state; do not activate or raise Safari to wake
it.

## Browser assignment

Use Safari first for the first agent-owned nonzero AIMVS test stack. Concurrent agent stacks must use different
browsers so Firebase Auth persistence + App Check storage do not fight; assign them in this order: Safari → Firefox
→ Opera. Never use Ethan's personal Chrome for AIMVS testing, even as a fallback, and never create a fresh or
isolated Chrome profile to work around that rule. If all three permitted browsers are assigned, incompatible with
the test, or unsafe to operate, stop and report the blocker. Never switch away from Safari merely because another
browser is already logged in—use the test-account sign-in flow when Safari needs authentication. Stack 0 is not part
of this assignment because agents never test against it.

Treat a browser Ethan is actively using as unavailable, even when it would otherwise be next in the assignment
order. Never commandeer or repeatedly foreground his active browser; choose the next browser compatible with the
test, and stop if none is available. When a test specifically needs Chromium DevTools, use Opera and stop if Opera
is unavailable; personal Chrome is not a fallback.

With Ethan's `Dvorak - QWERTY ⌘` input source, character-based `Cmd+Option+I` automation may not toggle Opera
DevTools. After verifying and focusing only the tracked Opera test window, use physical macOS key code `34` with
Command+Option and then verify that docked DevTools actually appeared; do not keep retrying character `i` shortcuts.

The window setup above is conditional on this assignment: use the Safari helper only for Safari, and use the
verified browser-controller flow for Firefox or Opera. Keep every test browser on
`Built-in Retina Display` when other monitors are attached. If the newly created test window opens elsewhere,
move only that new window to `Built-in Retina Display` and re-run the display inventory before interacting.

## Background browser control while the user is using the Mac

The dedicated test window is agent-owned, so operate it in the background without asking Ethan for exclusive control.
The user may keep working in other apps and browser windows throughout the test. Routine background Computer Use
actions do not need a macOS heads-up.

An explicit request to run a Computer Use test authorizes clicking, typing, and navigating inside that test's exact
dedicated browser window. Prefer keeping it in the background, but the request also authorizes one brief, announced
activation or raise when the verified controller genuinely requires foreground state; restore the previously
frontmost app afterward only when `TEST_WINDOW_ID` remains the frontmost window. It does not authorize sustained
foreground control, moving, resizing, or reordering the window. Do not ask for separate keyboard or mouse permission;
the ordinary Computer Use confirmation policy still applies to consequential actions such as credentials, payments,
permanent deletion, or sensitive-data transmission.

Keep the tracked window unminimized on `Built-in Retina Display`; a minimized Safari window drops out of Computer
Use targeting. Before every action, require the current Computer Use state to show the tracked window UUID, exact
stack URL, and worktree banner. Use element-index actions and app-targeted key presses so clicks, scrolling, and
typing stay scoped to that window. Keep routine testing in the background where possible; when a brief foreground
interaction is necessary, follow the bounded focus-and-restore workflow above. Never send global keyboard or pointer
input.

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
and App Check debug token as the normal visible browser; do not switch to an isolated browser mode.

If an action unexpectedly steals focus, targets a different window, or is changed by the user's simultaneous input,
stop that sequence and re-check the exact window and URL read-only. Prefer a focus-preserving background retry; use at
most one deliberate, announced foreground retry through the bounded workflow above when the controller requires it.
Do not repeatedly interrupt Ethan or ask for exclusive control as the fallback; defer or report a controller
limitation when the required interaction still cannot be completed safely.

Sustained foreground control is opt-in only when Ethan explicitly asks for it. A brief focus change required by the
verified controller is part of an authorized manual test, but still needs the macOS heads-up. Restore the previously
frontmost app only when `TEST_WINDOW_ID` remains the frontmost window; otherwise preserve Ethan's newer focus choice.
A View Transition test in any browser still requires explicit foreground permission because it intentionally keeps
the test document frontmost.

Computer Use currently has no pointer-only move action. Do not fake a hover by dragging across page text because that
selects the text and contaminates screenshot evidence. For an editable name whose cancel path is already proven
non-mutating, click the name, verify edit mode, then press Escape without moving the pointer so its display tooltip can
appear; otherwise use a controller with a real pointer move or report that the hover could not be captured safely.

Safari can expose a collapsed Angular expansion-panel header and its hidden child actions as one composite button. If
the header's Accessibility description includes action labels from inside the collapsed panel, never invoke its primary
click: the click can activate a hidden dev or management action instead of expanding the panel. Try the explicitly
exposed `Expand` secondary action once; if neither Accessibility state nor pixels change and coordinate input is
unavailable, report the panel interaction as blocked instead of clicking the composite target.

If the browser keeps defocusing, typed text lands in the wrong place, or Computer Use reports that the user
changed the app mid-action, assume the user is probably using the computer. Stop the immediate click/type loop and
retry with exponential backoff: wait 1 minute, then 2 minutes, then 4, 8, 16, 32, and cap at 60 minutes. Re-check
`get_app_state` after each wait before continuing. Do not keep burning retries while focus is unstable.

## Close the dedicated test browser window

At the end of every Computer Use manual-test session—passed, failed, partial, or blocked—finish capturing and
verifying the report evidence, then close the exact dedicated window identified by `TEST_WINDOW_ID`. Do not leave
it open merely because development work will continue.

Close only `TEST_WINDOW_ID` with the assigned controller, then re-run the browser-display inventory and require
that ID to be gone. Never target a pre-existing window by title, position, or sight. If the test launched an
otherwise stopped browser app, quit it only after the tracked window closes and only when it has no other windows.
If exact cleanup cannot be proven safe, report it as blocked instead of closing another window or app.

If a Safari Computer Use close times out and the next state attaches to an unrelated sheet or window, do not click
the new state or send an app-wide `Cmd+W`. Re-read the tracked numeric `TEST_WINDOW_ID` and its exact URL with
Safari AppleScript, require exactly one matching window, close that exact window by ID, then re-run the display
inventory and require the ID to be gone. This Safari-only fallback preserves unrelated sheets and windows when
Computer Use loses its original window target during the close.

For Safari, window cleanup is still incomplete at this point. Wait up to ten seconds and require every
task-created WebContent PID recorded during the test to exit. If one survives, inspect its unchanged PID, launch
time, command, CPU, physical footprint, and Safari-container files; also require `TEST_WINDOW_ID` to be gone and
the exact stack origin to be absent from every remaining Safari window. A renderer that appeared during the exact
test action and still runs after those checks is a proven active orphan, not a `Z` zombie. Stop only that PID using
`INT`, then `TERM`, then `KILL` if required, rechecking after each signal. Verify Safari's pre-existing windows and
processes remain present afterward. If attribution, current tab ownership, or concurrent Safari activity is
ambiguous, do not signal anything: report the cleanup blocker immediately and ask Ethan to quit Safari. Never let
the task finish, open another Safari replacement, or rely on the 24-hour stack check while the renderer remains.

After the browser window is proven closed, complete the agent-owned stack cleanup routed from the main `SKILL.md`.
The session is not cleaned up until both its browser window and its stack processes and terminal window are gone,
unless Ethan explicitly asked to keep that exact nonzero stack running.

## Browser crash and recovery

If the browser crashes, freezes, loses its window, or restores a previous session mid-test, do not abandon the
task. First inventory browser windows and confirm whether `TEST_WINDOW_ID` still exists. If it exists, recover only
that window and restore `STACK_URL`. If it no longer exists, the one-window rule permits exactly one replacement:
repeat the assigned browser's creation-and-placement flow, record the new ID, and verify its process, display, and
`STACK_URL` before interacting. Never repurpose a pre-existing window as the replacement. Verify authenticated
state again and continue from the last reliable checkpoint. Capture useful crash/report text or visible error
details if available, then check frontend/API/emulator logs to decide whether the crash was browser instability
or an app-triggered failure.

When Safari reports a page as non-responsive, finish the renderer-exit procedure above before creating any
replacement or switching browsers. A force reload that creates another renderer does not clean up the hung one.
If the replacement is also blank, frozen, or non-responsive, close and verify it once, then stop using Safari for
that run and continue only with the next safely assigned browser.

After a crash or forced browser restart, always re-check emulator state and operation status docs before retrying
the action. This avoids double-running a mutation while the previous backend operation actually succeeded.
