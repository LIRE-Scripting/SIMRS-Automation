import type { Browser, Locator, Page } from '@playwright/test';
import { expect, qaTest, test } from '../../../fixtures/e2e';
import { ensureMasterData, registerPatient, SHARED } from '../../../lib/ambulatory-data';
import { installToastRecorder, toastMark, toastsSince } from '../../../lib/assertions';
import { authFileOf } from '../../../lib/config';
import { todayWib } from '../../../lib/dates';
import { AppointmentsPage } from '../../../pages/ambulatory/AppointmentsPage';
import { ArrivalPage } from '../../../pages/ambulatory/ArrivalPage';
import { RegisteredPatientsPage } from '../../../pages/ambulatory/RegisteredPatientsPage';

/**
 * 01-ambulatory-care.xlsx, the journeys on two branches: BR-A = Podomoro
 * (U1), BR-B = Kemayoran (U6 "qa.kemayoran", admin of Kemayoran only), and
 * U2 working on "All branches" (00-test-data.xlsx | Overview, row 7).
 * PT-B is "QA-AMB Pasien Cabang" registered in BR-B, but no patient can be
 * registered on Kemayoran (found blocker 41): a seed patient of Kemayoran
 * stands in for PT-B. Kemayoran has no appointment types in its Book
 * settings, so no appointment can be made there (TC-APP001-063 notes it).
 */

const BR_A = SHARED.branch;
const BR_B = 'Kemayoran';
/** A department of Kemayoran (its departments are the seed list: Anak, Bedah, …). */
const BR_B_DEPARTMENT = 'Anak';

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage({ storageState: authFileOf('U1') });
  await ensureMasterData(page);
  await page.close();
});

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

/** A signed-in page of another workbook user, with the toast recorder. */
async function pageOf(browser: Browser, user: string): Promise<Page> {
  const page = await (await browser.newContext({ storageState: authFileOf(user) })).newPage();
  await installToastRecorder(page);
  return page;
}

/** Toasts shown after `mark`, waiting up to 8 s for the first one ([] when none came). */
async function toastsAfter(page: Page, mark: number): Promise<string[]> {
  try {
    await expect.poll(async () => (await toastsSince(page, mark)).length, { timeout: 8_000 }).toBeGreaterThan(0);
  } catch {
    // no toast
  }
  return toastsSince(page, mark);
}

/** PT-B: a seed patient of Kemayoran (the first row of its list), as no patient can be registered there (blocker 41). */
async function seedPatientOf(page: Page): Promise<{ mrn: string; fullName: string }> {
  const reg = new RegisteredPatientsPage(page);
  await reg.open();
  const row = reg.rows().first();
  return {
    mrn: (await (await reg.cell(row, 'MRN')).innerText()).trim(),
    fullName: (await (await reg.cell(row, 'Full name')).innerText()).trim(),
  };
}

/**
 * The options a type-ahead field offers for a text, once its list has
 * settled. The list of a branch loads a moment after the branch is chosen
 * and is not asked again for the same text, so the text is typed again
 * (after emptying the field) until an option shows, three times at most.
 */
async function offered(field: Locator, typed: string): Promise<string[]> {
  const list = field.page().locator(`#${await field.getAttribute('aria-controls')}`);
  const matching = list.getByRole('option').filter({ hasText: typed });
  for (let i = 0; i < 3; i++) {
    await field.fill('');
    await field.fill(typed);
    await field.page().waitForLoadState('networkidle').catch(() => {});
    await matching.first().waitFor({ timeout: 2_000 }).catch(() => {});
    if (await matching.count()) break;
  }
  return (await matching.allInnerTexts()).map((t) => t.trim());
}

/** The patient suggestions ("MRN · name") a patient field offers for a text. */
async function patientSuggestions(scope: Locator, field: Locator, typed: string): Promise<string[]> {
  await field.fill(typed);
  await field.page().waitForLoadState('networkidle').catch(() => {});
  const items = scope.getByRole('listitem').getByRole('button', { name: new RegExp(typed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) });
  await expect(items.first()).toBeVisible({ timeout: 3_000 }).catch(() => {});
  return items.allInnerTexts();
}

