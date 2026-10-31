import { registerNamesake } from '../../../lib/ambulatory-data';
import { asOnSite } from '../../../lib/i18n';
import type { Browser, Page } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark, toastsSince, SERVER_FAILURE } from '../../../lib/assertions';
import { PASSWORD } from '../../../lib/config';
import { addDays, todayWib } from '../../../lib/dates';
import { INVENTORY } from '../../../lib/inventory-data';
import { PHARMACY, PHARMACY_STORE, stockOf, total } from '../../../lib/pharmacy-data';
import { userLogin } from '../../../lib/qa-data';
import { AppHeader } from '../../../pages/AppHeader';
import { RegisteredPatientsPage } from '../../../pages/ambulatory/RegisteredPatientsPage';
import { AdmissionsPage, BedsPage } from '../../../pages/inpatient/InpatientPages';
import { ItemMasterPage } from '../../../pages/inventory/InventoryE2EPages';
import { LoginPage } from '../../../pages/LoginPage';
import { switchLanguage } from '../shared/language';
import { compact, DispenseWizard, typeAhead, IssueLinesPage } from '../../../pages/pharmacy/PharmacyE2EPages';
import { backToIndonesian, CONFIRMED, confirm, expectRefused, ownItem, patient, sell, stock, storeNote, toastsAfter, toConfirm, type Patient } from './helpers';

/** A server failure: HTTP 500 (toast "Minified React error #441") until 2026-10-30, its failure text since (lib/assertions). */
const serverError = (toasts: string[]) => toasts.some((t) => SERVER_FAILURE.test(t));

/**
 * 05-pharmacy.xlsx, feature "Dispense (/pharmacy/dispense)": counter sales.
 * PT-1 is registered per test; stock is received per test into the
 * stand-in store (helpers.ts).
 */

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

test.afterEach(async ({ page }) => {
  await backToIndonesian(page);
});

const para = PHARMACY.para;
const NO_INTERACTIONS = 'No drug interactions detected for this order.';

/** PT-3: a registered patient admitted by name on a new bed (04 Inpatient's Admissions). */
async function admit(page: Page, qa: Qa, fullName: string): Promise<void> {
  const beds = new BedsPage(page);
  const bed = qa.bed('QA-101');
  await beds.open();
  await beds.add({ no: bed, description: 'QA Kelas 1' });
  const adm = new AdmissionsPage(page);
  await adm.open();
  await adm.admit(fullName, bed);
}

/** PT-2 and PT-3: two registered patients with the same full name; returns both with their MRNs. */
async function twins(page: Page, qa: Qa): Promise<[Patient, Patient]> {
  const reg = new RegisteredPatientsPage(page);
  const words = PHARMACY.twins.name.split(' ');
  const last = `${words.pop()} ${qa.token()}`;
  for (let i = 0; i < 2; i++) {
    await reg.open();
    const d = await reg.openRegister();
    await reg.fillRegister({ visitType: 'Outpatient', firstName: words.join(' '), lastName: last }, d);
    await registerNamesake(page, reg.registerButton(d), `${words.join(' ')} ${last}`);
    await expect(d).toBeHidden();
  }
  await reg.search(last);
  const rows = reg.row(last);
  await expect(rows).toHaveCount(2);
  const out: Patient[] = [];
  for (const r of await rows.all()) {
    out.push({ mrn: (await (await reg.cell(r, 'MRN')).innerText()).trim(), fullName: (await (await reg.cell(r, 'Full name')).innerText()).trim() });
  }
  return [out[0], out[1]];
}

qaTest('TC-APP005-007', async ({ page, qa }) => {
  const w = new DispenseWizard(page);
  await stock(page, qa);
  const pt1 = await patient(page, qa);
  const before = await stockOf(page, para.code);

  await qa.step(1, async () => {
    await page.goto('/id/pharmacy');
    await page.getByRole('main').getByRole('link', { name: 'Dispense', exact: true }).first().click();
    await expect(w.marker('Select items')).toBeVisible();
    await expect(w.main.getByText('No medical record selected.', { exact: true })).toBeVisible();
    await expect(w.next).toBeDisabled();
  });

  await qa.step(2, async () => {
    await w.searchPatient(pt1.fullName);
    await expect(w.patientResults().filter({ hasText: `${pt1.fullName} · ${pt1.mrn}` })).toHaveCount(1);
  });

  await qa.step(3, async () => {
    await w.patientResults().filter({ hasText: pt1.mrn }).click();
    await expect(w.main.getByText(`${pt1.fullName} MRN ${pt1.mrn}`, { exact: true })).toBeVisible();
  });

  await qa.step(4, async () => {
    await w.addItem(para.code);
    await expect(w.selectedCount()).toHaveText(/^(Selected|Dipilih) \(1\)$/i);
    await expect(w.selected()).toContainText([para.name]);
  });

  await qa.step(5, async () => {
    await w.goNext('Set quantities');
    await w.setQuantities(para.name, { requested: '2', issued: '2' });
    await w.goNext('Drug order alerts');
    await expect(w.main.getByText(NO_INTERACTIONS, { exact: true })).toBeVisible();
  });

  await qa.step(6, async () => {
    await w.goNext('Confirm');
    await expect(w.main.getByText(`${pt1.fullName} MRN ${pt1.mrn}`, { exact: true })).toBeVisible();
    await expect(w.visit).toHaveValue(/outpatient/i);
    await expect(w.store).toBeVisible();
  });

  await qa.step(7, async () => {
    storeNote(qa, 7);
    expect(await confirm(page, w)).toContain(CONFIRMED);
    await expect(w.main.getByText('Issued 2 of 2', { exact: true })).toBeVisible();
  });

  await qa.step(8, async () => {
    await w.done.click();
    if (!(await w.expectAfterDone())) qa.deviation(8, 'Wizard is empty and ready for the next sale', `the items are cleared but the patient stays selected ("${pt1.fullName} MRN ${pt1.mrn}")`);
  });

  const after = await stockOf(page, para.code);
  expect(total(before) - total(after)).toBe(2);
  qa.notRun(8, 'the RX- invoice of the final check: read in 14 Hospital Accounts');
});

