import { asOnSite } from '../../../lib/i18n';
import { expect, qaTest, test } from '../../../fixtures/e2e';
import { AppHeader } from '../../../pages/AppHeader';
import { screenOpens } from '../shared/screen-opens';

/** 06-transfusion-medicine.xlsx: hub (TC-APP006-032) and the screen check of every route (073 … 077). */
qaTest('TC-APP006-032', async ({ page, qa }) => {
  const main = page.getByRole('main');
  const tiles: [string, string][] = [['Blood request', 'Blood request'], ['Stock', 'Stock'], ['Quality control', 'Quality control']];

  await qa.step(1, async () => {
    await page.goto('/id/apps');
    await page.getByRole('link', { name: /^Transfusion Medicine\b/ }).first().click();
    await expect(main.getByRole('navigation', { name: 'Breadcrumb' })).toHaveText(/^Home\s*\/\s*Transfusion Medicine$/);
    await expect(main.getByText('Requests, donors, stock, and quality control in one flow.')).toBeVisible();
    await expect(main.getByRole('link', { name: 'New request' })).toBeVisible();
    qa.deviation(1, 'A button "New request"', '"New request" is a link');
    for (const t of ['Blood request', 'Donors', 'Stock', 'Quality control']) await expect(main.getByRole('link', { name: t, exact: true })).toBeVisible();
  });

  await qa.step(2, async () => {
    for (const [tile, heading] of tiles) {
      await page.goto('/id/bloodbank');
      await main.getByRole('link', { name: tile, exact: true }).click();
      await expect(main.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    }
    await page.goto('/id/bloodbank');
    await main.getByRole('link', { name: 'Donors', exact: true }).click();
    await expect(main.getByRole('heading', { level: 1, name: "This page couldn't load" })).toBeVisible();
    qa.blocked(2, 2);
  });

  await qa.step(3, () => asOnSite(async () => {
    const header = new AppHeader(page);
    try {
      await header.selectLanguage('ID');
      const seen: string[] = [];
      for (const r of ['requisitions', 'stock', 'qc']) {
        await page.goto(`/id/bloodbank/${r}`);
        seen.push(await main.getByRole('heading', { level: 1 }).innerText());
      }
      expect(seen).not.toEqual(['Blood request', 'Stock', 'Quality control']);
      qa.note(3, `Indonesian headings: ${seen.join(', ')}; Donors not opened (HTTP 500)`);
    } finally {
      await header.selectLanguage('ID');
    }
  }));
});

const SCREENS: [string, string, string][] = [
  ['TC-APP006-073', '/bloodbank', 'Transfusion Medicine'],
  ['TC-APP006-075', '/bloodbank/qc', 'Quality control'],
  ['TC-APP006-076', '/bloodbank/requisitions', 'Blood request'],
  ['TC-APP006-077', '/bloodbank/stock', 'Stock'],
];
for (const [id, route, heading] of SCREENS) {
  qaTest(id, async ({ page, qa }) => {
    await qa.step(1, () => screenOpens(page, route, heading));
  });
}

qaTest('TC-APP006-074', async ({ page, qa }) => {
  // /bloodbank/donors answers HTTP 500: checklist blocker 2 (the journey of this screen check is not linked to it).
  const response = await page.goto('/id/bloodbank/donors');
  qa.note(1, `HTTP ${response?.status()}`);
  if (response?.status() === 500) {
    qa.blocked(1, 2);
    test.skip(true, 'Blocker 2: Donor screen answers HTTP 500 (00-blockers-checklist-linked.xlsx | Checklist | row 6)');
  }
  await qa.step(1, () => screenOpens(page, '/bloodbank/donors', 'Donors'));
});
