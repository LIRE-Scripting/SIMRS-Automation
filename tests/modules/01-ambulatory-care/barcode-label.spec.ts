import { expect, qaTest, test } from '../../../fixtures/e2e';
import { registerPatient, SHARED } from '../../../lib/ambulatory-data';
import { installToastRecorder } from '../../../lib/assertions';
import { scan } from '../../../lib/barcode';
import { RegisteredPatientsPage } from '../../../pages/ambulatory/RegisteredPatientsPage';
import { printPreview } from '../shared/print';

/**
 * 01-ambulatory-care.xlsx, "Printing the MRN barcode label" (TC-APP001-004),
 * marked "Automation Candidate = No" (a printer and a barcode reader) and run
 * by simulation (lib/qa-data/plan.ts, SIMULATED): the print preview is the
 * page under the print media type, the scan is the barcode read from its bars.
 */

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

qaTest('TC-APP001-004', async ({ page, qa }) => {
  const pt1 = await registerPatient(page, SHARED.pt1.name, qa.token());
  const reg = new RegisteredPatientsPage(page);
  const main = page.getByRole('main');
  // The card: the nearest element around the hint that holds the barcode.
  const card = main.getByText('Barcode of this MRN.').locator('xpath=ancestor::*[.//*[@role="img"]][1]');
  const barcode = card.getByRole('img', { name: pt1.mrn });

  await qa.step(1, async () => {
    await reg.open();
    await reg.search(pt1.mrn);
    await reg.row(pt1.mrn).getByRole('button', { name: 'Print barcode' }).click();
    await expect(card).toBeVisible();
    await expect(card).toContainText(pt1.fullName);
    await expect(card).toContainText(pt1.mrn);
    await expect(barcode).toBeVisible();
  });

  await qa.step(2, async () => {
    // In print the hint of the card is hidden: the label is found by its barcode alone.
    const preview = await printPreview(page, () => card.getByRole('button', { name: 'Print barcode' }).click(), page.locator(`svg[role="img"][aria-label="${pt1.mrn}"]`));
    expect(preview.printed, 'the browser print is called').toBe(true);
    expect(preview.labelShown, 'the label is in the print preview').toBe(true);
    qa.note(2, `print preview (print media): the label${preview.alsoShown.length ? ` and ${preview.alsoShown.join('; ')}` : ' only'}`);
    if (preview.alsoShown.length) qa.deviation(2, 'The print preview shows the label only, without the list, the menu or the buttons', `the print preview also shows ${preview.alsoShown.join('; ')}`);
  });

  await qa.step(3, async () => {
    expect(await scan(barcode)).toBe(pt1.mrn);
    qa.note(3, `the barcode read from its bars (Code 39): ${pt1.mrn}`);
  });

  await qa.step(4, async () => {
    await card.getByRole('button', { name: 'Done' }).click();
    await expect(barcode).toHaveCount(0);
  });
});