qaTest('TC-APP005-008', async ({ page, qa }) => {
  const w = new DispenseWizard(page);
  const reg = new RegisteredPatientsPage(page);
  await stock(page, qa);
  const t = qa.token();
  const name = `QA-PHA Pasien Baru ${t}`;

  await qa.step(1, async () => {
    await w.open();
    await w.searchPatient(name);
    await expect(w.main.getByText('No medical record matches.', { exact: true })).toBeVisible();
  });

  await qa.step(2, async () => {
    await w.main.getByRole('link', { name: 'Register on the patient form' }).click();
    await expect(page).toHaveURL(/\/registration\/patients\?next=/);
    const note = page.getByText('Registration saves this walk-in. The pharmacy wizard continues with the saved patient.');
    if (!(await note.isVisible({ timeout: 5_000 }).catch(() => false))) {
      qa.deviation(2, 'Note "Registration saves this walk-in. The pharmacy wizard continues with the saved patient."', 'the note is not shown on the patient form');
    }
  });

  let mrn = '';
  await qa.step(3, async () => {
    const d = reg.registerDialog();
    if (!(await d.isVisible())) await reg.openRegister();
    await reg.fillRegister({ visitType: 'Outpatient', firstName: 'QA-PHA Pasien', lastName: `Baru ${t}` }, d);
    await reg.registerButton(d).click();
    await expect(page.getByText('Patient registered', { exact: true }).first()).toBeVisible();
    if (!/\/pharmacy\/dispense/.test(page.url())) {
      await page.waitForURL(/\/pharmacy\/dispense/, { timeout: 10_000 }).catch(() => {});
    }
    if (!/\/pharmacy\/dispense/.test(page.url())) {
      qa.deviation(3, 'Back on the Dispense wizard with the new patient selected', `stays on ${new URL(page.url()).pathname}`);
      const p = await reg.find(`Baru ${t}`);
      mrn = p.mrn;
      await w.open();
      await w.pickPatient(p);
      return;
    }
    const shown = w.main.getByText(new RegExp(`^${name} MRN (\\S+)$`));
    await expect(shown).toBeVisible();
    mrn = (await shown.innerText()).split(' MRN ')[1];
  });
  qa.note(3, `system-issued MRN ${mrn}`);

  await qa.step(4, async () => {
    await w.addItem(para.code);
    await w.goNext('Set quantities');
    await w.goNext('Drug order alerts');
    await w.goNext('Confirm');
    expect(await confirm(page, w)).toContain(CONFIRMED);
  });
});

qaTest('TC-APP005-009', async ({ page, qa }) => {
  const w = new DispenseWizard(page);
  await stock(page, qa, [para, PHARMACY.ibu]);
  const pt1 = await patient(page, qa);

  await qa.step(1, async () => {
    await w.open();
    await w.pickPatient(pt1);
    await w.addItem(para.code);
    await w.addItem(PHARMACY.ibu.code);
    await expect(w.selectedCount()).toHaveText(/^(Selected|Dipilih) \(2\)$/i);
  });

  await qa.step(2, async () => {
    await w.selected().filter({ hasText: PHARMACY.ibu.code }).getByRole('button', { name: 'Remove' }).click();
    await expect(w.selectedCount()).toHaveText(/^(Selected|Dipilih) \(1\)$/i);
    await w.addItem(PHARMACY.ibu.code);
    await expect(w.selectedCount()).toHaveText(/^(Selected|Dipilih) \(2\)$/i);
  });

  await qa.step(3, async () => {
    await w.goNext('Set quantities');
    await w.setQuantities(para.name, { requested: '2', issued: '2' });
    await w.setQuantities(PHARMACY.ibu.name, { requested: '1', issued: '1' });
    await w.goNext('Drug order alerts');
    await expect(w.main.getByText(NO_INTERACTIONS, { exact: true })).toBeVisible();
  });

  await qa.step(4, async () => {
    await w.goNext('Confirm');
    expect(await confirm(page, w)).toContain(CONFIRMED);
    for (const [it, n] of [[para, 2], [PHARMACY.ibu, 1]] as const) {
      const label = w.main.getByRole('listitem').filter({ hasText: it.name });
      await expect(label).toContainText(`Issued ${n} of ${n}`);
      await expect(label.getByRole('img', { name: it.code })).toBeVisible();
    }
  });

  await qa.step(5, async () => {
    await page.evaluate(() => {
      (window as unknown as { __printed: number }).__printed = 0;
      window.print = () => {
        (window as unknown as { __printed: number }).__printed++;
      };
    });
    await w.main.getByRole('button', { name: 'Print labels' }).click();
    expect(await page.evaluate(() => (window as unknown as { __printed: number }).__printed)).toBe(1);
    qa.note(5, 'the browser print dialog was opened (window.print called); the print preview itself is not inspected');
  });

  await qa.step(6, async () => {
    await w.done.click();
    if (!(await w.expectAfterDone())) qa.deviation(6, 'Empty wizard', 'the items are cleared but the patient stays selected');
  });
  qa.notRun(6, 'the single invoice of the final check: read in 14 Hospital Accounts');
});

