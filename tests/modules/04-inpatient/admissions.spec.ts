import type { Page } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder, toastLocator, toastMark, toastsSince } from '../../../lib/assertions';
import { AdmissionsPage, BedsPage, DischargesPage } from '../../../pages/inpatient/InpatientPages';
import { NotOffered } from '../../../lib/not-offered';

/**
 * 04-inpatient.xlsx, features "Bed management (/adt/beds)", "Admissions
 * (/adt/admissions)" and "Discharges (/adt/discharges)".
 *
 * Beds and stays cannot be deleted on the site, so every test adds its own
 * beds (QA-101 -> "QA-101-<token>", description "QA Kelas 1") and admits its
 * own patients ("QA-INP Pasien Satu" -> "QA-INP Pasien Satu <token>"). The
 * stay's patient is free text on this screen (TC-APP004-021).
 */

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

const DESCRIPTION = 'QA Kelas 1';

/** Adds the workbook's bed (QA-101, QA-102, …) made unique, and returns its number. */
async function newBed(page: Page, qa: Qa, excelNo: string, extra: { active?: boolean; availability?: string } = {}): Promise<string> {
  const beds = new BedsPage(page);
  const no = qa.code(excelNo);
  await beds.open();
  await beds.add({ no, description: DESCRIPTION, ...extra });
  return no;
}

async function toastsAfter(page: Page, mark: number): Promise<string[]> {
  try {
    await expect.poll(async () => (await toastsSince(page, mark)).length, { timeout: 8_000 }).toBeGreaterThan(0);
  } catch {
    // no toast
  }
  return toastsSince(page, mark);
}

const n = (s: string) => Number(s.replace(/[^\d.-]/g, ''));

// ------------------------------------------------------------------ beds

qaTest('TC-APP004-001', async ({ page, qa }) => {
  const beds = new BedsPage(page);
  const adm = new AdmissionsPage(page);
  const no = qa.code('QA-101');
  const d = beds.dialog();

  await qa.step(1, async () => {
    await page.goto('/id/apps');
    await page.getByRole('link', { name: /^Inpatient\b/ }).first().click();
    await page.getByRole('main').getByRole('link', { name: 'Bed management', exact: true }).click();
    await expect(beds.heading).toBeVisible();
    await expect(beds.main.getByText('Beds at this branch. An occupied bed shows the patient and admission number.')).toBeVisible();
    await expect(beds.main.getByRole('searchbox', { name: 'Search' })).toBeVisible();
    await expect(beds.main.getByRole('combobox').filter({ has: page.getByRole('option', { name: 'All beds' }) })).toHaveValue(/.+/);
    await expect(beds.main.getByRole('button', { name: 'Add bed' })).toBeVisible();
  });

  await qa.step(2, async () => {
    await beds.main.getByRole('button', { name: 'Add bed' }).click();
    await expect(d).toBeVisible();
    await expect(d.getByRole('textbox', { name: 'Bed no' })).toBeVisible();
    await expect(d.getByRole('textbox', { name: 'Description' })).toBeVisible();
    await expect(d.getByRole('checkbox', { name: 'Active' })).toBeChecked();
    await expect(d.getByRole('checkbox', { name: 'Cross-gender' })).not.toBeChecked();
    await expect(d.getByRole('combobox', { name: /Branch/ })).toHaveCount(0);
    if (await d.getByRole('combobox', { name: 'Availability' }).count()) qa.note(2, 'the dialog also has "Availability" (Available by default)');
  });

  await qa.step(3, async () => {
    await beds.fill(d, { no, description: DESCRIPTION });
    await d.getByRole('button', { name: /^(Save|Saving…)$/ }).click();
    await expect(toastLocator(page, /^Bed created$/)).toBeVisible();
  });

  await qa.step(4, async () => {
    await beds.search(no);
    const row = beds.row(no);
    await expect(row).toHaveCount(1);
    await expect(await beds.cell(row, 'Patient')).toHaveText('—');
    await expect(await beds.cell(row, 'Admission no')).toHaveText('—');
    await expect(await beds.cell(row, 'Description')).toHaveText(DESCRIPTION);
    await expect(await beds.cell(row, 'Status')).toHaveText('Active');
    await expect(row.getByRole('button', { name: 'Edit' })).toBeVisible();
  });

  await qa.step(5, async () => {
    await adm.open();
    await expect(adm.stripCard(no)).toBeVisible();
  });
});

qaTest('TC-APP004-002', async ({ page, qa }) => {
  const beds = new BedsPage(page);
  const no = await newBed(page, qa, 'QA-103');
  const description = 'QA Kelas 1, dekat jendela';

  await qa.step(1, async () => {
    const d = await beds.openEdit(no);
    await expect(d.getByRole('textbox', { name: 'Bed no' })).toHaveValue(no);
    await expect(d.getByRole('textbox', { name: 'Description' })).toHaveValue(DESCRIPTION);
    await expect(d.getByRole('combobox', { name: /Branch/ })).toHaveCount(0);
    await d.getByRole('button', { name: 'Cancel' }).last().click();
  });

  await qa.step(2, async () => {
    await beds.edit(no, { description });
    await expect(await beds.cell(beds.row(no), 'Description')).toHaveText(description);
  });

  await qa.step(3, async () => {
    await beds.edit(no, { active: false });
    await expect(await beds.cell(beds.row(no), 'Status')).toHaveText('Inactive');
  });
});

