import { chainTest } from '../../../fixtures/chain';
import { ensureBloodbankDepartment } from '../../../lib/bloodbank-data';
import { installToastRecorder } from '../../../lib/assertions';
import { TC_APP007_001, TC_APP007_010, TC_APP007_042, TC_APP007_045 } from '../../modules/07-inventory/cases';
import { TC_APP007_048, TC_APP007_052, TC_APP007_053 } from '../../modules/07-inventory/documents-cases';
import { TC_APP007_011, TC_APP007_012 } from '../../modules/07-inventory/stores-requests-cases';

/**
 * E2E-035: Internal stock distribution. Each step runs its source test case (tests/modules/<NN-module>/cases.ts)
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
  await chain.run(5, TC_APP007_048);
  await chain.run(6, TC_APP007_011);
  await chain.run(7, TC_APP007_012);
  await chain.run(8, TC_APP007_052);
  await chain.run(9, TC_APP007_053);
});