qaTest('TC-APP005-010', async ({ qa }) => {
  for (const s of [1, 2, 3]) qa.blocked(s, 27);
  test.skip(true, 'Blocker 27 (found by automation, docs/qa/blockers-found.md): QA-KIT cannot be saved, "Save kit" answers HTTP 500');
});

qaTest('TC-APP005-011', async ({ page, qa }) => {
  const w = new DispenseWizard(page);
  await stock(page, qa);
  const pt1 = await patient(page, qa);
  const items = new ItemMasterPage(page);
  const t = qa.token();
  const inactive = { code: `QA-INACTIVE-${t}`, name: `QA-INACTIVE Tablet ${t}` };
  await items.open();
  const d = await items.openAdd();
  await items.fill(d, { ...inactive, active: false });
  const mark = await toastMark(page);
  await d.getByRole('button', { name: 'Save' }).click();
  await expect.poll(() => toastsSince(page, mark)).toContain('Item added.');
  const dialog = page.getByRole('dialog', { name: 'Scan item code' });

  await qa.step(1, async () => {
    await w.open();
    await w.pickPatient(pt1);
    await w.itemSearch.fill('paracet');
    await expect(w.itemResults().first()).toBeVisible();
    for (const r of await w.itemResults().allInnerTexts()) expect(r.toLowerCase()).toContain('paracet');
  });

  await qa.step(2, async () => {
    await w.itemSearch.fill('QA-INACTIVE');
    await expect(w.itemResults().filter({ hasText: inactive.code }).or(w.main.getByText('No matching items.'))).toBeVisible();
    await expect(w.itemResults().filter({ hasText: inactive.code })).toHaveCount(0);
  });

  await qa.step(3, async () => {
    await w.itemSearch.fill('zzzz');
    await expect(w.main.getByText('No matching items.', { exact: true })).toBeVisible();
  });

  await qa.step(4, async () => {
    await w.scan.click();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Scan a barcode or type the exact code and press Enter.', { exact: true })).toBeVisible();
  });

  await qa.step(5, async () => {
    const input = dialog.getByRole('textbox');
    await input.fill(para.code);
    await input.press('Enter');
    await expect(w.selected().filter({ has: page.getByText(para.code, { exact: true }) })).toHaveCount(1);
  });

  await qa.step(6, async () => {
    if (!(await dialog.isVisible())) await w.scan.click();
    const m = await toastMark(page);
    const input = dialog.getByRole('textbox');
    await input.fill('QA-DOES-NOT-EXIST');
    await input.press('Enter');
    expect(await toastsAfter(page, m)).toContain('No catalog item found for that code.');
    await expect(w.selected()).toHaveCount(1);
  });
});

qaTest('TC-APP005-012', async ({ page, qa }) => {
  await stock(page, qa, [para, PHARMACY.omep]);
  const pt1 = await patient(page, qa);
  const w = new DispenseWizard(page);

  await qa.step(1, async () => {
    await w.open();
    await w.pickPatient(pt1);
    await w.addItem(para.code);
    await w.addItem(PHARMACY.omep.code);
    await w.goNext('Set quantities');
    await w.goNext('Drug order alerts');
    await expect(w.main.getByText(/Soft warning/)).toHaveCount(0);
    qa.note(1, 'no soft warning is shown: the interaction pairs are not on the site');
  });
  for (const s of [1, 2, 3]) qa.blocked(s, 22);

  await qa.step(4, async () => {
    await w.goNext('Confirm');
    expect(await confirm(page, w)).toContain(CONFIRMED);
  });
});

