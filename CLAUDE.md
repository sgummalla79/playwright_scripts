# CLAUDE.md — working notes for Claude on this repo

Read this first on a new machine. [README.md](README.md) has the user-facing setup; this file has what a
future Claude session needs that the code doesn't say.

## What this repo is

Playwright + TypeScript POC: unattended Salesforce login for a user under **phishing-resistant MFA**, using
the OAuth **web server flow** in a browser plus Playwright's **virtual WebAuthn authenticator**
(`context.credentials`, v1.61+). Background and risks: [docs/prmfa-playwright-spike.htm](docs/prmfa-playwright-spike.htm).
It targets a **production** org with a privileged user (the user chose this; Salesforce does not support the
pattern for privileged automation users, so keep flagging it, briefly, when relevant).

State when this file was written: bootstrap, unattended login, session reuse (`setup` + `app` projects) and the
step-up test all **work end to end**. Planned next: more `*.app.spec.ts` tests as the user needs them; moving
secrets to a secrets manager before any CI.

## Hard rules (the user's standing preferences)

- **Never commit or push unless explicitly asked.** Never add `Co-Authored-By` lines. Commit messages are
  attributed to the user only.
- **Public repo.** Committed files must contain **no** org names, hostnames, usernames, emails, ids, consumer
  keys, secrets, passcodes or URLs with tokens. Before any commit: stage by explicit path (not `git add .`),
  check the staged list for `.env`, `.secrets/`, `artifacts/`, `.DS_Store`, and `git grep --cached` for the real
  secret values from `.env`.
- **Never print secrets.** Don't `cat .env`. When inspecting it, redact values (`sed` the value away). Don't echo
  `passkey.json` key material (print only `rpId` / `signCount`). Redact `client_id`, `startURL`, `retURL`,
  `vcsrf`, `code=`, `state=` from anything shown.
- **No hardcoding in logic.** Env-specific values come from `.env` via `src/config/config.ts`. Protocol
  literals, Salesforce UI selectors/copy and tuning numbers live in `src/config/constants.ts`, named
  SCREAMING_SNAKE_CASE with a comment saying why. **SOLID**: keep new code behind small interfaces
  (`Authenticator`, `PasskeyStore`, `SessionStore`), one responsibility per module, extend by adding code.
- Match the surrounding style (terse comments that explain *why*).

## Things you cannot do from the harness here

- The auto-mode permission check **blocked** `npm run test:bootstrap` the first time and `git push` later. If
  blocked, don't work around it: ask the user to run it, or to add an allow rule such as
  `Bash(git push origin main)`. `npx playwright test ...` was later allowed when the user typed the command.
- You can't see the user's terminal. Diagnose from files: `test-results/*/error-context.md` (page snapshot, may
  be empty if the browser closed), `trace.zip` (unzip; screencast frames in `screencast/`, readable with the Read
  tool), `test-results/.last-run.json`, and `.secrets/*` timestamps. Failed tests keep a trace and screenshot;
  passing tests leave almost nothing. For ad-hoc probing, write throwaway scripts in the scratchpad that
  `require` the repo's `@playwright/test`.

## Architecture in one screen

- `tests/bootstrap.spec.ts` → login (registration allowed) → if no virtual credential, `registerPasskeyFromSession`.
- `src/auth/webServerFlowAuthenticator.ts` → authorize URL (PKCE+state), polls the page and delegates each page
  to `LoginStepHandler`, intercepts the callback with `page.route`, exchanges the code.
- `src/auth/loginStepHandler.ts` → one place that knows every Salesforce login-related page.
- `src/auth/stepUp.ts` → after navigating to a protected page, answer whatever Salesforce shows until the
  target **content** is visible and stable.
- `tests/auth.setup.ts` → `setup` project: unattended login once, saves `storageState` + `.meta.json`
  (instance URL, timestamp); skipped while younger than `SESSION_MAX_AGE_MS`. `app` project depends on it.
- `tests/support/screenshot.ts` → `artifacts/screenshots/<test-title-slug>/<name>-<UTC timestamp>.png`.

## Hard-won Salesforce/Playwright facts (don't relearn these)

1. **`npm run script --headed` doesn't work**: npm eats the flag. Use `test:bootstrap:headed` or `-- --headed`.
2. **Login is identifier-first**: username page → "Log In" → password page. Both use `#Login`. Submit each
   credential **once**; a repeated password step means rejection, so stop (account lockout risk on prod).
