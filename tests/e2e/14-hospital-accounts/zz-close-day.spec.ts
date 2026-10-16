import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { CashierPage, rupiah } from '../../../pages/billing/CashierPage';
import { counterClosed, ensureSettings, paidSale } from './helpers';
import { TC_APP014_011 } from './cases';

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

const ONCE = "a cashier closes a day once; the U1 counter was closed by TC-APP014-011, and Cashier 2 / a second cashier account is not made";

qaTest('TC-APP014-011', TC_APP014_011);

qaTest('TC-APP014-012', async ({ qa }) => {
  qa.notRun(1, ONCE);
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

qaTest('TC-APP014-037', async ({ qa }) => {
  qa.notRun(1, ONCE);
});

qaTest('TC-APP014-038', async ({ qa }) => {
  qa.notRun(1, 'needs the screen opened at 06:30 and 07:30 WIB the next morning (time-dependent, Q16)');
  qa.notRun(2, 'see step 1');
});
