import { expect, type Locator, type Page } from '@playwright/test';
import { toastInEnglish } from './i18n';

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
        // The banner of a tenant without branding is a status region on every page, not a toast.
        if (/^Tenant branding is not configured/.test(text)) return;
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

/** Toast texts recorded after `mark`, in English (the site runs in Indonesian, lib/i18n). */
export async function toastsSince(page: Page, mark: number): Promise<string[]> {
  const texts = await page.evaluate((m) => ((window as unknown as { __qaToasts?: string[] }).__qaToasts ?? []).slice(m), mark);
  const url = page.url();
  return texts.map((t) => toastInEnglish(t, url));
}

/**
 * A save the server could not do. Until 2026-10-30 it answered HTTP 500, shown as the toast or red box
 * "Minified React error #441"; since 2026-10-31 most of those answer with the server's own failure text
 * instead: a database error ("ERROR: … (SQLSTATE 23514)"), "failed to …", or the action's name with the
 * status ("saveKitComponents: 500 stock update failed").
 */
export const SERVER_FAILURE = /React error #441|SQLSTATE|^\s*ERROR:|^\s*failed to\b|^\s*\w+: 5\d\d\b/i;

/** True when one of the texts (toasts, red boxes) is a server failure (SERVER_FAILURE). */
export const isServerFailure = (texts: string[]): boolean => texts.some((t) => SERVER_FAILURE.test(t));
