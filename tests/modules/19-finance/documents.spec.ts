import type { Locator, Page } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark } from '../../../lib/assertions';
import { addDays, todayWib } from '../../../lib/dates';
import { clickFor, createAccount, toastsAfter } from './helpers';
import { firstCode } from '../../../lib/qa-data/names';
import { TC_APP019_050, TC_APP019_051, TC_APP019_052, TC_APP019_053, TC_APP019_054, TC_APP019_055 } from './documents-cases';

/** The test cases are in documents-cases.ts (shared with the end-to-end chains). */

/**
 * 19-finance.xlsx, the vouchers of Finance (/finance/documents/<kind>: bank
 * and cash receipt, contra, debit and credit memo, purchase, sales, opening
 * balance), the trial balance and the payment wizard (/finance/payments).
 * The account lists offer only the first 50 accounts (found blocker 40): the
 * lines use the first offered QA accounts (accountsOf).
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

qaTest('TC-APP019-050', TC_APP019_050);

qaTest('TC-APP019-051', TC_APP019_051);

qaTest('TC-APP019-052', TC_APP019_052);

qaTest('TC-APP019-053', TC_APP019_053);

qaTest('TC-APP019-054', TC_APP019_054);

qaTest('TC-APP019-055', TC_APP019_055);
