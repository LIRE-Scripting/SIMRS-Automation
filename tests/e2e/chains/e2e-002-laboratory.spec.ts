import { chainTest } from '../../../fixtures/chain';
import { installToastRecorder } from '../../../lib/assertions';
import { labFromConsultation } from '../../modules/03-patient-care/cases';
import { TC_APP011_007 } from '../../modules/11-laboratory/evaluation-cases';

/**
 * E2E-002: Laboratory: order from the consultation to the certified result. Steps 1-2 run their source test cases
 * (a lab order from the consultation; the order on the worklist, worked to "Resulted"). Step 3 (TC-APP011-002, sample
 * generated and labelled) is marked "Automation Candidate = No" in its workbook, so the chain stops there.
 */
chainTest('E2E-002', async ({ page, chain }) => {
  await installToastRecorder(page);
  await chain.step(1, (qa) => labFromConsultation({ page, qa }));
  await chain.step(2, (qa) => TC_APP011_007({ page, qa }));
  chain.stopAsPlanned(3);
});