qaTest('TC-APP004-003', async ({ page, qa }) => {
  const beds = new BedsPage(page);
  const adm = new AdmissionsPage(page);
  const bed1 = await newBed(page, qa, 'QA-101');
  const name = qa.name('QA-INP Pasien Satu');
  await adm.open();
  await adm.admit(name, bed1);
  const admissionNo = await adm.admissionNo(await adm.stay(name));

  await qa.step(1, async () => {
    await beds.open();
    const total = n((await beds.pagingSummary().innerText()).split('of')[1]);
    if (total > 10) {
      await expect(beds.rows()).toHaveCount(10);
      await expect(beds.main.getByRole('button', { name: 'Next page' })).toBeEnabled();
    } else {
      qa.note(1, `precondition "more than 10 beds" not met: ${total}`);
    }
  });

  await qa.step(2, async () => {
    await beds.search(bed1);
    await expect(await beds.cell(beds.row(bed1), 'Patient')).toHaveText(name);
    await expect(await beds.cell(beds.row(bed1), 'Admission no')).toHaveText(admissionNo);
  });

  await qa.step(3, async () => {
    // Test Data "qa-10": the beds of this test start with QA-10…, in another letter case.
    await beds.search('qa-10');
    const nos = await beds.rows().evaluateAll((rs) => rs.map((r) => r.querySelector('td')?.textContent?.trim() ?? ''));
    expect(nos.length).toBeGreaterThan(0);
    for (const x of nos) expect(x.toLowerCase()).toContain('qa-10');
  });

  await qa.step(4, async () => {
    await beds.search(bed1);
    await beds.show('Vacant only');
    await expect(beds.row(bed1)).toHaveCount(0);
  });

  await qa.step(5, async () => {
    await beds.search('');
    await expect(beds.rows().first()).toBeVisible();
    for (const p of await beds.rows().all()) await expect(await beds.cell(p, 'Patient')).toHaveText('—');
  });
});

qaTest('TC-APP004-028', async ({ page, qa }) => {
  const beds = new BedsPage(page);
  const no = await newBed(page, qa, 'QA-101');
  const d = beds.dialog();

  await qa.step(1, async () => {
    await beds.main.getByRole('button', { name: 'Add bed' }).click();
    await beds.fill(d, { no, description: DESCRIPTION });
    const mark = await toastMark(page);
    await d.getByRole('button', { name: 'Save' }).click();
    const toasts = await toastsAfter(page, mark);
    if (toasts.includes('Bed created')) {
      qa.deviation(1, 'Refused: the number is already used in this branch', 'saved a second bed with the same number (toast "Bed created")');
      await beds.search(no);
      await expect(beds.row(no)).toHaveCount(2);
    } else {
      expect(toasts.join(' ')).toMatch(/already|used|exist/i);
    }
  });

  await qa.step(2, async () => {
    if (!(await d.isVisible())) await beds.main.getByRole('button', { name: 'Add bed' }).click();
    await beds.fill(d, { no: '' });
    await d.getByRole('button', { name: 'Save' }).click();
    expect(await d.getByRole('textbox', { name: 'Bed no' }).evaluate((e) => (e as HTMLInputElement).validity.valueMissing)).toBe(true);
  });

  await qa.step(3, async () => {
    await beds.fill(d, { no: '   ' });
    const mark = await toastMark(page);
    await d.getByRole('button', { name: 'Save' }).click();
    const toasts = await toastsAfter(page, mark);
    if (!toasts.some((x) => /bed (no|number)|missing|required/i.test(x))) {
      qa.deviation(3, 'A message that the bed number is missing', toasts.length ? `toast "${toasts.join(' / ')}"` : 'nothing happens: no message, the dialog stays open');
    }
    await expect(d).toBeVisible();
  });
});

qaTest('TC-APP004-029', async ({ page, qa }) => {
  const beds = new BedsPage(page);
  const adm = new AdmissionsPage(page);
  const bed1 = await newBed(page, qa, 'QA-101');
  const name = qa.name('QA-INP Pasien Satu');
  await adm.open();
  await adm.admit(name, bed1);
  const renamed = qa.code('QA-111');
  await beds.open();
  await beds.search(bed1);
  const edit = beds.row(bed1).getByRole('button', { name: 'Edit' });
  // On the site an occupied bed has no "Edit": neither change can be tried.
  const editable = (await edit.count()) > 0;

  await qa.step(1, async () => {
    if (!editable) {
      qa.note(1, 'an occupied bed has no "Edit" button: its number cannot be changed while the patient lies on it');
      return;
    }
    await edit.click();
    const d = beds.dialog('Edit bed');
    await beds.fill(d, { no: renamed });
    const mark = await toastMark(page);
    await d.getByRole('button', { name: 'Save' }).click();
    const toasts = await toastsAfter(page, mark);
    if (!toasts.includes('Bed updated')) expect(toasts.join(' ')).toMatch(/occupied/i);
  });

  await qa.step(2, async () => {
    await adm.open();
    const bed = (await (await adm.cell(await adm.stay(name), 'Bed')).innerText()).trim();
    if (editable && bed !== renamed) qa.deviation(2, `Bed ${renamed}`, `the stay still shows ${bed}`);
    if (!editable) expect(bed).toBe(bed1);
  });

  await qa.step(3, async () => {
    if (!editable) {
      qa.note(3, 'refused by the screen: an occupied bed cannot be edited, so it cannot be switched off either');
      return;
    }
    await beds.open();
    await beds.search(bed1.split('-').pop()!);
    await beds.rows().filter({ hasText: name }).first().getByRole('button', { name: 'Edit' }).click();
    const d = beds.dialog('Edit bed');
    await beds.fill(d, { active: false });
    const mark = await toastMark(page);
    await d.getByRole('button', { name: 'Save' }).click();
    const toasts = await toastsAfter(page, mark);
    if (toasts.includes('Bed updated')) qa.deviation(3, 'Refused while a patient is on the bed', 'saved (toast "Bed updated"); the patient stays on a bed marked "Inactive"');
  });
});

qaTest('TC-APP004-079', async ({ page, qa }) => {
  const beds = new BedsPage(page);
  const code = qa.code('X-BT1');
  const name = qa.name('X Kelas uji');
  await beds.open();
  const d = page.getByRole('dialog', { name: 'Bed type' });

  await qa.step(1, async () => {
    await beds.main.getByRole('button', { name: 'Bed type' }).click();
    await expect(d).toBeVisible();
    await expect(d.getByRole('textbox', { name: 'Code' })).toBeVisible();
    await expect(d.getByRole('textbox', { name: 'Name' })).toBeVisible();
    await expect(d.getByRole('checkbox', { name: 'Active' })).toBeVisible();
    await expect(d.getByRole('button', { name: 'Cancel' }).last()).toBeVisible();
    await expect(d.getByRole('button', { name: 'Save' })).toBeVisible();
  });

  await qa.step(2, async () => {
    await d.getByRole('textbox', { name: 'Code' }).fill(code);
    await d.getByRole('textbox', { name: 'Name' }).fill(name);
    await d.getByRole('button', { name: 'Save' }).click();
    await expect(toastLocator(page, /^Bed type saved$/)).toBeVisible();
    await expect(d.getByText(code).or(d.getByText(name)).first()).toBeVisible();
  });
});

