import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { counterClosed, ensureSettings, paidSale } from '../14-hospital-accounts/helpers';
import { plain, Vouchers } from './helpers';

/**
 * 19-finance.xlsx, the "Needs Evaluation" journey that needs an invoice paid
 * today (TC-APP019-027, ERP staging). It runs with the cashier test cases,
 * while the U1 counter is open.
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
  await ensureSettings(page);
  test.skip(await counterClosed(page), "The U1 cashier's counter is closed for today (TC-APP014-011 ran); no money can be taken until tomorrow");
});

qaTest('TC-APP019-027', async ({ page, qa }) => {
  const invoice = await paidSale(page);
  qa.note(1, `an invoice paid at the cashier by this test: ${invoice} (a walk-in sale)`);
  const main = page.getByRole('main');
  await qa.step(1, async () => {
    await page.goto('/id/finance/erp-invoice-staging');
    await page.waitForLoadState('networkidle').catch(() => {});
    const search = main.getByRole('searchbox').or(main.getByRole('textbox', { name: /search|cari/i })).first();
    if (await search.count()) {
      await search.fill(invoice);
      await page.waitForLoadState('networkidle').catch(() => {});
    }
    const row = main.getByRole('row').filter({ hasText: invoice });
    const n = await row.count();
    qa.note(1, n ? `"${plain(await row.first().innerText())}"` : `${invoice} is not on the list`);
    if (!n) qa.deviation(1, 'The invoice is listed as "Pending"', `${invoice} is not listed`);
    else if (!/pending|no/i.test(await row.first().innerText())) qa.deviation(1, 'Listed as "Pending"', `"${plain(await row.first().innerText())}"`);
  });
  await qa.step(2, async () => {
    const buttons = (await main.getByRole('button').allInnerTexts()).map(plain);
    if (!buttons.some((b) => /post|kirim|posting/i.test(b))) qa.deviation(2, 'A button to post one invoice or all pending ones', `the screen offers ${buttons.slice(0, 10).join(', ')}`);
  });
  await qa.step(3, async () => {
    const v = new Vouchers(page);
    await v.open();
    const rows = (await v.rows().allInnerTexts()).map(plain);
    const hit = rows.find((r) => r.includes(invoice));
    qa.note(3, hit ? `"${hit}"` : `no voucher row names ${invoice} on the first page`);
    if (!hit) qa.deviation(3, 'A voucher for the invoice', `no voucher names ${invoice}`);
  });
});
