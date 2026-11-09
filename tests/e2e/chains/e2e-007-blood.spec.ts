import { chainTest } from '../../../fixtures/chain';
import { TC_APP006_012, TC_APP006_025 } from '../../modules/06-transfusion-medicine/bloodbank-cases';
import { TC_APP006_013, TC_APP006_014 } from '../../modules/06-transfusion-medicine/evaluation-cases';
import { TC_APP006_020, TC_APP006_022 } from '../../modules/06-transfusion-medicine/cases';

/**
 * E2E-007: Blood: donor to transfusion. Each step runs its module test case with its own records; the chain stops at the first
 * step a blocker stops (the cause is recorded by the run), and the later steps run once that is lifted (or in a probe
 * with QA_CHAIN_CONTINUE=1).
 */
chainTest('E2E-007', async ({ page, chain }) => {
  chain.stopAsPlanned(1);
  chain.stopAsPlanned(2);
  await chain.run(3, TC_APP006_012);
  await chain.run(4, TC_APP006_013);
  await chain.run(5, TC_APP006_014);
  await chain.step(6, (qa) => TC_APP006_020({ page, qa }));
  await chain.step(7, (qa) => TC_APP006_022({ page, qa }));
  await chain.run(8, TC_APP006_025);
});