/** The first field of a dialog. */
function firstField(d: Locator): Locator {
  return d.locator('input:not([type=hidden]):not([type=radio]), select, textarea').first();
}

qaTest('TC-APP001-024', async ({ page, qa, browser }) => {
  const reg = new RegisteredPatientsPage(page);
  const t = qa.token();
  // Preconditions: PT-1 in BR-A (made by U1), PT-B in BR-B (made by U6); U2 works on "All branches".
  const u1 = await pageOf(browser, 'U1');
  const u6 = await pageOf(browser, 'U6');
  const pt1 = await registerPatient(u1, SHARED.pt1.name, t);
  const ptB = await seedPatientOf(u6);
  let registered = false;
  const last = `Pusat ${t}`;
  const fullName = `QA-AMB Pasien ${last}`;
  const appts = new AppointmentsPage(page);
  const arrival = new ArrivalPage(page);

  try {
    await qa.step(1, async () => {
      await reg.open();
      for (const p of [pt1, ptB]) {
        await reg.search(p.mrn);
        await expect(reg.row(p.mrn)).toHaveCount(1);
      }
      qa.note(1, `PT-B is the seed patient ${ptB.mrn} "${ptB.fullName}" of ${BR_B} (no patient can be registered there, found blocker 41)`);
      const headers = await reg.table.getByRole('columnheader').allInnerTexts();
      if (!headers.some((h) => /branch/i.test(h))) qa.note(1, `the list has no Branch column (columns: ${headers.map((h) => h.trim()).join(', ')})`);
    });

    await qa.step(2, async () => {
      await reg.open();
      const d = await reg.openRegister();
      const branch = d.getByRole('combobox', { name: 'Branch' });
      await expect(branch).toBeVisible();
      const required = await branch.evaluate((e) => (e as HTMLSelectElement).required);
      if (!required) {
        // Not required in the page: try a registration without a branch and read the answer.
        await reg.fillRegister({ firstName: 'QA-AMB Pasien', lastName: `Tanpa Cabang ${t}` }, d);
        const mark = await toastMark(page);
        await reg.registerButton(d).click();
        const toasts = await toastsAfter(page, mark);
        expect(toasts, 'a registration without a branch').not.toContain('Patient registered');
        qa.note(2, `"Branch" is not marked required; Register without it: "${toasts.join(' / ') || 'no toast'}"`);
      }
      await page.keyboard.press('Escape');
    });

    await qa.step(3, async () => {
      await reg.open();
      const d = await reg.openRegister();
      await d.getByRole('combobox', { name: 'Branch' }).selectOption({ label: BR_B });
      await reg.fillRegister({ firstName: 'QA-AMB Pasien', lastName: last }, d);
      const mark = await toastMark(page);
      await reg.registerButton(d).click();
      const toasts = await toastsAfter(page, mark);
      registered = toasts.includes('Patient registered');
      if (!registered) {
        expect(toasts).toContain('Registration failed');
        qa.blocked(3, 41);
        await page.keyboard.press('Escape');
      } else {
        await expect(d).toBeHidden();
      }
    });

    await qa.step(4, async () => {
      await appts.open();
      const d = await appts.openBook();
      await expect(firstField(d)).toHaveAccessibleName('Branch');
      const before = await offered(appts.field(d, 'Department'), SHARED.dep1.name);
      await d.getByRole('radiogroup').getByText('Unit', { exact: true }).click();
      const unitsBefore = await offered(appts.field(d, 'Consultant or unit'), SHARED.unit1.name);
      if (before.length || unitsBefore.length) {
        qa.deviation(4, 'The Department and Unit lists offer nothing until a branch is chosen', `before a branch is chosen they offer: ${[...before, ...unitsBefore].join(' | ')}`);
      }
      await d.getByRole('combobox', { name: 'Branch' }).selectOption({ label: BR_A });
      expect(await offered(appts.field(d, 'Department'), SHARED.dep1.name)).not.toEqual([]);
      await page.keyboard.press('Escape');
    });

    await qa.step(5, async () => {
      await arrival.open();
      const d = await arrival.openArrive();
      await expect(firstField(d)).toHaveAccessibleName('Branch');
      const branch = d.getByRole('combobox', { name: 'Branch' });
      await branch.selectOption({ label: BR_A });
      const inA = await offered(arrival.departmentField(d), SHARED.dep1.name);
      await branch.selectOption({ label: BR_B });
      // The list of the new branch loads a moment later: read until the list of BR-A is gone (10 s at most).
      let inB: string[] = [];
      await expect.poll(async () => (inB = await offered(arrival.departmentField(d), SHARED.dep1.name)), { timeout: 10_000 }).toEqual([]).catch(() => {});
      expect(inA, `${SHARED.dep1.name} with ${BR_A}`).not.toEqual([]);
      if (inB.length) qa.deviation(5, 'The departments follow the chosen branch', `after changing from ${BR_A} to ${BR_B}, ${BR_A}'s ${SHARED.dep1.name} is still offered 10 s later`);
      await page.keyboard.press('Escape');
    });

    if (!registered) qa.blocked(6, 41);
    else await qa.step(6, async () => {
      for (const [who, p, found] of [['U6 (BR-B)', u6, 1], ['U1 (BR-A)', u1, 0]] as const) {
        const r = new RegisteredPatientsPage(p);
        await r.open();
        await r.search(last);
        await expect(r.row(fullName), `${who} searching "${last}"`).toHaveCount(found);
      }
    });
  } finally {
    await u1.context().close();
    await u6.context().close();
  }
});

