import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { asUser } from '../shared/access';
import { Desk, payrollEmployee, plain, SAVED } from './helpers';
import { TC_APP017_039, TC_APP017_040, TC_APP017_041, TC_APP017_042 } from './rerun-cases';

/** The test cases are in rerun-cases.ts (shared with the end-to-end chains). */

/**
 * 17-payroll.xlsx, Calculate (/payroll/desk/run): "Correct", "Re-run" and
 * "Lock month". A locked month cannot be unlocked on any screen (TC-APP017-041),
 * so the workbook period "2026-10" is never locked: each test works on a
 * period of its own, "2099-10-<token>" (the period is free text, step 4 of
 * TC-APP017-041). Employees are made per test in HR.
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

qaTest('TC-APP017-039', TC_APP017_039);

qaTest('TC-APP017-040', TC_APP017_040);

qaTest('TC-APP017-041', TC_APP017_041);

qaTest('TC-APP017-042', TC_APP017_042);
