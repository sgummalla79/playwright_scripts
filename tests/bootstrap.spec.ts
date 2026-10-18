import { installEmptyAuthenticator, persistPasskey } from '../src/passkey/virtualPasskey';
import { LoginStepHandler } from '../src/auth/loginStepHandler';
import { loadWebServerFlowConfig } from '../src/config/config';
import { registerPasskeyFromSession } from '../src/passkey/registerPasskey';
import { test } from './fixtures';

// One-time per org user: logs in, registers a virtual passkey, and stores it.
test('bootstrap: register virtual passkey during web server flow login', async ({ page, context, authenticator, passkeyStore, loginFlow }) => {
  await installEmptyAuthenticator(context); // must precede navigation

  const token = await authenticator.authenticate(page, { registerPasskey: true });

  // Login only prompts for registration when the user has no passkey; otherwise register explicitly.
  if ((await context.credentials.get({})).length === 0) {
    await registerPasskeyFromSession(page, context, token, new LoginStepHandler(loadWebServerFlowConfig()), loginFlow.loginTimeoutMs);
  }

  const passkey = await persistPasskey(context, passkeyStore);
  console.log(`Passkey stored for rpId=${passkey.rpId} (id=${passkey.id})`);
});
