import { chainTest } from '../../../fixtures/chain';
import { installToastRecorder } from '../../../lib/assertions';
import { inpatientOrder } from '../../modules/03-patient-care/cases';
import { TC_APP004_014, TC_APP004_015, TC_APP004_017 } from '../../modules/04-inpatient/evaluation-cases';
import { TC_APP004_077 } from '../../modules/04-inpatient/ward-cases';
import { TC_APP005_005, TC_APP005_018 } from '../../modules/05-pharmacy/evaluation-cases';
import { TC_APP005_063 } from '../../modules/05-pharmacy/hub-cases';
import { TC_APP007_008 } from '../../modules/07-inventory/evaluation-cases';

/**
 * E2E-028: Closed-loop medication for an inpatient. Each step runs its source test case with its own records
 * (patients, stays, orders and the ward group of the step); ST-IP cannot be made (found blocker 26), so the seed
 * store of the pharmacy tests stands in. The chain stops at the first step a blocker, or a step the workbook leaves
 * TBD, stops; the cause is recorded by the run.
 */
chainTest('E2E-028', async ({ page, chain }) => {
  await installToastRecorder(page);
  await chain.step(1, (qa) => inpatientOrder({ page, qa }));
  await chain.step(2, (qa) => TC_APP004_014({ page, qa }));
  await chain.step(3, (qa) => TC_APP004_015({ page, qa }));
  await chain.step(4, (qa) => TC_APP005_005({ page, qa }));
  await chain.step(5, (qa) => TC_APP004_077({ page, qa }));
  await chain.step(6, (qa) => TC_APP005_063({ page, qa }));
  await chain.step(7, (qa) => TC_APP004_017({ page, qa }));
  await chain.step(8, (qa) => TC_APP005_018({ page, qa }));
  await chain.step(9, (qa) => TC_APP007_008({ page, qa }));
});
