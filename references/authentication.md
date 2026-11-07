# Authentication and App Check

## Sign-in with the test account

Ordinary local development and local E2E each use Firebase Auth's emulator through the standard client and Admin SDK settings. Each process uses one Auth mode; never restore the former dual-Auth adapter, browser-storage switches, staging-account copies, or custom token verification. Stack 0 uses `9099`; a nonzero runtime uses `19900 + N`. Derive the exact origin from `getDevStackConfig`, including the separately reserved E2E index. Hosted staging, production and cloud E2E continue using real Firebase Auth. User-requested — 2026-10-28 (Codex task: 01a184c4-e842-7242-884c-4cd979a6beb7); supersedes the former preference to retain staging accounts for manual development.

Manual frontend startup prepares a verified local account when the ignored `.secret.local` supplies `AIMVS_TEST_LOGIN_EMAIL` and a separate `AIMVS_LOCAL_TEST_LOGIN_PASSWORD`. Never reuse `AIMVS_TEST_LOGIN_PASSWORD`: that password belongs to hosted Auth. Startup reuses the existing emulator UID, verifies its email, and creates a missing account with the local password; it never resets an existing password or creates User/Channel fixtures. Configure a matching local password explicitly if that email already belonged to another emulator account. User-requested — 2026-10-31 (Codex task: 01a184c4-e842-7242-884c-4cd979a6beb7).

The manual development frontend signs into that account through the normal Firebase SDK before route guards run. It preserves an existing session and remembers only a handled boolean per browser origin, so Sign out followed by reload stays signed out. Clearing that origin's site data enables its first-load automatic sign-in again. These credentials are bundled only into manual development builds, never hosted builds or local/cloud E2E. Never publish a manual development bundle. For tests of another account or the Sign in screen, sign out first; local E2E keeps its own independent actors. User-requested — 2026-10-31 (same task).

### Signed-in stack handoff

Starting or restarting a stack for Ethan includes signing him in before handing over its test link, even when he will do the feature testing himself. Verify the exact handoff browser/profile and origin, open the requested page, require authenticated-only account or Channel controls with no Sign In action, reload, and require those controls again. Keep that signed-in handoff page open. A healthy server, seeded Auth account, configured automatic login or separate E2E session is not this proof. User-requested — 2026-11-07 (Codex task: `01a1acc3-0b47-71a2-8dc2-499e4dbe9b47`).

If the page shows Sign In or a revoked/expired session, complete normal sign-in using the verified local account above. Do not trust populated fields as evidence that the credentials are correct. Repair routine local sign-in issues yourself; ask Ethan only for a genuinely unavailable credential or required user-only action. Until the authenticated reload succeeds, report the sign-in blocker and do not present the test link as ready. A deliberately signed-out authentication test is the only exception; restore the handoff login afterward unless Ethan explicitly asks to keep it signed out.

Additional local accounts can use the ordinary Sign up screen or Auth Emulator UI. The shared development/localE2e deployment targets enable local signup and all configured emulated providers; do not open hosted signup or change hosted provider settings. Complete normal User/Channel setup once per new account/dataset so Auth UIDs and Firestore identities agree; do not copy real staging UIDs into a new account. Existing local Auth accounts persist with their stack's Firebase export/import. A local E2E run discards only its own E2E dataset during its existing preflight.

Firebase verification and password-reset emails are recorded by the emulator instead of delivered. App notification emails, including collaboration and account-deletion notices, still use real AWS SES in manual development and go to the local account's email address; use addresses you control. Only E2E uses the existing isolated mail transport. Read only the task account's action link from its emulator UI/logs or `/emulator/v1/projects/<project-id>/oobCodes`, follow it privately, and keep codes and full action URLs out of reports/tool output. Exercise the emulator's recorded action page when verifying the browser flow; applying the code through the official SDK proves a narrower SDK path. Neither path qualifies hosted email templates or hosted action handlers. Social popups use Firebase's fake provider pages. Their success/cancellation and account linking can be tested locally, but only hosted checks can qualify real provider dashboard settings and consent. App Check keeps the existing registered local debug token and real exchange; Auth emulator mode does not disable API App Check.

For a nonzero Docker stack, Firebase records action links with its container-internal Auth origin (`127.0.0.1:9099`). Before opening one, replace only that origin with the current runtime's published Auth origin from `getDevStackConfig`; keep the path and action-code query intact. Never open the internal `9099` URL from the Mac, where it could reach stack 0. This is a Docker port translation, not a second Auth mode. Self-improved — 2026-10-28: the unmodified verification link refused the container-only port; the same recorded code succeeded after translating only the origin (Codex task: 01a184c4-e842-7242-884c-4cd979a6beb7).

### Phone and LAN testing

Preserve phone/LAN testing from named worktrees as well as main; Ethan needs to test branch changes on a real phone, so emulator Auth is not a reason to impose a Mac-only policy. The frontend deliberately uses the page's LAN hostname for Firebase SDK connections. An exposed frontend can proxy `/api` to a loopback native API, so the API bind alone does not decide phone access. The existing nonzero Docker mappings publish Firebase ports on loopback, and MinIO signed URLs use localhost: frontend LAN serving alone therefore does not prove a complete worktree phone flow. Check those actual routes before claiming it works or proposing a restriction; report the concrete reachability gap rather than treating it as Ethan's preference. User-requested — 2026-10-28 (Codex task: 01a184c4-e842-7242-884c-4cd979a6beb7).

### Authorization and confirmation