qaTest('TC-APP005-015', async ({ page, qa }) => {
  await stock(page, qa);
  const pt1 = await patient(page, qa);
  let w: DispenseWizard;

  await qa.step(1, async () => {
    w = new DispenseWizard(page);
    await w.open();
    await w.pickPatient(pt1);
    await w.addItem(para.code);
    await w.goNext('Set quantities');
    await w.setQuantities(para.name, { requested: '10', issued: '10', discount: '10' });
    const field = w.discount(para.name);
    const [min, max, step] = await Promise.all(['min', 'max', 'step'].map((a) => field.getAttribute(a)));
    qa.note(1, `Discount % field: min=${min} max=${max} step=${step}`);
    if (min !== '0' || max !== '100' || step !== '0.01') qa.deviation(1, 'Accepts 0 to 100 with two decimals', `min=${min} max=${max} step=${step}`);
    await expect(field).toHaveValue('10');
  });

  await qa.step(2, async () => {
    await w.goNext('Drug order alerts');
    await w.goNext('Confirm');
    expect(await confirm(page, w)).toContain(CONFIRMED);
  });

  qa.notRun(3, 'the RX- invoice of a sale with a 10% discount is read at the cashier in TC-APP014-034');
});

qaTest('TC-APP005-021', async ({ page, qa }) => {
  await stock(page, qa);
  const pt1 = await patient(page, qa);
  const before = await stockOf(page, para.code);
  let w: DispenseWizard;

  await qa.step(1, async () => {
    w = await toConfirm(page, pt1, [{ item: para, requested: '5', issued: '3', discount: '5', generic: true }]);
    // The site writes "Generik"; the line is compared in English.
    expect((await w.summaryCompact()).map((l) => l.replace(/Generik$/, 'Generic'))).toEqual([compact(`${para.name} 3/5 · Generic`)]);
  });

  await qa.step(2, async () => {
    await w.goBack('Drug order alerts');
    await w.goBack('Set quantities');
    if (!(await w.back.isDisabled())) await w.goBack('Select items');
    else qa.note(2, 'Back is disabled on "Set quantities"');
    await expect(w.main.getByText(`${pt1.fullName} MRN ${pt1.mrn}`, { exact: true })).toBeVisible();
    await expect(w.selected().filter({ has: page.getByText(para.code, { exact: true }) })).toHaveCount(1);
    qa.note(2, 'two clicks reach "Set quantities"; a third click reaches "Select items"');
  });

  await qa.step(3, async () => {
    await w.goNext('Set quantities');
    await expect(w.requested(para.name)).toHaveValue('5');
    await expect(w.issued(para.name)).toHaveValue('3');
    await expect(w.discount(para.name)).toHaveValue('5');
    await expect(w.generic(para.name)).toBeChecked();
    await w.goNext('Drug order alerts');
    await w.goNext('Confirm');
  });

  await qa.step(4, async () => {
    await w.pickStore(PHARMACY_STORE.code);
    const mark = await toastMark(page);
    await w.confirm.dblclick();
    const toasts = await toastsAfter(page, mark, 20_000);
    expect(toasts.filter((t) => t === CONFIRMED)).toHaveLength(1);
  });

  expect(total(before) - total(await stockOf(page, para.code))).toBe(3);
});

qaTest('TC-APP005-026', async ({ page, qa }) => {
  await stock(page, qa);
  const w = new DispenseWizard(page);

  await qa.step(1, async () => {
    await w.open();
    await w.addItem(para.code);
    await expect(w.selectedCount()).toHaveText(/^(Selected|Dipilih) \(1\)$/i);
    await expect(w.main.getByText('No medical record selected.', { exact: true })).toBeVisible();
  });

  await qa.step(2, async () => {
    await expect(w.next).toBeDisabled();
  });
});

qaTest('TC-APP005-027', async ({ page, qa }) => {
  await stock(page, qa);
  const pt3 = await patient(page, qa, PHARMACY.twins.name);
  await admit(page, qa, pt3.fullName);
  const before = await stockOf(page, para.code);
  const w = new DispenseWizard(page);

  await qa.step(1, async () => {
    await w.open();
    await w.pickPatient(pt3, pt3.mrn);
  });

  await qa.step(2, async () => {
    await w.addItem(para.code);
    await w.goNext('Set quantities');
    await w.goNext('Drug order alerts');
    await w.goNext('Confirm');
    await expect(w.summary()).toHaveCount(1);
  });

  await qa.step(3, async () => {
    expectRefused(qa, 3, await confirm(page, w), 'Patient has been admitted');
  });

  expect(total(await stockOf(page, para.code))).toBe(total(before));
});

