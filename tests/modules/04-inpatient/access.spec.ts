import type { Page } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder, toastLocator } from '../../../lib/assertions';
import { AdmissionsPage, BedsPage, DischargesPage } from '../../../pages/inpatient/InpatientPages';
import { appsCardRefused, asUser, BR_B, headerOneBranch, routesRefused, toastsOf, tryRefused, userPage } from '../shared/access';

/**
 * 04-inpatient.xlsx, the access test cases of Admissions, Bed management and
 * Ward supply: U2 on "All branches", U3 without any right, and U1 next to a
 * branch of U6 (Kemayoran). Beds and stays cannot be deleted, so each test
 * adds its own ("QA-101-<token>", "QA-INP Pasien … <token>").
 */

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

const DESCRIPTION = 'QA Kelas 1';

async function newBed(page: Page, qa: Qa, excelNo: string): Promise<string> {
  const beds = new BedsPage(page);
  const no = qa.code(excelNo);
  await beds.open();
  await beds.add({ no, description: DESCRIPTION });
  return no;
}

/** Searches the stays for a name; the number of rows found. */
async function staysOf(page: Page, name: string): Promise<number> {
  const adm = new AdmissionsPage(page);
  await adm.open();
  await adm.search(name);
  await page.waitForLoadState('networkidle').catch(() => {});
  return adm.row(name).count();
}

qaTest('TC-APP004-018', async ({ page, qa, browser }) => {
  // Precondition: a vacant bed of BR-B, added by U6.
  const bedB = await asUser(browser, 'U6', (u6) => newBed(u6, qa, 'QA-B01'));
  const name = qa.name('QA-INP Pasien Pusat');
  const adm = new AdmissionsPage(page);
  const w = adm.wizard;

  await qa.step(1, async () => {
    await adm.open();
    const headers = (await adm.table.getByRole('columnheader').allInnerTexts()).map((h) => h.trim());
    if (!headers.some((h) => /branch/i.test(h))) qa.note(1, `the list has no Branch column (columns: ${headers.join(', ')})`);
    const strip = await adm.stripCard(bedB).count();
    qa.note(1, `the "Vacant beds" strip ${strip ? 'shows' : 'does not show'} ${bedB} of ${BR_B} (the strip shows a part of the vacant beds)`);
    const beds = new BedsPage(page);
    await beds.open();
    await beds.search(bedB);
    await expect(beds.row(bedB)).toHaveCount(1);
  });

  await qa.step(2, async () => {
    await adm.open();
    await adm.admitButton.click();
    await expect(w).toBeVisible();
    const first = w.locator('select, input').first();
    await expect(first).toHaveAccessibleName('Branch');
    await expect(w.getByRole('combobox', { name: 'Branch' })).toHaveJSProperty('required', true);
    const next = w.getByRole('button', { name: 'Next' });
    await expect(next).toBeDisabled();
    await w.getByRole('textbox', { name: 'Patient name' }).fill(name);
    await expect(next).toBeDisabled();
    await w.getByRole('combobox', { name: 'Branch' }).selectOption({ label: BR_B });
    await expect(next).toBeEnabled();
  });

  // The Bed picker of U2 holds the first beds of every branch only (found blocker 40): a new bed of BR-B is not among them.
  await adm.next();
  const bedField = w.getByRole('combobox', { name: 'Bed' });
  await bedField.fill(bedB);
  await page.waitForLoadState('networkidle').catch(() => {});
  const offered = await page.locator(`#${await bedField.getAttribute('aria-controls')}`).getByRole('option').filter({ hasText: bedB }).count();
  if (!offered) {
    qa.blocked(3, 40);
    await w.getByRole('button', { name: 'Cancel' }).click();
  } else {
    await qa.step(3, async () => {
      await adm.pickBed(bedField, bedB);
      await adm.next();
      await w.getByRole('button', { name: /^(Admit|Saving…)$/ }).click();
      await expect(toastLocator(page, /^Patient admitted$/)).toBeVisible();
      await expect(w).toBeHidden();
    });
  }

  await qa.step(4, async () => {
    const beds = new BedsPage(page);
    await beds.open();
    await beds.main.getByRole('button', { name: 'Add bed' }).click();
    const branch = beds.dialog().getByRole('combobox', { name: 'Branch' });
    await expect(branch).toBeVisible();
    await expect(branch).toHaveJSProperty('required', true);
    await beds.dialog().getByRole('button', { name: 'Cancel' }).click();
  });

  await qa.step(5, async () => {
    await adm.open();
    await adm.main.getByRole('tab', { name: 'Ward supply' }).click();
    await expect(adm.main.getByRole('combobox', { name: 'Branch' })).toBeVisible();
  });

  if (!offered) return qa.blocked(6, 40);
  await qa.step(6, async () => {
    expect(await asUser(browser, 'U6', (u6) => staysOf(u6, name))).toBe(1);
    expect(await asUser(browser, 'U1', (u1) => staysOf(u1, name))).toBe(0);
  });
});

