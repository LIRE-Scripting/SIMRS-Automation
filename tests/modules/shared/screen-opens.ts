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
  qa?: { deviation(step: number, excel: string, site: string): void },
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
  // Some screens (Procurement hub, Purchase orders) have no <main> landmark; the page body stands in.
  await expect(page.getByRole('heading', { level: 1, name: heading }).first()).toBeVisible();
  const main = (await page.getByRole('main').count()) ? page.getByRole('main') : page.locator('body');
  await expect(page.getByText("This page couldn't load")).toHaveCount(0);
  // Controls: buttons on the work screens, links (tiles) on the hub, or an input (a day picker with nothing listed).
  const control = main.getByRole('button').or(main.getByRole('link')).or(main.locator('input')).first();
  if (qa && !(await control.isVisible({ timeout: 5_000 }).catch(() => false))) {
    // A read-only list screen (e.g. Reorder) has a title and its rows but no control.
    await expect(main).not.toHaveText(heading);
    qa.deviation(1, 'The screen shows its title and controls', 'the title and a read-only list; no control');
  } else {
    await expect(control).toBeVisible();
  }
  expect(failed).toEqual([]);
}

