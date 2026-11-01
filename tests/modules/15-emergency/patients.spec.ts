import type { Locator } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { addDays, todayWib } from '../../../lib/dates';
import { registerPatient } from '../../../lib/ambulatory-data';
import { attach, encounter, Patients, pdf, WALKED_IN, walkInName } from './helpers';
import { asOnSite } from '../../../lib/i18n';

/**
 * 15-emergency.xlsx, Emergency Patients (/emergency/patients). A "received,
 * open encounter of a test patient" is made with "Walk-in ER" (name with a
 * token). The service centre IGD has no beds and the branch has no
 * consultants, so bed and consultant steps cite checklist blocker 13 (set-up
 * missing on the branch); no emergency registration can be made either
 * (blocker 13 on Accident/Emergency Registration), so receiving a registration
 * is blocked too.
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

/** The active triage category "Kuning IGD" of the seed data, or the first active one offered. */
async function anyCategory(d: Locator): Promise<string> {
  const options = (await d.getByRole('combobox', { name: 'Triage category' }).locator('option').allInnerTexts()).filter((o) => o !== 'Triage category');
  return options[0];
}

qaTest('TC-APP015-031', async ({ page, qa }) => {
  const p = new Patients(page);
  await qa.step(1, async () => {
    await page.goto('/id/emergency');
    await page.getByRole('main').getByRole('link', { name: 'Emergency Patients' }).click();
    await expect(p.main.getByText('Receive a registration, or register and receive a walk-in in one step.', { exact: true })).toBeVisible();
    await expect(p.main.getByRole('tab')).toHaveText(['Emergency Patients', 'Emergency OP Patients', 'Emergency IP Patients']);
    for (const b of ['Excel', 'Walk-in ER', 'Registration']) await expect(p.main.getByRole('button', { name: b, exact: true })).toBeVisible();
  });
  await qa.step(2, async () => {
    await p.main.getByRole('button', { name: 'Registration', exact: true }).click();
    await expect(p.dialog.getByRole('textbox', { name: 'Name or MRN' })).toBeVisible();
    await expect(p.dialog.getByRole('button', { name: 'Search' })).toBeVisible();
    for (const f of ['Triage category']) await expect(p.dialog.getByRole('combobox', { name: f })).toBeVisible();
    for (const f of ['MLC type', 'MLC no', 'FIR no', 'Police station', 'Plan', 'Remarks']) await expect(p.dialog.getByRole('textbox', { name: f })).toBeVisible();
    for (const f of ['Discount %', 'Discount amount']) await expect(p.dialog.getByRole('spinbutton', { name: f })).toBeVisible();
    if (!(await p.dialog.getByRole('combobox', { name: 'Branch' }).count())) qa.note(2, 'no "Branch" list: U1 works on one branch');
  });
  for (const s of [3, 4, 5, 6]) qa.blocked(s, 13);
});

qaTest('TC-APP015-032', async ({ page, qa }) => {
  const p = new Patients(page);
  const outpatient = await registerPatient(page, 'QA-EMG Pasien Satu', qa.token());
  const received = await encounter(p, qa);
  const receive = async (search: string): Promise<string[]> => {
    await p.open();
    await p.main.getByRole('button', { name: 'Registration', exact: true }).click();
    await p.dialog.getByRole('textbox', { name: 'Name or MRN' }).fill(search);
    await p.dialog.getByRole('button', { name: 'Search' }).click();
    const hit = p.dialog.getByRole('listbox').getByRole('button').or(p.dialog.getByRole('list').getByRole('button')).first();
    if (!(await hit.isVisible({ timeout: 5_000 }).catch(() => false))) return ['(no patient offered)'];
    await hit.click();
    await p.dialog.locator('select').first().selectOption({ label: 'IGD' }).catch(() => {});
    return p.click(p.dialog.getByRole('button', { name: 'Receive' }));
  };
  await qa.step(1, async () => {
    const toasts = await receive(outpatient.mrn);
    qa.note(1, `result: "${toasts.join(' / ')}"`);
    expect(toasts.join(' ')).not.toMatch(/Patient received/);
    if (!toasts.includes('That registration is not valid for emergency.')) qa.deviation(1, 'Toast "That registration is not valid for emergency."', `"${toasts.join(' / ')}"`);
  });
  await qa.step(2, async () => {
    const toasts = await receive(received);
    qa.note(2, `result: "${toasts.join(' / ')}"`);
    expect(toasts.join(' ')).not.toMatch(/Patient received/);
    if (!toasts.includes('This visit is already received.')) qa.deviation(2, 'Toast "This visit is already received."', `"${toasts.join(' / ')}"`);
  });
  qa.blocked(3, 13);
  qa.blocked(4, 13);
  await qa.step(5, async () => {
    await p.open();
    await p.main.getByRole('button', { name: 'Registration', exact: true }).click();
    await expect(p.dialog.getByRole('button', { name: 'Receive' })).toBeDisabled();
  });
});

