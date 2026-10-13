import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Locator for a toast message. The app renders toasts either as an alert
 * region or as a status region, so both are covered.
 */
export function toastLocator(page: Page, pattern: RegExp): Locator {
  return page
    .getByRole('alert')
    .getByText(pattern)
    .first()
    .or(page.getByRole('status').filter({ hasText: pattern }).first());
}

/** Expects a toast fragment to appear. */
export async function expectToast(page: Page, pattern: RegExp): Promise<void> {
  await expect(toastLocator(page, pattern)).toBeVisible({ timeout: 15_000 });
}

/** Expects no matching toast to be on screen. */
export async function expectNoToast(page: Page, pattern: RegExp): Promise<void> {
  await expect(toastLocator(page, pattern)).toBeHidden();
}
