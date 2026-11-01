import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { scan } from '../../../lib/barcode';
import { AdmissionsPage, BedsPage } from '../../../pages/inpatient/InpatientPages';
import { printPreview } from '../shared/print';

/**
 * 04-inpatient.xlsx, "Printing the admission barcode" (TC-APP004-009), marked
 * "Automation Candidate = No" (a printer and a barcode reader) and run by
 * simulation (lib/qa-data/plan.ts, SIMULATED): the print preview is the page
 * under the print media type, the scan is the barcode read from its bars.
 */

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

qaTest('TC-APP004-009', async ({ page, qa }) => {
  const bed = qa.bed('QA-101');
  const beds = new BedsPage(page);
  await beds.open();
  await beds.add({ no: bed, description: 'QA Kelas 1' });
  const name = qa.name('QA-INP Pasien Satu');
  const adm = new AdmissionsPage(page);
  await adm.open();
  await adm.admit(name, bed);
  await adm.open();
  const number = await adm.admissionNo(await adm.stay(name));
  const d = page.getByRole('dialog', { name: 'Print barcode' });

  await qa.step(1, async () => {
    await (await adm.stay(name)).getByRole('button', { name: 'Print barcode' }).click();
    await expect(d).toBeVisible();
    await expect(d).toContainText('Barcode of this admission no.');
    for (const x of [name, bed, number]) await expect(d).toContainText(x);
    await expect(d.getByRole('img', { name: number })).toBeVisible();
  });

  await qa.step(2, async () => {
    const preview = await printPreview(page, () => d.getByRole('button', { name: 'Print barcode' }).click(), page.locator(`svg[role="img"][aria-label="${number}"]`));
    expect(preview.printed, 'the browser print is called').toBe(true);
    expect(preview.labelShown, 'the label is in the print preview').toBe(true);
    qa.note(2, `print preview (print media): the label${preview.alsoShown.length ? ` and ${preview.alsoShown.join('; ')}` : ' only'}`);
    if (preview.alsoShown.length) qa.deviation(2, 'The browser print preview shows the label only', `the print preview also shows ${preview.alsoShown.join('; ')}`);
  });

  await qa.step(3, async () => {
    expect(await scan(d.getByRole('img', { name: number }))).toBe(number);
    qa.note(3, `the barcode read from its bars (Code 39): ${number}`);
  });

  await qa.step(4, async () => {
    await d.getByRole('button', { name: 'Done' }).click();
    await expect(d).toBeHidden();
  });
});
