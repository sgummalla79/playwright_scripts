import type { Page } from '@playwright/test';

export interface AccessToken {
  accessToken: string;
  instanceUrl: string;
  /** 18-char Salesforce user id, parsed from the token response `id` URL */
  userId: string;
}

export interface AuthenticateOptions {
  /** true: click "Create Passkey" if Salesforce asks for registration. false: treat that as an error. */
  registerPasskey: boolean;
}

/** Abstraction over "log this browser page in and return an API token" so the flow can be swapped. */
export interface Authenticator {
  authenticate(page: Page, options: AuthenticateOptions): Promise<AccessToken>;
}
