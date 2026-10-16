import { chainTest } from '../../../fixtures/chain';
import { installToastRecorder } from '../../../lib/assertions';
import { TC_APP021_001 } from '../21-cssd/cases';

/**
 * E2E-015: Sterile supply: ward request to sterile packs back on the ward. Each step runs its source test case (tests/e2e/<module>/cases.ts)
 * with its own records: 1. Masters: autoclave, cycle type and packing type; 2. Set with its inventory kit. The chain stops at the first step a blocker stops; the cause is recorded by the run.
 */
chainTest('E2E-015', async ({ page, chain }) => {
  await installToastRecorder(page);
  await chain.step(1, (qa) => TC_APP021_001({ page, qa }));
  chain.stopAsPlanned(2);
});
