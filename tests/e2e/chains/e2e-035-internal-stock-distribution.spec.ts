import { chainTest } from '../../../fixtures/chain';
import { ensureBloodbankDepartment } from '../../../lib/bloodbank-data';
import { installToastRecorder } from '../../../lib/assertions';
import { TC_APP007_001, TC_APP007_010, TC_APP007_042, TC_APP007_045 } from '../07-inventory/cases';

/**
 * E2E-035: Internal stock distribution. Each step runs its source test case (tests/e2e/<module>/cases.ts)
 * with its own records: 1. Item added; 2. Opening stock of a batch; 3. Stores and the visits they dispense for; 4. Indent, issue, receipt and return between two stores. The chain stops at the first step a blocker stops; the cause is recorded by the run.
 */
chainTest('E2E-035', async ({ page, chain }) => {
  await installToastRecorder(page);
  // As the 07 store spec does before it runs: the department of the stand-in stores exists.
  await ensureBloodbankDepartment(page);
  await chain.step(1, (qa) => TC_APP007_001({ page, qa }));
  await chain.step(2, (qa) => TC_APP007_042({ page, qa }));
  await chain.step(3, (qa) => TC_APP007_010({ page, qa }));
  await chain.step(4, (qa) => TC_APP007_045({ page, qa }));
});