qaTest('TC-APP004-080', async ({ page, qa }) => {
  const beds = new BedsPage(page);
  const code = qa.code('X-BT1');
  await beds.open();
  const d = page.getByRole('dialog', { name: 'Bed type' });
  await beds.main.getByRole('button', { name: 'Bed type' }).click();
  await d.getByRole('textbox', { name: 'Code' }).fill(code);
  await d.getByRole('textbox', { name: 'Name' }).fill(qa.name('X Kelas uji'));
  await d.getByRole('button', { name: 'Save' }).click();
  await expect(toastLocator(page, /^Bed type saved$/)).toBeVisible();

  await qa.step(1, async () => {
    await d.getByRole('textbox', { name: 'Code' }).fill(code);
    await d.getByRole('textbox', { name: 'Name' }).fill(qa.name('X Kelas uji'));
    const mark = await toastMark(page);
    await d.getByRole('button', { name: 'Save' }).click();
    const toasts = await toastsAfter(page, mark);
    expect(toasts).not.toContain('Bed type saved');
    if (!toasts.includes('That code already exists')) qa.deviation(1, 'Toast "That code already exists"', `toast "${toasts.join(' / ')}"`);
  });
});

qaTest('TC-APP004-081', async ({ page, qa }) => {
  const beds = new BedsPage(page);
  const adm = new AdmissionsPage(page);
  const bed = await newBed(page, qa, 'X-B01');

  await qa.step(1, async () => {
    await expect(beds.table.getByRole('columnheader', { name: 'Availability' })).toBeVisible();
  });

  await qa.step(2, async () => {
    await beds.main.getByRole('button', { name: 'Add bed' }).click();
    const options = (await beds.dialog().getByRole('combobox', { name: 'Availability' }).locator('option').allInnerTexts()).map((o) => o.trim());
    expect(options).toEqual(['Available', 'Blocked', 'Reserved', 'Marked for discharge', 'Under maintenance']);
    await beds.dialog().getByRole('button', { name: 'Cancel' }).last().click();
  });

  await qa.step(3, async () => {
    await beds.edit(bed, { availability: 'Blocked' });
    await expect(await beds.cell(beds.row(bed), 'Availability')).toHaveText('Blocked');
  });

  await qa.step(4, async () => {
    await adm.open();
    await adm.admitButton.click();
    await adm.wizard.getByRole('textbox', { name: 'Patient name' }).fill(qa.name('QA-INP Pasien Satu'));
    await adm.next();
    const field = adm.wizard.getByRole('combobox', { name: 'Bed' });
    await field.fill(bed);
    const list = page.locator(`#${await field.getAttribute('aria-controls')}`);
    const offered = list.getByRole('option').filter({ hasText: bed });
    if (!(await offered.count())) {
      qa.note(4, 'the blocked bed is not offered in the Bed field (TBD in the workbook)');
      return;
    }
    await offered.first().getByRole('button').click();
    await adm.next();
    const mark = await toastMark(page);
    await adm.wizard.getByRole('button', { name: 'Admit' }).click();
    const toasts = await toastsAfter(page, mark);
    if (!toasts.includes('That bed is blocked')) qa.deviation(4, 'Toast "That bed is blocked"; the patient is not admitted', `toast "${toasts.join(' / ')}"`);
  });
});

// ------------------------------------------------------------ admissions

