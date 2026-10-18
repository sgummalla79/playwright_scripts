import { expect, type BrowserContext, type Page } from '@playwright/test';
import type { AccessToken } from '../auth/authenticator';
import { LoginStepHandler, newLoginProgress } from '../auth/loginStepHandler';
import { LOGIN_POLL_INTERVAL_MS, PASSKEY_UI } from '../config/constants';

/**
 * Registers a virtual passkey from an already-authenticated session. Needed when login never
 * prompts for registration (the user already has a passkey). Mirrors the manual click path:
 * Advanced User Details -> "View in Passkeys list" (scrolls to the Passkeys section) -> Add.
 * Salesforce then forces a step-up re-login, which the shared login-step handler answers,
 * and the handler clicks "Create Passkey" when the registration page appears.
 */
export async function registerPasskeyFromSession(
  page: Page,
  context: BrowserContext,
  token: AccessToken,
  steps: LoginStepHandler,
  timeoutMs: number,
): Promise<void> {
  const detailsUrl = new URL(`/${token.userId}${PASSKEY_UI.advancedUserDetailsQuery}`, token.instanceUrl);
  await page.goto(detailsUrl.toString(), { waitUntil: 'domcontentloaded' });
  await page.click(PASSKEY_UI.viewPasskeysListLinkSelector, { timeout: timeoutMs });
  await page.locator(PASSKEY_UI.addPasskeyControlSelector).first().click({ timeout: timeoutMs });

  const progress = newLoginProgress();
  const deadline = Date.now() + timeoutMs;
  while ((await context.credentials.get({})).length === 0) {
    if (Date.now() > deadline) throw new Error(`Passkey registration did not complete in time; stuck at ${page.url()}`);
    await steps.handleCurrentStep(page, { registerPasskey: true }, progress);
    await page.waitForTimeout(LOGIN_POLL_INTERVAL_MS);
  }
  await expect.poll(async () => (await context.credentials.get({})).length).toBeGreaterThan(0);
}
