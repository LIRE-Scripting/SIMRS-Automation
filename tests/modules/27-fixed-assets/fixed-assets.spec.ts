import type { Page } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { addDays, todayWib } from '../../../lib/dates';
import { Desk, SAVED, refused } from '../shared/desk';
import { auditEntries, menuScreens, saveIfOffered, userPage } from '../shared/access';
import { screenOpens } from '../shared/screen-opens';
import { AI, approvedOrder, assetAccount, assetItem, ASSET_STORE, buy, CH, commissionedAsset, masters, register, registerRows, SLR, subCategory, TC_APP027_001, TC_APP027_003, type Asset } from './cases';
import { newItem } from '../07-inventory/cases';
import { raise } from '../09-procurement/cases';
import { ProcurementDeskPage } from '../../../pages/procurement/ProcurementPages';
import { ROUTES, TC_APP027_002, TC_APP027_004, TC_APP027_005, TC_APP027_006, TC_APP027_007, TC_APP027_008, TC_APP027_009, TC_APP027_010, TC_APP027_011, TC_APP027_012, TC_APP027_013 } from './fixed-assets-cases';

/** The test cases are in fixed-assets-cases.ts (shared with the end-to-end chains). */

/**
 * 27-fixed-assets.xlsx: classification, register and movement. Codes and
 * numbers carry a token. A purchase ("Buy") takes the internal id of an
 * approved order of Procurement (/procurement/requests, made by 09). The
 * item bought is a record of Inventory: checklist blocker 14 named it as
 * missing; since 2026-11-01 each test makes its own item with a batch in the
 * general store (cases.ts, assetItem) and installs and commissions an asset
 * on it. The seed assets (USG-001, USG-SOLD, USG-WO) are not touched.
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

qaTest('TC-APP027-001', TC_APP027_001);

qaTest('TC-APP027-002', TC_APP027_002);

qaTest('TC-APP027-003', TC_APP027_003);

qaTest('TC-APP027-004', TC_APP027_004);

qaTest('TC-APP027-005', TC_APP027_005);

qaTest('TC-APP027-006', TC_APP027_006);

qaTest('TC-APP027-007', TC_APP027_007);

qaTest('TC-APP027-008', TC_APP027_008);

qaTest('TC-APP027-009', TC_APP027_009);

qaTest('TC-APP027-010', TC_APP027_010);

qaTest('TC-APP027-011', TC_APP027_011);

qaTest('TC-APP027-012', TC_APP027_012);

qaTest('TC-APP027-013', TC_APP027_013);

for (const [id, route, heading] of ROUTES) {
  qaTest(id, async ({ page, qa }) => {
    await qa.step(1, () => screenOpens(page, route, heading, qa));
  });
}
