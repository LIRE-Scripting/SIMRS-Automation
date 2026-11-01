import type { Page } from '@playwright/test';
import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark, SERVER_FAILURE } from '../../../lib/assertions';
import { addDays, todayWib } from '../../../lib/dates';
import { PROCUREMENT } from '../../../lib/procurement-data';
import { PurchaseOrdersPage } from '../../../pages/procurement/ProcurementPages';
import { createOrder as create, docNo, idr, openOrder, poToastsAfter as toastsAfter, TC_APP009_004 } from './cases';

/**
 * 09-procurement.xlsx, feature "Purchase orders (/procurement/purchase-orders)".
 * Every order of a test carries a document number with a new token. The
 * approval chain on the site has one step (found blocker 30).
 */

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

const SERVER_ERROR = SERVER_FAILURE;

async function cellsOf(page: Page, doc: string): Promise<string[]> {
  const p = new PurchaseOrdersPage(page);
  await p.open();
  return p.cells(await p.find(doc));
}


qaTest('TC-APP009-001', async ({ page, qa }) => {
  const p = new PurchaseOrdersPage(page);
  const doc = docNo(qa);
  const po = { docNumber: doc, docDate: todayWib(), vendor: PROCUREMENT.vendor, dept: PROCUREMENT.dept, advance: PROCUREMENT.advance };

  await qa.step(1, async () => {
    await page.goto('/id/apps');
    await page.getByRole('link', { name: /^Procurement\b/ }).first().click();
    await page.getByRole('link', { name: /^Purchase orders Open purchase orders$/ }).click();
    await expect(p.heading).toBeVisible();
    await expect(page.getByText('Vendor PO with advance balance arithmetic and approval chain.', { exact: true })).toBeVisible();
    await expect(p.table).toBeVisible();
    await expect(page.getByRole('button', { name: 'New PO' })).toBeVisible();
  });

  await qa.step(2, async () => {
    await p.openNew();
    for (const f of ['Doc number', 'Doc date', 'Vendor / beneficiary', 'Dept code'] as const) await expect(p.field(f)).toBeVisible();
    await expect(p.field('Currency')).toHaveValue('IDR');
    await expect(p.amount('Advance amount')).toHaveValue('0');
    await expect(p.amount('Amount paid')).toHaveValue('0');
    await expect(p.form.getByRole('textbox', { name: 'Branch' }).or(p.form.getByRole('combobox', { name: 'Branch' }))).toHaveCount(0);
  });

  await qa.step(3, async () => {
    await p.fill(po);
    const mark = await toastMark(page);
    await p.save().click();
    expect(await toastsAfter(page, mark)).toContain('Purchase order created');
  });

  await qa.step(4, async () => {
    await expect(p.view).toBeVisible();
    await expect(p.view.getByRole('heading', { level: 2, name: doc })).toBeVisible();
    await expect(p.view.getByText(`${PROCUREMENT.vendor} · ${idr(PROCUREMENT.advance)}`, { exact: true })).toBeVisible();
    await expect(p.view.getByText(`Balance: ${idr(PROCUREMENT.advance)}`, { exact: true })).toBeVisible();
    const chain = (await p.view.getByText(/\(\d+ (?:steps|langkah)\)$/).innerText()).trim();
    const steps = await p.steps();
    expect(steps[0]).toContain('Current');
    await expect(p.advance()).toBeVisible();
    if (chain !== `${PROCUREMENT.chain} (4 steps)`) {
      qa.deviation(4, `"${PROCUREMENT.chain} (4 steps)"; four steps, the first "Current", the others "Pending"`, `"${chain}": ${steps.map((s) => s.join(' ')).join(' / ')} (found blocker 30)`);
    }
  });

  await qa.step(5, async () => {
    await p.view.getByRole('button', { name: 'Close' }).click();
    const c = await cellsOf(page, doc);
    expect(c.slice(0, 7)).toEqual([doc, todayWib(), PROCUREMENT.vendor, PROCUREMENT.dept, idr(PROCUREMENT.advance), idr(PROCUREMENT.advance), 'Step 1']);
    await expect((await p.find(doc)).getByRole('button', { name: 'Open' })).toBeVisible();
  });
});

