import { defineConfig } from '@playwright/test';
import { loadEnv, loadLoginFlowConfig, loadSessionConfig } from './src/config/config';

const env = loadEnv();
const { loginTimeoutMs } = loadLoginFlowConfig(env);
const { statePath } = loadSessionConfig(env);

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
    // Logs in once (or reuses a fresh saved session) and stores it at SESSION_STATE_PATH.
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    // Regular tests: depend on setup and start already authenticated.
    {
      name: 'app',
      testMatch: /.*\.app\.spec\.ts/,
      dependencies: ['setup'],
      use: { storageState: statePath },
    },
  ],
});
