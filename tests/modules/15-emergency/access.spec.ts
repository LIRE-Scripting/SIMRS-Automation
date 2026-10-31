import type { Page } from '@playwright/test';
import { todayWib } from '../../../lib/dates';
import { expect, qaTest, test } from '../../../fixtures/e2e';
import { registerPatient } from '../../../lib/ambulatory-data';
import { installToastRecorder, toastLocator } from '../../../lib/assertions';
import { RegisteredPatientsPage } from '../../../pages/ambulatory/RegisteredPatientsPage';
import { appsCardRefused, asUser, BR_B, headerOneBranch, routesRefused, seedPatientOf, toastsOf, tryRefused, userPage } from '../shared/access';
import { bedWithId, patientIdOf } from '../shared/internal-ids';
import { encounter, Patients, patient, VisitsPage, WALKED_IN, walkInName } from './helpers';

/**
 * 15-emergency.xlsx, the access test cases of Visits and of the Emergency
 * screens: U2 on "All branches", U3 without any right, and U1 next to a
 * branch of U6 (Kemayoran). Visits name a patient and a bed by their
 * internal ids, read from the server answers (Q27).
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

const CREATED = 'Visit created';

/** PT-B: a seed patient of Kemayoran (no patient can be registered there, found blocker 41), with its internal id. */
async function patientB(page: Page): Promise<{ id: string; mrn: string; fullName: string }> {
  const p = await seedPatientOf(page);
  return { ...p, id: await patientIdOf(page, p.mrn) };
}

async function visits(page: Page, patientId: string): Promise<number> {
  return (await new VisitsPage(page).row(patientId)).count();
}

qaTest('TC-APP015-005', async ({ page, qa, browser }) => {
  const ptB = await asUser(browser, 'U6', patientB);
  const before = await asUser(browser, 'U6', (u6) => visits(u6, ptB.id));
  // U1 may already list visits of PT-B made at its own branch by other tests (TC-APP015-010): only a new one counts.
  const beforeU1 = await asUser(browser, 'U1', (u1) => visits(u1, ptB.id));
  const v = new VisitsPage(page);
  const d = page.getByRole('dialog', { name: 'Create visit' });
  const branch = d.getByRole('combobox', { name: 'Branch' });
  const create = d.getByRole('button', { name: /^(Create|Saving…)$/ });

  await qa.step(1, async () => {
    await v.open();
    const headers = (await v.table.getByRole('columnheader').allInnerTexts()).map((h) => h.trim());
    if (!headers.some((h) => /branch/i.test(h))) qa.note(1, `the list has no Branch column (columns: ${headers.join(', ')})`);
  });

  await qa.step(2, async () => {
    await v.main.getByRole('button', { name: 'Create visit' }).click();
    await expect(branch).toBeVisible();
  });

  await qa.step(3, async () => {
    await d.getByRole('textbox', { name: 'Patient ID (UUID)' }).fill(ptB.id);
    const toasts = await toastsOf(page, () => create.click());
    expect(toasts).not.toContain(CREATED);
    const message = toasts.join(' / ') || (await branch.evaluate((e: HTMLSelectElement) => e.validationMessage));
    expect(message).not.toBe('');
    qa.note(3, `without a branch: "${message}"`);
  });

  await qa.step(4, async () => {
    await branch.selectOption({ label: BR_B });
    expect(await toastsOf(page, () => create.click())).toContain(CREATED);
  });

  await qa.step(5, async () => {
    const after = await asUser(browser, 'U6', (u6) => visits(u6, ptB.id));
    expect(after).toBeGreaterThan(before);
    expect(await asUser(browser, 'U1', (u1) => visits(u1, ptB.id))).toBe(beforeU1);
    qa.note(5, `PT-B (${ptB.fullName}, a seed patient of ${BR_B}) is listed for U6 and not for U1`);
  });
});

