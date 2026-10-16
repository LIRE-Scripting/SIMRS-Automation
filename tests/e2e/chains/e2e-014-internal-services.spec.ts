import { chainTest } from '../../../fixtures/chain';
import { installToastRecorder } from '../../../lib/assertions';
import { TC_APP022_001, TC_APP022_003, TC_APP022_005, TC_APP022_009, TC_APP022_012 } from '../../modules/22-services/cases';

/**
 * E2E-014: Internal services: request to vendor bill. Each step runs its source test case (tests/modules/<NN-module>/cases.ts)
 * with its own records: 1. Service category; 2. Service item with its accounts; 3. Service request created, sent, approved and completed; 4. Service purchase request approved; 5. Service purchase order approved; 6. Service receipt confirms the delivery. The chain stops at the first step a blocker stops; the cause is recorded by the run.
 */
chainTest('E2E-014', async ({ page, chain }) => {
  await installToastRecorder(page);
  await chain.step(1, (qa) => TC_APP022_001({ page, qa }));
  await chain.step(2, (qa) => TC_APP022_003({ page, qa }));
  await chain.step(3, (qa) => TC_APP022_005({ page, qa }));
  await chain.step(4, (qa) => TC_APP022_009({ page, qa }));
  await chain.step(5, (qa) => TC_APP022_012({ page, qa }));
  chain.stopAsPlanned(6);
});
