import { test } from './fixtures';
import { unattendedLogin } from './support/unattendedLogin';

// Logs in once and saves the browser session so every other test project starts already authenticated.
test('setup: authenticate and save session', async ({ page, context, authenticator, passkeyStore, loginFlow, sessionStore }) => {
  if (sessionStore.isFresh()) {
    console.log('[session] reusing saved session; skipping login');
    return;
  }
  const token = await unattendedLogin({ page, context, authenticator, passkeyStore, loginFlow });
  await context.storageState({ path: sessionStore.statePath });
  sessionStore.saveMeta({ instanceUrl: token.instanceUrl, savedAt: Date.now() });
  console.log('[session] session saved');
});
