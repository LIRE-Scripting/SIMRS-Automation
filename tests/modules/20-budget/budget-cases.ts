import { PurchaseOrdersPage } from '../../../pages/procurement/ProcurementPages';
import type { Page } from '@playwright/test';
import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { addDays, todayWib } from '../../../lib/dates';
import { HR } from '../../../lib/hr-data';
import { screenOpens } from '../shared/screen-opens';
import { invalidFields } from '../18-settings/helpers';
import { addMonths } from '../19-finance/helpers';
import { payrollEmployee } from '../17-payroll/helpers';
import { addToChart, book, books, chart, chartRow, choose, deactivate, head, heads, Master, projects, TC_APP020_001, TC_APP020_003, TC_APP020_005, TC_APP020_013, TC_APP020_015, TC_APP020_019, YEAR } from './cases';
import { asOnSite, sourceOnSite } from '../../../lib/i18n';
import type { QaBody } from '../../../fixtures/e2e';

/** The test cases of budget.spec.ts, shared with the end-to-end chains (chain.run). */

export const types = (p: Page) => new Master(p, 'util-types', 'Utilisation types', 'Add type');

export const questions = (p: Page) => new Master(p, 'sanction-checklists', 'Sanction checklist', 'New question');

export const TC_APP020_002: QaBody = async ({ page, qa }) => {
  const b = books(page);
  const mine = await book(page, qa);
  await qa.step(1, async () => {
    await b.openAdd();
    await b.fill({ Code: mine.code, 'Book name': qa.name('X Buku operasional uji'), 'Sponsor / scheme name': qa.prefix('X BLUD') });
    expect(await b.saveText()).toContain('That book code is already used.');
  });
  await qa.step(2, async () => {
    await b.open();
    const marked = (await b.main.getByRole('table').innerText()).includes('Default');
    if (!marked) {
      qa.notRun(2, 'the list marks no default book; ticking "Default book" on a test book would make it the tenant\'s default');
      return;
    }
    await b.edit(mine.code);
    await b.fill({ 'Default book': true });
    const text = await b.saveText();
    qa.note(2, `"${text.slice(0, 160)}"`);
    expect(text).not.toContain('Budget book updated');
  });
  await qa.step(3, async () => {
    await b.edit(mine.code);
    await b.fill({ Active: false });
    if (await b.dialog.getByRole('checkbox', { name: 'Default book' }).isDisabled()) {
      qa.note(3, '"Default book" cannot be ticked once "Active" is cleared (disabled), so an inactive book cannot become the default');
      return;
    }
    await b.fill({ 'Default book': true });
    const text = await b.saveText();
    if (text.includes('Budget book updated')) {
      qa.deviation(3, 'The text "An inactive book cannot be the default."', 'saved');
      await b.edit(mine.code);
      await b.fill({ 'Default book': false });
      await b.save();
    } else expect(text).toContain('An inactive book cannot be the default.');
  });
  await qa.step(4, async () => {
    await b.edit(mine.code);
    const buttons = (await b.dialog.getByRole('button').allInnerTexts()).map((x) => x.trim());
    expect(buttons.some((x) => /delete/i.test(x))).toBe(false);
  });
};

export const TC_APP020_004: QaBody = async ({ page, qa }) => {
  const h = heads(page);
  const alkes = await head(page, qa, 'X-ALKES', 'X Belanja alkes uji', 'Capital');
  await qa.step(1, async () => {
    await h.openAdd();
    await h.fill({ Code: alkes.code, 'Head name': qa.name('X Belanja alkes uji'), 'Financial year': YEAR });
    expect(await h.saveText()).toContain('That head code is already used.');
  });
  await qa.step(2, async () => {
    await h.openAdd();
    const box = h.dialog.getByRole('combobox', { name: 'Financial year' });
    // "2025 (locked)": the site writes "(terkunci)"; the label is kept as the site shows it.
    const locked = (await asOnSite(() => box.locator('option').allInnerTexts())).find((o) => new RegExp(`${sourceOnSite('(locked)')}$`).test(o))!;
    const disabled = await box.locator('option', { hasText: locked }).isDisabled();
    if (disabled) {
      qa.note(2, `"${locked}" cannot be chosen (the option is disabled)`);
      return;
    }
    await h.fill({ Code: qa.code('X-ALKES'), 'Head name': qa.name('X Belanja alkes uji') });
    await box.selectOption({ label: locked });
    const text = await h.saveText();
    qa.note(2, `"${text.slice(0, 160)}"`);
    expect(text).not.toContain('Budget head created');
    expect(text).toMatch(/locked/i);
  });
  qa.notRun(3, 'needs a year removed or renamed in Finance while the dialog is open; Finance can neither change nor delete a year (TC-APP019-021)');
};

