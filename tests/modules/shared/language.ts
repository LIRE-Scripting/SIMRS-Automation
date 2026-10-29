import { expect, type Page } from '@playwright/test';

/**
 * The language is a preference of the U1 account, shared by every test; the
 * suite runs in Indonesian (lib/i18n). A test that switches language and then
 * times out would leave it there, so the specs that switch call this in
 * afterEach. The menu item re-renders while the menu opens, so the click is
 * dispatched to it.
 */
export async function backToIndonesian(page: Page): Promise<void> {
  await switchLanguage(page, 'ID');
}

/** Switches the account's language (the menu item is clicked by dispatch: it re-renders while the menu opens). */
export async function switchLanguage(page: Page, lang: 'EN' | 'ID'): Promise<void> {
  // The page first renders in the language of its address, then the app switches to the account's saved language; wait for that.
  await page.goto('/id/apps');
  await page.waitForLoadState('networkidle').catch(() => {});
  const button = page.getByRole('banner').getByRole('button', { name: /^(language|bahasa)$/i });
  await button.click();
  const item = page.getByRole('menuitemradio', { name: lang, exact: true });
  await expect(item).toBeVisible();
  if ((await item.getAttribute('aria-checked')) !== 'true') await item.dispatchEvent('click');
  await expect(button).toHaveText(lang);
  // The choice is saved on the account: a new page shows it too.
  await page.goto('/id/apps');
  await page.waitForLoadState('networkidle').catch(() => {});
  await expect(button).toHaveText(lang);
}
