import { test as base } from '@playwright/test';
import type { Authenticator } from '../src/auth/authenticator';
import { WebServerFlowAuthenticator } from '../src/auth/webServerFlowAuthenticator';
import {
  loadLoginFlowConfig,
  loadPasskeyStoreConfig,
  loadSessionConfig,
  loadWebServerFlowConfig,
  type LoginFlowConfig,
} from '../src/config/config';
import { FilePasskeyStore } from '../src/passkey/filePasskeyStore';
import type { PasskeyStore } from '../src/passkey/passkeyStore';
import { FileSessionStore } from '../src/session/fileSessionStore';
import type { SessionStore } from '../src/session/sessionStore';

interface Fixtures {
  authenticator: Authenticator;
  passkeyStore: PasskeyStore;
  loginFlow: LoginFlowConfig;
  sessionStore: SessionStore;
  /** Instance URL of the org the saved session belongs to (written by the setup project). */
  instanceUrl: string;
}

export const test = base.extend<Fixtures>({
  loginFlow: async ({}, use) => use(loadLoginFlowConfig()),
  authenticator: async ({ loginFlow }, use) => use(new WebServerFlowAuthenticator(loadWebServerFlowConfig(), loginFlow)),
  passkeyStore: async ({}, use) => use(new FilePasskeyStore(loadPasskeyStoreConfig())),
  sessionStore: async ({}, use) => use(new FileSessionStore(loadSessionConfig())),
  instanceUrl: async ({ sessionStore }, use) => {
    const meta = sessionStore.loadMeta();
    if (!meta) throw new Error('No saved session metadata. Run the setup project first (npm run test:app does this).');
    await use(meta.instanceUrl);
  },
});

export { expect } from '@playwright/test';
