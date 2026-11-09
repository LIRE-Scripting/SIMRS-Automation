import { asOnSite } from '../../../lib/i18n';
import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder, isServerFailure, SERVER_FAILURE, toastMark } from '../../../lib/assertions';
import { todayWib } from '../../../lib/dates';
import { OtDeskPage, OtRequestsPage } from '../../../pages/ot/OtPages';
import { backToIndonesian, switchLanguage } from '../shared/language';
import { screenOpens } from '../shared/screen-opens';
import { act, procedure, request, toastsAfter } from './helpers';
import { SCREENS, TC_APP008_008, TC_APP008_035, TC_APP008_036, TC_APP008_037, TC_APP008_038, TC_APP008_039, TC_APP008_040, TC_APP008_041, TC_APP008_042, TC_APP008_043 } from './hub-desk-screens-cases';

/** The test cases are in hub-desk-screens-cases.ts (shared with the end-to-end chains). */

/**
 * 08-operation-theater.xlsx: hub and language (008), Dossiers, Billing
 * policy, Calendar, Pain and Surgical case (035 … 043), and the screen check
 * of every route (044 … 050).
 */

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

test.afterEach(async ({ page }) => {
  await backToIndonesian(page);
});

qaTest('TC-APP008-008', TC_APP008_008);

qaTest('TC-APP008-035', TC_APP008_035);

qaTest('TC-APP008-036', TC_APP008_036);

qaTest('TC-APP008-037', TC_APP008_037);

qaTest('TC-APP008-038', TC_APP008_038);

qaTest('TC-APP008-039', TC_APP008_039);

qaTest('TC-APP008-040', TC_APP008_040);

qaTest('TC-APP008-041', TC_APP008_041);

qaTest('TC-APP008-042', TC_APP008_042);

qaTest('TC-APP008-043', TC_APP008_043);

for (const [id, route, heading] of SCREENS) {
  qaTest(id, async ({ page, qa }) => {
    await qa.step(1, () => screenOpens(page, route, heading));
  });
}
