import { chainTest } from '../../../fixtures/chain';
import { installToastRecorder } from '../../../lib/assertions';
import { TC_APP009_004 } from '../../modules/09-procurement/cases';
import { TC_APP009_005 } from '../../modules/09-procurement/evaluation-cases';
import { TC_APP020_021 } from '../../modules/20-budget/allocation-cases';
import { PROCESS, restoreChain, TC_APP018_054, type Chain } from '../../modules/18-settings/process-cases';

/**
 * E2E-050: Approval chains configured and used. Step 1 gives the purchase
 * order chain two steps; step 2 puts a purchase order of the chain on it and
 * advances it once (the order then waits at the second step); steps 3 and 4 run
 * their module test cases (approval in the procurement desk, budget allocation). The purchase
 * order chain applies to every user of the
 * hospital: it is put back as it was at the end, whatever happened.
 */
chainTest('E2E-050', async ({ page, chain }) => {
  await installToastRecorder(page);
  let was: Chain | undefined;
  try {
    was = await chain.step(1, (qa) => TC_APP018_054({ page, qa }, true));
    await chain.step(2, (qa) => TC_APP009_004({ page, qa }));
    await chain.run(3, TC_APP009_005);
    await chain.run(4, TC_APP020_021);
  } finally {
    if (was) await restoreChain(page, PROCESS, was);
  }
});
