import { expect, qaTest } from '../../../fixtures/e2e';
import { AppHeader } from '../../../pages/AppHeader';

/** 04-inpatient.xlsx, feature "Inpatient (/adt)": hub, navigation and Indonesian. */
qaTest('TC-APP004-020', async ({ page, qa }) => {
  const main = page.getByRole('main');
  const screens: [string, string][] = [['Admit', 'Admissions'], ['Bed management', 'Bed management'], ['Discharge', 'Discharges']];

  await qa.step(1, async () => {
    await page.goto('/en/apps');
    await page.getByRole('link', { name: /^Inpatient\b/ }).first().click();
    await expect(main.getByRole('navigation', { name: 'Breadcrumb' })).toHaveText(/^Home\s*\/\s*Inpatient$/);
    await expect(main.getByRole('heading', { level: 1, name: 'Inpatient' })).toBeVisible();
    await expect(main.getByText('Admission, transfer, discharge & bed management')).toBeVisible();
    await expect(main.getByRole('link', { name: 'Open admissions' })).toBeVisible();
    qa.deviation(1, 'A button "Open admissions"', '"Open admissions" is a link');
    for (const [tile] of screens) await expect(main.getByRole('link', { name: tile, exact: true })).toBeVisible();
    qa.note(1, 'the hub also has the tiles "Requests" and "Ward"');
  });

  await qa.step(2, async () => {
    for (const [tile, heading] of screens) {
      await page.goto('/en/adt');
      await main.getByRole('link', { name: tile, exact: true }).click();
      await expect(main.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    }
    const sidebar = page.getByRole('complementary').filter({ hasText: 'Inpatient' });
    for (const [, heading] of screens) {
      await sidebar.getByRole('link', { name: heading, exact: true }).click();
      await expect(main.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    }
  });

  await qa.step(3, async () => {
    const header = new AppHeader(page);
    try {
      await header.selectLanguage('ID');
      const seen: string[] = [];
      for (const r of ['admissions', 'beds', 'discharges']) {
        await page.goto(`/id/adt/${r}`);
        seen.push(await main.getByRole('heading', { level: 1 }).innerText());
      }
      expect(seen).not.toEqual(['Admissions', 'Bed management', 'Discharges']);
      qa.note(3, `Indonesian headings: ${seen.join(', ')}`);
      if (seen.includes('Admissions')) qa.note(3, 'the title "Admissions" stays English (known risk in the workbook)');
    } finally {
      await header.selectLanguage('EN');
    }
  });
});
