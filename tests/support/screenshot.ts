import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Page, TestInfo } from '@playwright/test';
import { SCREENSHOT_SETTLE_TIMEOUT_MS } from '../../src/config/constants';

/** "step-up: Auth Providers page" -> "step-up-auth-providers-page" (safe as a folder name). */
export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** UTC timestamp safe for file names, sortable: 20261018-113045-123 */
export function fileTimestamp(date: Date = new Date()): string {
  const iso = date.toISOString(); // 2026-10-18T11:30:45.123Z
  return `${iso.slice(0, 10).replace(/-/g, '')}-${iso.slice(11, 19).replace(/:/g, '')}-${iso.slice(20, 23)}`;
}

/**
 * Waits (bounded) for the page to settle and saves a full-page screenshot at
 * <dir>/<test-case>/<name>-<timestamp>.png, so every run adds a new file and nothing is overwritten.
 * Also attaches it to the test report.
 */
export async function captureScreenshot(page: Page, testInfo: TestInfo, dir: string, name: string): Promise<string> {
  await page.waitForLoadState('networkidle', { timeout: SCREENSHOT_SETTLE_TIMEOUT_MS }).catch(() => {
    // Lightning keeps polling; capture what is rendered after the cap.
  });
  const testCaseDir = join(dir, slugify(testInfo.title));
  mkdirSync(testCaseDir, { recursive: true });
  const path = join(testCaseDir, `${name}-${fileTimestamp()}.png`);
  await page.screenshot({ path, fullPage: true });
  await testInfo.attach(name, { path, contentType: 'image/png' });
  return path;
}
