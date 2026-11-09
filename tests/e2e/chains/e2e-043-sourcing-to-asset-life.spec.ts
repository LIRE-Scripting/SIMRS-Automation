import { chainTest } from '../../../fixtures/chain';
import { installToastRecorder } from '../../../lib/assertions';
import { TC_APP023_020 } from '../../modules/23-sourcing/cases';
import { TC_APP009_043 } from '../../modules/09-procurement/cases';
import { TC_APP027_003 } from '../../modules/27-fixed-assets/cases';
import { TC_APP026_007, TC_APP026_010 } from '../../modules/26-maintenance/maintenance-cases';
import { TC_APP027_006 } from '../../modules/27-fixed-assets/fixed-assets-cases';

/**
 * E2E-043: Sourcing to asset life. Each step runs its source test case (tests/modules/<NN-module>/cases.ts)
 * with its own records: 1. Tender from the purchase request to the agreement. The chain stops at the first step a blocker stops; the cause is recorded by the run.
 */
chainTest('E2E-043', async ({ page, chain }) => {
  await installToastRecorder(page);
  await chain.step(1, (qa) => TC_APP023_020({ page, qa }));
  await chain.step(2, (qa) => TC_APP009_043({ page, qa }));
  await chain.step(3, (qa) => TC_APP027_003({ page, qa }));
  await chain.run(4, TC_APP026_010);
  await chain.run(5, TC_APP026_007);
  await chain.run(6, TC_APP027_006);
});
