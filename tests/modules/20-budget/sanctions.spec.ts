import type { Locator, Page } from '@playwright/test';
import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark } from '../../../lib/assertions';
import { toastsAfter } from '../18-settings/helpers';
import {
  approvedAllocation,
  approvedSanction,
  cellOf,
  headOf,
  linesOf,
  Master,
  rowAction,
  rowActionRead,
  sanctionDialog,
  saveSanction,
  type ApprovedAllocation,
  editSanction,
  file,
  upload,
  shows,
  closeOpenDialogs,
  isApproved,
  answerChecklist,
} from './cases';
import { TC_APP020_029, TC_APP020_030, TC_APP020_031, TC_APP020_032 } from './sanctions-cases';

/** The test cases are in sanctions-cases.ts (shared with the end-to-end chains). */

/**
 * 20-budget.xlsx, Sanction proposals (TC-APP020-029 to 032). A proposal
 * reserves the balance of a budget line, which an approved allocation makes;
 * since 2026-11-01 allocations are approved and posted on Podomoro, so the
 * steps run on a chain the test makes (cases.ts, approvedAllocation).
 * Spending a sanction (utilisation) needs an approved Finance payment
 * voucher, which no user can approve (found blocker 46).
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

qaTest('TC-APP020-029', TC_APP020_029);

qaTest('TC-APP020-030', TC_APP020_030);

qaTest('TC-APP020-031', TC_APP020_031);

qaTest('TC-APP020-032', TC_APP020_032);
