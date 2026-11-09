import { chainTest } from '../../../fixtures/chain';
import { installToastRecorder } from '../../../lib/assertions';
import { TC_APP018_004, TC_APP018_006, TC_APP018_037, TC_APP018_039, TC_APP018_031, TC_APP018_041 } from '../../modules/18-settings/cases';
import { CASES, releaseClaimed } from '../../modules/shared/appointment-cases';
import { bookSettingsReady, SCHEDULE } from './steps/outpatient-steps';

/**
 * E2E-019: Set-up: branch, units and staff access to the first booking. Each step runs its source test case (tests/modules/<NN-module>/cases.ts)
 * with its own records: 1. Department added; 2. Service centre added under the department; 3. Role added; 4. Rights granted to the role; 5–6. The staff member and the sign-in; 7. The first booking (TC-APP002-002, after the book settings of the shared data are written). The chain stops at the first step a blocker stops; the cause is recorded by the run.
 */
chainTest('E2E-019', async ({ page, browser, chain }) => {
  await installToastRecorder(page);
  await chain.step(1, (qa) => TC_APP018_004({ page, qa }));
  await chain.step(2, (qa) => TC_APP018_006({ page, qa }));
  await chain.step(3, (qa) => TC_APP018_037({ page, qa }));
  await chain.step(4, (qa) => TC_APP018_039({ page, qa }));
  await chain.step(5, (qa) => TC_APP018_031({ page, qa, browser }));
  await chain.step(6, (qa) => TC_APP018_041({ page, qa }));
  try {
    await chain.step(7, async (qa) => {
      await bookSettingsReady(page);
      await CASES.bookConsultant({ page, qa, browser }, SCHEDULE);
    });
  } finally {
    await releaseClaimed(page);
  }
});
