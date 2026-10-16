import type { Page } from '@playwright/test';
import type { Qa } from '../../../fixtures/e2e';

/**
 * Test cases of 23-sourcing that end-to-end chains run too (tests/e2e/chains/):
 * each is declared by its module spec with qaTest and called by a chain with the chain's Qa.
 */
export type CaseArgs = { page: Page; qa: Qa };

export const TC_APP023_020 = async ({ qa }: CaseArgs): Promise<void> => {
  qa.notRun(1, 'the approval of a purchase request is the 09 Procurement flow');
  for (const st of [2, 3, 4, 5, 6]) qa.blocked(st, 39);
  qa.notRun(7, 'TBD: the purchase order of the request is the 09 Procurement flow');
};
