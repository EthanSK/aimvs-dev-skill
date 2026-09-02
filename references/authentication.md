# Authentication and App Check

## Sign-in with the test account

Local development uses real Firebase Auth for the staging project; only Firestore, Functions, and Storage are
emulated by this stack. Do not treat the absence of an Auth emulator on `:9099` as a blocker, and do not create
a staging sign-up/user unless the user explicitly asks.

Read both credentials from ignored repo-root `.secret.local`: `AIMVS_TEST_LOGIN_EMAIL` and
`AIMVS_TEST_LOGIN_PASSWORD`. If either variable is missing, stop and ask the user to add it; never invent a
fallback account. Never print or commit these values. Use the assigned desktop browser's persistent profile or the
task-scoped in-app Browser binding for the stack so App Check/Auth state can survive the current run.

### Authorization and confirmation

An explicit AIMVS manual-browser-test request authorizes the saved `.secret.local` test account to sign in through
the exact verified nonzero-stack origin in its assigned browser. Do not ask Ethan to provide or paste credentials,
reapprove the test account, or perform the sign-in himself when the saved credentials and supported controls exist.
This covers the ordinary local sign-in form and its existing staging Firebase Auth destination; it does not authorize
another account, origin, sign-up, password change, account recovery, or saving a password in the browser.

Before any retry or resumption, check the authenticated URL and account-only UI. A completed sign-in must not be
submitted again. An interruption, context recovery, or replacement task-owned browser page does not discard Ethan's
approval for the same account, origin, and sign-in action.

Do not invent a separate per-run credential-transmission approval requirement. If the active browser tool explicitly
requires action-time confirmation even for a preapproved password entry, follow that requirement: ask once when the
verified form is ready, identify the saved test credentials and exact local origin/staging Auth destination, and say
that the browser tool requires the confirmation—not that AIMVS lacks authorization. Reuse Ethan's reply for that
exact sign-in, including a safe retry whose postcondition proves it did not complete. Do not promise that this repo
skill overrides a mandatory tool policy, change browsers to evade it, or ask again without a material new risk.

### Enter and verify credentials

Before spending time debugging browser focus, verify the saved email exists in staging Auth when ADC is available:

```bash
node - <<'NODE'
const fs = require('fs');
const { initializeApp, applicationDefault, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const line = fs.readFileSync('.secret.local', 'utf8').split(/\r?\n/).find((entry) => entry.startsWith('AIMVS_TEST_LOGIN_EMAIL='));
if (!line) throw new Error('AIMVS_TEST_LOGIN_EMAIL is missing from .secret.local');
const email = line.slice('AIMVS_TEST_LOGIN_EMAIL='.length);
const projectId = JSON.parse(fs.readFileSync('.firebaserc', 'utf8')).projects.staging;
if (!projectId) throw new Error('The staging Firebase project is missing from .firebaserc');
if (!getApps().length) initializeApp({ credential: applicationDefault(), projectId });
getAuth().getUserByEmail(email).then((user) => {
  console.log(JSON.stringify({ savedEmailExists: true, providers: user.providerData.map((p) => p.providerId).sort() }));
}).catch((error) => {
  console.log(JSON.stringify({ savedEmailExists: false, code: error.code || 'unknown' }));
  process.exitCode = 1;
});
NODE
```

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
`No account found`, re-run the Auth preflight before retrying UI steps.

## App Check debug token

For worktree browsers/ports, use one registered App Check debug token across stacks. Save it in ignored
repo-root `.secret.local` as `FIREBASE_APPCHECK_DEBUG_TOKEN=...`; the frontend dev build injects that string
as `window.FIREBASE_APPCHECK_DEBUG_TOKEN` by reading `process.env` or `.secret.local` at frontend build time.
If it is missing, the app falls back to Firebase's `true` debug mode, which generates a token in that browser's
IndexedDB for that localhost origin; copy the console token, register it in Firebase Console > App Check > the
staging web app > Manage debug tokens, then add it to `.secret.local` and restart the frontend. Never commit
debug tokens.
