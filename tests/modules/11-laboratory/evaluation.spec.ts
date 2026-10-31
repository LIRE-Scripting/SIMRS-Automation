import { qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark } from '../../../lib/assertions';
import { TC_APP011_007, TC_APP011_011, TC_APP011_012, TC_APP011_018, TC_APP011_021, TC_APP011_023, TC_APP011_028 } from './evaluation-cases';

/** The test cases are in evaluation-cases.ts (shared with the end-to-end chains). */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

qaTest('TC-APP011-007', TC_APP011_007);
qaTest('TC-APP011-011', TC_APP011_011);
qaTest('TC-APP011-012', TC_APP011_012);
qaTest('TC-APP011-018', TC_APP011_018);
qaTest('TC-APP011-021', TC_APP011_021);
qaTest('TC-APP011-023', TC_APP011_023);
qaTest('TC-APP011-028', TC_APP011_028);
