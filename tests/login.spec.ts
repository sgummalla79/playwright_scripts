import { expect, test } from './fixtures';
import { unattendedLogin } from './support/unattendedLogin';

test('unattended login: web server flow + virtual passkey assertion', async ({ page, context, authenticator, passkeyStore, loginFlow }) => {
  await unattendedLogin({ page, context, authenticator, passkeyStore, loginFlow });
  await expect(page).toHaveURL(new RegExp(loginFlow.returnPath));
});