qaTest('TC-APP015-010', async ({ page, qa, browser }) => {
  const v = new VisitsPage(page);
  const d = page.getByRole('dialog', { name: 'Create visit' });
  const field = d.getByRole('textbox', { name: 'Patient ID (UUID)' });
  const create = d.getByRole('button', { name: /^(Create|Saving…)$/ });
  const ptB = await asUser(browser, 'U6', patientB);
  // The merged patient: PT-3 merged into PT-2 in Ambulatory Care (made by U1); its id is read before the merge.
  const t = qa.token();
  const pt2 = await registerPatient(page, 'QA-EMG Pasien Ganda', `A ${t}`);
  const pt3 = await registerPatient(page, 'QA-EMG Pasien Ganda', `B ${t}`);
  const mergedId = await patientIdOf(page, pt3.mrn);
  const reg = new RegisteredPatientsPage(page);
  await reg.open();
  await reg.mergeButton.click();
  const m = reg.mergeDialog();
  await reg.pickFrom(m.getByRole('textbox', { name: 'Survivor' }), `Ganda A ${t}`, pt2.mrn, m);
  await reg.pickFrom(m.getByRole('textbox', { name: 'Duplicate' }), `Ganda B ${t}`, pt3.mrn, m);
  await m.getByRole('button', { name: 'Merge' }).click();
  await expect(toastLocator(page, /^Patients merged$/)).toBeVisible();

  const attempt = async (id: string) => {
    await v.open();
    await v.main.getByRole('button', { name: 'Create visit' }).click();
    await field.fill(id);
    return toastsOf(page, () => create.click());
  };

  await qa.step(1, async () => {
    await v.open();
    await v.main.getByRole('button', { name: 'Create visit' }).click();
    const toasts = await toastsOf(page, () => create.click());
    expect(toasts).not.toContain(CREATED);
    expect(await field.evaluate((e: HTMLInputElement) => e.validationMessage)).not.toBe('');
  });

  await qa.step(2, async () => {
    const toasts = await attempt('QA-EMG Pasien Satu');
    expect(toasts).not.toContain(CREATED);
    if (!toasts.some((x) => /uuid|id .*expected|valid id|format/i.test(x))) qa.deviation(2, 'Refused with a clear message that an ID is expected', `toast "${toasts.join(' / ') || 'none'}"`);
  });

  await qa.step(3, async () => {
    const toasts = await attempt('00000000-0000-4000-8000-000000000000');
    expect(toasts).not.toContain(CREATED);
    if (!toasts.some((x) => /patient not found/i.test(x))) qa.deviation(3, 'Refused: "patient not found"', `toast "${toasts.join(' / ') || 'none'}"`);
  });

  await qa.step(4, async () => {
    const toasts = await attempt(ptB.id);
    if (toasts.includes(CREATED)) qa.deviation(4, 'Refused, or a warning that the patient belongs to another branch', `"${CREATED}" for PT-B (${ptB.fullName}, ${BR_B}) while working on BR-A`);
    else qa.note(4, `PT-B: "${toasts.join(' / ')}"`);
  });

  await qa.step(5, async () => {
    const toasts = await attempt(mergedId);
    if (toasts.includes(CREATED)) qa.deviation(5, 'Refused: the record was merged', `"${CREATED}" for the merged patient ${pt3.mrn}`);
    else qa.note(5, `merged patient: "${toasts.join(' / ')}"`);
  });
});

qaTest('TC-APP015-018', async ({ page, qa, browser }) => {
  // Preconditions (made by U1): PT-2 with its id, a visit that waits for triage, and BED-2 with its id.
  const pt2 = await patient(page, qa, 'QA-EMG Pasien Dua');
  const waiting = await patient(page, qa);
  const v = new VisitsPage(page);
  expect(await v.create(waiting.id)).toContain(CREATED);
  const bed2 = await bedWithId(page, qa.code('QA-IGD2'));
  const statusOf = async () => (await v.cells(await v.row(waiting.id)))[5];
  const before = await statusOf();

  const staff = await userPage(browser, 'U3');
  const sv = new VisitsPage(staff);
  try {
    await qa.step(1, async () => {
      await sv.open();
      await sv.main.getByRole('button', { name: 'Create visit' }).click();
      const d = staff.getByRole('dialog', { name: 'Create visit' });
      await d.getByRole('textbox', { name: 'Patient ID (UUID)' }).fill(pt2.id);
      await tryRefused(qa, 1, staff, 'Create', new RegExp(`^${CREATED}$`), () => d.getByRole('button', { name: /^(Create|Saving…)$/ }).click());
      expect(await visits(page, pt2.id)).toBe(0);
    });

    await qa.step(2, async () => {
      const row = await sv.row(waiting.id);
      await tryRefused(qa, 2, staff, 'Triage', /^Triage recorded$/, () => row.getByRole('button', { name: 'Triage', exact: true }).press('Enter'));
      expect(await statusOf()).toBe(before);
    });

    await qa.step(3, async () => {
      const row = await sv.row(waiting.id);
      await row.getByRole('button', { name: 'Assign bay', exact: true }).press('Enter');
      const d = staff.getByRole('dialog', { name: 'Assign bay' });
      await d.getByRole('textbox', { name: 'Bed ID (UUID)' }).fill(bed2.id);
      await tryRefused(qa, 3, staff, 'Assign bay', /^Bay assigned$/i, () => d.getByRole('button', { name: 'Assign bay' }).click());
      expect((await v.cells(await v.row(waiting.id)))[2]).toBe('—');
    });
    qa.note(1, 'every button is shown to U3; the refusal comes only after the click');
  } finally {
    await staff.context().close();
  }
});

qaTest('TC-APP015-019', async ({ qa, browser }) => {
  await asUser(browser, 'U3', async (staff) => {
    await qa.step(1, () => appsCardRefused(staff, qa, 1, /^Emergency\b/));
    await qa.step(2, () => routesRefused(staff, qa, 2, ['/emergency/visits']));
  });
});

