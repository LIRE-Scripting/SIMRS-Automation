import { qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark } from '../../../lib/assertions';
import { counterClosed, ensureSettings, holds, newRxInvoice, rxInvoices, select } from '../14-hospital-accounts/helpers';
import { TC_APP005_014, TC_APP005_016, TC_APP005_036, TC_APP005_037, TC_APP005_041 } from './evaluation-cashier-cases';

/** The test cases are in evaluation-cashier-cases.ts (shared with the end-to-end chains). */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
  await ensureSettings(page);
  test.skip(await counterClosed(page), "The U1 cashier's counter is closed for today (TC-APP014-011 ran); no money can be taken until tomorrow");
});

qaTest('TC-APP005-014', TC_APP005_014);
qaTest('TC-APP005-016', TC_APP005_016);
qaTest('TC-APP005-036', TC_APP005_036);
qaTest('TC-APP005-037', TC_APP005_037);
qaTest('TC-APP005-041', TC_APP005_041);
