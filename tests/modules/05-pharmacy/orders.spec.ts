import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark } from '../../../lib/assertions';
import { CLINICAL } from '../../../lib/clinical-data';
import { PHARMACY, PHARMACY_STORE, stockOf, total } from '../../../lib/pharmacy-data';
import { compact, DispenseWizard, IssueLinesPage, OrdersPage } from '../../../pages/pharmacy/PharmacyE2EPages';
import { CONFIRMED, outpatientOrder, patient, stock, storeNote, toastsAfter, type Patient } from './helpers';

/**
 * 05-pharmacy.xlsx, feature "Order (/pharmacy/orders)". OR-OP is the
 * standard order of Patient Care (Paracetamol 500mg Tablet, quantity 10),
 * written per test for a new PT-1.
 */

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

const drug = CLINICAL.standardOrder.Drug;

/** Orders, Outpatient, the stand-in store, then the patient's row: the wizard on "Select items". */
async function openOrder(o: OrdersPage, p: Patient): Promise<DispenseWizard> {
  await o.open('outpatient');
  await o.pickStore(PHARMACY_STORE.code);
  await o.row(p.fullName).getByRole('link').click();
  const w = new DispenseWizard(o.page);
  await expect(w.marker('Select items')).toBeVisible();
  return w;
}

/** Issue lines of an item name (search box, then the pager total). */
async function linesOf(il: IssueLinesPage, name: string): Promise<number> {
  await il.open();
  await il.search.fill(name);
  await expect(il.pager().or(il.main.getByText('No issue lines yet.'))).toBeVisible();
  if (!(await il.pager().isVisible())) return 0;
  return Number((await il.pager().innerText()).match(/of (\d+)$/)![1]);
}

qaTest('TC-APP005-001', async ({ page, qa }) => {
  const o = new OrdersPage(page);
  const w = new DispenseWizard(page);
  const batches = await stock(page, qa);
  const pt1 = await patient(page, qa);
  await outpatientOrder(page, pt1);
  const before = await stockOf(page, PHARMACY.para.code);
  const il = new IssueLinesPage(page);
  const linesBefore = await linesOf(il, drug);

  await qa.step(1, async () => {
    await page.goto('/id/apps');
    await page.getByRole('link', { name: /^Pharmacy\b/ }).first().click();
    await page.getByRole('main').getByRole('link', { name: 'Orders', exact: true }).first().click();
    await expect(o.heading).toBeVisible();
    await expect(o.table.getByRole('columnheader')).toHaveText(['Patient', 'Drug', 'Visit', 'Remaining']);
    const cells = await o.cells(o.row(pt1.fullName));
    expect(cells.slice(0, 3)).toEqual([pt1.fullName, drug, 'Outpatient']);
    if (cells[3] !== PHARMACY.orOp.quantity) qa.deviation(1, `Remaining ${PHARMACY.orOp.quantity}`, `Remaining reads "${cells[3]}" (left / ordered)`);
  });

  await qa.step(2, async () => {
    await o.main.getByRole('link', { name: 'Outpatient', exact: true }).click();
    await expect(page).toHaveURL(/visit_class=outpatient/);
    await expect(o.store).toBeVisible();
    for (const r of await o.rows().all()) expect((await o.cells(r))[2]).toBe('Outpatient');
  });

  await qa.step(3, async () => {
    storeNote(qa, 3);
    await o.pickStore(PHARMACY_STORE.code);
  });

  await qa.step(4, async () => {
    await o.row(pt1.fullName).getByRole('link').click();
    await expect(w.marker('Select items')).toBeVisible();
    await expect(w.main.getByText(`${pt1.fullName} — ${drug}. Issued quantity cannot exceed what is still ordered.`, { exact: true })).toBeVisible();
    await expect(w.selected()).toHaveCount(1);
    await expect(w.selected().getByRole('button', { name: 'Remove' })).toHaveCount(0);
  });

  await qa.step(5, async () => {
    await w.goNext('Set quantities');
    await expect(w.requested(drug)).toHaveValue(PHARMACY.orOp.quantity);
    await expect(w.issued(drug)).toHaveValue(PHARMACY.orOp.quantity);
  });

  await qa.step(6, async () => {
    await w.goNext('Drug order alerts');
    await expect(w.main.getByText('No drug interactions detected for this order.', { exact: true })).toBeVisible();
  });

  await qa.step(7, async () => {
    await w.goNext('Confirm');
    await expect(w.store).toHaveValue(new RegExp(PHARMACY_STORE.code));
    expect(await w.summaryCompact()).toEqual([compact(`${drug} ${PHARMACY.orOp.quantity}/${PHARMACY.orOp.quantity}`)]);
    if (!(await w.main.getByText(/Podomoro/).count())) qa.deviation(7, 'Branch BR-A on Confirm', 'Confirm shows the store and the summary; no branch');
  });

  await qa.step(8, async () => {
    const mark = await toastMark(page);
    await w.confirm.click();
    expect(await toastsAfter(page, mark, 20_000)).toContain(CONFIRMED);
    await expect(w.main.getByText(`Issued ${PHARMACY.orOp.quantity} of ${PHARMACY.orOp.quantity}`, { exact: true })).toBeVisible();
  });

  await qa.step(9, async () => {
    await w.done.click();
    if (!(await o.heading.isVisible({ timeout: 5_000 }).catch(() => false))) {
      await expect(o.heading).toBeVisible({ timeout: 5_000 }).catch(() => qa.deviation(9, 'Back on Orders', `Done stays on ${new URL(page.url()).pathname}`));
    }
    await o.open('outpatient');
    await expect(o.row(pt1.fullName)).toHaveCount(0);
  });

  // Final checks of the workbook. Issue Lines is not sorted newest first, so the lines of the drug are counted.
  expect(await linesOf(il, drug)).toBe(linesBefore + 1);
  qa.note(9, 'Issue Lines has one more line for the drug (the list is not sorted newest first, so the new line is not the first row)');
  const after = await stockOf(page, PHARMACY.para.code);
  expect(total(before) - total(after)).toBe(10);
  if (after.get(batches[0]) !== 0) qa.note(9, `stock fell by 10 in total, taken from the oldest batches received (this test's BT-1 holds ${after.get(batches[0])})`);
  qa.notRun(9, 'Hospital Accounts invoice and Audit entry of the final check: read in 14 Hospital Accounts / Audit');
});

