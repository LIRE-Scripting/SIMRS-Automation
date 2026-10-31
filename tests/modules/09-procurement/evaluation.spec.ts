import type { Page } from '@playwright/test';
import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark } from '../../../lib/assertions';
import { PROCUREMENT } from '../../../lib/procurement-data';
import { PurchaseOrdersPage } from '../../../pages/procurement/ProcurementPages';
import { Vouchers } from '../19-finance/helpers';
import { signedOutJourney, userPage } from '../shared/access';
import { createOrder, docNo, openOrder, poToastsAfter as toastsAfter } from './cases';

/**
 * 09-procurement.xlsx, the journeys marked "Needs Evaluation" (automated
 * since 2026-10-29, open question Q10). The purchase order chain of the site
 * has one step, not four (found blocker 30): no order can wait at step 2, 3
 * or 4. Goods receipts answer HTTP 500 (found blocker 31). "Approver 2",
 * "Director" and "the second user" are U4 (qa.admin3).
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

const po = (doc: string) => ({ docNumber: doc, vendor: PROCUREMENT.vendor, dept: PROCUREMENT.dept, advance: PROCUREMENT.advance });

/** Advances the opened order once; returns the toasts. */
async function advance(page: Page, doc: string): Promise<string[]> {
  const p = await openOrder(page, doc);
  if (await p.advance().isDisabled()) return ['(Advance approval is disabled)'];
  const mark = await toastMark(page);
  await p.advance().click();
  return toastsAfter(page, mark);
}

/** The figures of the Home tiles. */
async function tiles(page: Page): Promise<Record<string, number>> {
  await page.goto('/id');
  await page.waitForLoadState('networkidle').catch(() => {});
  const text = await page.getByRole('main').innerText();
  const out: Record<string, number> = {};
  for (const t of ['Group Tasks', 'My Pending Documents', 'My Approval Documents']) {
    const m = text.match(new RegExp(`(\\d+)\\s*\\n\\s*${t}`));
    out[t] = m ? Number(m[1]) : NaN;
  }
  return out;
}

qaTest('TC-APP009-005', async ({ page, qa }) => {
  const doc = docNo(qa);
  expect(await createOrder(page, po(doc))).toContain('Purchase order created');
  qa.note(1, `PO-S1 is an order of this test (${doc})`);
  await qa.step(1, async () => {
    expect(await advance(page, doc)).toContain('Approval advanced');
    const p = await openOrder(page, doc);
    const steps = await p.steps();
    qa.note(1, `chain after the advance: ${steps.map((s) => s.join(' ')).join(' / ')}`);
    if (steps.length < 2) qa.deviation(1, 'Row Approval "Step 2"', `the chain has ${steps.length} step: the order is fully approved (found blocker 30)`);
  });
  for (const st of [2, 3, 4]) qa.blocked(st, 30);
});

qaTest('TC-APP009-009', async ({ page, qa, browser }) => {
  const doc = docNo(qa);
  const approver = await userPage(browser, 'U4');
  try {
    const before = { a: await tiles(approver), o: await tiles(page) };
    expect(await createOrder(page, po(doc))).toContain('Purchase order created');
    qa.note(1, `the order ${doc} waits at step 1, not 2: the chain has one step (found blocker 30)`);
    let mid = { a: before.a, o: before.o };
    await qa.step(1, async () => {
      mid = { a: await tiles(approver), o: mid.o };
      qa.note(1, `Approver 2 (U4): ${JSON.stringify(before.a)} → ${JSON.stringify(mid.a)}`);
      for (const t of ['Group Tasks', 'My Approval Documents']) {
        if (!(mid.a[t] > before.a[t])) qa.deviation(1, `"${t}" includes the order`, `"${t}" reads ${mid.a[t]} before and after the order (${before.a[t]})`);
      }
    });
    await qa.step(2, async () => {
      mid = { a: mid.a, o: await tiles(page) };
      qa.note(2, `Officer (U1): ${JSON.stringify(before.o)} → ${JSON.stringify(mid.o)}`);
      if (!(mid.o['My Pending Documents'] > before.o['My Pending Documents'])) qa.deviation(2, '"My Pending Documents" includes the order', `it reads ${mid.o['My Pending Documents']} (${before.o['My Pending Documents']} before)`);
    });
    await qa.step(3, async () => {
      const toasts = await advance(approver, doc);
      qa.note(3, `Approver 2 advances: "${toasts.join(' / ')}"`);
      const after = await tiles(approver);
      qa.note(3, `Approver 2's tiles: ${JSON.stringify(after)}`);
      for (const t of ['Group Tasks', 'My Approval Documents']) {
        if (after[t] !== mid.a[t] - 1) qa.deviation(3, `"${t}" lower by one`, `${mid.a[t]} → ${after[t]}`);
      }
    });
  } finally {
    await approver.context().close();
  }
});