export const TC_APP020_007: QaBody = async ({ page, qa }) => {
  const t = types(page);
  const code = qa.code('X-JASA');
  await qa.step(1, async () => {
    await page.goto('/id/budget');
    await page.getByRole('main').getByRole('link', { name: 'Utilisation types' }).click();
    await expect(t.main.getByRole('heading', { level: 1, name: 'Utilisation types' })).toBeVisible();
    await expect(t.main.getByText('Classify utilisation lines and the taxes they carry. PPN and PPh may apply together.', { exact: true })).toBeVisible();
    await expect(t.main.getByRole('columnheader')).toHaveText(['Code', 'Description', 'Tax codes', 'Status', 'Actions']);
  });
  await qa.step(2, async () => {
    await t.main.getByRole('button', { name: 'Add type' }).click();
    await expect(t.dialog).toHaveAccessibleName('New utilisation type');
    await expect(t.dialog.getByText('Code, description, and remarks are required.')).toBeVisible();
    for (const f of ['Code', 'Description', 'Remarks']) await expect(t.dialog.getByRole('textbox', { name: f })).toBeVisible();
    await expect(t.dialog.getByRole('group', { name: 'Tax codes' }).getByRole('checkbox').first()).toBeVisible();
  });
  await qa.step(3, async () => {
    await t.fill({ Code: code, Description: qa.name('X Belanja jasa uji'), Remarks: qa.prefix('X uji') });
    for (const c of ['PPN · ', 'PPH · ']) await t.dialog.getByRole('checkbox', { name: new RegExp(`^${c}`) }).check();
    expect(await t.save()).toContain('Utilisation type created.');
    const c = await t.cells(code);
    expect(c[2]).toMatch(/PPN/);
    expect(c[2]).toMatch(/PPH/);
  });
  await qa.step(4, async () => {
    await t.edit(code);
    await t.dialog.getByRole('checkbox', { name: /^PPH · / }).uncheck();
    expect(await t.save()).toContain('Utilisation type updated.');
  });
};

export const TC_APP020_008: QaBody = async ({ page, qa }) => {
  const t = types(page);
  const code = qa.code('X-JASA');
  expect(await t.add({ Code: code, Description: qa.name('X Belanja jasa uji'), Remarks: qa.prefix('X uji') })).toContain('Utilisation type created.');
  await qa.step(1, async () => {
    await t.openAdd();
    await t.fill({ Code: code, Description: qa.name('X Belanja jasa uji'), Remarks: qa.prefix('X uji') });
    expect(await t.saveText()).toContain('This code already exists.');
  });
  await qa.step(2, async () => {
    await t.openAdd();
    await t.fill({ Code: qa.code('X-JASA'), Description: qa.name('X Belanja jasa uji') });
    const text = await t.saveText();
    const invalid = await invalidFields(t.dialog);
    expect(text).not.toContain('Utilisation type created.');
    qa.note(2, invalid.length ? `the browser stops the click (${invalid.join('; ')})` : `"${text.slice(0, 120)}"`);
  });
  qa.notRun(3, 'needs a tax code set inactive in Settings while the dialog is open (two windows at once)');
};

export const TC_APP020_009: QaBody = async ({ page, qa }) => {
  const p = projects(page);
  const b = await book(page, qa);
  const emp = await payrollEmployee(page, qa, HR.emp1);
  const name = qa.name('X Proyek uji');
  const end = addMonths(todayWib(), 3);
  await qa.step(1, async () => {
    await page.goto('/id/budget');
    await page.getByRole('main').getByRole('link', { name: 'Projects' }).click();
    await expect(p.main.getByRole('heading', { level: 1, name: 'Projects' })).toBeVisible();
    await expect(p.main.getByRole('button', { name: 'Add project' })).toBeVisible();
    await expect(p.main.getByRole('columnheader')).toHaveText(['Name', 'Type', 'Period', 'Employee', 'Budget books', 'Status', 'Actions']);
  });
  await qa.step(2, async () => {
    await p.main.getByRole('button', { name: 'Add project' }).click();
    await expect(p.dialog).toHaveAccessibleName('New project');
    for (const f of ['Project name', 'Start date', 'End date', 'Remarks']) await expect(p.dialog.getByRole('textbox', { name: f })).toBeVisible();
    await expect(p.dialog.getByRole('combobox', { name: 'Type' }).locator('option')).toHaveText(['Extramural', 'Intramural']);
    await expect(p.dialog.getByRole('combobox', { name: 'Employee' })).toBeVisible();
    await expect(p.dialog.getByRole('group', { name: 'Budget books' })).toBeVisible();
  });
  await qa.step(3, async () => {
    await p.fill({ 'Project name': name, Type: 'Intramural', 'Start date': todayWib(), 'End date': end, Employee: emp.no });
    await p.dialog.getByRole('checkbox', { name: new RegExp(`^${b.code} · `) }).check();
    expect(await p.save()).toContain('Project created.');
    const c = await p.cells(name);
    qa.note(3, `row: ${c.join(' | ')}`);
    expect(c[1]).toBe('Intramural');
    expect(c.join(' ')).toContain(b.code);
  });
  await qa.step(4, async () => {
    const c = chart(page);
    await c.open();
    await c.main.getByRole('combobox', { name: 'Book' }).selectOption({ label: `${b.code} · ${b.name}` });
    qa.note(4, 'attaching is run in TC-APP020-005 (the chart needs a head first)');
  });
};

