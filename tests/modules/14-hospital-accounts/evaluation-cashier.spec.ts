import type { Browser, Page } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { BILLING } from '../../../lib/billing-data';
import { PHARMACY, stockOf, total } from '../../../lib/pharmacy-data';
import { CashierPage } from '../../../pages/billing/CashierPage';
import { signedOutJourney, userPage } from '../shared/access';
import { counterClosed, ensureSettings, paidSale, pay, sale, select } from './helpers';
import { TC_APP014_016 } from './cases';

/**
 * 14-hospital-accounts.xlsx, the Fast Cashier journeys marked "Needs
 * Evaluation" (automated since 2026-10-29, open question Q10). They need the
 * U1 counter open and run with the cashier test cases. Counter settings
 * changed by a test are set back to the 05/14 catalogue values in `finally`.
 * "Cashier 2" is U4 (qa.admin3); the "Head cashier" of the approval chain is
 * looked for among U5 (qa.approver) and U2 (rs.admin).
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
  await ensureSettings(page);
  test.skip(await counterClosed(page), "The U1 cashier's counter is closed for today (TC-APP014-011 ran); no money can be taken until tomorrow");
});

type CounterField = keyof typeof BILLING.counter;

/** Saves Counter settings with the given values. */
async function counter(page: Page, values: Partial<Record<CounterField, string>>): Promise<void> {
  const c = new CashierPage(page);
  await c.open();
  for (const [label, value] of Object.entries(values)) {
    await page.getByRole('textbox', { name: label === 'Rounding' ? /^Rounding/ : label, exact: label !== 'Rounding' }).fill(value!);
  }
  await c.button('Save settings').click();
  await page.waitForLoadState('networkidle').catch(() => {});
  await c.open();
}

/** Sets Counter settings for the body and sets the catalogue values back afterwards. */
async function withCounter(page: Page, values: Partial<Record<CounterField, string>>, body: () => Promise<void>): Promise<void> {
  await counter(page, values);
  try {
    await body();
  } finally {
    const back = Object.fromEntries(Object.keys(values).map((k) => [k, BILLING.counter[k as CounterField]]));
    await counter(page, back);
  }
}

const WAITING = 'Waiting for approval';

/** A walk-in sale of 150,000 with a discount above the cap (60,000); returns its number. */
async function heldDiscount(page: Page): Promise<string> {
  const invoice = await sale(page);
  const c = new CashierPage(page);
  await c.field('Discount (IDR)').fill('60000');
  await c.button('Apply discount').click();
  await page.waitForLoadState('networkidle').catch(() => {});
  return invoice;
}

/** Tries "Approve" on the sale as each candidate head cashier; returns who approved (or null) and the notes. */
async function approveAsHead(browser: Browser, qa: Qa, step: number, invoice: string): Promise<{ who: string | null; page: Page | null }> {
  for (const u of ['U5', 'U2'] as const) {
    const p = await userPage(browser, u);
    try {
      const c = await select(p, invoice).catch(() => null);
      if (!c) {
        qa.note(step, `${u} does not find ${invoice} at the cashier`);
        await p.context().close();
        continue;
      }
      const approve = c.button('Approve');
      if (!(await approve.isVisible().catch(() => false))) {
        qa.note(step, `${u} sees no "Approve" on ${invoice}`);
        await p.context().close();
        continue;
      }
      await approve.click();
      await p.waitForLoadState('networkidle').catch(() => {});
      await expect.poll(async () => (await c.barState()).status, { timeout: 10_000 }).not.toBe(WAITING).catch(() => {});
      const st = (await c.barState()).status;
      const err = (await c.error().allInnerTexts().catch(() => [])).join(' / ');
      qa.note(step, `${u} clicks Approve: status "${st}"${err ? `, message "${err}"` : ''}`);
      if (st !== WAITING) return { who: u, page: p };
      await p.context().close();
    } catch (e) {
      await p.context().close();
      throw e;
    }
  }
  return { who: null, page: null };
}

