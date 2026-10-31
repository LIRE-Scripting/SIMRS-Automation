import { expect, type Page } from '@playwright/test';
import type { Qa } from '../../../../fixtures/e2e';
import { Patients, WALKED_IN, walkInName } from '../../../modules/15-emergency/helpers';
import { asOnSite } from '../../../../lib/i18n';

/** Steps of 15-emergency.xlsx used by several chains, as in tests/modules/15-emergency/patients.spec.ts. */

/** TC-APP015-035: a walk-in registered and received; returns the name and the new MRN. */
export async function walkInSteps(page: Page, qa: Qa): Promise<{ fullName: string; mrn: string }> {
  const p = new Patients(page);
  const name = walkInName(qa);
  await qa.step(1, async () => {
    await p.open();
    await expect(p.main.getByRole('button', { name: 'Walk-in ER', exact: true })).toBeVisible();
  });
  await qa.step(2, async () => {
    await p.main.getByRole('button', { name: 'Walk-in ER', exact: true }).click();
    await expect(p.dialog.getByRole('textbox', { name: 'Name' })).toBeVisible();
  });
  await qa.step(3, async () => {
    await p.dialog.getByRole('textbox', { name: 'Name' }).fill(name);
    await p.dialog.getByRole('spinbutton', { name: 'Estimated age (years)' }).fill('25');
    await p.dialog.getByRole('combobox').selectOption({ label: 'IGD' });
    await p.dialog.getByRole('combobox').locator('xpath=following::input[1]').fill(qa.prefix('X IGD 1'));
    expect(await p.click(p.dialog.getByRole('button', { name: 'Receive' }))).toContain(WALKED_IN);
  });
  let mrn = '';
  await qa.step(4, async () => {
    const row = await p.row(name, 'Emergency OP Patients');
    for (const b of ['Triage', 'Bed', 'Consultant', 'Outcome', 'Attach file']) await expect(row.getByRole('button', { name: b, exact: true })).toBeVisible();
    mrn = (await row.innerText()).match(/MRN-\d{4}-[0-9A-F]{8}/)?.[0] ?? '';
    expect(mrn, 'a new MRN on the row').not.toBe('');
  });
  return { fullName: name, mrn };
}

/** TC-APP015-037 steps 1-2: the triage of the encounter is saved with the active category of the branch. */
export async function triageSteps(page: Page, qa: Qa, name: string): Promise<void> {
  const p = new Patients(page);
  let category = '';
  await qa.step(1, async () => {
    const d = await p.openRow(name, 'Triage');
    await expect(d.getByRole('combobox', { name: 'Patient condition' }).locator('option')).toHaveText(['Patient condition', 'Conscious', 'Unconscious', 'Critical']);
    await expect(d.getByRole('combobox', { name: 'Patient status' }).locator('option')).toHaveText(['Patient status', 'Waiting', 'In treatment', 'Referred']);
    // The categories load after the dialog opens; the first one is taken as the site writes it.
    const list = d.getByRole('combobox', { name: 'Triage category' });
    await list.locator('option').nth(1).waitFor({ state: 'attached', timeout: 15_000 });
    category = (await asOnSite(() => list.locator('option').nth(1).innerText())).trim();
  });
  await qa.step(2, async () => {
    const d = p.dialog;
    // By its value: the label read back in English is not always the one the site writes ("Kuning IGD").
    const list = d.getByRole('combobox', { name: 'Triage category' });
    await list.selectOption({ value: (await list.locator('option').nth(1).getAttribute('value')) ?? '' });
    await d.getByRole('combobox', { name: 'Patient condition' }).selectOption('Critical');
    await d.getByRole('combobox', { name: 'Patient status' }).selectOption('Waiting');
    expect(await p.click(d.getByRole('button', { name: 'Save' }))).toContain('Triage saved. This category is now current.');
    await expect(await p.row(name)).toContainText(category);
    qa.note(2, `category "${category}" (the active category of the branch)`);
  });
}