qaTest('TC-APP015-033', async ({ page, qa }) => {
  const p = new Patients(page);
  const name = await encounter(p, qa);
  const d = await p.openRow(name, 'Outcome');
  await d.getByRole('textbox', { name: 'Reason' }).last().fill(qa.prefix('X Pulang atas permintaan sendiri'));
  expect(await p.click(d.getByRole('button', { name: 'Close visit' }))).toContain('Saved.');
  qa.note(1, `the closed encounter is a walk-in of this test closed today (stands in for "discharged last week")`);
  await qa.step(1, async () => {
    await p.open();
    await p.main.getByRole('button', { name: 'Registration', exact: true }).click();
    await p.dialog.getByRole('textbox', { name: 'Name or MRN' }).fill(name);
    await p.dialog.getByRole('button', { name: 'Search' }).click();
    const hit = p.dialog.getByRole('listbox').getByRole('button').or(p.dialog.getByRole('list').getByRole('button')).first();
    if (!(await hit.isVisible({ timeout: 5_000 }).catch(() => false))) {
      qa.note(1, 'the patient of the closed encounter is not offered in "Receive"');
      return;
    }
    await hit.click();
    const toasts = await p.click(p.dialog.getByRole('button', { name: 'Receive' }));
    qa.note(1, `result: "${toasts.join(' / ')}"`);
    expect(toasts.join(' ')).not.toMatch(/Patient received/);
  });
});

qaTest('TC-APP015-034', async ({ qa }) => {
  qa.blocked(1, 13);
  test.skip(true, 'Blocker 13: set-up missing on the branch (00-blockers-checklist-linked.xlsx | Checklist | row 17)');
});

qaTest('TC-APP015-035', async ({ page, qa }) => {
  const p = new Patients(page);
  const name = walkInName(qa);
  await qa.step(1, async () => {
    await p.open();
    await expect(p.main.getByRole('heading', { level: 1, name: 'Emergency Patients' })).toBeVisible();
  });
  await qa.step(2, async () => {
    await p.main.getByRole('button', { name: 'Walk-in ER', exact: true }).click();
    await expect(p.dialog.getByRole('textbox', { name: 'Name' })).toBeVisible();
    await expect(p.dialog.getByRole('spinbutton', { name: 'Estimated age (years)' })).toBeVisible();
    await expect(p.dialog.getByRole('combobox')).toBeVisible();
    await expect(p.dialog.getByRole('button', { name: 'Receive' })).toBeVisible();
    if (!(await p.dialog.getByRole('combobox', { name: 'Branch' }).count())) qa.note(2, 'no "Branch" list: U1 works on one branch');
  });
  await qa.step(3, async () => {
    await p.dialog.getByRole('textbox', { name: 'Name' }).fill(name);
    await p.dialog.getByRole('spinbutton', { name: 'Estimated age (years)' }).fill('25');
    await p.dialog.getByRole('combobox').selectOption({ label: 'IGD' });
    await p.dialog.getByRole('combobox').locator('xpath=following::input[1]').fill(qa.prefix('X IGD 1'));
    expect(await p.click(p.dialog.getByRole('button', { name: 'Receive' }))).toContain(WALKED_IN);
    await expect(p.main.getByRole('tab', { name: 'Emergency OP Patients' })).toHaveAttribute('aria-selected', 'true');
  });
  await qa.step(4, async () => {
    const row = await p.row(name, 'Emergency OP Patients');
    for (const b of ['Triage', 'Bed', 'Consultant', 'Outcome', 'Attach file']) await expect(row.getByRole('button', { name: b, exact: true })).toBeVisible();
    qa.note(4, `row: ${(await row.innerText()).replace(/\s+/g, ' ')}`);
    expect(await row.innerText()).toMatch(/MRN|RM-|\d{4}/);
  });
});

