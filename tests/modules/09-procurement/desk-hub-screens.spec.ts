import { asOnSite } from '../../../lib/i18n';
import type { Page } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark, toastsSince } from '../../../lib/assertions';
import { addDays, todayWib } from '../../../lib/dates';
import { PHARMACY_STORE } from '../../../lib/pharmacy-data';
import { PurchaseOrdersPage, ProcurementDeskPage } from '../../../pages/procurement/ProcurementPages';
import { backToIndonesian, switchLanguage } from '../shared/language';
import { screenOpens } from '../shared/screen-opens';
import { sourceOnSite } from '../../../lib/i18n';
import { SEED_SUPPLIER } from './cases';
import { SCREENS, TC_APP009_011, TC_APP009_013, TC_APP009_037, TC_APP009_038, TC_APP009_046, TC_APP009_047, TC_APP009_048, TC_APP009_049, TC_APP009_050, TC_APP009_051, TC_APP009_052 } from './desk-hub-screens-cases';

/** The test cases are in desk-hub-screens-cases.ts (shared with the end-to-end chains). */

/**
 * 09-procurement.xlsx: hub and language (011, 013), Suppliers and requests
 * (037, 038), Receipts and returns (046 … 052) and the screen check of every
 * route (054 … 059). Refusals seen on 2026-10-15 are the toast "Minified
 * React error #441"; the steps check that nothing was saved and record it.
 */

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

test.afterEach(async ({ page }) => {
  await backToIndonesian(page);
});

qaTest('TC-APP009-011', TC_APP009_011);

qaTest('TC-APP009-013', TC_APP009_013);

qaTest('TC-APP009-037', TC_APP009_037);

qaTest('TC-APP009-038', TC_APP009_038);

qaTest('TC-APP009-046', TC_APP009_046);

qaTest('TC-APP009-047', TC_APP009_047);

qaTest('TC-APP009-048', TC_APP009_048);

qaTest('TC-APP009-049', TC_APP009_049);

qaTest('TC-APP009-050', TC_APP009_050);

qaTest('TC-APP009-051', TC_APP009_051);

qaTest('TC-APP009-052', TC_APP009_052);

for (const [id, route, heading] of SCREENS) {
  qaTest(id, async ({ page, qa }) => {
    await qa.step(1, () => screenOpens(page, route, heading, qa));
  });
}
