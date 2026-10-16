import { chainTest } from '../../../fixtures/chain';
import { installToastRecorder } from '../../../lib/assertions';
import { TC_APP007_001 } from '../../modules/07-inventory/cases';

/**
 * E2E-008: Supply: purchase to stock to use. Each step runs its source test case (tests/modules/<NN-module>/cases.ts)
 * with its own records: 1. Item added to the item master; 2. Purchase request raised, sent and approved. The chain stops at the first step a blocker stops; the cause is recorded by the run.
 */
chainTest('E2E-008', async ({ page, chain }) => {
  await installToastRecorder(page);
  await chain.step(1, (qa) => TC_APP007_001({ page, qa }));
  chain.stopAsPlanned(2);
});
