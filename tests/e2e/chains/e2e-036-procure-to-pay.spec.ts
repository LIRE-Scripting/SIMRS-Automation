import { chainTest } from '../../../fixtures/chain';

/** E2E-036: Procure-to-pay: reorder to payment and supplier return. The chain cannot start: its first step is blocked. */
chainTest('E2E-036', async ({ chain }) => {
  // The source test case of step 1 is not runnable as planned from its workbook (blocker, missing user or "Needs Evaluation").
  chain.stopAsPlanned(1);
});
