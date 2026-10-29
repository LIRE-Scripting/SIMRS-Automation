import { toastsSince, toastMark } from '../../../lib/assertions';
import { todayWib, addDays } from '../../../lib/dates';
import { test, expect } from '../../../fixtures/e2e';
import { registerPatient } from '../../../lib/ambulatory-data';
import { RequestsPage } from '../../../pages/bloodbank/BloodBankPages';
import { BLOODBANK } from '../../../lib/bloodbank-data';
import type { Page } from '@playwright/test';
import type { Qa } from '../../../fixtures/e2e';

/**
 * Test cases of 06-transfusion-medicine that end-to-end chains run too (tests/e2e/chains/):
 * each is declared by its module spec with qaTest and called by a chain with the chain's Qa.
 */
export type CaseArgs = { page: Page; qa: Qa };

export const TC_APP006_020 = async ({ page, qa }: CaseArgs): Promise<void> => {
  const req = new RequestsPage(page);
  const p = await registerPatient(page, BLOODBANK.pt1.name, qa.token());
  await req.open();
  const d = req.dialog('New request');

  await qa.step(1, async () => {
    await page.goto('/id/bloodbank');
    await page.getByRole('main').getByRole('link', { name: 'Blood request', exact: true }).click();
    await req.button('New request').click();
    await expect(d).toBeVisible();
    await expect(d.getByRole('heading', { name: 'Patient & clinical' })).toBeVisible();
    await expect(d.getByRole('heading', { name: 'Requested components' })).toBeVisible();
  });

  await qa.step(2, async () => {
    await req.pickPatient(d, p.fullName, p.mrn);
    await expect(d.getByRole('textbox', { name: 'Patient' })).toHaveValue(new RegExp(p.fullName));
    if (!(await d.getByText(p.mrn).count())) qa.deviation(2, "The patient's MRN and name are shown", 'only the name is shown in the field; no MRN');
    await d.getByRole('combobox', { name: 'Department' }).selectOption({ label: `${BLOODBANK.dep1.code} · ${BLOODBANK.dep1.name}` });
    await d.getByRole('textbox', { name: 'Diagnosis' }).fill('Anemia');
  });

  await qa.step(3, async () => {
    await d.getByRole('combobox', { name: 'Component' }).selectOption({ label: 'PRC' });
    await d.getByRole('textbox', { name: 'Units' }).fill('2');
    await d.getByRole('combobox', { name: 'Priority' }).selectOption({ label: 'Elective' });
    await d.getByRole('textbox', { name: 'Required by' }).fill(addDays(todayWib(), 1));
    await d.getByRole('checkbox', { name: 'Cross-match' }).check();
    await d.getByRole('button', { name: 'Add line' }).click();
    await expect(d.getByRole('listitem').filter({ hasText: 'PRC' })).toContainText(/2/);
    await expect(d.getByRole('listitem').filter({ hasText: 'PRC' })).toContainText('Elective');
  });

  const saved = req.savedRequestDialog();
  await qa.step(4, async () => {
    expect(await save(page, d, 'Save request')).toContain('Request saved');
    await expect(saved.getByText(/^RQ\d+$/).first()).toBeVisible();
    const status = (await saved.getByText(/^(Approved|Pending|Rejected)$/).first().innerText()).trim();
    if (status !== 'Approved') qa.deviation(4, 'The form shows a request number and the status "Approved"', `the status is "${status}" (an approval by "Approve" is needed)`);
  });

  await qa.step(5, async () => {
    const print = saved.getByRole('button', { name: 'Print' });
    await expect(print).toBeVisible();
    // The browser's print dialog cannot be driven; only that the sheet is offered is checked.
    await page.evaluate(() => {
      (window as unknown as { print: () => void }).print = () => {};
    });
    await print.click();
  });
};

