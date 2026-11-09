import { chainTest } from '../../../fixtures/chain';
import { installToastRecorder } from '../../../lib/assertions';
import { TC_APP026_001, TC_APP026_004 } from '../../modules/26-maintenance/cases';
import { TC_APP027_001 } from '../../modules/27-fixed-assets/cases';
import { TC_APP020_042 } from '../../modules/20-budget/budget-cases';
import { TC_APP026_012 } from '../../modules/26-maintenance/maintenance-cases';

/**
 * E2E-044: Maintenance of equipment across applications. Each step runs its source test case (tests/modules/<NN-module>/cases.ts)
 * with its own records: 1. Classification; 2. Plan, schedule and due work; 3. Breakdown to invoice. The chain stops at the first step a blocker stops; the cause is recorded by the run.
 */
chainTest('E2E-044', async ({ page, chain }) => {
  await installToastRecorder(page);
  await chain.step(1, (qa) => TC_APP027_001({ page, qa }));
  await chain.step(2, (qa) => TC_APP026_001({ page, qa }));
  await chain.step(3, (qa) => TC_APP026_004({ page, qa }));
  await chain.run(4, TC_APP020_042);
  await chain.run(5, TC_APP026_012);
});
