import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark, SERVER_FAILURE } from '../../../lib/assertions';
import { OT } from '../../../lib/ot-data';
import { OtRequestsPage } from '../../../pages/ot/OtPages';
import { act, cellsOf, create, procedure, request, toastsAfter } from './helpers';
import { TC_APP008_002 } from './cases';
import { TC_APP008_001, TC_APP008_003, TC_APP008_004, TC_APP008_005, TC_APP008_009, TC_APP008_010, TC_APP008_012, TC_APP008_013, TC_APP008_014, TC_APP008_015, TC_APP008_017, TC_APP008_023 } from './requests-cases';

/** The test cases are in requests-cases.ts (shared with the end-to-end chains). */

/**
 * 08-operation-theater.xlsx, feature "OT requests (/ot/requests)": the
 * request, its blocked amount, Schedule and Consume. Every refusal seen on
 * 2026-10-15 is the toast "Minified React error #441" (a server error) instead
 * of a message; the steps check that nothing changed and record the text.
 */

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

qaTest('TC-APP008-001', TC_APP008_001);

qaTest('TC-APP008-002', TC_APP008_002);

qaTest('TC-APP008-003', TC_APP008_003);

qaTest('TC-APP008-004', TC_APP008_004);

qaTest('TC-APP008-005', TC_APP008_005);

qaTest('TC-APP008-009', TC_APP008_009);

qaTest('TC-APP008-010', TC_APP008_010);

qaTest('TC-APP008-012', TC_APP008_012);

qaTest('TC-APP008-013', TC_APP008_013);

qaTest('TC-APP008-014', TC_APP008_014);

qaTest('TC-APP008-015', TC_APP008_015);

qaTest('TC-APP008-017', TC_APP008_017);

qaTest('TC-APP008-023', TC_APP008_023);