qaTest('TC-APP005-028', async ({ page, qa }) => {
  await stock(page, qa);
  const [pt2, pt3] = await twins(page, qa);
  await admit(page, qa, pt3.fullName);
  const w = new DispenseWizard(page);
  let blocked = false;

  await qa.step(1, async () => {
    await w.open();
    await w.searchPatient(pt2.fullName);
    await expect(w.patientResults()).toHaveCount(2);
    const found = (await w.patientResults().allInnerTexts()).map((t) => t.trim()).sort();
    expect(found).toEqual([`${pt2.fullName} · ${pt2.mrn}`, `${pt3.fullName} · ${pt3.mrn}`].sort());
  });

  await qa.step(2, async () => {
    await w.patientResults().filter({ hasText: pt2.mrn }).click();
    await expect(w.main.getByText(`${pt2.fullName} MRN ${pt2.mrn}`, { exact: true })).toBeVisible();
  });

  await qa.step(3, async () => {
    await w.addItem(para.code);
    await w.goNext('Set quantities');
    await w.goNext('Drug order alerts');
    await w.goNext('Confirm');
    const toasts = await confirm(page, w);
    if (serverError(toasts)) {
      // "Confirm" answers HTTP 500 for PT-2 while PT-3 of the same name is admitted (found blocker 52).
      blocked = true;
      return qa.note(3, `Confirm for PT-2: "${toasts.join(' / ').slice(0, 60)}" (HTTP 500; PT-3 of the same name is admitted)`);
    }
    // Since 2026-10-31 the sale is refused with a message instead of HTTP 500: recorded as a deviation.
    if (!toasts.includes(CONFIRMED)) qa.deviation(3, 'The sale goes through for PT-2', `refused: "${toasts.join(' / ')}" (PT-3 of the same name is admitted)`);
  });
  if (blocked) qa.blocked(3, 52);
});

qaTest('TC-APP005-029', async ({ page, qa }) => {
  await stock(page, qa, [PHARMACY.ibu, PHARMACY.amlo]);
  const pt1 = await patient(page, qa);
  const w = new DispenseWizard(page);

  await qa.step(1, async () => {
    await w.open();
    await w.pickPatient(pt1);
    await w.addItem(PHARMACY.ibu.code);
    await w.addItem(PHARMACY.amlo.code);
    await w.goNext('Set quantities');
    await w.goNext('Drug order alerts');
    await expect(w.main.getByText(/Hard interaction/)).toHaveCount(0);
    qa.note(1, 'no hard alert is shown: the interaction pairs are not on the site');
  });
  qa.blocked(1, 22);
  qa.blocked(2, 22);

  await qa.step(3, async () => {
    await w.goBack('Set quantities');
    await w.goBack('Select items');
    await w.selected().filter({ hasText: PHARMACY.amlo.code }).getByRole('button', { name: 'Remove' }).click();
    await expect(w.selectedCount()).toHaveText(/^(Selected|Dipilih) \(1\)$/i);
  });

  await qa.step(4, async () => {
    await w.goNext('Set quantities');
    await w.goNext('Drug order alerts');
    await expect(w.main.getByText(NO_INTERACTIONS, { exact: true })).toBeVisible();
  });

  await qa.step(5, async () => {
    await w.goNext('Confirm');
    expect(await confirm(page, w)).toContain(CONFIRMED);
  });
});

qaTest('TC-APP005-030', async ({ page, qa }) => {
  const { ConsultationPage } = await import('../../../pages/clinical/ConsultationPage');
  await stock(page, qa);
  const pt4 = await patient(page, qa, PHARMACY.pt4.name);
  // Precondition: the allergy to Paracetamol is recorded in Patient Care (left pane of Consultation).
  const c = new ConsultationPage(page);
  await c.openFor(pt4);
  const allergy = c.pane.getByRole('textbox', { name: 'Allergy' });
  await allergy.fill('Paracetamol');
  await allergy.locator('xpath=following::button[normalize-space()="Save"][1]').click();
  await expect(page.getByText('Allergy recorded on this patient').first()).toBeVisible();
  const w = new DispenseWizard(page);

  await qa.step(1, async () => {
    await w.open();
    await w.pickPatient(pt4);
    await w.addItem(para.code);
  });

  await qa.step(2, async () => {
    await w.goNext('Set quantities');
    await w.goNext('Drug order alerts');
    const text = (await w.marker('Drug order alerts').locator('xpath=..').innerText()).replace(/\s+/g, ' ');
    if (!/allerg/i.test(text)) qa.deviation(2, 'An allergy warning for Paracetamol', `"Drug order alerts" reads: ${text}`);
  });

  await qa.step(3, async () => {
    await w.goNext('Confirm');
    if (await w.confirm.isEnabled()) qa.deviation(3, 'Confirm is blocked or needs an acknowledgement', '"Confirm dispense" is enabled');
  });
});

qaTest('TC-APP005-031', async ({ page, qa }) => {
  await stock(page, qa, [PHARMACY.ibu, PHARMACY.amlo]);
  const pt1 = await patient(page, qa);

  await qa.step(1, async () => {
    expect(await sell(page, pt1, [{ item: PHARMACY.ibu }])).toContain(CONFIRMED);
  });

  let w: DispenseWizard;
  await qa.step(2, async () => {
    w = new DispenseWizard(page);
    await w.open();
    await w.pickPatient(pt1);
    await w.addItem(PHARMACY.amlo.code);
    await w.goNext('Set quantities');
    await w.goNext('Drug order alerts');
    await expect(w.main.getByText(NO_INTERACTIONS, { exact: true })).toBeVisible();
  });

  await qa.step(3, async () => {
    await w.goNext('Confirm');
    expect(await confirm(page, w)).toContain(CONFIRMED);
  });
});

