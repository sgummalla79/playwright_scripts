import { defineConfig } from '@playwright/test';
import { loadEnv, loadLoginFlowConfig } from './src/config/config';

const { loginTimeoutMs } = loadLoginFlowConfig(loadEnv());

/** Login runs several sequential steps (login, passkey, consent); allow headroom per step. */
const LOGIN_TEST_TIMEOUT_MULTIPLIER = 2;

export default defineConfig({
  testDir: './tests',
  timeout: loginTimeoutMs * LOGIN_TEST_TIMEOUT_MULTIPLIER,
  workers: 1, // the passkey signCount is shared mutable state
  fullyParallel: false,
  reporter: [['list']],
  use: { trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'bootstrap', testMatch: /bootstrap\.spec\.ts/ },
    { name: 'unattended', testMatch: /login\.spec\.ts/ },
  ],
});
