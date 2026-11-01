import { expect, type Locator, type Page } from '@playwright/test';

/**
 * "Clicks "Print barcode" → The browser print preview shows the label only"
 * by simulation (lib/qa-data/plan.ts, SIMULATED): window.print is replaced
 * by a counter before the click, and the page is then read under the print
 * media type, as the print preview lays it out. Returns whether print was
 * called and what besides the label stays visible in print.
 */
export async function printPreview(page: Page, click: () => Promise<void>, label: Locator): Promise<{ printed: boolean; labelShown: boolean; alsoShown: string[] }> {
  await page.evaluate(() => {
    const w = window as unknown as { qaPrinted: number; print: () => void };
    w.qaPrinted = 0;
    w.print = () => {
      w.qaPrinted += 1;
    };
  });
  await click();
  const printed = await expect
    .poll(() => page.evaluate(() => (window as unknown as { qaPrinted: number }).qaPrinted), { timeout: 5_000 })
    .toBeGreaterThan(0)
    .then(() => true, () => false);
  await page.emulateMedia({ media: 'print' });
  try {
    const labelShown = await label.isVisible();
    const alsoShown: string[] = [];
    const main = page.getByRole('main');
    if (await main.getByRole('table').first().isVisible().catch(() => false)) alsoShown.push('the list');
    if (await page.getByRole('navigation').first().isVisible().catch(() => false)) alsoShown.push('the menu');
    if (await page.getByRole('complementary').first().isVisible().catch(() => false)) alsoShown.push('the side menu');
    const buttons = (await page.getByRole('button').evaluateAll((bs) => bs.filter((b) => (b as HTMLElement).offsetParent !== null && getComputedStyle(b).visibility !== 'hidden').map((b) => (b.textContent ?? '').trim()).filter(Boolean)));
    if (buttons.length) alsoShown.push(`buttons ${[...new Set(buttons)].slice(0, 6).join(', ')}`);
    return { printed, labelShown, alsoShown };
  } finally {
    await page.emulateMedia({ media: 'screen' });
  }
}
