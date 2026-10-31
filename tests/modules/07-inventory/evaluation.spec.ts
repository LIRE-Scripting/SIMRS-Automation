import { qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark } from '../../../lib/assertions';
import { ensureBloodbankDepartment } from '../../../lib/bloodbank-data';
import { authFileOf } from '../../../lib/config';
import { TC_APP007_008, TC_APP007_009, TC_APP007_017, TC_APP007_024, TC_APP007_027, TC_APP007_030, TC_APP007_038, TC_APP007_036 } from './evaluation-cases';

/** The test cases are in evaluation-cases.ts (shared with the end-to-end chains). */

test.use({ actionTimeout: 15_000 });

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage({ storageState: authFileOf('U1') });
  await ensureBloodbankDepartment(page);
  await page.close();
});

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

qaTest('TC-APP007-008', TC_APP007_008);
qaTest('TC-APP007-009', TC_APP007_009);
qaTest('TC-APP007-017', TC_APP007_017);
qaTest('TC-APP007-024', TC_APP007_024);
qaTest('TC-APP007-027', TC_APP007_027);
qaTest('TC-APP007-030', TC_APP007_030);
qaTest('TC-APP007-038', TC_APP007_038);
qaTest('TC-APP007-036', TC_APP007_036);