qaTest('TC-APP009-017', async ({ qa }) => {
  qa.blocked(1, 30);
  qa.blocked(2, 30);
  qa.note(1, 'PO-S2 and PO-S3 cannot wait at steps 2 and 3: the chain has one step (found blocker 30); the Pharmacist and Cashier accounts are not prepared either (blocker 38)');
});

qaTest('TC-APP009-018', async ({ page, qa, browser }) => {
  await qa.step(1, async () => {
    const doc = docNo(qa);
    expect(await createOrder(page, { ...po(doc), advance: '5000000' })).toContain('Purchase order created');
    const toasts = await advance(page, doc);
    qa.note(1, `the creator advances ${doc}: "${toasts.join(' / ')}"`);
    if (toasts.includes('Approval advanced')) qa.deviation(1, 'Refused: the creator cannot approve their own order', 'the creator approves the order');
  });
  const second = await userPage(browser, 'U4');
  try {
    await qa.step(2, async () => {
      const doc = docNo(qa);
      expect(await createOrder(second, { ...po(doc), advance: '5000000' })).toContain('Purchase order created');
      const results: string[] = [];
      for (let i = 0; i < 4; i++) results.push((await advance(second, doc)).join(' / ') || 'no toast');
      qa.note(2, `U4 advances its own order four times: ${results.join(' ; ')}`);
      if (results[0].includes('Approval advanced')) qa.deviation(2, 'Refused: the creator cannot approve (and one person not consecutive steps)', 'U4 approves its own order');
    });
  } finally {
    await second.context().close();
  }
  qa.blocked(2, 30);
  qa.blocked(3, 30);
  qa.note(3, 'with one step per order (found blocker 30) Audit cannot show a different user per step');
});

qaTest('TC-APP009-021', async ({ qa }) => {
  for (const st of [1, 2, 3]) qa.blocked(st, 31);
  qa.note(1, 'goods are received on /procurement/receipts, whose "grn" answers HTTP 500 (found blocker 31); Inventory has no receipt against an order');
  qa.blocked(4, 30);
});

qaTest('TC-APP009-022', async ({ page, qa }) => {
  const doc = docNo(qa);
  expect(await createOrder(page, { ...po(doc), advance: '5000000', paid: '1000000' })).toContain('Purchase order created');
  expect(await advance(page, doc)).toContain('Approval advanced');
  qa.note(1, `an approved order of this test: ${doc}, advance 5000000, paid 1000000`);
  const v = new Vouchers(page);
  const mentions = async (re: RegExp) => {
    await v.open();
    const rows = (await v.rows().allInnerTexts()).map((r) => r.replace(/\s+/g, ' '));
    return rows.filter((r) => r.includes(doc) || re.test(r));
  };
  await qa.step(1, async () => {
    const hits = await mentions(/1[.,]000[.,]000/);
    qa.note(1, `vouchers naming ${doc} or 1,000,000: ${hits.slice(0, 3).join(' ; ') || 'none'}`);
    if (!hits.some((h) => h.includes(doc))) qa.deviation(1, 'A payment voucher or a vendor advance for the order', `no voucher names ${doc}`);
  });
  await qa.step(2, async () => {
    const hits = await mentions(/4[.,]000[.,]000/);
    if (!hits.some((h) => h.includes(doc))) qa.deviation(2, 'An amount owed to the vendor, or a commitment', `no entry of 4,000,000 for ${doc}`);
  });
  await qa.step(3, async () => {
    const big = docNo(qa);
    const toasts = await createOrder(page, { ...po(big), advance: '999999999999' });
    qa.note(3, `an order of 999,999,999,999 for ${PROCUREMENT.dept}: "${toasts.join(' / ')}"`);
    if (toasts.includes('Purchase order created')) qa.deviation(3, "A warning or a refusal (larger than the department's budget)", 'created with no warning');
  });
});

