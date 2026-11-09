import { chainTest } from '../../../fixtures/chain';
import { installToastRecorder } from '../../../lib/assertions';
import { TC_APP019_066, TC_APP019_068 } from '../../modules/19-finance/cases';
import { TC_APP019_072, TC_APP019_076 } from '../../modules/19-finance/treasury-cases';

/**
 * E2E-042: Treasury: imprest, payment requests and guarantees. Step 1 asks an
 * imprest advance for an employee; while no imprest eligibility can be set up
 * for the branch (found blocker 42) the advance is refused and the chain stops there;
 * the later steps run their module test cases once that is lifted (or in a probe with QA_CHAIN_CONTINUE=1).
 */
chainTest('E2E-042', async ({ page, chain }) => {
  await installToastRecorder(page);
  await chain.step(1, (qa) => TC_APP019_066({ page, qa }));
  await chain.run(2, TC_APP019_076);
  await chain.step(3, (qa) => TC_APP019_068({ page, qa }));
  await chain.run(4, TC_APP019_072);
});
