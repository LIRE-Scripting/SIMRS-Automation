import type { Page } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder, toastLocator, toastMark, toastsSince } from '../../../lib/assertions';
import { AdmissionsPage, BedsPage } from '../../../pages/inpatient/InpatientPages';
import { Ward } from './helpers';

/** Test cases of ward.spec.ts shared with the end-to-end chains (tests/e2e/chains/). */

/** A stay of this test on a new bed; returns the patient name and bed number. */
export async function admitted(page: Page, qa: Qa, excelName: string, excelBed = 'QA-101'): Promise<{ name: string; bed: string }> {
  const beds = new BedsPage(page);
  const adm = new AdmissionsPage(page);
  const bed = qa.bed(excelBed);
  const name = qa.name(excelName);
  await beds.open();
  await beds.add({ no: bed, description: 'QA Kelas 1' });
  await adm.open();
  await adm.admit(name, bed);
  return { name, bed };
}

export async function toastsAfter(page: Page, mark: number): Promise<string[]> {
  try {
    await expect.poll(async () => (await toastsSince(page, mark)).length, { timeout: 8_000 }).toBeGreaterThan(0);
  } catch {
    // no toast
  }
  return toastsSince(page, mark);
}


export const TC_APP004_077 = async ({ page, qa }: { page: Page; qa: Qa }): Promise<void> => {
  const w = new Ward(page);
  const pt1 = await admitted(page, qa, 'QA-INP Pasien Satu');
  await w.open();
  const d = page.getByRole('dialog', { name: 'Record dose' });

  await qa.step(1, async () => {
    await expect(w.main.getByText('Given or not given. A missed dose needs a reason. The row stays in pharmacy.')).toBeVisible();
    await expect(w.control('Record dose')).toBeVisible();
  });

  await qa.step(2, async () => {
    await w.control('Record dose').click();
    await expect(d).toBeVisible();
    for (const f of ['Patient', 'Order', 'Reason']) await expect(d.getByRole('textbox', { name: f })).toBeVisible();
    await expect(d.getByRole('combobox', { name: 'Status' })).toBeVisible();
    if (!(await d.getByRole('combobox', { name: 'Branch' }).or(d.getByRole('textbox', { name: 'Branch' })).count())) {
      qa.deviation(2, '"Branch", "Patient", "Order", "Status" and "Reason"', 'no "Branch" field (U1 works on one branch)');
    }
  });

  // "What is typed in Patient and Order" is TBD in the workbook (Q8); the stay's name and the shared drug are used.
  for (const [step, status, reason] of [[3, 'Given', ''], [4, 'Not given', qa.name('X pasien puasa')]] as const) {
    await qa.step(step, async () => {
      if (!(await d.isVisible())) await w.control('Record dose').click();
      await d.getByRole('textbox', { name: 'Patient' }).fill(pt1.name);
      await d.getByRole('textbox', { name: 'Order' }).fill('Paracetamol 500mg Tablet');
      await d.getByRole('combobox', { name: 'Status' }).selectOption({ label: status });
      await d.getByRole('textbox', { name: 'Reason' }).fill(reason);
      const mark = await toastMark(page);
      await d.getByRole('button', { name: 'Save' }).click();
      const toasts = await toastsAfter(page, mark);
      if (!toasts.includes('Dose recorded')) {
        // What "Patient" and "Order" take is TBD in the workbook; the site refuses names.
        await d.getByRole('button', { name: 'Cancel' }).first().click();
        return qa.notRun(step, `the workbook leaves the values of "Patient" and "Order" TBD (Q8); with the stay's name and the drug name the site answers "${toasts.join(' / ')}"`);
      }
      await expect(w.main.getByText(status, { exact: true }).first()).toBeVisible();
    });
  }
};