/** The duplicate fields of a branch's Form settings as they are now. */
async function duplicateFields(reg: RegisteredPatientsPage): Promise<Record<'First name' | 'Last name' | 'Date of birth', boolean>> {
  const d = await reg.openFormSettings();
  const group = d.getByRole('group', { name: 'Duplicate fields' });
  const out = {} as Record<'First name' | 'Last name' | 'Date of birth', boolean>;
  for (const f of ['First name', 'Last name', 'Date of birth'] as const) out[f] = await group.getByRole('checkbox', { name: f, exact: true }).isChecked();
  await d.getByRole('button', { name: 'Cancel' }).click();
  return out;
}

qaTest('TC-APP001-043', async ({ page, qa, browser }) => {
  const t = qa.token();
  // PT-1 in BR-A (U1); the clerk works on BR-B (U6), whose form settings have the three duplicate fields ticked.
  const pt1 = await registerPatient(page, SHARED.pt1.name, t, SHARED.pt1.dateOfBirth);
  const words = SHARED.pt1.name.split(' ');
  const firstName = words.slice(0, -1).join(' ');
  const lastName = `${words.at(-1)} ${t}`;
  const u6 = await pageOf(browser, 'U6');
  const reg = new RegisteredPatientsPage(u6);
  await reg.open();
  const was = await duplicateFields(reg);
  await reg.setFormSettings({ duplicates: { 'First name': true, 'Last name': true, 'Date of birth': true } });

  try {
    await qa.step(1, async () => {
      const hits: string[] = [];
      for (const term of [pt1.mrn, lastName]) {
        await reg.open();
        await reg.search(term);
        if (await reg.row(pt1.mrn).count()) hits.push(term);
      }
      if (hits.length < 2) qa.deviation(1, 'PT-1 is found', `searching PT-1's MRN and name on ${BR_B} finds ${hits.length ? `only by ${hits.join(', ')}` : 'nothing'}`);
    });

    await qa.step(2, async () => {
      const appts = new AppointmentsPage(u6);
      await appts.open();
      const book = await appts.openBook();
      const inBook = await patientSuggestions(book, appts.field(book, 'Patient'), lastName);
      await u6.keyboard.press('Escape');
      const arrival = new ArrivalPage(u6);
      await arrival.open();
      const arrive = await arrival.openArrive();
      const inArrive = await patientSuggestions(arrive, arrival.patientField(arrive), lastName);
      await u6.keyboard.press('Escape');
      const missing = [...(inBook.some((s) => s.includes(pt1.mrn)) ? [] : ['Book']), ...(inArrive.some((s) => s.includes(pt1.mrn)) ? [] : ['Arrive'])];
      if (missing.length) qa.deviation(2, 'PT-1 is offered', `PT-1 is not offered in ${missing.join(' and ')} on ${BR_B}`);
    });

    await qa.step(3, async () => {
      await reg.open();
      const d = await reg.openRegister();
      await reg.fillRegister({ firstName, lastName, dateOfBirth: SHARED.pt1.dateOfBirth }, d);
      const mark = await toastMark(u6);
      await reg.registerButton(d).click();
      const toasts = await toastsAfter(u6, mark);
      expect(toasts, 'PT-1 registered a second time on BR-B').not.toContain('Patient registered');
      // "Registration failed" is the HTTP 500 every registration on Kemayoran gets (blocker 41), not the duplicate check.
      if (toasts.includes('Registration failed')) qa.blocked(3, 41);
      else qa.deviation(3, 'The clerk is shown the existing record', `refused with "${toasts.join(' / ') || 'no toast'}"; the existing record is not shown`);
      await u6.keyboard.press('Escape');
    });
  } finally {
    await reg.open();
    await reg.setFormSettings({ duplicates: was });
    await u6.context().close();
  }
});

