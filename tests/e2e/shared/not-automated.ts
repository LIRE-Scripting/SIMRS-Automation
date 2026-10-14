import { qaTest } from '../../../fixtures/e2e';
import { moduleOf, testCaseRef } from '../../../lib/qa-data';
import { planFor } from '../../../lib/qa-data/plan';

/**
 * Declares every test case of a workbook that the plan (lib/qa-data/plan.ts)
 * makes fixme or skip, so the report and the E2E workbook show them with
 * their reasons. Their body never runs; if the plan turns one into
 * "automate", the test fails until it is written in the module's specs.
 */
export function declareNotAutomated(moduleSlug: string, except: string[] = []): void {
  for (const t of moduleOf(moduleSlug).testCases) {
    if (except.includes(t.id) || planFor(testCaseRef(t.id)).disposition === 'automate') continue;
    qaTest(t.id, async () => {
      throw new Error(`${t.id} is now "automate" in the plan: write its test`);
    });
  }
}
