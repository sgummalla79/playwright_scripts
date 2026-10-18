/**
 * Values that cannot come from environment config because they are fixed by
 * Salesforce's protocol or UI contract. Everything environment-specific lives
 * in .env (see config.ts).
 */

/** Env var names. Names are the contract between .env and config.ts. */
export const ENV_KEYS = {
  loginUrl: 'SF_LOGIN_URL',
  clientId: 'SF_CLIENT_ID',
  clientSecret: 'SF_CLIENT_SECRET',
  callbackUrl: 'SF_CALLBACK_URL',
  username: 'SF_USERNAME',
  password: 'SF_PASSWORD',
  passkeyStorePath: 'PASSKEY_STORE_PATH',
  returnPath: 'SF_RETURN_PATH',
  loginTimeoutMs: 'SF_LOGIN_TIMEOUT_MS',
} as const;

/** Defaults for optional env vars (tunables, not secrets). */
export const ENV_DEFAULTS = {
  returnPath: '/lightning/page/home',
  loginTimeoutMs: 60_000,
} as const;

/** Salesforce endpoint paths — fixed by the platform. */
export const SF_PATHS = {
  oauthAuthorize: '/services/oauth2/authorize',
  oauthToken: '/services/oauth2/token',
} as const;

/** OAuth 2.0 protocol literals — fixed by RFC 6749 / RFC 7636. */
export const OAUTH = {
  responseType: 'code',
  grantType: 'authorization_code',
  pkceMethod: 'S256',
  formContentType: 'application/x-www-form-urlencoded',
} as const;

/** PKCE verifier size in random bytes (RFC 7636 allows 32–96). */
export const PKCE_VERIFIER_BYTES = 48;
/** OAuth state size in random bytes (CSRF protection). */
export const OAUTH_STATE_BYTES = 16;

/** How often the login driver re-checks the page for the next step. */
export const LOGIN_POLL_INTERVAL_MS = 500;
/** Short probe window for "is this element on screen right now". */
export const ELEMENT_PROBE_TIMEOUT_MS = 250;

/**
 * Salesforce login / consent / passkey UI contract. These are scraped from
 * Salesforce pages, so they may change with a release — keep them in one place.
 */
export const LOGIN_UI = {
  usernameSelector: '#username',
  passwordSelector: '#password',
  submitSelector: '#Login',
  /** "Allow" button on the OAuth consent page (only shown if not pre-authorized) */
  consentApproveSelector: '#oaapprove',
} as const;

export const PASSKEY_UI = {
  /** "Create Passkey" button on /_ui/identity/webauthn/AddPasskeyUi */
  createButtonSelector: '#savebtn',
  /**
   * The add-passkey page rejects direct navigation ("Unable to Access Page"): it needs a one-time token
   * that Salesforce adds when you click through. So we click through Advanced User Details -> Passkeys list.
   */
  advancedUserDetailsQuery: '?noredirect=1&isUserEntityOverride=1',
  /** Link on Advanced User Details (locale-specific copy) */
  viewPasskeysListLinkSelector: 'a:has-text("View in Passkeys list")',
  /**
   * "Add" button in the Passkeys section of Advanced User Details. Matched by its name attribute because the
   * visible value is " Add " (padded with spaces). It navigates to /identity/twofactor/registrationInterstitial.apexp.
   */
  addPasskeyControlSelector: 'input[name="newBuiltInAuth"]',
  /** URL fragment of the passkey registration page */
  registrationUrlFragment: '/identity/webauthn/AddPasskeyUi',
  /** URL fragment of the "Verify Your Identity" page that asks for an existing passkey */
  verificationUrlFragment: '/verification/method/UnifiedPasskeyVerificationUi',
} as const;
