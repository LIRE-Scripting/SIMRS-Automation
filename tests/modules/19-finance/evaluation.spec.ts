import { qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { toastMark } from '../../../lib/assertions';
import { TC_APP019_010, TC_APP019_016, TC_APP019_017, TC_APP019_019, TC_APP019_032, TC_APP019_034 } from './evaluation-cases';

/** The test cases are in evaluation-cases.ts (shared with the end-to-end chains). */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

qaTest('TC-APP019-010', TC_APP019_010);
qaTest('TC-APP019-016', TC_APP019_016);
qaTest('TC-APP019-017', TC_APP019_017);
qaTest('TC-APP019-019', TC_APP019_019);
qaTest('TC-APP019-032', TC_APP019_032);
qaTest('TC-APP019-034', TC_APP019_034);
