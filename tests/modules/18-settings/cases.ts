import { weekdayOf, todayWib, addDays } from '../../../lib/dates';
import { pick, users, toastsAfter, serviceCenters, roles, holidays, departments } from './helpers';
import { toastMark } from '../../../lib/assertions';
import { expect } from '../../../fixtures/e2e';
import type { Page } from '@playwright/test';
import type { Qa } from '../../../fixtures/e2e';

/**
 * Test cases of 18-settings that end-to-end chains run too (tests/e2e/chains/):
 * each is declared by its module spec with qaTest and called by a chain with the chain's Qa.
 */
export type CaseArgs = { page: Page; qa: Qa };

export const TC_APP018_004 = async ({ page, qa }: CaseArgs): Promise<void> => {
  const d = departments(page);
  const code = qa.code('QA-DEP-01');
  const name = qa.name('QA Poli Uji');
  await qa.step(1, async () => {
    await page.goto('/en/settings');
    await page.getByRole('main').getByRole('link', { name: /^Departments\b/ }).click();
    await expect(d.main.getByRole('heading', { level: 1, name: 'Departments' })).toBeVisible();
    await expect(d.main.getByText('Department on one branch.', { exact: true })).toBeVisible();
    await expect(d.search).toBeVisible();
    await expect(d.status).toBeVisible();
    await expect(d.main.getByRole('button', { name: 'Add Department' })).toBeVisible();
  });
  await qa.step(2, async () => {
    await d.main.getByRole('button', { name: 'Add Department' }).click();
    await expect(d.dialog).toHaveAccessibleName('Add Department');
    for (const f of ['Department code', 'Department name']) await expect(d.dialog.getByRole('textbox', { name: f })).toBeVisible();
    const site = d.dialog.getByRole('combobox', { name: 'Site' });
    await expect(site).toBeDisabled();
    expect(await chosen(site)).toContain(BR_A);
  });
  await qa.step(3, async () => {
    await d.advanced();
    await expect(d.dialog.getByRole('textbox', { name: 'Description' })).toBeVisible();
    await expect(d.dialog.getByRole('checkbox', { name: 'Active' })).toBeChecked();
  });
  await qa.step(4, async () => {
    await d.fill({ 'Department code': code, 'Department name': name, Description: 'QA Departemen untuk uji' });
    expect(await d.save()).toContain('Department added.');
  });
  await qa.step(5, async () => {
    expect((await d.cells(await d.row(code))).slice(0, 4)).toEqual([code, name, BR_A, 'Active']);
  });
};

export const TC_APP018_006 = async ({ page, qa }: CaseArgs): Promise<void> => {
  const sc = serviceCenters(page);
  const dep = await department(page, qa);
  const code = qa.code('QA-SC-01');
  const name = qa.name('QA Loket Uji');
  await qa.step(1, async () => {
    await page.goto('/en/settings');
    await page.getByRole('main').getByRole('link', { name: /^Service centers\b/ }).click();
    await expect(sc.main.getByRole('heading', { level: 1, name: 'Service Centers' })).toBeVisible();
    await expect(sc.main.getByText('Service center on a branch, optionally under a department.', { exact: true })).toBeVisible();
    await expect(sc.main.getByRole('button', { name: 'Add Service Center' })).toBeVisible();
  });
  await qa.step(2, async () => {
    await sc.main.getByRole('button', { name: 'Add Service Center' }).click();
    await expect(sc.dialog).toHaveAccessibleName('Add Service Center');
    for (const f of ['Service center code', 'Service center name']) await expect(sc.dialog.getByRole('textbox', { name: f })).toBeVisible();
    await expect(sc.dialog.getByRole('combobox', { name: 'Site' })).toBeDisabled();
    expect(await chosen(sc.dialog.getByRole('combobox', { name: 'Site' }))).toContain(BR_A);
    await expect(sc.dialog.getByRole('combobox', { name: 'Department' })).toBeVisible();
  });
  await qa.step(3, async () => {
    await sc.fill({ 'Service center code': code, 'Service center name': name });
    const box = sc.dialog.getByRole('combobox', { name: 'Department' });
    const tag = await box.evaluate((e) => e.tagName);
    if (tag === 'SELECT') await box.selectOption({ label: (await box.locator('option').allInnerTexts()).find((o) => o.includes(dep.name))! });
    else {
      await box.fill(dep.name);
      await page.getByRole('option', { name: new RegExp(dep.name) }).first().click();
    }
    qa.note(3, `the department was found by its name "${dep.name}" (the workbook types "QA Poli")`);
    await expect(box).toHaveValue(new RegExp(dep.code + '|' + dep.name));
  });
  await qa.step(4, async () => {
    expect(await sc.save()).toContain('Service center added.');
  });
  await qa.step(5, async () => {
    const c = await sc.cells(await sc.row(code));
    expect(c.slice(0, 5)).toEqual([code, name, BR_A, dep.name, 'Active']);
  });
};

