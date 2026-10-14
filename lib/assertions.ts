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

/**
 * Records every toast text the page shows (the app reuses one toast element,
 * so a repeated or quickly replaced message is easy to miss). Install before
 * the first navigation; read with `toastsSince`.
 */
export async function installToastRecorder(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as { __qaToasts: string[] };
    w.__qaToasts = [];
    const seen = new WeakMap<Element, string>();
    new MutationObserver(() => {
      document.querySelectorAll('[role="status"],[role="alert"]').forEach((el) => {
        const text = el.textContent?.trim() ?? '';
        if (text && seen.get(el) !== text) {
          seen.set(el, text);
          w.__qaToasts.push(text);
        }
      });
    }).observe(document, { subtree: true, childList: true, characterData: true });
  });
}

/** Number of toasts recorded so far (a mark for `toastsSince`). */
export async function toastMark(page: Page): Promise<number> {
  return page.evaluate(() => (window as unknown as { __qaToasts?: string[] }).__qaToasts?.length ?? 0);
}

/** Toast texts recorded after `mark`. */
export async function toastsSince(page: Page, mark: number): Promise<string[]> {
  return page.evaluate((m) => ((window as unknown as { __qaToasts?: string[] }).__qaToasts ?? []).slice(m), mark);
}
