import { chainTest } from '../../../fixtures/chain';
import { installToastRecorder } from '../../../lib/assertions';
import { TC_APP025_001 } from '../../modules/25-linen/cases';

/**
 * E2E-047: Linen and cleaning of a ward. Each step runs its source test case (tests/modules/<NN-module>/cases.ts)
 * with its own records: 1. Linen stores and recipe. The chain stops at the first step a blocker stops; the cause is recorded by the run.
 */
chainTest('E2E-047', async ({ page, chain }) => {
  await installToastRecorder(page);
  await chain.step(1, (qa) => TC_APP025_001({ page, qa }));
});
