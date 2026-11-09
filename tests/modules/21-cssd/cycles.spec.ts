import { ensurePassedBowieDick } from './cases';
import type { Locator, Page } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { addDays, todayWib } from '../../../lib/dates';
import { PHARMACY } from '../../../lib/pharmacy-data';
import { stock } from '../05-pharmacy/helpers';
import { approvedReceipt, CycleForm, STORES } from './docs';
import { TC_APP021_017, TC_APP021_018, TC_APP021_019, TC_APP021_020 } from './cycles-cases';

/** The test cases are in cycles-cases.ts (shared with the end-to-end chains). */

/**
 * 21-cssd.xlsx, Sterilization Cycle (/cssd/cycles): a load of the unsterile
 * packs of an approved receipt of the test, its quality check and the
 * approval. The first cycle of an autoclave on a day needs a passed Bowie
 * Dick test, saved since 2026-11-01 (tests/modules/21-cssd/cases.ts,
 * ensurePassedBowieDick). A cycle still needs the unsterile packs of an approved
 * receipt, and a saved receipt does not open (found blocker 48).
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  // A saved unsterile receipt stalls the site for minutes when it is opened (found blocker 48).
  test.setTimeout(900_000);
  await installToastRecorder(page);
  // The first cycle of the default autoclave today waits for a passed Bowie Dick test (blocker 13 until 2026-11-01).
  await ensurePassedBowieDick(page, todayWib());
});

qaTest('TC-APP021-017', TC_APP021_017);

qaTest('TC-APP021-018', TC_APP021_018);

qaTest('TC-APP021-019', TC_APP021_019);

qaTest('TC-APP021-020', TC_APP021_020);
