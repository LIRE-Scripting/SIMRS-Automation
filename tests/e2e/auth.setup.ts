import { expect, test as setup } from '@playwright/test';
import { authFileOf, PASSWORD } from '../../lib/config';
import { prerequisites, userLogin } from '../../lib/qa-data';
import { LoginPage } from '../../pages/LoginPage';

/**
 * One sign-in per prepared workbook user (00-prerequisites.xlsx | Users,
 * Prepared = Done): U1 rs.admin2 (Podomoro only) and U2 rs.admin (All
 * branches). Each session is saved to .auth/<key>.json and reused by the
 * specs through storageState; no spec signs in again.
 */
const prepared = prerequisites().users.filter((u) => u.prepared === 'Done');

for (const user of prepared) {
  const login = userLogin(user.key);
  setup(`sign in ${user.key} [00-prerequisites.xlsx | Users | row ${user.row} | ${user.key}]`, async ({ page }) => {
    setup.skip(!login, `${user.key} has no login in "Status on the site": ${user.statusOnSite}`);
    await new LoginPage(page).signIn(login!, PASSWORD);

    // The header hydrates after load; it must not settle on "Not signed in".
    await page.goto('/en/apps');
    await expect(page.getByRole('banner').getByRole('button', { name: 'Language' })).toHaveText(/EN/);
    await expect(page.getByRole('banner').getByRole('button', { name: /not signed in/i })).toHaveCount(0);

    await page.context().storageState({ path: authFileOf(user.key) });
  });
}
