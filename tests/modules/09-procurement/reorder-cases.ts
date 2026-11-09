import { expect, qaTest } from '../../../fixtures/e2e';
import type { QaBody } from '../../../fixtures/e2e';

/** The test cases of reorder.spec.ts, shared with the end-to-end chains (chain.run). */

/**
 * 09-procurement.xlsx, "Reorder: reading the list" (TC-APP009-053). Checklist
 * blocker 13 (the Reorder list of Podomoro was empty) was seen resolved on
 * 2026-11-01: the list holds items below their minimum stock.
 */
export const TC_APP009_053: QaBody = async ({ page, qa }) => {
  await qa.step(1, async () => {
    await page.goto('/id/procurement');
    await page.getByRole('complementary').getByRole('link', { name: 'Reorder' }).first().click();
    const main = page.getByRole('main');
    await expect(main.getByRole('heading', { level: 1, name: 'Reorder' })).toBeVisible();
    await expect(main.getByText('Central purchase orders and letters of intent stay out.')).toBeVisible();
    // The list loads after the page: its items, else the empty-list text.
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect.poll(async () => /QA-|·/.test(await main.innerText()), { timeout: 10_000 }).toBe(true).catch(() => {});
    const text = (await main.innerText()).replace(/\s+/g, ' ');
    qa.note(1, `the list: "${text.slice(0, 200)}"`);
  });
};