export const TC_APP020_010: QaBody = async ({ page, qa }) => {
  const p = projects(page);
  const name = qa.name('X Proyek uji');
  expect(await p.add({ 'Project name': name, Type: 'Intramural', 'Start date': todayWib(), 'End date': addMonths(todayWib(), 3) })).toContain('Project created.');
  await qa.step(1, async () => {
    await p.openAdd();
    await p.fill({ 'Project name': qa.name('X Proyek uji'), 'Start date': todayWib(), 'End date': addDays(todayWib(), -5) });
    expect(await p.saveText()).toContain('The end date is before the start date.');
  });
  await qa.step(2, async () => {
    await p.openAdd();
    await p.fill({ 'Project name': name, 'Start date': todayWib(), 'End date': addMonths(todayWib(), 3) });
    expect(await p.saveText()).toContain('A project with this name already exists.');
  });
  qa.notRun(3, 'run with the chart in TC-APP020-006');
  qa.notRun(4, 'needs an employee removed in HR while the dialog is open (two windows at once)');
};

export const TC_APP020_011: QaBody = async ({ page, qa }) => {
  const q = questions(page);
  const b = await book(page, qa);
  const question = qa.name('X Apakah TOR sudah dilampirkan?');
  await qa.step(1, async () => {
    await page.goto('/id/budget');
    await page.getByRole('main').getByRole('link', { name: 'Sanction checklist' }).click();
    await expect(q.main.getByRole('heading', { level: 1, name: 'Sanction checklist' })).toBeVisible();
    await expect(q.main.getByRole('combobox', { name: 'Book' })).toBeVisible();
    await expect(q.main.getByRole('columnheader')).toHaveText(['Book', 'Order', 'Question', 'Status', 'Actions']);
  });
  await qa.step(2, async () => {
    await q.main.getByRole('button', { name: 'New question' }).click();
    await expect(q.dialog).toHaveAccessibleName('New checklist question');
    await expect(q.dialog.getByText('Proposals must answer every active question of their book before they are sent.')).toBeVisible();
    await expect(q.dialog.getByRole('combobox', { name: 'Budget book' })).toBeVisible();
    await expect(q.dialog.getByRole('spinbutton', { name: 'Order' })).toBeVisible();
    await expect(q.dialog.getByRole('textbox', { name: 'Question' })).toBeVisible();
    await expect(q.dialog.getByRole('checkbox', { name: 'Active (asked of new proposals)' })).toBeChecked();
  });
  await qa.step(3, async () => {
    await q.fill({ 'Budget book': b.code, Order: '1', Question: question });
    expect(await q.save()).toContain('Question added.');
    const c = await q.cells(question);
    expect(c.slice(0, 3)).toEqual([b.code, '1', question]);
  });
  await qa.step(4, async () => {
    await page.goto('/id/budget/sanctions');
    await page.getByRole('main').getByRole('button', { name: /New proposal/ }).click();
    const d = page.getByRole('dialog');
    await choose(d.getByRole('combobox', { name: /Budget book|Book/ }).first(), b.code);
    await expect(d.getByText(question)).toBeVisible();
  });
};

export const TC_APP020_012: QaBody = async ({ page, qa }) => {
  const q = questions(page);
  const b = await book(page, qa);
  const question = qa.name('X Apakah TOR sudah dilampirkan?');
  expect(await q.add({ 'Budget book': b.code, Order: '1', Question: question })).toContain('Question added.');
  await qa.step(1, async () => {
    await q.openAdd();
    await q.fill({ 'Budget book': b.code, Order: '2', Question: question });
    expect(await q.saveText()).toContain('This book already asks this question.');
  });
  await qa.step(2, async () => {
    await q.openAdd();
    await q.fill({ 'Budget book': b.code, Order: '3' });
    const text = await q.saveText();
    const invalid = await invalidFields(q.dialog);
    expect(text).not.toContain('Question added.');
    qa.note(2, invalid.length ? `the browser stops the click (${invalid.join('; ')})` : `"${text.slice(0, 120)}"`);
  });
  await qa.step(3, async () => {
    const off = await book(page, qa, { Active: false });
    await q.openAdd();
    const offered = (await q.dialog.getByRole('combobox', { name: 'Budget book' }).locator('option').allInnerTexts()).some((o) => o.startsWith(off.code));
    if (!offered) {
      qa.note(3, 'the inactive book is not offered');
      return;
    }
    await q.fill({ 'Budget book': off.code, Question: qa.name('X Apakah TOR sudah dilampirkan?') });
    expect(await q.saveText()).toContain('The budget book is inactive.');
  });
};

