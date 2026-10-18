import type { Page } from '@playwright/test';

/** true if any frame on the page (Setup pages render their content in iframes) currently shows the text. */
export async function anyFrameShowsText(page: Page, text: string): Promise<boolean> {
  for (const frame of page.frames()) {
    try {
      if (await frame.getByText(text).first().isVisible()) return true;
    } catch {
      // frame navigating or detached mid-check
    }
  }
  return false;
}
