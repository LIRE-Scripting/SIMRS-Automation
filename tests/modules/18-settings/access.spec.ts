import type { Locator, Page } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { everyPage } from '../../../pages/paging';
import { asUser, BR_A, BR_B, headerOneBranch, userPage } from '../shared/access';
import { backToEnglish } from '../shared/language';
import { chosen } from './cases';
import { countries, departments, ensureSiteNew, serviceCenters, SITE_NEW, sites, taxCodes, type Mdm } from './helpers';

/**
 * 18-settings.xlsx, the access test cases of Departments, Service Centers,
 * Sites, Countries and Tax Codes: U2 on "All branches", U3 without any
 * right, and U1 next to a branch of U6 (Kemayoran). DEP-1 and SC-1 are a
 * department and a service center of each test, named "QA Zz …" so that
 * they sort after "QA Poli Umum" (the first 50 departments, found blocker 40).
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

test.afterEach(async ({ page }) => {
  await backToEnglish(page);
});

/** A department of this test on the user's branch (or the given site, for U2). */
async function dept(page: Page, qa: Qa, base = 'QA-DEP-01', site?: string): Promise<{ code: string; name: string }> {
  const d = departments(page);
  const v = { code: qa.code(base), name: qa.name('QA Zz Poli Akses') };
  await d.openAdd();
  if (site) await chooseSite(d.dialog.getByRole('combobox', { name: 'Site' }), site);
  await d.fill({ 'Department code': v.code, 'Department name': v.name });
  expect(await d.save()).toContain('Department added.');
  return v;
}

/** Picks the department of a service center: a list, or a type-ahead with hits. */
async function chooseDepartment(dialog: Locator, name: string): Promise<void> {
  const box = dialog.getByRole('combobox', { name: 'Department' });
  if ((await box.evaluate((e) => e.tagName)) === 'SELECT') {
    await box.selectOption({ label: (await box.locator('option').allInnerTexts()).find((o) => o.includes(name))! });
    return;
  }
  await box.fill(name);
  await dialog.page().getByRole('option', { name: new RegExp(name) }).first().click();
}

/** The departments a service center's "Department" offers (options of a list, or hits for "QA"). */
async function departmentsOffered(dialog: Locator, typed = 'QA'): Promise<string[]> {
  const box = dialog.getByRole('combobox', { name: 'Department' });
  if ((await box.evaluate((e) => e.tagName)) === 'SELECT') return (await box.locator('option').allInnerTexts()).map((o) => o.trim());
  await box.fill(typed);
  await dialog.page().waitForLoadState('networkidle').catch(() => {});
  return (await dialog.page().getByRole('option').allInnerTexts()).map((o) => o.trim());
}

/** "Site": a list, or a type-ahead that is emptied, typed into and its hit clicked. */
async function chooseSite(box: Locator, site: string): Promise<void> {
  if ((await box.evaluate((e) => e.tagName)) === 'SELECT') {
    await box.selectOption({ label: (await box.locator('option').allInnerTexts()).find((o) => o.includes(site))! });
    return;
  }
  await box.fill('');
  await box.fill(site);
  await box.page().getByRole('option', { name: new RegExp(site) }).first().click();
}

/** A service center of this test under a department. */
async function center(page: Page, qa: Qa, dep: { name: string }, site?: string): Promise<{ code: string; name: string }> {
  const sc = serviceCenters(page);
  const v = { code: qa.code('QA-SC-01'), name: qa.name('QA Zz Loket Akses') };
  await sc.openAdd();
  if (site) await chooseSite(sc.dialog.getByRole('combobox', { name: 'Site' }), site);
  await sc.fill({ 'Service center code': v.code, 'Service center name': v.name });
  await chooseDepartment(sc.dialog, dep.name);
  expect(await sc.save()).toContain('Service center added.');
  return v;
}

async function listed(m: Mdm, code: string): Promise<number> {
  return (await m.row(code)).count();
}

