import { test as base } from '@playwright/test';
import type { Authenticator } from '../src/auth/authenticator';
import { LoginStepHandler } from '../src/auth/loginStepHandler';
import { WebServerFlowAuthenticator } from '../src/auth/webServerFlowAuthenticator';
import {
  loadLoginFlowConfig,
  loadPasskeyStoreConfig,
  loadScreenshotDir,
  loadSessionConfig,
  loadSetupConfig,
  loadWebServerFlowConfig,
  type LoginFlowConfig,
  type SetupConfig,
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
  loginSteps: LoginStepHandler;
  setup: SetupConfig;
  screenshotDir: string;
  /** Instance URL of the org the saved session belongs to (written by the setup project). */
  instanceUrl: string;
}

export const test = base.extend<Fixtures>({
  loginFlow: async ({}, use) => use(loadLoginFlowConfig()),
  authenticator: async ({ loginFlow }, use) => use(new WebServerFlowAuthenticator(loadWebServerFlowConfig(), loginFlow)),
  passkeyStore: async ({}, use) => use(new FilePasskeyStore(loadPasskeyStoreConfig())),
  sessionStore: async ({}, use) => use(new FileSessionStore(loadSessionConfig())),
  loginSteps: async ({}, use) => use(new LoginStepHandler(loadWebServerFlowConfig())),
  setup: async ({}, use) => use(loadSetupConfig()),
  screenshotDir: async ({}, use) => use(loadScreenshotDir()),
  instanceUrl: async ({ sessionStore }, use) => {
    const meta = sessionStore.loadMeta();
    if (!meta) throw new Error('No saved session metadata. Run the setup project first (npm run test:app does this).');
    await use(meta.instanceUrl);
  },
});

export { expect } from '@playwright/test';
