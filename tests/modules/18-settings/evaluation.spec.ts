import type { Page } from '@playwright/test';
import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark } from '../../../lib/assertions';
import { RegisteredPatientsPage } from '../../../pages/ambulatory/RegisteredPatientsPage';
import { EmployeesPage } from '../../../pages/hr/HrPages';
import { ItemMasterPage } from '../../../pages/inventory/InventoryE2EPages';
import { employeeData } from '../10-hr/helpers';
import { signedOutJourney, userPage } from '../shared/access';
import { department } from './cases';
import { countries, departments, ensureSiteNew, serviceCenters, SITE_NEW, sites, taxCodes, toastsAfter, units } from './helpers';

/**
 * 18-settings.xlsx, the journeys marked "Needs Evaluation" (automated since
 * 2026-10-29, open question Q10). DEP-1 "QA Poli Umum" is not changed (other
 * tests use it): a department of the test stands in for it. SITE-NEW
 * ("QA-SITE-01", made once and reused) is set inactive and active again.
 * TAX-1 is a tax code of the test. "Admin 2" is U4 (qa.admin3).
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

/** The options a type-ahead or a list offers for a text. */
async function offeredIn(page: Page, box: import('@playwright/test').Locator, text: string): Promise<string[]> {
  if ((await box.evaluate((e) => e.tagName)) === 'SELECT') return (await box.locator('option').allInnerTexts()).filter((o) => o.includes(text));
  await box.fill(text);
  const id = await box.getAttribute('aria-controls');
  const list = id ? page.locator(`#${id}`) : page.getByRole('listbox');
  await list.getByRole('option').first().waitFor({ timeout: 6_000 }).catch(() => {});
  return (await list.getByRole('option').allInnerTexts()).filter((o) => o.includes(text));
}

qaTest('TC-APP018-017', async ({ page, qa, browser }) => {
  await ensureSiteNew(page);
  const s = sites(page);
  qa.note(1, `SITE-NEW ${SITE_NEW.code}; no test user has a role at SITE-NEW only (the prepared accounts work on Podomoro and Kemayoran)`);
  try {
    await qa.step(1, async () => {
      await s.edit(SITE_NEW.code);
      await s.fill({ Active: false });
      const toasts = await s.save();
      const confirm = await page.getByRole('alertdialog').or(page.getByRole('dialog').filter({ hasText: /confirm|users|departments/i })).count();
      qa.note(1, `"Save" with Active cleared: "${toasts.join(' / ')}"`);
      if (toasts.includes('Site updated.') && !confirm) qa.deviation(1, 'A warning that names the users, departments and open work of the branch, and asks for confirmation', 'set inactive at once with no warning');
    });
    await qa.step(3, async () => {
      const u2 = await userPage(browser, 'U2');
      try {
        const d = departments(u2);
        await d.open();
        const rows = (await d.rows().allInnerTexts()).map((r) => r.replace(/\s+/g, ' '));
        const ofSite = rows.filter((r) => r.includes(SITE_NEW.code) || r.includes(SITE_NEW.name));
        qa.note(3, `Departments on "All branches" (U2), rows of SITE-NEW on the first page: ${ofSite.slice(0, 3).join(' ; ') || 'none'}`);
        if (!ofSite.some((r) => /closed|inactive|nonaktif/i.test(r))) qa.deviation(3, 'The departments of SITE-NEW are marked as belonging to a closed branch', 'no mark of a closed branch on the departments');
      } finally {
        await u2.context().close();
      }
    });
  } finally {
    await qa.step(4, async () => {
      await s.edit(SITE_NEW.code);
      await s.fill({ Active: true });
      expect(await s.save()).toContain('Site updated.');
    });
  }
});

