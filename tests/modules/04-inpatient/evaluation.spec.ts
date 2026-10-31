import { qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark, toastsSince } from '../../../lib/assertions';
import { TC_APP004_014, TC_APP004_015, TC_APP004_016, TC_APP004_017, TC_APP004_022, TC_APP004_023, TC_APP004_024, TC_APP004_026, TC_APP004_033, TC_APP004_035, TC_APP004_038, TC_APP004_039, TC_APP004_040, TC_APP004_042, TC_APP004_045, TC_APP004_055, TC_APP004_053 } from './evaluation-cases';

/** The test cases are in evaluation-cases.ts (shared with the end-to-end chains). */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

qaTest('TC-APP004-014', TC_APP004_014);
qaTest('TC-APP004-015', TC_APP004_015);
qaTest('TC-APP004-016', TC_APP004_016);
qaTest('TC-APP004-017', TC_APP004_017);
qaTest('TC-APP004-022', TC_APP004_022);
qaTest('TC-APP004-023', TC_APP004_023);
qaTest('TC-APP004-024', TC_APP004_024);
qaTest('TC-APP004-026', TC_APP004_026);
qaTest('TC-APP004-033', TC_APP004_033);
qaTest('TC-APP004-035', TC_APP004_035);
qaTest('TC-APP004-038', TC_APP004_038);
qaTest('TC-APP004-039', TC_APP004_039);
qaTest('TC-APP004-040', TC_APP004_040);
qaTest('TC-APP004-042', TC_APP004_042);
qaTest('TC-APP004-045', TC_APP004_045);
qaTest('TC-APP004-055', TC_APP004_055);
qaTest('TC-APP004-053', TC_APP004_053);