export const TC_APP006_022 = async ({ page, qa }: CaseArgs): Promise<void> => {
  const req = new RequestsPage(page);
  const { patient, approved } = await savedRequest(page, qa);
  if (!approved) {
    for (const s of [1, 2, 3, 4]) qa.blocked(s, 25);
    for (const s of [5, 6]) qa.blocked(s, 2);
    test.skip(true, 'Blocker 25 (found by automation, docs/qa/blockers-found.md): a request cannot be approved (HTTP 500)');
  }
  await req.open();
  const d = page.getByRole('dialog', { name: 'Cross-match and issue' });

  await qa.step(1, async () => {
    await req.tab('Queue');
    await req.main.getByRole('button', { name: 'Search' }).click();
    const line = req.queueTable().getByRole('row').filter({ hasText: patient.fullName });
    await expect(line).toBeVisible();
    await expect(line).toContainText('PRC');
    await expect(line).toContainText('Open');
  });

  await qa.step(2, async () => {
    await req.queueTable().getByRole('row').filter({ hasText: patient.fullName }).getByRole('button').first().click();
    await expect(d).toBeVisible();
  });

  await qa.step(3, async () => {
    await d.getByRole('textbox', { name: /Remarks/ }).fill('OK');
    expect(await save(page, d, 'Accept')).toContain('Request accepted');
  });

  await qa.step(4, async () => {
    await d.getByRole('textbox', { name: /Patient group/ }).fill('O Positive');
    expect(await save(page, d, 'Save group')).toContain('Group saved');
  });

  qa.blocked(5, 2);
  qa.blocked(6, 2);
  qa.note(5, NO_UNIT);
};

/** Saves a dialog and returns the toasts (refusals are compared by the test). */
export async function save(page: Page, d: import('@playwright/test').Locator, button = 'Save'): Promise<string[]> {
  const mark = await toastMark(page);
  await d.getByRole('button', { name: button, exact: true }).click();
  return toastsAfter(page, mark);
}

export const NO_UNIT = 'needs a screened, available unit (UNIT-1/UNIT-2/UNIT-F): a bag is numbered on Donors (HTTP 500) and released by a second user';

/** A request saved for a new PT-1 with one line of `component`; returns the patient and the request number. */
export async function savedRequest(page: Page, qa: Qa, component = 'PRC') {
  const p = await registerPatient(page, BLOODBANK.pt1.name, qa.token());
  const req = new RequestsPage(page);
  await req.open();
  const d = await req.openDialog('New request');
  await req.pickPatient(d, p.fullName, p.mrn);
  await d.getByRole('combobox', { name: 'Department' }).selectOption({ label: `${BLOODBANK.dep1.code} · ${BLOODBANK.dep1.name}` });
  await d.getByRole('textbox', { name: 'Diagnosis' }).fill('Anemia');
  await d.getByRole('combobox', { name: 'Component' }).selectOption({ label: component });
  await d.getByRole('textbox', { name: 'Units' }).fill('1');
  await d.getByRole('textbox', { name: 'Required by' }).fill(addDays(todayWib(), 1));
  await d.getByRole('checkbox', { name: 'Cross-match' }).setChecked(component === 'PRC');
  await d.getByRole('button', { name: 'Add line' }).click();
  const toasts = await save(page, d, 'Save request');
  expect(toasts).toContain('Request saved');
  // After the save the dialog stays open without its title and shows the number and the status.
  const saved = req.savedRequestDialog();
  const number = (await saved.getByText(/^RQ\d+$/).first().innerText()).trim();
  // Preconditions "an approved request": approved here by its author; today the site answers HTTP 500 (found blocker 25).
  let approved = (await saved.getByText('Approved', { exact: true }).count()) > 0;
  if (!approved && (await saved.getByRole('button', { name: 'Approve' }).isVisible())) {
    const mark = await toastMark(page);
    await saved.getByRole('button', { name: 'Approve' }).click();
    const toasts = await toastsAfter(page, mark);
    approved = !toasts.some((t) => /React error #441/.test(t)) && (await saved.getByText('Approved', { exact: true }).count()) > 0;
  }
  await saved.getByRole('button', { name: 'Close' }).click();
  return { patient: p, number, approved };
}

export async function toastsAfter(page: Page, mark: number): Promise<string[]> {
  try {
    await expect.poll(async () => (await toastsSince(page, mark)).length, { timeout: 8_000 }).toBeGreaterThan(0);
  } catch {
    // no toast
  }
  return toastsSince(page, mark);
}
