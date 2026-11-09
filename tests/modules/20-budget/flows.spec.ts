import type { Page } from '@playwright/test';
import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark } from '../../../lib/assertions';
import { addDays, todayWib } from '../../../lib/dates';
import { toastsAfter } from '../18-settings/helpers';
import { Processes, restoreChain } from '../18-settings/process-cases';
import { menuScreens, rowCount, screenRefuses, userPage } from '../shared/access';
import {
  allocationLineBalance,
  approvedAllocation,
  approvedCircular,
  book,
  cellOf,
  choose,
  draftNo,
  editSanction,
  ensurePostingRules,
  file,
  headOf,
  linesOf,
  postingOf,
  postingRuleStatus,
  releaseDialog,
  removePostingRule,
  rowAction,
  rowActionRead,
  sanctionDialog,
  saveForm,
  restorePostingRule,
  closeOpenDialogs,
  saveSanction,
  shows,
  upload,
} from './cases';
import { TC_APP020_033, TC_APP020_034, TC_APP020_039, TC_APP020_040, TC_APP020_041, TC_APP020_043, TC_APP020_044, TC_APP020_045 } from './flows-cases';

/** The test cases are in flows-cases.ts (shared with the end-to-end chains). */

/**
 * 20-budget.xlsx, the utilisation, the states of the documents, the changes
 * of documents, Budget and Finance postings and the budget rights. Since
 * 2026-11-01 an approved budget request is allocated and posted on Podomoro
 * (checklist blocker 13 no longer stops it), so the tests make their own
 * chain (cases.ts); a utilisation still needs an approved Finance payment
 * voucher, which no user can approve (found blocker 46).
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

qaTest('TC-APP020-033', TC_APP020_033);

qaTest('TC-APP020-034', TC_APP020_034);

qaTest('TC-APP020-039', TC_APP020_039);

qaTest('TC-APP020-040', TC_APP020_040);

qaTest('TC-APP020-041', TC_APP020_041);

qaTest('TC-APP020-043', TC_APP020_043);

qaTest('TC-APP020-044', TC_APP020_044);

qaTest('TC-APP020-045', TC_APP020_045);
