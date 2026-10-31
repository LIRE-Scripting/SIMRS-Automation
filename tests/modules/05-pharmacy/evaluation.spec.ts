import { qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark } from '../../../lib/assertions';
import { TC_APP005_003, TC_APP005_005, TC_APP005_006, TC_APP005_013, TC_APP005_018, TC_APP005_019, TC_APP005_035, TC_APP005_038, TC_APP005_039, TC_APP005_040, TC_APP005_043 } from './evaluation-cases';

/** The test cases are in evaluation-cases.ts (shared with the end-to-end chains). */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

qaTest('TC-APP005-003', TC_APP005_003);
qaTest('TC-APP005-005', TC_APP005_005);
qaTest('TC-APP005-006', TC_APP005_006);
qaTest('TC-APP005-013', TC_APP005_013);
qaTest('TC-APP005-018', TC_APP005_018);
qaTest('TC-APP005-019', TC_APP005_019);
qaTest('TC-APP005-035', TC_APP005_035);
qaTest('TC-APP005-038', TC_APP005_038);
qaTest('TC-APP005-039', TC_APP005_039);
qaTest('TC-APP005-040', TC_APP005_040);
qaTest('TC-APP005-043', TC_APP005_043);
