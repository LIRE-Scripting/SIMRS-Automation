import { chainTest } from '../../../fixtures/chain';
import { installToastRecorder } from '../../../lib/assertions';
import { TC_APP007_001 } from '../../modules/07-inventory/cases';
import { TC_APP009_004, TC_APP009_039, TC_APP009_043 } from '../../modules/09-procurement/cases';

/**
 * E2E-008: Supply: purchase to stock to use. Each step runs its source test case (tests/modules/<NN-module>/cases.ts)
 * with its own records: 1. Item added to the item master; 2. Purchase request raised, sent and approved; 3. Purchase
 * order created, sent and approved; 4. the order passes its approval steps. The chain stops at the first step a
 * blocker stops (an order on /procurement/requests answers HTTP 500, found blocker 44; the chain of a purchase order
 * has one step, found blocker 30); the cause is recorded by the run.
 */
chainTest('E2E-008', async ({ page, chain }) => {
  await installToastRecorder(page);
  await chain.step(1, (qa) => TC_APP007_001({ page, qa }));
  await chain.step(2, (qa) => TC_APP009_039({ page, qa }));
  await chain.step(3, (qa) => TC_APP009_043({ page, qa }));
  await chain.step(4, (qa) => TC_APP009_004({ page, qa }));
  chain.stop(5, 'Blocker 31', 'goods receipt ("grn") answers HTTP 500');
});
