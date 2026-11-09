import { chainTest } from '../../../fixtures/chain';
import { TC_APP020_021 } from '../../modules/20-budget/allocation-cases';
import { TC_APP020_029 } from '../../modules/20-budget/sanctions-cases';
import { TC_APP009_043 } from '../../modules/09-procurement/cases';
import { TC_APP020_042 } from '../../modules/20-budget/budget-cases';
import { TC_APP020_035, TC_APP020_037 } from '../../modules/20-budget/transfers-cases';
import { TC_APP020_033 } from '../../modules/20-budget/flows-cases';

/**
 * E2E-037: Budget-controlled purchasing. Each step runs its module test case with its own records; the chain stops at the first
 * step a blocker stops (the cause is recorded by the run), and the later steps run once that is lifted (or in a probe
 * with QA_CHAIN_CONTINUE=1).
 */
chainTest('E2E-037', async ({ page, chain }) => {
  await chain.run(1, TC_APP020_021);
  await chain.run(2, TC_APP020_029);
  await chain.step(3, (qa) => TC_APP009_043({ page, qa }));
  await chain.run(4, TC_APP020_042);
  await chain.run(5, TC_APP020_037);
  await chain.run(6, TC_APP020_033);
  await chain.run(7, TC_APP020_035);
});
