import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { scan } from '../../../lib/barcode';
import { todayWib } from '../../../lib/dates';
import { WorklistPage } from '../../../pages/lab/LabPages';
import { printPreview } from '../shared/print';
import { advance, order } from './helpers';
import { TC_APP011_002 } from './sample-label-cases';

/** The test cases are in sample-label-cases.ts (shared with the end-to-end chains). */

/**
 * 11-laboratory.xlsx, "Generating the sample and printing its label"
 * (TC-APP011-002), marked "Automation Candidate = No" (a printer and a barcode
 * reader) and run by simulation (lib/qa-data/plan.ts, SIMULATED): the print
 * preview is the page under the print media type, the scan is the barcode
 * read from its bars (lib/barcode.ts).
 */

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

qaTest('TC-APP011-002', TC_APP011_002);
