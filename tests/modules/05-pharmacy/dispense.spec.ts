import { registerNamesake } from '../../../lib/ambulatory-data';
import { asOnSite } from '../../../lib/i18n';
import type { Browser, Page } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark, toastsSince, SERVER_FAILURE } from '../../../lib/assertions';
import { PASSWORD } from '../../../lib/config';
import { addDays, todayWib } from '../../../lib/dates';
import { INVENTORY } from '../../../lib/inventory-data';
import { PHARMACY, PHARMACY_STORE, stockOf, total } from '../../../lib/pharmacy-data';
import { userLogin } from '../../../lib/qa-data';
import { AppHeader } from '../../../pages/AppHeader';
import { RegisteredPatientsPage } from '../../../pages/ambulatory/RegisteredPatientsPage';
import { AdmissionsPage, BedsPage } from '../../../pages/inpatient/InpatientPages';
import { ItemMasterPage } from '../../../pages/inventory/InventoryE2EPages';
import { LoginPage } from '../../../pages/LoginPage';
import { switchLanguage } from '../shared/language';
import { compact, DispenseWizard, typeAhead, IssueLinesPage } from '../../../pages/pharmacy/PharmacyE2EPages';
import { backToIndonesian, CONFIRMED, confirm, expectRefused, ownItem, patient, sell, stock, storeNote, toastsAfter, toConfirm, type Patient } from './helpers';
import { TC_APP005_007, TC_APP005_008, TC_APP005_009, TC_APP005_010, TC_APP005_011, TC_APP005_012, TC_APP005_015, TC_APP005_021, TC_APP005_026, TC_APP005_027, TC_APP005_028, TC_APP005_029, TC_APP005_030, TC_APP005_031, TC_APP005_032, TC_APP005_033, TC_APP005_034, TC_APP005_049, TC_APP005_050 } from './dispense-cases';

/** The test cases are in dispense-cases.ts (shared with the end-to-end chains). */

/**
 * 05-pharmacy.xlsx, feature "Dispense (/pharmacy/dispense)": counter sales.
 * PT-1 is registered per test; stock is received per test into the
 * stand-in store (helpers.ts).
 */

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

test.afterEach(async ({ page }) => {
  await backToIndonesian(page);
});

qaTest('TC-APP005-007', TC_APP005_007);

qaTest('TC-APP005-008', TC_APP005_008);

qaTest('TC-APP005-009', TC_APP005_009);

qaTest('TC-APP005-010', TC_APP005_010);

qaTest('TC-APP005-011', TC_APP005_011);

qaTest('TC-APP005-012', TC_APP005_012);

qaTest('TC-APP005-015', TC_APP005_015);

qaTest('TC-APP005-021', TC_APP005_021);

qaTest('TC-APP005-026', TC_APP005_026);

qaTest('TC-APP005-027', TC_APP005_027);

qaTest('TC-APP005-028', TC_APP005_028);

qaTest('TC-APP005-029', TC_APP005_029);

qaTest('TC-APP005-030', TC_APP005_030);

qaTest('TC-APP005-031', TC_APP005_031);

qaTest('TC-APP005-032', TC_APP005_032);

qaTest('TC-APP005-033', TC_APP005_033);

qaTest('TC-APP005-034', TC_APP005_034);

qaTest('TC-APP005-049', TC_APP005_049);

qaTest('TC-APP005-050', TC_APP005_050);
