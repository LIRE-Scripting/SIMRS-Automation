import { expect, type Locator } from '@playwright/test';

/**
 * Paging of the lists of the site: "Showing a–b of N" with "Next page" and
 * "Previous page". A page is marked by its own "Showing" text, so each press
 * waits until that text changes (a press that lands while the list is still
 * drawn is pressed again by the caller's loop). Toasts sit over the pager,
 * so the buttons are pressed with the keyboard.
 */

const pagerText = /^Showing \d+[–-]\d+ of \d+$/;

async function pressNext(main: Locator): Promise<boolean> {
  const pager = main.getByText(pagerText).first();
  const next = main.getByRole('button', { name: 'Next page' });
  if (!(await pager.count()) || !(await next.count()) || !(await next.isVisible()) || (await next.isDisabled())) return false;
  const before = await pager.innerText();
  await next.press('Enter');
  // A press that lands while the list is still drawn is lost now and then: it is pressed once more.
  if (!(await expect(pager).not.toHaveText(before, { timeout: 8_000 }).then(() => true, () => false))) {
    await next.press('Enter');
    await expect(pager).not.toHaveText(before);
  }
  return true;
}

/** Reads every page of a list, from its first page, and returns the rows of all pages in order. */
export async function everyPage<T>(main: Locator, readPage: () => Promise<T[]>): Promise<T[]> {
  const out: T[] = [];
  for (let guard = 0; guard < 300; guard++) {
    out.push(...(await readPage()));
    if (!(await pressNext(main))) break;
  }
  return out;
}

/** Pages through a list from its first page until `match` finds a row; returns the locator of the row (empty when no page has it). */
export async function pageToRow(main: Locator, match: () => Locator): Promise<Locator> {
  const prev = main.getByRole('button', { name: 'Previous page' });
  for (let i = 0; i < 300 && (await prev.isVisible()) && (await prev.isEnabled()); i++) {
    const pager = main.getByText(pagerText).first();
    const before = await pager.innerText();
    await prev.press('Enter');
    await expect(pager).not.toHaveText(before);
  }
  for (let guard = 0; guard < 300; guard++) {
    if (await match().count()) return match();
    if (!(await pressNext(main))) break;
  }
  return match();
}