qaTest('TC-APP009-025', async ({ page, qa, browser }) => {
  const doc = docNo(qa);
  expect(await createOrder(page, po(doc))).toContain('Purchase order created');
  await qa.step(1, async () => {
    const toasts = await createOrder(page, po(doc));
    qa.note(1, `"${doc}" again: "${toasts.join(' / ')}"`);
    if (toasts.includes('Purchase order created')) qa.deviation(1, 'Refused: the number is already in use', `a second order "${doc}" is created`);
  });
  const director = await userPage(browser, 'U4');
  const vendor = `${PROCUREMENT.vendor} ${qa.token()}`;
  try {
    await qa.step(2, async () => {
      const [p1, p2] = [new PurchaseOrdersPage(page), new PurchaseOrdersPage(director)];
      await Promise.all([p1.open(), p2.open()]);
      await Promise.all([p1.openNew(), p2.openNew()]);
      for (const p of [p1, p2]) await p.fill({ vendor, advance: '100000' });
      const [m1, m2] = [await toastMark(page), await toastMark(director)];
      await Promise.all([p1.save().click(), p2.save().click()]);
      const [t1, t2] = [await toastsAfter(page, m1), await toastsAfter(director, m2)];
      qa.note(2, `two orders without a number at the same moment: "${t1.join(' / ')}" and "${t2.join(' / ')}"`);
    });
  } finally {
    await director.context().close();
  }
  await qa.step(3, async () => {
    const p = new PurchaseOrdersPage(page);
    await p.open();
    const all: string[] = [];
    const next = page.getByRole('button', { name: 'Next page' });
    for (let i = 0; i < 60; i++) {
      const rows = await p.rows().evaluateAll((rs) => rs.map((r) => [...r.querySelectorAll('td')].slice(0, 3).map((td) => (td.textContent ?? '').trim())));
      all.push(...rows.filter((r) => r[0] === doc || r[2] === vendor).map((r) => `${r[0]}|${r[2]}`));
      if (!(await next.isVisible()) || (await next.isDisabled())) break;
      const first = await p.rows().first().innerText();
      await next.press('Enter');
      await expect(p.rows().first()).not.toHaveText(first);
    }
    const numbers = all.map((r) => r.split('|')[0]);
    qa.note(3, `rows of the test: ${all.join(', ')}`);
    const dup = numbers.filter((n, i) => n !== '—' && numbers.indexOf(n) !== i);
    if (dup.length) qa.deviation(3, 'Every number appears once', `${[...new Set(dup)].join(', ')} appear more than once`);
    const blank = all.filter((r) => r.endsWith(`|${vendor}`) && /^(—|)\|/.test(r));
    if (blank.length) qa.deviation(2, 'Two different numbers', `${blank.length} order(s) saved without a number`);
  });
});

qaTest('TC-APP009-034', ({ qa, browser }) => signedOutJourney(browser, qa, '/procurement/purchase-orders', /\/(id|en)\/procurement\/purchase-orders/));

qaTest('TC-APP009-036', async ({ page, qa, browser }) => {
  const p = new PurchaseOrdersPage(page);
  await qa.step(1, async () => {
    const doc = docNo(qa);
    await p.open();
    await p.openNew();
    await p.fill({ docNumber: doc, vendor: `QA Cepat ${qa.token()}`, advance: '100000' });
    await p.save().dblclick();
    await page.waitForTimeout(3000);
    await p.open();
    const n = await (await p.find(doc)).count();
    qa.note(1, `double-click on "Save": ${n} order(s) ${doc}`);
    if (n !== 1) qa.deviation(1, 'One purchase order. The button is disabled while it reads "Saving…"', `${n} orders`);
  });
  const director = await userPage(browser, 'U4');
  try {
    await qa.step(2, async () => {
      const doc = docNo(qa);
      expect(await createOrder(page, po(doc))).toContain('Purchase order created');
      const [p1, p2] = [await openOrder(page, doc), await openOrder(director, doc)];
      const m1 = await toastMark(page);
      await p1.advance().click();
      const t1 = await toastsAfter(page, m1);
      const m2 = await toastMark(director);
      const enabled = await p2.advance().isEnabled();
      if (enabled) await p2.advance().click();
      const t2 = enabled ? await toastsAfter(director, m2) : ['(disabled)'];
      qa.note(2, `one after the other: "${t1.join(' / ')}" and "${t2.join(' / ')}"`);
      expect(t1).toContain('Approval advanced');
      if (t2.includes('Approval advanced')) qa.deviation(2, 'The second is told that step 1 was already passed', 'advanced a second time');
    });
  } finally {
    await director.context().close();
  }
  await qa.step(3, async () => {
    await p.open();
    await p.openNew();
    await p.fill({ vendor: 'QA Cep' });
    let warned = false;
    page.once('dialog', (d) => {
      warned = true;
      void d.accept();
    });
    await page.reload({ timeout: 30_000 }).catch(() => {});
    await p.open();
    if (!warned && !(await p.form.isVisible().catch(() => false))) qa.deviation(3, 'The text is kept, or the officer is warned', 'the half-filled order is lost with no warning');
  });
});
