import { chainTest } from '../../../fixtures/chain';
import { installToastRecorder } from '../../../lib/assertions';
import { TC_APP019_001, TC_APP019_004, TC_APP019_038, TC_APP019_040 } from '../19-finance/cases';

/**
 * E2E-041: Finance record-to-report. Each step runs its source test case (tests/e2e/<module>/cases.ts)
 * with its own records: 1. Financial year; 2. Chart of accounts; 3. Currencies and rates; 4. Cost centres. The chain stops at the first step a blocker stops; the cause is recorded by the run.
 */
chainTest('E2E-041', async ({ page, chain }) => {
  await installToastRecorder(page);
  await chain.step(1, (qa) => TC_APP019_001({ page, qa }));
  await chain.step(2, (qa) => TC_APP019_004({ page, qa }));
  await chain.step(3, (qa) => TC_APP019_038({ page, qa }));
  await chain.step(4, (qa) => TC_APP019_040({ page, qa }));
});
