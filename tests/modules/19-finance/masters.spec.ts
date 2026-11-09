import type { Page } from '@playwright/test';
import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { addDays, todayWib } from '../../../lib/dates';
import { invalidFields } from '../18-settings/helpers';
import {
  Accounts,
  BR_A,
  PostingRules,
  Years,
  account,
  addMonths,
  clickFor,
  createAccount,
  ensureFyNext,
  restoreRule,
  retireAccount,
  ruleNow,
} from './helpers';
import { CAPITAL, category, centre, currencies, OPERATING, pickByPrefix, preAllocation, saveCurrency, saveRate, tariff, TC_APP019_001, TC_APP019_004, TC_APP019_007, TC_APP019_038, TC_APP019_040, TC_APP019_062, WITHDRAWAL } from './cases';
import { sourceOnSite } from '../../../lib/i18n';
import { NotOffered } from '../../../lib/not-offered';
import { TC_APP019_002, TC_APP019_003, TC_APP019_005, TC_APP019_006, TC_APP019_020, TC_APP019_021, TC_APP019_022, TC_APP019_023, TC_APP019_026, TC_APP019_035, TC_APP019_036, TC_APP019_037, TC_APP019_039, TC_APP019_041, TC_APP019_042, TC_APP019_043, TC_APP019_056, TC_APP019_057, TC_APP019_063 } from './masters-cases';

/** The test cases are in masters-cases.ts (shared with the end-to-end chains). */

/**
 * 19-finance.xlsx: financial years, chart of accounts, budget posting rules,
 * configuration, currencies, cost centres, account maps, tariff mapping and
 * bill adjustment. Accounts carry a token and are set inactive at the end of
 * their test; posting rules of BR-A are put back as they were.
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

qaTest('TC-APP019-001', TC_APP019_001);

qaTest('TC-APP019-002', TC_APP019_002);

qaTest('TC-APP019-003', TC_APP019_003);

qaTest('TC-APP019-004', TC_APP019_004);

qaTest('TC-APP019-005', TC_APP019_005);

qaTest('TC-APP019-006', TC_APP019_006);

qaTest('TC-APP019-007', TC_APP019_007);

qaTest('TC-APP019-020', TC_APP019_020);

qaTest('TC-APP019-021', TC_APP019_021);

qaTest('TC-APP019-022', TC_APP019_022);

qaTest('TC-APP019-023', TC_APP019_023);

qaTest('TC-APP019-026', TC_APP019_026);

qaTest('TC-APP019-035', TC_APP019_035);

qaTest('TC-APP019-036', TC_APP019_036);

qaTest('TC-APP019-037', TC_APP019_037);

qaTest('TC-APP019-038', TC_APP019_038);

qaTest('TC-APP019-039', TC_APP019_039);

qaTest('TC-APP019-040', TC_APP019_040);

qaTest('TC-APP019-041', TC_APP019_041);

qaTest('TC-APP019-042', TC_APP019_042);

qaTest('TC-APP019-043', TC_APP019_043);

qaTest('TC-APP019-056', TC_APP019_056);

qaTest('TC-APP019-057', TC_APP019_057);

qaTest('TC-APP019-062', TC_APP019_062);

qaTest('TC-APP019-063', TC_APP019_063);
