import type { Page } from '@playwright/test';
import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { todayWib } from '../../../lib/dates';
import {
  allocationCells,
  allocationRow,
  approvedAllocation,
  approvedRelease,
  approvedSanction,
  ensurePostingRules,
  headOf,
  postingRuleStatus,
  removePostingRule,
  savePostingRule,
  approvedRequest,
  branchBank,
  cellOf,
  choose,
  fillAllocation,
  openAllocation,
  PER_DEPARTMENT,
  postingOf,
  releaseDialog,
  rowAction,
  rowActionRead,
  saveAllocation,
  saveForm,
  withdrawalDialog,
  restorePostingRule,
  shows,
  isApproved,
  linesOf,
  amountOf,
} from './cases';
import type { Locator } from '@playwright/test';
import { TC_APP020_021, TC_APP020_022, TC_APP020_024, TC_APP020_025, TC_APP020_026, TC_APP020_027, TC_APP020_028, TC_APP020_023 } from './allocation-cases';

/** The test cases are in allocation-cases.ts (shared with the end-to-end chains). */

/**
 * 20-budget.xlsx, Budget allocation (journey JRN-APP020-010). Checklist
 * blocker 13 linked these test cases to the missing branch set-up; since
 * 2026-11-01 an approved budget request is allocated, approved and its
 * journal posted on Podomoro, so they run (lib/qa-data/plan.ts,
 * CHECKLIST_RESOLVED). Each test makes its own chain: circular, internal
 * budgets, budget request (cases.ts, approvedRequest).
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

qaTest('TC-APP020-021', TC_APP020_021);

qaTest('TC-APP020-022', TC_APP020_022);

qaTest('TC-APP020-024', TC_APP020_024);

qaTest('TC-APP020-025', TC_APP020_025);

qaTest('TC-APP020-026', TC_APP020_026);

qaTest('TC-APP020-027', TC_APP020_027);

qaTest('TC-APP020-028', TC_APP020_028);

qaTest('TC-APP020-023', TC_APP020_023);
