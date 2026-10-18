import { installStoredPasskey, persistPasskey } from '../src/passkey/virtualPasskey';
import { expect, test } from './fixtures';

test('unattended login: web server flow + virtual passkey assertion', async ({ page, context, authenticator, passkeyStore, loginFlow }) => {
  const passkey = await installStoredPasskey(context, passkeyStore);

  const token = await authenticator.authenticate(page, { registerPasskey: false });

  console.log('[login] opening return page');
  // The UI session already exists from the browser login; open the target page with it.
  await page.goto(new URL(loginFlow.returnPath, token.instanceUrl).toString(), { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(new RegExp(loginFlow.returnPath), { timeout: loginFlow.loginTimeoutMs });

  console.log(`[login] reached ${new URL(page.url()).host}${new URL(page.url()).pathname}`);

  // signCount increments per assertion; persist so the next run continues from what Salesforce has seen.
  await persistPasskey(context, passkeyStore, passkey.id);
});
