import { expect, test } from './fixtures';

// Example of a normal test: starts already logged in via the saved session, no passkey step.
test('app: lands on the home page already authenticated', async ({ page, instanceUrl, loginFlow }) => {
  await page.goto(new URL(loginFlow.returnPath, instanceUrl).toString(), { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(new RegExp(loginFlow.returnPath), { timeout: loginFlow.loginTimeoutMs });
});