qaTest('TC-APP004-049', async ({ page, qa, browser }) => {
  // Preconditions (made by U1): a stay on a bed and a vacant bed.
  const bed1 = await newBed(page, qa, 'QA-101');
  const bed2 = await newBed(page, qa, 'QA-102');
  const name = qa.name('QA-INP Pasien Satu');
  const mine = new AdmissionsPage(page);
  await mine.open();
  await mine.admit(name, bed1);

  const staff = await userPage(browser, 'U3');
  const adm = new AdmissionsPage(staff);
  try {
    await qa.step(1, async () => {
      const other = qa.name('QA-INP Tanpa Hak');
      await adm.open();
      await adm.admitButton.click();
      await adm.wizard.getByRole('textbox', { name: 'Patient name' }).fill(other);
      await adm.next();
      await adm.next();
      await tryRefused(qa, 1, staff, 'Admit', /^Patient admitted$/, () => adm.wizard.getByRole('button', { name: /^(Admit|Saving…)$/ }).click());
      expect(await staysOf(page, other)).toBe(0);
    });

    await qa.step(2, async () => {
      await adm.open();
      let row = await adm.stay(name);
      await row.getByRole('button', { name: 'Transfer' }).click();
      const t = staff.getByRole('dialog', { name: 'Transfer bed' });
      await adm.pickBed(t.getByRole('combobox', { name: 'New bed' }), bed2);
      await tryRefused(qa, 2, staff, 'Transfer', /^Transferred$/, () => t.getByRole('button', { name: 'Transfer' }).click());
      await adm.open();
      row = await adm.stay(name);
      await row.getByRole('button', { name: 'Mark billing cleared' }).click();
      const m = staff.getByRole('dialog', { name: 'Mark billing cleared' });
      await tryRefused(qa, 2, staff, 'Mark cleared', /^Billing clearance recorded$/, () => m.getByRole('button', { name: 'Mark cleared' }).click());
      await adm.open();
      row = await adm.stay(name);
      await row.getByRole('button', { name: 'Discharge' }).click();
      const d = staff.getByRole('dialog', { name: 'Discharge' });
      await tryRefused(qa, 2, staff, 'Discharge', /^Discharge recorded/, () => d.getByRole('button', { name: 'Discharge', exact: true }).click());
      // The stay is unchanged for U1: still on bed1, billing not cleared.
      const check = new AdmissionsPage(page);
      await check.open();
      const after = await check.stay(name);
      await expect(await check.cell(after, 'Bed')).toHaveText(bed1);
      await expect(after.getByRole('button', { name: 'Mark billing cleared' })).toHaveCount(1);
    });

    await qa.step(3, async () => {
      const beds = new BedsPage(staff);
      await beds.open();
      await beds.main.getByRole('button', { name: 'Add bed' }).click();
      const other = qa.code('QA-109');
      await beds.fill(beds.dialog(), { no: other, description: DESCRIPTION });
      await tryRefused(qa, 3, staff, 'Add bed', /^Bed created$/, () => beds.dialog().getByRole('button', { name: /^(Save|Saving…)$/ }).click());
      await beds.open();
      const d = await beds.openEdit(bed2);
      await beds.fill(d, { description: 'QA Kelas 2' });
      await tryRefused(qa, 3, staff, 'Edit bed', /^Bed updated$/, () => d.getByRole('button', { name: /^(Save|Saving…)$/ }).click());
      const check = new BedsPage(page);
      await check.open();
      await check.search(other);
      await expect(check.row(other)).toHaveCount(0);
      await check.search(bed2);
      await expect(await check.cell(check.row(bed2), 'Description')).toHaveText(DESCRIPTION);
    });

    await qa.step(4, async () => {
      await adm.open();
      await adm.main.getByRole('tab', { name: 'Ward supply' }).click();
      const group = adm.main.getByRole('button', { name: 'Group for this store' });
      await expect(group).toBeVisible();
      qa.note(4, `"Group for this store" is shown to U3 (${(await group.isEnabled()) ? 'enabled' : 'disabled until a store and orders are chosen'})`);
      qa.notRun(4, '"Receive", "Refuse" and "Request return" need an open ward group and medicine issued to a stay (05 Pharmacy); no group is made for U3 to act on');
    });
    qa.note(1, 'every button is shown to U3; the refusal comes only after the click');
  } finally {
    await staff.context().close();
  }
});

qaTest('TC-APP004-050', async ({ qa, browser }) => {
  await asUser(browser, 'U3', async (staff) => {
    await qa.step(1, () => appsCardRefused(staff, qa, 1, /^Inpatient\b/));
    await qa.step(2, () => routesRefused(staff, qa, 2, ['/adt/admissions']));
    await qa.step(3, () => routesRefused(staff, qa, 3, ['/adt/beds', '/adt/discharges']));
  });
});

qaTest('TC-APP004-051', async ({ page, qa, browser }) => {
  // Preconditions (made by U6): BED-B and a stay on it in BR-B.
  const nameB = qa.name('QA-INP Pasien Cabang');
  const bedB = await asUser(browser, 'U6', async (u6) => {
    const no = await newBed(u6, qa, 'QA-B01');
    const adm = new AdmissionsPage(u6);
    await adm.open();
    await adm.admit(nameB, no);
    return no;
  });
  const adm = new AdmissionsPage(page);

  await qa.step(1, async () => {
    expect(await staysOf(page, nameB)).toBe(0);
    await adm.open();
    await expect(adm.stripCard(bedB)).toHaveCount(0);
  });

  await qa.step(2, async () => {
    const beds = new BedsPage(page);
    await beds.open();
    await beds.search(bedB);
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(beds.row(bedB)).toHaveCount(0);
  });

  await qa.step(3, async () => {
    const dis = new DischargesPage(page);
    await dis.open();
    await expect(dis.main).not.toContainText(nameB);
    await adm.open();
    await adm.main.getByRole('tab', { name: 'Ward supply' }).click();
    const stays = await adm.main.locator('#ward-stay').getAttribute('aria-controls');
    await adm.main.locator('#ward-stay').fill(nameB);
    await page.waitForLoadState('networkidle').catch(() => {});
    if (stays) await expect(page.locator(`#${stays}`).getByRole('option').filter({ hasText: nameB })).toHaveCount(0);
    await expect(adm.main).not.toContainText(nameB);
  });

  await qa.step(4, () => headerOneBranch(page, qa, 4));
});
