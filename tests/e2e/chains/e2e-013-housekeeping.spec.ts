import { chainTest, expect } from '../../../fixtures/chain';
import { installToastRecorder } from '../../../lib/assertions';
import { todayWib } from '../../../lib/dates';
import { Desk, SAVED } from '../shared/desk';

/**
 * E2E-013: the location of the test (with its shifts and activity), a vendor
 * contract with a price line (sent and approved), a daily log on that location
 * and shift, and the vendor's bill against that contract.
 */
const LOC = 'Location code';
const CEF = 'Center / end / frequency';
const PQ = 'People / quantity';
// The service center "QA Ruang Tindakan" of the branch, as in the module spec (24).
const CENTER = 'QA-UNIT-1';

chainTest('E2E-013', async ({ page, chain }) => {
  await installToastRecorder(page);
  const l = new Desk(page, '/housekeeping/locations', 'Locations', 'New location');
  const c = new Desk(page, '/housekeeping/contracts', 'Contracts', 'New');
  const g = new Desk(page, '/housekeeping/logs', 'Daily logs', 'New');
  const b = new Desk(page, '/housekeeping/bills', 'Bills', 'New');

  const loc = await chain.step(1, async (qa) => {
    const code = qa.code('X-LT1');
    await qa.step(1, async () => {
      await page.goto('/en/housekeeping');
      await page.getByRole('main').getByRole('link', { name: 'Locations' }).click();
      await expect(l.main.getByRole('heading', { level: 1, name: 'Locations' })).toBeVisible();
    });
    await qa.step(2, async () => {
      await l.main.getByRole('button', { name: 'New location' }).click();
      await expect(l.dialog).toHaveAccessibleName('Locations');
    });
    await qa.step(3, async () => {
      expect(await l.save({ [LOC]: code, Name: qa.name('X Lantai 1 uji'), [CEF]: CENTER, [PQ]: '3' })).toContain(SAVED);
      expect((await l.list(code)).some((r) => r[1].includes(code))).toBe(true);
    });
    await qa.step(4, async () => {
      expect(await l.save({ [LOC]: code, Name: qa.prefix('X Pagi'), [PQ]: '2' }, 'Save shift')).toContain(SAVED);
      expect(await l.save({ [LOC]: code, Name: qa.prefix('X Sore'), [PQ]: '1' }, 'Save shift')).toContain(SAVED);
    });
    await qa.step(5, async () => expect(await l.save({ [LOC]: code, Name: qa.prefix('X Mengepel'), [CEF]: 'daily' }, 'Save activity')).toContain(SAVED));
    await qa.step(6, async () => expect(await l.save({ [LOC]: code, Material: qa.code('X-KARBOL'), [PQ]: '2' }, 'Save material')).toContain(SAVED));
    await qa.step(7, async () => expect(await l.save({ [LOC]: code }, 'Match')).toContain(SAVED));
    await qa.step(8, async () => qa.note(8, `the table for the location: ${(await l.list(code)).map((r) => r.join(' | ')).join(' ; ')}`));
    return code;
  });

  const contract = await chain.step(2, async (qa) => {
    let id = '';
    await qa.step(1, async () => {
      await page.goto('/en/housekeeping');
      await page.getByRole('main').getByRole('link', { name: 'Contracts' }).click();
      await expect(c.main.getByRole('heading', { level: 1, name: 'Contracts' })).toBeVisible();
    });
    await qa.step(2, async () => {
      await c.main.getByRole('button', { name: 'New', exact: true }).click();
      await expect(c.dialog.getByRole('combobox', { name: 'Action' }).locator('option')).toHaveText(['Save contract', 'Price line', 'Send contract', 'Approve contract']);
    });
    await qa.step(3, async () => {
      const r = await c.create({ Number: qa.code('X-HK-001'), Name: qa.prefix('X PT Bersih Uji'), 'Start / date': '2026-11-01', [CEF]: '2027-10-31' });
      expect(r.toasts).toContain(SAVED);
      id = r.id;
      expect(await c.status(id)).toBe('draft');
    });
    await qa.step(4, async () => expect(await c.save({ Document: id, [CEF]: qa.prefix('X per orang per shift'), Amount: '150000' }, 'Price line')).toContain(SAVED));
    await qa.step(5, async () => {
      expect(await c.save({ Document: id }, 'Send contract')).toContain(SAVED);
      expect(await c.status(id)).toBe('sent');
      expect(await c.save({ Document: id }, 'Approve contract')).toContain(SAVED);
      expect(await c.status(id)).toBe('approved');
    });
    return id;
  });

  await chain.step(3, async (qa) => {
    let id = '';
    await qa.step(1, async () => {
      await page.goto('/en/housekeeping');
      await page.getByRole('main').getByRole('link', { name: 'Daily logs' }).click();
      await expect(g.main.getByRole('heading', { level: 1, name: 'Daily logs' })).toBeVisible();
    });
    await qa.step(2, async () => {
      await g.main.getByRole('button', { name: 'New', exact: true }).click();
      await expect(g.dialog.getByRole('combobox', { name: 'Action' }).locator('option')).toHaveText(['Log', 'Approve log']);
    });
    await qa.step(3, async () => {
      const r = await g.create({ Number: qa.code('X-LOG-001'), [LOC]: loc, Name: qa.prefix('X Pagi'), 'Start / date': todayWib(), [PQ]: '2' });
      expect(r.toasts).toContain(SAVED);
      id = r.id;
      const status = await g.status(id);
      expect(status).not.toBe('');
      if (status !== 'draft') qa.deviation(3, 'a row with the status "draft"', `the new log reads "${status}"`);
    });
    await qa.step(4, async () => {
      expect(await g.save({ Document: id }, 'Approve log')).toContain(SAVED);
      expect(await g.status(id)).toBe('approved');
    });
  });

  await chain.step(4, async (qa) => {
    await qa.step(1, async () => {
      await page.goto('/en/housekeeping');
      await page.getByRole('main').getByRole('link', { name: 'Bills' }).click();
      await expect(b.main.getByRole('heading', { level: 1, name: 'Bills' })).toBeVisible();
    });
    await qa.step(2, async () => {
      await b.main.getByRole('button', { name: 'New', exact: true }).click();
      for (const f of ['Document', 'Amount']) await expect(b.dialog.getByRole('textbox', { name: f })).toBeVisible();
    });
    await qa.step(3, async () => {
      const r = await b.create({ Document: contract, Amount: '9000000' });
      expect(r.toasts).toContain(SAVED);
      expect(r.id).not.toBe('');
    });
    await qa.step(4, async () => {
      await page.goto('/en/finance/vouchers');
      await expect(page.getByRole('table').first()).toBeVisible();
      const rows = (await page.getByRole('table').getByRole('row').filter({ hasText: 'QA-PT Bersih Uji' }).allInnerTexts()).map((x) => x.replace(/\s+/g, ' '));
      qa.note(4, `vouchers of the vendor on the first page: ${rows.slice(0, 2).join(' ; ') || 'none'}`);
    });
    await qa.step(5, async () => {
      const rows = await b.list(contract);
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((r) => r.join(' ').includes(contract))).toBe(true);
    });
    await qa.step(6, async () => {
      await b.open();
      const before = await b.main.innerText();
      await b.main.getByRole('button', { name: 'CSV', exact: true }).click();
      await expect.poll(async () => (await b.main.innerText()) !== before, { timeout: 5_000 }).toBe(true);
    });
  });
});
