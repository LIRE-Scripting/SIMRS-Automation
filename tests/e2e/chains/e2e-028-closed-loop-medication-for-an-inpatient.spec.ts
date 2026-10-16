import { chainTest } from '../../../fixtures/chain';

/** E2E-028: Closed-loop medication for an inpatient. The chain cannot start: its first step is blocked. */
chainTest('E2E-028', async ({ chain }) => {
  // The source test case of step 1 is not runnable as planned from its workbook (blocker, missing user or "Needs Evaluation").
  chain.stopAsPlanned(1);
});
