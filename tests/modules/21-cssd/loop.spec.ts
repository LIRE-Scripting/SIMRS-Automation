import { todayWib } from '../../../lib/dates';
import { ensurePassedBowieDick } from './cases';
import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { PHARMACY } from '../../../lib/pharmacy-data';
import { stock } from '../05-pharmacy/helpers';
import { rowCount, screenRefuses, userPage } from '../shared/access';
import { approvedReceipt, approvedRequest, CssdForm, refusedWith } from './docs';
import { TC_APP021_024, TC_APP021_025, TC_APP021_026, TC_APP021_029, TC_APP021_030, TC_APP021_034 } from './loop-cases';

/** The test cases are in loop-cases.ts (shared with the end-to-end chains). */

/**
 * 21-cssd.xlsx, the ward's Sterile Receipt (/cssd/sterile-receipts), the
 * whole loop of a set and the CSSD rights. A sterile receipt converts an
 * approved sterile issue, and the new sterile issue page answers HTTP 500
 * (blocker 3): no issue waits to be received, so the receipt steps and the
 * end of the loop are blocked by 3. The loop also needs a sterilized load,
 * which needs a Bowie Dick test of today (blocker 13).
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  // A saved unsterile receipt stalls the site for minutes when it is opened (found blocker 48).
  test.setTimeout(900_000);
  await installToastRecorder(page);
  // The first cycle of the default autoclave today waits for a passed Bowie Dick test (blocker 13 until 2026-11-01).
  await ensurePassedBowieDick(page, todayWib());
});

qaTest('TC-APP021-024', TC_APP021_024);

qaTest('TC-APP021-025', TC_APP021_025);

qaTest('TC-APP021-026', TC_APP021_026);

qaTest('TC-APP021-029', TC_APP021_029);

qaTest('TC-APP021-030', TC_APP021_030);

qaTest('TC-APP021-034', TC_APP021_034);
