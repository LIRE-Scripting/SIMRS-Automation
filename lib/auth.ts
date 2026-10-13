import { type Page } from '@playwright/test';
import { AppHeader } from '../pages/AppHeader';
import { LoginPage } from '../pages/LoginPage';
import { PASSWORD, USERNAME } from './config';

/**
 * Keeps a page signed in. Staging occasionally drops the session between
 * navigations; when the header shows "Not signed in", the encapsulated
 * login runs again inside the same context.
 */
export async function ensureSignedIn(
  page: Page,
  username: string = USERNAME,
  password: string = PASSWORD,
): Promise<void> {
  const header = new AppHeader(page);
  if (!(await header.isSignedIn())) {
    await new LoginPage(page).login(username, password);
  }
}
