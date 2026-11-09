import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark } from '../../../lib/assertions';
import { authFileOf } from '../../../lib/config';
import { addDays, todayWib } from '../../../lib/dates';
import { STAND_IN_STORE, STAND_IN_STORE_2 } from '../../../lib/inventory-data';
import { StoreFormsPage } from '../../../pages/inventory/InventoryE2EPages';
import { click, indentOrBlock, isServerError, lastId, newItem, opening, TC_APP007_042, TC_APP007_045, toastsAfter } from './cases';
import { TC_APP007_039, TC_APP007_040, TC_APP007_041, TC_APP007_043, TC_APP007_044, TC_APP007_046, TC_APP007_047, TC_APP007_048, TC_APP007_049, TC_APP007_050, TC_APP007_051, TC_APP007_052, TC_APP007_053 } from './documents-cases';

/** The test cases are in documents-cases.ts (shared with the end-to-end chains). */

/**
 * 07-inventory.xlsx, features "Branch and stores (/inventory/setup)", "Store
 * documents (/inventory/documents)", "Stock desk (/inventory/stock-desk)" and
 * "Stock book (/inventory/ledger)". The workbook's stores "X-ST1"/"X-ST2"
 * would be made on Branch and stores, which answered HTTP 500 (found blocker
 * 26) and since 2026-10-31 refuses a store that does not exist: two seed
 * stores of BR-A stand in (Q22). Item "X-ITM1" is made per run
 * as "QA-ITM1-<token>" on Item Master.
 */

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

qaTest('TC-APP007-039', TC_APP007_039);

qaTest('TC-APP007-040', TC_APP007_040);

qaTest('TC-APP007-041', TC_APP007_041);

qaTest('TC-APP007-042', TC_APP007_042);

qaTest('TC-APP007-043', TC_APP007_043);

qaTest('TC-APP007-044', TC_APP007_044);

qaTest('TC-APP007-045', TC_APP007_045);

qaTest('TC-APP007-046', TC_APP007_046);

qaTest('TC-APP007-047', TC_APP007_047);

qaTest('TC-APP007-048', TC_APP007_048);

qaTest('TC-APP007-049', TC_APP007_049);

qaTest('TC-APP007-050', TC_APP007_050);

qaTest('TC-APP007-051', TC_APP007_051);

qaTest('TC-APP007-052', TC_APP007_052);

qaTest('TC-APP007-053', TC_APP007_053);
