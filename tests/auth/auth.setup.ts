import { expect, test as setup } from '@playwright/test';
import { AUTH_FILE, PASSWORD, USERNAME } from '../../lib/config';
import { AppHeader } from '../../pages/AppHeader';
import { LoginPage } from '../../pages/LoginPage';

/**
 * Login happens exactly once here. Every pharmacy test reuses the saved
 * session through `storageState` (see playwright.config.ts).
 */
setup('login once and save the session', async ({ page }) => {
  await new LoginPage(page).login(USERNAME, PASSWORD);

  const header = new AppHeader(page);
  await expect(page.getByRole('banner').getByRole('button', { name: /not signed in|belum masuk/i })).toHaveCount(0);
  await expect(header.profileButton()).toBeVisible();

  await page.context().storageState({ path: AUTH_FILE });
});
