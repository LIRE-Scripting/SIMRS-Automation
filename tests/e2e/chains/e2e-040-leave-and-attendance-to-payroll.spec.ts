import { chainTest } from '../../../fixtures/chain';
import { installToastRecorder } from '../../../lib/assertions';
import { TC_APP010_007, TC_APP010_008, TC_APP010_009 } from '../../modules/10-hr/cases';
import { TC_APP010_042 } from '../../modules/10-hr/desk-cases';
import { ensureLeaveTypes } from '../../modules/10-hr/helpers';

/**
 * E2E-040: Leave and attendance to payroll. Each step runs its source test case (tests/modules/10-hr/)
 * with its own records: 1. Leave type; 2. Year balance opened and applied; 3. Leave submitted; 4. Leave approved.
 * The attendance of step 5 (TC-APP010-049) waits for the branch set-up (blocker 13), so the chain stops there.
 */
chainTest('E2E-040', async ({ page, chain }) => {
  await installToastRecorder(page);
  await ensureLeaveTypes(page);
  await chain.step(1, (qa) => TC_APP010_007({ page, qa }));
  await chain.step(2, (qa) => TC_APP010_042({ page, qa }));
  await chain.step(3, (qa) => TC_APP010_008({ page, qa }));
  await chain.step(4, (qa) => TC_APP010_009({ page, qa }));
  chain.stopAsPlanned(5);
});
