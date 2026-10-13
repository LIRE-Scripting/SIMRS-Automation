import { type Page } from '@playwright/test';

/**
 * Navigates and retries once when the app's own reload aborts the request
 * (net::ERR_ABORTED), which happens e.g. right after a branch switch.
 */
export async function gotoStable(page: Page, url: string): Promise<void> {
  await page.goto(url).catch(async (error) => {
    if (String(error).includes('ERR_ABORTED')) {
      await page.waitForTimeout(1_000);
      await page.goto(url);
      return;
    }
    throw error;
  });
}
