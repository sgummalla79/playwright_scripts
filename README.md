# playwright_scripts

Playwright (TypeScript) scripts that log in to Salesforce **unattended** as a user who is required to use
**phishing-resistant MFA (passkeys)**, then reuse that login for regular UI tests and for pages that ask for
passkey re-verification ("step-up").

It works by pairing the OAuth web server flow with Playwright's built-in **virtual WebAuthn authenticator**
(`BrowserContext.credentials`, Playwright 1.61+): a software passkey is registered once, stored locally, and
replayed on later runs, so no human has to touch a security key.

> ## Read this first
>
> - **This is not a Salesforce-supported pattern for privileged automation users.** Salesforce's own guidance
>   says phishing-resistant MFA doesn't work with automation or integration users and to contact Salesforce
>   Customer Support for privileged ones. See [docs/prmfa-playwright-spike.htm](docs/prmfa-playwright-spike.htm)
>   (section 6) for the full discussion.
> - **Get written approval from your org's security owner before using it**, and prefer a **sandbox**.
> - The stored passkey private key is a **complete, replayable MFA factor** for that user. Treat it like a
>   signing key or a password. The saved browser session is just as sensitive while it is valid.
> - Only use this on orgs and users you are authorised to test.

## What's in here

| Piece | What it does |
|---|---|
| `bootstrap` project | One-time per user: logs in, registers a virtual passkey, saves it to `.secrets/passkey.json` |
| `unattended` project | Proves the full login works with no human steps |
| `setup` project | Logs in once (or reuses a fresh saved session) and saves the browser session |
| `app` project | Your regular tests (`*.app.spec.ts`); they start already logged in |
| `stepup.app.spec.ts` | Example: opens a Setup page that may demand passkey re-verification and answers it if asked |

## Requirements

- Node.js 20 or newer (uses built-in `fetch` and `AbortSignal.timeout`)
- Playwright **1.61 or newer** (installed by `npm install`)
- A Salesforce user, and permission to create a Connected App (or External Client App) in that org
- A way to complete one manual identity verification during bootstrap (for example an emailed code), if the
  user already has another passkey registered

## Setup

### 1. Install

```bash
npm install
npx playwright install chromium
```

### 2. Create the Connected App

In Salesforce Setup, create a Connected App with OAuth enabled:

- **Callback URL:** `http://localhost:8080/callback` (Playwright intercepts this redirect; nothing needs to
  listen on it)
- **OAuth scopes:** `api`, `web`, `refresh_token`
- **Require Secret for Web Server Flow:** on. Enable **PKCE** too if offered.
- After saving, under **Manage → Edit Policies**, set **Permitted Users** to *Admin approved users are
  pre-authorized* and assign only the test user's profile or a permission set.
- Wait a few minutes for the app to propagate.

Copy the **Consumer Key** and **Consumer Secret**.

### 3. Configure `.env`

```bash
cp .env.example .env
```

Fill in the values (the file is git-ignored; never put real values in `.env.example`):

| Variable | Meaning |
|---|---|
| `SF_LOGIN_URL` | `https://login.salesforce.com`, `https://test.salesforce.com` (sandbox) or your My Domain URL |
| `SF_CLIENT_ID` / `SF_CLIENT_SECRET` | Connected App consumer key / secret |
| `SF_CALLBACK_URL` | Must match the Connected App exactly |
| `SF_USERNAME` / `SF_PASSWORD` | The test user |
| `PASSKEY_STORE_PATH` | Where the virtual passkey is saved (default `./.secrets/passkey.json`) |
| `SF_RETURN_PATH` | Page to open after login (default `/lightning/page/home`) |
| `SF_LOGIN_TIMEOUT_MS` | Per-step wait; the test timeout is twice this. Use `300000` for the first bootstrap so you have time to verify by hand |
| `SESSION_STATE_PATH` | Saved browser session (default `./.secrets/session.json`) |
| `SESSION_MAX_AGE_MS` | Reuse a saved session younger than this (default 30 min). Keep below the org's session timeout |
| `SF_SETUP_BASE_URL` | Setup host Salesforce redirects Setup pages to, e.g. `https://<mydomain>.my.salesforce-setup.com` (step-up test only) |
| `SCREENSHOT_DIR` | Screenshot root (default `./artifacts/screenshots`) |

### 4. Prepare the user

- If the machine's IP isn't in the user's **Trusted IP Ranges**, Salesforce may send an **emailed
  verification code** on login. Tests can't read email, so add the IP range or complete it by hand during
  bootstrap.

## Usage

### One-time: register the virtual passkey

```bash
npm run test:bootstrap:headed
```

(Use the script. `npm run test:bootstrap --headed` does **not** work: npm swallows the flag. If you type the
flag yourself, put `--` before it: `npm run test:bootstrap -- --headed`.)

A browser window opens and the script fills in the username and password. Then:

- If the user has **no passkey yet**, Salesforce shows the registration page and the script registers one.
- If the user **already has a passkey**, Salesforce shows *Verify Your Identity*. Click **Use a Different
  Verification Method** and finish it by hand. The script then goes to *Advanced User Details → View in
  Passkeys list → Add*, signs in again if asked, and registers the virtual passkey.

On success `.secrets/passkey.json` exists and a new entry appears in the user's Passkeys list.

### Unattended login

