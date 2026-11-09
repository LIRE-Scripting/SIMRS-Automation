import { chainTest } from '../../../fixtures/chain';
import { TC_APP009_053 } from '../../modules/09-procurement/reorder-cases';
import { TC_APP007_050 } from '../../modules/07-inventory/documents-cases';
import { TC_APP009_037, TC_APP009_046, TC_APP009_049, TC_APP009_051 } from '../../modules/09-procurement/desk-hub-screens-cases';
import { TC_APP009_039, TC_APP009_043 } from '../../modules/09-procurement/cases';
import { TC_APP009_003 } from '../../modules/09-procurement/purchase-orders-cases';
import { TC_APP019_054 } from '../../modules/19-finance/documents-cases';
import { TC_APP019_056 } from '../../modules/19-finance/masters-cases';
import { TC_APP019_064 } from '../../modules/19-finance/treasury-cases';

/**
 * E2E-036: Procure-to-pay: reorder to payment and supplier return. Each step runs its module test case with its own records; the chain stops at the first
 * step a blocker stops (the cause is recorded by the run), and the later steps run once that is lifted (or in a probe
 * with QA_CHAIN_CONTINUE=1).
 */
chainTest('E2E-036', async ({ page, chain }) => {
  await chain.run(1, TC_APP009_053);
  await chain.run(2, TC_APP007_050);
  await chain.run(3, TC_APP009_037);
  await chain.step(4, (qa) => TC_APP009_039({ page, qa }));
  await chain.step(5, (qa) => TC_APP009_043({ page, qa }));
  await chain.run(6, TC_APP009_003);
  await chain.run(7, TC_APP009_046);
  await chain.run(8, TC_APP009_049);
  await chain.run(9, TC_APP019_054);
  await chain.run(10, TC_APP019_056);
  await chain.run(11, TC_APP019_064);
  await chain.run(12, TC_APP009_051);
});
