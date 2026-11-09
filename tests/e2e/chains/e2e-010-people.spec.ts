import { chainTest } from '../../../fixtures/chain';
import { installToastRecorder } from '../../../lib/assertions';
import { TC_APP010_001, TC_APP010_008, TC_APP010_009 } from '../../modules/10-hr/cases';
import { TC_APP017_001 } from '../../modules/17-payroll/cases';
import { ensureLeaveTypes } from '../../modules/10-hr/helpers';
import { TC_APP017_039 } from '../../modules/17-payroll/rerun-cases';
import { TC_APP017_043, TC_APP017_046 } from '../../modules/17-payroll/desk-cases';
import { TC_APP019_083 } from '../../modules/19-finance/vouchers-cases';

/**
 * E2E-010: People: employee to payslip and Finance. Each step runs its source test case (tests/modules/<NN-module>/cases.ts)
 * with its own records: 1. Employee created; 2. Leave submitted; 3. Leave approved; 4. Payroll batch run for the employee; 5. Batch figures match the salary components. The chain stops at the first step a blocker stops; the cause is recorded by the run.
 */
chainTest('E2E-010', async ({ page, chain }) => {
  await installToastRecorder(page);
  // As the 10 leave spec does before each test: the leave types of the workbook exist.
  await ensureLeaveTypes(page);
  await chain.step(1, (qa) => TC_APP010_001({ page, qa }));
  await chain.step(2, (qa) => TC_APP010_008({ page, qa }));
  await chain.step(3, (qa) => TC_APP010_009({ page, qa }));
  await chain.step(4, (qa) => TC_APP017_001({ page, qa }));
  chain.stopAsPlanned(5);
  await chain.run(6, TC_APP017_039);
  await chain.run(7, TC_APP017_046);
  await chain.run(8, TC_APP017_043);
  await chain.run(9, TC_APP019_083);
});