export const TC_APP020_006: QaBody = async ({ page, qa }) => {
  const b = await book(page, qa);
  const grp = await head(page, qa);
  const child = await head(page, qa, 'X-OBAT', 'X Belanja obat uji anak');
  const leaf = await head(page, qa, 'X-ALKES', 'X Belanja alkes uji', 'Capital');
  expect(await addToChart(page, b, grp.code, { group: true })).toContain('Head added to the chart.');
  expect(await addToChart(page, b, child.code, { parent: grp.code })).toContain('Head added to the chart.');
  expect(await addToChart(page, b, leaf.code)).toContain('Head added to the chart.');
  await qa.step(1, async () => {
    expect(await addToChart(page, b, grp.code)).toContain("This head is already in this book's chart.");
  });
  await qa.step(2, async () => {
    const other = await head(page, qa, 'X-OBAT', 'X Belanja obat uji dua');
    const text = await addToChart(page, b, other.code, { parent: leaf.code }).catch((e) => `not offered: ${String(e).slice(0, 60)}`);
    qa.note(2, `"${text.slice(0, 160)}"`);
    expect(text).not.toContain('Head added to the chart.');
  });
  await qa.step(3, async () => {
    const row = await chartRow(page, b, grp.code);
    await row.getByRole('button', { name: 'Edit' }).click();
    await chart(page).dialog.getByRole('checkbox', { name: 'Group (can hold child heads)' }).uncheck();
    expect(await chart(page).saveText()).toContain('A head with children must stay a group.');
  });
  await qa.step(4, async () => {
    expect(await deactivate(page, b, grp.code)).toContain('This head has active children. Deactivate the children first.');
  });
  qa.notRun(5, 'attaching projects: see TC-APP020-005 step 5');
  qa.notRun(6, 'see step 5');
};

export const TC_APP020_042: QaBody = async ({ page, qa }) => {
  // Since 2026-11-01 budget lines with a balance can be made (allocations are approved on Podomoro). What the steps
  // expect is TBD in the workbook; step 1 reads whether the purchase order asks for a budget head at all.
  await qa.step(1, async () => {
    const po = new PurchaseOrdersPage(page);
    await po.open();
    await po.openNew();
    const main = page.getByRole('main');
    const form = page.getByRole('dialog').or(main).first();
    const labels = (await form.locator('label').allInnerTexts()).map((l) => l.trim().split('\n')[0]).filter(Boolean);
    const budget = labels.filter((l) => /budget|anggaran/i.test(l));
    qa.note(1, `the purchase order asks for: ${labels.join(', ').slice(0, 300)}; budget fields: ${budget.join(', ') || 'none'} (TBD in the workbook)`);
    await page.keyboard.press('Escape');
  });
  const why = 'TBD in the workbook, and the purchase order asks for no budget head, so Procurement reserves nothing on a budget line (work orders of 26-maintenance name a budget head)';
  for (const s of [2, 3, 4, 5]) qa.notRun(s, why);
};

export const SCREENS: [string, string, string][] = [
  ['TC-APP020-046', '/budget', 'Budget'],
  ['TC-APP020-047', '/budget/allocations', 'Budget allocation'],
  ['TC-APP020-048', '/budget/books', 'Budget books'],
  ['TC-APP020-049', '/budget/chart', 'Budget chart'],
  ['TC-APP020-050', '/budget/circulars', 'Budget circulars'],
  ['TC-APP020-051', '/budget/fund-releases', 'Fund release'],
  ['TC-APP020-052', '/budget/fund-withdrawals', 'Fund withdrawal'],
  ['TC-APP020-053', '/budget/heads', 'Budget heads'],
  ['TC-APP020-054', '/budget/internal-budgets', 'Internal budgets'],
  ['TC-APP020-055', '/budget/projects', 'Projects'],
  ['TC-APP020-056', '/budget/requests', 'Budget requests'],
  ['TC-APP020-057', '/budget/sanction-checklists', 'Sanction checklist'],
  ['TC-APP020-058', '/budget/sanctions', 'Sanction proposals'],
  ['TC-APP020-059', '/budget/transfers', 'Budget transfer'],
  ['TC-APP020-060', '/budget/util-types', 'Utilisation types'],
  ['TC-APP020-061', '/budget/utilisations', 'Budget utilisation'],
];