qaTest('TC-APP005-032', async ({ page, qa }) => {
  const pt1 = await patient(page, qa);
  // QA-PARA is shared and holds the stock of earlier runs, so an item of this test with exactly 20 stands in.
  const it = await ownItem(page, qa, para.code, para.name, [{ quantity: '20', expiry: addDays(todayWib(), 400) }]);
  qa.note(1, `an item of this test (${it.code}, 20 in stock) stands in for QA-PARA, which holds the stock of earlier runs`);
  const il = new IssueLinesPage(page);
  let refusal = '';

  await qa.step(1, async () => {
    const toasts = await sell(page, pt1, [{ item: it, requested: '21', issued: '21' }]);
    expectRefused(qa, 1, toasts, 'not enough stock');
    refusal = toasts.join(' / ');
    if (!refusal.includes(it.code)) qa.deviation(1, 'Refusal names the item code', `"${refusal}"`);
  });

  await qa.step(2, async () => {
    await il.open();
    await il.search.fill(it.name);
    await expect(il.rows().filter({ hasText: it.name })).toHaveCount(0);
    expect(total(await stockOf(page, it.code))).toBe(20);
  });
  qa.notRun(2, 'Hospital Accounts (no new invoice): read in 14 Hospital Accounts');

  await qa.step(3, async () => {
    expect(await sell(page, pt1, [{ item: it, requested: '15', issued: '15' }])).toContain(CONFIRMED);
    expectRefused(qa, 3, await sell(page, pt1, [{ item: it, requested: '10', issued: '10' }]), 'not enough stock');
    qa.note(3, 'a counter sale of 10 stands in for OR-OP: an order of Patient Care names "Paracetamol 500mg Tablet", which is the shared QA-PARA');
  });
  qa.notRun(4, 'OR-OP is not used (see step 3)');
});

qaTest('TC-APP005-033', async ({ page, qa }) => {
  const pt1 = await patient(page, qa);
  const exp = await ownItem(page, qa, 'QA-EXP', 'QA-EXP Tablet', [{ quantity: '20', expiry: todayWib(-1) }]);
  const frz = await ownItem(page, qa, 'QA-FRZ', 'QA-FRZ Tablet', [
    { quantity: '5', expiry: addDays(todayWib(), 30) },
    { quantity: '5', expiry: addDays(todayWib(), 31) },
  ]);
  // Freeze days of BR-A (Podomoro): the Branch field is a type-ahead that opens on another branch.
  const field = () => page.getByRole('main').getByRole('spinbutton', { name: 'Freeze days' });
  const onPodomoro = async () => {
    await page.goto('/id/inventory/stores');
    await typeAhead(page, page.getByRole('main').getByRole('combobox', { name: 'Branch' }), 'Podomoro');
  };
  const freeze = async (days: string) => {
    await onPodomoro();
    await field().fill(days);
    const m = await toastMark(page);
    await page.getByRole('main').getByRole('button', { name: 'Save freeze' }).click();
    return toastsAfter(page, m);
  };
  await onPodomoro();
  const before = await field().inputValue();
  qa.note(1, `Freeze days of Podomoro before the test: ${before}; set back afterwards`);
  expect(await freeze(INVENTORY.freezeDays)).toContain('Freeze limit saved.');

  try {
    await qa.step(1, async () => {
      expectRefused(qa, 1, await sell(page, pt1, [{ item: exp }]), 'not enough stock');
    });

    let sold = true;
    await qa.step(2, async () => {
      const toasts = await sell(page, pt1, [{ item: frz, requested: '5', issued: '5' }]);
      if (serverError(toasts)) {
        // "Confirm" answers HTTP 500 (found blocker 52): with Freeze days set no sale goes through.
        sold = false;
        return qa.note(2, `Confirm with Freeze days ${INVENTORY.freezeDays}: "${toasts.join(' / ').slice(0, 60)}" (HTTP 500), as on every run since 2026-10-15`);
      }
      if (!toasts.includes(CONFIRMED)) qa.deviation(2, 'Confirmed toast', `refused ("${toasts.join(' / ')}"): with Freeze days ${INVENTORY.freezeDays} no sale goes through, not even from a batch expiring in 400 days (seen on 2026-10-15)`);
      expect(toasts).toContain(CONFIRMED);
    });
    if (!sold) {
      qa.blocked(2, 52);
      qa.blocked(3, 52);
    } else await qa.step(3, async () => {
      const s = await stockOf(page, frz.code);
      qa.note(3, `QA-FRZ batches: ${[...s].map(([b, q]) => `${b}=${q}`).join(', ')}`);
      if (s.get(frz.batches[0]) === 0) qa.deviation(3, 'The batch expiring in 31 days is 0; the one expiring in exactly 30 days is still 5', 'the sale was taken from the batch expiring in 30 days (received first), which Freeze days 30 should hold back');
      expect(s.get(frz.batches[1])).toBe(0);
      expect(s.get(frz.batches[0])).toBe(5);
    });

    await qa.step(4, async () => {
      expectRefused(qa, 4, await sell(page, pt1, [{ item: frz }]), 'not enough stock');
    });

    await qa.step(5, async () => {
      expect(await freeze('29')).toContain('Freeze limit saved.');
    });

    let again: string[] = [];
    await qa.step(6, async () => {
      again = await sell(page, pt1, [{ item: frz }]);
      if (!serverError(again) && !again.includes(CONFIRMED)) {
        qa.deviation(6, 'Confirmed toast', `refused ("${again.join(' / ')}"): with Freeze days 29 the batch expiring in 30 days is still held back`);
      }
    });
    if (serverError(again)) qa.blocked(6, 52);
  } finally {
    await freeze(before || '0');
  }
  expect(total(await stockOf(page, exp.code))).toBe(20);
});

