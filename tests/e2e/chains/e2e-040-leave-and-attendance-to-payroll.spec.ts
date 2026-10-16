import { chainTest } from '../../../fixtures/chain';
import { installToastRecorder } from '../../../lib/assertions';
import { TC_APP010_007 } from '../10-hr/cases';
import { ensureLeaveTypes } from '../10-hr/helpers';

/**
 * E2E-040: Leave and attendance to payroll. Each step runs its source test case (tests/e2e/<module>/cases.ts)
 * with its own records: 1. Leave type; 2. Year balance opened and applied. The chain stops at the first step a blocker stops; the cause is recorded by the run.
 */
chainTest('E2E-040', async ({ page, chain }) => {
  await installToastRecorder(page);
  await ensureLeaveTypes(page);
  await chain.step(1, (qa) => TC_APP010_007({ page, qa }));
  chain.stopAsPlanned(2);
});
