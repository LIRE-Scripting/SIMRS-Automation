import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { asOnSite } from '../../../lib/i18n';
import {
  addToChart,
  approvedAllocation,
  approvedSanction,
  approvedTransfer,
  book,
  cellOf,
  choose,
  departmentName,
  head,
  headOf,
  heads,
  linesOf,
  openPosition,
  rowActionRead,
  saveTransfer,
  shownLines,
  shows,
  closeOpenDialogs,
  isApproved,
  transferDialog,
  YEAR,
  type TransferValues,
} from './cases';
import { TC_APP020_035, TC_APP020_036, TC_APP020_037, TC_APP020_038 } from './transfers-cases';

/** The test cases are in transfers-cases.ts (shared with the end-to-end chains). */

/**
 * 20-budget.xlsx, Budget transfer and Budget position (TC-APP020-035 to
 * 038). Both need budget lines, which an approved allocation makes; since
 * 2026-11-01 allocations are approved on Podomoro (checklist blocker 13 no
 * longer stops them), so each test makes its own chain (cases.ts).
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

qaTest('TC-APP020-035', TC_APP020_035);

qaTest('TC-APP020-036', TC_APP020_036);

qaTest('TC-APP020-037', TC_APP020_037);

qaTest('TC-APP020-038', TC_APP020_038);