qaTest('TC-APP004-004', async ({ page, qa }) => {
  const adm = new AdmissionsPage(page);
  const bed1 = await newBed(page, qa, 'QA-101');
  const name = qa.name('QA-INP Pasien Satu');
  const w = adm.wizard;
  await adm.open();
  const before = await adm.census();

  await qa.step(1, async () => {
    await page.goto('/id/adt');
    await page.getByRole('main').getByRole('link', { name: 'Open admissions' }).click();
    await adm.admitButton.click();
    await expect(w).toBeVisible();
    await expect(w.getByText('Three steps: patient, bed, then review.')).toBeVisible();
    for (const s of ['Patient', 'Bed', 'Review']) await expect(w.getByRole('list', { name: 'Wizard steps' })).toContainText(s);
    await expect(w.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  await qa.step(2, async () => {
    await w.getByRole('textbox', { name: 'Patient name' }).fill(name);
    await expect(w.getByRole('textbox', { name: 'Admission no' })).toHaveAttribute('placeholder', 'Auto-generated if blank');
    await adm.next();
    await expect(w.getByRole('combobox', { name: 'Bed' })).toBeVisible();
    const hint = await w.getByRole('combobox', { name: 'Bed' }).getAttribute('placeholder');
    if (hint !== 'Bed no or description…') qa.deviation(2, 'Hint "Bed no or description…"', `hint "${hint ?? ''}"`);
  });

  await qa.step(3, async () => {
    await adm.pickBed(w.getByRole('combobox', { name: 'Bed' }), bed1);
    await adm.next();
    await expect(w.getByText('Check this before admitting.')).toBeVisible();
    await expect(w.getByRole('definition')).toHaveText([name, 'Auto-generated if blank', bed1]);
  });

  await qa.step(4, async () => {
    await w.getByRole('button', { name: /^(Admit|Saving…)$/ }).click();
    await expect(toastLocator(page, /^Patient admitted$/)).toBeVisible();
    await expect(w).toBeHidden();
  });

  await qa.step(5, async () => {
    const row = await adm.stay(name);
    expect(await adm.admissionNo(row)).toMatch(/^ADM-/);
    await expect(await adm.cell(row, 'Bed')).toHaveText(bed1);
    await expect(await adm.cell(row, 'Admitted')).toHaveText(/\d{1,2}[:.]\d{2}/);
    await expect(await adm.cell(row, 'Status')).toContainText('On a bed');
  });

  await qa.step(6, async () => {
    await adm.open();
    const after = await adm.census();
    expect(n(after['In house'])).toBe(n(before['In house']) + 1);
    expect(n(after.Occupied)).toBe(n(before.Occupied) + 1);
    expect(n(after.Vacant)).toBe(n(before.Vacant) - 1);
    await expect(adm.stripCard(bed1)).toHaveCount(0);
  });
});

qaTest('TC-APP004-005', async ({ page, qa }) => {
  const adm = new AdmissionsPage(page);
  const bed2 = await newBed(page, qa, 'QA-102');
  const name = qa.name('QA-INP Pasien Dua');
  await adm.open();

  await qa.step(1, async () => {
    await expect(adm.main.getByText('Tap to admit into this bed.')).toBeVisible();
    await expect(adm.stripCard(bed2)).toHaveText(new RegExp(`${bed2}\\s*${DESCRIPTION}`));
  });

  await qa.step(2, async () => {
    await adm.stripCard(bed2).click();
    await expect(adm.wizard).toBeVisible();
    await expect(adm.wizard.getByRole('textbox', { name: 'Patient name' })).toBeVisible();
  });

  await qa.step(3, async () => {
    await adm.wizard.getByRole('textbox', { name: 'Patient name' }).fill(name);
    await adm.next();
    await expect(adm.wizard.getByRole('combobox', { name: 'Bed' })).toHaveValue(new RegExp(`${bed2}.*${DESCRIPTION}`));
  });

  await qa.step(4, async () => {
    await adm.next();
    await adm.wizard.getByRole('button', { name: 'Admit' }).click();
    await expect(toastLocator(page, /^Patient admitted$/)).toBeVisible();
    await expect(await adm.cell(await adm.stay(name), 'Bed')).toHaveText(bed2);
  });
});

qaTest('TC-APP004-006', async ({ page, qa }) => {
  const adm = new AdmissionsPage(page);
  const bed3 = await newBed(page, qa, 'QA-103');
  const name = qa.name('QA-INP Pasien Tiga');
  await adm.open();

  await qa.step(1, async () => {
    await adm.admitButton.click();
    await adm.wizard.getByRole('textbox', { name: 'Patient name' }).fill(name);
    await adm.next();
    await adm.next();
    await expect(adm.wizard.getByRole('definition').nth(2)).toHaveText('Allocate later');
  });

  await qa.step(2, async () => {
    await adm.wizard.getByRole('button', { name: 'Admit' }).click();
    await expect(toastLocator(page, /^Patient admitted$/)).toBeVisible();
    const row = await adm.stay(name);
    await expect(await adm.cell(row, 'Bed')).toHaveText('—');
    await expect(await adm.cell(row, 'Admitted')).toHaveText('—');
    await expect(await adm.cell(row, 'Status')).toContainText('No bed');
    await expect(row.getByRole('button', { name: 'Discharge' })).toBeDisabled();
  });

  await qa.step(3, async () => {
    await (await adm.stay(name)).getByRole('button', { name: 'Transfer' }).click();
    const d = page.getByRole('dialog', { name: 'Transfer bed' });
    await expect(d).toContainText(name);
    await d.getByRole('button', { name: 'Cancel' }).last().click();
  });

  await qa.step(4, async () => {
    await adm.transfer(await adm.stay(name), bed3);
    const row = await adm.stay(name);
    await expect(await adm.cell(row, 'Bed')).toHaveText(bed3);
    await expect(await adm.cell(row, 'Admitted')).toHaveText(/\d{1,2}[:.]\d{2}/);
    await expect(await adm.cell(row, 'Status')).toContainText('On a bed');
    await expect(row.getByRole('button', { name: 'Discharge' })).toBeEnabled();
  });
});

qaTest('TC-APP004-007', async ({ page, qa }) => {
  const adm = new AdmissionsPage(page);
  const bed = await newBed(page, qa, 'QA-101');
  const name = qa.name('QA-INP Pasien Nomor');
  const number = qa.code('QA-RI-0001');
  await adm.open();

  await qa.step(1, async () => {
    await adm.admitButton.click();
    await adm.wizard.getByRole('textbox', { name: 'Patient name' }).fill(name);
    await adm.wizard.getByRole('textbox', { name: 'Admission no' }).fill(number);
    await expect(adm.wizard.getByRole('textbox', { name: 'Patient name' })).toHaveValue(name);
    await expect(adm.wizard.getByRole('textbox', { name: 'Admission no' })).toHaveValue(number);
  });

  await qa.step(2, async () => {
    await adm.next();
    await adm.pickBed(adm.wizard.getByRole('combobox', { name: 'Bed' }), bed);
    await adm.next();
    await expect(adm.wizard.getByRole('definition').nth(1)).toHaveText(number);
    await adm.wizard.getByRole('button', { name: 'Admit' }).click();
    await expect(toastLocator(page, /^Patient admitted$/)).toBeVisible();
  });

  await qa.step(3, async () => {
    expect(await adm.admissionNo(await adm.stay(name))).toBe(number);
  });
});

qaTest('TC-APP004-008', async ({ page, qa }) => {
  const adm = new AdmissionsPage(page);
  const t = qa.token();
  const bed2 = await newBed(page, qa, 'QA-102');
  await adm.open();
  await adm.admit(`QA-INP Pasien Dua ${t}`, bed2);

  await qa.step(1, async () => {
    await adm.open();
    const c = await adm.census();
    for (const k of ['In house', 'Occupied', 'Vacant'] as const) expect(c[k]).toMatch(/^\d+$/);
    expect(c.Occupancy).toMatch(/^\d+(\.\d+)?%$/);
    await expect(adm.main.getByText('Tap to admit into this bed.')).toBeVisible();
    const names = await adm.rows().evaluateAll((rs) => rs.map((r) => r.querySelector('td p')?.textContent?.trim() ?? ''));
    expect(names.length).toBeLessThanOrEqual(10);
    expect([...names].sort((a, b) => a.localeCompare(b))).toEqual(names);
  });

  await qa.step(2, async () => {
    await adm.search(`pasien du`);
    const readNames = () => adm.rows().evaluateAll((rs) => rs.map((r) => r.querySelector('td p')?.textContent?.trim() ?? ''));
    // The list answers the search after a moment.
    await expect.poll(async () => (await readNames()).some((x) => x.toLowerCase().includes('pasien du')), { timeout: 15_000 }).toBe(true);
    const names = await readNames();
    const others = names.filter((x) => !x.toLowerCase().includes('pasien du'));
    if (others.length) qa.deviation(2, 'Stays whose patient name contains the text', `also ${others.length} stay(s) without it, e.g. "${others[0]}"`);
  });

  await qa.step(3, async () => {
    await adm.search(bed2);
    await expect(adm.rows()).toHaveCount(1);
    await expect(await adm.cell(adm.rows().first(), 'Bed')).toHaveText(bed2);
  });

  await qa.step(4, async () => {
    await adm.search('');
    await adm.main.getByRole('combobox', { name: 'Sort by' }).selectOption({ label: 'Admission no' });
    await adm.main.getByRole('button', { name: 'Search', exact: true }).click();
    const nos = await adm.rows().evaluateAll((rs) => rs.map((r) => r.querySelectorAll('td p')[1]?.textContent?.trim() ?? ''));
    // "Admission-number order": accepted in either direction, with or without number-aware comparison.
    const plain = [...nos].sort();
    const numeric = [...nos].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const orders = [plain, [...plain].reverse(), numeric, [...numeric].reverse()].map((o) => o.join());
    if (!orders.includes(nos.join())) qa.deviation(4, 'The list reloads in admission-number order', `the order is ${nos.slice(0, 4).join(', ')}, …`);
  });

  await qa.step(5, async () => {
    await adm.main.getByRole('combobox', { name: 'Sort by' }).selectOption({ label: 'Admitted at' });
    await adm.main.getByRole('button', { name: 'Search', exact: true }).click();
    const names = await adm.rows().evaluateAll((rs) => rs.map((r) => r.querySelector('td p')?.textContent?.trim() ?? ''));
    if ([...names].sort((a, b) => a.localeCompare(b)).join() === names.join()) {
      qa.deviation(5, 'Newest admission first', 'the list stays in patient-name order');
    }
  });

  await qa.step(6, async () => {
    const first = await adm.rows().first().innerText();
    await adm.main.getByRole('button', { name: 'Next page' }).click();
    await expect(adm.rows().first()).not.toHaveText(first);
    expect(await adm.rows().count()).toBeLessThanOrEqual(10);
  });
});

qaTest('TC-APP004-010', async ({ page, qa }) => {
  const adm = new AdmissionsPage(page);
  const beds = new BedsPage(page);
  const bed1 = await newBed(page, qa, 'QA-101');
  const bed3 = await newBed(page, qa, 'QA-103');
  const name = qa.name('QA-INP Pasien Satu');
  await adm.open();
  await adm.admit(name, bed1);
  const admitted = await (await adm.cell(await adm.stay(name), 'Admitted')).innerText();
  const before = await adm.census();
  const d = page.getByRole('dialog', { name: 'Transfer bed' });

  await qa.step(1, async () => {
    await (await adm.stay(name)).getByRole('button', { name: 'Transfer' }).click();
    await expect(d).toContainText(`${name} · ${bed1}`);
    await expect(d.getByRole('combobox', { name: 'New bed' })).toBeVisible();
    await expect(d.getByRole('button', { name: 'Transfer' })).toBeDisabled();
  });

  let offered = true;
  await qa.step(2, async () => {
    try {
      await adm.pickBed(d.getByRole('combobox', { name: 'New bed' }), bed3);
    } catch (e) {
      if (!(e instanceof NotOffered)) throw e;
      offered = false;
      return qa.note(2, `the new bed ${bed3} is not offered under "New bed": the picker filters only the first 50 beds it loaded`);
    }
    await expect(d.getByRole('button', { name: 'Transfer' })).toBeEnabled();
  });
  if (!offered) {
    // No transfer, so nothing for steps 3 to 5 to read (found blocker 40).
    qa.blocked(2, 40);
    qa.blocked(3, 40);
    qa.notRun(4, 'needs the transfer of step 3 (found blocker 40)');
    qa.notRun(5, 'needs the transfer of step 3 (found blocker 40)');
    return;
  }

  await qa.step(3, async () => {
    await d.getByRole('button', { name: 'Transfer' }).click();
    await expect(toastLocator(page, /^Transferred$/)).toBeVisible();
    const row = await adm.stay(name);
    await expect(await adm.cell(row, 'Bed')).toHaveText(bed3);
    await expect(await adm.cell(row, 'Admitted')).toHaveText(admitted);
  });

  await qa.step(4, async () => {
    await adm.open();
    await expect(adm.stripCard(bed1)).toBeVisible();
    await expect(adm.stripCard(bed3)).toHaveCount(0);
    const after = await adm.census();
    expect([after.Occupied, after.Vacant]).toEqual([before.Occupied, before.Vacant]);
  });

  await qa.step(5, async () => {
    await beds.open();
    await beds.search(bed3);
    await expect(await beds.cell(beds.row(bed3), 'Patient')).toHaveText(name);
    await beds.search(bed1);
    await expect(await beds.cell(beds.row(bed1), 'Patient')).toHaveText('—');
  });
});

qaTest('TC-APP004-011', async ({ page, qa }) => {
  const adm = new AdmissionsPage(page);
  const bed = await newBed(page, qa, 'QA-101');
  const name = qa.name('QA-INP Pasien Satu');
  await adm.open();
  await adm.admit(name, bed);
  const d = page.getByRole('dialog', { name: 'Mark billing cleared' });

  await qa.step(1, async () => {
    const row = await adm.stay(name);
    const number = await adm.admissionNo(row);
    await row.getByRole('button', { name: 'Mark billing cleared' }).click();
    await expect(d).toContainText(`${name} · ${number}`);
    await expect(d.getByText('Sets billing clearance on this stay. Payment stays on Fast Cashier.')).toBeVisible();
  });

  await qa.step(2, async () => {
    await d.getByRole('button', { name: 'Mark cleared' }).click();
    await expect(toastLocator(page, /^Billing clearance recorded$/)).toBeVisible();
    await expect(d).toBeHidden();
  });

  await qa.step(3, async () => {
    const row = await adm.stay(name);
    await expect(await adm.cell(row, 'Status')).toContainText('Billing cleared');
    await expect(row.getByRole('button', { name: 'Mark billing cleared' })).toHaveCount(0);
  });
});

qaTest('TC-APP004-012', async ({ page, qa }) => {
  const adm = new AdmissionsPage(page);
  const dis = new DischargesPage(page);
  const bed = await newBed(page, qa, 'QA-101');
  const name = qa.name('QA-INP Pasien Satu');
  await adm.open();
  await adm.admit(name, bed);
  await adm.markBillingCleared(await adm.stay(name));
  await adm.open();
  const before = await adm.census();
  const d = page.getByRole('dialog', { name: 'Discharge' });

  await qa.step(1, async () => {
    const row = await adm.stay(name);
    const number = await adm.admissionNo(row);
    await row.getByRole('button', { name: 'Discharge' }).click();
    await expect(d).toContainText(`${name} · ${number}`);
    await expect(d.getByRole('textbox', { name: 'Discharge no' })).toHaveAttribute('placeholder', 'Auto-generated if blank');
    const chain = d.getByText(/^Configured chain has \d+ steps — started on discharge\.$/);
    await expect(chain).toBeVisible();
    const steps = (await chain.innerText()).match(/has (\d+) steps/)![1];
    if (steps !== '7') qa.deviation(1, '"Configured chain has 7 steps" (seed chain)', `the configured chain has ${steps} step(s)`);
    await expect(d.getByRole('list', { name: 'Approval chain' }).getByRole('listitem').first()).toContainText('Current');
  });

  await qa.step(2, async () => {
    await d.getByRole('button', { name: 'Discharge', exact: true }).click();
    await expect(toastLocator(page, /^Discharge recorded — approval chain started$/)).toBeVisible();
    await expect(d).toBeVisible();
    await expect(d.getByRole('button', { name: 'Chain started' })).toBeDisabled();
  });

  await qa.step(3, async () => {
    await d.getByRole('button', { name: 'Close' }).click();
    const row = await adm.stay(name);
    const status = await adm.cell(row, 'Status');
    await expect(status).toContainText('Discharged');
    await expect(status).toContainText('On a bed');
    await expect(status).toContainText('Billing cleared');
    const buttons = (await row.getByRole('button').allInnerTexts()).map((b) => b.trim()).filter(Boolean);
    const labels = await row.getByRole('button').evaluateAll((bs) => bs.map((b) => b.getAttribute('aria-label') ?? b.textContent?.trim() ?? ''));
    if (labels.join() !== 'Print barcode') qa.deviation(3, 'Only the barcode icon is left', `buttons left: ${labels.join(', ') || buttons.join(', ')}`);
  });

  await qa.step(4, async () => {
    await adm.open();
    const after = await adm.census();
    expect(n(after['In house'])).toBe(n(before['In house']) - 1);
    expect(n(after.Occupied)).toBe(n(before.Occupied) - 1);
    await expect(adm.stripCard(bed)).toBeVisible();
  });

  await qa.step(5, async () => {
    await dis.open();
    await expect(await dis.cell(dis.rows().first(), 'Discharge no')).toHaveText(/^DIS-/);
  });
});

qaTest('TC-APP004-013', async ({ page, qa }) => {
  const dis = new DischargesPage(page);

  await qa.step(1, async () => {
    await page.goto('/id/adt');
    await page.getByRole('main').getByRole('link', { name: 'Discharge', exact: true }).click();
    await expect(dis.heading).toBeVisible();
    await expect(dis.main.getByText('Patients who have left, with length of stay.')).toBeVisible();
    await expect(dis.table.getByRole('columnheader')).toHaveText(['Discharge no', 'Admitted', 'Discharged', 'Length of stay']);
    const discharged = await dis.rows().evaluateAll((rs) => rs.map((r) => r.querySelectorAll('td')[2]?.textContent?.trim() ?? ''));
    const times = discharged.map((x) => Date.parse(x));
    expect([...times].sort((a, b) => b - a)).toEqual(times);
  });

  qa.notRun(2, 'needs a discharge after exactly 3 days; stays of this run last minutes (precondition not on the site)');

  await qa.step(3, async () => {
    const first = await dis.rows().first().innerText();
    await dis.main.getByRole('button', { name: 'Next page' }).click();
    await expect(dis.rows().first()).not.toHaveText(first);
  });
});

qaTest('TC-APP004-021', async ({ page, qa }) => {
  const adm = new AdmissionsPage(page);
  const bed = await newBed(page, qa, 'QA-101');
  const name = qa.name('QA-INP Tidak Terdaftar');
  await adm.open();

  await qa.step(1, async () => {
    await adm.admitButton.click();
    const field = adm.wizard.getByRole('textbox', { name: 'Patient name' });
    await expect(field).toBeVisible();
    await expect(adm.wizard.getByRole('combobox', { name: /Patient/ })).toHaveCount(0);
    qa.deviation(1, 'A search of registered patients by MRN or name, not a free text field', '"Patient name" is a free text field');
    await adm.wizard.getByRole('button', { name: 'Cancel' }).first().click();
  });

  await qa.step(2, async () => {
    const mark = await toastMark(page);
    await adm.admit(name, bed);
    expect(await toastsSince(page, mark)).toContain('Patient admitted');
    qa.deviation(2, 'Refused: the person must be registered first', 'admitted (toast "Patient admitted")');
  });

  await qa.step(3, async () => {
    const row = await adm.stay(name);
    if (!/MRN-/.test(await row.innerText())) qa.deviation(3, 'The MRN is shown with the name', 'the stay has no MRN');
  });
});

qaTest('TC-APP004-025', async ({ page, qa }) => {
  const adm = new AdmissionsPage(page);
  const bed = await newBed(page, qa, 'QA-101');
  await adm.open();
  await adm.admitButton.click();
  const field = adm.wizard.getByRole('textbox', { name: 'Patient name' });

  await qa.step(1, () => expect(adm.wizard.getByRole('button', { name: 'Next' })).toBeDisabled());

  await qa.step(2, async () => {
    await field.fill('     ');
    await expect(adm.wizard.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  await qa.step(3, async () => {
    await field.fill(`QA-INP ${qa.token()} ${'a'.repeat(300)}`.slice(0, 300));
    await adm.next();
    await adm.pickBed(adm.wizard.getByRole('combobox', { name: 'Bed' }), bed);
    await adm.next();
    const mark = await toastMark(page);
    await adm.wizard.getByRole('button', { name: 'Admit' }).click();
    const toasts = await toastsAfter(page, mark);
    expect(toasts).not.toContain('Patient admitted');
    if (!toasts.some((x) => /length|long|characters|limit/i.test(x))) {
      qa.deviation(3, 'Refused with a message that names the length limit', `refused with "${toasts.join(' / ')}"`);
    }
  });
});

qaTest('TC-APP004-027', async ({ page, qa }) => {
  const adm = new AdmissionsPage(page);
  const bedX = await newBed(page, qa, 'QA-199', { active: false });
  await adm.open();

  await qa.step(1, async () => {
    if (await adm.stripCard(bedX).count()) qa.deviation(1, 'QA-199 is not offered', 'the switched-off bed is in the "Vacant beds" strip');
  });

  await qa.step(2, async () => {
    await adm.admitButton.click();
    await adm.wizard.getByRole('textbox', { name: 'Patient name' }).fill(qa.name('QA-INP Pasien Satu'));
    await adm.next();
    const field = adm.wizard.getByRole('combobox', { name: 'Bed' });
    await field.fill(bedX);
    const list = page.locator(`#${await field.getAttribute('aria-controls')}`);
    const offered = list.getByRole('option').filter({ hasText: bedX });
    await expect(offered.or(adm.wizard.getByText('No vacant bed matches'))).toBeVisible();
    if (await offered.count()) qa.deviation(2, '"No vacant bed matches"', 'the switched-off bed is offered');
  });

  qa.notRun(3, 'needs a branch with more than 100 vacant beds; Podomoro has fewer (precondition not on the site)');
});

qaTest('TC-APP004-030', async ({ page, qa }) => {
  const adm = new AdmissionsPage(page);
  const beds = new BedsPage(page);
  const bed2 = await newBed(page, qa, 'QA-102');

  await qa.step(1, async () => {
    await beds.search(bed2);
    const headers = await beds.table.getByRole('columnheader').allInnerTexts();
    if (!headers.some((h) => /gender/i.test(h))) qa.deviation(1, 'The tick is shown for each bed', 'the bed list and the admit dialog do not show "Cross-gender"');
  });

  await qa.step(2, async () => {
    await adm.open();
    await adm.admitButton.click();
    const fields = await adm.wizard.getByRole('textbox').or(adm.wizard.getByRole('combobox')).count();
    const sex = await adm.wizard.getByText(/sex|gender/i).count();
    if (!sex) qa.deviation(2, "The dialog asks for or knows the patient's sex and checks it against the room", `the wizard asks for name and number only (${fields} fields), no sex`);
    await adm.wizard.getByRole('button', { name: 'Cancel' }).first().click();
  });
});

qaTest('TC-APP004-031', async ({ page, qa }) => {
  const adm = new AdmissionsPage(page);
  await adm.open();

  await qa.step(1, async () => {
    await adm.admitButton.click();
    const labels = /doctor|ward|room|class|diagnosis|payer|source|time/i;
    const found: string[] = [];
    for (let s = 0; s < 3; s++) {
      for (const t of await adm.wizard.locator('label, .field-label').allInnerTexts()) if (labels.test(t)) found.push(t);
      if (s === 0) await adm.wizard.getByRole('textbox', { name: 'Patient name' }).fill(qa.name('QA-INP Pasien Satu'));
      const next = adm.wizard.getByRole('button', { name: 'Next' });
      if ((await next.count()) && (await next.isEnabled())) await adm.next();
    }
    if (!found.length) qa.deviation(1, 'Fields are present', 'only patient name, admission number and bed are asked');
    await adm.wizard.getByRole('button', { name: 'Cancel' }).first().click();
  });

  await qa.step(2, async () => {
    qa.deviation(2, 'The admission time can be set to the real time', 'no time field: the admission time is the moment of saving');
  });
});

qaTest('TC-APP004-032', async ({ page, qa }) => {
  const adm = new AdmissionsPage(page);
  const bed = await newBed(page, qa, 'QA-102');
  const mistake = qa.name('QA-INP Salah Admit');
  const pt2 = qa.name('QA-INP Pasien Dua');
  await adm.open();
  await adm.admit(mistake);
  await adm.admit(pt2, bed);
  await adm.markBillingCleared(await adm.stay(pt2));
  const row2 = await adm.stay(pt2);
  await row2.getByRole('button', { name: 'Discharge' }).click();
  await page.getByRole('dialog', { name: 'Discharge' }).getByRole('button', { name: 'Discharge', exact: true }).click();
  await expect(toastLocator(page, /^Discharge recorded — approval chain started$/)).toBeVisible();
  await page.getByRole('dialog', { name: 'Discharge' }).getByRole('button', { name: 'Close' }).click();

  await qa.step(1, async () => {
    const row = await adm.stay(mistake);
    await expect(row.getByRole('button', { name: /cancel/i })).toHaveCount(0);
    qa.deviation(1, 'A cancel action with a reason', 'no cancel; "Discharge" is disabled without a bed');
  });

  qa.notRun(2, 'needs the next day; the stay stays counted (no cancel exists, step 1)');

  await qa.step(3, async () => {
    const row = await adm.stay(pt2);
    await expect(row.getByRole('button', { name: /reopen/i })).toHaveCount(0);
    qa.deviation(3, 'A reopen action, or a note that the patient must be admitted again', 'only the barcode button is left');
  });
});

qaTest('TC-APP004-034', async ({ page, qa }) => {
  const adm = new AdmissionsPage(page);
  const bedX = await newBed(page, qa, 'QA-199', { active: false });
  await adm.open();
  let before = await adm.census();

  await qa.step(1, async () => {
    // Exact figures need a branch with only the workbook's beds; the shared branch has more.
    for (const k of ['In house', 'Occupied', 'Vacant'] as const) expect(before[k]).toMatch(/^\d+$/);
    qa.note(1, `figures on the shared branch: ${JSON.stringify(before)} (the workbook's 3/2/2/50% assume its beds only)`);
  });

  await qa.step(2, async () => {
    before = await adm.census();
    await adm.admit(qa.name('QA-INP Pasien Satu'), bedX);
    await adm.open();
    const after = await adm.census();
    expect(n(after['In house'])).toBe(n(before['In house']) + 1);
    expect(n(after.Occupied)).toBe(n(before.Occupied) + 1);
    expect(n(after.Vacant)).toBe(n(before.Vacant) - 1);
  });

  qa.notRun(3, 'needs a branch with no bed at all; U1 works on Podomoro only');
});

qaTest('TC-APP004-037', async ({ page, qa }) => {
  const adm = new AdmissionsPage(page);
  const bed = await newBed(page, qa, 'QA-101');
  const name = qa.name('QA-INP Pasien Satu');
  await adm.open();
  await adm.admit(name, bed);
  const d = page.getByRole('dialog', { name: 'Discharge' });

  await qa.step(1, async () => {
    await (await adm.stay(name)).getByRole('button', { name: 'Discharge' }).click();
    const mark = await toastMark(page);
    await d.getByRole('button', { name: 'Discharge', exact: true }).click();
    const toasts = await toastsAfter(page, mark);
    expect(toasts.length).toBeGreaterThan(0);
    expect(toasts).not.toContain('Discharge recorded — approval chain started');
    await expect(d.getByRole('alert').or(d.locator('[data-variant="destructive"]')).first()).toBeVisible();
    qa.note(1, `refusal: "${toasts.join(' / ')}"`);
    await d.getByRole('button', { name: 'Close' }).click();
    await expect(await adm.cell(await adm.stay(name), 'Status')).not.toContainText('Discharged');
  });

  await qa.step(2, async () => {
    await adm.markBillingCleared(await adm.stay(name));
    await (await adm.stay(name)).getByRole('button', { name: 'Discharge' }).click();
    await d.getByRole('button', { name: 'Discharge', exact: true }).click();
    await expect(toastLocator(page, /^Discharge recorded — approval chain started$/)).toBeVisible();
  });
});

qaTest('TC-APP004-043', async ({ page, qa }) => {
  const dis = new DischargesPage(page);
  const adm = new AdmissionsPage(page);

  await qa.step(1, async () => {
    await dis.open();
    const headers = await dis.table.getByRole('columnheader').allInnerTexts();
    if (!headers.some((h) => /patient|admission/i.test(h))) {
      qa.deviation(1, "The patient's name and admission number are shown and can be searched", `columns ${headers.join(', ')}; no search`);
    }
  });

  await qa.step(2, async () => {
    const headers = await dis.table.getByRole('columnheader').allInnerTexts();
    if (!headers.some((h) => /bed|nurse|user|reason|outcome/i.test(h))) {
      qa.deviation(2, 'Shown', 'no bed, user or way of leaving in the list');
    }
  });

  await qa.step(3, async () => {
    const bed = await newBed(page, qa, 'QA-101');
    const name = qa.name('QA-INP Pasien Satu');
    await adm.open();
    await adm.admit(name, bed);
    await (await adm.stay(name)).getByRole('button', { name: 'Discharge' }).click();
    const d = page.getByRole('dialog', { name: 'Discharge' });
    const fields = await d.getByRole('textbox').or(d.getByRole('combobox')).count();
    if (fields <= 1) qa.deviation(3, 'They can be filled', 'the dialog asks only for an optional discharge number');
    await d.getByRole('button', { name: 'Close' }).click();
  });
});

qaTest('TC-APP004-054', async ({ page, qa }) => {
  const adm = new AdmissionsPage(page);
  const beds = new BedsPage(page);
  const scripts: string[] = [];
  page.on('dialog', async (d) => {
    scripts.push(d.message());
    await d.dismiss();
  });
  const t = qa.token();
  const no = `QA-101-${t}`;
  const description = '<img src=x onerror=alert(1)>';
  const name = `<script>alert(1)</script> ${t}`;
  const number = `<b>1</b>-${t}`;

  await qa.step(1, async () => {
    await beds.open();
    await beds.add({ no, description });
    await adm.open();
    await adm.admit(name, no, number);
  });

  await qa.step(2, async () => {
    await adm.open();
    const row = await adm.stay(t);
    await expect(row.getByRole('paragraph').first()).toHaveText(name);
    expect(await adm.admissionNo(row)).toBe(number);
    await beds.open();
    await beds.search(no);
    await expect(await beds.cell(beds.row(no), 'Description')).toHaveText(description);
    await adm.open();
    await (await adm.stay(t)).getByRole('button', { name: 'Transfer' }).click();
    await expect(page.getByRole('dialog', { name: 'Transfer bed' })).toContainText(name);
    await page.getByRole('dialog', { name: 'Transfer bed' }).getByRole('button', { name: 'Cancel' }).last().click();
    expect(scripts).toEqual([]);
  });

  await qa.step(3, async () => {
    for (const term of ['%', '_']) {
      await adm.search(term);
      await expect(adm.table).toBeVisible();
      await beds.open();
      await beds.search(term);
      await expect(beds.table).toBeVisible();
      await adm.open();
    }
    expect(scripts).toEqual([]);
  });
});
