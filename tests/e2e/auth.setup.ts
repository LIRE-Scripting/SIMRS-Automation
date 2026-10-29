import { expect, test as setup } from '@playwright/test';
import { authFileOf, PASSWORD } from '../../lib/config';
import { installSiteLanguage } from '../../lib/i18n';
import { prerequisites, userLogin } from '../../lib/qa-data';
import { LoginPage } from '../../pages/LoginPage';

/**
 * One sign-in per prepared workbook user (00-prerequisites.xlsx | Users,
 * Prepared = Done; the login is the first word after "Exists:" in "Status
 * on the site"): U1 rs.admin2 (Podomoro only), U2 rs.admin (All branches)
 * and U3 to U7, the qa.* accounts of the prerequisite run of 2026-10-20.
 * Each session is saved to .auth/<key>.json and reused by the specs through
 * storageState; no spec signs in again.
 */
const prepared = prerequisites().users.filter((u) => u.prepared === 'Done');

// The site runs in Indonesian; the login page is found by its English texts (lib/i18n).
setup.beforeAll(async ({ browser }) => installSiteLanguage(browser));

for (const user of prepared) {
  const login = userLogin(user.key);
  setup(`sign in ${user.key} [00-prerequisites.xlsx | Users | row ${user.row} | ${user.key}]`, async ({ page }) => {
    setup.skip(!login, `${user.key} has no login in "Status on the site": ${user.statusOnSite}`);
    await new LoginPage(page).signIn(login!, PASSWORD);

    // The header hydrates after load; it must not settle on "Not signed in".
    await page.goto('/id/apps');
    await expect(page.getByRole('banner').getByRole('button', { name: 'Language' })).toHaveText(/ID/);
    await expect(page.getByRole('banner').getByRole('button', { name: /not signed in/i })).toHaveCount(0);

    await page.context().storageState({ path: authFileOf(user.key) });
  });
}
