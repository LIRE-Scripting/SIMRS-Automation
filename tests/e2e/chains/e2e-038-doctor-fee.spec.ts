import { chainTest } from '../../../fixtures/chain';
import { installToastRecorder } from '../../../lib/assertions';
import { TC_APP010_001 } from '../10-hr/cases';

/**
 * E2E-038: Doctor fee: plan to payout. Each step runs its source test case (tests/e2e/<module>/cases.ts)
 * with its own records: 1. Doctor created as employee; 2. Fee plan, calculation and payout group. The chain stops at the first step a blocker stops; the cause is recorded by the run.
 */
chainTest('E2E-038', async ({ page, chain }) => {
  await installToastRecorder(page);
  await chain.step(1, (qa) => TC_APP010_001({ page, qa }));
  chain.stopAsPlanned(2);
});