qaTest('TC-APP018-019', async ({ page, qa }) => {
  const dep = await department(page, qa);
  const d = departments(page);
  await d.edit(dep.code);
  await d.fill({ Active: false });
  expect(await d.save()).toContain('Department updated.');
  qa.note(1, `DEP-1 stands in: the department of this test ${dep.code} "${dep.name}", set inactive (DEP-1 itself is used by other tests)`);
  const p = new EmployeesPage(page);
  await qa.step(1, async () => {
    await p.open();
    const dlg = await p.openNew();
    const hits = await offeredIn(page, dlg.getByRole('combobox', { name: 'Department' }), dep.name);
    qa.note(1, `"Department" offers for "${dep.name}": ${hits.join(', ') || 'nothing'}`);
    if (hits.length && !hits.some((h) => /inactive|nonaktif/i.test(h))) qa.deviation(1, 'DEP-1 is not offered, or is marked as inactive', 'the inactive department is offered with no mark');
    if (!hits.length) qa.note(1, 'not offered; the picker also loads only the first departments by name (found blocker 40), so this does not show that inactive ones are left out');
    await page.keyboard.press('Escape');
  });
  await qa.step(2, async () => {
    const e = employeeData(qa, { no: 'QA-EMP-DEP', name: 'QA Pegawai Dep' }, dep.name);
    await p.open();
    const dlg = await p.openNew();
    const picked = await p.fill(dlg, e).then(() => true, () => false);
    if (!picked) return qa.note(2, 'the inactive department cannot be picked');
    await p.walk(dlg);
    const mark = await toastMark(page);
    await p.save(dlg).click();
    const toasts = await toastsAfter(page, mark);
    qa.note(2, `save with the inactive department: "${toasts.join(' / ')}"`);
    if (toasts.includes('Employee saved')) qa.deviation(2, 'Refused: the department is not active', 'the employee is saved under the inactive department');
  });
  await qa.step(3, async () => {
    const sc = serviceCenters(page);
    await sc.openAdd();
    const hits = await offeredIn(page, sc.dialog.getByRole('combobox', { name: 'Department' }), dep.name);
    qa.note(3, `Service center "Department" offers: ${hits.join(', ') || 'nothing'}`);
    if (hits.length) qa.deviation(3, 'DEP-1 is not offered', 'the inactive department is offered');
    await page.keyboard.press('Escape');
  });
});

qaTest('TC-APP018-023', async ({ page, qa }) => {
  const u = units(page);
  await qa.step(1, async () => {
    for (const f of ['0', '-5', '']) {
      await u.openAdd();
      await u.fill({ 'UOM code': qa.code('QA-UOM'), 'UOM name': qa.name('QA Satuan Uji'), 'Conversion factor': f });
      const toasts = await u.save();
      qa.note(1, `factor "${f}": "${toasts.join(' / ') || 'refused by the form'}"`);
      if (toasts.includes('UOM added.')) qa.deviation(1, 'Refused: the factor must be above zero', `a unit with the factor "${f}" is added`);
      if (await u.dialog.isVisible()) await page.keyboard.press('Escape');
    }
  });
  const country = { code: qa.code('QA-NEG'), name: qa.name('QA Negara Uji') };
  await qa.step(2, async () => {
    const c = countries(page);
    await c.openAdd();
    await c.fill({ 'Country code': country.code, 'Country name': country.name, 'Phone code': 'abc' });
    const toasts = await c.save();
    qa.note(2, `phone code "abc": "${toasts.join(' / ') || 'refused by the form'}"`);
    if (toasts.includes('Country added.')) qa.deviation(2, 'Refused, or a warning', 'the country is added with the phone code "abc"');
  });
  await qa.step(3, async () => {
    const reg = new RegisteredPatientsPage(page);
    await reg.open();
    const d = await reg.openRegister();
    const labels = await d.locator('input, select').evaluateAll((es) => es.map((e) => (e as HTMLInputElement).labels?.[0]?.innerText ?? e.getAttribute('aria-label') ?? ''));
    qa.note(3, `registration fields: ${labels.filter(Boolean).join(', ')}`);
    if (!labels.some((l) => /country|negara|nationality|kewarganegaraan|city|kota/i.test(l))) qa.deviation(3, 'The Country and the City are offered', 'the registration form has no country, nationality or city list');
    await page.keyboard.press('Escape');
  });
  await qa.step(4, async () => {
    const items = new ItemMasterPage(page);
    await items.open();
    const d = await items.openAdd();
    const labels = await d.locator('input, select').evaluateAll((es) => es.map((e) => (e as HTMLInputElement).labels?.[0]?.innerText ?? e.getAttribute('aria-label') ?? ''));
    qa.note(4, `item fields: ${labels.filter(Boolean).join(', ')}`);
    if (!labels.some((l) => /unit|uom|satuan/i.test(l))) qa.deviation(4, 'The Unit is offered', 'the item has no unit list');
    await page.keyboard.press('Escape');
  });
});

