import { chainTest } from '../../../fixtures/chain';
import { installToastRecorder } from '../../../lib/assertions';
import { TC_APP021_001 } from '../../modules/21-cssd/cases';
import { TC_APP021_008 } from '../../modules/21-cssd/requests-cases';
import { TC_APP021_012 } from '../../modules/21-cssd/receipts-cases';
import { TC_APP021_017 } from '../../modules/21-cssd/cycles-cases';
import { TC_APP021_024 } from '../../modules/21-cssd/loop-cases';
import { TC_APP021_027 } from '../../modules/21-cssd/cssd-cases';

/**
 * E2E-015: Sterile supply: ward request to sterile packs back on the ward. Each step runs its source test case (tests/modules/<NN-module>/cases.ts)
 * with its own records: 1. Masters: autoclave, cycle type and packing type; 2. Set with its inventory kit. The chain stops at the first step a blocker stops; the cause is recorded by the run.
 */
chainTest('E2E-015', async ({ page, chain }) => {
  await installToastRecorder(page);
  await chain.step(1, (qa) => TC_APP021_001({ page, qa }));
  chain.stopAsPlanned(2);
  await chain.run(3, TC_APP021_008);
  await chain.run(4, TC_APP021_012);
  await chain.run(5, TC_APP021_017);
  chain.stopAsPlanned(6);
  await chain.run(7, TC_APP021_024);
  await chain.run(8, TC_APP021_027);
});