/** Saves the dialog of a user without the right; a success is a deviation (the workbook's known risk), the toast is noted. */
async function refusedOrDeviation(qa: Qa, step: number, m: Mdm, what: string, success: string): Promise<boolean> {
  const toasts = await m.save();
  const saved = toasts.includes(success);
  if (saved) qa.deviation(step, 'Refused', `${what} is accepted for U3 (no right): toast "${success}"`);
  else qa.note(step, `${what}: "${toasts.join(' / ') || 'no toast'}"`);
  return saved;
}

qaTest('TC-APP018-010', async ({ page, qa, browser }) => {
  const d = departments(page);
  const sc = serviceCenters(page);
  const dep = { code: qa.code('QA-DEP-B01'), name: qa.name('QA Zz Poli Cabang') };
  const scB = { code: qa.code('QA-SC-B01'), name: qa.name('QA Zz Loket Cabang') };
  const site = d.dialog.getByRole('combobox', { name: 'Site' });

  await qa.step(1, async () => {
    await d.open();
    const headers = (await d.main.getByRole('columnheader').allInnerTexts()).map((h) => h.trim());
    const col = headers.findIndex((h) => /site|branch/i.test(h));
    expect(col, `a Site column (columns: ${headers.join(', ')})`).toBeGreaterThanOrEqual(0);
    const shown = new Set(await d.rows().evaluateAll((rs, i) => rs.map((r) => r.querySelectorAll('td')[i]?.textContent?.trim() ?? ''), col));
    qa.note(1, `sites on the first page: ${[...shown].filter(Boolean).join(', ')}`);
  });

  await qa.step(2, async () => {
    await d.main.getByRole('button', { name: 'Add Department' }).click();
    await expect(site).toBeEnabled();
    qa.note(2, `"Site" shows "${await chosen(site)}"`);
  });

  await qa.step(3, async () => {
    await chooseSite(site, BR_B);
    expect(await chosen(site)).toContain(BR_B);
  });

  await qa.step(4, async () => {
    await d.fill({ 'Department code': dep.code, 'Department name': dep.name });
    expect(await d.save()).toContain('Department added.');
    expect((await d.cells(await d.row(dep.code))).join(' | ')).toContain(BR_B);
  });

  await qa.step(5, async () => {
    await sc.openAdd();
    await chooseSite(sc.dialog.getByRole('combobox', { name: 'Site' }), BR_B);
    const offered = await departmentsOffered(sc.dialog);
    expect(offered.some((o) => o.includes('QA Poli Umum')), `"QA Poli Umum" of ${BR_A} offered for ${BR_B}`).toBe(false);
    qa.note(5, `"Department" offers ${offered.length} departments for ${BR_B}`);
  });

  await qa.step(6, async () => {
    await chooseDepartment(sc.dialog, dep.name);
    await sc.fill({ 'Service center code': scB.code, 'Service center name': scB.name });
    expect(await sc.save()).toContain('Service center added.');
  });

  await qa.step(7, async () => {
    await asUser(browser, 'U6', async (u6) => {
      expect(await listed(departments(u6), dep.code)).toBe(1);
      expect(await listed(serviceCenters(u6), scB.code)).toBe(1);
    });
    await asUser(browser, 'U1', async (u1) => {
      expect(await listed(departments(u1), dep.code)).toBe(0);
      expect(await listed(serviceCenters(u1), scB.code)).toBe(0);
    });
  });
});

