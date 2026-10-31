import { expect, type Page } from '@playwright/test';
import type { Qa } from '../../../../fixtures/e2e';
import { toastLocator } from '../../../../lib/assertions';
import { AdmissionsPage, BedsPage, DischargesPage } from '../../../../pages/inpatient/InpatientPages';
import { NotOffered } from '../../../../lib/not-offered';

/**
 * Steps of 04-inpatient.xlsx used by several chains, written as in
 * tests/modules/04-inpatient/admissions.spec.ts but on the chain's own patient
 * and beds.
 */
export const DESCRIPTION = 'QA Kelas 1';
const n = (s: string) => Number(s.replace(/[^\d.-]/g, ''));

/** A bed of the run (the workbook's QA-101, QA-102 … made unique). */
export async function newBed(page: Page, qa: Qa, excelNo: string): Promise<string> {
  const beds = new BedsPage(page);
  const no = qa.bed(excelNo);
  await beds.open();
  await beds.add({ no, description: DESCRIPTION });
  return no;
}

/** TC-APP004-004: admits `name` into `bed` through the three-step dialog. */
export async function admitSteps(page: Page, qa: Qa, name: string, bed: string): Promise<void> {
  const adm = new AdmissionsPage(page);
  const w = adm.wizard;
  await adm.open();
  const before = await adm.census();
  await qa.step(1, async () => {
    await page.goto('/id/adt');
    await page.getByRole('main').getByRole('link', { name: 'Open admissions' }).click();
    await adm.admitButton.click();
    await expect(w.getByText('Three steps: patient, bed, then review.')).toBeVisible();
    await expect(w.getByRole('button', { name: 'Next' })).toBeDisabled();
  });
  await qa.step(2, async () => {
    await w.getByRole('textbox', { name: 'Patient name' }).fill(name);
    await adm.next();
    await expect(w.getByRole('combobox', { name: 'Bed' })).toBeVisible();
  });
  await qa.step(3, async () => {
    await adm.pickBed(w.getByRole('combobox', { name: 'Bed' }), bed);
    await adm.next();
    await expect(w.getByRole('definition')).toHaveText([name, 'Auto-generated if blank', bed]);
  });
  await qa.step(4, async () => {
    await w.getByRole('button', { name: /^(Admit|Saving…)$/ }).click();
    await expect(toastLocator(page, /^Patient admitted$/)).toBeVisible();
    await expect(w).toBeHidden();
  });
  await qa.step(5, async () => {
    const row = await adm.stay(name);
    expect(await adm.admissionNo(row)).toMatch(/^ADM-/);
    await expect(await adm.cell(row, 'Bed')).toHaveText(bed);
    await expect(await adm.cell(row, 'Status')).toContainText('On a bed');
  });
  await qa.step(6, async () => {
    await adm.open();
    const after = await adm.census();
    expect(n(after.Occupied)).toBe(n(before.Occupied) + 1);
    await expect(adm.stripCard(bed)).toHaveCount(0);
  });
}