qaTest('TC-APP005-002', async ({ page, qa }) => {
  const o = new OrdersPage(page);
  await stock(page, qa);
  const pt1 = await patient(page, qa);
  await outpatientOrder(page, pt1);
  let w: DispenseWizard;

  await qa.step(1, async () => {
    storeNote(qa, 1);
    w = await openOrder(o, pt1);
    await expect(w.selected()).toHaveCount(1);
  });

  await qa.step(2, async () => {
    await w.goNext('Set quantities');
    await w.issued(drug).fill('4');
    const v = await w.issued(drug).inputValue();
    qa.note(2, `Issued after typing 4: ${v}`);
    expect(v).toBe(PHARMACY.orOp.quantity);
  });
  for (const s of [2, 3, 4, 5, 6, 7]) qa.blocked(s, 29);
  qa.note(2, 'nothing was confirmed; the order stays pending');
});

qaTest('TC-APP005-004', async ({ page, qa }) => {
  const o = new OrdersPage(page);
  await stock(page, qa);
  const pt1 = await patient(page, qa);
  await outpatientOrder(page, pt1);
  let w: DispenseWizard;

  await qa.step(1, async () => {
    w = await openOrder(o, pt1);
    await w.goNext('Set quantities');
    await expect(w.main.getByRole('columnheader', { name: 'Generic' })).toBeVisible();
    await expect(w.generic(drug)).not.toBeChecked();
  });

  await qa.step(2, async () => {
    await w.generic(drug).click();
    qa.note(2, `Generic after a click: ${(await w.generic(drug).isChecked()) ? 'ticked' : 'not ticked'}`);
    await expect(w.generic(drug)).not.toBeChecked();
  });
  for (const s of [2, 3, 4]) qa.blocked(s, 29);
});