qaTest('TC-APP014-007', async ({ page, qa, browser }) => {
  const c = new CashierPage(page);
  let invoice = '';
  let held = true;
  await qa.step(1, async () => {
    invoice = await heldDiscount(page);
    const st = (await c.barState()).status;
    const text = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
    qa.note(1, `${invoice}: status "${st}"; lines ${JSON.stringify(await c.lines())}`);
    if (st !== WAITING) {
      held = false;
      return qa.deviation(1, 'Status badge "Waiting for approval"', `the discount of 60,000 above the cap of 50,000 is not held: status "${st}", "Apply discount" is disabled, nothing waits for approval`);
    }
    if (!text.includes('This discount is above the cap and is waiting for approval on this sale.')) qa.deviation(1, 'Message: "This discount is above the cap and is waiting for approval on this sale."', 'no such message');
    expect(await c.lines()).toMatchObject({ Discount: 'Rp 0', 'Patient net': 'Rp 166.500' });
  });
  if (!held) {
    for (const st of [2, 3, 4]) qa.notRun(st, 'nothing is held for approval (step 1)');
    return;
  }
  await qa.step(2, async () => {
    for (const b of ['Take deposit', 'Pay', 'Apply discount', 'Refund payment']) await expect(c.button(b)).toBeDisabled();
    await expect(c.button('Approve')).toBeVisible();
    await expect(c.button('Reopen sale')).toBeVisible();
  });
  let approved = false;
  await qa.step(3, async () => {
    const head = await approveAsHead(browser, qa, 3, invoice);
    if (!head.who) return qa.notRun(3, 'no prepared account approves the sale as the head cashier of the chain (U5 and U2 tried)');
    try {
      const hc = new CashierPage(head.page!);
      expect((await hc.barState()).status).toBe('Draft');
      expect(await hc.lines()).toMatchObject({ Discount: 'Rp 60.000', Tax: 'Rp 9.900', 'Patient net': 'Rp 99.900' });
      approved = true;
    } finally {
      await head.page!.context().close();
    }
  });
  await qa.step(4, async () => {
    if (!approved) return qa.notRun(4, 'the discount was not approved (step 3)');
    await select(page, invoice);
    await pay(page);
    expect((await c.barState()).status).toBe('Paid');
    expect(await c.receiptValue('Paid')).toBe('Rp 99.900');
  });
});

qaTest('TC-APP014-009', async ({ page, qa, browser }) => {
  const c = new CashierPage(page);
  const invoice = await paidSale(page);
  await select(page, invoice);
  const cash0 = await c.systemCash();
  const before = { available: await c.barValue('Available'), due: await c.barValue('Amount due') };
  let refused = false;
  let notHeld = false;
  await qa.step(1, async () => {
    await c.field('Refund (IDR)').fill('150000');
    await c.button('Refund payment').click();
    await page.waitForLoadState('networkidle').catch(() => {});
    const st = (await c.barState()).status;
    const text = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
    qa.note(1, `status "${st}"; Available ${await c.barValue('Available')}, Amount due ${await c.barValue('Amount due')}`);
    if (/React error #441/.test(text)) {
      refused = true;
      qa.note(1, '"Refund payment" of 150,000 (limit 100,000): red box "Minified React error #441" (HTTP 500, found blocker 56)');
      return qa.blocked(1, 56);
    }
    if (st !== WAITING) {
      notHeld = true;
      return qa.deviation(1, 'Status "Waiting for approval"', `the refund of 150,000 above the limit of 100,000 is not held: status "${st}", Available ${await c.barValue('Available')}`);
    }
    if (!text.includes('This refund is above the limit and is waiting for approval on this sale.')) qa.deviation(1, 'Message: "This refund is above the limit and is waiting for approval on this sale."', 'no such message');
    expect({ available: await c.barValue('Available'), due: await c.barValue('Amount due') }).toEqual(before);
  });
  if (refused) {
    for (const st of [2, 3, 4]) qa.blocked(st, 56);
    return;
  }
  if (notHeld) {
    for (const st of [2, 3, 4]) qa.notRun(st, 'nothing is held for approval (step 1)');
    return;
  }
  await qa.step(2, async () => {
    await select(page, invoice);
    expect(await c.systemCash()).toBe(cash0);
  });
  let head: { who: string | null; page: Page | null } = { who: null, page: null };
  await qa.step(3, async () => {
    head = await approveAsHead(browser, qa, 3, invoice);
    if (!head.who) return qa.notRun(3, 'no prepared account approves the refund as the head cashier of the chain (U5 and U2 tried)');
    const hc = new CashierPage(head.page!);
    expect([await hc.barValue('Available'), await hc.barValue('Amount due'), (await hc.barState()).status]).toEqual(['Rp 16.500', 'Rp 150.000', 'Draft']);
  });
  await qa.step(4, async () => {
    if (!head.page) return qa.notRun(4, 'the refund was not approved (step 3)');
    try {
      const hc = new CashierPage(head.page);
      qa.note(4, `${head.who}'s System cash: ${await hc.systemCash()}`);
    } finally {
      await head.page.context().close();
    }
  });
});