/** TC-APP004-007: admits `name` into `bed` with a typed admission number. */
export async function admitTypedSteps(page: Page, qa: Qa, name: string, bed: string): Promise<string> {
  const adm = new AdmissionsPage(page);
  const number = qa.code('QA-RI-0001');
  await adm.open();
  await qa.step(1, async () => {
    await adm.admitButton.click();
    await adm.wizard.getByRole('textbox', { name: 'Patient name' }).fill(name);
    await adm.wizard.getByRole('textbox', { name: 'Admission no' }).fill(number);
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
  await qa.step(3, async () => expect(await adm.admissionNo(await adm.stay(name))).toBe(number));
  return number;
}

/** TC-APP004-010: moves the stay of `name` from `from` to `to`. */
export async function transferSteps(page: Page, qa: Qa, name: string, from: string, to: string): Promise<void> {
  const adm = new AdmissionsPage(page);
  const beds = new BedsPage(page);
  await adm.open();
  const admitted = await (await adm.cell(await adm.stay(name), 'Admitted')).innerText();
  const d = page.getByRole('dialog', { name: 'Transfer bed' });
  await qa.step(1, async () => {
    await (await adm.stay(name)).getByRole('button', { name: 'Transfer' }).click();
    await expect(d).toContainText(`${name} · ${from}`);
    await expect(d.getByRole('button', { name: 'Transfer' })).toBeDisabled();
  });
  let offered = true;
  await qa.step(2, async () => {
    try {
      await adm.pickBed(d.getByRole('combobox', { name: 'New bed' }), to);
    } catch (e) {
      if (!(e instanceof NotOffered)) throw e;
      offered = false;
      return qa.note(2, `the new bed ${to} is not offered under "New bed": the picker filters only the first 50 beds it loaded`);
    }
    await expect(d.getByRole('button', { name: 'Transfer' })).toBeEnabled();
  });
  if (!offered) {
    qa.blocked(2, 40);
    qa.blocked(3, 40);
    return;
  }
  await qa.step(3, async () => {
    await d.getByRole('button', { name: 'Transfer' }).click();
    await expect(toastLocator(page, /^Transferred$/)).toBeVisible();
    const row = await adm.stay(name);
    await expect(await adm.cell(row, 'Bed')).toHaveText(to);
    await expect(await adm.cell(row, 'Admitted')).toHaveText(admitted);
  });
  await qa.step(4, async () => {
    await adm.open();
    await expect(adm.stripCard(from)).toBeVisible();
    await expect(adm.stripCard(to)).toHaveCount(0);
  });
  await qa.step(5, async () => {
    await beds.open();
    await beds.search(to);
    await expect(await beds.cell(beds.row(to), 'Patient')).toHaveText(name);
    await beds.search(from);
    await expect(await beds.cell(beds.row(from), 'Patient')).toHaveText('—');
  });
}

/** TC-APP004-012: discharges the stay of `name` on `bed` (its billing is marked cleared first, the precondition). */
export async function dischargeSteps(page: Page, qa: Qa, name: string, bed: string): Promise<void> {
  const adm = new AdmissionsPage(page);
  const dis = new DischargesPage(page);
  await adm.open();
  await adm.markBillingCleared(await adm.stay(name));
  qa.note(1, 'precondition "Billing cleared": marked on the stay of the chain');
  await adm.open();
  const before = await adm.census();
  const d = page.getByRole('dialog', { name: 'Discharge' });
  await qa.step(1, async () => {
    const row = await adm.stay(name);
    const number = await adm.admissionNo(row);
    await row.getByRole('button', { name: 'Discharge' }).click();
    await expect(d).toContainText(`${name} · ${number}`);
    const chain = d.getByText(/^Configured chain has \d+ steps — started on discharge\.$/);
    await expect(chain).toBeVisible();
    const steps = (await chain.innerText()).match(/has (\d+) steps/)![1];
    if (steps !== '7') qa.deviation(1, '"Configured chain has 7 steps" (seed chain)', `the configured chain has ${steps} step(s)`);
  });
  await qa.step(2, async () => {
    await d.getByRole('button', { name: 'Discharge', exact: true }).click();
    await expect(toastLocator(page, /^Discharge recorded — approval chain started$/)).toBeVisible();
    await expect(d.getByRole('button', { name: 'Chain started' })).toBeDisabled();
  });
  await qa.step(3, async () => {
    await d.getByRole('button', { name: 'Close' }).click();
    const status = await adm.cell(await adm.stay(name), 'Status');
    await expect(status).toContainText('Discharged');
    const labels = await (await adm.stay(name)).getByRole('button').evaluateAll((bs) => bs.map((b) => b.getAttribute('aria-label') ?? b.textContent?.trim() ?? ''));
    if (labels.join() !== 'Print barcode') qa.deviation(3, 'Only the barcode icon is left', `buttons left: ${labels.join(', ')}`);
  });
  await qa.step(4, async () => {
    await adm.open();
    const after = await adm.census();
    expect(n(after.Occupied)).toBe(n(before.Occupied) - 1);
    await expect(adm.stripCard(bed)).toBeVisible();
  });
  await qa.step(5, async () => {
    await dis.open();
    await expect(await dis.cell(dis.rows().first(), 'Discharge no')).toHaveText(/^DIS-/);
  });
}