qaTest('TC-APP018-025', async ({ page, qa }) => {
  const t = taxCodes(page);
  const code = qa.code('QA-PPN11');
  await t.openAdd();
  await t.fill({ Code: code, Name: qa.name('QA PPN 11 persen'), 'Rate (%)': '11' });
  expect(await t.save()).toContain('Tax code added.');
  qa.note(1, `TAX-1 of this test: ${code}, 11%`);
  await qa.step(1, async () => {
    await t.edit(code);
    const dateField = await t.dialog.locator('input[type="date"]').or(t.dialog.getByRole('textbox', { name: /valid|from|berlaku/i })).count();
    await t.fill({ 'Rate (%)': '12' });
    const toasts = await t.save();
    qa.note(1, `rate 12: "${toasts.join(' / ')}"`);
    if (!dateField) qa.deviation(1, 'A valid-from date, so that older documents keep 11', 'no date: the rate changes for every document');
  });
  await qa.step(2, async () => {
    qa.deviation(2, 'The rate of the tax code, if the sale uses it', 'a pharmacy sale names no tax code: its tax is "Tax rate (%)" of the Fast Cashier counter settings (11)');
  });
  await qa.step(3, async () => {
    qa.deviation(3, 'The rate of the tax code, if the invoice uses it', 'a cashier invoice names no tax code: its tax is "Tax rate (%)" of the counter settings (11)');
  });
  await qa.step(4, async () => {
    await t.edit(code);
    await t.fill({ Active: false });
    expect(await t.save()).toContain('Tax code updated.');
    qa.note(4, 'no document form offers a tax code to choose, so "no longer offered" cannot be seen elsewhere');
  });
});

qaTest('TC-APP018-028', async ({ qa, browser }) => {
  await signedOutJourney(browser, qa, '/settings', /\/(id|en)\/settings/);
  await qa.step(4, async () => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    try {
      const page = await context.newPage();
      await page.goto('/id/mdm/sites');
      await expect(page).toHaveURL(/\/login\?next=%2Fmdm%2Fsites/, { timeout: 20_000 });
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    } finally {
      await context.close();
    }
  });
});

qaTest('TC-APP018-030', async ({ page, qa, browser }) => {
  const d = departments(page);
  await qa.step(1, async () => {
    const dep = { code: qa.code('QA-DEP-CEPAT'), name: qa.name('QA Zz Poli Cepat') };
    await d.openAdd();
    await d.fill({ 'Department code': dep.code, 'Department name': dep.name });
    await d.dialog.getByRole('button', { name: /^(Save|Saving…)$/ }).dblclick();
    await page.waitForTimeout(3000);
    const n = await (await d.row(dep.code)).count();
    qa.note(1, `double-click on "Save": ${n} department(s) ${dep.code}`);
    if (n !== 1) qa.deviation(1, 'One department. The button is disabled while it reads "Saving…"', `${n} departments`);
  });
  const dep = await department(page, qa);
  qa.note(2, `DEP-1 stands in: the department of this test ${dep.code}`);
  const a2 = await userPage(browser, 'U4');
  try {
    await qa.step(2, async () => {
      const d2 = departments(a2);
      await d.edit(dep.code);
      await d2.edit(dep.code);
      await d.fill({ 'Department name': qa.name('QA Zz Poli Diubah') });
      const t1 = await d.save();
      const desc = d2.dialog.getByRole('textbox', { name: /Description|Keterangan/ });
      if (await desc.count()) await desc.first().fill('QA keterangan admin 2');
      else await d2.fill({ 'Department name': qa.name('QA Zz Poli Admin Dua') });
      const t2 = await d2.save();
      qa.note(2, `first admin: "${t1.join(' / ')}"; second admin (dialog opened before): "${t2.join(' / ')}"`);
      if (t2.includes('Department updated.')) qa.deviation(2, 'The second is told that the entry was changed in the meantime', `saved with no warning; the row now reads ${(await d.cells(await d.row(dep.code))).slice(0, 2).join(' | ')}`);
    });
  } finally {
    await a2.context().close();
  }
  await qa.step(3, async () => {
    await d.openAdd();
    await d.fill({ 'Department code': 'QA-SETENGAH' });
    let warned = false;
    page.once('dialog', (x) => {
      warned = true;
      void x.accept();
    });
    await page.reload({ timeout: 30_000 }).catch(() => {});
    await d.open();
    if (!warned && !(await d.dialog.isVisible().catch(() => false))) qa.deviation(3, 'The text is kept, or the admin is warned', 'the half-filled form is lost with no warning');
  });
});