qaTest('TC-APP014-014', async ({ page, qa }) => {
  const c = new CashierPage(page);
  const cases: [number, string, Record<string, string>][] = [
    [1, '1', { Tax: 'Rp 1.358', 'Patient net': 'Rp 13.703' }],
    [2, '100', { 'Patient net': 'Rp 13.700' }],
    [3, '0.5', { 'Patient net': 'Rp 13.703' }],
    [4, '0', { 'Patient net': 'Rp 13.703' }],
  ];
  try {
    for (const [st, rounding, want] of cases) {
      await qa.step(st, async () => {
        await counter(page, { Rounding: rounding });
        await sale(page, '12345');
        const lines = await c.lines();
        qa.note(st, `Rounding ${rounding}: ${JSON.stringify(lines)}`);
        expect(lines).toMatchObject(want);
      });
    }
  } finally {
    await counter(page, { Rounding: BILLING.counter.Rounding });
  }
});

qaTest('TC-APP014-015', async ({ page, qa }) => {
  const c = new CashierPage(page);
  await withCounter(page, { 'Identity threshold (IDR)': '1000000', 'Cash limit (IDR)': '5000000' }, async () => {
    await qa.step(1, async () => {
      await sale(page, '2000000');
      expect(await c.barValue('Amount due')).toBe('Rp 2.220.000');
      await expect(page.getByRole('textbox', { name: 'Identity document' }).last()).toBeVisible();
    });
    await qa.step(2, async () => {
      await page.getByRole('textbox', { name: 'Identity document' }).last().fill('KTP QA-0001');
      await pay(page);
      expect((await c.barState()).status).toBe('Paid');
    });
  });
});

qaTest('TC-APP014-016', TC_APP014_016);

qaTest('TC-APP014-026', async ({ page, qa, browser }) => {
  // "The cashier has taken no cash today": U1's counter has taken the cash of the other cashier tests, so the
  // cashier of this journey is U4 (qa.admin3), whose own counter has taken none (System cash is per cashier).
  const cp = await userPage(browser, 'U4');
  const c = new CashierPage(cp);
  try {
  await withCounter(page, { 'Identity threshold (IDR)': '1000000', 'Cash limit (IDR)': '3000000' }, async () => {
    const [a, b] = [await sale(cp, '2000000'), await sale(cp, '1000000')];
    await select(cp, a);
    const cash0 = await c.systemCash();
    qa.note(1, `sale A ${a} (Rp 2.220.000), sale B ${b} (Rp 1.110.000); System cash before: ${cash0} (U4, the cashier of this journey)`);
    await qa.step(1, async () => {
      await select(cp, a);
      await c.button('Pay').click();
      await expect(c.error()).toBeVisible();
      const text = (await c.error().allInnerTexts()).join(' / ');
      if (!text.includes('cash above the threshold needs an identity document')) qa.deviation(1, 'Red message: "cash above the threshold needs an identity document"', `"${text}"`);
    });
    let paidA = true;
    await qa.step(2, async () => {
      await cp.getByRole('textbox', { name: 'Identity document' }).last().fill('KTP QA-0002');
      await pay(cp);
      const st = (await c.barState()).status;
      if (st !== 'Paid' && cash0 + 2_220_000 > 3_000_000) {
        // The counter is shared by every cashier test: today's cash is already above the journey's cash limit.
        paidA = false;
        const err = (await c.error().allInnerTexts().catch(() => [])).join(' / ');
        qa.notRun(2, `the precondition "the cashier has taken no cash today" does not hold: System cash is Rp ${cash0.toLocaleString('id-ID')} before sale A, so 2,220,000 more is above the cash limit of 3,000,000 (status "${st}"${err ? `, "${err.slice(0, 60)}"` : ''})`);
        return;
      }
      expect(st).toBe('Paid');
      qa.note(2, `System cash ${await c.systemCash()}`);
    });
    if (!paidA) {
      for (const st of [3, 4]) qa.notRun(st, 'the cash limit is already reached by the cash of earlier sales today (step 2)');
      return;
    }
    await qa.step(3, async () => {
      await select(cp, b);
      await c.button('Pay').click();
      await cp.waitForLoadState('networkidle').catch(() => {});
      const st = (await c.barState()).status;
      const text = (await c.error().allInnerTexts().catch(() => [])).join(' / ');
      qa.note(3, `sale B: status "${st}"; "${text}"`);
      if (st === 'Paid') qa.deviation(3, 'Red message: "amount collected is above the cash limit"', 'sale B is paid in cash above the limit');
      else if (!text.includes('amount collected is above the cash limit')) qa.deviation(3, 'Red message: "amount collected is above the cash limit"', `"${text}"`);
    });
    await qa.step(4, async () => {
      if ((await c.barState()).status === 'Paid') return qa.note(4, 'sale B was paid in step 3');
      await c.tender().selectOption({ label: 'Card' });
      await c.field('EDC terminal').fill('QA-EDC-01');
      await c.field('EDC approval').fill('123456');
      await pay(cp);
      const st = (await c.barState()).status;
      const err = (await c.error().allInnerTexts().catch(() => [])).join(' / ');
      qa.note(4, `sale B by card: status "${st}"${err ? `; "${err.slice(0, 80)}"` : ''}`);
      if (st !== 'Paid') qa.deviation(4, 'Sale B is Paid', `status "${st}"${err ? `, red box "${err.slice(0, 80)}"` : ''}`);
    });
  });
  } finally {
    await cp.context().close();
  }
});

