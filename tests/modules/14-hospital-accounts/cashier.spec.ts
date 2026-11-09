import { asOnSite } from '../../../lib/i18n';
import type { Page } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder, SERVER_FAILURE } from '../../../lib/assertions';
import { BILLING } from '../../../lib/billing-data';
import { PHARMACY } from '../../../lib/pharmacy-data';
import { CashierPage, rupiah } from '../../../pages/billing/CashierPage';
import { patient, sell, stock } from '../05-pharmacy/helpers';
import { backToIndonesian, switchLanguage } from '../shared/language';
import { counterClosed, ensureSettings, newRxInvoice, paidSale, pay, rxInvoices, sale, select } from './helpers';
import { TC_APP014_003, TC_APP014_005, TC_APP014_006, TC_APP014_008 } from './cases';
import { TC_APP014_001, TC_APP014_002, TC_APP014_004, TC_APP014_010, TC_APP014_017, TC_APP014_019, TC_APP014_021, TC_APP014_022, TC_APP014_023, TC_APP014_024, TC_APP014_025, TC_APP014_027, TC_APP014_030, TC_APP014_031, TC_APP014_033, TC_APP014_034, TC_APP014_035, TC_APP014_040, TC_APP014_041, TC_APP014_043, TC_APP014_046, TC_APP014_052 } from './cashier-cases';

/** The test cases are in cashier-cases.ts (shared with the end-to-end chains). */

/**
 * 14-hospital-accounts.xlsx, Fast Cashier (/billing/cashier): sales, deposits,
 * payments, discounts, refunds, receipts and the insurance panel. Every test
 * makes its own walk-in sales. Closing the day is in zz-close-day.spec.ts, so it
 * runs last: once closed, the cashier cannot take money for the rest of the day.
 * Refusals seen on 2026-10-15 are the toast "Minified React error #441"
 * instead of the red messages of the workbook; they are recorded as deviations.
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
  await ensureSettings(page);
  test.skip(await counterClosed(page), "The U1 cashier's counter is closed for today (TC-APP014-011 ran); no money can be taken until tomorrow");
});

test.afterEach(async ({ page }) => {
  await backToIndonesian(page);
});

qaTest('TC-APP014-001', TC_APP014_001);

qaTest('TC-APP014-002', TC_APP014_002);

qaTest('TC-APP014-003', TC_APP014_003);

qaTest('TC-APP014-004', TC_APP014_004);

qaTest('TC-APP014-005', TC_APP014_005);

qaTest('TC-APP014-006', TC_APP014_006);

qaTest('TC-APP014-008', TC_APP014_008);

qaTest('TC-APP014-010', TC_APP014_010);

qaTest('TC-APP014-017', TC_APP014_017);

qaTest('TC-APP014-019', TC_APP014_019);

qaTest('TC-APP014-021', TC_APP014_021);

qaTest('TC-APP014-022', TC_APP014_022);

qaTest('TC-APP014-023', TC_APP014_023);

qaTest('TC-APP014-024', TC_APP014_024);

qaTest('TC-APP014-025', TC_APP014_025);

qaTest('TC-APP014-027', TC_APP014_027);

qaTest('TC-APP014-030', TC_APP014_030);

qaTest('TC-APP014-031', TC_APP014_031);

qaTest('TC-APP014-033', TC_APP014_033);

qaTest('TC-APP014-034', TC_APP014_034);

qaTest('TC-APP014-035', TC_APP014_035);

qaTest('TC-APP014-040', TC_APP014_040);

qaTest('TC-APP014-041', TC_APP014_041);

qaTest('TC-APP014-043', TC_APP014_043);

qaTest('TC-APP014-046', TC_APP014_046);

qaTest('TC-APP014-052', TC_APP014_052);
