import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark, SERVER_FAILURE } from '../../../lib/assertions';
import { OtDeskPage, OtRequestsPage } from '../../../pages/ot/OtPages';
import { act, cellsOf, dossier, full, procedure, request, toastsAfter } from './helpers';
import { TC_APP008_025, TC_APP008_026, TC_APP008_027, TC_APP008_028, TC_APP008_029, TC_APP008_030, TC_APP008_031, TC_APP008_032, TC_APP008_033, TC_APP008_034 } from './workflow-cases';

/** The test cases are in workflow-cases.ts (shared with the end-to-end chains). */

/**
 * 08-operation-theater.xlsx, the surgical case on a request: patient, room
 * and times, calendar, validate … complete, defer / resume / cancel, and the
 * dossier (025 … 034). Workflow clicks answer with the toast "Request
 * created" (seen 2026-10-15); the steps read the Status column instead.
 */

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

qaTest('TC-APP008-025', TC_APP008_025);

qaTest('TC-APP008-026', TC_APP008_026);

qaTest('TC-APP008-027', TC_APP008_027);

qaTest('TC-APP008-028', TC_APP008_028);

qaTest('TC-APP008-029', TC_APP008_029);

qaTest('TC-APP008-030', TC_APP008_030);

qaTest('TC-APP008-031', TC_APP008_031);

qaTest('TC-APP008-032', TC_APP008_032);

qaTest('TC-APP008-033', TC_APP008_033);

qaTest('TC-APP008-034', TC_APP008_034);
