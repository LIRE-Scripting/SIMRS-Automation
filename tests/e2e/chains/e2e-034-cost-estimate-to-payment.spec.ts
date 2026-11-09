import { chainTest } from '../../../fixtures/chain';
import { installToastRecorder } from '../../../lib/assertions';
import { TC_APP014_016 } from '../../modules/14-hospital-accounts/cases';
import { TC_APP005_058 } from '../../modules/05-pharmacy/hub-screens-cases';
import { TC_APP005_007 } from '../../modules/05-pharmacy/dispense-cases';
import { TC_APP014_002 } from '../../modules/14-hospital-accounts/cashier-cases';

/**
 * E2E-034: Cost estimate to payment. Step 1 runs TC-APP014-016 (Item price and an estimate; found blocker 35
 * resolved on 2026-10-31); steps 2-4 run their module test cases: the cost estimate saved for the patient, a counter sale to the patient, the pharmacy bill paid at the cashier.
 */
chainTest('E2E-034', async ({ page, chain }) => {
  await installToastRecorder(page);
  await chain.step(1, (qa) => TC_APP014_016({ page, qa }));
  await chain.run(2, TC_APP005_058);
  await chain.run(3, TC_APP005_007);
  await chain.run(4, TC_APP014_002);
});