```bash
npm test
```

Logs in with no human steps and updates the stored passkey's signature counter.

### Regular tests with a saved session

```bash
npm run test:app
```

The `setup` project runs first (skipped if the saved session is fresh), then every `*.app.spec.ts`. Copy
[tests/home.app.spec.ts](tests/home.app.spec.ts) as a starting point. Tests get the org URL from the
`instanceUrl` fixture.

### Step-up (re-verification) example

```bash
npx playwright test --project=app --headed stepup
```

Opens a Setup page. If Salesforce asks for the passkey again, the stored passkey answers it. Either outcome
passes; the log says `[step-up] passkey prompted: true|false`. A screenshot is saved to
`artifacts/screenshots/<test-case>/<name>-<timestamp>.png` (git-ignored, because it can show org data).

### Other commands

```bash
npm run typecheck     # tsc --noEmit
npx playwright test --list
npx playwright show-trace test-results/<run>/trace.zip   # after a failure
```

## How it works

1. **Web server flow in a browser.** Playwright opens the OAuth authorize URL (with PKCE), types the
   username, then the password (Salesforce uses a two-step login), clicks *Allow* if a consent page shows,
   and intercepts the redirect to the callback URL. The code is exchanged for a token. Because the login
   happened in the browser, the UI session already carries the MFA result, so `frontdoor.jsp` is not needed.
2. **Virtual passkey.** `context.credentials.install()` must run *before* navigating. The stored credential is
   seeded with `context.credentials.create(rpId, saved)`. The *Verify Your Identity* page starts the
   WebAuthn check on its own (its button is disabled), so the script **waits and does not click**.
3. **Signature counter.** The counter rises by one for every assertion. After each run that used the passkey,
   the new value is saved so the next run continues from what Salesforce has seen.
4. **Session reuse.** `context.storageState()` saves cookies once; the `app` project loads them for every
   test. Playwright creates that file world-readable, so the code restricts it to owner-only.
5. **Step-up.** For sensitive Setup pages Salesforce loads the page shell first and redirects to verification
   a few seconds *later*. The test waits for the page's real content, not just the URL.

## Project layout

```
src/config/      constants.ts (protocol literals, selectors, defaults), config.ts (typed .env loading)
src/auth/        authenticator, web server flow, login step handler, PKCE, step-up helper
src/passkey/     passkey store (interface + file), virtual authenticator helpers, registration
src/session/     session store (interface + file)
tests/           bootstrap / login / auth.setup / *.app.spec.ts, fixtures, support helpers
docs/            the original spike write-up
```

Values that vary by environment come from `.env`. Salesforce UI selectors and copy are collected in
`src/config/constants.ts`, because Salesforce can change its pages between releases.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `Missing required env var ...` | `.env` incomplete; compare with `.env.example` |
| `Token exchange failed: invalid_grant` | Wrong callback URL, user not pre-authorized on the app, or the code expired |
| Stuck on *Verify Your Identity* in bootstrap | Expected: pick **Use a Different Verification Method** and finish by hand |
| *Unable to Access Page* on the add-passkey page | That page needs a one-time token; reach it via *Advanced User Details*, never by direct URL |
| `Expected exactly one virtual passkey, found 0` | Registration didn't complete; rerun the headed bootstrap |
| `Salesforce asked to register a passkey, but none is stored` | Run the bootstrap first on this machine |
| `Salesforce showed the password step again` | Wrong password. The script stops on purpose to avoid locking the account |
| Step-up test finishes instantly with the wrong page | Page content marker changed; update `SETUP_UI` in `constants.ts` |
| Login page again when opening the instance | Session cookies didn't carry over; check `SF_LOGIN_URL` (My Domain) |
| Stale session | Delete `.secrets/session.json*` or lower `SESSION_MAX_AGE_MS` |

## Windows

It works on Windows. The Windows Hello PIN is never involved: the virtual authenticator replaces
`navigator.credentials` inside the Playwright-launched Chromium, so the stored software passkey answers the
check and no PIN, fingerprint or hardware key is requested. (If a real Windows Hello dialog ever appears
during a run, interception is not active for that page.) The Windows Hello passkey on the account stays a
separate entry next to the virtual one.

Differences to be aware of:

- **Environment variables on the command line.** `SF_LOGIN_TIMEOUT_MS=60000 npx playwright ...` is bash
  syntax. Put the value in `.env` instead, or in PowerShell use
  `$env:SF_LOGIN_TIMEOUT_MS=60000; npx playwright ...`. The `npm run` scripts work as they are.
- **File permissions.** Secret files are written with mode 600 on macOS/Linux. Windows ignores that, so the
  code prints a one-time warning. Keep the repo inside your own user profile so only your account can read
  `.secrets/`.
- **Moving a passkey between machines.** If you copy `.secrets/passkey.json` from another machine, use it from
  **one machine at a time**. The signature counter rises on every use, and two machines would drift apart and
  could be rejected. Alternatively, run the bootstrap on the new machine to register its own passkey.

## Running on another machine

Either re-run the bootstrap there (registers an additional passkey), or copy `.secrets/passkey.json` over a
secure channel. Never commit it, email it or paste it into chat. A new IP may trigger an emailed
verification code, so see *Prepare the user*.

## License

MIT, see [LICENSE](LICENSE).
