# Authentication and App Check

## Sign-in with the test account

Local development uses real Firebase Auth for the staging project; only Firestore, Functions, and Storage are
emulated by this stack. Do not treat the absence of an Auth emulator on `:9099` as a blocker, and do not create
a staging sign-up/user unless the user explicitly asks.

Read both credentials from ignored repo-root `.secret.local`: `AIMVS_TEST_LOGIN_EMAIL` and
`AIMVS_TEST_LOGIN_PASSWORD`. If either variable is missing, stop and ask the user to add it; never invent a
fallback account. Never print or commit these values. Use the persistent browser profile for the stack so App
Check/Auth state survives between runs.

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
