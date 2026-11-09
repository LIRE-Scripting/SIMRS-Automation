import type { Page } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { addDays, todayWib } from '../../../lib/dates';
import { Desk, SAVED, refused } from '../shared/desk';
import { auditEntries, menuScreens, userPage } from '../shared/access';
import { screenOpens } from '../shared/screen-opens';
import { breakdown, BREAKDOWN, CA, JB, NE, NV, ORDER, plans, SPARE, TC_APP026_001, TC_APP026_004, work } from './cases';
import { expectStatus } from '../shared/desk-status';
import { ROUTES, TC_APP026_002, TC_APP026_003, TC_APP026_005, TC_APP026_006, TC_APP026_007, TC_APP026_008, TC_APP026_009, TC_APP026_010, TC_APP026_011, TC_APP026_012, TC_APP026_013 } from './maintenance-cases';

/** The test cases are in maintenance-cases.ts (shared with the end-to-end chains). */

/**
 * 26-maintenance.xlsx: plans (job card, plan, schedule, daily status, open
 * due), work (breakdown, work order, spare, complete, invoice) and AMC
 * (indent, contract, schedule, instalment, warranty, certificate). Numbers
 * and codes carry a token. No budget head has a balance (allocations need
 * U5): the work order names the seed head "ALKES" and its approval is
 * recorded as the site answers. The spare "X-FREON" in "X Gudang IPSRS" is a
 * record of Inventory that is not on the site (checklist blocker 14).
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

qaTest('TC-APP026-001', TC_APP026_001);

qaTest('TC-APP026-002', TC_APP026_002);

qaTest('TC-APP026-003', TC_APP026_003);

qaTest('TC-APP026-004', TC_APP026_004);

qaTest('TC-APP026-005', TC_APP026_005);

qaTest('TC-APP026-006', TC_APP026_006);

qaTest('TC-APP026-007', TC_APP026_007);

qaTest('TC-APP026-008', TC_APP026_008);

qaTest('TC-APP026-009', TC_APP026_009);

qaTest('TC-APP026-010', TC_APP026_010);

qaTest('TC-APP026-011', TC_APP026_011);

qaTest('TC-APP026-012', TC_APP026_012);

qaTest('TC-APP026-013', TC_APP026_013);

for (const [id, route, heading] of ROUTES) {
  qaTest(id, async ({ page, qa }) => {
    await qa.step(1, () => screenOpens(page, route, heading, qa));
  });
}
