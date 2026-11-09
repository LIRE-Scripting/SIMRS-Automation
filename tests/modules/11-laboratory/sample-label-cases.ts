import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { scan } from '../../../lib/barcode';
import { todayWib } from '../../../lib/dates';
import { WorklistPage } from '../../../pages/lab/LabPages';
import { printPreview } from '../shared/print';
import { advance, order } from './helpers';
import type { QaBody } from '../../../fixtures/e2e';

/** The test cases of sample-label.spec.ts, shared with the end-to-end chains (chain.run). */

export const TC_APP011_002: QaBody = async ({ page, qa }) => {
  const type = await order(page, qa);
  const w = new WorklistPage(page);
  const main = page.getByRole('main');
  const card = main.getByText('Barcode of this sample ID.').locator('xpath=ancestor::*[.//*[@role="img"]][1]');
  let sample = '';

  await qa.step(1, async () => {
    await advance(page, type, ['Generated']);
    const row = await w.row(type);
    sample = /LAB-\d{8}-[A-Z0-9]{8}/.exec(await row.innerText())?.[0] ?? '';
    expect(sample, 'a sample ID LAB-<date>-<8 characters> on the row').toMatch(new RegExp(`^LAB-${todayWib().replace(/-/g, '')}-[A-Z0-9]{8}$`));
    await expect(row).toContainText('Generated');
    await expect(row.getByRole('button', { name: 'Sent', exact: true })).toBeVisible();
  });

  await qa.step(2, async () => {
    if (!(await card.count())) {
      // The card shows after "Generated" on the screen that pressed it; the row's own button shows it again.
      await (await w.row(type)).getByRole('button', { name: 'Print barcode' }).click();
    }
    await expect(card).toBeVisible();
    await expect(card).toContainText(type);
    await expect(card).toContainText(sample);
    await expect(card.getByRole('img', { name: sample })).toBeVisible();
  });

  await qa.step(3, async () => {
    const preview = await printPreview(page, () => card.getByRole('button', { name: 'Print barcode' }).click(), page.locator(`svg[role="img"][aria-label="${sample}"]`));
    expect(preview.printed, 'the browser print is called').toBe(true);
    expect(preview.labelShown, 'the label is in the print preview').toBe(true);
    qa.note(3, `print preview (print media): the label${preview.alsoShown.length ? ` and ${preview.alsoShown.join('; ')}` : ' only'}`);
    if (preview.alsoShown.length) qa.deviation(3, 'The browser print preview shows the label only', `the print preview also shows ${preview.alsoShown.join('; ')}`);
  });

  await qa.step(4, async () => {
    expect(await scan(card.getByRole('img', { name: sample }))).toBe(sample);
    qa.note(4, `the barcode read from its bars (Code 39): ${sample}`);
  });

  await qa.step(5, async () => {
    await card.getByRole('button', { name: 'Done' }).click();
    await expect(main.getByText('Barcode of this sample ID.')).toHaveCount(0);
    await expect((await w.row(type)).getByRole('button', { name: 'Print barcode' })).toBeVisible();
  });
};
