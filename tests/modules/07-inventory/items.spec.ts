import type { Page } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder, toastLocator, toastMark, toastsSince, SERVER_FAILURE } from '../../../lib/assertions';
import { addDays, todayWib } from '../../../lib/dates';
import { INVENTORY, STAND_IN_STORE } from '../../../lib/inventory-data';
import { ItemMasterPage, type Item } from '../../../pages/inventory/InventoryE2EPages';
import { TC_APP007_001, unique } from './cases';
import { TC_APP007_002, TC_APP007_003, TC_APP007_004, TC_APP007_005, TC_APP007_006, TC_APP007_007, TC_APP007_016, TC_APP007_018, TC_APP007_019, TC_APP007_020, TC_APP007_021, TC_APP007_022, TC_APP007_023, TC_APP007_029, TC_APP007_037 } from './items-cases';

/** The test cases are in items-cases.ts (shared with the end-to-end chains). */

/**
 * 07-inventory.xlsx, feature "Item Master (/inventory/items)". Items are made
 * per test: code "QA-INV-PARA" -> "QA-INV-PARA-<token>", name "QA Paracetamol
 * 500 mg <token>" (codes cannot be used twice). Batches go into a seed store
 * standing in for ST-1, which cannot be made (found blocker 26, Q22).
 */

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

qaTest('TC-APP007-001', TC_APP007_001);

qaTest('TC-APP007-002', TC_APP007_002);

qaTest('TC-APP007-003', TC_APP007_003);

qaTest('TC-APP007-004', TC_APP007_004);

qaTest('TC-APP007-005', TC_APP007_005);

qaTest('TC-APP007-006', TC_APP007_006);

qaTest('TC-APP007-007', TC_APP007_007);

qaTest('TC-APP007-016', TC_APP007_016);

qaTest('TC-APP007-018', TC_APP007_018);

qaTest('TC-APP007-019', TC_APP007_019);

qaTest('TC-APP007-020', TC_APP007_020);

qaTest('TC-APP007-021', TC_APP007_021);

qaTest('TC-APP007-022', TC_APP007_022);

qaTest('TC-APP007-023', TC_APP007_023);

qaTest('TC-APP007-029', TC_APP007_029);

qaTest('TC-APP007-037', TC_APP007_037);
