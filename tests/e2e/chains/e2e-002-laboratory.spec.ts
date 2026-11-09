import { chainTest } from '../../../fixtures/chain';
import { installToastRecorder } from '../../../lib/assertions';
import { labFromConsultation } from '../../modules/03-patient-care/cases';
import { TC_APP011_007 } from '../../modules/11-laboratory/evaluation-cases';
import { TC_APP011_002 } from '../../modules/11-laboratory/sample-label-cases';
import { TC_APP011_003, TC_APP011_004, TC_APP011_044 } from '../../modules/11-laboratory/worklist-cases';
import { TC_APP011_033 } from '../../modules/11-laboratory/work-catalogue-screens-cases';

/**
 * E2E-002: Laboratory: order from the consultation to the certified result. Steps 1-2 run their source test cases
 * (a lab order from the consultation; the order on the worklist, worked to "Resulted"). Steps 3-7 run their module test cases
 * (each with its own lab order): sample generated and labelled (TC-APP011-002, run by simulation of the printer and the
 * barcode reader), sent and accepted, result captured, certified, handed over.
 */
chainTest('E2E-002', async ({ page, chain }) => {
  await installToastRecorder(page);
  await chain.step(1, (qa) => labFromConsultation({ page, qa }));
  await chain.step(2, (qa) => TC_APP011_007({ page, qa }));
  await chain.run(3, TC_APP011_002);
  await chain.run(4, TC_APP011_003);
  await chain.run(5, TC_APP011_004);
  await chain.run(6, TC_APP011_033);
  await chain.run(7, TC_APP011_044);
});
