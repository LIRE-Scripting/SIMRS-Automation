import type { Page } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { addDays, todayWib, weekdayOf } from '../../../lib/dates';
import { EmployeesPage } from '../../../pages/hr/HrPages';
import { backToEnglish, switchLanguage } from '../shared/language';
import {
  SITE_NEW,
  cities,
  countries,
  departments,
  ensureSiteNew,
  holidays,
  invalidFields,
  serviceCenters,
  sites,
  taxCodes,
  units,
  type Mdm,
} from './helpers';
import { addHoliday, BR_A, chosen, department, retireHolidays, sundayAhead, TC_APP018_004, TC_APP018_006, TC_APP018_052 } from './cases';

/**
 * 18-settings.xlsx: the Settings directory and the master data screens
 * (sites, departments, service centers, countries, cities, units, tax codes,
 * holidays). BR-A is Podomoro ("HO"). Every entry a test adds carries a token,
 * except SITE-NEW, which is made once and reused; holidays are set inactive
 * at the end of their test.
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

test.afterEach(async ({ page }) => {
  await backToEnglish(page);
});
const GROUPS = ['Organization', 'Reference', 'Access', 'Appearance', 'Workflow', 'Trail'];

async function directory(page: Page): Promise<void> {
  await page.goto('/en/settings');
  await expect(page.getByRole('main').getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
}

/** The links under each group heading of the directory, by group. */
async function groupsOf(page: Page): Promise<Record<string, string[]>> {
  return page.getByRole('main').evaluate((m) => {
    const out: Record<string, string[]> = {};
    let group = '';
    for (const el of Array.from(m.querySelectorAll('h2, a'))) {
      if (el.tagName === 'H2') out[(group = el.textContent!.trim())] = [];
      else if (group && !el.closest('nav')) out[group].push((el as HTMLElement).innerText.split('\n')[0].trim());
    }
    return out;
  });
}

