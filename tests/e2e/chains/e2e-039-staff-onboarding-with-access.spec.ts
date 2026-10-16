import { chainTest } from '../../../fixtures/chain';
import { installToastRecorder } from '../../../lib/assertions';
import { TC_APP010_001, TC_APP010_002, TC_APP010_005 } from '../../modules/10-hr/cases';

/**
 * E2E-039: Staff onboarding with access. Each step runs its source test case (tests/modules/<NN-module>/cases.ts)
 * with its own records: 1. Employee created; 2. Employee file completed; 3. Service center, store and allocation date; 4. Reporting authority and linked user account. The chain stops at the first step a blocker stops; the cause is recorded by the run.
 */
chainTest('E2E-039', async ({ page, chain }) => {
  await installToastRecorder(page);
  await chain.step(1, (qa) => TC_APP010_001({ page, qa }));
  await chain.step(2, (qa) => TC_APP010_002({ page, qa }));
  await chain.step(3, (qa) => TC_APP010_005({ page, qa }));
  chain.stopAsPlanned(4);
});
