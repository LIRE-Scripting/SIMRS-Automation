import { qaTest } from '../../../fixtures/e2e';

/**
 * Test cases of 02-appointment.xlsx that the plan declares fixme or skip
 * (Automation Candidate "Needs Evaluation", users U3/U4/U10 not prepared).
 * Declared so that the report and the E2E workbook show them with reasons.
 */
for (const id of ['TC-APP002-009', 'TC-APP002-031', 'TC-APP002-032', 'TC-APP002-033']) {
  qaTest(id, async () => {
    throw new Error(`${id} is now "automate" in the plan: write its test`);
  });
}
