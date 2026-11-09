import type { Locator, Page } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { authFileOf } from '../../../lib/config';
import { installToastRecorder, toastMark } from '../../../lib/assertions';
import { pageToRow } from '../../../pages/paging';
import { png } from './png';
import { createUser, fillUser, invalidFields, newPassword, pick, roles, signInAs, toastsAfter, users, type NewUser } from './helpers';
import { block, BRANCH, cellsOf, mapLines, newUser, ROLE, TC_APP018_031, TC_APP018_037, TC_APP018_039, TC_APP018_041, userData } from './cases';
import { NotOffered } from '../../../lib/not-offered';
import { TC_APP018_032, TC_APP018_033, TC_APP018_034, TC_APP018_035, TC_APP018_036, TC_APP018_038, TC_APP018_040, TC_APP018_042, TC_APP018_043, TC_APP018_044, TC_APP018_045, TC_APP018_046, TC_APP018_047, TC_APP018_048, TC_APP018_049, TC_APP018_050, TC_APP018_051, TC_APP018_056, TC_APP018_057 } from './identity-cases';

/** The test cases are in identity-cases.ts (shared with the end-to-end chains). */

/**
 * 18-settings.xlsx: Users, Roles, Rights, Branch map, Sign-in log, Brand,
 * Theme, Dashboard, Notifications, Password and the Audit trail. Test
 * accounts and roles carry a token; passwords of test accounts are random
 * per run and never reported; each test account is blocked at the end of its
 * test. Steps that would lock out the shared administrator (blocking the own
 * account, taking away the role admin or its right to grant rights) are not
 * run. Branding is put back to what it was at the end of each test.
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

qaTest('TC-APP018-031', TC_APP018_031);

qaTest('TC-APP018-032', TC_APP018_032);

qaTest('TC-APP018-033', TC_APP018_033);

qaTest('TC-APP018-034', TC_APP018_034);

qaTest('TC-APP018-035', TC_APP018_035);

qaTest('TC-APP018-036', TC_APP018_036);

qaTest('TC-APP018-037', TC_APP018_037);

qaTest('TC-APP018-038', TC_APP018_038);

qaTest('TC-APP018-039', TC_APP018_039);

qaTest('TC-APP018-040', TC_APP018_040);

qaTest('TC-APP018-041', TC_APP018_041);

qaTest('TC-APP018-042', TC_APP018_042);

qaTest('TC-APP018-043', TC_APP018_043);

qaTest('TC-APP018-044', TC_APP018_044);

qaTest('TC-APP018-045', TC_APP018_045);

qaTest('TC-APP018-046', TC_APP018_046);

qaTest('TC-APP018-047', TC_APP018_047);

qaTest('TC-APP018-048', TC_APP018_048);

qaTest('TC-APP018-049', TC_APP018_049);

qaTest('TC-APP018-050', TC_APP018_050);

qaTest('TC-APP018-051', TC_APP018_051);

qaTest('TC-APP018-056', TC_APP018_056);

qaTest('TC-APP018-057', TC_APP018_057);