qaTest('TC-APP009-002', async ({ page, qa }) => {
  const p = new PurchaseOrdersPage(page);
  let title = '';

  await qa.step(1, async () => {
    expect(await create(page, { vendor: PROCUREMENT.vendor, advance: '2500000' })).toContain('Purchase order created');
  });

  await qa.step(2, async () => {
    title = (await p.view.getByRole('heading', { level: 2 }).innerText()).trim();
    expect(title).toMatch(/^PO-\d+$/);
  });

  await qa.step(3, async () => {
    await p.view.getByRole('button', { name: 'Close' }).click();
    expect((await cellsOf(page, title))[0]).toBe(title);
  });
  qa.note(3, `number given by the system: ${title}`);
});

qaTest('TC-APP009-003', async ({ page, qa }) => {
  const p = new PurchaseOrdersPage(page);
  const cases: [number, string, string, string][] = [
    [1, '5000000', '1000000', '4000000'],
    [2, '1500000.50', '500000.25', '1000000.25'],
    [3, '750000', '750000', '0'],
  ];
  for (const [step, advance, paid, balance] of cases) {
    await qa.step(step, async () => {
      const doc = docNo(qa);
      expect(await create(page, { docNumber: doc, vendor: PROCUREMENT.vendor, advance, paid })).toContain('Purchase order created');
      await expect(p.view.getByText(`Balance: ${idr(balance)}`, { exact: true })).toBeVisible();
      await p.view.getByRole('button', { name: 'Close' }).click();
      const c = await cellsOf(page, doc);
      expect([c[4], c[5]]).toEqual([idr(advance), idr(balance)]);
    });
  }
});

qaTest('TC-APP009-004', TC_APP009_004);

