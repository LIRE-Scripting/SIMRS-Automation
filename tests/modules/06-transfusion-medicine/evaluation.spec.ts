import type { Locator, Page } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder, isServerFailure } from '../../../lib/assertions';
import { ensureBloodbankDepartment } from '../../../lib/bloodbank-data';
import { authFileOf } from '../../../lib/config';
import { addDays, todayWib } from '../../../lib/dates';
import { RequestsPage, StockPage } from '../../../pages/bloodbank/BloodBankPages';
import { userPage } from '../shared/access';
import { NO_UNIT, openRequest, save, savedRequest } from './cases';
import { TC_APP006_013, TC_APP006_014, TC_APP006_015, TC_APP006_021, TC_APP006_026, TC_APP006_044, TC_APP006_045, TC_APP006_046, TC_APP006_047, TC_APP006_048, TC_APP006_053, TC_APP006_054, TC_APP006_061 } from './evaluation-cases';

/** The test cases are in evaluation-cases.ts (shared with the end-to-end chains). */

/**
 * 06-transfusion-medicine.xlsx, the journeys marked "Needs Evaluation"
 * (automated since 2026-10-29, open question Q10). A collected bag is made
 * on Donors, which answers HTTP 500 (checklist blocker 2), and the group
 * chart cannot be saved (found blocker 25), so the Group dialog has no
 * reaction field. The dialogs are opened on a plain intake bag of the test
 * (the only bag that can be made); the steps on a collected, grouped or
 * screened bag are blocked by 2, those on the chart or on an approval that
 * answers HTTP 500 by 25. "Tech 2" and "Doctor" are U4 (qa.admin3).
 */

test.use({ actionTimeout: 15_000 });

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage({ storageState: authFileOf('U1') });
  await ensureBloodbankDepartment(page);
  await page.close();
});

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

qaTest('TC-APP006-013', TC_APP006_013);

qaTest('TC-APP006-014', TC_APP006_014);

qaTest('TC-APP006-015', TC_APP006_015);

qaTest('TC-APP006-021', TC_APP006_021);

qaTest('TC-APP006-026', TC_APP006_026);

qaTest('TC-APP006-044', TC_APP006_044);

qaTest('TC-APP006-045', TC_APP006_045);

qaTest('TC-APP006-046', TC_APP006_046);

qaTest('TC-APP006-047', TC_APP006_047);

qaTest('TC-APP006-048', TC_APP006_048);

qaTest('TC-APP006-053', TC_APP006_053);

qaTest('TC-APP006-054', TC_APP006_054);

qaTest('TC-APP006-061', TC_APP006_061);
