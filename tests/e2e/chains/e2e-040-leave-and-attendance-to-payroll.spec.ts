import { chainTest } from '../../../fixtures/chain';
import { installToastRecorder } from '../../../lib/assertions';
import { TC_APP010_007, TC_APP010_008, TC_APP010_009 } from '../../modules/10-hr/cases';
import { TC_APP010_042 } from '../../modules/10-hr/desk-cases';
import { ensureLeaveTypes } from '../../modules/10-hr/helpers';
import { TC_APP010_049 } from '../../modules/10-hr/punch-cases';
import { TC_APP017_001 } from '../../modules/17-payroll/cases';
import { TC_APP017_039 } from '../../modules/17-payroll/rerun-cases';
import { TC_APP017_046 } from '../../modules/17-payroll/desk-cases';

/**
 * E2E-040: Leave and attendance to payroll. Each step runs its source test case (tests/modules/10-hr/)
 * with its own records: 1. Leave type; 2. Year balance opened and applied; 3. Leave submitted; 4. Leave approved.
 * The attendance of step 5 (TC-APP010-049) waits for the branch set-up (blocker 13), so the chain stops there;
 * the later steps run their module test cases once that is lifted (or in a probe with QA_CHAIN_CONTINUE=1).
 */
chainTest('E2E-040', async ({ page, chain }) => {
  await installToastRecorder(page);
  await ensureLeaveTypes(page);
  await chain.step(1, (qa) => TC_APP010_007({ page, qa }));
  await chain.step(2, (qa) => TC_APP010_042({ page, qa }));
  await chain.step(3, (qa) => TC_APP010_008({ page, qa }));
  await chain.step(4, (qa) => TC_APP010_009({ page, qa }));
  await chain.run(5, TC_APP010_049);
  await chain.step(6, (qa) => TC_APP017_001({ page, qa }));
  await chain.run(7, TC_APP017_039);
  await chain.run(8, TC_APP017_046);
});
