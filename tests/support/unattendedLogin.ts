import type { BrowserContext, Page } from '@playwright/test';
import type { AccessToken, Authenticator } from '../../src/auth/authenticator';
import type { LoginFlowConfig } from '../../src/config/config';
import type { PasskeyStore } from '../../src/passkey/passkeyStore';
import { installStoredPasskey, persistPasskey } from '../../src/passkey/virtualPasskey';

export interface UnattendedLoginDeps {
  page: Page;
  context: BrowserContext;
  authenticator: Authenticator;
  passkeyStore: PasskeyStore;
  loginFlow: LoginFlowConfig;
}

/** Full unattended login: seed passkey, authenticate, open the return page, persist the new signCount. */
export async function unattendedLogin({ page, context, authenticator, passkeyStore, loginFlow }: UnattendedLoginDeps): Promise<AccessToken> {
  const passkey = await installStoredPasskey(context, passkeyStore);

  const token = await authenticator.authenticate(page, { registerPasskey: false });

  console.log('[login] opening return page');
  // The UI session already exists from the browser login; open the target page with it.
  await page.goto(new URL(loginFlow.returnPath, token.instanceUrl).toString(), { waitUntil: 'domcontentloaded' });
  await page.waitForURL(new RegExp(loginFlow.returnPath), { timeout: loginFlow.loginTimeoutMs });
  console.log(`[login] reached ${new URL(page.url()).host}${new URL(page.url()).pathname}`);

  // signCount increments per assertion; persist so the next run continues from what Salesforce has seen.
  await persistPasskey(context, passkeyStore, passkey.id);
  return token;
}
