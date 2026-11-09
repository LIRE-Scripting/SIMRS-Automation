import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { PHARMACY } from '../../../lib/pharmacy-data';
import type { Page } from '@playwright/test';
import { stock } from '../05-pharmacy/helpers';
import { approvedRequest, conversionLines, convertFrom, CssdForm, openSaved, refusedWith, STORES } from './docs';
import { TC_APP021_012, TC_APP021_013, TC_APP021_014 } from './receipts-cases';

/** The test cases are in receipts-cases.ts (shared with the end-to-end chains). */

/**
 * 21-cssd.xlsx, Unsterile Receipt (/cssd/receipts): CSSD takes in what an
 * approved sterile request of the test sent to the transit store.
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  // A saved unsterile receipt stalls the site for minutes when it is opened (found blocker 48).
  test.setTimeout(900_000);
  await installToastRecorder(page);
});

qaTest('TC-APP021-012', TC_APP021_012);

qaTest('TC-APP021-013', TC_APP021_013);

qaTest('TC-APP021-014', TC_APP021_014);
