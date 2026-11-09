import { asOnSite } from '../../../lib/i18n';
import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark } from '../../../lib/assertions';
import { PHARMACY } from '../../../lib/pharmacy-data';
import { DispenseWizard, OrdersPage } from '../../../pages/pharmacy/PharmacyE2EPages';
import { switchLanguage } from '../shared/language';
import { screenOpens } from '../shared/screen-opens';
import { backToIndonesian, CONFIRMED, outpatientOrder, patient, sell, stock, toastsAfter } from './helpers';
import { doseIds, recordDose, TC_APP005_063 } from './hub-cases';
import { SCREENS, TC_APP005_024, TC_APP005_022, TC_APP005_058, TC_APP005_059, TC_APP005_060, TC_APP005_061, TC_APP005_062, TC_APP005_064, TC_APP005_065 } from './hub-screens-cases';

/** The test cases are in hub-screens-cases.ts (shared with the end-to-end chains). */

/**
 * 05-pharmacy.xlsx: hub and language (022, 024), the desk screens Cost
 * estimate, Patient issues, Price and TPN and Dose record (058 … 065), and
 * the screen check of every route (066 … 075).
 */

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

test.afterEach(async ({ page }) => {
  await backToIndonesian(page);
});

qaTest('TC-APP005-024', TC_APP005_024);

qaTest('TC-APP005-022', TC_APP005_022);

qaTest('TC-APP005-058', TC_APP005_058);

qaTest('TC-APP005-059', TC_APP005_059);

qaTest('TC-APP005-060', TC_APP005_060);

qaTest('TC-APP005-061', TC_APP005_061);

qaTest('TC-APP005-062', TC_APP005_062);

qaTest('TC-APP005-063', TC_APP005_063);

qaTest('TC-APP005-064', TC_APP005_064);

qaTest('TC-APP005-065', TC_APP005_065);

for (const [id, route, heading] of SCREENS) {
  qaTest(id, async ({ page, qa }) => {
    await qa.step(1, () => screenOpens(page, route, heading));
  });
}
