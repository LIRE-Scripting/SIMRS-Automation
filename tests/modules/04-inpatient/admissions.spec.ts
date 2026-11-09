import type { Page } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder, toastLocator, toastMark, toastsSince } from '../../../lib/assertions';
import { AdmissionsPage, BedsPage, DischargesPage } from '../../../pages/inpatient/InpatientPages';
import { NotOffered } from '../../../lib/not-offered';
import { asOnSite } from '../../../lib/i18n';
import { TC_APP004_001, TC_APP004_002, TC_APP004_003, TC_APP004_028, TC_APP004_029, TC_APP004_079, TC_APP004_080, TC_APP004_081, TC_APP004_004, TC_APP004_005, TC_APP004_006, TC_APP004_007, TC_APP004_008, TC_APP004_010, TC_APP004_011, TC_APP004_012, TC_APP004_013, TC_APP004_021, TC_APP004_025, TC_APP004_027, TC_APP004_030, TC_APP004_031, TC_APP004_032, TC_APP004_034, TC_APP004_037, TC_APP004_043, TC_APP004_054 } from './admissions-cases';

/** The test cases are in admissions-cases.ts (shared with the end-to-end chains). */

/**
 * 04-inpatient.xlsx, features "Bed management (/adt/beds)", "Admissions
 * (/adt/admissions)" and "Discharges (/adt/discharges)".
 *
 * Beds and stays cannot be deleted on the site, so every test adds its own
 * beds (QA-101 -> "QA-101-<token>", description "QA Kelas 1") and admits its
 * own patients ("QA-INP Pasien Satu" -> "QA-INP Pasien Satu <token>"). The
 * stay's patient is free text on this screen (TC-APP004-021).
 */

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

qaTest('TC-APP004-001', TC_APP004_001);

qaTest('TC-APP004-002', TC_APP004_002);

qaTest('TC-APP004-003', TC_APP004_003);

qaTest('TC-APP004-028', TC_APP004_028);

qaTest('TC-APP004-029', TC_APP004_029);

qaTest('TC-APP004-079', TC_APP004_079);

qaTest('TC-APP004-080', TC_APP004_080);

qaTest('TC-APP004-081', TC_APP004_081);

qaTest('TC-APP004-004', TC_APP004_004);

qaTest('TC-APP004-005', TC_APP004_005);

qaTest('TC-APP004-006', TC_APP004_006);

qaTest('TC-APP004-007', TC_APP004_007);

qaTest('TC-APP004-008', TC_APP004_008);

qaTest('TC-APP004-010', TC_APP004_010);

qaTest('TC-APP004-011', TC_APP004_011);

qaTest('TC-APP004-012', TC_APP004_012);

qaTest('TC-APP004-013', TC_APP004_013);

qaTest('TC-APP004-021', TC_APP004_021);

qaTest('TC-APP004-025', TC_APP004_025);

qaTest('TC-APP004-027', TC_APP004_027);

qaTest('TC-APP004-030', TC_APP004_030);

qaTest('TC-APP004-031', TC_APP004_031);

qaTest('TC-APP004-032', TC_APP004_032);

qaTest('TC-APP004-034', TC_APP004_034);

qaTest('TC-APP004-037', TC_APP004_037);

qaTest('TC-APP004-043', TC_APP004_043);

qaTest('TC-APP004-054', TC_APP004_054);
