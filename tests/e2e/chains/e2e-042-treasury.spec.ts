import { chainTest } from '../../../fixtures/chain';
import { installToastRecorder } from '../../../lib/assertions';
import { TC_APP019_066 } from '../../modules/19-finance/cases';

/**
 * E2E-042: Treasury: imprest, payment requests and guarantees. Step 1 asks an
 * imprest advance for an employee; while no imprest eligibility can be set up
 * for the branch (found blocker 42) the advance is refused and the chain stops there.
 */
chainTest('E2E-042', async ({ page, chain }) => {
  await installToastRecorder(page);
  await chain.step(1, (qa) => TC_APP019_066({ page, qa }));
});