An explicit AIMVS manual-browser-test request authorizes disposable emulator account signup/sign-in, verification and password reset within its exact owned nonzero stack when those flows are requested. Never use or mutate a real hosted account as a substitute. A resumed test keeps that authorization: check current authenticated UI before resubmitting. Do not save test passwords in the browser.

For an explicitly authorized hosted sign-in, the ignored repo-root `.secret.local` retains `AIMVS_TEST_LOGIN_EMAIL` and `AIMVS_TEST_LOGIN_PASSWORD`; read them privately and never print or commit them. Their absence does not block local emulator signup. If an active browser tool explicitly requires action-time confirmation, ask once for that exact action and explain the tool requirement; reuse an existing confirmation on safe resumption. Do not invent another credential-transmission approval requirement.

### Enter and verify credentials

When filling the Angular/Firebase sign-in form, do not use Accessibility/AX `set_value`. It can make fields look
filled without updating Angular/TanStack form state, leaving stale validation and causing misleading login
failures. In Firefox, password-field clipboard paste can also be unreliable. Use Computer Use to click the visible
email field, type with real keyboard input (`Cmd-A`, literal keystrokes), refresh app state, click the password
field, type the password with real keyboard input, refresh app state, then click the visible Sign In submit button.
Do not rely on `Tab`/`Enter` order in Firefox: it can land on the Forgot Password control and switch the form to
Reset Password instead of submitting.

When the in-app Browser is assigned, use semantic Browser locators to fill the visible Angular fields and click the
visible Sign In button under the authorization above. Never inspect browser storage, password stores, cookies, or
profiles, and never emit credential values through tool output. Keep form snapshots and screenshots out of the
credential-entry interval. Verify the authenticated redirect and account-only UI exactly as for a desktop browser.

If Safari asks for the Mac password to unlock AutoFill during a local test, dismiss the prompt and enter the disposable emulator credentials in the ordinary form. A separately authorized hosted test can use the saved `.secret.local` test credentials; never ask Ethan to unlock AutoFill just to enter them.

For Google OAuth, suppress automatic observation output before opening the popup and read its next state with `emit: false`. Report only an allowlist of relevant buttons, headings and plain text, plus separately extracted bare hostnames. Exclude link, HTML-content, address, URL, help and query/fragment-bearing lines even when the URL has no `https://` prefix: Firebase's handler URL can contain an App Check token in its fragment, so scheme-only redaction is insufficient. Check the filtered result before emitting it; never emit the full URL or unfiltered Accessibility tree. Self-improved — 2026-10-12: popup observations exposed tokenized URLs, including a scheme-less URL that escaped scheme-only filtering; the control allowlist avoided both forms (task `01a12d17-c483-78b1-996d-5ca6e8036df4`).

Apply that filtered-observation rule to custom OAuth pages and browser diagnostics too. Keep automatic output suppressed until a fresh state proves the popup or inspector is closed: opening an inspector can complete after the first observation, so an initially absent inspector is not clearance to print the next tree. Self-improved — 2026-10-24: delayed Safari inspector content escaped the first filtered observation during the login review; checking every observation until verified closure catches it (task `01a16a35-e451-7852-966d-25f9b6397432`).

Safari may cover the app with Auto-Complete or `Update Password` popovers during and after sign-in. Press Escape
to dismiss each popover, then refresh Computer Use accessibility state before deciding whether sign-in failed or
reusing an element index. The authenticated redirect may already have completed behind an `Update Password`
prompt, so verify the URL and authenticated-only UI after dismissing it instead of submitting the form again.

Firefox may show saved-password/autofill popovers from stale local attempts, including a previously mistyped
email. Do not select those suggestions. Dismiss or ignore them and manually type the current `.secret.local`
values. After submitting, Firefox may show a "Save password" prompt for the current `STACK_URL`; click "Not now"
so it does not obscure the app while waiting for the auth redirect. After every modal change, popover,
failed click, or user focus interruption, call Computer Use
`get_app_state` again before reusing element indexes; Firefox's accessibility indexes shift.

For AIMVS MP3 uploads through Firefox's macOS file picker, select `MPEG Audio` when `All Supported Types` leaves
the valid file disabled. Use a task-specific copy in `Downloads`; verified files under `/private/tmp` could not be
opened through this picker even though the same bytes were selectable from `Downloads`. Remove only that exact
task-created copy during cleanup.

Firefox's native macOS file picker can remain visible in screenshots while Computer Use's separate input channel
times out on every click and key request. After repeated input timeouts, stop retrying: ask Ethan to dismiss the
picker, then fetch fresh Firefox state before continuing; the visible dialog does not prove that mouse input is
available.

Login verification must be based on authenticated UI state, not just the public page rendering. The public home
can show a `Create Project` button while still unauthenticated. Treat login as successful only after the top-right
`Sign In` control is gone and an authenticated-only account/channel/project UI is visible, for example
`/dashboard` with the side nav, credits, notifications, and profile picture controls. If Firebase says
`No account found`, check the exact stack's Auth emulator for that test account before retrying UI steps.

## App Check debug token

For worktree browsers/ports, use one registered App Check debug token across stacks. Save it in ignored
repo-root `.secret.local` as `FIREBASE_APPCHECK_DEBUG_TOKEN=...`; the frontend dev build injects that string
as `window.FIREBASE_APPCHECK_DEBUG_TOKEN` by reading `process.env` or `.secret.local` at frontend build time.
If it is missing, the app falls back to Firebase's `true` debug mode, which generates a token in that browser's
IndexedDB for that localhost origin; copy the console token, register it in Firebase Console > App Check > the
staging web app > Manage debug tokens, then add it to `.secret.local` and restart the frontend. Never commit
debug tokens.
