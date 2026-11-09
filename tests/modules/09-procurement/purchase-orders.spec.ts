import type { Page } from '@playwright/test';
import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark, SERVER_FAILURE } from '../../../lib/assertions';
import { addDays, todayWib } from '../../../lib/dates';
import { PROCUREMENT } from '../../../lib/procurement-data';
import { PurchaseOrdersPage } from '../../../pages/procurement/ProcurementPages';
import { approvalOf, createOrder as create, docNo, idr, openOrder, orderAtStep, poToastsAfter as toastsAfter, TC_APP009_004 } from './cases';
import { TC_APP009_001, TC_APP009_002, TC_APP009_003, TC_APP009_007, TC_APP009_012, TC_APP009_014, TC_APP009_015, TC_APP009_020, TC_APP009_023, TC_APP009_024, TC_APP009_006, TC_APP009_016, TC_APP009_027, TC_APP009_035 } from './purchase-orders-cases';

/** The test cases are in purchase-orders-cases.ts (shared with the end-to-end chains). */

/**
 * 09-procurement.xlsx, feature "Purchase orders (/procurement/purchase-orders)".
 * Every order of a test carries a document number with a new token. The
 * approval chain has its four steps since 2026-11-01 (found blocker 30 before), with no role per step.
 */

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

qaTest('TC-APP009-001', TC_APP009_001);

qaTest('TC-APP009-002', TC_APP009_002);

qaTest('TC-APP009-003', TC_APP009_003);

qaTest('TC-APP009-004', TC_APP009_004);

qaTest('TC-APP009-007', TC_APP009_007);

qaTest('TC-APP009-012', TC_APP009_012);

qaTest('TC-APP009-014', TC_APP009_014);

qaTest('TC-APP009-015', TC_APP009_015);

qaTest('TC-APP009-020', TC_APP009_020);

qaTest('TC-APP009-023', TC_APP009_023);

qaTest('TC-APP009-024', TC_APP009_024);

qaTest('TC-APP009-006', TC_APP009_006);

qaTest('TC-APP009-016', TC_APP009_016);

qaTest('TC-APP009-027', TC_APP009_027);

qaTest('TC-APP009-035', TC_APP009_035);