qaTest('TC-APP005-023', async ({ page, qa }) => {
  const o = new OrdersPage(page);
  const il = new IssueLinesPage(page);
  const a = await patient(page, qa);
  await outpatientOrder(page, a);
  const b = await patient(page, qa);
  await outpatientOrder(page, b);

  await qa.step(1, async () => {
    await o.open();
    await expect(o.main.getByText('Choose outpatient or inpatient to pick a store.', { exact: true })).toBeVisible();
    const names = await o.rows().getByRole('link').allInnerTexts();
    expect(names.indexOf(b.fullName)).toBeGreaterThanOrEqual(0);
    expect(names.indexOf(b.fullName)).toBeLessThan(names.indexOf(a.fullName));
    qa.note(1, 'newest order on top (the order written last comes first)');
  });

  await qa.step(2, async () => {
    for (const v of ['Outpatient', 'Inpatient'] as const) {
      await o.main.getByRole('link', { name: v, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`visit_class=${v.toLowerCase()}`));
      await expect(o.store).toBeVisible();
      for (const r of await o.rows().all()) expect((await o.cells(r))[2]).toBe(v);
    }
  });

  qa.notRun(3, 'needs a branch with nothing pending; U1 works on Podomoro only, where QA orders are always pending');

  await qa.step(4, async () => {
    await il.open();
    await expect(il.pager()).toBeVisible();
    qa.note(4, `pager: "${await il.pager().innerText()}"`);
  });

  await qa.step(5, async () => {
    const next = il.main.getByRole('button', { name: 'Next page' });
    if (await next.isDisabled()) {
      qa.note(5, 'one page only: Next page is disabled');
      return;
    }
    const first = await il.rows().first().innerText();
    await next.click();
    await expect(il.rows().first()).not.toHaveText(first);
    const pages = il.main.getByRole('button', { name: /^\d+$/ });
    await pages.last().click();
    await expect(il.rows().first()).toBeVisible();
  });

  await qa.step(6, async () => {
    // Back on the first page: step 5 left the list on its last page, and the search narrows the page on screen.
    await il.open();
    for (const term of ['Paracetamol', 'generik']) {
      await il.search.fill(term);
      const read = async () => (await il.rows().filter({ hasNotText: /no issue lines yet/i }).allInnerTexts()).filter((r) => r.trim());
      // The table is drawn again after typing: wait until every row shown is a match.
      await expect.poll(async () => (await read()).every((r) => r.toLowerCase().includes(term.toLowerCase())), { timeout: 10_000 }).toBe(true).catch(() => {});
      const rows = await read();
      for (const r of rows) expect(r.toLowerCase()).toContain(term.toLowerCase());
      // The orders of this test are Paracetamol; no precondition makes a line that reads "generik".
      if (term === 'Paracetamol') expect(rows.length).toBeGreaterThan(0);
      else if (!rows.length) qa.note(6, `"${term}" matches no line on the first page: no test data reads "${term}"`);
    }
    await il.search.fill('zzzz');
    await expect(il.rows().filter({ hasText: /zzzz/i })).toHaveCount(0);
    qa.note(6, `"zzzz" shows ${await il.rows().count()} row(s): ${(await il.rows().allInnerTexts()).join(' / ').slice(0, 120)}`);
  });
});

qaTest('TC-APP005-025', async ({ page, qa }) => {
  const o = new OrdersPage(page);
  await stock(page, qa);
  const pt1 = await patient(page, qa);
  await outpatientOrder(page, pt1);
  let w: DispenseWizard;
  qa.note(1, 'a fresh order of 10 stands in for "Remaining 6"');
  const q = PHARMACY.orOp.quantity;

  await qa.step(1, async () => {
    w = await openOrder(o, pt1);
    await w.goNext('Set quantities');
    await expect(w.requested(drug)).toHaveValue(q);
    await expect(w.issued(drug)).toHaveValue(q);
  });

  await qa.step(2, async () => {
    await w.issued(drug).fill('50');
    const max = await w.issued(drug).getAttribute('max');
    qa.note(2, `Issued field max="${max}", value after typing 50: ${await w.issued(drug).inputValue()}`);
    expect(max).toBe(q);
  });

  await qa.step(3, async () => {
    await w.requested(drug).fill('50');
    await w.issued(drug).fill('50');
    await w.goNext('Drug order alerts');
    await w.goBack('Set quantities');
    await expect(w.requested(drug)).toHaveValue(q);
    await expect(w.issued(drug)).toHaveValue(q);
  });

  await qa.step(4, async () => {
    await w.issued(drug).fill('0');
    const v = await w.issued(drug).inputValue();
    qa.note(4, `Issued after typing 0: ${v}; nothing is confirmed`);
    expect(v).toBe(q);
  });
  qa.blocked(4, 29);
});
