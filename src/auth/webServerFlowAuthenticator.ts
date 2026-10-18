import type { Page } from '@playwright/test';
import type { LoginFlowConfig, WebServerFlowConfig } from '../config/config';
import {
  LOGIN_POLL_INTERVAL_MS,
  OAUTH,
  SF_PATHS,
} from '../config/constants';
import type { AccessToken, AuthenticateOptions, Authenticator } from './authenticator';
import { LoginStepHandler, newLoginProgress } from './loginStepHandler';
import { createPkcePair, createState } from './pkce';

interface TokenResponse {
  access_token?: string;
  instance_url?: string;
  id?: string; // identity URL: .../id/<orgId>/<userId>
  error?: string;
  error_description?: string;
}

/**
 * OAuth web server flow (authorization code + PKCE) driven through a real
 * browser page. The browser login establishes the MFA-verified UI session;
 * the code exchange yields an API token. No frontdoor.jsp bridging needed.
 */
export class WebServerFlowAuthenticator implements Authenticator {
  constructor(
    private readonly config: WebServerFlowConfig,
    private readonly flow: LoginFlowConfig,
    private readonly steps: LoginStepHandler = new LoginStepHandler(config),
  ) {}

  async authenticate(page: Page, options: AuthenticateOptions): Promise<AccessToken> {
    const pkce = createPkcePair();
    const state = createState();
    const callback = this.captureCallback(page);

    await page.goto(this.buildAuthorizeUrl(pkce.challenge, state), { waitUntil: 'domcontentloaded' });
    const callbackUrl = await this.driveUntilCallback(page, callback.promise, options);

    const params = new URL(callbackUrl).searchParams;
    if (params.get('state') !== state) throw new Error('OAuth state mismatch on callback');
    const code = params.get('code');
    if (!code) throw new Error(`Callback had no code: ${params.get('error')} ${params.get('error_description') ?? ''}`.trim());

    console.log('[login] callback captured, exchanging code for token');
    const token = await this.exchangeCode(code, pkce.verifier);
    console.log('[login] token exchange complete');
    return token;
  }

  private buildAuthorizeUrl(challenge: string, state: string): string {
    const url = new URL(SF_PATHS.oauthAuthorize, this.config.loginUrl);
    url.searchParams.set('response_type', OAUTH.responseType);
    url.searchParams.set('client_id', this.config.clientId);
    url.searchParams.set('redirect_uri', this.config.callbackUrl);
    url.searchParams.set('code_challenge', challenge);
    url.searchParams.set('code_challenge_method', OAUTH.pkceMethod);
    url.searchParams.set('state', state);
    return url.toString();
  }

  /** Intercepts the redirect to the callback URL so nothing has to listen on it. */
  private captureCallback(page: Page): { promise: Promise<string> } {
    const promise = new Promise<string>((resolve) => {
      void page.route(
        (url) => url.href.startsWith(this.config.callbackUrl),
        (route) => {
          resolve(route.request().url());
          void route.fulfill({ status: 200, body: '' });
        },
      );
    });
    return { promise };
  }

  /** Handles whichever step Salesforce shows next until the callback fires. */
  private async driveUntilCallback(page: Page, callback: Promise<string>, options: AuthenticateOptions): Promise<string> {
    let done: string | undefined;
    void callback.then((url) => (done = url));
    const progress = newLoginProgress();
    const deadline = Date.now() + this.flow.loginTimeoutMs;

    let lastLoggedPath = '';
    while (!done) {
      const path = new URL(page.url(), 'about:blank').pathname; // path only: query strings carry tokens
      if (path !== lastLoggedPath) {
        console.log(`[login] now at ${new URL(page.url(), 'about:blank').host}${path}`);
        lastLoggedPath = path;
      }
      if (Date.now() > deadline) throw new Error(`Login did not reach the callback in time; stuck at ${page.url()}`);
      await this.steps.handleCurrentStep(page, options, progress);
      await page.waitForTimeout(LOGIN_POLL_INTERVAL_MS);
    }
    return done;
  }

  private async exchangeCode(code: string, verifier: string): Promise<AccessToken> {
    const response = await fetch(new URL(SF_PATHS.oauthToken, this.config.loginUrl), {
      method: 'POST',
      signal: AbortSignal.timeout(this.flow.loginTimeoutMs),
      headers: { 'Content-Type': OAUTH.formContentType },
      body: new URLSearchParams({
        grant_type: OAUTH.grantType,
        code,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.callbackUrl,
        code_verifier: verifier,
      }),
    });
    const body = (await response.json()) as TokenResponse;
    if (!response.ok || !body.access_token || !body.instance_url || !body.id) {
      throw new Error(`Token exchange failed: ${body.error ?? response.status} ${body.error_description ?? ''}`.trim());
    }
    return { accessToken: body.access_token, instanceUrl: body.instance_url, userId: body.id.split('/').pop() as string };
  }
}
