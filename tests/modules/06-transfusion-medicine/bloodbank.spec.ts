import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { registerPatient } from '../../../lib/ambulatory-data';
import { installToastRecorder, isServerFailure, toastMark } from '../../../lib/assertions';
import { BLOODBANK, ensureBloodbankDepartment } from '../../../lib/bloodbank-data';
import { authFileOf } from '../../../lib/config';
import { addDays, todayWib } from '../../../lib/dates';
import { QcPage, RequestsPage, StockPage } from '../../../pages/bloodbank/BloodBankPages';
import { NO_UNIT, save, savedRequest, TC_APP006_020, TC_APP006_022, toastsAfter } from './cases';
import { TC_APP006_012, TC_APP006_016, TC_APP006_017, TC_APP006_018, TC_APP006_019, TC_APP006_023, TC_APP006_024, TC_APP006_025, TC_APP006_027, TC_APP006_041, TC_APP006_042, TC_APP006_043, TC_APP006_049, TC_APP006_050, TC_APP006_051, TC_APP006_052, TC_APP006_055, TC_APP006_056, TC_APP006_057, TC_APP006_058, TC_APP006_059, TC_APP006_060, TC_APP006_029, TC_APP006_062, TC_APP006_072 } from './bloodbank-cases';

/** The test cases are in bloodbank-cases.ts (shared with the end-to-end chains). */

/**
 * 06-transfusion-medicine.xlsx, Stock, Blood request and Quality control.
 *
 * A bag gets a number on Donors, which answers HTTP 500 (checklist blocker
 * 2), and a unit becomes "Available" only after a group and serology that a
 * second user must authorise (U4, not prepared). So no screened unit can be
 * made: every step that needs one (UNIT-1, UNIT-2, UNIT-F of the catalogue),
 * a collected bag or an issued unit is marked blocked by blocker 2. Units
 * made here (external receipt, plain intake) get bag numbers with the run's
 * token.
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

qaTest('TC-APP006-012', TC_APP006_012);

qaTest('TC-APP006-016', TC_APP006_016);

qaTest('TC-APP006-017', TC_APP006_017);

qaTest('TC-APP006-018', TC_APP006_018);

qaTest('TC-APP006-019', TC_APP006_019);

// --------------------------------------------------------------- requests

qaTest('TC-APP006-020', TC_APP006_020);

qaTest('TC-APP006-022', TC_APP006_022);

qaTest('TC-APP006-023', TC_APP006_023);

qaTest('TC-APP006-024', TC_APP006_024);

qaTest('TC-APP006-025', TC_APP006_025);

qaTest('TC-APP006-027', TC_APP006_027);

qaTest('TC-APP006-041', TC_APP006_041);

qaTest('TC-APP006-042', TC_APP006_042);

qaTest('TC-APP006-043', TC_APP006_043);

qaTest('TC-APP006-049', TC_APP006_049);

qaTest('TC-APP006-050', TC_APP006_050);

qaTest('TC-APP006-051', TC_APP006_051);

qaTest('TC-APP006-052', TC_APP006_052);

qaTest('TC-APP006-055', TC_APP006_055);

qaTest('TC-APP006-056', TC_APP006_056);

qaTest('TC-APP006-057', TC_APP006_057);

qaTest('TC-APP006-058', TC_APP006_058);

qaTest('TC-APP006-059', TC_APP006_059);

qaTest('TC-APP006-060', TC_APP006_060);

qaTest('TC-APP006-029', TC_APP006_029);

qaTest('TC-APP006-062', TC_APP006_062);

qaTest('TC-APP006-072', TC_APP006_072);
