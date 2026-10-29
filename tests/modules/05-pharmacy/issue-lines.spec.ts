import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark } from '../../../lib/assertions';
import { addDays, todayWib } from '../../../lib/dates';
import { PHARMACY, stockOf } from '../../../lib/pharmacy-data';
import { IssueLinesPage } from '../../../pages/pharmacy/PharmacyE2EPages';
import { CONFIRMED, ownItem, patient, sell, toastsAfter } from './helpers';
import { NotOffered } from '../../../lib/not-offered';

/**
 * 05-pharmacy.xlsx, feature "Issue Lines (/pharmacy/issue-lines)". The list
 * is not sorted newest first (seen 2026-10-15), so each test sells an item
 * made for it ("Paracetamol 500mg Tablet <token>", standing in for QA-PARA)
 * and finds its lines with the search box.
 */

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

const para = PHARMACY.para;

qaTest('TC-APP005-017', async ({ page, qa }) => {
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
    await expect(row()).toHaveCount(1);
    // The list loads twice (page, then data); typing into Qty before that is reset to 1.
    await il.page.waitForLoadState('networkidle').catch(() => {});
  };

  const giveBack = async (qty: string) => {
    const r = row();
    await r.getByRole('spinbutton', { name: 'Qty' }).fill(qty);
    await expect(r.getByRole('spinbutton', { name: 'Qty' })).toHaveValue(qty);
    const mark = await toastMark(page);
    await r.getByRole('button', { name: 'Return' }).click();
    expect(await toastsAfter(page, mark)).toContain('Returned.');
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
});

qaTest('TC-APP005-042', async ({ page, qa }) => {
  const il = new IssueLinesPage(page);
  const pt1 = await patient(page, qa);
  const pt2 = await patient(page, qa, PHARMACY.twins.name);
  const it = await ownItem(page, qa, para.code, para.name, [{ quantity: '20', expiry: addDays(todayWib(), 400) }]);
  qa.note(1, `PT-2 is a registered patient named "${pt2.fullName}"; an item of this test (${it.code}) stands in for QA-PARA so the two lines can be found`);
  for (const p of [pt1, pt2]) expect(await sell(page, p, [{ item: it, requested: '10', issued: '10' }])).toContain(CONFIRMED);
  const rows = il.rows().filter({ has: page.getByRole('cell', { name: it.name, exact: true }) });

  await qa.step(1, async () => {
    await il.open();
    await il.showRow(() => rows, it.name);
    // The two lines of the item can be on two pages, and the search narrows only the page on screen (found blocker 40).
    if ((await rows.count()) < 2) throw new NotOffered(`the two lines of ${it.name} are not on one page of Issue Lines (found blocker 40)`);
    await expect(rows).toHaveCount(2);
    for (const r of await rows.all()) expect((await il.cells(r)).slice(0, 3)).toEqual([it.name, '10', '10']);
  });

  await qa.step(2, async () => {
    const top = [await il.cells(rows.nth(0)), await il.cells(rows.nth(1))];
    const ids = [pt1.fullName, pt2.fullName, pt1.mrn, pt2.mrn];
    const told = top.every((c) => ids.some((x) => c.join(' ').includes(x)) || /\d{4}-\d{2}-\d{2}|RX-/.test(c.join(' ')));
    qa.note(2, `the two rows: ${top.map((c) => c.join(' | ')).join(' // ')}`);
    if (!told) qa.deviation(2, 'A patient name, MRN, date or invoice number on each row', `columns ${(await il.table.getByRole('columnheader').allInnerTexts()).join(', ')}; the two rows read the same`);
  });
});
