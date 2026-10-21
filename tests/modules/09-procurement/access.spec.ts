import type { Page } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { todayWib } from '../../../lib/dates';
import { PROCUREMENT } from '../../../lib/procurement-data';
import { PurchaseOrdersPage, type PurchaseOrder } from '../../../pages/procurement/ProcurementPages';
import { appsCardRefused, asUser, BR_B, headerOneBranch, routesRefused, toastsOf, tryRefused, userPage } from '../shared/access';

/**
 * 09-procurement.xlsx, the access test cases of Purchase orders, the
 * opened order (reject, send back, remarks) and finding an order: U2 on
 * "All branches", U3 without any right, and U1 next to a branch of U6
 * (Kemayoran). Document numbers carry a token.
 */

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

const CREATED = 'Purchase order created';
const docNo = (qa: Qa, base = 'QA-PO-001') => `${base}-${qa.token()}`;

/** Creates an order through "New PO"; returns the toasts (the opened order stays on screen). */
async function create(page: Page, po: PurchaseOrder): Promise<string[]> {
  const p = new PurchaseOrdersPage(page);
  await p.open();
  await p.openNew();
  await p.fill(po);
  return toastsOf(page, () => p.save().click());
}

async function listed(page: Page, doc: string): Promise<number> {
  const p = new PurchaseOrdersPage(page);
  await p.open();
  return (await p.find(doc)).count();
}

async function openOrder(page: Page, doc: string): Promise<PurchaseOrdersPage> {
  const p = new PurchaseOrdersPage(page);
  await p.open();
  await (await p.find(doc)).getByRole('button', { name: 'Open' }).click();
  await expect(p.view).toBeVisible();
  return p;
}

const order = (qa: Qa, extra: PurchaseOrder = {}): PurchaseOrder => ({ docNumber: docNo(qa), docDate: todayWib(), vendor: PROCUREMENT.vendor, dept: PROCUREMENT.dept, advance: PROCUREMENT.advance, ...extra });

qaTest('TC-APP009-008', async ({ page, qa, browser }) => {
  const p = new PurchaseOrdersPage(page);
  const po = order(qa, { vendor: qa.name('QA PT Pusat') });
  const branch = p.form.getByRole('combobox', { name: 'Branch' });

  await qa.step(1, async () => {
    await p.open();
    const headers = (await p.table.getByRole('columnheader').allInnerTexts()).map((h) => h.trim());
    if (!headers.some((h) => /branch/i.test(h))) qa.note(1, `the list has no Branch column (columns: ${headers.join(', ')})`);
  });

  await qa.step(2, async () => {
    await p.openNew();
    await expect(branch).toBeVisible();
  });

  await qa.step(3, async () => {
    await p.fill(po);
    const toasts = await toastsOf(page, () => p.save().click());
    expect(toasts).not.toContain(CREATED);
    const message = toasts.join(' / ') || (await branch.evaluate((e: HTMLSelectElement) => e.validationMessage));
    expect(message).not.toBe('');
    qa.note(3, `without a branch: "${message}"`);
  });

  await qa.step(4, async () => {
    await branch.selectOption({ label: BR_B });
    expect(await toastsOf(page, () => p.save().click())).toContain(CREATED);
  });

  await qa.step(5, async () => {
    expect(await asUser(browser, 'U6', (u6) => listed(u6, po.docNumber!))).toBe(1);
    expect(await asUser(browser, 'U1', (u1) => listed(u1, po.docNumber!))).toBe(0);
  });
});

qaTest('TC-APP009-019', async ({ page, qa }) => {
  // PO-S2: an order of this test advanced to step 2.
  const po = order(qa);
  expect(await create(page, po)).toContain(CREATED);
  const p = new PurchaseOrdersPage(page);
  await toastsOf(page, () => p.advance().click());
  await p.view.getByRole('button', { name: 'Close' }).click();
  const v = await openOrder(page, po.docNumber!);
  const buttons = (await v.view.getByRole('button').allInnerTexts()).map((b) => b.trim()).filter(Boolean);
  qa.note(1, `the opened order offers: ${buttons.join(', ')}`);

  await qa.step(1, async () => {
    if (!buttons.some((b) => /reject/i.test(b))) qa.deviation(1, 'A button to reject, with a reason', `no reject (buttons: ${buttons.join(', ')})`);
  });
  await qa.step(2, async () => {
    if (!buttons.some((b) => /return|send back|correction/i.test(b))) qa.deviation(2, 'A button to return it for correction', `no way to send the order back (buttons: ${buttons.join(', ')})`);
  });
  await qa.step(3, async () => {
    if (!(await v.view.getByRole('textbox').count())) qa.deviation(3, 'A remarks field', 'the opened order has no input for a remark');
  });
});

