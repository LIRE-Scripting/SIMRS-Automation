import { chainTest } from '../../../fixtures/chain';
import { installToastRecorder } from '../../../lib/assertions';
import { TC_APP014_016 } from '../../modules/14-hospital-accounts/cases';

/**
 * E2E-034: Cost estimate to payment. Step 1 runs TC-APP014-016 (Item price and an estimate): the item price of the
 * branch cannot be saved (found blocker 35), so the chain stops there; the cause is recorded by the run.
 */
chainTest('E2E-034', async ({ page, chain }) => {
  await installToastRecorder(page);
  await chain.step(1, (qa) => TC_APP014_016({ page, qa }));
});
