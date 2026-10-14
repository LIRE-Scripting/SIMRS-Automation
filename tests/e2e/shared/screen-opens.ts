import { expect } from '../../../fixtures/e2e';

/**
 * The screen check of every route ("Screen <route> opens" test cases of
 * each workbook). The workbooks open /id/...; the suite runs in English
 * (answer Q6), so the same route is opened under /en/.
 */
/** "HTTP 200; the screen shows its title and controls; no error screen; no request of the page fails." */
export async function screenOpens(
  page: import('@playwright/test').Page,
  route: string,
  heading: string,
): Promise<void> {
  const failed: string[] = [];
  page.on('requestfailed', (r) => {
    if (!/ERR_ABORTED/.test(r.failure()?.errorText ?? '')) failed.push(`${r.url()} ${r.failure()?.errorText}`);
  });
  page.on('response', (r) => {
    if (r.status() >= 400 && r.url().startsWith(new URL(page.url() || 'https://rs.showcase.atklik.xyz').origin)) {
      failed.push(`${r.status()} ${r.url()}`);
    }
  });
  const response = await page.goto(`/en${route}`);
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('main').getByRole('heading', { level: 1, name: heading })).toBeVisible();
  await expect(page.getByText("This page couldn't load")).toHaveCount(0);
  // Controls: buttons on the work screens, links (tiles) on the hub.
  await expect(page.getByRole('main').getByRole('button').or(page.getByRole('main').getByRole('link')).first()).toBeVisible();
  expect(failed).toEqual([]);
}