qaTest('TC-APP005-034', async ({ page, qa }) => {
  await stock(page, qa);
  const pt1 = await patient(page, qa);
  // The list opens on typing; the stand-in's code prefix is typed and the suggestions read.
  const listed = async (w: DispenseWizard): Promise<string[]> => {
    await w.store.click();
    await w.store.fill('');
    await w.store.pressSequentially(PHARMACY_STORE.code.slice(0, 4), { delay: 20 });
    const list = page.locator(`#${await w.store.getAttribute('aria-controls')}`);
    await list.getByRole('option').first().waitFor({ timeout: 5_000 }).catch(() => {});
    return (await list.getByRole('option').allInnerTexts()).map((s) => s.replace(/\s+/g, ' ').trim());
  };
  const visitDialog = page.getByRole('dialog').filter({ hasText: 'Visit types' });
  const typesButton = () => page.getByRole('main').getByRole('table').getByRole('row').filter({ has: page.getByRole('cell', { name: PHARMACY_STORE.code, exact: true }) }).getByRole('cell').nth(4).getByRole('button');
  let w: DispenseWizard;

  try {
    await qa.step(1, async () => {
      storeNote(qa, 1);
      w = await toConfirm(page, pt1, [{ item: para }]);
      const opts = await listed(w);
      qa.note(1, `Store offers for Outpatient: ${opts.join(' | ') || 'nothing in a list'}`);
      expect(opts.some((o) => o.includes(PHARMACY_STORE.code))).toBe(true);
    });

    await qa.step(2, async () => {
      await w.visit.selectOption({ label: 'Inpatient' });
      const opts = await listed(w);
      qa.note(2, `Store offers for Inpatient: ${opts.join(' | ') || 'nothing in a list'}`);
    });
    qa.blocked(2, 26);

    await qa.step(3, async () => {
      await w.visit.selectOption({ label: 'Outpatient' });
      await w.store.fill('');
      const m = await toastMark(page);
      if (await w.confirm.isDisabled()) {
        qa.deviation(3, 'Toast "Choose a store this visit may dispense from."', '"Confirm dispense" is disabled while Store is empty');
      } else {
        await w.confirm.click();
        const toasts = await toastsAfter(page, m);
        expect(toasts).not.toContain(CONFIRMED);
        if (!toasts.includes('Choose a store this visit may dispense from.')) qa.deviation(3, 'Toast "Choose a store this visit may dispense from."', `toast "${toasts.join(' / ')}"`);
      }
    });

    await qa.step(4, async () => {
      await page.goto('/id/inventory/stores');
      await typesButton().click();
      await visitDialog.getByRole('checkbox', { name: 'Outpatient' }).uncheck();
      const m = await toastMark(page);
      await visitDialog.getByRole('button', { name: 'Save' }).click();
      expect(await toastsAfter(page, m)).toContain('Visit types saved.');
    });

    await qa.step(5, async () => {
      w = await toConfirm(page, pt1, [{ item: para }]);
      await expect(w.visit).toHaveValue(/outpatient/i);
      const opts = await listed(w);
      expect(opts.some((o) => o.includes(PHARMACY_STORE.code))).toBe(false);
      qa.note(5, `Store placeholder "${await w.store.getAttribute('placeholder')}", offers: ${opts.join(' | ') || 'nothing'}`);
    });
  } finally {
    await page.goto('/id/inventory/stores');
    await typesButton().click();
    const out = visitDialog.getByRole('checkbox', { name: 'Outpatient' });
    const inp = visitDialog.getByRole('checkbox', { name: 'Inpatient' });
    if ((await out.isChecked()) && (await inp.isChecked())) await visitDialog.getByRole('button', { name: 'Cancel' }).click();
    else {
      await out.check();
      await inp.check();
      const m = await toastMark(page);
      await visitDialog.getByRole('button', { name: 'Save' }).click();
      expect(await toastsAfter(page, m)).toContain('Visit types saved.');
    }
  }
});

