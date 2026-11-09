import type { Browser, Locator, Page } from '@playwright/test';
import { expect, qaTest, test } from '../../../fixtures/e2e';
import { registerPatient } from '../../../lib/ambulatory-data';
import { installToastRecorder, toastLocator, toastMark, toastsSince } from '../../../lib/assertions';
import { CLINICAL, orderFor, PT1_DATE_OF_BIRTH } from '../../../lib/clinical-data';
import { authFileOf, PASSWORD } from '../../../lib/config';
import { userLogin } from '../../../lib/qa-data';
import { ConsultationPage } from '../../../pages/clinical/ConsultationPage';
import { LoginPage } from '../../../pages/LoginPage';
import { addLine, newPt1, Patient, TC_APP003_005 } from './cases';
import { TC_APP003_001, TC_APP003_008, TC_APP003_009, TC_APP003_011, TC_APP003_015, TC_APP003_016, TC_APP003_017, TC_APP003_018, TC_APP003_020, TC_APP003_021, TC_APP003_022, TC_APP003_024, TC_APP003_026, TC_APP003_029, TC_APP003_030, TC_APP003_031, TC_APP003_032, TC_APP003_040, TC_APP003_046, TC_APP003_047, TC_APP003_048, TC_APP003_049, TC_APP003_050, TC_APP003_051 } from './consultation-cases';

/** The test cases are in consultation-cases.ts (shared with the end-to-end chains). */

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

qaTest('TC-APP003-001', TC_APP003_001);

qaTest('TC-APP003-005', TC_APP003_005);

qaTest('TC-APP003-008', TC_APP003_008);

qaTest('TC-APP003-009', TC_APP003_009);

qaTest('TC-APP003-011', TC_APP003_011);

qaTest('TC-APP003-015', TC_APP003_015);

qaTest('TC-APP003-016', TC_APP003_016);

qaTest('TC-APP003-017', TC_APP003_017);

qaTest('TC-APP003-018', TC_APP003_018);

qaTest('TC-APP003-020', TC_APP003_020);

qaTest('TC-APP003-021', TC_APP003_021);

qaTest('TC-APP003-022', TC_APP003_022);

qaTest('TC-APP003-024', TC_APP003_024);

qaTest('TC-APP003-026', TC_APP003_026);

qaTest('TC-APP003-029', TC_APP003_029);

qaTest('TC-APP003-030', TC_APP003_030);

qaTest('TC-APP003-031', TC_APP003_031);

qaTest('TC-APP003-032', TC_APP003_032);

qaTest('TC-APP003-040', TC_APP003_040);

qaTest('TC-APP003-046', TC_APP003_046);

qaTest('TC-APP003-047', TC_APP003_047);

qaTest('TC-APP003-048', TC_APP003_048);

qaTest('TC-APP003-049', TC_APP003_049);

qaTest('TC-APP003-050', TC_APP003_050);

qaTest('TC-APP003-051', TC_APP003_051);
