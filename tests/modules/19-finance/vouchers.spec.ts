import type { Locator, Page } from '@playwright/test';
import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { todayWib } from '../../../lib/dates';
import { backToIndonesian, switchLanguage } from '../shared/language';
import { screenOpens } from '../shared/screen-opens';
import { invalidFields } from '../18-settings/helpers';
import { Accounts, PostingRules, account, clickFor, createAccount, plain, retireAccount, Vouchers } from './helpers';
import { NotOffered } from '../../../lib/not-offered';
import { asOnSite, sourceOnSite } from '../../../lib/i18n';
import { SCREENS, TC_APP019_008, TC_APP019_009, TC_APP019_011, TC_APP019_014, TC_APP019_015, TC_APP019_018, TC_APP019_024, TC_APP019_033, TC_APP019_083 } from './vouchers-cases';

/** The test cases are in vouchers-cases.ts (shared with the end-to-end chains). */

/**
 * 19-finance.xlsx: Vouchers, ERP staging, the hub and the screen checks.
 * Vouchers has no <main>; "Create voucher" and the voucher detail are panels,
 * not dialogs.
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

test.afterEach(async ({ page }) => {
  await backToIndonesian(page);
});

qaTest('TC-APP019-008', TC_APP019_008);

qaTest('TC-APP019-009', TC_APP019_009);

qaTest('TC-APP019-011', TC_APP019_011);

qaTest('TC-APP019-014', TC_APP019_014);

qaTest('TC-APP019-015', TC_APP019_015);

qaTest('TC-APP019-018', TC_APP019_018);

qaTest('TC-APP019-024', TC_APP019_024);

qaTest('TC-APP019-033', TC_APP019_033);

qaTest('TC-APP019-083', TC_APP019_083);

for (const [id, route, heading] of SCREENS) {
  qaTest(id, async ({ page, qa }) => {
    await qa.step(1, () => screenOpens(page, route, heading, qa));
  });
}
