import { test } from '@playwright/test';
import { chainTest } from '../../../fixtures/chain';
import { installToastRecorder } from '../../../lib/assertions';
import { TC_APP025_001, TC_APP025_004, TC_APP025_008, TC_APP025_012 } from '../../modules/25-linen/cases';

/**
 * E2E-016: Linen: making linen and its circulation. Each step runs its source test case (tests/modules/<NN-module>/cases.ts)
 * with its own records: 1. Linen stores and recipe; 2. Work order: made, received and charged; 3. Circulation: clean to
 * the ward, soiled to the laundry, back to the linen store; 4. Linen stock in Inventory after a full round. The items of
 * Inventory each step needs are made by the step (checklist blocker 14 until 2026-11-01). The chain stops at the first
 * step a blocker stops; the cause is recorded by the run.
 */
chainTest('E2E-016', async ({ page, chain }) => {
  test.setTimeout(1_800_000);
  await installToastRecorder(page);
  await chain.step(1, (qa) => TC_APP025_001({ page, qa }));
  await chain.step(2, (qa) => TC_APP025_004({ page, qa }));
  await chain.step(3, (qa) => TC_APP025_008({ page, qa }));
  await chain.step(4, (qa) => TC_APP025_012({ page, qa }));
});
