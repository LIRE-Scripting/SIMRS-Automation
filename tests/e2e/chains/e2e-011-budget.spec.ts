import { chainTest } from '../../../fixtures/chain';
import { installToastRecorder } from '../../../lib/assertions';
import { TC_APP019_001, TC_APP019_004, TC_APP019_007 } from '../../modules/19-finance/cases';
import { TC_APP020_001, TC_APP020_003, TC_APP020_005 } from '../../modules/20-budget/cases';

/**
 * E2E-011: Budget: financial year to utilisation. Each step runs its source test case (tests/modules/<NN-module>/cases.ts)
 * with its own records: 1. Financial year created; 2. Chart of accounts: group and leaf; 3. Budget posting rules of the branch; 4. Budget book; 5. Budget heads; 6. Budget chart with projects; 7. Budget circular to the departments. The chain stops at the first step a blocker stops; the cause is recorded by the run.
 */
chainTest('E2E-011', async ({ page, chain }) => {
  await installToastRecorder(page);
  await chain.step(1, (qa) => TC_APP019_001({ page, qa }));
  await chain.step(2, (qa) => TC_APP019_004({ page, qa }));
  await chain.step(3, (qa) => TC_APP019_007({ page, qa }));
  await chain.step(4, (qa) => TC_APP020_001({ page, qa }));
  await chain.step(5, (qa) => TC_APP020_003({ page, qa }));
  await chain.step(6, (qa) => TC_APP020_005({ page, qa }));
  chain.stopAsPlanned(7);
});
