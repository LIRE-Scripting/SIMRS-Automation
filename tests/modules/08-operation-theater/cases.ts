import { procedure, create, cellsOf } from './helpers';
import { expect } from '../../../fixtures/e2e';
import { OT } from '../../../lib/ot-data';
import type { Page } from '@playwright/test';
import type { Qa } from '../../../fixtures/e2e';

/**
 * Test cases of 08-operation-theater that end-to-end chains run too (tests/e2e/chains/):
 * each is declared by its module spec with qaTest and called by a chain with the chain's Qa.
 */
export type CaseArgs = { page: Page; qa: Qa };

export const TC_APP008_002 = async ({ page, qa }: CaseArgs): Promise<void> => {
  const p = procedure(qa);
  await qa.step(1, async () => {
    expect(await create(page, { procedure: p, amount: OT.amount })).toContain('Request created');
  });
  await qa.step(2, async () => {
    expect((await cellsOf(page, p))[3]).toBe('5,000,000');
  });
};
