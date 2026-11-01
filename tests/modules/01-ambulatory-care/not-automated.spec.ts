import { qaTest } from '../../../fixtures/e2e';
import { testCaseRef } from '../../../lib/qa-data';
import { planFor } from '../../../lib/qa-data/plan';

/**
 * Test cases of 01-ambulatory-care.xlsx that the plan (lib/qa-data/plan.ts)
 * declares fixme or skip: Automation Candidate "No" or "Needs Evaluation",
 * or a user U3 to U10 that is not prepared. They are declared so that the
 * report and the E2E workbook show them with their reasons. Their body never
 * runs; if the plan ever turns one of them into "automate", it fails here
 * until it is written.
 */
const DECLARED_ONLY = [
  'TC-APP001-004', 'TC-APP001-023', 'TC-APP001-025', 'TC-APP001-037',
  'TC-APP001-038', 'TC-APP001-041', 'TC-APP001-045', 'TC-APP001-057',
  'TC-APP001-064', 'TC-APP001-065', 'TC-APP001-068', 'TC-APP001-069',
  'TC-APP001-070', 'TC-APP001-071', 'TC-APP001-072', 'TC-APP001-073', 'TC-APP001-074', 'TC-APP001-087',
  'TC-APP001-088', 'TC-APP001-089',
];

// Those the plan now automates are written elsewhere (tests/modules/00-access, the simulated print cases).
for (const id of DECLARED_ONLY.filter((x) => planFor(testCaseRef(x)).disposition !== 'automate')) {
  qaTest(id, async () => {
    throw new Error(`${id} is now "automate" in the plan: write its test`);
  });
}
