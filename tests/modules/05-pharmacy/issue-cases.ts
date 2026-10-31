import type { Page } from '@playwright/test';
import type { Qa } from '../../../fixtures/e2e';
import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark } from '../../../lib/assertions';
import { addDays, todayWib } from '../../../lib/dates';
import { PHARMACY, stockOf } from '../../../lib/pharmacy-data';
import { IssueLinesPage } from '../../../pages/pharmacy/PharmacyE2EPages';
import { CONFIRMED, ownItem, patient, sell, toastsAfter } from './helpers';
import { NotOffered } from '../../../lib/not-offered';

const para = PHARMACY.para;

/** Test cases of issue-lines.spec.ts shared with the end-to-end chains (tests/e2e/chains/). */

export const TC_APP005_017 = async ({ page, qa }: { page: Page; qa: Qa }): Promise<void> => {
  const il = new IssueLinesPage(page);
  const pt1 = await patient(page, qa);
  const it = await ownItem(page, qa, para.code, para.name, [{ quantity: PHARMACY.bt1.quantity, expiry: addDays(todayWib(), PHARMACY.bt1.daysAhead) }]);
  qa.note(1, `an item of this test (${it.code}, batch ${it.batches[0]} of 10) stands in for QA-PARA / BT-1, so its line can be found`);
  expect(await sell(page, pt1, [{ item: it, requested: '10', issued: '10' }])).toContain(CONFIRMED);
  const sold = await stockOf(page, it.code);
  expect(sold.get(it.batches[0])).toBe(0);
  const row = () => il.rows().filter({ has: page.getByRole('cell', { name: it.name, exact: true }) });
  const show = async () => {
    await il.open();
    await il.showRow(row, it.name);
    // The new line may take a moment to be listed; when it is on no page, the list does not offer it (found blocker 40).
    for (let i = 0; i < 3 && !(await row().count()); i++) {
      await page.waitForTimeout(10_000);
      await il.open();
      await il.showRow(row, it.name);
    }
    if (!(await row().count())) throw new NotOffered(`the line of ${it.name} is on no page of Issue Lines (found blocker 40)`);
    await expect(row()).toHaveCount(1);
    // The list loads twice (page, then data); typing into Qty before that is reset to 1.
    await il.page.waitForLoadState('networkidle').catch(() => {});
  };

  const giveBack = async (qty: string) => {
    const r = row();
    await r.getByRole('spinbutton', { name: 'Qty' }).fill(qty);
    await expect(r.getByRole('spinbutton', { name: 'Qty' })).toHaveValue(qty);
    const before = Number((await il.cells(r))[5]) || 0;
    const mark = await toastMark(page);
    await r.getByRole('button', { name: 'Return' }).click();
    const toasts = await toastsAfter(page, mark, 20_000);
    if (!toasts.length) {
      // No toast seen: the row tells whether the return was posted.
      await show();
      const after = Number((await il.cells(row()))[5]) || 0;
      expect(after, 'Returned after the return').toBe(before + Number(qty));
      return;
    }
    expect(toasts).toContain('Returned.');
  };

  await qa.step(1, async () => {
    await show();
    const cells = await il.cells(row());
    expect(cells.slice(0, 6)).toEqual([it.name, '10', '10', 'Yes', 'Yes', '0']);
    await expect(row().getByRole('spinbutton', { name: 'Qty' })).toBeVisible();
    await expect(row().getByRole('button', { name: 'Return' })).toBeVisible();
  });

  await qa.step(2, async () => {
    await giveBack('3');
    await show();
    expect((await il.cells(row()))[5]).toBe('3');
  });

  await qa.step(3, async () => {
    expect((await stockOf(page, it.code)).get(it.batches[0])).toBe(3);
  });

  await qa.step(4, async () => {
    await show();
    await giveBack('7');
    await show();
    expect((await il.cells(row()))[5]).toBe('10');
  });

  await qa.step(5, async () => {
    expect((await il.cells(row()))[6]).toBe('—');
    await expect(row().getByRole('button', { name: 'Return' })).toHaveCount(0);
  });

  expect((await stockOf(page, it.code)).get(it.batches[0])).toBe(10);
  qa.notRun(5, 'Audit entries and Finance reversals of the final check: read in the Audit and Finance modules');
};
