import { PurchaseOrdersPage } from '../../../pages/procurement/ProcurementPages';
import type { Page } from '@playwright/test';
import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { addDays, todayWib } from '../../../lib/dates';
import { HR } from '../../../lib/hr-data';
import { screenOpens } from '../shared/screen-opens';
import { invalidFields } from '../18-settings/helpers';
import { addMonths } from '../19-finance/helpers';
import { payrollEmployee } from '../17-payroll/helpers';
import { addToChart, book, books, chart, chartRow, choose, deactivate, head, heads, Master, projects, TC_APP020_001, TC_APP020_003, TC_APP020_005, TC_APP020_013, TC_APP020_015, TC_APP020_019, YEAR } from './cases';
import { asOnSite, sourceOnSite } from '../../../lib/i18n';
import { SCREENS, TC_APP020_002, TC_APP020_004, TC_APP020_007, TC_APP020_008, TC_APP020_009, TC_APP020_010, TC_APP020_011, TC_APP020_012, TC_APP020_006, TC_APP020_042 } from './budget-cases';

/** The test cases are in budget-cases.ts (shared with the end-to-end chains). */

/**
 * 20-budget.xlsx: the masters (books, heads, chart, utilisation types,
 * projects, sanction checklist) and the screen checks. Codes and names carry
 * a token. The default book of the tenant is never moved: steps that would
 * make a test book the default are only run when another book already is.
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

qaTest('TC-APP020-001', TC_APP020_001);

qaTest('TC-APP020-002', TC_APP020_002);

qaTest('TC-APP020-003', TC_APP020_003);

qaTest('TC-APP020-004', TC_APP020_004);

qaTest('TC-APP020-007', TC_APP020_007);

qaTest('TC-APP020-008', TC_APP020_008);

qaTest('TC-APP020-009', TC_APP020_009);

qaTest('TC-APP020-010', TC_APP020_010);

qaTest('TC-APP020-011', TC_APP020_011);

qaTest('TC-APP020-012', TC_APP020_012);

qaTest('TC-APP020-005', TC_APP020_005);

// Declared through a wrapper: qaTest passes testInfo as the second argument, the chain passes its book there.
qaTest('TC-APP020-013', ({ page, qa }) => TC_APP020_013({ page, qa }));

qaTest('TC-APP020-015', async ({ page, qa }) => {
  await TC_APP020_015({ page, qa });
});

qaTest('TC-APP020-019', ({ page, qa }) => TC_APP020_019({ page, qa }));

qaTest('TC-APP020-006', TC_APP020_006);

qaTest('TC-APP020-042', TC_APP020_042);

for (const [id, route, heading] of SCREENS) {
  qaTest(id, async ({ page, qa }) => {
    await qa.step(1, () => screenOpens(page, route, heading, qa));
  });
}
