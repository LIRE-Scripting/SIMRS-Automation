import { asOnSite } from '../../../lib/i18n';
import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder, SERVER_FAILURE } from '../../../lib/assertions';
import { SampleWorkflowPage, WorklistPage } from '../../../pages/lab/LabPages';
import { backToIndonesian, switchLanguage } from '../shared/language';
import { screenOpens } from '../shared/screen-opens';
import { catalogue, cellsOf, certified, labelOf, order, press, qc, resulted, work } from './helpers';
import { SCREENS, TC_APP011_010, TC_APP011_030, TC_APP011_031, TC_APP011_032, TC_APP011_033, TC_APP011_034, TC_APP011_035, TC_APP011_036, TC_APP011_037, TC_APP011_038, TC_APP011_039, TC_APP011_040, TC_APP011_041, TC_APP011_042, TC_APP011_043, TC_APP011_046 } from './work-catalogue-screens-cases';

/** The test cases are in work-catalogue-screens-cases.ts (shared with the end-to-end chains). */

/**
 * 11-laboratory.xlsx: hub and language (010), Specimens and tests (030 … 032),
 * Sample workflow (033 … 043), BMHP (046) and the screen check of every route
 * (047 … 051). The Sample workflow lists the ten newest orders by their sample
 * ID (or the first 8 characters of the order id); each test picks its own.
 */

// A step that waits for a missing element fails after 15 s instead of at the 6-minute test timeout.
test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

test.afterEach(async ({ page }) => {
  await backToIndonesian(page);
});

qaTest('TC-APP011-010', TC_APP011_010);

qaTest('TC-APP011-030', TC_APP011_030);

qaTest('TC-APP011-031', TC_APP011_031);

qaTest('TC-APP011-032', TC_APP011_032);

qaTest('TC-APP011-033', TC_APP011_033);

qaTest('TC-APP011-034', TC_APP011_034);

qaTest('TC-APP011-035', TC_APP011_035);

qaTest('TC-APP011-036', TC_APP011_036);

qaTest('TC-APP011-037', TC_APP011_037);

qaTest('TC-APP011-038', TC_APP011_038);

qaTest('TC-APP011-039', TC_APP011_039);

qaTest('TC-APP011-040', TC_APP011_040);

qaTest('TC-APP011-041', TC_APP011_041);

qaTest('TC-APP011-042', TC_APP011_042);

qaTest('TC-APP011-043', TC_APP011_043);

qaTest('TC-APP011-046', TC_APP011_046);

for (const [id, route, heading] of SCREENS) {
  qaTest(id, async ({ page, qa }) => {
    await qa.step(1, () => screenOpens(page, route, heading, qa));
  });
}
