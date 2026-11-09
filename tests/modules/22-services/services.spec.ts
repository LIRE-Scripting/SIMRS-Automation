import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { allBranchesList, allBranchesSave, asAllBranches, auditEntries, menuScreens, toastsOf, userPage } from '../shared/access';
import { screenOpens } from '../shared/screen-opens';
import { act, approvedPr, category, desk, item, ORDER, purchaseRequest, request, SAVED, TC_APP022_001, TC_APP022_003, TC_APP022_005, TC_APP022_009, TC_APP022_012 } from './cases';

/**
 * 22-services.xlsx: category, item, request, purchase request and purchase
 * order. Each screen has one button that opens a dialog (one or two steps)
 * with an "Action" list; actions on a saved document take its internal id
 * (the column "Code") in "Document". Refusals show the toast "Minified React
 * error #441" (HTTP 500): the expected server text is recorded next to it.
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

/** Expects a refusal; records the toast next to the server text the workbook names. */
function refused(qa: Qa, step: number, toasts: string[], serverText: string): void {
  // A save the workbook expects refused, saved by the site: a deviation, not an error of the test.
  if (toasts.includes(SAVED)) return qa.deviation(step, `Refused (the server text ends in "${serverText}")`, 'saved ("Saved.")');
  qa.note(step, `toast "${toasts.join(' / ').slice(0, 120)}" (the workbook: the server text ends in "${serverText}")`);
}

qaTest('TC-APP022-001', TC_APP022_001);

qaTest('TC-APP022-002', async ({ page, qa }) => {
  const d = desk(page, 'categories');
  const code = await category(page, qa);
  await category(page, qa, code);
  await qa.step(1, async () => refused(qa, 1, await d.save({ Code: qa.bed('X-LDR'), Name: qa.name('X Laundry uji'), 'Purchase account': '' }), 'code, name, account and center are required'));
  await qa.step(2, async () => {
    const own = qa.bed('X-LDR');
    refused(qa, 2, await d.save({ Code: own, Name: qa.name('X Laundry uji'), Parent: own }), 'category cannot parent itself');
  });
  await qa.step(3, async () => refused(qa, 3, await d.save({ Code: qa.bed('X-LDR'), Name: qa.name('X Laundry uji'), Parent: qa.bed('X-TIDAK-ADA') }), 'parent is missing'));
  await qa.step(4, async () => refused(qa, 4, await d.save({ Code: code, Name: qa.name('X Laundry uji') }), 'duplicate'));
  await qa.step(5, async () => refused(qa, 5, await d.save({ Code: code }, 'Delete category'), 'children exist'));
  await qa.step(6, async () => refused(qa, 6, await d.save({ Code: qa.bed('X-TIDAK-ADA') }, 'Deactivate'), 'category is missing'));
  await qa.step(7, async () => {
    const toasts = await d.save({ Code: qa.bed('X-LDR'), Name: qa.name('X Laundry uji'), 'Purchase account': '9999-QA' });
    qa.note(7, `account "9999-QA": toast "${toasts.join(' / ')}"`);
  });
});

qaTest('TC-APP022-003', TC_APP022_003);

qaTest('TC-APP022-004', async ({ page, qa }) => {
  const d = desk(page, 'items');
  const cat = await category(page, qa);
  const code = await item(page, qa, cat);
  await qa.step(1, async () => refused(qa, 1, await d.save({ Code: qa.bed('X-CUCI'), Name: qa.name('X Cuci linen uji'), Parent: cat, 'Sales account': '' }), 'accounts are required'));
  await qa.step(2, async () => refused(qa, 2, await d.save({ Code: qa.bed('X-CUCI'), Name: qa.name('X Cuci linen uji') }), 'category is missing'));
  await qa.step(3, async () => refused(qa, 3, await d.save({ Code: code, Name: qa.name('X Cuci linen uji'), Parent: cat }), 'duplicate'));
  await qa.step(4, async () => {
    await d.open();
    await d.main.getByRole('button', { name: 'Save item' }).click();
    await d.dialog.getByRole('button', { name: 'Next' }).click();
    await expect(d.dialog.getByRole('combobox', { name: 'Action' })).toHaveCount(0);
  });
});

qaTest('TC-APP022-005', TC_APP022_005);

qaTest('TC-APP022-006', async ({ page, qa }) => {
  const d = desk(page, 'requests');
  const cat = await category(page, qa);
  const it = await item(page, qa, cat);
  const fields = (extra: Record<string, string>) => ({ Number: qa.bed('X-SR-001'), Parent: cat, Item: it, Department: qa.prefix('X Bangsal uji'), Description: qa.prefix('X cuci linen'), ...extra });
  await qa.step(1, async () => refused(qa, 1, await d.save(fields({ Department: '' })), 'number, category, item, center and department are required'));
  await qa.step(2, async () => refused(qa, 2, await d.save(fields({ Item: 'CUCI' })), 'item is missing'));
  const draft = await request(page, qa, it, cat);
  await qa.step(3, async () => refused(qa, 3, await act(page, 'requests', draft, 'Approve request'), 'send the request first'));
  await qa.step(4, async () => {
    expect(await act(page, 'requests', draft, 'Send request')).toContain(SAVED);
    refused(qa, 4, await act(page, 'requests', draft, 'Complete'), 'complete only from approved');
  });
  await qa.step(5, async () => {
    refused(qa, 5, await d.save({ Document: '' }, 'Send request'), 'document is missing');
    refused(qa, 5, await d.save({ Document: draft }, 'Send request'), 'document is missing');
  });
});

