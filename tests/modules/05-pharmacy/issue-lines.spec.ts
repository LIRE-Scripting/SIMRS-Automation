import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark } from '../../../lib/assertions';
import { addDays, todayWib } from '../../../lib/dates';
import { PHARMACY, stockOf } from '../../../lib/pharmacy-data';
import { IssueLinesPage } from '../../../pages/pharmacy/PharmacyE2EPages';
import { CONFIRMED, ownItem, patient, sell, toastsAfter } from './helpers';
import { NotOffered } from '../../../lib/not-offered';
import { TC_APP005_017 } from './issue-cases';

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

qaTest('TC-APP005-017', TC_APP005_017);

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
