import type { Page } from '@playwright/test';
import type { WebServerFlowConfig } from '../config/config';
import { ELEMENT_PROBE_TIMEOUT_MS, LOGIN_UI, PASSKEY_UI } from '../config/constants';
import type { AuthenticateOptions } from './authenticator';

/** Tracks which steps were already submitted, so a rejected login is never retried (account lockout). */
export interface LoginProgress {
  usernameSubmitted: boolean;
  passwordSubmitted: boolean;
}

export const newLoginProgress = (): LoginProgress => ({
  usernameSubmitted: false,
  passwordSubmitted: false,
});

/**
 * Reacts to whichever Salesforce login-related page is currently shown (username, password,
 * passkey verification, passkey registration, OAuth consent). Used by the initial login and by
 * any later step-up re-authentication, so the page-specific handling lives in one place.
 */
export class LoginStepHandler {
  constructor(private readonly credentials: Pick<WebServerFlowConfig, 'username' | 'password'>) {}

  async handleCurrentStep(page: Page, options: AuthenticateOptions, progress: LoginProgress): Promise<void> {
    if (page.url().includes(PASSKEY_UI.registrationUrlFragment)) {
      if (!options.registerPasskey) {
        throw new Error('Salesforce asked to register a passkey, but none is stored. Run the bootstrap project first.');
      }
      await page.click(PASSKEY_UI.createButtonSelector);
    } else if (page.url().includes(PASSKEY_UI.verificationUrlFragment)) {
      // Nothing to click: the page starts navigator.credentials.get() itself (its button is disabled), and the
      // virtual authenticator answers it. In bootstrap a human picks another method. Either way, just wait.
      return;
    } else if (await this.isVisible(page, LOGIN_UI.passwordSelector)) {
      if (progress.passwordSubmitted) throw new Error('Salesforce showed the password step again; login was rejected. Check SF_PASSWORD.');
      progress.passwordSubmitted = true;
      await page.fill(LOGIN_UI.passwordSelector, this.credentials.password);
      await page.click(LOGIN_UI.submitSelector);
    } else if (await this.isVisible(page, LOGIN_UI.usernameSelector)) {
      if (progress.usernameSubmitted) return; // waiting for the password step to render
      progress.usernameSubmitted = true;
      await page.fill(LOGIN_UI.usernameSelector, this.credentials.username);
      await page.click(LOGIN_UI.submitSelector);
    } else if (await this.isVisible(page, LOGIN_UI.consentApproveSelector)) {
      await page.click(LOGIN_UI.consentApproveSelector);
    }
  }

  private async isVisible(page: Page, selector: string): Promise<boolean> {
    try {
      return await page.locator(selector).first().isVisible({ timeout: ELEMENT_PROBE_TIMEOUT_MS });
    } catch {
      return false; // page navigating mid-probe
    }
  }
}
