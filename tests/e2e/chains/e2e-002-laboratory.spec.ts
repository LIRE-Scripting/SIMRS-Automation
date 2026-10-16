import { chainTest } from '../../../fixtures/chain';

/** E2E-002: Laboratory: order from the consultation to the certified result. The chain cannot start: its first step is blocked. */
chainTest('E2E-002', async ({ chain }) => {
  // The source test case of step 1 is not runnable as planned from its workbook (blocker, missing user or "Needs Evaluation").
  chain.stopAsPlanned(1);
});