export const TC_APP018_052 = async ({ page, qa }: CaseArgs): Promise<void> => {
  const h = holidays(page);
  const occasion = qa.name('X Libur uji');
  const date = sundayAhead();
  try {
    await qa.step(1, async () => {
      await page.goto('/en/settings');
      await page.getByRole('main').getByRole('link', { name: /^Holidays\b/ }).click();
      await expect(h.main.getByRole('heading', { level: 1, name: 'Holidays' })).toBeVisible();
      await expect(h.main.getByText('A day the clinic is closed. Blank site means every site.', { exact: true })).toBeVisible();
      await expect(h.main.getByRole('button', { name: 'Add holiday' })).toBeVisible();
      await expect(h.main.getByRole('columnheader')).toHaveText(['Date', 'Occasion', 'Active', '']);
    });
    await qa.step(2, async () => {
      await h.main.getByRole('button', { name: 'Add holiday' }).click();
      await expect(h.dialog).toHaveAccessibleName('Add holiday');
      await expect(h.dialog.getByText('Applies to every site.')).toBeVisible();
      for (const f of ['Occasion', 'Date']) await expect(h.dialog.getByRole('textbox', { name: f })).toBeVisible();
      await expect(h.dialog.getByRole('checkbox', { name: 'Active' })).toBeChecked();
      for (const b of ['Cancel', 'Save']) await expect(h.dialog.getByRole('button', { name: b })).toBeVisible();
      await h.dialog.getByRole('button', { name: 'Cancel' }).click();
    });
    await qa.step(3, async () => {
      expect(await addHoliday(page, occasion, date)).toContain('Holiday saved.');
      await h.open();
      const row = h.rows().filter({ hasText: occasion });
      expect((await h.cells(row)).slice(0, 3)).toEqual([date, occasion, 'Yes']);
    });
    qa.notRun(4, `TBD: booking on ${date} needs the appointment flow of 02 on a day DR-1 does not work (Sunday, chosen so the shared appointment Mondays stay open)`);
    await qa.step(5, async () => {
      await h.open();
      await h.rows().filter({ hasText: occasion }).getByRole('button', { name: 'Edit' }).click();
      await h.dialog.getByRole('checkbox', { name: 'Active' }).uncheck();
      expect(await h.save()).toContain('Holiday saved.');
      await h.open();
      expect((await h.cells(h.rows().filter({ hasText: occasion })))[2]).toBe('No');
    });
  } finally {
    await retireHolidays(page, occasion);
  }
};

export const TC_APP018_037 = async ({ page, qa }: CaseArgs): Promise<void> => {
  const r = roles(page);
  const name = roleName(qa);
  const description = qa.name('X Peran uji');
  await qa.step(1, async () => {
    await page.goto('/en/settings');
    await page.getByRole('main').getByRole('link', { name: /^Roles\b/ }).click();
    await expect(r.main.getByRole('heading', { level: 1, name: 'Roles' })).toBeVisible();
    await expect(r.main.getByText('Roles used to grant access.', { exact: true })).toBeVisible();
    await expect(r.search).toBeVisible();
    await expect(r.status).toBeVisible();
    await expect(r.main.getByRole('columnheader')).toHaveText(['Name', 'Description', 'Status', 'Actions']);
  });
  await qa.step(2, async () => {
    await r.main.getByRole('button', { name: 'Add Role' }).click();
    await expect(r.dialog).toHaveAccessibleName('Add Role');
    await expect(r.dialog.getByText('Role master — name, description, and active flag.')).toBeVisible();
    for (const f of ['Role name', 'Description']) await expect(r.dialog.getByRole('textbox', { name: f })).toBeVisible();
    await expect(r.dialog.getByRole('checkbox', { name: 'Active' })).toBeChecked();
  });
  await qa.step(3, async () => {
    await r.fill({ 'Role name': name, Description: description });
    expect(await r.save()).toContain('Role added.');
    expect((await r.cells(await r.row(name))).slice(0, 3)).toEqual([name, description, 'Active']);
  });
  await qa.step(4, async () => {
    await page.goto('/en/identity/rights');
    await pickRole(page, name);
    await expect(page.getByRole('main').getByText(/^0 \/ \d+$/)).toBeVisible();
    expect(await page.getByRole('main').getByRole('checkbox', { checked: true }).count()).toBe(0);
  });
  await qa.step(5, async () => {
    await r.edit(name);
    await r.fill({ Active: false });
    expect(await r.save()).toContain('Role updated.');
    expect((await r.cells(await r.row(name)))[2]).toBe('Inactive');
  });
  await qa.step(6, async () => {
    await users(page).openAdd();
    const offered = await page.getByRole('dialog').getByRole('checkbox', { name, exact: true }).count();
    qa.note(6, `the inactive role is ${offered ? '' : 'not '}offered in "Add User"`);
  });
};

