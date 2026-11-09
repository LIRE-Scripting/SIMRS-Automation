import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { PHARMACY } from '../../../lib/pharmacy-data';
import { stock } from '../05-pharmacy/helpers';
import { CssdForm, refusedWith, stockByStore, STORES } from './docs';
import { TC_APP021_008, TC_APP021_009, TC_APP021_010, TC_APP021_011 } from './requests-cases';

/** The test cases are in requests-cases.ts (shared with the end-to-end chains). */

/**
 * 21-cssd.xlsx, Sterile Request (/cssd/requests): a ward sends a set and an
 * item to CSSD. The item is QA-PARA of 05 Pharmacy, received by the test
 * into the requesting store (FI01-00-00, the stand-in of "X Gudang OK").
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

qaTest('TC-APP021-008', TC_APP021_008);

qaTest('TC-APP021-009', TC_APP021_009);

qaTest('TC-APP021-010', TC_APP021_010);

qaTest('TC-APP021-011', TC_APP021_011);