qaTest('TC-APP009-026', async ({ page, qa }) => {
  // The order "without a date" just created: the form has a date that may be emptied.
  const doc = docNo(qa);
  const toasts = await create(page, order(qa, { docNumber: doc, docDate: '' }));
  qa.note(4, `an order without a date: "${toasts.join(' / ')}"`);
  const p = new PurchaseOrdersPage(page);
  await p.open();

  await qa.step(1, async () => {
    if (!(await page.getByRole('searchbox').or(page.getByRole('textbox', { name: /search/i })).count())) qa.deviation(1, 'A search by document number or vendor', 'the list has no search');
  });
  await qa.step(2, async () => {
    if (!(await page.getByRole('combobox').count())) qa.deviation(2, 'A filter is present', 'the list has no filter by approval step or "waiting for me"');
  });
  await qa.step(3, async () => {
    const first = await p.rows().first().innerText();
    await p.table.getByRole('columnheader').first().click();
    await page.waitForLoadState('networkidle').catch(() => {});
    if ((await p.rows().first().innerText()) === first) qa.deviation(3, 'The list sorts by that column', 'a click on a heading changes nothing');
  });
  await qa.step(4, async () => {
    if (!toasts.includes(CREATED)) {
      qa.note(4, 'the order without a date was not created; the first row is read');
      return;
    }
    const first = (await p.cells(p.rows().first()))[0];
    if (first !== doc) qa.deviation(4, 'The first row of the list', `the first row is ${first}; ${doc} is ${(await (await p.find(doc)).count()) ? 'on a later page' : 'not found'}`);
  });
});

qaTest('TC-APP009-030', async ({ page, qa, browser }) => {
  // PO-S1: an order of this test at step 1 (made by U1).
  const po = order(qa);
  expect(await create(page, po)).toContain(CREATED);
  const staff = await userPage(browser, 'U3');
  try {
    await qa.step(1, async () => {
      const other = order(qa, { vendor: qa.name('QA Tanpa Hak'), advance: '100000' });
      expect(await create(staff, other).then((t) => t.filter((x) => x === CREATED))).toEqual([]);
      expect(await listed(page, other.docNumber!)).toBe(0);
    });
    await qa.step(2, async () => {
      const v = await openOrder(staff, po.docNumber!);
      await tryRefused(qa, 2, staff, 'Advance approval', /^(Approval advanced|Advanced)/i, () => v.advance().click());
      const mine = new PurchaseOrdersPage(page);
      await mine.open();
      expect((await mine.cells(await mine.find(po.docNumber!)))[6]).toBe('Step 1');
    });
    qa.note(1, '"New PO", "Open" and "Advance approval" are shown to U3; the refusal comes only after the click');
  } finally {
    await staff.context().close();
  }
});

qaTest('TC-APP009-031', async ({ qa, browser }) => {
  await asUser(browser, 'U3', async (staff) => {
    await qa.step(1, () => appsCardRefused(staff, qa, 1, /^Procurement\b/));
    await qa.step(2, () => routesRefused(staff, qa, 2, ['/procurement/purchase-orders']));
  });
});

qaTest('TC-APP009-032', async ({ page, qa, browser }) => {
  // PO-B: an order of BR-B made by U6.
  const po = order(qa);
  await asUser(browser, 'U6', async (u6) => expect(await create(u6, po)).toContain(CREATED));

  await qa.step(1, async () => {
    expect(await listed(page, po.docNumber!)).toBe(0);
  });

  await qa.step(2, () => headerOneBranch(page, qa, 2));
});