qaTest('TC-APP018-013', async ({ page, qa, browser }) => {
  // DEP-1 and SC-1: a department and a service center of this test (made by U1), so the shared ones are never touched.
  const dep1 = await dept(page, qa);
  const sc1 = await center(page, qa, dep1);
  const staff = await userPage(browser, 'U3');
  try {
    await qa.step(1, async () => {
      const d = departments(staff);
      const code = qa.code('QA-DEP-TANPA-HAK');
      await d.openAdd();
      await d.fill({ 'Department code': code, 'Department name': qa.name('QA Zz Tanpa Hak') });
      const saved = await refusedOrDeviation(qa, 1, d, 'Adding a department', 'Department added.');
      expect(await listed(departments(page), code)).toBe(saved ? 1 : 0);
    });

    await qa.step(2, async () => {
      const d = departments(staff);
      await d.edit(dep1.code);
      await d.fill({ 'Department name': qa.name('QA Zz Diubah'), Active: false });
      const saved = await refusedOrDeviation(qa, 2, d, 'Renaming and retiring DEP-1', 'Department updated.');
      const c = await departments(page).cells(await departments(page).row(dep1.code));
      if (!saved) expect(c[1]).toBe(dep1.name);
    });

    await qa.step(3, async () => {
      const s = serviceCenters(staff);
      const code = qa.code('QA-SC-TANPA-HAK');
      await s.openAdd();
      await s.fill({ 'Service center code': code, 'Service center name': qa.name('QA Zz Tanpa Hak') });
      const saved = await refusedOrDeviation(qa, 3, s, 'Adding a service center', 'Service center added.');
      expect(await listed(serviceCenters(page), code)).toBe(saved ? 1 : 0);
    });

    await qa.step(4, async () => {
      const s = serviceCenters(staff);
      await s.edit(sc1.code);
      await s.fill({ Active: false });
      const saved = await refusedOrDeviation(qa, 4, s, 'Retiring SC-1', 'Service center updated.');
      const c = await serviceCenters(page).cells(await serviceCenters(page).row(sc1.code));
      if (!saved) expect(c.join(' ')).toContain('Active');
    });
  } finally {
    await staff.context().close();
  }
});

qaTest('TC-APP018-014', async ({ page, qa, browser }) => {
  await ensureSiteNew(page);
  const staff = await userPage(browser, 'U3');
  let retired = false;
  try {
    await qa.step(1, async () => {
      const s = sites(staff);
      const code = qa.code('QA-SITE-TANPA-HAK');
      await s.openAdd();
      await s.fill({ 'Site code': code, 'Site name': qa.name('QA Zz Site Tanpa Hak') });
      const toasts = await s.save();
      expect(toasts).not.toContain('Site added.');
      qa.note(1, `Add Site: "${toasts.join(' / ') || 'no toast'}"`);
      if (!toasts.some((t) => /privilege|permission|not allowed|right/i.test(t))) qa.deviation(1, 'Refused with a message that the user may not do this', `toast "${toasts.join(' / ') || 'none'}"`);
      expect(await listed(sites(page), code)).toBe(0);
    });

    await qa.step(2, async () => {
      const s = sites(staff);
      await s.edit(SITE_NEW.code);
      await s.fill({ Active: false });
      const toasts = await s.save();
      retired = toasts.some((t) => /updated|saved/i.test(t) && !/fail/i.test(t));
      expect(retired, `SITE-NEW is retired by U3: "${toasts.join(' / ')}"`).toBe(false);
      qa.note(2, `Edit Site: "${toasts.join(' / ') || 'no toast'}"`);
      expect((await sites(page).cells(await sites(page).row(SITE_NEW.code))).join(' ')).toContain('Active');
    });

    await qa.step(3, async () => {
      const c = countries(staff);
      const code = `QB-${qa.token()}`;
      await c.openAdd();
      await c.fill({ 'Country code': code, 'Country name': qa.name('QA Negara Tanpa Hak') });
      const toasts = await c.save();
      expect(toasts).not.toContain('Country added.');
      qa.note(3, `Add Country ("QB" with a token): "${toasts.join(' / ') || 'no toast'}"`);
      expect(await listed(countries(page), code)).toBe(0);
    });

    await qa.step(4, async () => {
      const t = taxCodes(staff);
      const code = qa.code('QA-TANPA-HAK');
      await t.openAdd();
      await t.fill({ Code: code, Name: qa.name('QA Pajak Tanpa Hak'), 'Rate (%)': '11' });
      const toasts = await t.save();
      expect(toasts.filter((x) => /added/i.test(x))).toEqual([]);
      qa.note(4, `Add tax code: "${toasts.join(' / ') || 'no toast'}"`);
    });
    qa.note(1, 'every "Add" and edit button is shown to U3');
  } finally {
    await staff.context().close();
    if (retired) {
      // SITE-NEW is shared by other tests: set it active again.
      const s = sites(page);
      await s.edit(SITE_NEW.code);
      await s.fill({ Active: true });
      await s.save();
    }
  }
});