qaTest('TC-APP022-007', async ({ page, qa }) => {
  const d = desk(page, 'requests');
  const cat = await category(page, qa);
  const it = await item(page, qa, cat);
  await qa.step(1, async () => {
    const no = await request(page, qa, it, cat);
    expect(await act(page, 'requests', no, 'Send request')).toContain(SAVED);
    expect(await act(page, 'requests', no, 'Reject request')).toContain(SAVED);
    expect(await d.status(no)).toBe('rejected');
  });
  await qa.step(2, async () => {
    const no = await request(page, qa, it, cat);
    for (const a of ['Send request', 'Approve request', 'Cancel request']) expect(await act(page, 'requests', no, a), a).toContain(SAVED);
    expect(await d.status(no)).toBe('cancelled');
  });
  await qa.step(3, async () => {
    const no = await request(page, qa, it, cat);
    for (const a of ['Send request', 'Approve request', 'Partial']) expect(await act(page, 'requests', no, a), a).toContain(SAVED);
    refused(qa, 3, await act(page, 'requests', no, 'Complete'), 'complete only from approved');
  });
  await qa.step(4, async () => {
    const no = await request(page, qa, it, cat);
    expect(await act(page, 'requests', no, 'Send request')).toContain(SAVED);
    const toasts = await act(page, 'requests', no, 'Approve request');
    qa.note(4, `the creator approves the own request: "${toasts.join(' / ')}"`);
  });
});

qaTest('TC-APP022-008', async ({ page, qa, browser }) => {
  // The category and the item (made by U1); U2 works on "All branches".
  const cat = await category(page, qa);
  const it = await item(page, qa, cat);
  await asAllBranches(browser, async (u2) => {
    const d = desk(u2, 'requests');
    await qa.step(1, async () => {
      await d.open();
      await allBranchesList(u2, qa, 1);
    });
    await qa.step(2, async () => {
      const v = { Number: qa.bed('X-SR-001'), Parent: cat, Item: it, Department: qa.prefix('X Bangsal uji'), Description: qa.prefix('X cuci linen') };
      allBranchesSave(qa, 2, await d.save(v));
    });
  });
});

qaTest('TC-APP022-009', TC_APP022_009);

qaTest('TC-APP022-010', async ({ page, qa }) => {
  const d = desk(page, 'purchase-requests');
  const it = await item(page, qa, await category(page, qa));
  await qa.step(1, async () => refused(qa, 1, await d.save({ Item: it, Store: 'CSSD', Quantity: '0' }), 'item, store and quantity are required'));
  await qa.step(2, async () => refused(qa, 2, await d.save({ Item: qa.bed('X-TIDAK-ADA'), Store: 'CSSD', Quantity: '2' }), 'item is missing'));
  await qa.step(3, async () => {
    const id = await purchaseRequest(page, it);
    refused(qa, 3, await d.save({ Document: id }, 'Approve purchase request'), 'send the request first');
  });
  await qa.step(4, async () => {
    const toasts = await d.save({ Item: it, Store: qa.prefix('X Gudang tidak ada'), Quantity: '2' });
    qa.note(4, `a store that is not in Inventory: "${toasts.join(' / ')}"`);
  });
});

qaTest('TC-APP022-011', async ({ page, qa, browser }) => {
  const it = await item(page, qa, await category(page, qa));
  await asAllBranches(browser, async (u2) => {
    const d = desk(u2, 'purchase-requests');
    await qa.step(1, async () => {
      await d.open();
      await allBranchesList(u2, qa, 1);
    });
    await qa.step(2, async () => allBranchesSave(qa, 2, await d.save({ Item: it, Store: 'CSSD', Quantity: '2' })));
  });
});

qaTest('TC-APP022-012', TC_APP022_012);

