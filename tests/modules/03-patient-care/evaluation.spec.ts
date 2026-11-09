import type { Locator, Page } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { registerPatient, registerTwins } from '../../../lib/ambulatory-data';
import { installToastRecorder, toastLocator, toastMark, toastsSince } from '../../../lib/assertions';
import { CLINICAL, orderFor } from '../../../lib/clinical-data';
import { PASSWORD } from '../../../lib/config';
import { userLogin } from '../../../lib/qa-data';
import { AppHeader } from '../../../pages/AppHeader';
import { ConsultationPage } from '../../../pages/clinical/ConsultationPage';
import { LoginPage } from '../../../pages/LoginPage';
import { OrdersPage } from '../../../pages/pharmacy/PharmacyE2EPages';
import { signedOutJourney, userPage } from '../shared/access';
import { addLine, authorise, clicked, inpatientOrder, labFromConsultation, labOrder, newPt1, pharmacyRows, placeRestricted, remark, toastsAfter, type Patient } from './cases';
import { TC_APP003_002, TC_APP003_003, TC_APP003_004, TC_APP003_006, TC_APP003_007, TC_APP003_010, TC_APP003_019, TC_APP003_023, TC_APP003_025, TC_APP003_027, TC_APP003_028, TC_APP003_033, TC_APP003_034, TC_APP003_039, TC_APP003_041 } from './evaluation-cases';

/** The test cases are in evaluation-cases.ts (shared with the end-to-end chains). */

/**
 * 03-patient-care.xlsx, the journeys marked "Needs Evaluation" (automated
 * since 2026-10-29, open question Q10): orders from the consultation and what
 * the pharmacy and the laboratory see of them, restricted orders, double
 * submits, notes and the consultation without a session. "Doctor 2" is U4.
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

qaTest('TC-APP003-002', TC_APP003_002);

qaTest('TC-APP003-003', TC_APP003_003);

qaTest('TC-APP003-004', TC_APP003_004);

qaTest('TC-APP003-006', TC_APP003_006);

qaTest('TC-APP003-007', TC_APP003_007);

qaTest('TC-APP003-010', TC_APP003_010);

qaTest('TC-APP003-019', TC_APP003_019);

qaTest('TC-APP003-023', TC_APP003_023);

qaTest('TC-APP003-025', TC_APP003_025);

qaTest('TC-APP003-027', TC_APP003_027);

qaTest('TC-APP003-028', TC_APP003_028);

qaTest('TC-APP003-033', TC_APP003_033);

qaTest('TC-APP003-034', TC_APP003_034);

qaTest('TC-APP003-039', TC_APP003_039);

qaTest('TC-APP003-041', TC_APP003_041);