export const TC_APP018_039 = async ({ page, qa }: CaseArgs): Promise<void> => {
  const r = roles(page);
  const main = page.getByRole('main');
  const name = roleName(qa);
  expect(await r.add({ 'Role name': name, Description: qa.name('X Peran uji') })).toContain('Role added.');
  try {
    await qa.step(1, async () => {
      await page.goto('/en/settings');
      await main.getByRole('link', { name: /^Rights\b/ }).click();
      await expect(main.getByRole('heading', { level: 1, name: 'User Rights' })).toBeVisible();
      await expect(main.getByText('Privileges granted to each role.', { exact: true })).toBeVisible();
      await expect(main.getByRole('combobox', { name: 'Role' })).toBeVisible();
      await expect(main.getByRole('heading', { level: 2, name: 'Privileges' })).toBeVisible();
      await expect(main.getByRole('button', { name: 'Save rights' })).toBeVisible();
    });
    await qa.step(2, async () => {
      await pickRole(page, name);
      await expect(main.getByText(/^0 \/ \d+$/)).toBeVisible();
    });
    await qa.step(3, async () => {
      await main.getByRole('checkbox', { name: /^DIET_WRITE\b/ }).check();
      const mark = await toastMark(page);
      await main.getByRole('button', { name: 'Save rights' }).click();
      const toasts = await toastsAfter(page, mark);
      if (toasts.includes('Failed to save rights.')) {
        qa.blocked(3, 38);
        return;
      }
      expect(toasts).toContain('Rights updated.');
      await page.reload();
      await pickRole(page, name);
      await expect(main.getByText(/^1 \/ \d+$/)).toBeVisible();
    });
    qa.notRun(4, 'a diet request needs an admitted patient and the 13 Dietary flow as the test user');
    qa.notRun(5, 'see step 4');
    await qa.step(6, async () => {
      const names = await main.getByRole('checkbox').evaluateAll((es) => es.map((e) => e.getAttribute('aria-label') ?? (e as HTMLInputElement).labels?.[0]?.textContent ?? ''));
      const box = main.getByRole('checkbox', { name: /^DIET_WRITE\b/ });
      const label = (await box.locator('xpath=..').innerText()).replace(/\s+/g, ' ').trim();
      qa.note(6, `${names.length} privileges; DIET_WRITE reads "${label}"`);
      expect(label).toBe('DIET_WRITE DIET_WRITE');
    });
  } finally {
    await r.edit(name);
    await r.fill({ Active: false });
    await r.save();
  }
};

export const BR_A = 'Podomoro';

/** The text of the chosen option of a list. */
export const chosen = (box: import('@playwright/test').Locator) =>
  box.evaluate((e) => (e.tagName === 'SELECT' ? ((e as HTMLSelectElement).selectedOptions[0]?.textContent ?? '') : (e as HTMLInputElement).value).trim());

/** A department of BR-A made by a test; returns code and name. */
export async function department(page: Page, qa: Qa, base = 'QA-DEP-01', name = 'QA Poli Uji'): Promise<{ code: string; name: string }> {
  const d = { code: qa.code(base), name: qa.name(name) };
  expect(await departments(page).add({ 'Department code': d.code, 'Department name': d.name })).toContain('Department added.');
  return d;
}

/** A Sunday about three weeks ahead (DR-1 of the appointment tests works Monday to Friday). */
export function sundayAhead(weeks = 3): string {
  const d = addDays(todayWib(), weeks * 7);
  return addDays(d, (7 - weekdayOf(d)) % 7);
}

export async function addHoliday(page: Page, occasion: string, date: string): Promise<string[]> {
  const h = holidays(page);
  await h.openAdd();
  await h.dialog.getByRole('textbox', { name: 'Occasion' }).fill(occasion);
  await h.dialog.getByRole('textbox', { name: 'Date' }).fill(date);
  return h.save();
}

/** Sets every active holiday of an occasion inactive (end of a test). */
export async function retireHolidays(page: Page, occasion: string): Promise<void> {
  const h = holidays(page);
  for (let i = 0; i < 5; i++) {
    await h.open();
    const row = h.rows().filter({ hasText: occasion }).filter({ has: page.getByRole('cell', { name: 'Yes', exact: true }) }).first();
    if (!(await row.count())) return;
    await row.getByRole('button', { name: 'Edit' }).click();
    await h.dialog.getByRole('checkbox', { name: 'Active' }).uncheck();
    await h.save();
  }
}

/** Picks a role on User Rights by typing its name. */
export async function pickRole(page: Page, name: string): Promise<void> {
  const box = page.getByRole('main').getByRole('combobox', { name: 'Role' });
  if ((await box.evaluate((e) => e.tagName)) === 'SELECT') {
    await box.selectOption({ label: name });
    return;
  }
  await pick(box, name);
}

export const roleName = (qa: Qa) => `qa_uji_${qa.token().toLowerCase()}`;
