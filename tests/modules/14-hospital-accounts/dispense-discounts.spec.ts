import type { Locator, Page } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { BILLING } from '../../../lib/billing-data';
import { PHARMACY } from '../../../lib/pharmacy-data';
import { CashierPage } from '../../../pages/billing/CashierPage';
import { patient, sell, stock } from '../05-pharmacy/helpers';
import { userPage } from '../shared/access';
import { clickFor } from '../19-finance/helpers';
import { counterClosed, ensureSettings } from './helpers';

/**
 * 14-hospital-accounts.xlsx, Fast Cashier, "Dispense discounts": a line
 * discount above "Maximum line discount (%)" of Counter settings (the 05
 * catalogue: 10) waits there for approval. Each test makes its own
 * dispenses of QA-PARA with a discount of 20.
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
  await ensureSettings(page);
  test.skip(await counterClosed(page), "The U1 cashier's counter is closed for today (TC-APP014-011 ran); no money can be taken until tomorrow");
});

const OVER = String(Number(BILLING.counter['Maximum line discount (%)']) * 2);

/** The "Dispense discounts" panel of Fast Cashier and its waiting rows (each with "Approve" and "Reject"). */
async function holds(page: Page): Promise<{ panel: Locator; rows: Locator }> {
  await new CashierPage(page).open();
  const panel = page.getByRole('heading', { name: 'Dispense discounts' }).locator('xpath=..');
  const rows = panel.locator('xpath=.//*[.//button[normalize-space()="Approve" or normalize-space()="Setujui"] and .//button[normalize-space()="Reject" or normalize-space()="Tolak"]][not(.//*[.//button[normalize-space()="Approve" or normalize-space()="Setujui"] and .//button[normalize-space()="Reject" or normalize-space()="Tolak"]])]');
  return { panel, rows };
}

/** Two dispenses of the test with a discount above the maximum; returns the toasts of each and the rows waiting before them. */
async function twoHeld(page: Page, qa: Qa): Promise<{ before: number; toasts: string[][] }> {
  await stock(page, qa);
  const before = await (await holds(page)).rows.count();
  const toasts: string[][] = [];
  for (const name of [PHARMACY.pt1.name, 'QA-PHA Pasien Dua']) {
    const pt = await patient(page, qa, name);
    toasts.push(await sell(page, pt, [{ item: PHARMACY.para, requested: '2', issued: '2', discount: OVER }]));
  }
  return { before, toasts };
}

qaTest('TC-APP014-070', async ({ page, qa }) => {
  const made = await twoHeld(page, qa);
  qa.note(1, `two dispenses with a discount of ${OVER}% (maximum ${BILLING.counter['Maximum line discount (%)']}%): "${made.toasts.map((t) => t.join(' / ')).join('" and "')}"; ${made.before} row(s) waited before`);
  let h = await holds(page);
  if (made.toasts.every((t) => t.some((x) => /React error #441/.test(x)))) {
    // Both dispenses answer HTTP 500 (found blocker 47): no discount waits.
    for (const st of [1, 2, 3]) qa.blocked(st, 47);
    qa.notRun(4, 'needs the decisions of steps 2 and 3 (found blocker 47)');
    return;
  }
  await qa.step(1, async () => {
    await expect(h.panel.getByText(/^A line discount above the maximum waits on the existing approval steps\./)).toBeVisible();
    const n = await h.rows.count();
    qa.note(1, `${n} waiting row(s): ${(await h.rows.allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim()).join(' ; ')}`);
    expect(n, 'the two discounts of the test wait').toBeGreaterThanOrEqual(made.before + 2);
  });
  await qa.step(2, async () => {
    const n = await h.rows.count();
    const toasts = await clickFor(page, h.rows.nth(n - 2).getByRole('button', { name: 'Approve', exact: true }));
    h = await holds(page);
    qa.note(2, `Approve: "${toasts.join(' / ')}"; ${await h.rows.count()} row(s) left`);
    expect(toasts).toContain('Discount decision saved.');
  });
  await qa.step(3, async () => {
    const n = await h.rows.count();
    const toasts = await clickFor(page, h.rows.nth(n - 1).getByRole('button', { name: 'Reject', exact: true }));
    h = await holds(page);
    qa.note(3, `Reject: "${toasts.join(' / ')}"; ${await h.rows.count()} row(s) left`);
    expect(toasts).toContain('Discount decision saved.');
  });
  qa.notRun(4, 'TBD in the workbook: what the pharmacist sees after each decision and how the bill shows the discount');
});

qaTest('TC-APP014-071', async ({ page, qa, browser }) => {
  const made = await twoHeld(page, qa);
  qa.note(1, `${made.before} row(s) waited before the two discounts of the test; dispenses: "${made.toasts.map((t) => t.join(' / ').slice(0, 60)).join('" and "')}"`);
  if (made.toasts.every((t) => t.some((x) => /React error #441/.test(x)))) {
    qa.notRun(1, 'the pharmacist who asked is U1, who is also the cashier: a pharmacist without the cashier role is not prepared (blocker 38)');
    // Both dispenses answer HTTP 500 (found blocker 47): no discount waits.
    qa.blocked(2, 47);
    qa.blocked(3, 47);
    return;
  }
  qa.notRun(1, 'the pharmacist who asked is U1, who is also the cashier: a pharmacist without the cashier role is not prepared (blocker 38)');
  const second = await userPage(browser, 'U1');
  try {
    await qa.step(2, async () => {
      const mine = await holds(page);
      const other = await holds(second);
      const n = await mine.rows.count();
      const approve = await clickFor(page, mine.rows.nth(n - 1).getByRole('button', { name: 'Approve', exact: true }));
      const reject = await clickFor(second, other.rows.nth(n - 1).getByRole('button', { name: 'Reject', exact: true })).catch((e: Error) => [`(${e.message.slice(0, 80)})`]);
      qa.note(2, `Approve in the first window: "${approve.join(' / ')}"; Reject of the same row in the second: "${reject.join(' / ') || 'no toast'}" (TBD in the workbook)`);
      if (reject.includes('Discount decision saved.')) qa.deviation(2, 'The second click is refused; the dispense stays issued', 'the reject of the already approved row is saved too');
    });
    await qa.step(3, async () => {
      const h = await holds(page);
      const texts = (await h.rows.allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
      const bare = texts.filter((t) => /^(Approve|Setujui)\s*(Reject|Tolak)$/.test(t));
      qa.note(3, `${texts.length} waiting row(s); ${bare.length} show only the two buttons (TBD in the workbook)`);
      if (bare.length) qa.deviation(3, 'A waiting row names what is approved', `${bare.length} row(s) show "Approve Reject" and no item`);
    });
  } finally {
    await second.context().close();
  }
});
