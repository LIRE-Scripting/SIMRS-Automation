import type { Page } from '@playwright/test';
import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark } from '../../../lib/assertions';
import { PROCUREMENT } from '../../../lib/procurement-data';
import { PurchaseOrdersPage } from '../../../pages/procurement/ProcurementPages';
import { Vouchers } from '../19-finance/helpers';
import { roleAccountPage, signedOutJourney, userPage } from '../shared/access';
import { approvalOf, createOrder, docNo, openOrder, orderAtStep, poToastsAfter as toastsAfter } from './cases';
import type { QaBody } from '../../../fixtures/e2e';

/** The test cases of evaluation.spec.ts, shared with the end-to-end chains (chain.run). */

export const po = (doc: string) => ({ docNumber: doc, vendor: PROCUREMENT.vendor, dept: PROCUREMENT.dept, advance: PROCUREMENT.advance });

/** Advances the opened order once; returns the toasts. */
export async function advance(page: Page, doc: string): Promise<string[]> {
  const p = await openOrder(page, doc);
  if (await p.advance().isDisabled()) return ['(Advance approval is disabled)'];
  const mark = await toastMark(page);
  await p.advance().click();
  return toastsAfter(page, mark);
}

/** The figures of the Home tiles. */
export async function tiles(page: Page): Promise<Record<string, number>> {
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

export const TC_APP009_005: QaBody = async ({ page, qa, browser }) => {
  // The four users of the workbook: Officer U1, Approver 2 U5 (qa.approver), Approver 3 U4 (qa.admin3), Director U1 again
  // (the second admin of the tenant is U4, already Approver 3). The chain of the site names no role per step (Workflow has none).
  const doc = await orderAtStep(page, qa, 1);
  qa.note(1, `PO-S1 is an order of this test (${doc}); Officer U1, Approver 2 U5, Approver 3 U4, Director U1 (no other admin of BR-A)`);
  const u5 = await userPage(browser, 'U5');
  const u4 = await userPage(browser, 'U4');
  try {
    const at: [number, Page, string, string][] = [
      [1, page, 'Step 2', 'Verifikasi Gudang'],
      [2, u5, 'Step 3', 'Persetujuan Manajer Keuangan'],
      [3, u4, 'Step 4', 'Persetujuan Direktur'],
    ];
    for (const [step, who, row, current] of at) {
      await qa.step(step, async () => {
        await installToastRecorder(who);
        expect(await advance(who, doc)).toContain('Approval advanced');
        const steps = await (await openOrder(page, doc)).steps();
        expect(steps.find((x) => x.includes('Current'))?.[0]).toBe(current);
        expect(await approvalOf(page, doc)).toBe(row);
      });
    }
    await qa.step(4, async () => {
      expect(await advance(page, doc)).toContain('Approval advanced');
      const p = await openOrder(page, doc);
      const steps = await p.steps();
      qa.note(4, `after the Director: ${steps.map((x) => x.join(' ')).join(' / ')}; row "${await approvalOf(page, doc)}"`);
      const v = await openOrder(page, doc);
      const disabled = !(await v.advance().count()) || (await v.advance().isDisabled());
      if (!steps.every((x) => x.includes('Done')) || !disabled) {
        qa.deviation(4, 'All four steps "Done"; the button "Advance approval" is disabled', `steps ${steps.map((x) => x.join(' ')).join(' / ')}; "Advance approval" ${disabled ? 'disabled' : 'still enabled'} (a fifth click answers "workflow: instance is already completed or rejected")`);
      }
    });
  } finally {
    await u5.context().close();
    await u4.context().close();
  }
};

export const TC_APP009_009: QaBody = async ({ page, qa, browser }) => {
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
};

export const TC_APP009_017: QaBody = async ({ page, qa, browser }) => {
  // The Pharmacist and the Cashier with one role each are the role accounts qa.apoteker and qa.kasir of
  // 00-prerequisites.xlsx (made 2026-10-20 with the site's roles apoteker and kasir; no new role is needed).
  const s2 = await orderAtStep(page, qa, 2);
  const s3 = await orderAtStep(page, qa, 3);
  qa.note(1, `PO-S2 ${s2} waits at step 2, PO-S3 ${s3} at step 3 of the four-step chain; the chain names its steps only, no role (Process definitions)`);
  for (const [step, login, doc, persona] of [[1, 'qa.apoteker', s2, 'Pharmacist'], [2, 'qa.kasir', s3, 'Cashier']] as const) {
    await qa.step(step, async () => {
      const other = await roleAccountPage(browser, login);
      try {
        const before = await approvalOf(page, doc);
        const toasts = await advance(other, doc).catch((e: Error) => [`(${e.message.split('\n')[0].slice(0, 120)})`]);
        const after = await approvalOf(page, doc);
        qa.note(step, `${persona} ${login} advances ${doc}: "${toasts.join(' / ') || 'no toast'}"; approval "${before}" → "${after}"`);
        if (!toasts.includes('Approval advanced')) qa.deviation(step, `Toast "Approval advanced"; the chain names the ${persona} role for step ${step + 1}`, `${login} (role ${login === 'qa.apoteker' ? 'apoteker' : 'kasir'} only): "${toasts.join(' / ') || 'no toast'}"; the chain has no role per step`);
      } finally {
        await other.context().close();
      }
    });
  }
};

export const TC_APP009_018: QaBody = async ({ page, qa, browser }) => {
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
      const passed = results.filter((r) => r.includes('Approval advanced')).length;
      if (passed > 1) qa.deviation(2, 'Refused after the first step: one person cannot approve consecutive steps', `U4 approves ${passed} consecutive steps of its own order`);
    });
  } finally {
    await second.context().close();
  }
  await qa.step(3, async () => {
    // Audit names the action and the user only, not the order (an entry cannot be opened): the newest advances are read.
    await page.goto('/id/audit');
    await page.getByRole('textbox', { name: 'Module' }).fill('procurement');
    await page.getByRole('textbox', { name: 'Action' }).fill('purchase_order.advance');
    await page.getByRole('button', { name: 'Search' }).click();
    await page.waitForLoadState('networkidle').catch(() => {});
    const rows = (await page.locator('table tbody tr').allInnerTexts()).slice(0, 5).map((r) => r.replace(/\s+/g, ' ').trim());
    qa.note(3, `the newest purchase_order.advance entries: ${rows.join(' | ')}`);
    qa.deviation(3, 'Each step shows a different user', 'the entries name no order, so the steps of one order cannot be told apart; the four steps of the second order were approved by one user (step 2)');
  });
};

export const TC_APP009_021: QaBody = async ({ qa }) => {
  for (const st of [1, 2, 3]) qa.blocked(st, 31);
  qa.note(1, 'goods are received on /procurement/receipts, whose "grn" answers HTTP 500 (found blocker 31); Inventory has no receipt against an order');
  qa.blocked(4, 31);
};

export const TC_APP009_022: QaBody = async ({ page, qa }) => {
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
};

export const TC_APP009_025: QaBody = async ({ page, qa, browser }) => {
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
};

export const TC_APP009_034: QaBody = ({ qa, browser }) => signedOutJourney(browser, qa, '/procurement/purchase-orders', /\/(id|en)\/procurement\/purchase-orders/);

export const TC_APP009_036: QaBody = async ({ page, qa, browser }) => {
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
};