qaTest('TC-APP015-036', async ({ page, qa }) => {
  const p = new Patients(page);
  await qa.step(1, async () => {
    const toasts = await p.walkIn(walkInName(qa), '25', '');
    expect(toasts).not.toContain(WALKED_IN);
  });
  await qa.step(2, async () => {
    const toasts = await p.walkIn(walkInName(qa), '-1');
    expect(toasts).not.toContain(WALKED_IN);
    qa.note(2, `result: "${toasts.join(' / ') || 'the browser stops the click'}"`);
  });
  qa.notRun(3, 'U1 works on one branch, which has the service centre IGD');
  await qa.step(4, async () => {
    const name = walkInName(qa);
    expect(await p.walkIn(name, '25')).toContain(WALKED_IN);
    const second = await p.walkIn(name, '25');
    if (second.includes(WALKED_IN)) qa.deviation(4, 'A warning about a duplicate', 'a second patient and a second open encounter are saved without a warning');
  });
});

qaTest('TC-APP015-037', async ({ page, qa }) => {
  test.setTimeout(15 * 60_000);
  const p = new Patients(page);
  const name = await encounter(p, qa);
  let category = '';
  await qa.step(1, async () => {
    const d = await p.openRow(name, 'Triage');
    await expect(d.getByRole('combobox', { name: 'Patient condition' }).locator('option')).toHaveText(['Patient condition', 'Conscious', 'Unconscious', 'Critical']);
    await expect(d.getByRole('combobox', { name: 'Patient status' }).locator('option')).toHaveText(['Patient status', 'Waiting', 'In treatment', 'Referred']);
    for (const b of ['Save', 'Flag triage required']) await expect(d.getByRole('button', { name: b })).toBeVisible();
    // The categories load after the dialog opens.
    await d.getByRole('combobox', { name: 'Triage category' }).locator('option').nth(1).waitFor({ state: 'attached', timeout: 15_000 }).catch(() => {});
    category = (await anyCategory(d)) ?? '';
    if (!category) qa.note(1, '"Triage category" offers no category, only its placeholder (found blocker 54)');
  });
  if (!category) {
    for (const st of [2, 3, 4, 5, 6]) qa.blocked(st, 54);
    return;
  }
  await qa.step(2, async () => {
    const d = p.dialog;
    // The categories load after the dialog opens: the list is given its options first.
    await expect(d.getByRole('combobox', { name: 'Triage category' }).locator('option', { hasText: category })).toHaveCount(1, { timeout: 15_000 });
    // By its value: the label read back in English is not always the one the site writes ("Kuning IGD").
    const list = d.getByRole('combobox', { name: 'Triage category' });
    const value = await list.locator('option').nth(1).getAttribute('value');
    category = (await asOnSite(() => list.locator('option').nth(1).innerText())).trim();
    await list.selectOption({ value: value ?? '' });
    await d.getByRole('combobox', { name: 'Patient condition' }).selectOption('Critical');
    await d.getByRole('combobox', { name: 'Patient status' }).selectOption('Waiting');
    expect(await p.click(d.getByRole('button', { name: 'Save' }))).toContain('Triage saved. This category is now current.');
    await expect(await p.row(name)).toContainText(category);
    qa.note(2, `category "${category}" (the seed category of the branch; its minutes decide the overdue mark)`);
  });
  await qa.step(3, async () => {
    // The category of the seed data allows 10 minutes; the row is read until "Overdue" shows (at most 12 minutes).
    await expect.poll(async () => (await p.row(name)).innerText(), { timeout: 12 * 60_000, intervals: [30_000] }).toContain('Overdue');
  });
  qa.notRun(4, 'only one active category is on the branch (the categories of the tests are deactivated)');
  await qa.step(5, async () => {
    const d = await p.openRow(name, 'Triage');
    expect(await p.click(d.getByRole('button', { name: 'Flag triage required' }))).toContain('Triage required. The patient stays triage open until an assessment is saved.');
  });
  qa.blocked(6, 13);
});

