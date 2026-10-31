import { qaTest } from '../../../fixtures/e2e';
import { signedOutJourney } from '../shared/access';

/**
 * 14-hospital-accounts.xlsx, the "Needs Evaluation" journey that needs no open
 * counter: Fast Cashier without a session (the others are in
 * evaluation-cashier.spec.ts).
 */

qaTest('TC-APP014-051', ({ qa, browser }) => signedOutJourney(browser, qa, '/billing/cashier', /\/(id|en)\/billing\/cashier/));