qaTest('TC-APP009-007', async ({ page, qa }) => {
  const p = new PurchaseOrdersPage(page);
  await p.open();
  const total = Number((await p.pager().innerText()).match(/of (\d+)$/)![1]);
  // More than 10 orders with different dates, one without a date.
  const made: string[] = [];
  for (let i = 0; total + made.length <= 10; i++) {
    const doc = docNo(qa);
    expect(await create(page, { docNumber: doc, vendor: PROCUREMENT.vendor, advance: '100000', docDate: i === 0 ? undefined : addDays(todayWib(), -i) })).toContain('Purchase order created');
    made.push(doc);
  }
  if (made.length) qa.note(1, `${made.length} order(s) made so that more than 10 exist, one of them without a date`);

  await qa.step(1, async () => {
    await p.open();
    await expect(p.rows()).toHaveCount(10);
    await expect(p.pager()).toHaveText(/^Showing 1–10 of \d+$/);
    await expect(p.table.getByRole('columnheader')).toHaveText(['Doc no', 'Date', 'Vendor', 'Dept', 'Amount', 'Balance', 'Approval', 'Actions']);
  });

  await qa.step(2, async () => {
    const rows = await p.rows().evaluateAll((rs) => rs.map((r) => [...r.querySelectorAll('td')].slice(0, 2).map((td) => (td.textContent ?? '').trim())));
    const dates = rows.map((r) => r[1]).filter((d) => d !== '—');
    qa.note(2, `first page: ${rows.map((r) => `${r[0]} ${r[1]}`).join(', ')}`);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  await qa.step(3, async () => {
    // The pager shows five page numbers only: "Next page" is pressed until the last page.
    const next = page.getByRole('button', { name: 'Next page' });
    for (let i = 0; i < 50 && (await next.isVisible()) && (await next.isEnabled()); i++) {
      const first = await p.rows().first().innerText();
      await next.press('Enter');
      await expect(p.rows().first()).not.toHaveText(first);
    }
    // The page renders twice after paging: the dates are read once two reads agree.
    const read = () => p.rows().evaluateAll((rs) => rs.map((r) => (r.querySelectorAll('td')[1]?.textContent ?? '').trim()).join(', '));
    let dates = '';
    await expect.poll(async () => {
      const a = await read();
      await page.waitForTimeout(800);
      const b = await read();
      dates = b;
      return a === b;
    }, { timeout: 20_000 }).toBe(true);
    qa.note(3, `last page (${(await p.pager().innerText().catch(() => '')).trim()}) dates: ${dates}`);
    const last = dates.split(', ').at(-1);
    if (last !== '—') qa.deviation(3, 'Orders without a date at the very end, with "—" under Date', `the last page ends with the date ${last}`);
  });
});

qaTest('TC-APP009-012', async ({ page, qa }) => {
  const p = new PurchaseOrdersPage(page);
  await p.open();
  await p.openNew();
  const fields = (await p.form.locator('input').evaluateAll((es) => es.map((e) => e.getAttribute('aria-label') || e.id))).join(', ');
  qa.note(1, `the form has: ${fields}`);
  await qa.step(1, async () => {
    if (!(await p.form.getByRole('textbox', { name: /item/i }).count())) qa.deviation(1, 'Item lines with item, quantity, unit and price', 'no item lines; the form has number, date, vendor, department, currency, advance amount and amount paid');
  });
  await qa.step(2, async () => {
    if (!(await p.form.getByText(/total/i).count())) qa.deviation(2, 'A total worked out from the lines', 'no total');
  });
  await qa.step(3, async () => {
    if (!(await p.form.getByRole('textbox', { name: /delivery|address|terms/i }).count())) qa.deviation(3, 'Delivery date, delivery address and payment terms', 'none of these fields');
  });
});

qaTest('TC-APP009-014', async ({ page, qa }) => {
  const p = new PurchaseOrdersPage(page);

  await qa.step(1, async () => {
    await p.open();
    await p.openNew();
    await p.field('Vendor / beneficiary').click();
    const list = await p.field('Vendor / beneficiary').getAttribute('aria-controls');
    if (!list) qa.deviation(1, 'A list of registered vendors to choose from', '"Vendor / beneficiary" is a free text field');
  });

  await qa.step(2, async () => {
    for (const v of [PROCUREMENT.vendor, PROCUREMENT.vendor.replace(/^QA PT /, 'QA PT. ')]) {
      const toasts = await create(page, { docNumber: docNo(qa), vendor: v, advance: '100000' });
      expect(toasts).toContain('Purchase order created');
    }
    qa.deviation(2, 'The second spelling is recognised as the same vendor, or refused', 'both spellings are saved as typed');
  });

  await qa.step(3, async () => {
    const toasts = await create(page, { docNumber: docNo(qa), vendor: PROCUREMENT.vendor, dept: 'QA-TIDAK-ADA', advance: '100000' });
    if (toasts.includes('Purchase order created')) qa.deviation(3, 'Refused: the department does not exist', 'saved');
  });

  await qa.step(4, async () => {
    const toasts = await create(page, { docNumber: docNo(qa), advance: '100000' });
    if (toasts.includes('Purchase order created')) qa.deviation(4, 'Refused: the vendor is missing', 'saved with no vendor');
  });
});

qaTest('TC-APP009-015', async ({ page, qa }) => {
  const done = docNo(qa);
  expect(await create(page, { docNumber: done, vendor: PROCUREMENT.vendor, advance: PROCUREMENT.advance })).toContain('Purchase order created');
  const p = new PurchaseOrdersPage(page);
  const mark = await toastMark(page);
  await p.advance().click();
  expect(await toastsAfter(page, mark)).toContain('Approval advanced');
  qa.note(1, 'PO-DONE is an order of this test, approved with its one step; PO-S4 cannot exist (found blocker 30)');

  await qa.step(1, async () => {
    const c = await cellsOf(page, done);
    qa.note(1, `PO-DONE row: Approval "${c[6]}"`);
    if (!/approved/i.test(c[6])) qa.deviation(1, 'PO-DONE shows a status such as "Approved"', `Approval "${c[6]}"`);
  });
  qa.blocked(1, 30);

  await qa.step(2, async () => {
    const v = await openOrder(page, done);
    const steps = await v.steps();
    qa.note(2, `steps of PO-DONE: ${steps.map((s) => s.join(' ')).join(' / ')}`);
    if (!steps.every((s) => s.includes('Done'))) qa.deviation(2, 'All steps "Done"', `the approved order shows ${steps.map((s) => s.join(' ')).join(' / ')} (its one-step chain, found blocker 30)`);
    const text = (await v.view.innerText()).replace(/\s+/g, ' ');
    if (!/admin|\d{2}[:.]\d{2}/.test(text)) qa.deviation(2, 'All steps "Done", with the name of the approver and the time', `steps ${steps.map((s) => s.join(' ')).join(' / ')}; no approver or time`);
  });

  await qa.step(3, async () => {
    const v = new PurchaseOrdersPage(page);
    if (await v.advance().isEnabled().catch(() => false)) qa.deviation(3, 'No approval button on an approved order', 'the order still offers its approval button');
  });
});

qaTest('TC-APP009-020', async ({ page, qa }) => {
  const doc = docNo(qa);
  expect(await create(page, { docNumber: doc, vendor: 'QA PT Salah Vendor', advance: '100000' })).toContain('Purchase order created');
  const p = new PurchaseOrdersPage(page);
  const has = (re: RegExp) => p.view.getByRole('button', { name: re }).count();

  await qa.step(1, async () => {
    await openOrder(page, doc);
    if (!(await has(/edit|change/i)) && !(await p.view.getByRole('textbox').count())) qa.deviation(1, 'The order opens for editing while it is not yet approved', 'the opened order has no edit; only "Advance approval" and "Close"');
  });
  await qa.step(2, async () => {
    if (!(await has(/cancel/i))) qa.deviation(2, 'A cancellation with a reason', 'no cancel');
  });
  await qa.step(3, async () => {
    if (!(await has(/pay/i))) qa.deviation(3, 'A payment entry; the balance drops by 1000000', 'no payment entry; amount paid stays as typed at creation');
  });
  await qa.step(4, async () => {
    if (!(await has(/print|send|pdf/i))) qa.deviation(4, 'A printable purchase order', 'no print or send');
  });
});

qaTest('TC-APP009-023', async ({ page, qa }) => {
  const p = new PurchaseOrdersPage(page);
  const validity = (name: 'Advance amount' | 'Amount paid') => p.amount(name).evaluate((e) => (e as HTMLInputElement).validity.valid);

  await qa.step(1, async () => {
    const toasts = await create(page, { docNumber: docNo(qa), vendor: PROCUREMENT.vendor, advance: '1000000', paid: '1500000' });
    expect(toasts).not.toContain('Purchase order created');
    if (toasts.some((t) => SERVER_ERROR.test(t))) qa.deviation(1, 'Refused: the amount paid cannot be larger than the advance', `toast "${toasts.join(' / ')}"`);
  });

  await qa.step(2, async () => {
    await p.open();
    await p.openNew();
    await p.fill({ docNumber: docNo(qa), vendor: PROCUREMENT.vendor, advance: '-1' });
    const mark = await toastMark(page);
    await p.save().click();
    const valid = await validity('Advance amount');
    const toasts = await toastsAfter(page, mark, 3_000);
    expect(toasts).not.toContain('Purchase order created');
    if (valid) qa.deviation(2, 'The browser points at the field: the value must be 0 or more', `the field takes -1; toast "${toasts.join(' / ')}"`);
  });

  await qa.step(3, async () => {
    await p.open();
    await p.openNew();
    await p.fill({ docNumber: docNo(qa), vendor: PROCUREMENT.vendor, advance: '1000.555' });
    const mark = await toastMark(page);
    await p.save().click();
    const valid = await validity('Advance amount');
    const toasts = await toastsAfter(page, mark, 3_000);
    if (valid) qa.deviation(3, 'The browser points at the field: two decimals at most', toasts.includes('Purchase order created') ? 'saved' : `toast "${toasts.join(' / ')}"`);
  });

  await qa.step(4, async () => {
    const toasts = await create(page, { docNumber: docNo(qa), vendor: PROCUREMENT.vendor, advance: '0' });
    if (toasts.includes('Purchase order created')) qa.deviation(4, 'Refused: an order needs an amount', 'saved with IDR 0,00');
  });

  await qa.step(5, async () => {
    const toasts = await create(page, { docNumber: docNo(qa), vendor: PROCUREMENT.vendor, advance: '999999999999999999' });
    expect(toasts).not.toContain('Purchase order created');
    if (toasts.some((t) => SERVER_ERROR.test(t))) qa.deviation(5, 'Refused with a message about the size', `toast "${toasts.join(' / ')}"`);
  });
});

qaTest('TC-APP009-024', async ({ page, qa }) => {
  const p = new PurchaseOrdersPage(page);

  await qa.step(1, async () => {
    await p.open();
    await p.openNew();
    await p.fill({ docNumber: docNo(qa), vendor: PROCUREMENT.vendor, advance: '100000', currency: '' });
    const mark = await toastMark(page);
    await p.save().click();
    expect(await p.field('Currency').evaluate((e) => (e as HTMLInputElement).validity.valueMissing)).toBe(true);
    expect(await toastsAfter(page, mark, 3_000)).toEqual([]);
  });

  await qa.step(2, async () => {
    const doc = docNo(qa);
    const toasts = await create(page, { docNumber: doc, vendor: PROCUREMENT.vendor, advance: '100000', currency: '   ' });
    if (toasts.includes('Purchase order created')) qa.deviation(2, 'A message that the currency is missing', `saved; Amount reads "${(await cellsOf(page, doc))[4]}"`);
  });

  await qa.step(3, async () => {
    const doc = docNo(qa);
    const toasts = await create(page, { docNumber: doc, vendor: PROCUREMENT.vendor, advance: PROCUREMENT.advance, currency: 'xyz' });
    if (toasts.includes('Purchase order created')) qa.deviation(3, 'Refused, or the currency is chosen from a list', `saved; Amount reads "${(await cellsOf(page, doc))[4]}"`);
  });

  await qa.step(4, async () => {
    const doc = `QA-PO-${qa.token()}-${'X'.repeat(60)}`.slice(0, 51);
    const toasts = await create(page, { docNumber: doc, vendor: PROCUREMENT.vendor, advance: '100000' });
    expect(toasts).not.toContain('Purchase order created');
    if (!toasts.some((t) => /50|long|limit/i.test(t))) qa.deviation(4, 'Refused with a message that names the limit of 50, or the field stops there', `toast "${toasts.join(' / ')}"`);
  });

  await qa.step(5, async () => {
    const saved: string[] = [];
    for (const d of ['1900-01-01', '2099-12-31']) {
      const toasts = await create(page, { docNumber: docNo(qa), docDate: d, vendor: PROCUREMENT.vendor, advance: '100000' });
      if (toasts.includes('Purchase order created')) saved.push(d);
    }
    if (saved.length) qa.deviation(5, 'Refused, or a warning about the date', `saved without a word: ${saved.join(', ')}`);
  });
});

qaTest('TC-APP009-027', async ({ page, qa }) => {
  const p = new PurchaseOrdersPage(page);
  await p.open();
  const seeded = (await p.rows().evaluateAll((rs) => rs.map((r) => (r.querySelector('td')?.textContent ?? '').trim()))).filter((d) => /^QA-PO-\d+$/.test(d));
  qa.note(1, `seeded orders numbered QA-PO- and digits on the first page: ${seeded.length} (the workbook expects 25)`);
  // Seeded orders at "Step 1" to "Step 4" need the four-step chain; the chain of the site has one step (found blocker 30).
  qa.note(1, 'the 25 seeded QA-PO- orders are not on the site (the list holds three seed orders: PO-001-A, PO-001, PO-USG); orders of the test cannot stand in, as none can wait at "Step 2" to "Step 4"');
  qa.blocked(1, 30);
  qa.blocked(2, 30);
});

qaTest('TC-APP009-035', async ({ page, qa }) => {
  const p = new PurchaseOrdersPage(page);
  const doc = `<script>alert(1)</script> ${qa.token()}`;
  const img = '<img src=x onerror=alert(1)>';
  let alerted = false;
  page.on('dialog', async (d) => {
    alerted = true;
    await d.dismiss();
  });

  await qa.step(1, async () => {
    expect(await create(page, { docNumber: doc, vendor: img, dept: img, currency: img, advance: '100000' })).toContain('Purchase order created');
  });

  await qa.step(2, async () => {
    await expect(p.view.getByRole('heading', { level: 2, name: doc })).toBeVisible();
    await p.view.getByRole('button', { name: 'Close' }).click();
    const c = await cellsOf(page, doc);
    expect(c.slice(0, 4)).toEqual([doc, '—', img, img]);
    await expect(p.table.locator('img')).toHaveCount(0);
    expect(alerted).toBe(false);
  });

  qa.notRun(3, 'Audit is read by the Superadmin (U10, deferred)');
});
