import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark } from '../../../lib/assertions';
import { screenOpens } from '../shared/screen-opens';
import { invalidFields, toastsAfter } from '../18-settings/helpers';
import { code, csv, made, master, TC_APP021_001 } from './cases';
import { SCREENS, TC_APP021_002, TC_APP021_003, TC_APP021_004, TC_APP021_027, TC_APP021_028, TC_APP021_031, TC_APP021_032, TC_APP021_033 } from './cssd-cases';

/** The test cases are in cssd-cases.ts (shared with the end-to-end chains). */

/**
 * 21-cssd.xlsx: the CSSD masters (autoclave, cycle, packing, indicator, test
 * name, result type), Pack Trace, the document lists, the hub and the screen
 * checks. Codes carry a token. The sterilization loop needs approvers (U5)
 * and stays fixme.
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

qaTest('TC-APP021-001', TC_APP021_001);

qaTest('TC-APP021-002', TC_APP021_002);

qaTest('TC-APP021-003', TC_APP021_003);

qaTest('TC-APP021-004', TC_APP021_004);

qaTest('TC-APP021-027', TC_APP021_027);

qaTest('TC-APP021-028', TC_APP021_028);

qaTest('TC-APP021-031', TC_APP021_031);

qaTest('TC-APP021-032', TC_APP021_032);

qaTest('TC-APP021-033', TC_APP021_033);

for (const [id, route, heading] of SCREENS) {
  qaTest(id, async ({ page, qa }) => {
    await qa.step(1, () => screenOpens(page, route, heading, qa));
  });
}
