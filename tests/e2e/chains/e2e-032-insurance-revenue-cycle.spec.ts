import { chainTest, expect } from '../../../fixtures/chain';
import { installToastRecorder } from '../../../lib/assertions';
import { TC_APP014_003, TC_APP014_053, TC_APP014_057, TC_APP014_061 } from '../../modules/14-hospital-accounts/cases';
import { TC_APP019_062 } from '../../modules/19-finance/cases';
import { counterClosed, ensureSettings } from '../../modules/14-hospital-accounts/helpers';
import { TC_APP014_017 } from '../../modules/14-hospital-accounts/cashier-cases';
import { TC_APP018_047 } from '../../modules/18-settings/identity-cases';

/**
 * E2E-032: Insurance revenue cycle. Each step runs its source test case (tests/modules/<NN-module>/cases.ts)
 * with its own records: 1. Patient plan and eligibility check; 2. Tariff group and service price; 3. Tariff mapped to accounts; 4. Deposit taken; 5. Inpatient service billed on the ledger. The chain stops at the first step a blocker stops; the cause is recorded by the run.
 */
chainTest('E2E-032', async ({ page, chain }) => {
  await installToastRecorder(page);
  // As the cashier spec does before each test: the counter settings of the workbook, and an open cashier day.
  await ensureSettings(page);
  expect(await counterClosed(page), "the U1 cashier's day is open").toBe(false);
  await chain.step(1, (qa) => TC_APP014_057({ page, qa }));
  await chain.step(2, (qa) => TC_APP014_053({ page, qa }));
  await chain.step(3, (qa) => TC_APP019_062({ page, qa }));
  await chain.step(4, (qa) => TC_APP014_003({ page, qa }));
  await chain.step(5, (qa) => TC_APP014_061({ page, qa }));
  await chain.run(6, TC_APP014_017);
  await chain.run(7, TC_APP018_047);
  chain.stopAsPlanned(8);
});