3. **"Verify Your Identity" (`.../verification/method/UnifiedPasskeyVerificationUi`)**: its button
   (`#savebtn`, `onclick=invokeSfdcApp()`) is **disabled** because the page starts `navigator.credentials.get()`
   itself. **Never click it** (a click blocks forever and freezes the polling loop). Just wait; the virtual
   passkey answers. In bootstrap a human picks *Use a Different Verification Method*.
4. **A user who already has a passkey is never prompted to register a new one.** Registration is done via
   *Advanced User Details* (`/<userId>?noredirect=1&isUserEntityOverride=1`) → link "View in Passkeys list"
   (scrolls to a section on the same page) → `input[name="newBuiltInAuth"]` (visible value is `" Add "` with
   spaces, so match by name) → Salesforce forces a **step-up re-login** → `AddPasskeyUi` → `#savebtn`
   ("Create Passkey"). **Direct navigation to `/_ui/identity/webauthn/AddPasskeyUi` fails** ("Unable to Access
   Page") because it needs a one-time `flotp` token. The user id comes from the token response's `id` URL.
5. **`signCount` increments on every assertion.** Persist the credential after any run that used it
   (`persistPasskey`). A probe/script that uses the passkey must write it back too, or the store drifts.
6. `credentials.install()` must precede navigation. The `app` project only restores cookies, so a test that
   might face a passkey prompt must call `installStoredPasskey` itself.
7. **Step-up redirect is late**: the Setup shell loads at the target URL, and ~5 s later Salesforce redirects
   to verification, then back. A URL-only check passes too early (the first screenshot was a spinner/checkmark).
   Wait for real content: the Auth Providers list renders in an **iframe**, marker text `URL Suffix`
   (`SETUP_UI` in constants). After a recent verification Salesforce doesn't re-prompt for a while, so
   `passkey prompted: false` is normal on quick re-runs.
8. Setup pages live on a different host (`*.my.salesforce-setup.com`) than the instance
   (`*.my.salesforce.com`). `SF_SETUP_BASE_URL` configures it; saved cookies may not cover it, in which case
   the step-up loop handles the login pages it meets.
9. `.env` loading: duplicate keys are easy to create; if `SF_LOGIN_TIMEOUT_MS` looks wrong, grep for dupes.
   Test timeout = 2 × `SF_LOGIN_TIMEOUT_MS` (set in `playwright.config.ts`). Use `300000` for headed bootstrap.
10. Playwright writes `storageState` files **world-readable**; `FileSessionStore.saveMeta` chmods to 600.
    New secret-bearing files must be `0600` and under the git-ignored `.secrets/`.
11. **Windows**: the virtual passkey never touches Windows Hello/PIN, so no code change is needed. chmod is a
    no-op there (`src/storage/ownerOnlyFile.ts` warns once). Env-prefix commands (`VAR=x npx ...`) don't work in
    cmd/PowerShell; use `.env`. Don't use one passkey file from two machines (signCount drift). Untested on
    Windows as of writing.
12. Locale-specific copy ("View in Passkeys list", "URL Suffix") and element ids come from Salesforce pages and
    can change with a release. If a selector breaks, look at the trace screenshot, then update `constants.ts`.

## Setting up on a new machine

1. `npm install && npx playwright install chromium`
2. `cp .env.example .env` and fill it in. Ask the user for values; **never** ask them to paste secrets into
   chat. The Connected App must already exist (steps in README).
3. Get a passkey: either re-run `npm run test:bootstrap:headed` (user completes the manual verification once;
   adds another passkey to the user), or have the user copy `.secrets/passkey.json` securely.
4. `npm run typecheck`, `npm test`, `npm run test:app`.
5. A new IP may trigger an emailed verification code; ask the user for the trusted IP range or to do it by hand.

## Diagnosing a failure (what worked before)

1. Read the error text and the `[login] now at host/path` lines (path only, never query strings).
2. Find the last page: `error-context.md` snapshot, else unzip `trace.zip` and Read the last frame under
   `screencast/`, or list `goto/click/fill` actions from the `.trace` JSON.
3. Probe with a scratchpad script using `storageState: '.secrets/session.json'` and the stored passkey, polling
   `page.url()` (path only) every second. Always write the passkey back afterwards.