qaTest('TC-APP022-013', async ({ page, qa }) => {
  const d = desk(page, 'orders');
  const it = await item(page, qa, await category(page, qa));
  const pr = await approvedPr(page, it);
  await qa.step(1, async () => {
    const sent = await purchaseRequest(page, it);
    expect(await desk(page, 'purchase-requests').save({ Document: sent }, 'Send purchase request')).toContain(SAVED);
    refused(qa, 1, await d.save(ORDER(qa, it, sent)), 'approve the request first');
  });
  await qa.step(2, async () => refused(qa, 2, await d.save(ORDER(qa, it, '')), 'document is missing'));
  await qa.step(3, async () => refused(qa, 3, await d.save(ORDER(qa, it, pr, { Terms: '' })), 'vendor, tax, terms, item, quantity and rate are required'));
  const draft = ORDER(qa, it, pr);
  expect(await d.save(draft)).toContain(SAVED);
  await qa.step(4, async () => {
    const approved = ORDER(qa, it, pr);
    expect(await d.save(approved)).toContain(SAVED);
    for (const a of ['Send order', 'Approve order']) expect(await act(page, 'orders', approved.Number, a), a).toContain(SAVED);
    refused(qa, 4, await d.save({ Number: '', Document: await d.id(approved.Number) }, 'Amend'), 'a new number is required');
  });
  await qa.step(5, async () => refused(qa, 5, await d.save({ Number: qa.bed('X-SPO-001'), Document: await d.id(draft.Number) }, 'Amend'), 'approve the order first'));
  await qa.step(6, async () => {
    const toasts = await d.save(ORDER(qa, it, pr, { Rate: '0' }));
    qa.note(6, `rate 0: "${toasts.join(' / ')}"`);
  });
});

qaTest('TC-APP022-014', async ({ page, qa, browser }) => {
  // An approved service purchase request (made by U1).
  const it = await item(page, qa, await category(page, qa));
  const pr = await approvedPr(page, it);
  await asAllBranches(browser, async (u2) => {
    const d = desk(u2, 'orders');
    await qa.step(1, async () => {
      await d.open();
      await allBranchesList(u2, qa, 1);
    });
    await qa.step(2, async () => allBranchesSave(qa, 2, await d.save(ORDER(qa, it, pr))));
  });
});

qaTest('TC-APP022-022', async ({ page, qa, browser }) => {
  // Precondition (made by U1): a purchase order sent for approval.
  const it = await item(page, qa, await category(page, qa));
  const v = ORDER(qa, it, await approvedPr(page, it));
  expect(await desk(page, 'orders').save(v)).toContain(SAVED);
  expect(await act(page, 'orders', v.Number, 'Send order')).toContain(SAVED);
  const staff = await userPage(browser, 'U3');
  try {
    await qa.step(1, async () => {
      qa.note(1, `U3 opens ${(await menuScreens(staff, '/services', ['Service request', 'Service purchase order', 'Service category'])).join('; ')} (TBD in the workbook)`);
    });
    await qa.step(2, async () => {
      const cat = await category(page, qa);
      refused(qa, 2, await desk(staff, 'requests').save({ Number: qa.bed('X-SR-001'), Parent: cat, Item: it, Department: qa.prefix('X Bangsal uji'), Description: qa.prefix('X cuci linen') }), 'missing required privilege');
    });
    await qa.step(3, async () => {
      refused(qa, 3, await desk(staff, 'orders').save({ Document: await desk(page, 'orders').id(v.Number) }, 'Approve order'), 'missing required privilege');
      expect(await desk(page, 'orders').status(v.Number)).toBe('sent');
    });
    await qa.step(4, async () => {
      await staff.goto('/id/services/bills');
      await expect(staff.getByRole('main').getByRole('heading', { level: 1, name: 'Vendor bill' })).toBeVisible();
      const open = staff.getByRole('main').getByRole('button').filter({ hasNotText: /^(Search|Next page|Previous page)$/ }).first();
      await open.click();
      const d = staff.getByRole('dialog');
      for (const box of await d.getByRole('textbox').all()) if (!(await box.inputValue())) await box.fill(qa.prefix('X-UJI'));
      const next = d.getByRole('button', { name: 'Next' });
      if (await next.isVisible()) await next.click();
      const toasts = await toastsOf(staff, () => d.getByRole('button', { name: 'Save' }).click());
      refused(qa, 4, toasts, 'missing required privilege');
    });
    await qa.step(5, async () => {
      const entries = await auditEntries(page, 'services');
      qa.note(5, `Audit Log, module "services": ${entries.length} entries${entries[0] ? `, newest "${entries[0].slice(0, 120)}"` : ''} (TBD in the workbook: no entry is written)`);
    });
  } finally {
    await staff.context().close();
  }
});

const ROUTES: [string, string, string][] = [
  ['TC-APP022-023', '/services', 'Services'],
  ['TC-APP022-024', '/services/bills', 'Vendor bill'],
  ['TC-APP022-025', '/services/categories', 'Service category'],
  ['TC-APP022-026', '/services/items', 'Service item'],
  ['TC-APP022-027', '/services/orders', 'Service purchase order'],
  ['TC-APP022-028', '/services/purchase-requests', 'Service purchase request'],
  ['TC-APP022-029', '/services/receipts', 'Service receipt'],
  ['TC-APP022-030', '/services/requests', 'Service request'],
];
for (const [id, route, heading] of ROUTES) {
  qaTest(id, async ({ page, qa }) => {
    await qa.step(1, () => screenOpens(page, route, heading, qa));
  });
}