qaTest('TC-APP015-038', async ({ page, qa }) => {
  const p = new Patients(page);
  qa.notRun(1, 'covered by TC-APP015-024 step 5 and TC-APP015-026 (an inactive category is not offered)');
  qa.notRun(2, 'needs two users at the same moment (U4 "Second user of the same role" is not made)');
  await qa.step(3, async () => {
    const name = await encounter(p, qa);
    const d = await p.openRow(name, 'Outcome');
    await d.getByRole('textbox', { name: 'Reason' }).last().fill(qa.prefix('X Pulang atas permintaan sendiri'));
    expect(await p.click(d.getByRole('button', { name: 'Close visit' }))).toContain('Saved.');
    const row = await p.row(name);
    await expect(row.getByRole('button', { name: 'Triage', exact: true })).toHaveCount(0);
  });
});

qaTest('TC-APP015-040', async ({ page, qa }) => {
  const p = new Patients(page);
  const name = await encounter(p, qa);
  await qa.step(1, async () => {
    const d = await p.openRow(name, 'Bed');
    for (const f of ['Ward', 'Bed type', 'Status', 'Gender']) await expect(d.getByRole('combobox', { name: f })).toBeVisible();
    await expect(d.getByRole('combobox', { name: 'Status' }).locator('option')).toHaveText(['Any', 'Free', 'Cleaning']);
    qa.note(1, `beds offered: ${(await d.getByRole('listitem').allInnerTexts()).join(' / ')}`);
  });
  for (const s of [2, 3, 4, 5, 6]) qa.blocked(s, 13);
});

qaTest('TC-APP015-041', async ({ page, qa }) => {
  const p = new Patients(page);
  const name = await encounter(p, qa);
  qa.blocked(1, 13);
  await qa.step(2, async () => {
    const d = await p.openRow(name, 'Bed');
    await d.getByRole('combobox', { name: 'Status' }).selectOption('Cleaning');
    await expect(d.getByText('No free bed matches these filters.')).toBeVisible();
  });
  await qa.step(3, async () => {
    await p.dialog.getByRole('button', { name: 'Close' }).first().click();
    const d = await p.openRow(name, 'Outcome');
    await d.getByRole('textbox', { name: 'Reason' }).last().fill(qa.prefix('X Pulang atas permintaan sendiri'));
    expect(await p.click(d.getByRole('button', { name: 'Close visit' }))).toContain('Saved.');
    const row = await p.row(name);
    await expect(row.getByRole('button', { name: 'Bed', exact: true })).toHaveCount(0);
    qa.note(3, 'the closed encounter has no "Bed" button (one window; the dialog of a second window is not tried)');
  });
  qa.blocked(4, 13);
});

/** Fills "Mark for discharge" with the data of the workbook. */
async function markForDischarge(d: Locator, qa: Qa, consent = true): Promise<void> {
  await d.getByRole('textbox', { name: 'Type' }).fill(qa.prefix('X Pulang'));
  await d.getByRole('textbox', { name: 'Department' }).fill(qa.prefix('X IGD'));
  await d.getByRole('textbox', { name: 'Unit' }).fill(qa.prefix('X IGD 1'));
  await d.getByRole('textbox', { name: 'Expected date' }).fill(todayWib());
  await d.getByRole('textbox', { name: 'Reason' }).first().fill(qa.prefix('X Membaik'));
  await d.getByRole('textbox', { name: 'Next review' }).fill(addDays(todayWib(), 7));
  await d.getByRole('checkbox', { name: 'Consent' }).setChecked(consent);
}

qaTest('TC-APP015-042', async ({ page, qa }) => {
  const p = new Patients(page);
  const name = await encounter(p, qa);
  qa.note(1, 'the patient has no bed: IGD has no beds (blocker 13)');
  await qa.step(1, async () => {
    const d = await p.openRow(name, 'Outcome');
    await expect(d.getByRole('paragraph').filter({ hasText: /^Mark for discharge$/ })).toBeVisible();
    for (const f of ['Type', 'Department', 'Unit', 'Expected date', 'Next review', 'Police report number']) await expect(d.getByRole('textbox', { name: f })).toBeVisible();
    for (const f of ['Ambulance', 'Emergency discharge', 'Consent']) await expect(d.getByRole('checkbox', { name: f })).toBeVisible();
    await expect(d.getByRole('button', { name: 'Request admission' })).toBeVisible();
  });
  await qa.step(2, async () => {
    await markForDischarge(p.dialog, qa);
    expect(await p.click(p.dialog.getByRole('button', { name: 'Mark for discharge' }))).toContain('Saved.');
  });
  await qa.step(3, async () => {
    const d = await p.openRow(name, 'Outcome');
    for (const b of ['Unmark', 'Discharge']) await expect(d.getByRole('button', { name: b })).toBeVisible();
  });
  await qa.step(4, async () => {
    expect(await p.click(p.dialog.getByRole('button', { name: 'Discharge' }))).toContain('Saved.');
  });
  await qa.step(5, async () => {
    const row = await p.row(name);
    await expect(row.getByRole('button')).toHaveText(['Outcome']);
    await row.getByRole('button', { name: 'Outcome' }).click();
    await expect(p.dialog.getByText('This encounter is closed and cannot be changed.')).toBeVisible();
  });
  qa.blocked(6, 13);
});

