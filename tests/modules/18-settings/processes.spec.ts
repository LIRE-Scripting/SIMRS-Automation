import { qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { TC_APP018_054, TC_APP018_055 } from './process-cases';

/**
 * 18-settings.xlsx, Process definitions (/workflow/process-definitions). A
 * chain applies to every user of the hospital: each test puts the purchase
 * order chain back as it found it (process-cases.ts).
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

qaTest('TC-APP018-054', async ({ page, qa }) => {
  await TC_APP018_054({ page, qa });
});

qaTest('TC-APP018-055', ({ page, qa }) => TC_APP018_055({ page, qa }));
