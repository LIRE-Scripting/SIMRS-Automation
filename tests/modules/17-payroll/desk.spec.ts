import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { Desk, SAVED, payrollEmployee } from './helpers';
import { TC_APP017_043, TC_APP017_044, TC_APP017_045, TC_APP017_046, TC_APP017_047 } from './desk-cases';

/** The test cases are in desk-cases.ts (shared with the end-to-end chains). */

/**
 * 17-payroll.xlsx: the desk screens Calculate (/payroll/desk/run, Doctor
 * fee) and Payslip (/payroll/desk/slip). The doctor is a test employee with a
 * payroll record (account "QA-6101"); payslips are made with "Correct" for
 * the period "2026-10". Refusals show the toast "Minified React error #441".
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

qaTest('TC-APP017-043', TC_APP017_043);

qaTest('TC-APP017-044', TC_APP017_044);

qaTest('TC-APP017-045', TC_APP017_045);

qaTest('TC-APP017-046', TC_APP017_046);

qaTest('TC-APP017-047', TC_APP017_047);
