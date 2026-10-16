import { chainTest } from '../../../fixtures/chain';

/** E2E-031: Blood: emergency release and return. The chain cannot start: its first step is blocked. */
chainTest('E2E-031', async ({ chain }) => {
  // TC-APP006-024 needs a screened, available unit: a bag is numbered on Donors, which answers HTTP 500 (checklist blocker 2), as in the module spec.
  chain.stop(1, 'Blocker 2', 'needs a screened, available unit (a bag is numbered on Donors)');
});
