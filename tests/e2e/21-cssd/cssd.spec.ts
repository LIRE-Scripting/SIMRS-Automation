import type { Locator, Page } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark } from '../../../lib/assertions';
import { screenOpens } from '../shared/screen-opens';
import { invalidFields, toastsAfter } from '../18-settings/helpers';
import { code, csv, Kind, made, master, Master, MASTERS, offeredOn, TC_APP021_001 } from './cases';

/**
 * 21-cssd.xlsx: the CSSD masters (autoclave, cycle, packing, indicator, test
 * name, result type), Pack Trace, the document lists, the hub and the screen
 * checks. Codes carry a token. The sterilization loop needs approvers (U5)
 * and stays fixme.
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

qaTest('TC-APP021-001', TC_APP021_001);

qaTest('TC-APP021-002', async ({ page, qa }) => {
  const a = master(page, 'autoclave');
  const number = code(qa, 'X-A2');
  await made(page, 'autoclave', { code: number, name: qa.name('X Autoklaf uji') });
  await qa.step(1, async () => {
    expect(await a.add({ code: number.toUpperCase(), name: qa.name('X Autoklaf uji') })).toContain('That code is already used.');
  });
  await qa.step(2, async () => {
    const text = await a.add({ code: code(qa, 'X-A2'), name: '' });
    const invalid = await invalidFields(a.dialog);
    expect(text).not.toMatch(/^Saved\./);
    qa.note(2, invalid.length ? `the browser stops the click (${invalid.join('; ')})` : `"${text.slice(0, 120)}"`);
  });
  await qa.step(3, async () => {
    await a.edit(number);
    const buttons = (await a.dialog.getByRole('button').allInnerTexts()).map((b) => b.trim());
    expect(buttons.some((b) => /delete/i.test(b))).toBe(false);
  });
});

qaTest('TC-APP021-003', async ({ page, qa }) => {
  const i = master(page, 'indicator');
  const ind = qa.code('X-K6');
  const tst = qa.code('X-BIO');
  await qa.step(1, async () => {
    await page.goto('/en/cssd');
    await page.getByRole('complementary').last().getByRole('link', { name: 'Indicator Type' }).click();
    await expect(i.main.getByRole('heading', { level: 1, name: 'Indicator Type' })).toBeVisible();
    await expect(i.main.getByText('The kind of quality check. Test names belong to an indicator type.', { exact: true })).toBeVisible();
    await expect(i.main.getByRole('columnheader')).toHaveText(['Code', 'Name', 'Status', 'Action']);
  });
  await qa.step(2, async () => {
    await i.main.getByRole('button', { name: 'New', exact: true }).click();
    await expect(i.dialog).toHaveAccessibleName('New');
    for (const f of ['Code', 'Name']) await expect(i.dialog.getByRole('textbox', { name: f })).toBeVisible();
    await expect(i.dialog.getByRole('checkbox', { name: 'Active' })).toBeChecked();
  });
  await qa.step(3, async () => {
    expect(await i.add({ code: ind, name: qa.name('X kelas 6') })).toContain('Saved.');
  });
  await qa.step(4, async () => {
    await made(page, 'test', { code: tst, name: qa.name('X Biologis'), parent: ind });
    expect((await master(page, 'test').cells(tst))[2]).toContain(ind.toUpperCase());
  });
  await qa.step(5, async () => {
    for (const r of ['X-LULUS', 'X-GAGAL']) {
      const c = qa.code(r);
      await made(page, 'result', { code: c, name: qa.name(r.replace('X-', 'X ')), parent: tst });
      expect((await master(page, 'result').cells(c))[2]).toContain(tst.toUpperCase());
    }
  });
  await qa.step(6, async () => {
    await page.goto('/en/cssd/cycles/new');
    await page.waitForLoadState('networkidle').catch(() => {});
    const add = page.getByRole('main').getByRole('button', { name: /check|quality/i });
    if (!(await add.count())) {
      qa.note(6, 'a new cycle offers no quality check before it is saved');
      return;
    }
    await add.first().click();
    const lists = await page.getByRole('main').getByRole('combobox').evaluateAll((es) => es.map((e) => e.getAttribute('aria-label') ?? (e as HTMLSelectElement).labels?.[0]?.textContent ?? ''));
    qa.note(6, `lists: ${lists.join(', ')}`);
  });
});

qaTest('TC-APP021-004', async ({ page, qa }) => {
  const ind = qa.code('X-K6');
  await made(page, 'indicator', { code: ind, name: qa.name('X kelas 6') });
  await qa.step(1, async () => {
    const text = await master(page, 'test').add({ code: qa.code('X-BIO'), name: qa.name('X Biologis'), parent: '' });
    const invalid = await invalidFields(page.getByRole('dialog'));
    expect(text).not.toMatch(/^Saved\./);
    if (!text.includes('Choose an indicator type.')) qa.deviation(1, 'The text "Choose an indicator type."', invalid.length ? `the browser stops the click (${invalid.join('; ')})` : `"${text.slice(0, 100)}"`);
  });
  await qa.step(2, async () => {
    const text = await master(page, 'result').add({ code: qa.code('X-LULUS'), name: qa.name('X Lulus'), parent: '' });
    const invalid = await invalidFields(page.getByRole('dialog'));
    expect(text).not.toMatch(/^Saved\./);
    if (!text.includes('Choose a test name.')) qa.deviation(2, 'The text "Choose a test name."', invalid.length ? `the browser stops the click (${invalid.join('; ')})` : `"${text.slice(0, 100)}"`);
  });
  qa.notRun(3, 'needs the indicator type set inactive while another dialog is still open (two windows at once)');
  await qa.step(4, async () => {
    const r = master(page, 'result');
    await r.open();
    await r.main.getByRole('button', { name: 'New', exact: true }).click();
    const fields = (await r.dialog.locator('label').allInnerTexts()).map((t) => t.trim()).filter(Boolean);
    qa.note(4, `a result type has ${fields.join(', ')}: nothing says pass or fail`);
  });
});

qaTest('TC-APP021-027', async ({ page, qa }) => {
  const main = page.getByRole('main');
  await qa.step(1, async () => {
    await page.goto('/en/cssd');
    await page.getByRole('complementary').last().getByRole('link', { name: 'Pack Trace' }).click();
    await expect(main.getByRole('heading', { level: 1, name: 'Pack Trace' })).toBeVisible();
    await expect(main.getByText('A packing number shows the request, the cycle that sterilized it, and the store that holds it now.', { exact: true })).toBeVisible();
    await expect(main.getByRole('textbox', { name: 'Packing number' })).toBeVisible();
    await expect(main.getByRole('button', { name: 'Open' })).toBeVisible();
  });
  for (const s of [2, 3, 4]) qa.notRun(s, 'needs a pack that went through the whole loop (requests, receipts, cycles and issues need U5)');
});

qaTest('TC-APP021-028', async ({ page, qa }) => {
  const main = page.getByRole('main');
  await qa.step(1, async () => {
    await page.goto('/en/cssd/trace');
    const mark = await toastMark(page);
    await main.getByRole('button', { name: 'Open' }).click();
    const toasts = await toastsAfter(page, mark, 3_000);
    const invalid = await invalidFields(main);
    qa.note(1, invalid.length ? `the browser stops the click (${invalid.join('; ')})` : toasts.length ? `toast "${toasts.join(' / ')}"` : 'nothing is said');
  });
  await qa.step(2, async () => {
    await page.goto('/en/cssd/trace');
    await main.getByRole('textbox', { name: 'Packing number' }).fill(qa.code('X-PACK'));
    const mark = await toastMark(page);
    await main.getByRole('button', { name: 'Open' }).click();
    const toasts = await toastsAfter(page, mark, 4_000);
    await page.waitForLoadState('networkidle').catch(() => {});
    qa.note(2, `toast "${toasts.join(' / ')}"; screen "${(await main.innerText()).replace(/\s+/g, ' ').slice(-120)}"`);
  });
  qa.notRun(3, 'needs a sterile pack issued to a ward (the loop needs U5)');
});

const LISTS = [
  ['requests', 'Sterile Request'],
  ['receipts', 'Unsterile Receipt'],
  ['cycles', 'Sterilization Cycle'],
  ['issues', 'Sterile Issue'],
  ['sterile-receipts', 'Sterile Receipt'],
] as const;

qaTest('TC-APP021-031', async ({ page, qa }) => {
  const main = page.getByRole('main');
  await qa.step(1, async () => {
    for (const [route, heading] of LISTS) {
      await page.goto(`/en/cssd/${route}`);
      await expect(main.getByRole('heading', { level: 1, name: heading })).toBeVisible();
      await expect(main.getByRole('searchbox')).toBeVisible();
      await expect(main.getByRole('link', { name: 'CSV' })).toBeVisible();
      const cols = (await main.getByRole('columnheader').allInnerTexts()).map((t) => t.trim());
      if (route === 'cycles') expect(cols).toContain('Approval');
      else {
        expect(cols).toContain('Document Status');
        expect(cols).toContain('Approval Status');
      }
    }
  });
  await qa.step(2, async () => {
    for (const [route] of LISTS) {
      await page.goto(`/en/cssd/${route}`);
      await page.waitForLoadState('networkidle').catch(() => {});
      const rows = main.getByRole('table').getByRole('rowgroup').nth(1).getByRole('row').filter({ has: page.getByRole('link', { name: 'Open' }) });
      if (!(await rows.count())) {
        qa.note(2, `${route}: no document to search`);
        continue;
      }
      const no = (await rows.first().getByRole('cell').first().innerText()).trim();
      const part = no.slice(0, Math.max(3, no.length - 2));
      await main.getByRole('searchbox').fill(part);
      await expect.poll(async () => (await rows.allInnerTexts()).every((t) => t.includes(part))).toBe(true);
    }
  });
  await qa.step(3, async () => {
    for (const [route] of LISTS) {
      await page.goto(`/en/cssd/${route}`);
      const f = await csv(page);
      qa.note(3, `${route}: ${f.lines} line(s)`);
      expect(f.lines).toBeGreaterThan(0);
    }
  });
  await qa.step(4, async () => {
    await page.goto('/en/cssd/requests');
    await main.getByRole('link', { name: 'Open' }).first().click();
    await page.waitForLoadState('networkidle').catch(() => {});
    const buttons = (await main.getByRole('button').allInnerTexts()).map((b) => b.trim()).filter(Boolean);
    qa.note(4, `${page.url().split('/').slice(-2).join('/')}: buttons ${buttons.join(', ')}`);
    await expect(main.getByRole('heading', { level: 2, name: 'Sets' })).toBeVisible();
    await expect(main.getByRole('heading', { level: 2, name: 'Items' })).toBeVisible();
  });
  await qa.step(5, async () => {
    const pairs = new Set<string>();
    for (const [route] of LISTS.filter(([r]) => r !== 'cycles')) {
      await page.goto(`/en/cssd/${route}`);
      await page.waitForLoadState('networkidle').catch(() => {});
      for (const t of await main.getByRole('table').getByRole('rowgroup').nth(1).getByRole('row').allInnerTexts()) {
        const c = t.split('\t').map((x) => x.trim());
        if (c.length > 5) pairs.add(`${c[c.length - 3]} / ${c[c.length - 2]}`);
      }
    }
    qa.note(5, `Document / Approval status seen: ${[...pairs].join('; ') || 'none'}`);
  });
});

qaTest('TC-APP021-032', async ({ page, qa }) => {
  const main = page.getByRole('main');
  await qa.step(1, async () => {
    for (const [route] of LISTS) {
      await page.goto(`/en/cssd/${route}`);
      await main.getByRole('searchbox').fill(qa.code('X-TIDAK-ADA'));
      await expect(main.getByRole('table').getByRole('link', { name: 'Open' })).toHaveCount(0);
      qa.note(1, `${route}: "${(await main.getByRole('table').getByRole('rowgroup').nth(1).innerText()).trim()}"`);
    }
  });
  await qa.step(2, async () => {
    await page.goto('/en/cssd/test-names');
    const total = Number((await main.getByText(/^Showing/).innerText()).match(/of (\d+)/)?.[1] ?? 0);
    const f = await csv(page);
    qa.note(2, `Test Name: ${total} rows in the list, the CSV has ${f.lines - 1} data line(s)`);
  });
  qa.notRun(3, 'U1 works on one branch; "All branches" in the header needs U2');
});

qaTest('TC-APP021-033', async ({ page, qa }) => {
  const main = page.getByRole('main');
  const all = ['Autoclave', 'Cycle Type', 'Packing Type', 'Indicator Type', 'Test Name', 'Result Type', 'Set', 'Sterile Request', 'Unsterile Receipt', 'Sterilization Cycle', 'Bowie Dick', 'Sterile Issue', 'Sterile Receipt', 'Pack Trace'];
  await qa.step(1, async () => {
    await page.goto('/en/apps');
    await page.getByRole('link', { name: /^CSSD\b/ }).first().click();
    await expect(main.getByRole('heading', { level: 1, name: 'CSSD' })).toBeVisible();
    await expect(main.getByText('Central sterile supply. Masters and the sterilization loop live here; linen stays with Linen.', { exact: true })).toBeVisible();
    await expect(main.getByRole('heading', { level: 2 })).toHaveText(['Masters', 'Transactions']);
  });
  await qa.step(2, async () => {
    for (const name of all) {
      await page.goto('/en/cssd');
      await main.getByRole('link', { name, exact: true }).click();
      await expect(main.getByRole('heading', { level: 1, name })).toBeVisible();
    }
  });
  await qa.step(3, async () => {
    for (const name of all) {
      await page.goto('/en/cssd');
      await page.getByRole('complementary').last().getByRole('link', { name, exact: true }).click();
      await expect(main.getByRole('heading', { level: 1, name })).toBeVisible();
    }
  });
});

const SCREENS: [string, string, string][] = [
  ['TC-APP021-035', '/cssd', 'CSSD'],
  ['TC-APP021-036', '/cssd/autoclaves', 'Autoclave'],
  ['TC-APP021-037', '/cssd/bowie-tests', 'Bowie Dick'],
  ['TC-APP021-038', '/cssd/cycle-types', 'Cycle Type'],
  ['TC-APP021-039', '/cssd/cycles', 'Sterilization Cycle'],
  ['TC-APP021-040', '/cssd/cycles/new', 'New'],
  ['TC-APP021-041', '/cssd/indicator-types', 'Indicator Type'],
  ['TC-APP021-042', '/cssd/issues', 'Sterile Issue'],
  ['TC-APP021-043', '/cssd/issues/new', 'New'],
  ['TC-APP021-044', '/cssd/packing-types', 'Packing Type'],
  ['TC-APP021-045', '/cssd/receipts', 'Unsterile Receipt'],
  ['TC-APP021-046', '/cssd/receipts/new', 'New'],
  ['TC-APP021-047', '/cssd/requests', 'Sterile Request'],
  ['TC-APP021-048', '/cssd/requests/new', 'New'],
  ['TC-APP021-049', '/cssd/result-types', 'Result Type'],
  ['TC-APP021-050', '/cssd/sets', 'Set'],
  ['TC-APP021-051', '/cssd/sterile-receipts', 'Sterile Receipt'],
  ['TC-APP021-052', '/cssd/sterile-receipts/new', 'New'],
  ['TC-APP021-053', '/cssd/test-names', 'Test Name'],
  ['TC-APP021-054', '/cssd/trace', 'Pack Trace'],
];
for (const [id, route, heading] of SCREENS) {
  qaTest(id, async ({ page, qa }) => {
    await qa.step(1, () => screenOpens(page, route, heading, qa));
  });
}
