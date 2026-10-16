import { chainTest } from '../../../fixtures/chain';
import { installToastRecorder } from '../../../lib/assertions';
import { TC_APP018_004, TC_APP018_006, TC_APP018_037, TC_APP018_039 } from '../../modules/18-settings/cases';

/**
 * E2E-019: Set-up: branch, units and staff access to the first booking. Each step runs its source test case (tests/modules/<NN-module>/cases.ts)
 * with its own records: 1. Department added; 2. Service centre added under the department; 3. Role added; 4. Rights granted to the role. The chain stops at the first step a blocker stops; the cause is recorded by the run.
 */
chainTest('E2E-019', async ({ page, chain }) => {
  await installToastRecorder(page);
  await chain.step(1, (qa) => TC_APP018_004({ page, qa }));
  await chain.step(2, (qa) => TC_APP018_006({ page, qa }));
  await chain.step(3, (qa) => TC_APP018_037({ page, qa }));
  await chain.step(4, (qa) => TC_APP018_039({ page, qa }));
});