qaTest('TC-APP001-063', async ({ page, qa, browser }) => {
  // PT-B in BR-B with an arrival there today (made by U6; a seed patient, blocker 41). U1 is the BR-A clerk.
  const u6 = await pageOf(browser, 'U6');
  let ptB: { mrn: string; fullName: string };
  let arrived = '';
  try {
    ptB = await seedPatientOf(u6);
    const arrivalB = new ArrivalPage(u6);
    await arrivalB.open();
    if (!(await arrivalB.row(ptB.fullName).count())) await arrivalB.arrive(ptB.fullName, BR_B_DEPARTMENT);
    arrived = `${ptB.mrn} "${ptB.fullName}" (seed patient of ${BR_B}) arrived in ${BR_B_DEPARTMENT} today`;
  } finally {
    await u6.context().close();
  }
  qa.note(1, `PT-B: ${arrived}`);
  const reg = new RegisteredPatientsPage(page);

  await qa.step(1, async () => {
    await reg.open();
    await reg.search(ptB.mrn);
    await expect(reg.row(ptB.mrn)).toHaveCount(0);
  });

  await qa.step(2, async () => {
    const appts = new AppointmentsPage(page);
    await appts.open();
    await appts.showRange(todayWib());
    expect((await appts.allRowTexts()).map((r) => r.MRN)).not.toContain(ptB.mrn);
    qa.note(2, `PT-B has no appointment: ${BR_B} has no appointment types in its Book settings, so none can be booked there`);
    const arrival = new ArrivalPage(page);
    await arrival.open();
    await expect(arrival.row(ptB.mrn)).toHaveCount(0);
  });

  await qa.step(3, async () => {
    await reg.open();
    await reg.mergeButton.click();
    const d = reg.mergeDialog();
    for (const f of ['Survivor', 'Duplicate']) {
      // By MRN: the seed names of Kemayoran repeat on Podomoro with other MRNs.
      const offeredB = (await patientSuggestions(d, d.getByRole('textbox', { name: f }), ptB.fullName)).filter((x) => x.includes(ptB.mrn));
      expect(offeredB, f).toEqual([]);
    }
    await page.keyboard.press('Escape');
  });

  await qa.step(4, async () => {
    const banner = page.getByRole('banner');
    await expect(banner.getByRole('button', { name: 'Branch' })).toHaveCount(0);
    await expect(banner.getByText('All branches')).toHaveCount(0);
    qa.note(4, `the header of U1 has no branch selector: U1 works on ${BR_A} only`);
  });
});