qaTest('TC-APP015-043', async ({ page, qa }) => {
  const p = new Patients(page);
  const name = await encounter(p, qa);
  await qa.step(1, async () => {
    const d = await p.openRow(name, 'Outcome');
    await markForDischarge(d, qa, false);
    const toasts = await p.click(d.getByRole('button', { name: 'Mark for discharge' }));
    expect(toasts).not.toContain('Saved.');
    expect(await d.getByRole('checkbox', { name: 'Consent' }).evaluate((e) => (e as HTMLInputElement).validity.valueMissing)).toBe(true);
  });
  await qa.step(2, async () => {
    await markForDischarge(p.dialog, qa);
    expect(await p.click(p.dialog.getByRole('button', { name: 'Mark for discharge' }))).toContain('Saved.');
    let d = await p.openRow(name, 'Outcome');
    await p.click(d.getByRole('button', { name: 'Unmark' }));
    d = await p.openRow(name, 'Outcome');
    await expect(d.getByRole('button', { name: 'Mark for discharge' })).toBeVisible();
    await expect(d.getByRole('button', { name: 'Discharge', exact: true })).toHaveCount(0);
  });
  await qa.step(3, async () => {
    const d = p.dialog;
    await markForDischarge(d, qa);
    await d.getByRole('textbox', { name: 'Expected date' }).fill(addDays(todayWib(), -3));
    await d.getByRole('textbox', { name: 'Next review' }).fill(addDays(todayWib(), -2));
    const toasts = await p.click(d.getByRole('button', { name: 'Mark for discharge' }));
    qa.note(3, `dates in the past: "${toasts.join(' / ')}"`);
    if (toasts.includes('Saved.')) {
      const again = await p.openRow(name, 'Outcome');
      await p.click(again.getByRole('button', { name: 'Unmark' }));
    }
  });
  await qa.step(4, async () => {
    const d = await p.openRow(name, 'Outcome');
    await markForDischarge(d, qa);
    await d.getByRole('textbox', { name: 'Type' }).fill('   ');
    const toasts = await p.click(d.getByRole('button', { name: 'Mark for discharge' }));
    expect(toasts).not.toContain('Saved.');
    qa.note(4, `text shown: "${toasts.join(' / ') || 'none'}"`);
  });
});

qaTest('TC-APP015-044', async ({ page, qa }) => {
  const p = new Patients(page);
  const name = await encounter(p, qa);
  await qa.step(1, async () => {
    const d = await p.openRow(name, 'Outcome');
    expect(await p.click(d.getByRole('button', { name: 'Request admission' }))).toContain('Saved.');
  });
  await qa.step(2, async () => {
    await p.row(name, 'Emergency IP Patients');
  });
  await qa.step(3, async () => {
    const d = await p.openRow(name, 'Outcome');
    await expect(d.getByRole('textbox', { name: 'Admission id' })).toBeVisible();
    await expect(d.getByRole('button', { name: 'Record admission' })).toBeVisible();
    await expect(d.getByRole('button', { name: 'Request admission' })).toBeDisabled();
    await expect(d.getByRole('button', { name: 'Close visit' })).toHaveCount(0);
  });
  qa.notRun(4, 'the admission clerk admits the patient in Inpatient; the internal id of the admission is shown on no screen (Q27); the walk-in patient is not on the admission list of 04');
  qa.notRun(5, 'needs the admission id of step 4');
});

