import { chainTest, expect } from '../../../fixtures/chain';
import { installToastRecorder } from '../../../lib/assertions';
import { CashierPage } from '../../../pages/billing/CashierPage';
import { TC_APP014_005, TC_APP014_006, TC_APP014_008, TC_APP014_011 } from '../14-hospital-accounts/cases';
import { counterClosed, ensureSettings, pay } from '../14-hospital-accounts/helpers';

/**
 * E2E-033: a cashier day of U1: a walk-in charge paid in cash, a card payment,
 * a discount and a refund, then the day is closed. Steps 2-5 run their module
 * cases (with their own sales). Closing the day (step 5) closes the U1
 * counter until 07:00 WIB the next day: this chain runs after the other
 * chains that take money. The chain stops at the first step a blocker stops;
 * the cause is recorded by the run.
 */
chainTest('E2E-033', async ({ page, chain }) => {
  await installToastRecorder(page);
  // As the cashier spec does before each test: the counter settings of the workbook, and an open cashier day.
  await ensureSettings(page);
  expect(await counterClosed(page), "the U1 cashier's day is open").toBe(false);

  await chain.step(1, async (qa) => {
    const c = new CashierPage(page);
    let invoice = '';
    let cashBefore = 0;
    await qa.step(1, async () => {
      await page.goto('/en/apps');
      await page.getByRole('link', { name: /^Hospital Accounts\b/ }).first().click();
      await page.getByRole('main').getByRole('link', { name: 'Fast Cashier' }).first().click();
      await expect(c.heading).toBeVisible();
      for (const l of ['Available', 'Amount due'] as const) expect(await c.barValue(l)).toBe('Rp 0');
      await expect.poll(() => c.systemCash(), { timeout: 5_000 }).toBeGreaterThan(0).catch(() => {});
      cashBefore = await c.systemCash();
    });
    await qa.step(2, async () => {
      await c.charge.fill('150000');
      await c.remark.fill('QA walk-in');
      await c.button('Create charge').click();
      await expect(c.bar).toContainText(/Draft\s*INV-/);
      invoice = (await c.barState()).invoice;
      expect(await c.barValue('Amount due')).toBe('Rp 166.500');
    });
    await qa.step(3, async () => {
      expect(await c.lines()).toEqual({ Gross: 'Rp 150.000', Discount: 'Rp 0', Tax: 'Rp 16.500', 'Patient net': 'Rp 166.500' });
      await expect(c.field('Cash amount (IDR)')).toHaveValue('166500');
    });
    await qa.step(4, async () => {
      await pay(page);
      expect((await c.barState()).status).toBe('Paid');
    });
    await qa.step(5, async () => {
      expect(await c.receiptValue('Invoice')).toBe(invoice);
      expect(await c.receiptValue('Status')).toBe('PAID');
    });
    await qa.step(6, async () => expect.poll(() => c.systemCash()).toBe(cashBefore + 166500));
    await qa.step(7, async () => {
      await c.button('New sale').click();
      await expect(c.bar).toContainText('No invoice selected');
    });
  });
  await chain.step(2, (qa) => TC_APP014_005({ page, qa }));
  await chain.step(3, (qa) => TC_APP014_006({ page, qa }));
  await chain.step(4, (qa) => TC_APP014_008({ page, qa }));
  await chain.step(5, (qa) => TC_APP014_011({ page, qa }));
});