qaTest('TC-APP018-020', async ({ page, qa, browser }) => {
  // DEP-1 with SC-1 in BR-A: a department and a service center of this test, made by U1.
  const { dep1, sc1 } = await asUser(browser, 'U1', async (u1) => {
    const d = await dept(u1, qa);
    return { dep1: d, sc1: await center(u1, qa, d) };
  });
  qa.note(1, 'no employee is put in DEP-1: the Department picker of HR holds the first 50 departments only (found blocker 40)');
  const d = departments(page);
  const sc = serviceCenters(page);

  await qa.step(1, async () => {
    await d.edit(dep1.code);
    await chooseSite(d.dialog.getByRole('combobox', { name: 'Site' }), BR_B);
    const toasts = await d.save();
    if (toasts.includes('Department updated.')) qa.deviation(1, 'Refused, or a warning that a service center and an employee belong to it', `moved to ${BR_B} at once (toast "Department updated."), with SC-1 under it`);
    else qa.note(1, `"${toasts.join(' / ') || 'no toast'}"`);
  });

  await qa.step(2, async () => {
    const c = await sc.cells(await sc.row(sc1.code));
    qa.note(2, `SC-1 reads: ${c.slice(0, 5).join(' | ')}`);
    const dc = await d.cells(await d.row(dep1.code));
    if (dc.join(' ').includes(BR_B) && c[2] === BR_A) qa.deviation(2, 'SC-1 still fits its department', `SC-1 shows Site ${BR_A} under DEP-1, which is now in ${BR_B}`);
  });

  await qa.step(3, async () => {
    await sc.edit(sc1.code);
    const box = sc.dialog.getByRole('combobox', { name: 'Department' });
    const before = await chosen(box);
    await chooseSite(sc.dialog.getByRole('combobox', { name: 'Site' }), BR_B);
    const after = await chosen(box);
    qa.note(3, `"Department" before the change "${before}", after "${after || '(empty)'}": ${after && after === before ? 'kept' : 'to be chosen again'}`);
    await sc.dialog.getByRole('button', { name: 'Cancel' }).click();
  });
});

qaTest('TC-APP018-026', async ({ page, qa, browser }) => {
  // A department and a service center of BR-B (made by U6).
  const { depB, scB } = await asUser(browser, 'U6', async (u6) => {
    const d = await dept(u6, qa, 'QA-DEP-B01');
    return { depB: d, scB: await center(u6, qa, d) };
  });

  await qa.step(1, async () => {
    expect(await listed(departments(page), depB.code)).toBe(0);
    expect(await listed(serviceCenters(page), scB.code)).toBe(0);
  });

  await qa.step(2, async () => {
    const d = departments(page);
    await d.openAdd();
    const site = d.dialog.getByRole('combobox', { name: 'Site' });
    expect(await chosen(site)).toContain(BR_A);
    await expect(site).toBeDisabled();
    await d.dialog.getByRole('button', { name: 'Cancel' }).click();
  });

  await qa.step(3, async () => {
    const s = sites(page);
    await s.open();
    const all = (await everyPage(s.main, () => s.rows().allInnerTexts())).join(' ');
    expect(all).toContain(BR_B);
    expect(all).toContain(BR_A);
  });

  await qa.step(4, () => headerOneBranch(page, qa, 4));
});
