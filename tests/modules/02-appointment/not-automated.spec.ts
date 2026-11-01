import { qaTest } from '../../../fixtures/e2e';
import { testCaseRef } from '../../../lib/qa-data';
import { planFor } from '../../../lib/qa-data/plan';

/**
 * Test cases of 02-appointment.xlsx that the plan declares fixme or skip
 * (Automation Candidate "Needs Evaluation", users U3/U4/U10 not prepared).
 * Declared so that the report and the E2E workbook show them with reasons.
 */
// Those the plan now automates are written elsewhere (tests/modules/00-access, the appointment cases).
for (const id of ['TC-APP002-009', 'TC-APP002-031', 'TC-APP002-032', 'TC-APP002-033'].filter((x) => planFor(testCaseRef(x)).disposition !== 'automate')) {
  qaTest(id, async () => {
    throw new Error(`${id} is now "automate" in the plan: write its test`);
  });
}