qaTest('TC-APP005-049', async ({ page, qa }) => {
  const pt1 = await patient(page, qa);
  const pt3 = await patient(page, qa, PHARMACY.twins.name);
  await admit(page, qa, pt3.fullName);
  const it = await ownItem(page, qa, para.code, para.name, [{ quantity: '1', expiry: addDays(todayWib(), 400) }]);
  qa.notRun(1, 'the refusals of PHA-JRN-016 (held discount) and PHA-JRN-035 (no price) are fixme cases; not enough stock and an admitted patient are triggered');
  const refusals = async (): Promise<string[]> => [
    (await sell(page, pt1, [{ item: it, requested: '5', issued: '5' }])).join(' / '),
    (await sell(page, pt3, [{ item: it }])).join(' / '),
  ];

  await qa.step(1, async () => {
    const r = await refusals();
    qa.note(1, `English: ${r.map((x) => `"${x}"`).join('; ')}`);
    for (const x of r) expect(x).not.toContain(CONFIRMED);
    if (r.some((x) => /advanceDispense|React error|\d{3} /.test(x))) qa.deviation(1, 'A short sentence without technical words', `raw server text: ${r.join('; ')}`);
  });

  await qa.step(2, () => asOnSite(async () => {
    try {
      await switchLanguage(page, 'ID');
      // The wizard is Indonesian here; it is driven by the labels seen on 2026-10-15
      // ("Cari rekam medis", "Lanjut", "Gudang", "Konfirmasi dispense").
      const sale = async (p: Patient, qty: string | null): Promise<string> => {
        const main = page.getByRole('main');
        await page.goto('/id/pharmacy/dispense');
        await main.getByRole('searchbox').nth(0).fill(p.fullName);
        await main.getByRole('button', { name: 'Cari rekam medis' }).click();
        await main.getByRole('button').filter({ hasText: p.mrn }).click();
        await main.getByRole('searchbox').nth(1).fill(it.code);
        await main.getByRole('listbox').getByRole('button').filter({ has: page.getByText(it.code, { exact: true }) }).first().click();
        await main.getByRole('button', { name: 'Lanjut' }).click();
        await expect(main.getByRole('table')).toBeVisible();
        if (qty) {
          const row = main.getByRole('table').getByRole('row').filter({ hasText: it.name });
          await row.getByRole('spinbutton').nth(0).fill(qty);
          await row.getByRole('spinbutton').nth(1).fill(qty);
        }
        await main.getByRole('button', { name: 'Lanjut' }).click();
        await expect(main.getByRole('table')).toBeHidden();
        await main.getByRole('button', { name: 'Lanjut' }).click();
        const store = main.getByRole('combobox', { name: 'Gudang' });
        await expect(store).toBeVisible();
        await typeAhead(page, store, PHARMACY_STORE.code);
        const m = await toastMark(page);
        await main.getByRole('button', { name: 'Konfirmasi dispense' }).click();
        return (await toastsAfter(page, m, 20_000)).join(' / ');
      };
      const r = [await sale(pt1, '5'), await sale(pt3, null)];
      qa.note(2, `Indonesian: ${r.map((x) => `"${x}"`).join('; ')}`);
      if (r.some((x) => /advanceDispense|React error|not enough stock|Patient has been admitted/.test(x))) qa.deviation(2, 'The same sentences in Indonesian', `English server text: ${r.join('; ')}`);
    } finally {
      await backToIndonesian(page);
    }
  }));
});

/** A page signed in afresh as U1 in its own browser context (signing out there leaves the shared session alone). */
async function freshSession(browser: Browser): Promise<Page> {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  await new LoginPage(page).signIn(userLogin('U1')!, PASSWORD);
  return page;
}

qaTest('TC-APP005-050', async ({ page, browser, qa }) => {
  await stock(page, qa);
  const pt1 = await patient(page, qa);
  const before = await stockOf(page, para.code);
  const tab = await freshSession(browser);
  qa.note(1, 'run in a session of its own (new browser context signed in as U1), so the shared session of the suite stays signed in');
  await installToastRecorder(tab);
  const w = new DispenseWizard(tab);
  await w.open();
  await w.pickPatient(pt1);
  await w.addItem(para.code);
  await w.goNext('Set quantities');
  const other = await tab.context().newPage();

  try {
    await qa.step(1, async () => {
      await other.goto('/id');
      await new AppHeader(other).signOut();
      await expect(other).toHaveURL(/login|sign-?in/i);
    });

    await qa.step(2, async () => {
      const m = await toastMark(tab);
      await w.next.click();
      const toasts = await toastsAfter(tab, m);
      const url = tab.url();
      qa.note(2, `after Next: ${new URL(url).pathname}; toasts "${toasts.join(' / ')}"; step shown: ${(await w.marker('Drug order alerts').isVisible()) ? 'Drug order alerts' : 'other'}`);
      if (!/login|sign-?in/i.test(url) && !toasts.length) qa.deviation(2, 'The user is told, or taken to sign in', 'the wizard moves on with no message');
    });

    await qa.step(3, async () => {
      await new LoginPage(tab).signIn(userLogin('U1')!, PASSWORD);
      await w.open();
      await expect(w.main.getByText('No medical record selected.', { exact: true })).toBeVisible();
      await expect(w.selected()).toHaveCount(0);
    });
  } finally {
    await tab.context().close();
  }
  expect(total(await stockOf(page, para.code))).toBe(total(before));
});