qaTest('TC-APP014-028', async ({ page, qa, browser }) => {
  const c = new CashierPage(page);
  const invoice = await heldDiscount(page);
  const st0 = (await c.barState()).status;
  if (st0 !== WAITING) {
    qa.note(1, `the discount of 60,000 above the cap is not held: status "${st0}" (TC-APP014-007)`);
    for (const st of [1, 2, 3]) qa.notRun(st, 'needs a sale waiting for approval of a 60,000 discount: a discount above the cap is not held (TC-APP014-007 step 1)');
    return;
  }
  const tryApprove = async (p: Page, step: number, who: string) => {
    const cc = await select(p, invoice);
    await cc.button('Approve').click();
    await p.waitForLoadState('networkidle').catch(() => {});
    const st = (await cc.barState()).status;
    const text = (await cc.error().allInnerTexts().catch(() => [])).join(' / ');
    qa.note(step, `${who} clicks Approve: status "${st}"; "${text}"`);
    if (st !== WAITING) qa.deviation(step, 'Red message: "you cannot approve this sale"', `${who} approves the discount`);
    else if (!text.includes('you cannot approve this sale')) qa.deviation(step, 'Red message: "you cannot approve this sale"', `"${text || 'no message'}"`);
  };
  await qa.step(1, () => tryApprove(page, 1, 'the cashier who asked'));
  await qa.step(2, async () => {
    if ((await (await select(page, invoice)).barState()).status !== WAITING) return qa.note(2, 'the sale is no longer waiting');
    const p4 = await userPage(browser, 'U4');
    try {
      await tryApprove(p4, 2, 'Cashier 2 (U4)');
    } finally {
      await p4.context().close();
    }
  });
  await qa.step(3, async () => {
    if ((await (await select(page, invoice)).barState()).status !== WAITING) return qa.note(3, 'the sale is no longer waiting');
    const head = await approveAsHead(browser, qa, 3, invoice);
    if (!head.who) return qa.notRun(3, 'no prepared account approves the sale as the head cashier of the chain (U5 and U2 tried)');
    try {
      expect((await new CashierPage(head.page!).barState()).status).toBe('Draft');
    } finally {
      await head.page!.context().close();
    }
  });
});

qaTest('TC-APP014-032', async ({ page, qa }) => {
  const c = new CashierPage(page);
  await withCounter(page, { 'Refund limit (IDR)': '200000' }, async () => {
    const invoice = await paidSale(page);
    await select(page, invoice);
    await qa.step(1, async () => {
      await c.field('Refund (IDR)').fill('166500');
      await c.button('Refund payment').click();
      await expect.poll(() => c.barValue('Available')).toBe('Rp 0');
    });
    await qa.step(2, async () => {
      const st = (await c.barState()).status;
      const due = await c.barValue('Amount due');
      qa.note(2, `status "${st}", Amount due ${due}`);
      if (!/refund/i.test(st) || due !== 'Rp 0') qa.deviation(2, 'A status that shows the sale was refunded, with nothing due', `status "${st}", Amount due ${due}`);
    });
  });
});

