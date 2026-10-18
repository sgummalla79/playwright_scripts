import { test as base } from '@playwright/test';
import type { Authenticator } from '../src/auth/authenticator';
import { WebServerFlowAuthenticator } from '../src/auth/webServerFlowAuthenticator';
import {
  loadLoginFlowConfig,
  loadPasskeyStoreConfig,
  loadWebServerFlowConfig,
  type LoginFlowConfig,
} from '../src/config/config';
import { FilePasskeyStore } from '../src/passkey/filePasskeyStore';
import type { PasskeyStore } from '../src/passkey/passkeyStore';

interface Fixtures {
  authenticator: Authenticator;
  passkeyStore: PasskeyStore;
  loginFlow: LoginFlowConfig;
}

export const test = base.extend<Fixtures>({
  loginFlow: async ({}, use) => use(loadLoginFlowConfig()),
  authenticator: async ({ loginFlow }, use) => use(new WebServerFlowAuthenticator(loadWebServerFlowConfig(), loginFlow)),
  passkeyStore: async ({}, use) => use(new FilePasskeyStore(loadPasskeyStoreConfig())),
});

export { expect } from '@playwright/test';