qaTest('TC-APP015-020', async ({ page, qa, browser }) => {
  // Preconditions (made by U6): a visit of BR-B that waits for triage, and BED-B with its id.
  const { ptB, bedB } = await asUser(browser, 'U6', async (u6) => {
    const p = await patientB(u6);
    expect(await new VisitsPage(u6).create(p.id)).toContain(CREATED);
    return { ptB: p, bedB: await bedWithId(u6, qa.code('QA-IGDB')) };
  });

  await qa.step(1, async () => {
    const shown = await visits(page, ptB.id);
    if (shown) qa.deviation(1, 'No visit of BR-B', `U1 (Podomoro) sees ${shown} visit(s) of the Kemayoran patient ${ptB.id}`);
  });

  await qa.step(2, async () => {
    const mine = await patient(page, qa);
    const v = new VisitsPage(page);
    expect(await v.create(mine.id)).toContain(CREATED);
    const toasts = await v.assignBay(mine.id, bedB.id);
    expect(toasts.filter((t) => /assigned/i.test(t))).toEqual([]);
    if (!toasts.some((t) => /bed not found/i.test(t))) qa.deviation(2, 'Refused: "bed not found"', `toast "${toasts.join(' / ') || 'none'}"`);
  });

  await qa.step(3, () => headerOneBranch(page, qa, 3));
});

qaTest('TC-APP015-059', async ({ page, qa, browser }) => {
  // Precondition (made by U1): an open encounter of a walk-in patient.
  const p1 = new Patients(page);
  const name = await encounter(p1, qa);

  const staff = await userPage(browser, 'U3');
  const p = new Patients(staff);
  try {
    await qa.step(1, async () => {
      const shown: string[] = [];
      for (const [route, heading] of [['/emergency/patients', 'Emergency Patients'], ['/emergency/layout', 'Emergency Layout'], ['/emergency/triage-categories', 'Triage Category']] as const) {
        await staff.goto(`/id${route}`);
        await staff.waitForLoadState('networkidle').catch(() => {});
        if (await staff.getByRole('main').getByRole('heading', { level: 1, name: heading }).isVisible()) shown.push(heading);
      }
      qa.note(1, `U3 opens ${shown.join(', ') || 'none of the screens'} (TBD in the workbook: whether reading needs a right)`);
    });

    await qa.step(2, async () => {
      const other = walkInName(qa);
      await p.open();
      await p.main.getByRole('button', { name: 'Walk-in ER', exact: true }).click();
      const d = p.dialog;
      await d.getByRole('textbox', { name: 'Name' }).fill(other);
      await d.getByRole('spinbutton', { name: 'Estimated age (years)' }).fill('25');
      await d.getByRole('combobox').selectOption({ label: 'IGD' });
      await d.getByRole('combobox').locator('xpath=following::input[1]').fill('QA-IGD 1');
      const toasts = await tryRefused(qa, 2, staff, 'Receive', new RegExp(`^${WALKED_IN}$`), () => d.getByRole('button', { name: 'Receive' }).click());
      if (!toasts.includes('Could not save.')) qa.deviation(2, 'Toast "Could not save."', toasts.length ? `toast "${toasts.join(' / ')}"` : 'no toast');
    });

    await qa.step(3, async () => {
      const d = await p.openRow(name, 'Outcome');
      const dead = d.getByRole('button', { name: 'Mark dead' });
      await expect(dead).toBeVisible();
      const section = dead.locator('xpath=ancestor::*[.//input][1]');
      for (const input of await section.getByRole('textbox').all()) {
        if (await input.inputValue()) continue;
        // "Died at" is a date and time; the other empty fields take a text of the test.
        const type = await input.getAttribute('type');
        await input.fill(type === 'datetime-local' ? `${todayWib()}T08:00` : qa.prefix('X Uji tanpa hak'));
      }
      await tryRefused(qa, 3, staff, 'Mark dead', /^Saved\.$/, () => dead.click());
      const row = await p1.row(name);
      await expect(row.getByRole('button', { name: 'Triage', exact: true })).toBeVisible();
    });

    await qa.step(4, async () => {
      await staff.goto('/id/emergency/triage-categories');
      await staff.getByRole('main').getByRole('button', { name: 'New', exact: true }).click();
      const d = staff.getByRole('dialog');
      await d.getByRole('textbox', { name: 'Description' }).fill(qa.name('X Tanpa Hak'));
      await d.getByRole('textbox', { name: 'Colour' }).fill('#0a0b0c');
      await d.getByRole('spinbutton', { name: 'Time (minutes)' }).fill('5');
      const toasts = await tryRefused(qa, 4, staff, 'Save', /^Triage category saved\.$/, () => d.getByRole('button', { name: 'Save' }).click());
      if (!toasts.includes('Could not save the triage category.')) qa.deviation(4, 'Toast "Could not save the triage category."', toasts.length ? `toast "${toasts.join(' / ')}"` : 'no toast');
    });

    await qa.step(5, async () => {
      await p.open();
      const download = staff.waitForEvent('download', { timeout: 10_000 }).catch(() => null);
      await p.main.getByRole('button', { name: 'Excel', exact: true }).click();
      const file = await download;
      qa.note(5, file ? `"Excel" gives U3 the file ${file.suggestedFilename()} (TBD in the workbook: whether exporting names needs a right)` : '"Excel" gives no file');
    });
  } finally {
    await staff.context().close();
  }
});
