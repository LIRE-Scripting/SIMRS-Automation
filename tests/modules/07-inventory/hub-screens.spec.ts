import { asOnSite } from '../../../lib/i18n';
import { expect, qaTest } from '../../../fixtures/e2e';
import { AppHeader } from '../../../pages/AppHeader';
import { screenOpens } from '../shared/screen-opens';

/** 07-inventory.xlsx: hub (TC-APP007-015) and the screen check of every route (054 … 061). */
qaTest('TC-APP007-015', async ({ page, qa }) => {
  const main = page.getByRole('main');
  const tiles: [string, string][] = [['Item Master', 'Item Master'], ['Stock Requests', 'Stock Requests'], ['Stores', 'Stores']];

  await qa.step(1, async () => {
    await page.goto('/id/apps');
    await page.getByRole('link', { name: /^Inventory\b/ }).first().click();
    await expect(main.getByRole('navigation', { name: 'Breadcrumb' })).toHaveText(/^Home\s*\/\s*Apps\s*\/\s*Inventory$/);
    await expect(main.getByRole('heading', { level: 1, name: 'Inventory' })).toBeVisible();
    await expect(main.getByText('Item master, stock requests & stores')).toBeVisible();
    await expect(main.getByRole('link', { name: 'Item Master' }).first()).toBeVisible();
    qa.deviation(1, 'A button "Item Master"', '"Item Master" is a link');
    for (const [t] of tiles) await expect(main.getByRole('link', { name: t, exact: true }).first()).toBeVisible();
  });

  await qa.step(2, async () => {
    for (const [tile, heading] of tiles) {
      await page.goto('/id/inventory');
      await main.getByRole('link', { name: tile, exact: true }).last().click();
      await expect(main.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    }
  });

  await qa.step(3, () => asOnSite(async () => {
    const header = new AppHeader(page);
    try {
      await header.selectLanguage('ID');
      const seen: string[] = [];
      for (const r of ['items', 'stock-requests', 'stores']) {
        await page.goto(`/id/inventory/${r}`);
        seen.push(await main.getByRole('heading', { level: 1 }).innerText());
      }
      expect(seen).not.toEqual(['Item Master', 'Stock Requests', 'Stores']);
      qa.note(3, `Indonesian headings: ${seen.join(', ')}`);
    } finally {
      await header.selectLanguage('ID');
    }
  }));
});

const SCREENS: [string, string, string][] = [
  ['TC-APP007-054', '/inventory', 'Inventory'],
  ['TC-APP007-055', '/inventory/documents', 'Store documents'],
  ['TC-APP007-056', '/inventory/items', 'Item Master'],
  ['TC-APP007-057', '/inventory/ledger', 'Stock book'],
  ['TC-APP007-058', '/inventory/setup', 'Branch and stores'],
  ['TC-APP007-059', '/inventory/stock-desk', 'Stock desk'],
  ['TC-APP007-060', '/inventory/stock-requests', 'Stock Requests'],
  ['TC-APP007-061', '/inventory/stores', 'Stores'],
];
for (const [id, route, heading] of SCREENS) {
  qaTest(id, async ({ page, qa }) => {
    await qa.step(1, () => screenOpens(page, route, heading));
  });
}
