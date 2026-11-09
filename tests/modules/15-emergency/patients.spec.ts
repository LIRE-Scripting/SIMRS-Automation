import type { Locator } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { addDays, todayWib } from '../../../lib/dates';
import { registerPatient } from '../../../lib/ambulatory-data';
import { attach, encounter, Patients, pdf, WALKED_IN, walkInName } from './helpers';
import { asOnSite } from '../../../lib/i18n';
import { TC_APP015_031, TC_APP015_032, TC_APP015_033, TC_APP015_034, TC_APP015_035, TC_APP015_036, TC_APP015_037, TC_APP015_038, TC_APP015_040, TC_APP015_041, TC_APP015_042, TC_APP015_043, TC_APP015_044, TC_APP015_045, TC_APP015_049, TC_APP015_050, TC_APP015_051, TC_APP015_052 } from './patients-cases';

/** The test cases are in patients-cases.ts (shared with the end-to-end chains). */

/**
 * 15-emergency.xlsx, Emergency Patients (/emergency/patients). A "received,
 * open encounter of a test patient" is made with "Walk-in ER" (name with a
 * token). The service centre IGD has no beds and the branch has no
 * consultants, so bed and consultant steps cite checklist blocker 13 (set-up
 * missing on the branch); no emergency registration can be made either
 * (blocker 13 on Accident/Emergency Registration), so receiving a registration
 * is blocked too.
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

qaTest('TC-APP015-031', TC_APP015_031);

qaTest('TC-APP015-032', TC_APP015_032);

qaTest('TC-APP015-033', TC_APP015_033);

qaTest('TC-APP015-034', TC_APP015_034);

qaTest('TC-APP015-035', TC_APP015_035);

qaTest('TC-APP015-036', TC_APP015_036);

qaTest('TC-APP015-037', TC_APP015_037);

qaTest('TC-APP015-038', TC_APP015_038);

qaTest('TC-APP015-040', TC_APP015_040);

qaTest('TC-APP015-041', TC_APP015_041);

qaTest('TC-APP015-042', TC_APP015_042);

qaTest('TC-APP015-043', TC_APP015_043);

qaTest('TC-APP015-044', TC_APP015_044);

qaTest('TC-APP015-045', TC_APP015_045);

qaTest('TC-APP015-049', TC_APP015_049);

qaTest('TC-APP015-050', TC_APP015_050);

qaTest('TC-APP015-051', TC_APP015_051);

qaTest('TC-APP015-052', TC_APP015_052);
