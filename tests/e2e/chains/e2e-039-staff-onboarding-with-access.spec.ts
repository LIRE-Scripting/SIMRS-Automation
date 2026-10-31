import { chainTest } from '../../../fixtures/chain';
import { installToastRecorder } from '../../../lib/assertions';
import { TC_APP010_001, TC_APP010_002, TC_APP010_004, TC_APP010_005 } from '../../modules/10-hr/cases';
import { TC_APP010_040 } from '../../modules/10-hr/desk-cases';
import { TC_APP018_031, TC_APP018_041 } from '../../modules/18-settings/cases';

/**
 * E2E-039: Staff onboarding with access. Each step runs its source test case (tests/modules/<NN-module>/cases.ts)
 * with its own records: 1. Employee created; 2. Employee file completed; 3. Service center, store and allocation
 * date; 4. Reporting authority and linked user account; 5. User added with roles at the branch; 6. Branch map and
 * sign-in log; 7. My profile read by the employee. The chain stops at the first step a blocker stops; the cause is
 * recorded by the run.
 */
chainTest('E2E-039', async ({ page, chain, browser }) => {
  await installToastRecorder(page);
  await chain.step(1, (qa) => TC_APP010_001({ page, qa }));
  await chain.step(2, (qa) => TC_APP010_002({ page, qa }));
  await chain.step(3, (qa) => TC_APP010_005({ page, qa }));
  await chain.step(4, (qa) => TC_APP010_004({ page, qa, browser }));
  await chain.step(5, (qa) => TC_APP018_031({ page, qa, browser }));
  await chain.step(6, (qa) => TC_APP018_041({ page, qa }));
  await chain.step(7, (qa) => TC_APP010_040({ page, qa }));
});
