import { chainTest } from '../../../fixtures/chain';
import { installToastRecorder } from '../../../lib/assertions';
import { TC_APP019_001, TC_APP019_004, TC_APP019_038, TC_APP019_040 } from '../../modules/19-finance/cases';
import { TC_APP019_035, TC_APP019_042 } from '../../modules/19-finance/masters-cases';
import { TC_APP019_050, TC_APP019_052 } from '../../modules/19-finance/documents-cases';
import { TC_APP019_044 } from '../../modules/19-finance/journals-cases';
import { TC_APP019_064 } from '../../modules/19-finance/treasury-cases';

/**
 * E2E-041: Finance record-to-report. Each step runs its source test case (tests/modules/<NN-module>/cases.ts)
 * with its own records: 1. Financial year; 2. Chart of accounts; 3. Currencies and rates; 4. Cost centres. The chain stops at the first step a blocker stops; the cause is recorded by the run.
 */
chainTest('E2E-041', async ({ page, chain }) => {
  await installToastRecorder(page);
  await chain.step(1, (qa) => TC_APP019_001({ page, qa }));
  await chain.step(2, (qa) => TC_APP019_004({ page, qa }));
  await chain.step(3, (qa) => TC_APP019_038({ page, qa }));
  await chain.step(4, (qa) => TC_APP019_040({ page, qa }));
  await chain.run(5, TC_APP019_042);
  await chain.run(6, TC_APP019_035);
  await chain.run(7, TC_APP019_052);
  await chain.run(8, TC_APP019_044);
  await chain.run(9, TC_APP019_050);
  await chain.run(10, TC_APP019_064);
  chain.stopAsPlanned(11);
});
