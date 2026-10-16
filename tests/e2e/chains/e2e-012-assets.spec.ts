import { chainTest } from '../../../fixtures/chain';
import { installToastRecorder } from '../../../lib/assertions';
import { TC_APP027_001, TC_APP027_003 } from '../../modules/27-fixed-assets/cases';

/**
 * E2E-012: Assets: purchase to maintenance to disposal. Each step runs its source test case (tests/modules/<NN-module>/cases.ts)
 * with its own records: 1. Classification: category and sub category with its account; 2. Asset bought, installed and commissioned. The chain stops at the first step a blocker stops; the cause is recorded by the run.
 */
chainTest('E2E-012', async ({ page, chain }) => {
  await installToastRecorder(page);
  await chain.step(1, (qa) => TC_APP027_001({ page, qa }));
  await chain.step(2, (qa) => TC_APP027_003({ page, qa }));
});
