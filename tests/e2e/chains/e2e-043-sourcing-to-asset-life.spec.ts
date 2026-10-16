import { chainTest } from '../../../fixtures/chain';
import { installToastRecorder } from '../../../lib/assertions';
import { TC_APP023_020 } from '../../modules/23-sourcing/cases';

/**
 * E2E-043: Sourcing to asset life. Each step runs its source test case (tests/modules/<NN-module>/cases.ts)
 * with its own records: 1. Tender from the purchase request to the agreement. The chain stops at the first step a blocker stops; the cause is recorded by the run.
 */
chainTest('E2E-043', async ({ page, chain }) => {
  await installToastRecorder(page);
  await chain.step(1, (qa) => TC_APP023_020({ page, qa }));
});
