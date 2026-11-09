import type { Page } from '@playwright/test';
import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder, toastLocator, toastMark, toastsSince } from '../../../lib/assertions';
import { ensureBloodbankDepartment } from '../../../lib/bloodbank-data';
import { authFileOf } from '../../../lib/config';
import { INVENTORY } from '../../../lib/inventory-data';
import { StockRequestsPage, StoresPage } from '../../../pages/inventory/InventoryE2EPages';
import { TC_APP007_010 } from './cases';
import { TC_APP007_011, TC_APP007_012, TC_APP007_025, TC_APP007_026, TC_APP007_028, TC_APP007_031 } from './stores-requests-cases';

/** The test cases are in stores-requests-cases.ts (shared with the end-to-end chains). */

/**
 * 07-inventory.xlsx, features "Stores (/inventory/stores)" and "Stock
 * Requests (/inventory/stock-requests)". The request's department "QA
 * Bangsal Dalam" is the department made once for 06 (same name in both
 * catalogues). Document numbers "QA-SR-0001" get the run's token.
 */

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage({ storageState: authFileOf('U1') });
  await ensureBloodbankDepartment(page);
  await page.close();
});

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

qaTest('TC-APP007-010', TC_APP007_010);

qaTest('TC-APP007-011', TC_APP007_011);

qaTest('TC-APP007-012', TC_APP007_012);

qaTest('TC-APP007-025', TC_APP007_025);

qaTest('TC-APP007-026', TC_APP007_026);

qaTest('TC-APP007-028', TC_APP007_028);

qaTest('TC-APP007-031', TC_APP007_031);