qaTest('TC-APP015-045', async ({ page, qa }) => {
  const p = new Patients(page);
  const name = await encounter(p, qa);
  let d = await p.openRow(name, 'Outcome');
  expect(await p.click(d.getByRole('button', { name: 'Request admission' }))).toContain('Saved.');
  for (const [step, id, server] of [[1, 'bukan-id', 'admission id is required'], [2, '00000000-0000-4000-8000-000000000000', 'admission not found']] as const) {
    await qa.step(step, async () => {
      d = await p.openRow(name, 'Outcome');
      await d.getByRole('textbox', { name: 'Admission id' }).fill(id);
      const toasts = await p.click(d.getByRole('button', { name: 'Record admission' }));
      expect(toasts).not.toContain('Saved.');
      qa.note(step, `text shown: "${toasts.join(' / ') || 'none'}" (the server refuses with a text ending in "${server}")`);
    });
  }
  qa.notRun(3, 'needs the internal id of an admission of another patient (shown on no screen)');
  await qa.step(4, async () => {
    d = await p.openRow(name, 'Outcome');
    const buttons = await d.getByRole('button').allInnerTexts();
    if (!buttons.some((b) => /cancel|undo|withdraw/i.test(b))) qa.note(4, 'no way to take back "Request admission"; "Close visit" is gone');
    await expect(d.getByRole('button', { name: 'Close visit' })).toHaveCount(0);
  });
});

qaTest('TC-APP015-049', async ({ page, qa }) => {
  const p = new Patients(page);
  const name = await encounter(p, qa);
  await qa.step(1, async () => {
    const d = await p.openRow(name, 'Outcome');
    await d.getByRole('textbox', { name: 'Reason' }).last().fill(qa.prefix('X Pulang atas permintaan sendiri'));
    expect(await p.click(d.getByRole('button', { name: 'Close visit' }))).toContain('Saved.');
  });
  await qa.step(2, async () => {
    const d = await p.openRow(name, 'Outcome');
    await expect(d.getByText('This encounter is closed and cannot be changed.')).toBeVisible();
  });
});

qaTest('TC-APP015-050', async ({ page, qa }) => {
  const p = new Patients(page);
  const name = await encounter(p, qa);
  await qa.step(1, async () => {
    const d = await p.openRow(name, 'Outcome');
    await d.getByRole('textbox', { name: 'Reason' }).last().fill('');
    expect(await p.click(d.getByRole('button', { name: 'Close visit' }))).not.toContain('Saved.');
    expect(await d.getByRole('textbox', { name: 'Reason' }).last().evaluate((e) => (e as HTMLInputElement).validity.valueMissing)).toBe(true);
  });
  await qa.step(2, async () => {
    const d = p.dialog;
    await d.getByRole('textbox', { name: 'Reason' }).last().fill('   ');
    const toasts = await p.click(d.getByRole('button', { name: 'Close visit' }));
    expect(toasts).not.toContain('Saved.');
    qa.note(2, `text shown: "${toasts.join(' / ') || 'none'}"`);
  });
  qa.notRun(3, 'needs two windows; the second-window case is not run (one browser page per test)');
});

qaTest('TC-APP015-051', async ({ page, qa }) => {
  const p = new Patients(page);
  const name = await encounter(p, qa);
  await qa.step(1, async () => {
    const d = await p.openRow(name, 'Attach file');
    await expect(d.getByRole('textbox', { name: 'Description' })).toBeVisible();
    await expect(d.getByRole('button', { name: 'Attach file' })).toBeDisabled();
    await d.getByRole('button', { name: 'Close' }).first().click();
  });
  await qa.step(2, async () => {
    expect(await attach(p, name, pdf(100, 'qa-surat-rujukan.pdf'), qa.prefix('X Surat rujukan'))).toContain('File attached.');
  });
  await qa.step(3, async () => {
    const row = await p.row(name);
    qa.note(3, `the row: ${(await row.innerText()).replace(/\s+/g, ' ')}; no screen lists the files`);
  });
});

qaTest('TC-APP015-052', async ({ page, qa }) => {
  const p = new Patients(page);
  const name = await encounter(p, qa);
  await qa.step(1, async () => {
    const toasts = await attach(p, name, pdf(1024, 'qa-besar.pdf'), qa.prefix('X Surat rujukan'));
    expect(toasts).not.toContain('File attached.');
    qa.note(1, `about 1 MB: "${toasts.join(' / ')}"`);
  });
  qa.blocked(2, 13);
  await qa.step(3, async () => {
    const toasts = await attach(p, name, { name: 'qa-script.sh', mimeType: 'application/x-sh', buffer: Buffer.from('#!/bin/sh\necho qa\n') }, qa.prefix('X Surat rujukan'));
    qa.note(3, `a script file: "${toasts.join(' / ')}"`);
  });
});
