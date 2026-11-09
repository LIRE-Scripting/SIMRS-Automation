import { chainTest } from '../../../fixtures/chain';
import { TC_APP006_025, TC_APP006_027 } from '../../modules/06-transfusion-medicine/bloodbank-cases';
import { TC_APP006_026 } from '../../modules/06-transfusion-medicine/evaluation-cases';

/**
 * E2E-031: Blood: emergency release and return. Each step runs its module test case with its own records; the chain stops at the first
 * step a blocker stops (the cause is recorded by the run), and the later steps run once that is lifted (or in a probe
 * with QA_CHAIN_CONTINUE=1).
 */
chainTest('E2E-031', async ({ page, chain }) => {
  // TC-APP006-024 needs a screened, available unit: a bag is numbered on Donors, which answers HTTP 500 (checklist blocker 2), as in the module spec.
  chain.stop(1, 'Blocker 2', 'needs a screened, available unit (a bag is numbered on Donors)');
  await chain.run(2, TC_APP006_025);
  await chain.run(3, TC_APP006_026);
  await chain.run(4, TC_APP006_027);
});