qaTest('TC-APP018-001', async ({ page, qa }) => {
  const main = page.getByRole('main');
  await qa.step(1, async () => {
    await page.goto('/en/apps');
    await page.getByRole('main').getByRole('link', { name: /^Settings\b/ }).first().click();
    await expect(main.getByRole('navigation', { name: 'Breadcrumb' })).toHaveText(/^Home\s*\/\s*Apps\s*\/\s*Settings$/);
    await expect(main.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
    await expect(main.getByText('Organization, access, appearance, and the trail — each once.', { exact: true })).toBeVisible();
    await expect(main.getByRole('textbox', { name: 'Find a setting…' })).toBeVisible();
    const h2 = (await main.getByRole('heading', { level: 2 }).allInnerTexts()).map((t) => t.trim());
    for (const g of GROUPS) expect(h2).toContain(g);
    if (h2.length !== GROUPS.length) qa.deviation(1, `six groups: ${GROUPS.join(', ')}`, `${h2.length} groups: ${h2.join(', ')}`);
  });
  await qa.step(2, async () => {
    const side = (await page.getByRole('complementary').last().innerText()).replace(/\s+/g, ' ').trim();
    expect(side).toContain('Jump to a group');
    const expected = 'Organization 3 Reference 3 Access 6 Appearance 7 Workflow 1 Trail 1';
    if (!side.endsWith(expected)) qa.deviation(2, `"Settings", "Jump to a group" and ${expected}`, `"${side}"`);
  });
  await qa.step(3, async () => {
    await page.getByRole('complementary').last().getByText('Appearance', { exact: true }).click();
    await expect(main.getByRole('heading', { level: 2, name: 'Appearance' })).toBeInViewport();
  });
  await qa.step(4, async () => {
    await main.getByRole('textbox', { name: 'Find a setting…' }).fill('branch');
    const left = Object.values(await groupsOf(page)).flat();
    qa.note(4, `left: ${left.join(', ')}`);
    const expected = ['Branches', 'Departments', 'Branch map', 'Branch features'];
    for (const e of expected) expect(left).toContain(e);
    if (left.length !== expected.length) qa.deviation(4, `Only ${expected.join(', ')}`, left.join(', '));
  });
  await qa.step(5, async () => {
    await main.getByRole('textbox', { name: 'Find a setting…' }).fill('zzzz');
    await expect(main.getByText('Nothing matches.')).toBeVisible();
  });
  await qa.step(6, async () => {
    await main.getByRole('textbox', { name: 'Find a setting…' }).fill('');
    const groups = await groupsOf(page);
    const names = Object.entries(groups)
      .filter(([g]) => g !== 'Licensing')
      .flatMap(([, n]) => n);
    qa.note(6, `${names.length} entries outside "Licensing" (the workbook counts 21; "Licensing" is TC-APP018-059)`);
    const broken: string[] = [];
    for (const name of names) {
      await directory(page);
      await main.getByRole('link', { name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`) }).first().click();
      await page.waitForLoadState('networkidle').catch(() => {});
      const error = await page.getByRole('heading', { name: /couldn.t load|not found|404/i }).count();
      const h1 = await page.getByRole('heading', { level: 1 }).count();
      if (error || !h1) broken.push(`${name} (${page.url()})`);
    }
    expect(broken).toEqual([]);
  });
});

qaTest('TC-APP018-002', async ({ page, qa }) => {
  const s = sites(page);
  const code = qa.code('QA-SITE-01');
  const name = qa.name('QA Klinik Uji');
  await qa.step(1, async () => {
    await page.goto('/en/settings');
    await page.getByRole('main').getByRole('link', { name: /^Branches\b/ }).click();
    await expect(s.main.getByRole('heading', { level: 1, name: 'Sites' })).toBeVisible();
    await expect(s.main.getByText('Hospital, clinic, or standalone location.', { exact: true })).toBeVisible();
    await expect(s.search).toBeVisible();
    await expect(s.status.locator('option')).toHaveText(['All statuses', 'Active', 'Inactive']);
    await expect(s.main.getByRole('table')).toBeVisible();
    await expect(s.main.getByRole('button', { name: 'Add Site' })).toBeVisible();
  });
  await qa.step(2, async () => {
    await s.main.getByRole('button', { name: 'Add Site' }).click();
    await expect(s.dialog).toHaveAccessibleName('Add Site');
    for (const f of ['Site code', 'Site name']) await expect(s.dialog.getByRole('textbox', { name: f })).toBeVisible();
    await expect(s.dialog.getByText('Advanced settings')).toBeVisible();
    await expect(s.dialog.getByRole('checkbox', { name: 'Head office' })).toBeHidden();
  });
  await qa.step(3, async () => {
    await s.advanced();
    await expect(s.dialog.getByRole('checkbox', { name: 'Head office' })).not.toBeChecked();
    await expect(s.dialog.getByRole('checkbox', { name: 'Active' })).toBeChecked();
  });
  await qa.step(4, async () => {
    await s.fill({ 'Site code': code, 'Site name': name });
    expect(await s.save()).toContain('Site added.');
    await expect(s.dialog).toBeHidden();
  });
  await qa.step(5, async () => {
    const row = await s.row(code);
    expect((await s.cells(row)).slice(0, 4)).toEqual([code, name, '—', 'Active']);
    await expect(row.getByRole('button', { name: /^Edit/ })).toBeVisible();
  });
});

qaTest('TC-APP018-003', async ({ page, qa }) => {
  const s = sites(page);
  await ensureSiteNew(page);
  const renamed = 'QA Klinik Uji Dua';
  try {
    await qa.step(1, async () => {
      await s.edit(SITE_NEW.code);
      await expect(s.dialog).toHaveAccessibleName('Edit Site');
      await expect(s.dialog.getByRole('textbox', { name: 'Site code' })).toHaveValue(SITE_NEW.code);
      await expect(s.dialog.getByRole('textbox', { name: 'Site name' })).toHaveValue(SITE_NEW.name);
    });
    await qa.step(2, async () => {
      await s.fill({ 'Site name': renamed });
      expect(await s.save()).toContain('Site updated.');
    });
    await qa.step(3, async () => {
      expect((await s.cells(await s.row(SITE_NEW.code)))[1]).toBe(renamed);
    });
  } finally {
    await s.edit(SITE_NEW.code);
    await s.fill({ 'Site name': SITE_NEW.name });
    await s.save();
  }
});

qaTest('TC-APP018-004', TC_APP018_004);

qaTest('TC-APP018-005', async ({ page, qa }) => {
  const d = departments(page);
  const dep = await department(page, qa);
  const renamed = qa.name('QA Poli Uji Dua');
  await qa.step(1, async () => {
    await d.edit(dep.code);
    await expect(d.dialog).toHaveAccessibleName('Edit Department');
    await expect(d.dialog.getByRole('textbox', { name: 'Department code' })).toHaveValue(dep.code);
    await expect(d.dialog.getByRole('textbox', { name: 'Department name' })).toHaveValue(dep.name);
  });
  await qa.step(2, async () => {
    await d.fill({ 'Department name': renamed, Active: false });
    expect(await d.save()).toContain('Department updated.');
  });
  await qa.step(3, async () => {
    const c = await d.cells(await d.row(dep.code));
    expect([c[1], c[3]]).toEqual([renamed, 'Inactive']);
  });
  await qa.step(4, async () => {
    await d.open();
    await d.status.selectOption('Inactive');
    const statuses = await d.rows().evaluateAll((rs) => rs.filter((r) => r.querySelectorAll('td').length > 1).map((r) => r.querySelectorAll('td')[3]?.textContent?.trim()));
    expect(statuses.length).toBeGreaterThan(0);
    expect(new Set(statuses)).toEqual(new Set(['Inactive']));
  });
});

qaTest('TC-APP018-006', TC_APP018_006);

qaTest('TC-APP018-007', async ({ page, qa }) => {
  const c = countries(page);
  const code = `QA-${qa.token()}`;
  const name = qa.name('QA Negara Uji');
  await qa.step(1, async () => {
    await page.goto('/en/settings');
    await page.getByRole('main').getByRole('link', { name: /^Countries\b/ }).click();
    await c.main.getByRole('button', { name: 'Add Country' }).click();
    await expect(c.dialog).toHaveAccessibleName('Add Country');
    for (const f of ['Country code', 'Country name', 'Phone code', 'Nationality']) await expect(c.dialog.getByRole('textbox', { name: f })).toBeVisible();
    await expect(c.dialog.getByRole('checkbox', { name: 'Active' })).toBeVisible();
  });
  await qa.step(2, async () => {
    await c.fill({ 'Country code': code, 'Country name': name, 'Phone code': '+00', Nationality: 'QA Warga Uji' });
    expect(await c.save()).toContain('Country added.');
    expect((await c.cells(await c.row(code))).slice(0, 3)).toEqual([code, name, 'Active']);
  });
  await qa.step(3, async () => {
    const ci = cities(page);
    const cityCode = qa.code('QA-KOTA');
    const toasts = await ci.add({ 'City code': cityCode, 'City name': qa.name('QA Kota Uji') });
    qa.note(3, `toast "${toasts.join(' / ')}"`);
    expect(toasts.join(' ')).toMatch(/added/i);
    await expect(await ci.row(cityCode)).toHaveCount(1);
  });
  await qa.step(4, async () => {
    const u = units(page);
    await u.openAdd();
    await expect(u.dialog).toHaveAccessibleName('Add UOM');
    for (const f of ['UOM code', 'UOM name']) await expect(u.dialog.getByRole('textbox', { name: f })).toBeVisible();
    await expect(u.dialog.getByRole('spinbutton', { name: 'Conversion factor' })).toHaveValue('1');
    for (const f of ['Derived unit', 'Active']) await expect(u.dialog.getByRole('checkbox', { name: f })).toBeVisible();
  });
  await qa.step(5, async () => {
    const u = units(page);
    await u.fill({ 'UOM code': qa.code('QA-BOX'), 'UOM name': qa.name('QA Kotak'), 'Conversion factor': '10', 'Derived unit': true });
    expect(await u.save()).toContain('UOM added.');
  });
});

/** A tax code of the test; the code is typed in small letters as in the workbook ("qa-ppn11"). */
async function addTax(page: Page, v: { code: string; name: string; rate: string; kind?: string }): Promise<string[]> {
  const t = taxCodes(page);
  await t.openAdd();
  if (v.kind) await t.dialog.getByRole('combobox', { name: 'Kind' }).selectOption({ label: v.kind });
  await t.fill({ Code: v.code, Name: v.name, 'Rate (%)': v.rate });
  return t.save();
}

qaTest('TC-APP018-008', async ({ page, qa }) => {
  const t = taxCodes(page);
  const code = qa.code('QA-PPN11');
  const name = qa.name('QA PPN 11 persen');
  await qa.step(1, async () => {
    await page.goto('/en/mdm/sites');
    await page.getByRole('main').getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'Settings' }).click();
    await page.getByRole('main').getByRole('link', { name: 'Tax Codes' }).click();
    await expect(t.main.getByRole('heading', { level: 1, name: 'Tax Codes' })).toBeVisible();
    await expect(t.main.getByText('PPN and PPh codes with their rates, shared by every module.', { exact: true })).toBeVisible();
    await expect(t.search).toBeVisible();
    await expect(t.main.getByRole('button', { name: 'Add tax code' })).toBeVisible();
  });
  await qa.step(2, async () => {
    await t.main.getByRole('button', { name: 'Add tax code' }).click();
    await expect(t.dialog).toHaveAccessibleName('Add tax code');
    await expect(t.dialog.getByRole('combobox', { name: 'Kind' }).locator('option')).toHaveText(['PPN (VAT)', 'PPh (income tax)']);
    for (const f of ['Code', 'Name', 'Rate (%)']) await expect(t.dialog.getByRole('textbox', { name: f })).toBeVisible();
    await expect(t.dialog.getByRole('checkbox', { name: 'Active' })).toBeVisible();
    await expect(t.dialog.getByText('Retiring a code keeps it on records that already use it.')).toBeVisible();
  });
  await qa.step(3, async () => {
    expect(await addTax(page, { code: code.toLowerCase(), name, rate: '11' })).toContain('Tax code added.');
  });
  await qa.step(4, async () => {
    await t.open();
    await t.search.fill(code.toLowerCase().replace(/^qa-/, ''));
    const row = t.rows().filter({ has: page.getByRole('cell', { name: code, exact: true }) });
    await expect(row).toHaveCount(1);
    expect((await t.cells(row)).slice(0, 5)).toEqual([code, name, 'PPN (VAT)', '11%', 'Active']);
  });
  await qa.step(5, async () => {
    await t.edit(code);
    await t.fill({ 'Rate (%)': '12' });
    expect(await t.save()).toContain('Tax code updated.');
    expect((await t.cells(await t.row(code)))[3]).toBe('12%');
  });
});

qaTest('TC-APP018-009', async ({ page, qa }) => {
  const d = departments(page);
  // The site orders by the plain character codes (capitals first: "IPSRS" before "Intensive Care").
  const isSorted = (xs: string[]) => xs.every((x, i) => i === 0 || xs[i - 1] <= x);
  const namesOf = (m: Mdm) => m.rows().evaluateAll((rs) => rs.filter((r) => r.querySelectorAll('td').length > 1).map((r) => r.querySelectorAll('td')[1]?.textContent?.trim() ?? ''));
  await qa.step(1, async () => {
    await d.open();
    await expect(d.main.getByRole('columnheader')).toHaveText(['Code', 'Name', 'Site', 'Status', 'Actions']);
    const names = await namesOf(d);
    expect(isSorted(names), names.join(' | ')).toBe(true);
  });
  await qa.step(2, async () => {
    await d.search.fill('poli');
    const rows = await d.rows().evaluateAll((rs) => rs.map((r) => `${r.querySelectorAll('td')[0]?.textContent} ${r.querySelectorAll('td')[1]?.textContent}`));
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) expect(r.toLowerCase()).toContain('poli');
    await d.search.fill('POLI');
    await expect(d.rows()).toHaveCount(rows.length);
  });
  await qa.step(3, async () => {
    await d.search.fill('');
    for (const [option, allowed] of [['Active', ['Active']], ['Inactive', ['Inactive']], ['All statuses', ['Active', 'Inactive']]] as const) {
      await d.status.selectOption(option);
      const statuses = await d.rows().evaluateAll((rs) => rs.filter((r) => r.querySelectorAll('td').length > 1).map((r) => r.querySelectorAll('td')[3]?.textContent?.trim() ?? ''));
      for (const s of statuses) expect(allowed as readonly string[]).toContain(s);
    }
  });
  await qa.step(4, async () => {
    for (const m of [sites(page), serviceCenters(page), countries(page), cities(page), units(page)]) {
      await m.open();
      await expect(m.search).toBeVisible();
      await expect(m.status.locator('option')).toHaveText(['All statuses', 'Active', 'Inactive']);
      const names = await namesOf(m);
      if (!isSorted(names)) qa.deviation(4, `${m.heading}: ordered by name`, names.slice(0, 6).join(', '));
    }
  });
});

qaTest('TC-APP018-012', async ({ page, qa }) => {
  const main = page.getByRole('main');
  await qa.step(1, async () => {
    await page.goto('/en/settings');
    await main.getByRole('link', { name: /^Branches\b/ }).click();
    await expect(main.getByRole('navigation', { name: 'Breadcrumb' })).toHaveText(/^Home\s*\/\s*Settings\s*\/\s*Sites$/);
  });
  await qa.step(2, async () => {
    await main.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'Settings' }).click();
    await expect(main.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
    const sub = (await main.getByRole('paragraph').first().innerText()).trim();
    if (sub !== 'Organization, access, appearance, and the trail — each once.') qa.deviation(2, 'The Settings directory of step 1', `a second page "Settings" with "${sub}" and the tiles ${(await main.getByRole('link').allInnerTexts()).map((t) => t.trim()).filter((t) => !['Home', 'Apps'].includes(t)).join(', ')}`);
  });
  await qa.step(3, async () => {
    await switchLanguage(page, 'ID');
    await page.goto('/id/settings');
    const h1 = (await main.getByRole('heading', { level: 1 }).innerText()).trim();
    const groups = (await main.getByRole('heading', { level: 2 }).allInnerTexts()).map((t) => t.trim());
    qa.note(3, `heading "${h1}", groups ${groups.join(', ')}`);
    if (h1 !== 'Pengaturan' || groups.includes('Organization')) qa.deviation(3, '"Pengaturan", the groups "Organisasi", "Referensi", "Akses", "Tampilan", "Alur", "Jejak"', `"${h1}", ${groups.join(', ')}`);
  });
  await qa.step(4, async () => {
    await page.goto('/id/mdm/departments');
    const add = main.getByRole('button', { name: /Departemen|Department/ }).first();
    const addText = (await add.innerText()).trim();
    await add.click();
    const labels = (await page.getByRole('dialog').locator('label').allInnerTexts()).map((t) => t.trim()).filter(Boolean);
    const d = departments(page);
    await d.dialog.locator('input').first().fill(qa.code('QA-DEP-01'));
    await d.dialog.locator('input').nth(1).fill(qa.name('QA Poli Uji'));
    const toasts = await d.save();
    qa.note(4, `button "${addText}", fields ${labels.slice(0, 3).join(', ')}, toast "${toasts.join(' / ')}"`);
    if (addText !== 'Tambah Departemen' || !toasts.includes('Departemen ditambahkan.')) {
      qa.deviation(4, '"Tambah Departemen", "Kode departemen", "Departemen ditambahkan."', `"${addText}", ${labels.slice(0, 2).join(', ')}, toast "${toasts.join(' / ')}"`);
    }
  });
});

qaTest('TC-APP018-015', async ({ page, qa }) => {
  await ensureSiteNew(page);
  const dep = await department(page, qa);
  const country = `QA-${qa.token()}`;
  expect(await countries(page).add({ 'Country code': country, 'Country name': qa.name('QA Negara Uji') })).toContain('Country added.');
  const tax = qa.code('QA-PPN11');
  expect(await addTax(page, { code: tax, name: qa.name('QA PPN 11 persen'), rate: '11' })).toContain('Tax code added.');
  const refused = async (s: number, m: Mdm, v: Record<string, string>, code: string, expected: string) => {
    const before = await (await m.row(code)).count();
    const toasts = await m.add(v);
    expect(toasts.join(' ')).not.toMatch(/added/i);
    expect(await (await m.row(code)).count()).toBe(before);
    if (!toasts.some((t) => /already|exists|used/i.test(t))) qa.deviation(s, expected, `toast "${toasts.join(' / ')}"`);
  };
  await qa.step(1, () => refused(1, sites(page), { 'Site code': SITE_NEW.code, 'Site name': qa.name('QA Klinik Uji') }, SITE_NEW.code, 'A message that the code already exists. No row is added'));
  await qa.step(2, () => refused(2, departments(page), { 'Department code': dep.code, 'Department name': qa.name('QA Poli Uji') }, dep.code, 'A message that the code already exists'));
  await qa.step(3, () => refused(3, countries(page), { 'Country code': country, 'Country name': qa.name('QA Negara Uji') }, country, 'A message that the code already exists'));
  await qa.step(4, async () => {
    expect(await addTax(page, { code: tax.toLowerCase(), name: qa.name('QA PPN 11 persen'), rate: '11' })).toContain('This code already exists.');
  });
  await qa.step(5, async () => {
    const toasts = await sites(page).add({ 'Site code': SITE_NEW.code.toLowerCase(), 'Site name': qa.name('QA Klinik Uji') });
    qa.note(5, `"${SITE_NEW.code.toLowerCase()}": toast "${toasts.join(' / ')}"`);
  });
});

qaTest('TC-APP018-016', async ({ page, qa }) => {
  const d = departments(page);
  await qa.step(1, async () => {
    for (const v of [{ 'Department name': qa.name('QA Poli Uji') }, { 'Department code': qa.code('QA-DEP-02') }] as Record<string, string>[]) {
      const toasts = await d.add(v);
      expect(toasts.join(' ')).not.toMatch(/added/i);
      const invalid = await invalidFields(d.dialog);
      qa.note(1, `stopped by the browser: ${invalid.join('; ')}`);
      expect(invalid.length).toBeGreaterThan(0);
    }
  });
  await qa.step(2, async () => {
    const toasts = await d.add({ 'Department code': '   ', 'Department name': qa.name('QA Poli Uji') });
    if (toasts.join(' ').match(/added/i)) qa.deviation(2, 'Refused: the code is missing', `toast "${toasts.join(' / ')}"`);
    else qa.note(2, `toast "${toasts.join(' / ')}"`);
  });
  await qa.step(3, async () => {
    const code = qa.code('QA-DEP-02');
    const first = await d.add({ 'Department code': ` ${code} `, 'Department name': qa.name('QA Poli Uji') });
    const second = await d.add({ 'Department code': code, 'Department name': qa.name('QA Poli Uji') });
    qa.note(3, `with spaces: "${first.join(' / ')}"; without: "${second.join(' / ')}"`);
    if (second.join(' ').match(/added/i)) qa.deviation(3, 'The first is saved without the spaces; the second is refused as a double', 'both are saved: the spaces are kept');
  });
  await qa.step(4, async () => {
    const toasts = await d.add({ 'Department code': qa.code('QA-DEP-03'), 'Department name': `QA ${'x'.repeat(497)}` });
    if (toasts.join(' ').match(/added/i)) qa.deviation(4, 'Refused with a message that names a limit, or the field stops there', 'the name of 500 characters is saved');
  });
  await qa.step(5, async () => {
    const toasts = await addTax(page, { code: qa.code('QA-PPN'), name: '   ', rate: '11' });
    expect(toasts).not.toContain('Tax code added.');
    if (!toasts.some((t) => /name/i.test(t))) qa.deviation(5, 'A message that the name is missing', `toast "${toasts.join(' / ')}"`);
  });
});

qaTest('TC-APP018-018', async ({ page, qa }) => {
  const s = sites(page);
  await ensureSiteNew(page);
  const ho = async (code: string) => (await s.cells(await s.row(code)))[2];
  try {
    await qa.step(1, async () => {
      await s.edit(SITE_NEW.code);
      await s.fill({ 'Head office': true });
      const toasts = await s.save();
      const marks = { new: await ho(SITE_NEW.code), ho: await ho('HO') };
      qa.note(1, `toast "${toasts.join(' / ')}"; SITE-NEW "${marks.new}", BR-A "${marks.ho}"`);
      if (marks.new === 'Head office' && marks.ho === 'Head office') qa.deviation(1, 'Refused, or the mark moves from BR-A to SITE-NEW', 'both sites are shown as "Head office"');
    });
    await qa.step(2, async () => {
      if ((await ho(SITE_NEW.code)) !== 'Head office') {
        qa.note(2, 'SITE-NEW did not take the mark; the step needs a head office other than BR-A, so it is not run on BR-A');
        return;
      }
      await s.edit(SITE_NEW.code);
      await s.fill({ Active: false });
      const toasts = await s.save();
      const status = (await s.cells(await s.row(SITE_NEW.code)))[3];
      if (status === 'Inactive') qa.deviation(2, 'Refused: the head office cannot be closed', `saved: the head office SITE-NEW is "Inactive" (toast "${toasts.join(' / ')}")`);
    });
    await qa.step(3, async () => {
      await s.edit(SITE_NEW.code);
      await s.advanced();
      const fields = await s.dialog.locator('label').allInnerTexts();
      if (!fields.some((f) => /parent/i.test(f))) qa.deviation(3, 'A parent can be chosen', `the dialog has ${fields.map((f) => f.trim()).filter(Boolean).join(', ')}`);
      await s.dialog.getByRole('button', { name: 'Cancel' }).click();
    });
  } finally {
    await s.edit(SITE_NEW.code);
    await s.fill({ 'Head office': false, Active: true });
    await s.save();
    if ((await ho('HO')) !== 'Head office') {
      await s.edit('HO');
      await s.fill({ 'Head office': true });
      await s.save();
    }
  }
});

qaTest('TC-APP018-021', async ({ page, qa }) => {
  const d = departments(page);
  const dep = await department(page, qa, 'QA-DEP-SALAH', 'QA Departemen Salah');
  try {
    await qa.step(1, async () => {
      const row = await d.row(dep.code);
      const rowButtons = await row.getByRole('button').allInnerTexts();
      await d.edit(dep.code);
      await d.advanced();
      const dialogButtons = (await d.dialog.getByRole('button').allInnerTexts()).map((b) => b.trim()).filter(Boolean);
      const del = [...rowButtons, ...dialogButtons].some((b) => /delete|remove|hapus/i.test(b));
      if (!del) qa.deviation(1, 'A delete, offered while the entry is not in use', `none (dialog: ${dialogButtons.join(', ')})`);
    });
    await qa.step(2, async () => {
      const text = await d.dialog.innerText();
      if (!/used|records/i.test(text)) qa.deviation(2, 'The number of records that use it', 'nothing shows where the entry is used');
    });
  } finally {
    await d.edit(dep.code);
    await d.fill({ Active: false });
    await d.save();
  }
});

qaTest('TC-APP018-022', async ({ page, qa }) => {
  const c = cities(page);
  const name = qa.name('QA Kota Uji');
  expect((await c.add({ 'City code': qa.code('QA-KOTA'), 'City name': name })).join(' ')).toMatch(/added/i);
  await c.open();
  const total = (await c.main.getByText(/^Showing/).innerText()).trim();
  qa.note(1, `the list: "${total}" (the workbook wants more than 50 cities, with "QA Kota Uji" on the second page)`);
  await qa.step(1, async () => {
    await c.search.fill('QA Kota');
    const found = await c.rows().filter({ hasText: name }).count();
    if (!found) qa.deviation(1, '"QA Kota Uji" is found', 'not found: the search covers the loaded page only');
  });
  await qa.step(2, async () => {
    await c.search.fill('');
    await c.status.selectOption('Inactive');
    const statuses = await c.rows().evaluateAll((rs) => rs.map((r) => r.querySelectorAll('td')[2]?.textContent?.trim() ?? '').filter(Boolean));
    for (const s of statuses) expect(s).toBe('Inactive');
    qa.note(2, `${statuses.length} inactive city(ies) on the page`);
  });
  await qa.step(3, async () => {
    await c.search.fill('QA Kota');
    await c.status.selectOption('All statuses');
    const shown = await c.rows().count();
    const text = (await c.main.getByText(/^Showing/).innerText()).trim();
    qa.note(3, `${shown} row(s) shown; "${text}"`);
    if (!text.includes(`of ${shown}`)) qa.deviation(3, 'The number of entries found', `"${text}" with ${shown} row(s) shown`);
  });
});

qaTest('TC-APP018-024', async ({ page, qa }) => {
  const add = (rate: string) => addTax(page, { code: qa.code('QA-PPN'), name: qa.name('QA PPN uji'), rate });
  await qa.step(1, async () => {
    for (const rate of ['', '-1', '101', 'abc']) {
      const toasts = await add(rate);
      expect(toasts, `rate "${rate}"`).not.toContain('Tax code added.');
      if (!toasts.includes('Rate must be between 0 and 100.')) {
        const invalid = await invalidFields(taxCodes(page).dialog);
        qa.deviation(1, `rate "${rate}": toast "Rate must be between 0 and 100."`, invalid.length ? `the browser stops the click (${invalid.join('; ')})` : `toast "${toasts.join(' / ')}"`);
      }
    }
  });
  await qa.step(2, async () => {
    const toasts = await add('11,5');
    qa.note(2, `"11,5": toast "${toasts.join(' / ')}"`);
    if (toasts.includes('Rate must be between 0 and 100.')) qa.deviation(2, 'Saved as 11.5, or a hint to use a point', 'toast "Rate must be between 0 and 100.", which does not name the comma');
  });
  await qa.step(3, async () => {
    const code = qa.code('QA-PPN');
    const toasts = await addTax(page, { code, name: qa.name('QA PPN uji'), rate: '11.55555' });
    if (toasts.includes('Tax code added.')) {
      const rate = (await taxCodes(page).cells(await taxCodes(page).row(code)))[3];
      qa.note(3, `saved and shown as "${rate}"`);
      if (!/hint|round/i.test(toasts.join(' '))) qa.deviation(3, 'Refused, or rounded with a hint', `saved as "${rate}" without a hint`);
    } else qa.note(3, `refused: "${toasts.join(' / ')}"`);
  });
  await qa.step(4, async () => {
    const code = qa.code('QA-PPN');
    const toasts = await addTax(page, { code, name: qa.name('QA PPN uji'), rate: '0' });
    expect(toasts).toContain('Tax code added.');
    expect((await taxCodes(page).cells(await taxCodes(page).row(code)))[3]).toBe('0%');
  });
});

qaTest('TC-APP018-029', async ({ page, qa }) => {
  const d = departments(page);
  const code = qa.code('QA-XSS');
  const name = '<script>alert(1)</script>';
  let alerted = false;
  page.on('dialog', async (x) => {
    alerted = true;
    await x.dismiss();
  });
  try {
    await qa.step(1, async () => {
      expect(await d.add({ 'Department code': code, 'Department name': name })).toContain('Department added.');
      expect((await d.cells(await d.row(code)))[1]).toBe(name);
      expect(alerted).toBe(false);
    });
    await qa.step(2, async () => {
      const e = new EmployeesPage(page);
      await e.open();
      const dlg = await e.openNew();
      await dlg.getByRole('combobox', { name: 'Department' }).fill(code);
      await expect(page.getByRole('option').filter({ hasText: code }).first()).toContainText(name);
      expect(alerted).toBe(false);
    });
    await qa.step(3, async () => {
      const img = '<img src=x onerror=alert(1)>';
      await page.goto('/en/settings');
      await page.getByRole('main').getByRole('textbox', { name: 'Find a setting…' }).fill(img);
      await expect(page.getByRole('main').getByText('Nothing matches.')).toBeVisible();
      await d.open();
      await d.search.fill(img);
      await expect(d.rows().filter({ has: page.getByRole('button') })).toHaveCount(0);
      await expect(page.locator('main img[src="x"]')).toHaveCount(0);
      expect(alerted).toBe(false);
    });
  } finally {
    await d.edit(code).catch(() => {});
    if (await d.dialog.isVisible()) {
      await d.fill({ Active: false });
      await d.save();
    }
  }
});

qaTest('TC-APP018-052', TC_APP018_052);

qaTest('TC-APP018-053', async ({ page, qa }) => {
  const h = holidays(page);
  const occasion = qa.name('X Libur uji');
  const date = sundayAhead(4);
  try {
    await qa.step(1, async () => {
      for (const [o, d] of [['', date], [occasion, '']]) {
        const toasts = await addHoliday(page, o, d);
        expect(toasts).not.toContain('Holiday saved.');
        const invalid = await invalidFields(h.dialog);
        qa.note(1, invalid.length ? `stopped by the browser: ${invalid.join('; ')}` : `toast "${toasts.join(' / ')}"`);
      }
    });
    await qa.step(2, async () => {
      expect(await addHoliday(page, occasion, date)).toContain('Holiday saved.');
      const toasts = await addHoliday(page, occasion, date);
      await h.open();
      const n = await h.rows().filter({ hasText: occasion }).count();
      qa.note(2, `second save: "${toasts.join(' / ')}"; ${n} row(s) for the date`);
    });
    qa.notRun(3, 'a holiday on a day with appointments would close a booked day of the shared DR-1 (02 Appointment)');
    await qa.step(4, async () => {
      const past = addDays(sundayAhead(0), -14);
      const toasts = await addHoliday(page, occasion, past);
      qa.note(4, `${past}: "${toasts.join(' / ')}"`);
    });
  } finally {
    await retireHolidays(page, occasion);
  }
});

qaTest('TC-APP018-058', async ({ page, qa }) => {
  const main = page.getByRole('main');
  await qa.step(1, async () => {
    await page.goto('/en/settings');
    await main.getByRole('link', { name: /^Audit retention\b/ }).click();
    await expect(main.getByRole('heading', { level: 1, name: 'Audit retention' })).toBeVisible();
    await expect(main.getByText('Yearly audit-log retention. This screen only lists them.', { exact: true })).toBeVisible();
    const lines = await main.getByRole('listitem').allInnerTexts();
    expect(lines.length).toBeGreaterThan(0);
    qa.note(1, `lines: ${lines.join(', ')}`);
  });
  await qa.step(2, async () => {
    const inputs = await main.locator('input, select, button').count();
    expect(inputs).toBe(0);
    qa.note(2, 'neither the time kept nor a way to change it is shown (as the workbook says)');
  });
  await qa.step(3, async () => {
    await page.goto('/en/mdm');
    await main.getByRole('link', { name: 'Facility time' }).click();
    await expect(main.getByRole('heading', { level: 1, name: 'Facility time' })).toBeVisible();
    expect(await main.locator('input, select, textarea').count()).toBe(0);
    expect(await main.getByRole('paragraph').count()).toBe(1);
  });
  await qa.step(4, async () => {
    await page.goto('/en/settings');
    await main.getByRole('link', { name: /^Branch features\b/ }).click();
    await expect(main.getByRole('heading', { level: 1, name: 'Feature Branch Mapping' })).toBeVisible();
    await expect(main.getByText('Show or hide features for this hospital.', { exact: true })).toBeVisible();
    await expect(main.getByRole('columnheader')).toHaveText(['Feature', 'Action', 'Exposed']);
  });
  await qa.step(5, async () => {
    const text = (await main.getByText(/^Showing/).innerText()).trim();
    qa.note(5, `the list: "${text}"`);
  });
});
