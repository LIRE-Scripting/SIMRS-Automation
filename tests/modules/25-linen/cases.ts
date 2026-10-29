import { Desk, SAVED } from '../shared/desk';
import { expect } from '../../../fixtures/e2e';
import type { Page } from '@playwright/test';
import type { Qa } from '../../../fixtures/e2e';

/**
 * Test cases of 25-linen that end-to-end chains run too (tests/e2e/chains/):
 * each is declared by its module spec with qaTest and called by a chain with the chain's Qa.
 */
export type CaseArgs = { page: Page; qa: Qa };

export const TC_APP025_001 = async ({ page, qa }: CaseArgs): Promise<void> => {
  const s = stores(page);
  await qa.step(1, async () => {
    await page.goto('/id/linen');
    await page.getByRole('main').getByRole('link', { name: 'Stores and recipe' }).click();
    await expect(s.main.getByRole('heading', { level: 1, name: 'Stores and recipe' })).toBeVisible();
    await expect(s.main.getByRole('button', { name: 'Save stores' })).toBeVisible();
    await expect(s.main.getByRole('columnheader')).toHaveText(['Status', 'Detail', 'Code', '']);
  });
  await qa.step(2, async () => {
    await s.main.getByRole('button', { name: 'Save stores' }).click();
    await expect(s.dialog).toHaveAccessibleName('Stores and recipe');
    for (const f of [...Object.keys(STORES), 'Finished item', 'Quantity']) await expect(s.dialog.getByRole('textbox', { name: f })).toBeVisible();
    await expect(s.dialog.getByRole('combobox', { name: 'Action' }).locator('option')).toHaveText(['Save stores', 'Save recipe']);
  });
  await qa.step(3, async () => {
    expect(await s.save(STORES)).toContain(SAVED);
    qa.note(3, 'the stores of the branch (GLB, LDR, GST) are saved again: the workbook\'s "X Gudang linen", "X Laundry" and "X Gudang bangsal" are not in Inventory');
    expect((await s.list()).some((r) => r[1].includes('GLB / LDR / GST'))).toBe(true);
  });
  qa.blocked(4, 14);
  qa.blocked(5, 14);
  qa.note(4, ITEMS);
};

export const STORES = { 'Component / linen store': 'GLB', 'Contractor / laundry': 'LDR', 'Sterile / ward store': 'GST' };

export const stores = (p: Page) => new Desk(p, '/linen/stores', 'Stores and recipe', 'Save stores');

export const ITEMS = 'the items "X-SPREI" and "X-KAIN" and their stock in the linen store are not in Inventory (07)';
