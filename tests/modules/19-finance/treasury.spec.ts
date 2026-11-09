import fs from 'node:fs';
import type { Page } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { addDays, todayWib } from '../../../lib/dates';
import { agreement, TC_APP019_066, TC_APP019_068 } from './cases';
import { rowCount, screenRefuses, userPage } from '../shared/access';
import { FinanceDesk } from './finance-desk';
import { clickFor, createAccount } from './helpers';
import { firstCode } from '../../../lib/qa-data/names';
import { TC_APP019_064, TC_APP019_065, TC_APP019_067, TC_APP019_069, TC_APP019_070, TC_APP019_071, TC_APP019_072, TC_APP019_073, TC_APP019_074, TC_APP019_075, TC_APP019_076, TC_APP019_077, TC_APP019_078, TC_APP019_079, TC_APP019_084 } from './treasury-cases';

/** The test cases are in treasury-cases.ts (shared with the end-to-end chains). */

/**
 * 19-finance.xlsx, treasury and audit: imprest (/finance/imprest), bank
 * reconciliation, payment requests, security deposits, bank guarantees,
 * letters of credit, agreements and loans, audit sheets, and the finance
 * rights. The bodies used by the chains are in cases.ts; the desk screens
 * share FinanceDesk (finance-desk.ts). The second finance user is the role
 * account qa.finance (FINANCE_WRITE only); its steps stop where a journal of
 * today cannot be saved (blocker 45) or an approval is needed (blocker 46).
 * Steps that need a setting of the branch for every user are not run.
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

qaTest('TC-APP019-066', async ({ page, qa }) => {
  await TC_APP019_066({ page, qa });
});

qaTest('TC-APP019-064', TC_APP019_064);

qaTest('TC-APP019-065', TC_APP019_065);

qaTest('TC-APP019-067', TC_APP019_067);

// Declared through a wrapper: qaTest passes testInfo as the second argument.
qaTest('TC-APP019-068', ({ page, qa }) => TC_APP019_068({ page, qa }));

qaTest('TC-APP019-069', TC_APP019_069);

qaTest('TC-APP019-070', TC_APP019_070);

qaTest('TC-APP019-071', TC_APP019_071);

qaTest('TC-APP019-072', TC_APP019_072);

qaTest('TC-APP019-073', TC_APP019_073);

qaTest('TC-APP019-074', TC_APP019_074);

qaTest('TC-APP019-075', TC_APP019_075);

qaTest('TC-APP019-076', TC_APP019_076);

qaTest('TC-APP019-077', TC_APP019_077);

qaTest('TC-APP019-078', TC_APP019_078);

qaTest('TC-APP019-079', TC_APP019_079);

qaTest('TC-APP019-084', TC_APP019_084);
