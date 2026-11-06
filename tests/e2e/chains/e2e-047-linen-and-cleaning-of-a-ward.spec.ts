import { test } from '@playwright/test';
import { chainTest } from '../../../fixtures/chain';
import { installToastRecorder } from '../../../lib/assertions';
import { TC_APP024_001, TC_APP024_007 } from '../../modules/24-housekeeping/cases';
import { TC_APP025_001, TC_APP025_008 } from '../../modules/25-linen/cases';

/**
 * E2E-047: Linen and cleaning of a ward. Each step runs its source test case (tests/modules/<NN-module>/cases.ts)
 * with its own records: 1. Linen stores and recipe; 2. Linen circulation through the ward and the laundry; 3. Ward
 * location with shifts and activities; 4. Cleaning logged and approved. The items of Inventory the linen steps need
 * are made by the steps (checklist blocker 14 until 2026-11-01). The chain stops at the first step a blocker stops;
 * the cause is recorded by the run.
 */
chainTest('E2E-047', async ({ page, chain }) => {
  test.setTimeout(1_800_000);
  await installToastRecorder(page);
  await chain.step(1, (qa) => TC_APP025_001({ page, qa }));
  await chain.step(2, (qa) => TC_APP025_008({ page, qa }));
  await chain.step(3, (qa) => TC_APP024_001({ page, qa }));
  await chain.step(4, (qa) => TC_APP024_007({ page, qa }));
});
