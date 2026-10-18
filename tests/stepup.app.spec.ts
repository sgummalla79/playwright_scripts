import { completeStepUpIfPrompted } from '../src/auth/stepUp';
import { SETUP_UI, SF_PATHS } from '../src/config/constants';
import { installStoredPasskey, persistPasskey } from '../src/passkey/virtualPasskey';
import { expect, test } from './fixtures';
import { anyFrameShowsText } from './support/frames';
import { captureScreenshot } from './support/screenshot';

// Salesforce MAY demand passkey re-verification (step-up) for sensitive Setup pages; the test must
// pass either way, answering the prompt with the stored virtual passkey when it appears.
test('step-up: Auth Providers setup page, passkey answered if prompted', async ({ page, context, passkeyStore, loginSteps, loginFlow, setup, screenshotDir }, testInfo) => {
  // The app project only restores cookies; the virtual passkey must be installed explicitly.
  const passkey = await installStoredPasskey(context, passkeyStore);
  const target = new URL(SF_PATHS.authProvidersSetup, setup.baseUrl);

  // 'commit': a step-up redirect can interrupt a full load, so don't wait for DOM events.
  await page.goto(target.toString(), { waitUntil: 'commit' });

  const { passkeyPrompted } = await completeStepUpIfPrompted(page, loginSteps, {
    // The Setup shell loads at the target URL first, then Salesforce may redirect to verification a few
    // seconds later, so only the page's real content counts as "arrived".
    isTarget: async (p) => {
      const url = new URL(p.url(), 'about:blank');
      return url.host === target.host && url.pathname.startsWith(target.pathname) && (await anyFrameShowsText(p, SETUP_UI.authProvidersReadyText));
    },
    timeoutMs: loginFlow.loginTimeoutMs,
  });
  console.log(`[step-up] passkey prompted: ${passkeyPrompted}`);

  await expect(page).toHaveURL(new RegExp(target.pathname));

  const shot = await captureScreenshot(page, testInfo, screenshotDir, 'auth-providers');
  console.log(`[step-up] screenshot saved: ${shot}`);

  // signCount only moves when an assertion happened; persist it so the next run continues from there.
  if (passkeyPrompted) await persistPasskey(context, passkeyStore, passkey.id);
});
