import type { Page } from '@playwright/test';
import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark } from '../../../lib/assertions';
import { PROCUREMENT } from '../../../lib/procurement-data';
import { PurchaseOrdersPage } from '../../../pages/procurement/ProcurementPages';
import { Vouchers } from '../19-finance/helpers';
import { roleAccountPage, signedOutJourney, userPage } from '../shared/access';
import { approvalOf, createOrder, docNo, openOrder, orderAtStep, poToastsAfter as toastsAfter } from './cases';
import { TC_APP009_005, TC_APP009_009, TC_APP009_017, TC_APP009_018, TC_APP009_021, TC_APP009_022, TC_APP009_025, TC_APP009_034, TC_APP009_036 } from './evaluation-cases';

/** The test cases are in evaluation-cases.ts (shared with the end-to-end chains). */

/**
 * 09-procurement.xlsx, the journeys marked "Needs Evaluation" (automated
 * since 2026-10-29, open question Q10). The purchase order chain has its
 * four steps since 2026-11-01 (set in Workflow; found blocker 30 before),
 * with no role per step. Goods receipts answer HTTP 500 (found blocker 31).
 * "Director" and "the second user" are U4 (qa.admin3).
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

qaTest('TC-APP009-005', TC_APP009_005);

qaTest('TC-APP009-009', TC_APP009_009);

qaTest('TC-APP009-017', TC_APP009_017);

qaTest('TC-APP009-018', TC_APP009_018);

qaTest('TC-APP009-021', TC_APP009_021);

qaTest('TC-APP009-022', TC_APP009_022);

qaTest('TC-APP009-025', TC_APP009_025);

qaTest('TC-APP009-034', TC_APP009_034);

qaTest('TC-APP009-036', TC_APP009_036);
