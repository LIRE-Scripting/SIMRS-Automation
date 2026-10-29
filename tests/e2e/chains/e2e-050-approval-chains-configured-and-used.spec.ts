import { chainTest } from '../../../fixtures/chain';
import { installToastRecorder } from '../../../lib/assertions';
import { TC_APP009_004 } from '../../modules/09-procurement/cases';
import { PROCESS, restoreChain, TC_APP018_054, type Chain } from '../../modules/18-settings/process-cases';

/**
 * E2E-050: Approval chains configured and used. Step 1 gives the purchase
 * order chain two steps; step 2 puts a purchase order of the chain on it. The
 * order's approval stops at the site's one-step chain (found blocker 30), so
 * the chain ends there. The purchase order chain applies to every user of the
 * hospital: it is put back as it was at the end, whatever happened.
 */
chainTest('E2E-050', async ({ page, chain }) => {
  await installToastRecorder(page);
  let was: Chain | undefined;
  try {
    was = await chain.step(1, (qa) => TC_APP018_054({ page, qa }, true));
    await chain.step(2, (qa) => TC_APP009_004({ page, qa }));
  } finally {
    if (was) await restoreChain(page, PROCESS, was);
  }
});
