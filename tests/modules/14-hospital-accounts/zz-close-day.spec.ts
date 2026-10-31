import type { Browser, Page } from '@playwright/test';
import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark, toastsSince } from '../../../lib/assertions';
import { CashierPage, rupiah } from '../../../pages/billing/CashierPage';
import { userPage } from '../shared/access';
import { TC_APP014_011 } from './cases';
import { pay, sale } from './helpers';

/**
 * 14-hospital-accounts.xlsx: closing the cashier's day (011, 012, 036, 037,
 * 038). A cashier can close a day once: after TC-APP014-011 the U1 counter
 * cannot take money until the next day (07:00 WIB, TC-APP014-038). This file
 * runs after the other 14 specs (named zz-…) for that reason.
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

qaTest('TC-APP014-011', TC_APP014_011);

/**
 * A second and a third cashier for the closes that U1 cannot make twice: U6 (qa.kemayoran) and U4 (qa.admin3) have a
 * counter of their own (System cash is per cashier). U6 takes a walk-in sale of 300,000 and declares 3,000 less than
 * its System cash; U4 closes with whatever cash it took today. (U5 cannot create a charge: HTTP 500.)
 */
async function otherCashier(browser: Browser, user: 'U4' | 'U6'): Promise<{ p: Page; c: CashierPage }> {
  const p = await userPage(browser, user);
  const c = new CashierPage(p);
  await c.open();
  return { p, c };
}

qaTest('TC-APP014-012', async ({ qa, browser }) => {
  const { p, c } = await otherCashier(browser, 'U6');
  try {
    if (await c.closedBanner().isVisible()) return qa.notRun(1, 'the counter of U6 is already closed for today');
    const before = await c.systemCash();
    await sale(p, '300000');
    await pay(p);
    await c.open();
    const system = await c.systemCash();
    qa.note(1, `U6 (qa.kemayoran, Kemayoran) is the cashier: System cash ${before} before its sale of 300,000, ${system} after`);
    await qa.step(1, async () => {
      const declared = system - 3000;
      if (system !== 333000) qa.note(1, `System cash is ${system}, not 333,000 (the sale is priced by the counter settings of Kemayoran, or U6 took cash before): ${declared} is declared, 3,000 short`);
      await c.field('Declared cash (IDR)').fill(String(declared));
      await c.button('Close my day').click();
      await expect(c.closedBanner()).toBeVisible();
      const variance = (await c.value('Variance').innerText()).trim();
      qa.note(1, `Variance "${variance}"`);
      expect(rupiah(variance)).toBe(-3000);
    });
  } finally {
    await p.context().close();
  }
});

qaTest('TC-APP014-036', async ({ page, qa }) => {
  const c = new CashierPage(page);
  await qa.step(1, async () => {
    await c.open();
    await expect(c.closedBanner()).toBeVisible();
    for (const b of ['Create charge', 'Close my day']) await expect(c.button(b)).toBeDisabled();
  });
  for (const s of [2, 3, 4]) qa.notRun(s, 'needs a second tab opened before the close of TC-APP014-011; the tests do not keep a tab across tests');
});

qaTest('TC-APP014-037', async ({ qa, browser }) => {
  const { p, c } = await otherCashier(browser, 'U4');
  try {
    if (await c.closedBanner().isVisible()) return qa.notRun(1, 'the counter of U4 is already closed for today');
    const system = await c.systemCash();
    qa.note(1, `U4 (qa.admin3) is the cashier: System cash ${system}${system ? '' : ' (no cash taken today; the workbook has 333,000)'}`);
    await qa.step(1, async () => {
      await c.field('Declared cash (IDR)').fill('');
      const mark = await toastMark(p);
      let asked = false;
      p.once('dialog', (d) => {
        asked = true;
        void d.dismiss();
      });
      await c.button('Close my day').click();
      await p.waitForTimeout(3000);
      const toasts = await toastsSince(p, mark);
      const err = (await c.error().allInnerTexts().catch(() => [])).join(' / ');
      const closed = await c.closedBanner().isVisible();
      qa.note(1, `"Close my day" with the declared cash empty: ${closed ? 'the day is closed' : 'the day stays open'}; toast "${toasts.join(' / ')}"; red box "${err}"`);
      if (closed && !asked) qa.deviation(1, 'The screen asks for the amount, or asks to confirm', `the day of U4 is closed at once with no declared amount (Variance "${(await c.value('Variance').innerText().catch(() => '')).trim()}")`);
    });
  } finally {
    await p.context().close();
  }
});

qaTest('TC-APP014-038', async ({ qa }) => {
  qa.notRun(1, 'needs the screen opened at 06:30 and 07:30 WIB the next morning (time-dependent, Q16)');
  qa.notRun(2, 'see step 1');
});
