import type { Page } from '@playwright/test';
import { LOGIN_POLL_INTERVAL_MS, PASSKEY_UI, STEP_UP_STABLE_POLLS } from '../config/constants';
import { LoginStepHandler, newLoginProgress } from './loginStepHandler';

export interface StepUpOptions {
  /**
   * true once the page we actually wanted has rendered (not a verification/login page, and not the
   * Setup shell that loads before Salesforce redirects to verification). Check content, not just the URL.
   */
  isTarget: (page: Page) => Promise<boolean>;
  timeoutMs: number;
}

export interface StepUpResult {
  /** true if Salesforce showed the passkey verification page on the way. */
  passkeyPrompted: boolean;
}

/**
 * After navigating to a protected page, Salesforce may or may not demand re-verification.
 * Answers whatever it shows (login steps, passkey verification) and returns once the target
 * page is stable. If nothing was asked, returns immediately-ish with passkeyPrompted=false.
 */
export async function completeStepUpIfPrompted(page: Page, steps: LoginStepHandler, options: StepUpOptions): Promise<StepUpResult> {
  const progress = newLoginProgress();
  const deadline = Date.now() + options.timeoutMs;
  let passkeyPrompted = false;
  let stablePolls = 0;

  while (stablePolls < STEP_UP_STABLE_POLLS) {
    if (Date.now() > deadline) throw new Error(`Step-up did not reach the target page in time; stuck at ${new URL(page.url()).host}${new URL(page.url()).pathname}`);
    const url = new URL(page.url(), 'about:blank');
    if (url.pathname.includes(PASSKEY_UI.verificationUrlFragment)) passkeyPrompted = true;

    if (await options.isTarget(page)) {
      stablePolls += 1;
    } else {
      stablePolls = 0;
      await steps.handleCurrentStep(page, { registerPasskey: false }, progress);
    }
    await page.waitForTimeout(LOGIN_POLL_INTERVAL_MS);
  }
  return { passkeyPrompted };
}
