import { expect, test as setup } from '@playwright/test';
import { AUTH_MODULES_FILE, MODULES_USERNAME, PASSWORD } from '../../lib/config';
import { LoginPage } from '../../pages/LoginPage';

/**
 * Login for the module-scan suite (rs.admin) - runs once, session saved to
 * AUTH_MODULES_FILE and reused by every module test.
 */
setup('login once as the module admin and save the session', async ({ page }) => {
  // The language switch is skipped: the /id home leaves an overlay that can
  // swallow the menu click, and the module assertions are language-agnostic.
  await new LoginPage(page).login(MODULES_USERNAME, PASSWORD, { english: false });

  await expect(page).toHaveURL(/\/(en|id)$/);
  await page.context().storageState({ path: AUTH_MODULES_FILE });
});
