import type { Page } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder, toastLocator, toastMark, toastsSince } from '../../../lib/assertions';
import { authFileOf } from '../../../lib/config';
import { newType, optionLabel, REQUEST, Requests } from './helpers';
import { TC_APP004_056, TC_APP004_057, TC_APP004_058, TC_APP004_059, TC_APP004_060, TC_APP004_061, TC_APP004_062, TC_APP004_063, TC_APP004_064 } from './requests-cases';

/** The test cases are in requests-cases.ts (shared with the end-to-end chains). */

/**
 * 04-inpatient.xlsx, feature "Admission requests (/adt/requests)". Read from
 * the live screen on 2026-10-15: a block "Admission types" (a list to switch
 * between Admission types and Referrals, Code, Name, Active and a button that
 * reads "New request"), a block "New request" and the request list with a
 * "Reason" field above it. Codes "X-AT1"/"X-RF1" become "QA-AT1-<token>" (Q5).
 */

test.beforeEach(async ({ page }) => {
  await installToastRecorder(page);
});

qaTest('TC-APP004-056', TC_APP004_056);

qaTest('TC-APP004-057', TC_APP004_057);

qaTest('TC-APP004-058', TC_APP004_058);

qaTest('TC-APP004-059', TC_APP004_059);

qaTest('TC-APP004-060', TC_APP004_060);

qaTest('TC-APP004-061', TC_APP004_061);

qaTest('TC-APP004-062', TC_APP004_062);

qaTest('TC-APP004-063', TC_APP004_063);

qaTest('TC-APP004-064', TC_APP004_064);
