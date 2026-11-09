import type { Locator, Page } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { addDays, todayWib } from '../../../lib/dates';
import { auditEntries, userPage } from '../shared/access';
import { firstCode } from '../../../lib/qa-data/names';
import { clickFor, createAccount } from './helpers';
import { TC_APP019_044, TC_APP019_045, TC_APP019_046, TC_APP019_047, TC_APP019_048, TC_APP019_049 } from './journals-cases';

/** The test cases are in journals-cases.ts (shared with the end-to-end chains). */

/**
 * 19-finance.xlsx, Journals (/finance/journals): manual journals saved as a
 * balanced draft, sent, approved, rejected, cancelled, reversed and
 * pre-closed (Data: "debit expense 1000000; credit cash 1000000"). The
 * account lists of the dialog offer only the first 50 accounts (found
 * blocker 40) in code order: the expense account is a QA-5010 expense
 * account made once per worker with a code that sorts first (firstCode;
 * the QA-5010 accounts of earlier runs are past the first 50 since
 * 2026-10-31), the cash account 1101 · Kas of the seed chart. U1 holds the write and the approval right,
 * so it approves too.
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

qaTest('TC-APP019-044', TC_APP019_044);

qaTest('TC-APP019-045', TC_APP019_045);

qaTest('TC-APP019-046', TC_APP019_046);

qaTest('TC-APP019-047', TC_APP019_047);

qaTest('TC-APP019-048', TC_APP019_048);

qaTest('TC-APP019-049', TC_APP019_049);
