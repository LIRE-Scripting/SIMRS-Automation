import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark } from '../../../lib/assertions';
import { todayWib } from '../../../lib/dates';
import { LAB } from '../../../lib/lab-data';
import { WorklistPage } from '../../../pages/lab/LabPages';
import { advance, capture, cellsOf, create, labType, order, resulted, toastsAfter } from './helpers';
import { escapeText, sourceOnSite } from '../../../lib/i18n';
import { TC_APP011_001, TC_APP011_003, TC_APP011_004, TC_APP011_005, TC_APP011_006, TC_APP011_013, TC_APP011_014, TC_APP011_015, TC_APP011_016, TC_APP011_017, TC_APP011_019, TC_APP011_020, TC_APP011_022, TC_APP011_029, TC_APP011_044, TC_APP011_045 } from './worklist-cases';

/** The test cases are in worklist-cases.ts (shared with the end-to-end chains). */

/** 11-laboratory.xlsx, feature "Lab order worklist (/laboratory/orders)". Orders are made per test. */

// A step that waits for a missing element fails after 15 s instead of at the 6-minute test timeout.
test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

qaTest('TC-APP011-001', TC_APP011_001);

qaTest('TC-APP011-003', TC_APP011_003);

qaTest('TC-APP011-004', TC_APP011_004);

qaTest('TC-APP011-005', TC_APP011_005);

qaTest('TC-APP011-006', TC_APP011_006);

qaTest('TC-APP011-013', TC_APP011_013);

qaTest('TC-APP011-014', TC_APP011_014);

qaTest('TC-APP011-015', TC_APP011_015);

qaTest('TC-APP011-016', TC_APP011_016);

qaTest('TC-APP011-017', TC_APP011_017);

qaTest('TC-APP011-019', TC_APP011_019);

qaTest('TC-APP011-020', TC_APP011_020);

qaTest('TC-APP011-022', TC_APP011_022);

qaTest('TC-APP011-029', TC_APP011_029);

qaTest('TC-APP011-044', TC_APP011_044);

qaTest('TC-APP011-045', TC_APP011_045);
