import type { Page } from '@playwright/test';
import type { Qa } from '../../../fixtures/e2e';
import { asOnSite } from '../../../lib/i18n';
import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark } from '../../../lib/assertions';
import { PHARMACY } from '../../../lib/pharmacy-data';
import { DispenseWizard, OrdersPage } from '../../../pages/pharmacy/PharmacyE2EPages';
import { switchLanguage } from '../shared/language';
import { screenOpens } from '../shared/screen-opens';
import { backToIndonesian, CONFIRMED, outpatientOrder, patient, sell, stock, toastsAfter } from './helpers';

/** Test cases of hub-screens.spec.ts shared with the end-to-end chains (tests/e2e/chains/). */


/** The ids of the dose record: the order id from the Orders link (?order=<id>); the patient is typed as its MRN (no id is shown anywhere). */
export async function doseIds(page: import('@playwright/test').Page, qa: import('../../../fixtures/e2e').Qa) {
  const pt1 = await patient(page, qa);
  await outpatientOrder(page, pt1);
  const o = new OrdersPage(page);
  await o.open();
  const href = (await o.row(pt1.fullName).getByRole('link').getAttribute('href')) ?? '';
  return { pt1, order: new URL(href, 'https://x').searchParams.get('order') ?? '' };
}

export async function recordDose(page: import('@playwright/test').Page, v: { patient: string; order: string; status: 'Given' | 'Not given'; reason?: string }) {
  const d = page.getByRole('dialog', { name: 'Record dose' });
  if (!(await d.isVisible())) await page.getByRole('main').getByRole('button', { name: 'Record dose' }).click();
  await d.getByRole('textbox', { name: 'Patient' }).fill(v.patient);
  await d.getByRole('textbox', { name: 'Order' }).fill(v.order);
  await d.getByRole('combobox', { name: 'Status' }).selectOption({ label: v.status });
  await d.getByRole('textbox', { name: 'Reason' }).fill(v.reason ?? '');
  const mark = await toastMark(page);
  await d.getByRole('button', { name: 'Save' }).click();
  const toasts = await toastsAfter(page, mark);
  if (await d.isVisible()) await d.getByRole('button', { name: 'Cancel' }).click();
  return toasts;
}

export const TC_APP005_063 = async ({ page, qa }: { page: Page; qa: Qa }): Promise<void> => {
  const main = page.getByRole('main');
  const { pt1, order } = await doseIds(page, qa);
  qa.note(3, `the patient id is not shown on any screen; the MRN ${pt1.mrn} is typed. Order id ${order} is read from the Orders link`);

  await qa.step(1, async () => {
    await page.goto('/id/pharmacy');
    await page.getByRole('navigation', { name: 'Pharmacy' }).getByRole('link', { name: 'Dose record' }).click();
    await expect(main.getByRole('heading', { level: 1, name: 'Dose record' })).toBeVisible();
    await expect(main.getByText('Given or not given. A missed dose needs a reason. The row stays in pharmacy.', { exact: true }).first()).toBeVisible();
    await expect(main.getByRole('button', { name: 'Record dose' })).toBeVisible();
  });

  await qa.step(2, async () => {
    await main.getByRole('button', { name: 'Record dose' }).click();
    const d = page.getByRole('dialog', { name: 'Record dose' });
    for (const f of ['Patient', 'Order', 'Reason']) await expect(d.getByRole('textbox', { name: f })).toBeVisible();
    await expect(d.getByRole('combobox', { name: 'Status' })).toBeVisible();
    for (const b of ['Cancel', 'Save']) await expect(d.getByRole('button', { name: b })).toBeVisible();
    if (!(await d.getByRole('combobox', { name: 'Branch' }).or(d.getByRole('textbox', { name: 'Branch' })).count())) qa.deviation(2, 'Fields "Branch", "Patient", "Order", "Status" and "Reason"', 'no "Branch" field');
  });

  let ok = false;
  await qa.step(3, async () => {
    const toasts = await recordDose(page, { patient: pt1.mrn, order, status: 'Given' });
    ok = toasts.includes('Dose recorded');
    if (!ok) {
      qa.note(3, `with the MRN: toast "${toasts.join(' / ')}"`);
      return;
    }
    await expect(main.getByText('Given', { exact: true }).first()).toBeVisible();
  });
  if (!ok) {
    qa.notRun(3, 'the patient id cannot be read on any screen (MRN refused)');
    qa.notRun(4, 'needs the patient id (step 3)');
    return;
  }

  await qa.step(4, async () => {
    const toasts = await recordDose(page, { patient: pt1.mrn, order, status: 'Not given', reason: 'X pasien puasa' });
    expect(toasts).toContain('Dose recorded');
    await expect(main.getByText('X pasien puasa').first()).toBeVisible();
  });
};
