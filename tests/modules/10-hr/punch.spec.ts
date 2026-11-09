import { addDays, todayWib } from '../../../lib/dates';
import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { userPage } from '../shared/access';
import { Desk, SAVED } from '../shared/desk';
import { TC_APP010_049, TC_APP010_050, TC_APP010_051 } from './punch-cases';

/** The test cases are in punch-cases.ts (shared with the end-to-end chains). */

/**
 * 10-hr.xlsx, HR desk, Punch (journey JRN-APP010-044). The user must be linked
 * to an employee: U7 (qa.pegawai, linked to X-EMP-QA-PEGAWAI). Checklist blocker
 * 13 ("Punch refuses a user who is not linked") was seen resolved for U7 on
 * 2026-11-01. The user who is not linked is U4 (qa.admin3).
 */

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

qaTest('TC-APP010-049', TC_APP010_049);

qaTest('TC-APP010-050', TC_APP010_050);

qaTest('TC-APP010-051', TC_APP010_051);
